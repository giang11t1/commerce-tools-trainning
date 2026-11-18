import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

const entryPointUriPath = 'product-labels';

const permissions = entryPointUriPathToPermissionKeys(entryPointUriPath);

const applicationId =
  process.env.MC_APPLICATION_ID || 'cmwlrpu5c001y01xn6durqqh5';

const applicationUrl =
  process.env.MC_APP_URL ||
  'https://commerce-tools-trainning-product-la-virid.vercel.app';

/** @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication} */
export default {
  name: 'Product Labels',
  entryPointUriPath,
  cloudIdentifier: process.env.MC_CLOUD_IDENTIFIER || 'gcp-us',
  additionalEnv: {
    labelUploadUrl:
      process.env.MC_LABEL_UPLOAD_URL ||
      'https://commerce-tools-trainning-product-la-virid.vercel.app/api/product-labels/images',
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
      applicationId,
      url: applicationUrl,
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
