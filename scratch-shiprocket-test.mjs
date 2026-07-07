import fs from "fs";

const envText = fs.readFileSync(".env.local", "utf8");
function getVar(name) {
  const m = envText.match(new RegExp(`^${name}="?([^"\n]*)"?$`, "m"));
  return m ? m[1] : undefined;
}
const email = getVar("SHIPROCKET_EMAIL");
const password = getVar("SHIPROCKET_PASSWORD");

if (!email || !password) {
  console.log("Missing credentials in .env.local");
  process.exit(1);
}

const BASE = "https://apiv2.shiprocket.in/v1/external";

const authRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log("auth status:", authRes.status);
if (!authRes.ok) {
  const body = await authRes.text();
  console.log("auth failed body:", body.slice(0, 500));
  process.exit(1);
}
const { token } = await authRes.json();
console.log("auth ok, token acquired (redacted)");

// List recent orders to find a real (non-mock) AWB to test cancel against.
const ordersRes = await fetch(`${BASE}/orders?per_page=10`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log("orders list status:", ordersRes.status);
const ordersBody = await ordersRes.json();
const orders = ordersBody?.data ?? [];
console.log("order count:", orders.length);
for (const o of orders.slice(0, 10)) {
  console.log({
    order_id: o.id,
    channel_order_id: o.channel_order_id,
    awb: o.awb ?? o.awb_code ?? null,
    status: o.status,
  });
}
