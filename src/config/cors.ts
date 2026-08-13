export type AllowedOrigin = string | RegExp;

export function getAllowedOrigins(): AllowedOrigin[] {
  const configured = process.env.CORS_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured?.length) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGINS is required in production.");
  }

  // Permit Vite dev servers reached from another device on the same private
  // network. Production remains restricted to the explicit CORS_ORIGINS list.
  return [
    /^http:\/\/(?:localhost|127\.0\.0\.1):517[34]$/,
    /^http:\/\/10(?:\.\d{1,3}){3}:517[34]$/,
    /^http:\/\/192\.168(?:\.\d{1,3}){2}:517[34]$/,
    /^http:\/\/172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}:517[34]$/,
  ];
}
