import { apiBaseUrl } from '../services/api';

/**
 * Global RUM-style instrumentation, installed once at startup: wraps
 * window.fetch so every API call the app makes (present and future,
 * anywhere in the codebase) gets timed and reported into the same
 * performance event stream the backend's own middleware writes to -
 * without needing to touch every individual fetch call in api.ts.
 */
export function installFetchInstrumentation(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input] = args;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Never instrument calls to the observability endpoints themselves -
    // that would just log the dashboard reading/reporting its own traffic.
    if (url.includes('/observability/')) {
      return originalFetch(...args);
    }

    const operation = deriveOperation(url);
    const start = performance.now();

    try {
      const response = await originalFetch(...args);
      reportEvent(originalFetch, operation, performance.now() - start, response.ok ? 'success' : 'error', response.ok ? undefined : `HTTP ${response.status}`);
      return response;
    } catch (err) {
      reportEvent(originalFetch, operation, performance.now() - start, 'error', err instanceof Error ? err.message : 'Network error');
      throw err;
    }
  };
}

function deriveOperation(url: string): string {
  try {
    const { pathname } = new URL(url, window.location.origin);
    const parts = pathname.split('/').filter(Boolean);
    const apiIndex = parts.indexOf('api');
    if (apiIndex !== -1 && parts[apiIndex + 1] === 'v1') {
      return parts.slice(apiIndex + 2).join('/') || 'root';
    }
    return pathname;
  } catch {
    return url;
  }
}

function reportEvent(
  originalFetch: typeof fetch,
  operation: string,
  durationMs: number,
  status: 'success' | 'error',
  errorMessage?: string,
): void {
  // Fire-and-forget: telemetry must never delay or break the app it's
  // observing. Uses the captured original fetch so this call isn't
  // recursively re-instrumented.
  originalFetch(`${apiBaseUrl}/api/v1/observability/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, duration_ms: durationMs, status, error_message: errorMessage }),
  }).catch(() => undefined);
}
