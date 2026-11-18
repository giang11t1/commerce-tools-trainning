import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

export const entryPointUriPath = 'product-labels';
export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
