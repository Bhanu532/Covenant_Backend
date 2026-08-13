const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${label} cannot exceed ${max} characters.`);
  return result;
}

export function optionalText(value: unknown, label: string, max: number): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${label} cannot exceed ${max} characters.`);
  return result;
}

export function validatePhotoDataUrl(value: unknown): string {
  const photo = requiredText(value, "Profile photo", 8_000_000);
  const match = photo.match(DATA_IMAGE);
  if (!match) throw new Error("Profile photo must be a valid PNG, JPG, or WEBP image.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Image size must be less than 5 MB.");
  const validMagic =
    (match[1] === "png" && bytes[0] === 0x89 && bytes[1] === 0x50) ||
    (match[1] === "jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) ||
    (match[1] === "webp" && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP");
  if (!validMagic) throw new Error("Profile photo content does not match its image type.");
  return photo;
}
