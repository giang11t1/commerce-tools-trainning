import type { TSdkAction } from '@commercetools-frontend/sdk';
import { actions } from '@commercetools-frontend/sdk';
import type { LabelMediaAdapter } from './label-media';
import { labelUploadEndpoint } from './label-upload-url';
import {
  parseImageBytes,
  validateImageFile,
  validateUploadedImage,
} from './label-media';

export function createCloudinaryMediaAdapter(
  url: string,
  dispatch: (action: TSdkAction) => Promise<unknown>,
  projectKey: string,
  development = process.env.NODE_ENV === 'development'
): LabelMediaAdapter {
  const configuration = labelUploadEndpoint(url, development);
  if (!configuration.endpoint) throw new Error(configuration.error);
  const { endpoint, localHttp } = configuration;
  return {
    async upload(file, { signal, onProgress }) {
      signal.throwIfAborted();
      if (localHttp)
        throw new Error(
          'Merchant Center cannot forward uploads to HTTP localhost. Configure a public HTTPS tunnel or deployed upload backend in both applications.'
        );
      validateImageFile(file);
      const bytes = new Uint8Array(await file.arrayBuffer());
      signal.throwIfAborted();
      const original = parseImageBytes(bytes);
      if (original.mimeType !== file.type)
        throw new Error(
          'The file contents do not match its declared image type.'
        );
      // The MC SDK sends JSON; this encoding is transport-only, never Custom Object data.
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      onProgress(null);
      const result = await dispatch(
        actions.forwardTo.post({
          uri: endpoint.href,
          audiencePolicy: 'forward-url-full-path',
          includeUserPermissions: true,
          headers: { 'X-Project-Key': projectKey },
          payload: { data: btoa(binary), mimeType: file.type },
        })
      );
      // SDK dispatch cannot abort the forwarded server upload; discard cancelled results.
      signal.throwIfAborted();
      const image = validateUploadedImage(result, original);
      onProgress(100);
      return image;
    },
  };
}
