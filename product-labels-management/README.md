# Product Labels Merchant Center Custom Application

Independent React/TypeScript application using Merchant Center Application Kit
27 and UI Kit 20. It does not run inside Next.js, replace the review-management
app, change storefront authentication, or install dependencies in the storefront.
The root TypeScript configuration excludes this independently built package.

## Structure

```text
product-labels-management/
  custom-application-config.mjs  # region, application identity, scopes and menu
  src/
    index.tsx                   # ApplicationShell, MC authentication and i18n
    app.tsx                     # project-scoped routes and authorization
    labels.tsx                  # list, localized create/edit, deletion confirmation
    assignments.tsx             # search, bulk staged updates, explicit publishing
    components.tsx              # loading/errors, previews, pagination
    domain.ts                   # validation, predicates and assignment actions
    service.ts                  # versioned Composable Commerce operations
    use-service.ts              # authenticated Merchant Center SDK transport
    messages.ts                 # English defaults and German UI translations
    service.test.ts             # isolated API-contract and business-logic tests
    styles.module.css
```

Routes are relative to `/:projectKey/product-labels`: `/labels`,
`/labels/new`, `/labels/:key/edit` (legacy `/labels/:key` remains supported except
the reserved create URL), and `/assignments`. UI language comes from the
Merchant Center session; label and product names use its selected data locale.
The name editor uses all project languages and retains existing translations.

## Advanced label configuration

Existing definitions require no migration. Missing `type` means `text`, missing
`position` means `top-left`, and missing schedules mean visible whenever active.
The existing top-level `color`/`backgroundColor` remain supported and retain their
exact values. No Product Types, assignment schemas or publishing rules change.

Optional Custom Object fields:

```json
{
  "type": "image",
  "position": "bottom-right",
  "image": {
    "url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "alt": { "en": "Certified", "de": "Zertifiziert" },
    "width": 96,
    "height": 64,
    "objectFit": "contain",
    "borderRadius": 8,
    "opacity": 1
  },
  "style": {
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderColor": "#ffffff",
    "rotation": -5
  },
  "advancedCss": "max-width: 120px;",
  "startDate": "2026-12-01T00:00:00.000Z",
  "endDate": "2027-01-01T00:00:00.000Z"
}
```

`label-configuration.ts` is the canonical framework-free validation module,
also imported by the storefront. Structured text styling supports colors,
8–72px fonts, 100–900 weight, an approved font list (inherit, Arial, Georgia,
Verdana), 0–48px padding, 0–12px borders, 0–256px radius, -2–20px tracking,
text transforms, restricted pixel/hex shadows, 0–1 opacity, -180–180° rotation
and 16–512px maximum width. Image dimensions are 8–512px per side.
Images ignore structured text-only properties. Advanced image overrides accept
only borders/radius, shadow, opacity, rotation and maximum width.

Precedence is defaults → structured style → validated advanced declarations.
Advanced declarations must use individual allowlisted CSS properties; pixel
units are required for lengths and only `rotate(Ndeg)` is accepted for
`transform`. Selectors, at-rules, comments, URL/expression/variable functions,
`!important` and unknown properties are rejected. Fonts/images are never loaded
via advanced CSS. Authors remain responsible for contrast and for checking that
large rotated labels fit mobile cards.

Dates use the browser's displayed IANA timezone and are converted to UTC ISO
timestamps. Nonexistent DST local times are rejected; ambiguous fall-back times
use the browser's earlier-offset convention. To choose another timezone, change
the browser/system timezone before entry. The start is inclusive and the end
exclusive; end must follow start. Lists show Scheduled, Active, Expired or
Inactive. Preview follows current time, so future/expired labels are hidden with
their status shown below. Expiration never deletes product assignments.

### Cloudinary image uploads

The Cloudinary adapter uses the existing Next.js server as its trusted backend:
`POST /api/product-labels/images`. No separate service or browser storage secret
is required. Without `MC_LABEL_UPLOAD_URL`, file selection stays disabled with
an explicit configuration notice. The manual HTTPS URL fallback is unchanged.
Malformed or disallowed URLs disable uploads and show a configuration error
without crashing the application or blocking label/assignment management.

