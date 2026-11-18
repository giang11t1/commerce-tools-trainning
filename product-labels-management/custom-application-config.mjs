import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

const entryPointUriPath = 'product-labels';
const permissions = entryPointUriPathToPermissionKeys(entryPointUriPath);
const isProduction = (process.env.MC_APP_ENV || process.env.NODE_ENV) === 'production';
if (isProduction && (!process.env.MC_APPLICATION_ID || !process.env.MC_APP_URL)) {
  throw new Error('Production requires MC_APPLICATION_ID and MC_APP_URL from the registered Custom Application.');
}

/** @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication} */
export default {
  name: 'Product Labels',
  entryPointUriPath,
  cloudIdentifier: process.env.MC_CLOUD_IDENTIFIER || 'gcp-us',
  additionalEnv: {
    labelUploadUrl:
      process.env.MC_LABEL_UPLOAD_URL ||
      'http://localhost:3000/api/product-labels/images',
  },
  headers: {
    csp: {
      'connect-src': [],
      'img-src': ['https://res.cloudinary.com', 'blob:'],
    },
  },
  env: {
    development: {
      initialProjectKey: process.env.CT_PROJECT_KEY || 'b2c-sample-project',
    },
    production: {
      applicationId:
        process.env.MC_APPLICATION_ID || 'cmwlrpu5c001y01xn6durqqh5',
      url:
        process.env.MC_APP_URL ||
        'https://product-labels-management.vercel.app',
    },
  },
  oAuthScopes: {
    view: ['view_products', 'view_product_types', 'view_key_value_documents'],
    manage: ['manage_products', 'manage_key_value_documents'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/rocket.svg}',
  mainMenuLink: {
    defaultLabel: 'Product Labels',
    labelAllLocales: [{ locale: 'de', value: 'Produktlabels' }],
    permissions: [permissions.View],
  },
  submenuLinks: [],
};
