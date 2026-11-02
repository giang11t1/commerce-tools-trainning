import { PERMISSIONS, entryPointUriPath } from './src/constants';

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Review Management',
  entryPointUriPath,
  cloudIdentifier: 'gcp-us',
  env: {
    development: {
      initialProjectKey: 'b2c-sample-project',
    },
    production: {
      applicationId: 'cmvozbp69000w01vf9fk9ueab',
      url: `https://${
        process.env.CLOUDFLARE_TUNNEL_HOST ||
        'monte-entrepreneur-commitment-owner.trycloudflare.com'
      }`,
    },
  },
  oAuthScopes: {
    view: ['view_products', 'view_states'],
    manage: ['manage_products'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/rocket.svg}',
  mainMenuLink: {
    defaultLabel: 'Review Management',
    labelAllLocales: [],
    permissions: [PERMISSIONS.View],
  },
  submenuLinks: [],
};

export default config;