With `NODE_ENV=development`, both client and backend configuration accept
`http://localhost:3000/api/product-labels/images` and
`http://127.0.0.1:3000/api/product-labels/images`. File selection is enabled,
but a visible warning explains that **Merchant Center's remote forward-to
gateway still cannot reach HTTP loopback**. Attempting an upload reports that
limitation rather than silently bypassing authentication. A public HTTPS
endpoint/tunnel is required for actual MC-authenticated uploads. Production
and non-local endpoints require HTTPS; changing `MC_APP_ENV` or a browser query
parameter cannot enable the development exception.

The browser sends the upload to the MC Gateway using the existing authenticated
SDK, not directly from port 3001 to port 3000. The Gateway supplies the backend's
short-lived signed exchange token. Therefore localhost CORS is not the blocker,
and no permissive CORS headers, raw MC session-token forwarding, development
admin bypass or browser Cloudinary credentials are added. `GET` returning 405
only confirms the route exists; it does not demonstrate authorized POST access.

1. In your Cloudinary product environment, obtain the cloud name, API key and
   API secret. Merge the upload settings from [`../.env.example`](../.env.example)
   into the root `.env.local`, keeping existing storefront settings. All three
   Cloudinary settings are **server-only**; never prefix them with `NEXT_PUBLIC_`
   or place them in this Custom Application's environment/build.
2. Set `MC_LABEL_UPLOAD_PROJECT_KEY` to the one authorized commercetools project
   and `MC_LABEL_UPLOAD_ISSUER` to its exact Merchant Center API origin. The
   example uses `gcp-us` / `https://mc-api.us-central1.gcp.commercetools.com`.
   Other supported origins are `https://mc-api.europe-west1.gcp.commercetools.com`,
   `https://mc-api.australia-southeast1.gcp.commercetools.com`,
   `https://mc-api.eu-central-1.aws.commercetools.com`, and
   `https://mc-api.us-east-2.aws.commercetools.com`. Issuers are server-allowlisted,
   never inferred from an incoming header.
3. Run the root `npm run dev`. Expose port 3000 through an HTTPS tunnel, for
   example `ngrok http 3000`, or deploy the backend on trusted HTTPS hosting.
   The MC Gateway cannot forward to localhost/HTTP.
4. Set `MC_LABEL_UPLOAD_URL=https://your-public-host/api/product-labels/images`
   in **both** the root server environment and this app's shell/build environment.
   Restart the server after changing it. The exact URL is the JWT audience;
   update both settings when a tunnel hostname changes. No trailing slash/query.
5. In this directory export the public settings shown in
   [`.env.example`](.env.example), then run `npm start` and log in through
   Merchant Center. These example files are not automatically loaded by
   Application Kit. Production builds must receive the upload URL as well as
   the registered `MC_APPLICATION_ID` and `MC_APP_URL`; redeploy after changes.
6. Grant the user Product Labels **Manage** permission and the existing Custom
   Object/Product scopes. The app forwards through the supported
   `actions.forwardTo.post` with `includeUserPermissions: true`. The backend
   verifies the MC JWKS signature, issuer, full-path audience, expiry, 60-second
   token age, exchange type, project and signed `canManageProductLabels` claim.
   A storefront login, direct unauthenticated POST or View-only user is not enough.
   No CORS allowance or customer-cookie authentication is needed.

The adapter sends JSON through the MC SDK; base64 is used **only in transit**.
The backend bounds the JSON stream to approximately 2.8 MB, enforces original
file size <=2 MiB, checks actual PNG/JPEG/WebP signatures and decoded dimensions
(<=4096 per side, <=16 million pixels), rejects SVG, damaged and animated/multipage
images, then uses Sharp to re-encode raster pixels without original metadata.
The processed image must also fit 2 MiB. It signs an HTTPS multipart upload to
Cloudinary with SHA-256, unique project-scoped IDs and `overwrite=false`.
Provider/network failures return explicit errors without exposing credentials.

Cloudinary's public `res.cloudinary.com` delivery host is included in the app
image CSP and already allowed by the storefront renderer. If
`PRODUCT_LABEL_IMAGE_HOSTS` was explicitly customized, include
`res.cloudinary.com`. Images use the existing storefront image renderer; no new
image proxy or Product Type configuration is needed.

