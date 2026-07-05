/**
 * Cloudinary helpers. Provides a signed-upload endpoint payload and a URL
 * transformer. Works client-side with an unsigned upload preset, or falls back
 * to returning the original URL when Cloudinary is not configured.
 */
export const isCloudinaryEnabled = () =>
  Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

const cloudName = () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Build a transformed delivery URL (resize/format) for a Cloudinary public id. */
export function cldUrl(
  publicId: string,
  opts: { width?: number; height?: number; quality?: string } = {}
) {
  if (!isCloudinaryEnabled() || /^https?:\/\//.test(publicId)) return publicId;
  const t: string[] = ["f_auto", `q_${opts.quality ?? "auto"}`];
  if (opts.width) t.push(`w_${opts.width}`);
  if (opts.height) t.push(`h_${opts.height}`);
  if (opts.width || opts.height) t.push("c_fill");
  return `https://res.cloudinary.com/${cloudName()}/image/upload/${t.join(",")}/${publicId}`;
}

export interface UploadConfig {
  enabled: boolean;
  cloudName: string | null;
  uploadPreset: string | null;
  endpoint: string | null;
}

/** Config the client uses to POST an unsigned upload directly to Cloudinary. */
export function getUploadConfig(): UploadConfig {
  if (!isCloudinaryEnabled()) {
    return { enabled: false, cloudName: null, uploadPreset: null, endpoint: null };
  }
  return {
    enabled: true,
    cloudName: cloudName()!,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "luxejewels_unsigned",
    endpoint: `https://api.cloudinary.com/v1_1/${cloudName()}/image/upload`,
  };
}
