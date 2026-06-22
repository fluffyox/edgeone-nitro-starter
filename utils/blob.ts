import { getStore as _getStore } from "@edgeone/pages-blob";
import type { Store } from "@edgeone/pages-blob";

// Try platform-injected credential first, fall back to explicit token
export function getStore(name: string): Store {
  try {
    return _getStore(name);
  } catch {
    // Platform credential not available, use explicit token
    const projectId = process.env.EDGEONE_PROJECT_ID || "";
    const token = process.env.EDGEONE_API_TOKEN || "";
    if (!projectId || !token) {
      throw new Error("Blob not configured: set EDGEONE_PROJECT_ID and EDGEONE_API_TOKEN");
    }
    return _getStore({ name, projectId, token });
  }
}