Uploading shows indeterminate progress because MC SDK forwarding does not expose
byte progress; it reports completion only after a validated provider response.
Cancellation prevents stale UI updates but cannot cancel an already-forwarded
server request. Failed uploads preserve the existing image and saving is disabled
while an upload is pending. The URL, MIME, original size/dimensions and Cloudinary
asset ID are saved through the existing versioned Custom Object save, **only
when Save is clicked**. No bytes/base64 or credentials enter Custom Objects.
Edit localized alt text before saving. Text/CSS/position/schedule and staged/
published product assignment behavior are unchanged.

Replacement/removal/cancellation does not delete Cloudinary assets or product
assignments. Configure retention/orphan cleanup independently; never delete an
asset still referenced by a label. Removing an image requires replacement or
switching to Text before saving.

For production, configure distributed edge rate limits for this upload route,
request-body limits allowing the bounded JSON payload, request timeouts >=40s,
and appropriate Cloudinary quotas/monitoring. A proxy/gateway with a lower body
limit must be adjusted or will reject larger files. The endpoint does not claim
to provide distributed rate limiting.

Backend verification (from the repository root):

```sh
product-labels-management/node_modules/.bin/tsx --test src/lib/product-label-upload.test.mts
```

Tests exercise actual RSA verification and raster decoding with a mocked
Cloudinary HTTP response. They are **not a real Cloudinary upload test**.

### Local and Merchant Center acceptance

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` in this
directory (build requires real `MC_APPLICATION_ID`/`MC_APP_URL` settings).
Run the storefront label tests documented in
[`../docs/product-labels-storefront.md`](../docs/product-labels-storefront.md).
Start this app with `npm start` and the storefront from the repository root with
`npm run dev`. Register/deploy using the instructions below.

On authorized test products:

1. Edit a legacy Text label and confirm names/colors/assignments remain intact.
2. Set structured style and advanced overrides; confirm the preview and list.
   Try unsafe CSS and verify an explicit error prevents saving.
3. Configure each corner, multiple labels in a corner, and English/German names.
   Check desktop/mobile cards, PDP and existing sale/action controls.
4. Configure future/open-ended/expired schedules. Check exact start/end and the
   displayed timezone; leave a storefront page open across boundaries.
5. Configure Cloudinary as above, upload PNG/JPEG/WebP and verify progress,
   persistence after editor reload and the same image on the storefront. Reject
   SVG, forged MIME, corrupted/oversized files and dimensions over the limit.
   Replace/remove/cancel uploads and confirm no stale result overwrites the image.
6. Save product assignments staged: customer badges must not change. Explicitly
   publish selected products, then refresh storefront cards and PDP.
7. Change only definition styles/image/schedule, allow definitions-cache
   revalidation and refresh. Do not republish unchanged product assignments.
8. Confirm read-only users cannot write or upload through the real backend and
   stale Custom Object/Product versions fail without overwriting newer changes.

Real upload/persistence/storefront acceptance is **not verified** until step 5
passes against Cloudinary in an authenticated Merchant Center session.

## Local development

Use Node.js 22 LTS and npm. From this directory:

```sh
npm ci
export MC_CLOUD_IDENTIFIER=gcp-us
export CT_PROJECT_KEY=b2c-sample-project
npm start
```

Set the cloud identifier to the actual Merchant Center region, not a guessed
region from the storefront. No `.env` file or API client is required: variables
above are non-secret application settings. Set them in your shell or hosting
environment. Application Kit starts on `http://localhost:3001` by default and
provides its Merchant Center login flow. Use a user with project access; local
development normally requires the organization's Administrators team.
The existing Next.js dev command and review app are unaffected.

Production identity is deliberately not hardcoded. Development uses a local-only
identity; production builds fail if `MC_APPLICATION_ID` or `MC_APP_URL` is absent.
The app never reads storefront `.env` files, API client secrets, customer cookies,
or project-level service tokens.

```sh
npm test
npm run typecheck
npm run lint
```

