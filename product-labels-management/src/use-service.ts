import { useMemo } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { MC_API_PROXY_TARGETS } from '@commercetools-frontend/constants';
import { useIsAuthorized } from '@commercetools-frontend/permissions';
import { actions, useAsyncDispatch } from '@commercetools-frontend/sdk';
import type { TSdkAction } from '@commercetools-frontend/sdk';
import { PERMISSIONS } from './constants';
import { createService } from './service';
import type { Request } from './service';

export function useService() {
  const dispatch = useAsyncDispatch<TSdkAction, unknown>();
  const projectKey = useApplicationContext((context) => context.project?.key);
  const view = useIsAuthorized({ demandedPermissions: [PERMISSIONS.View] });
  const manage = useIsAuthorized({ demandedPermissions: [PERMISSIONS.Manage] });
  const service = useMemo(() => {
    const request: Request = async <T>(
      method: 'GET' | 'POST',
      path: string,
      body?: unknown
    ) => {
      if (!projectKey)
        throw new Error('Select a Merchant Center project first.');
      const options = {
        mcApiProxyTarget: MC_API_PROXY_TARGETS.COMMERCETOOLS_PLATFORM,
        uri: `/${encodeURIComponent(projectKey)}/${path}`,
      };
      const result = await dispatch(
        method === 'GET'
          ? actions.get(options)
          : actions.post({ ...options, payload: body })
      );
      return result as T;
    };
    return createService(request, { view, manage });
  }, [dispatch, projectKey, view, manage]);
  return { service, view, manage, projectKey };
}
