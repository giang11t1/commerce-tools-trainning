@AGENTS.md

# commerce-tools-trainning

B2B storefront on commercetools Composable Commerce. Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4, next-intl. Checkout uses commercetools Checkout (Browser SDK) and Adyen.

`SKILL.md` (Vietnamese) has a longer walkthrough of the main flows (navigation, cart, auth, checkout). `README.md` is the unmodified create-next-app template.

## Commands

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint (next core-web-vitals + typescript configs)
npx tsc --noEmit -p .   # type-check; NOT clean (~1,400 pre-existing errors), so filter output to the files you touched
```

- There is no test script, and Jest is not installed, even though `*.spec.tsx` / `*.stories.tsx` files exist under `src/components/commercetools-ui/`. Storybook is installed, but there is no script for it.
- `scripts/*.ts` are one-off commercetools admin scripts (channels, customer groups, review states/transitions, wholesale group). They load env via `dotenv` or `loadEnvFile('.env.local')`. No runner is configured in `package.json`.
- `commerce-tools-trainning` has no `.git` of its own; it sits untracked inside the parent `/Users/giatran5/Workspace` repo.

## Environment

Env vars live in `.env` / `.env.local` (git-ignored via `.env*`; there is no `.env.example`). Never print or commit their values. Names used:

- commercetools: `CT_PROJECT_KEY`, `CT_CLIENT_ID`, `CT_CLIENT_SECRET`, `CT_AUTH_URL`, `CT_API_URL`, `CT_REGION`
- Checkout: `CTP_CHECKOUT_APP_KEY`, `CTP_CHECKOUT_URL`, `CTP_SESSION_URL`, `CTP_JWKS_URL`, `CTP_JWT_ISSUER`, `MERCHANT_RETURN_URL`, `SITE_URL`
- Adyen: `ADYEN_API_KEY`, `ADYEN_CLIENT_KEY`, `ADYEN_ENVIRONMENT`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_NOTIFICATION_HMAC_KEY`
- Project IDs: `CT_REVIEW_PENDING_STATE_ID`, `CT_REVIEW_APPROVED_STATE_ID`, `CT_REVIEW_REJECTED_STATE_ID`, `CT_WHOLESALE_CUSTOMER_GROUP_ID`

## Architecture

| Path | Role |
| --- | --- |
| `src/app/[locale]/` | Storefront pages: home, categories, products/[slug], search, brands, compare, cart, checkout, confirmation, login, register, account/* (addresses, company, orders, quotes, wishlist), admin/reviews |
| `src/app/api/` | Route handlers used by client components (cart, wishlist, inventory, reviews, auth, checkout sessions, business units, associate roles, products, orders) |
| `src/lib/` | Server-side domain modules and all commercetools access. Read the relevant module before changing a query or mutation |
| `src/context/` | Client state: `CartContext`, `WishlistContext`, `CompareContext` (providers mounted in `src/app/[locale]/layout.tsx`, which also loads the initial cart server-side) |
| `src/components/` | Shared UI; `commercetools-ui/` (atoms/molecules/organisms, with specs/stories) appears to come from the commercetools Frontend template |
| `src/hooks/checkout/` | Checkout form, payment methods, Adyen session, payment flow |
| `src/middleware.ts`, `i18n/`, `project.config.ts` | next-intl locale routing. Locales: `en` → `en-US`/USD/US (default), `de` → `de-DE`/EUR/DE |
| `messages/en.json`, `messages/de.json` | Translation strings (`useTranslations` / `getTranslations`) |
| `sdk/`, `src/frontastic/`, `context/`, `providers/`, `types/`, `types-root/`, `src/helpers/` | Template/Frontastic layer used mostly by `commercetools-ui` components |
| `app-bk/` | Old backup of the app root; not routed |

Path alias: `@/*` → `src/*`.

### commercetools clients (two of them)

- `src/lib/commercetools.ts`: `@commercetools/ts-client`, `import 'server-only'`, exports `apiRoot` (pinned scopes) and `associateApiRoot` (no pinned scopes, for business-unit "as associate" calls). Used by most `src/lib` modules.
- `src/lib/client.ts`: `@commercetools/sdk-client-v2` `ctpClient`, used by `inventory.ts`, `channels.ts`, `productSelections.ts`, `customer-groups.ts`, and `scripts/`.
- If you need a new scope, add it to the client's `scopes` array and make sure the API client in commercetools actually grants it.

Many `src/lib` modules start with `'use server'` (products, customer, auth, cart-related, orders, quotes, checkout, payments, categories, business-units), so client components import them directly as Server Actions.

## Project-specific constraints

- **Product Projection Search is deactivated** in this commercetools project (`SearchDeactivated`). `productProjections().search()` fails; use `productProjections().get()` with a `where` predicate. The query endpoint silently ignores `filter`.
- **Prices are channel-scoped.** Product queries must pass `priceCurrency: 'USD'`, `priceCountry: 'US'`, `priceChannel` (the customer's `custom.fields.priceChannelId`, else the `us-medium-customers` distribution channel) and `priceCustomerGroup` when known. Otherwise `masterVariant.price` is empty and `AddToCartButton` cannot add the product. See `getProductsByCategory` / `getRelatedProductsCart` in `src/lib/products.ts`.
- **Stock is per supply channel.** `variant.availability.availableQuantity` is unset; read stock via `getInventoryMapBySkus` (`src/lib/inventory.ts`, channel key `default-warehouse`) or `POST /api/inventory/batch`. Channel keys are in `CHANNEL_KEYS` (`src/lib/channels.ts`).
- **Store customers.** Customers created in Merchant Center are assigned to a Store (e.g. `us-medium-customers`). They must log in via `/in-store/key={storeKey}/login` and the in-store customer token endpoint, and use `/in-store/key=…/me/*` endpoints. Carts for store customers must belong to their store (`getCartSessionContext` in `src/lib/cart.ts`), and they can only buy products in the store's product selections.
- **Session cookies** (set in `src/lib/auth.ts`, httpOnly): `ct_customer_id`, `ct_customer_access_token` (customer password-flow token with `manage_my_business_units`), `ct_customer_store_key` (store customers only).
- Never expose `CT_CLIENT_SECRET` or other server credentials to client components; keep commercetools calls in `src/lib` or `src/app/api`.
- **Next.js 16:** `params`, `searchParams`, `cookies()` and `headers()` are async. The `middleware` file convention is deprecated in favour of `proxy` (see `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`); this project still uses `src/middleware.ts`.

## Conventions

- Pages under `[locale]` must keep locale context. Use next-intl (`useTranslations` / `getTranslations`) and add keys to both `messages/en.json` and `messages/de.json`.
- Use `@/components/commercetools-ui/atoms/link` (`link` prop) for internal links in storefront components, as existing pages do.
- Product cards take `availableQuantity` and `variantQuantities` (stock keyed by variant SKU). Pages compute these server-side before rendering `ProductCard` / `ProductSlider`.
- Style follows the surrounding file. Files mix 2- and 4-space indentation and quote styles, so match the file you edit rather than reformatting.
- Before changing checkout, trace the whole flow: cart address update → checkout session (`src/lib/checkout.ts`, `src/lib/checkout-client.ts`) → Checkout SDK callbacks / Adyen → redirect to `/confirmation?orderId=…`.


## Coding Rules

- Reuse existing components before creating new ones.
- Use the existing API client for all HTTP requests.
- Keep business logic out of UI components.
- Validate user input before processing it.
- Add tests for new business logic.
- Avoid changing public interfaces unless required by the task.

## File Editing Rules

- Create, edit, and update project files as needed to complete the requested task.
- Do not ask for confirmation before every routine file operation when the active permission settings already allow it.
- Inspect existing files before modifying them.
- Preserve unrelated changes made by the user.
- Avoid unnecessary file creation or modifications.
- Do not overwrite user data or delete important files without appropriate authorization.
- After editing, verify the changes and report the results.