`start`, `build`, and `test` explicitly enable Application Kit's
`ENABLE_NEW_JSX_TRANSFORM=true`. Its Webpack/Babel pipeline otherwise defaults
to classic JSX, independently of TypeScript's inherited `react-jsx` setting.
The automatic transform uses Emotion's JSX runtime and does not require a
default `React` import. Setting this flag only in ESLint does not configure the
dev server or production build. Use the npm scripts rather than invoking
`mc-scripts start` or `mc-scripts build` directly, and restart an already running
dev server after changing the setting.

The JSX regression tests compile all TSX files with the installed Application
Kit Babel preset and runtime selector. They also render the labels route with
populated and empty data without a global `React`, in development and production
transform modes. These isolated route-render tests mock Merchant Center session
context and loaded data; they do not establish live login/API connectivity.

Tests use Node's test runner through `tsx` and an in-memory REST transport.
They cover label create/read/update/tombstone deletion, duplicate keys, stale
versions, authorization, schema rejection, invalid attributes, escaped search
predicates, merging/removing labels, explicit publishing and partial bulk failure.
They do not contact commercetools. `skipLibCheck` avoids upstream Application Kit
declaration errors; strict checking remains enabled for all application code.

## Product Type prerequisite: inspect before changing configuration

No Product Type migrations or live project writes are performed by installation
or tests. Each product row reads its referenced Product Type and shows an explicit
configuration error if incompatible. Assignment and publication re-read that
Product Type immediately before writing, even if it was previously inspected.

A project administrator must first inspect the actual Product Types used by the
catalog through Merchant Center or `GET /{projectKey}/product-types/{id}`.
The required AttributeDefinition is:

```json
{
  "name": "productLabels",
  "label": { "en": "Product labels", "de": "Produktlabels" },
  "type": { "name": "set", "elementType": { "name": "text" } },
  "level": "Product",
  "isRequired": false,
  "attributeConstraint": "None",
  "isSearchable": false
}
```

This is genuinely Product-level: assignments live in
`masterData.staged.attributes`, **not** `masterVariant.attributes`, and writes use
`setProductAttribute`, **not** `setAttributeInAllVariants`.

If absent, an authorized administrator can add this definition with the
documented `addAttributeDefinition` Product Type update action and its current
version. Do not send that action blindly to all Product Types. A same-named
Variant-level, enum, required or otherwise incompatible attribute needs an
explicitly planned migration; this app refuses to reinterpret it. The app has no
`manage_product_types` scope and never changes schemas itself. Product Type
changes cannot be staged.

The installed project's Product Types have **not** been verified against a live
API during development. Runtime inspection is mandatory and fails closed before
assignment writes.

## Data model and consistency

One Custom Object per stable key under container `product-labels`:

```json
{
  "container": "product-labels",
  "key": "new-arrival",
  "version": 1,
  "value": {
    "key": "new-arrival",
    "name": { "en": "New arrival", "de": "Neu" },
    "color": "#ffffff",
    "backgroundColor": "#213c73",
    "priority": 10,
    "active": true,
    "description": "Recently added to the catalog"
  }
}
```

Creates send `version: 0` (create-only). Edits and deletions send the last viewed
version, so concurrent changes cannot overwrite each other. Keys are immutable;
deleting a definition sets `active: false` and an ISO `deletedAt` in a versioned
write. It retains a tombstone permanently, does not touch any product and does
not permit reuse of that key. The regular list hides tombstones.

Assignment views explicitly identify inactive, deleted and unknown references.
They can be removed with the normal, explicitly selected removal operation.
Only active, non-deleted definitions can be newly assigned. Existing unrelated
assignments are always preserved. No destructive cascading deletion occurs.

There is **no atomic transaction across a Custom Object, Product and Product
Type**. A definition can be retired after assignment validation and before a
product write; retaining tombstones means the reference still resolves and is
displayed as deleted, not silently lost. External integrations must follow the
same stable-key/tombstone contract. A schema change between validation and update
is ultimately validated by commercetools. If strictly serialized cross-resource
business invariants are needed, add a trusted coordinating service before
enabling other writers; browser permission checks cannot provide that guarantee.

Label definition changes are immediate, not staged. Do not treat editing colors,
names or active status as a product-draft-only operation.

