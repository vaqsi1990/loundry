/**
 * Helper utility to determine which API base path to use
 * based on the current route context
 */
export function getApiBasePath(): string {
  if (typeof window === 'undefined') {
    // Server-side: default to admin
    return '/api/admin';
  }

  // Client-side: check current pathname
  const pathname = window.location.pathname;
  
  if (pathname.startsWith('/manager') || pathname.startsWith('/assistant')) {
    return '/api/manager';
  }
  
  // Default to admin
  return '/api/admin';
}

/**
 * Get API endpoint path for a given resource
 * @param resource - The API resource (e.g., 'daily-sheets', 'invoices')
 * @param subPath - Optional sub-path (e.g., 'send-email', '[id]')
 */
export function getApiPath(resource: string, subPath?: string): string {
  const base = getApiBasePath();
  if (subPath) {
    return `${base}/${resource}/${subPath}`;
  }
  return `${base}/${resource}`;
}
