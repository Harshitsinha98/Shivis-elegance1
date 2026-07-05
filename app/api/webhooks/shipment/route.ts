/**
 * Neutral-named alias for the Shiprocket tracking webhook.
 *
 * Shiprocket's dashboard rejects webhook URLs containing the words
 * "shiprocket", "kartrocket", "sr" or "kr", so we expose the same handler here
 * at /api/webhooks/shipment. Register THIS url in the Shiprocket dashboard.
 */
export { POST, dynamic } from "../shiprocket/route";