## API integration and authorization

`@commercetools-frontend/sdk` dispatches `actions.get` and `actions.post` through
`MC_API_PROXY_TARGETS.COMMERCETOOLS_PLATFORM`. The URI contains the selected,
encoded project key. ApplicationShell supplies the Merchant Center session.
There is no custom backend endpoint, hand-rolled bearer token, browser API secret
or privileged storefront Server Action.

The supported Composable Commerce REST endpoints used behind that proxy are:

| Purpose | Endpoint |
| --- | --- |
| Read definitions | `GET /{projectKey}/custom-objects/product-labels` |
| Read definition | `GET /{projectKey}/custom-objects/product-labels/{key}` |
| Create/update/tombstone | `POST /{projectKey}/custom-objects` |
| Query products | `GET /{projectKey}/products` |
| Read/update product | `GET`, `POST /{projectKey}/products/{id}` |
| Verify schema | `GET /{projectKey}/product-types/{id}` |

REST is intentional: it supports Custom Objects' arbitrary JSON values and the
typed Product-level action directly without inventing GraphQL schema fields.
No Product Search or Product Projection Search endpoint is used.

Register these exact scope groups in Merchant Center as well as local config:

| Permission | OAuth scopes |
| --- | --- |
| View (`ViewProductLabels`) | `view_products`, `view_product_types`, `view_key_value_documents` |
| Manage (`ManageProductLabels`) | `manage_products`, `manage_key_value_documents` |

View-only users can browse but cannot perform writes. All service write methods
also require View and Manage, even if invoked outside the UI. The actual
authorization boundary is the authenticated Merchant Center API gateway and its
issued scopes, not the disabled UI buttons or client-side guards.

These are resource-wide scopes: `manage_key_value_documents` is **not**
container-scoped, and `manage_products` permits product writes/publishing.
For backwards compatibility, commercetools also gives `manage_products` access
to related catalog resources, including Product Types; omitting an explicit
`manage_product_types` scope does not remove that inherited API capability.
Grant Manage only to trusted catalog managers. Client-side path restrictions
are not a container-level security boundary.

## Searching, saving and publishing

Label search checks keys, all translated names and descriptions; status filters
and 20-row pagination apply to the full loaded definition set. Definitions are
loaded in 500-record pages, including tombstones, up to 10000 records. Exceeding
that bound produces an error rather than showing incomplete results. For larger
label catalogs, introduce an explicitly designed search/index strategy.

Product search is an **exact match** on product key, SKU across variants, or
staged product name in the selected data locale. An empty query browses products.
This intentionally avoids the project's disabled Product Projection Search.
Queries escape input and use the Products endpoint's `where` predicate with
20-row server pagination. The API offset limit is 10000 (page 501); use an exact
search to find products beyond that browsing limit. No `filter` parameter is
sent to a query endpoint.

Select one or up to 20 products on the current page, select labels, then choose
**Assign selected labels** or **Remove selected labels**. Each operation freshly
reads the product and compares its version with the displayed snapshot before
merging. It uses `setProductAttribute` with `staged: true` and sends the current
product version. HTTP 409 is surfaced without automatic retries that could
overwrite another editor's intent. Refresh, review the new state, and retry.
Unknown network outcomes are not assumed successful: refresh to inspect the
authoritative result before retrying.

Bulk updates are sequential and bounded. Every product has a distinct success
or error result, and one failure does not hide other successful writes. Successful
writes are not rolled back; the operation is not an atomic bulk transaction.
Changing pages or search clears product selection.

Publishing is a **separate per-product action**, with fresh schema and version
checks and an explicit confirmation. It sends `publish` with `scope: "All"`.
**Commercetools publishes all staged changes**, including changes made outside
this app. Review the product's staged data in Merchant Center before confirming.
There is no automatic publish on assignment and no bulk-publish shortcut.

## Badge preview and storefront boundary

The preview displays currently visible definitions by descending priority in
their configured corner, using the same locale fallback as the storefront. Colors are
restricted to six-digit hex values; names are rendered as text, never HTML.
Choose foreground/background pairs with accessible contrast.

