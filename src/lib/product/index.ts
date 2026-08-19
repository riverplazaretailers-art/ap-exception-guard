import { createApiProductApi } from "./api-adapter";
import { createDemoProductApi } from "./demo-adapter";
import {
  MODE_BANNERS,
  resolveProductConfig,
  secureWorkspacePath,
  type Capability,
  type ProductConfig,
} from "./config";
import type { ProductApi } from "./types";

/**
 * Adapter selection follows the resolved mode. demo and secure-link both render
 * synthetic records (secure-link hands real work to the preserved workspace);
 * only api mode talks to the backend, and only with a matching contract version.
 */
export function createProductApi(config: ProductConfig): ProductApi {
  return config.mode === "api" && config.apiBaseUrl
    ? createApiProductApi(config.apiBaseUrl)
    : createDemoProductApi();
}

export const productConfig: ProductConfig = resolveProductConfig({
  VITE_API_BASE_URL: import.meta.env["VITE_API_BASE_URL"],
  VITE_API_CONTRACT_VERSION: import.meta.env["VITE_API_CONTRACT_VERSION"],
  VITE_SECURE_WORKSPACE_URL: import.meta.env["VITE_SECURE_WORKSPACE_URL"],
});

export const productApi: ProductApi = createProductApi(productConfig);
export const productMode = productConfig.mode;
/** True whenever displayed records are synthetic. */
export const showsDemoData = productApi.mode === "demo";
export const isDemoMode = productMode === "demo";
export const isSecureLinkMode = productMode === "secure-link";
export const secureWorkspaceUrl = productConfig.secureWorkspaceUrl;
export const MODE_BANNER = MODE_BANNERS[productMode];

export function can(capability: Capability): boolean {
  return productConfig.capabilities[capability];
}

export function workspaceLink(path: string): string | null {
  return secureWorkspacePath(productConfig, path);
}

export * from "./types";
export * from "./config";
export { DEMO_BANNER } from "./demo-adapter";
