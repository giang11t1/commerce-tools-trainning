import {
  handleLabelUpload,
  LabelUploadError,
  labelUploadConfig,
  type LabelUploadDependencies,
} from '../../server/product-label-upload';

export function createImageHandler(
  env: NodeJS.ProcessEnv,
  dependencies?: LabelUploadDependencies
) {
  return async (request: Request): Promise<Response> => {
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (request.method !== 'POST') {
      return Response.json(
        { message: 'Method not allowed.' },
        { status: 405, headers: { ...headers, Allow: 'POST' } }
      );
    }

    try {
      const image = await handleLabelUpload(
        request,
        labelUploadConfig(env),
        dependencies
      );
      return Response.json(image, { status: 201, headers });
    } catch (error) {
      const known = error instanceof LabelUploadError;
      const status = known ? error.status : 500;
      if (status >= 500) console.error('[product-label-upload] Request failed', { status });
      return Response.json(
        {
          message: known
            ? error.message
            : 'The image upload failed. Retry or contact an administrator.',
        },
        { status, headers }
      );
    }
  };
}

export default { fetch: createImageHandler(process.env) };