The existing storefront renderer resolves keys from **current Product-level
attributes**, never staged or master-variant assignments. It shares the same
configuration/style validation, ignores inactive/tombstone records and revalidates
definitions after edits. Definition-only changes do not require product
republishing. See [`../docs/product-labels-storefront.md`](../docs/product-labels-storefront.md)
for cache timing, image-host configuration and the publish-boundary acceptance
procedure. No privileged API credentials are exposed.

## Merchant Center registration

Use the Merchant Center for the same region as `MC_CLOUD_IDENTIFIER`.

1. Open the profile menu, **Manage organizations & teams**, choose the
   organization, then **Custom Applications > Configure Custom Applications**.
   Add and verify a maintainer contact email.
2. Choose **Add a Custom Application**. Use **Product Labels**, entry point
   **product-labels**, and your actual HTTPS deployment URL. If the regional
   entry point is already taken, choose a unique one and change both
   `custom-application-config.mjs` and `src/constants.ts` before installation.
3. Configure the View/Manage scope groups from the table above and menu
   permission `ViewProductLabels`. These must match the source configuration.
   No storefront API client scopes need to be changed.
4. Copy the assigned Application ID into the deployment's
   `MC_APPLICATION_ID`; set `MC_APP_URL` to the exact registered HTTPS origin.
5. Deploy the production build. Set the Custom Application to **Ready**, then
   install it for selected non-production projects first.
6. Under **Teams > Permissions**, select the project and grant the Custom
   Application **View only** or **View and edit** as appropriate. Verify with a
   genuinely view-only user, not just an administrator.

## Deployment

This is a static Application Kit app, not a Next.js/Vercel framework deployment.
Configure the hosting project root as `product-labels-management`, use Node 22,
and set `MC_CLOUD_IDENTIFIER`, `MC_APPLICATION_ID` and `MC_APP_URL`.
`MC_PROJECT_KEY` is a development convenience, not a project lock.

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Publish the generated **`public/`** directory using an HTTPS static host such as
Cloudflare Pages. Application Kit compiles the HTML and required runtime
configuration as part of its build; do not copy the repository's Next.js
`.next/` output. Preserve generated security/header assets, and configure SPA
fallback for application paths on the chosen host. Do not add a blanket CSP
that overrides Application Kit's generated policy or public API secret variables.
Avoid long-lived caching for `index.html`; hashed static assets can be immutable.

Cloudflare Pages settings: root `product-labels-management`, framework preset
None (or static React), build `npm run build`, output `public`. Ensure automatic
dependency installation uses the committed package lock. Production settings
must match the registered application, including region, scopes and URL.
Deployment previews require a separately registered Merchant Center deployment
preview URL; they are not made valid just by changing a host's preview domain.

### Acceptance before production

Use disposable products in a non-production project. Confirm live schema
compatibility, create/edit names in each project language, search/filter/page
labels, assign multiple labels to one and several products, and compare staged
versus current assignments. Publish only after reviewing all staged data.
Delete an assigned label and verify the tombstone warning and preserved keys,
then explicitly remove it. In two sessions, edit the same label/product and
confirm stale writes fail. Check read-only users, expired sessions, API failures
and a bulk run with one incompatible Product Type. Verify unknown references,
inactive labels, narrow/mobile layouts, keyboard operation and badge contrast.

Automated service tests do not establish Merchant Center browser authentication
or hosting correctness. No live products or historical data are mutated by the
test suite.

## Official references

- [Data fetching and authenticated REST SDK](https://docs.commercetools.com/merchant-center-customizations/development/data-fetching)
- [Custom Application config](https://docs.commercetools.com/merchant-center-customizations/tooling-and-configuration/custom-application-config)
- [Permissions](https://docs.commercetools.com/merchant-center-customizations/development/permissions)
- [Custom Objects](https://docs.commercetools.com/api/projects/custom-objects)
- [Product Types](https://docs.commercetools.com/api/projects/productTypes)
- [Products and update actions](https://docs.commercetools.com/api/projects/products)
- [Registration and team permissions](https://docs.commercetools.com/merchant-center/managing-custom-applications)
- [Cloudflare deployment](https://docs.commercetools.com/merchant-center-customizations/deployment/cloudflare)
