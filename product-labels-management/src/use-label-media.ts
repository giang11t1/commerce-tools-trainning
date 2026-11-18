import { useMemo } from 'react';
import { useAsyncDispatch } from '@commercetools-frontend/sdk';
import type { TSdkAction } from '@commercetools-frontend/sdk';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { createCloudinaryMediaAdapter } from './cloudinary-media';
import { labelUploadEndpoint } from './label-upload-url';

export function useLabelMedia() {
  const dispatch = useAsyncDispatch<TSdkAction, unknown>();
  const settings = useApplicationContext((context) => ({
    url: (
      context.environment as typeof context.environment & {
        labelUploadUrl?: string;
      }
    ).labelUploadUrl,
    projectKey: context.project?.key,
  }));
  return useMemo(() => {
    const development = process.env.NODE_ENV === 'development';
    const configuration = labelUploadEndpoint(settings.url, development);
    if (!configuration.endpoint)
      return settings.url === undefined || settings.url === ''
        ? { warning: configuration.error }
        : { error: configuration.error };
    return {
      adapter: settings.projectKey
        ? createCloudinaryMediaAdapter(
            configuration.endpoint.href,
            (action: TSdkAction) => dispatch(action),
            settings.projectKey,
            development
          )
        : undefined,
      warning: configuration.localHttp
        ? 'Local HTTP configuration is accepted for development, but Merchant Center forwarding requires a public HTTPS tunnel or deployed upload backend. File selection is enabled; uploading requires that HTTPS configuration.'
        : undefined,
    };
  }, [dispatch, settings.url, settings.projectKey]);
}
