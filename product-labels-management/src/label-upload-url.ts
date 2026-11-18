export function labelUploadEndpoint(value: unknown, development: boolean) {
  if (value === undefined || value === '')
    return {
      error:
        'Upload provider not configured. Enter an existing HTTPS image URL below.',
    };
  let endpoint: URL;
  try {
    if (typeof value !== 'string') throw new TypeError();
    endpoint = new URL(value);
  } catch {
    return { error: 'The Product Labels upload URL is invalid.' };
  }
  const localHttp =
    development &&
    endpoint.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(endpoint.hostname);
  if (
    (!localHttp && endpoint.protocol !== 'https:') ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== '/api/product-labels/images'
  )
    return {
      error:
        'Configure an HTTPS upload URL ending in /api/product-labels/images. HTTP is allowed only for localhost or 127.0.0.1 in development.',
    };
  return { endpoint, localHttp };
}
