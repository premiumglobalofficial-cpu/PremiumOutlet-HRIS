/** Premium Outlets — app-wide branding constants */

export const BRAND_NAME = "Premium Outlets";
export const BRAND_PRODUCT_NAME = "Premium Outlets HRIS";
export const BRAND_LOGO_PATH = "/logo.jpg";

export const STALE_BRAND_NAMES = [
  "Soren Data Solutions Inc.",
  "Soren Data Solutions",
  "SDSI",
  "NexHRMS",
  "NexHRMS Inc.",
  "NexHRIS",
] as const;

export function isStaleBrandName(name: string | undefined | null): boolean {
  if (!name?.trim()) return true;
  return STALE_BRAND_NAMES.some(
    (b) => name === b || name.includes("NexHRMS") || name.includes("NexHRIS"),
  );
}
