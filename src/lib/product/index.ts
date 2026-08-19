import { createDemoProductApi } from "./demo-adapter";
import { createHttpProductApi } from "./http-adapter";
import type { ProductApi } from "./types";

/**
 * Adapter selection. When VITE_API_BASE_URL is set the authoritative backend is
 * used; otherwise the clearly labeled demo adapter runs so the UI is demoable.
 */
export function resolveProductApi(
  baseUrl: string | undefined = import.meta.env["VITE_API_BASE_URL"],
): ProductApi {
  return baseUrl ? createHttpProductApi(baseUrl) : createDemoProductApi();
}

export const productApi: ProductApi = resolveProductApi();
export const isDemoMode = productApi.mode === "demo";

export * from "./types";
export { DEMO_BANNER } from "./demo-adapter";