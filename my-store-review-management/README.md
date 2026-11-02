# Review Management Custom Application

This application is built on the commercetools Merchant Center Custom Application starter. It uses the Merchant Center authenticated commerce GraphQL client for review, product, and state data. It does not call the storefront's `/api/admin/reviews` route and does not contain or use the storefront API client secret.

## Local development

1. Use the Node version in `.nvmrc`.
2. Install the starter dependencies with `yarn install` (or `npm install`).
3. Configure local Merchant Center authentication as described in the [Custom Application development guide](https://docs.commercetools.com/merchant-center-customizations/development).
4. Run `yarn start` (or `npm run start`) and open the local app from the Merchant Center project configured for local customizations.

The development configuration starts in `b2c-sample-project`. The application receives the active project from Merchant Center context and relies on the Merchant Center API gateway for project routing; it does not accept a project key from a form or query string. The project was verified against the storefront's local configuration. Its `us-central1.gcp` region maps to cloud identifier `gcp-us`.

### Cloudflare Tunnel for Merchant Center development

The current temporary HTTPS URL is `https://monte-entrepreneur-commitment-owner.trycloudflare.com`. Start the app with `CLOUDFLARE_TUNNEL_HOST=monte-entrepreneur-commitment-owner.trycloudflare.com npm run start:cloudflare`, then start the tunnel in another terminal with `npm run tunnel:cloudflare`. Stop each process with Ctrl+C. The tunnel preserves the public `Host` header, which matches the exact hostname configured by `WDS_SOCKET_HOST`; webpack-dev-server's default host validation continues to allow localhost and this configured tunnel hostname.

Cloudflare Quick Tunnels generate a new hostname after a restart. Use the printed hostname for `CLOUDFLARE_TUNNEL_HOST` when starting the app, then manually update the URL in the Merchant Center registration. The app config reads that host from the environment; its fallback in `custom-application-config.mjs` is only used when the variable is absent. This project does not sync the registration automatically.

## API access and scopes

The application uses `useMcQuery` and `useMcMutation` with the `ctp` GraphQL target. The Merchant Center API authenticates the current Merchant Center user and enforces project access, application OAuth scopes, and team permissions.

Configure these scopes under the Custom Application's permissions:

- **View:** `view_products`, `view_states`
- **Manage:** `manage_products`

`view_products` is required to list reviews and related products. `view_states` is required to inspect review states and their transitions. `manage_products` is required for review state updates; commercetools documents it as the scope for updating a Review. Manage scope also implies the corresponding view scope.

The application derives project identity and locale from Merchant Center context. No `CT_CLIENT_SECRET` or storefront API credentials belong in this package.

## Team authorization

The default Custom Application permission keys are derived from `review-management` in `src/constants.ts`.

- Assign **View** to teams that may read reviews and summary metrics.
- Assign **Manage** only to teams allowed to approve or reject reviews.

The interface hides mutation actions without Manage permission. Mutations still go through the authenticated Merchant Center API, which enforces the installed application's scopes and user's authorization. View-only teams have no `manage_products` scope.

## Review states

The application reads state definitions and honors the current state's configured transition list. It never creates or modifies states. Review states must exist with these keys:

- `review-pending`, initial state
- `review-approved`, with the `ReviewIncludedInStatistics` role
- `review-rejected`, without that role

The pending state must transition to approved and rejected. The setup scripts are in `../scripts/setup-review-states.ts` and `../scripts/setup-review-transitions.ts`. The state setup script explicitly loads the root `.env.local`, refuses any target other than `b2c-sample-project` in `us-central1.gcp`, and requests only the project-scoped `manage_states` permission. It reuses existing states by key, creates only missing states, preserves unrelated roles and transitions, and verifies the final state configuration. The IDs in the root `.env.local` must match the IDs reported by that verification.

The storefront currently reads the IDs from `CT_REVIEW_PENDING_STATE_ID`, `CT_REVIEW_APPROVED_STATE_ID`, and `CT_REVIEW_REJECTED_STATE_ID`. Keep those server-side values aligned with the project's state records. The Custom Application discovers state IDs by key from the active Merchant Center project.

Summary counts are returned by server-side commercetools review queries with `limit: 0`; the UI does not download every review to calculate totals. Rating inclusion is displayed from each Review's commercetools `includedInStatistics` field. The app does not compute product rating aggregates itself.

## Production registration and deployment

The `custom-application-config.mjs` defines the unique entry point `review-management`, `gcp-us`, the development project key, scopes, menu links, and permissions. The production URL currently points to the temporary Cloudflare Quick Tunnel URL above. The existing registered `applicationId` is preserved.

1. Build with `yarn build` (or `npm run build`).
2. Deploy the generated static application using the [Custom Application deployment guide](https://docs.commercetools.com/merchant-center-customizations/deployment).
3. Register it in Merchant Center using the exact entry point, cloud identifier, current application URL, and scopes above. Update the URL when moving away from the temporary Cloudflare Quick Tunnel.
4. Mark the application Ready, install it for the intended project(s), then assign View and Manage permission groups to the appropriate teams.

The application has not been registered, deployed, or installed by this change.
