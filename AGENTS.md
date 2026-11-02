<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Instructions

## 1. Project Overview

- Storefront built with Next.js 16.3 App Router, React 19, strict TypeScript, Tailwind CSS 4, and next-intl.
- Commercetools Composable Commerce is the commerce backend; checkout uses commercetools Checkout and Adyen.
- `CLAUDE.md` is the detailed project reference. Check it for domain constraints before changing commerce, auth, inventory, or checkout flows.

## 2. Architecture and Directory Structure

- `src/app/[locale]/` contains localized pages. Its layout loads the initial cart and mounts the cart, wishlist, and compare providers around the header and page content.
- `src/app/api/` contains Next.js route handlers; cart server actions are in `src/app/api/cart/actions.ts`.
- `src/lib/` contains server-side domain and commercetools helpers. Keep credentials and commercetools calls on the server; follow neighboring server-action or route-handler patterns.
- `src/context/` owns shared client state; `src/components/` contains shared UI.
- `messages/en.json`, `messages/de.json`, `i18n/`, and `project.config.ts` define the supported English/German localization.
- `app-bk/` is a backup tree, not the active App Router.

## 3. Development Principles

- Trace the existing page → component/context → server action or API route → domain helper flow before adding a parallel path.
- Reuse existing components and contexts. Avoid new dependencies or architecture changes unless the task requires them.
- Preserve unrelated working-tree changes.

## 4. Coding Conventions

- Match the style of adjacent files; there is no configured formatter script.
- Localize user-facing text with next-intl and add message keys to both English and German catalogs.
- Use the project link component with its `link` prop for internal storefront navigation where surrounding code does so.
- Read the relevant guide in `node_modules/next/dist/docs/` before using or changing Next.js APIs; Next.js 16 conventions differ from older versions.

## 5. Implementation Guidelines

- Keep commercetools calls server-side. Use the existing SDK client and domain patterns; do not expose client secrets or tokens to client components.
- For product, price, stock, and store-customer rules, follow the specific guidance in `CLAUDE.md`; in particular, product search is deactivated, prices are channel-scoped, and stock is read by SKU from inventory.
- Validate request/action inputs at the boundary. Route handlers generally return `NextResponse.json` with an appropriate status; cart server actions return `{ cart, error? }` because thrown Server Action errors can be redacted.
- For cart mutations, follow the versioned update and concurrency handling in `src/app/api/cart/actions.ts`.

## 6. Testing and Verification

- Available scripts: `npm run dev`, `npm run build`, `npm run start`, and `npm run lint` (ESLint).
- There is no configured test script or test runner. Do not claim tests passed when none ran.
- Run ESLint on touched files and use `npx tsc --noEmit -p .` for type diagnostics. The project-wide type check has existing errors, so filter and report diagnostics for changed files.
- For UI changes, state whether browser behavior was checked.

## 7. Data and Integrity

- Commercetools is the external commerce data store. No local database or migration configuration was found; do not invent a migration workflow.
- Preserve commercetools version checks and existing retry/error behavior when changing cart, wishlist, or other versioned resources.

## 8. Security

- Use `src/lib/auth.ts` and existing server-side session helpers. Session cookies are HttpOnly; store-scoped customers must use the store-aware auth/API paths described in `CLAUDE.md`.
- Never print, expose, or commit secrets from `.env` files, cookies, or tokens. Keep authentication and privileged commercetools access server-side.

## 9. Git and Change Management

- Check `git rev-parse --show-toplevel` and `git status --short` before relying on Git state. This project currently has no local `.git` directory and may appear as untracked content in its parent repository.
- Do not stage, commit, or push unless explicitly requested; do not include unrelated parent-repository changes.

## 10. AI Agent Workflow

- Read this file, then consult `CLAUDE.md` and the relevant `.agents/skills/*/SKILL.md` for specialized bug-fix, feature, continuation, or handoff workflows.
- At the start of each `$fix-bug` task, manually run the `SessionStart` command hooks configured in `.codex/hooks.json` from the repository root. Skill activation happens after Codex's session-start event; this project currently configures `bash scripts/codex-session-start.sh`.
- Search for existing call sites and inspect the narrow affected path before editing. Preserve public interfaces unless necessary and check all callers when changing one.
- When GitNexus MCP tools are available, run upstream impact analysis before editing symbols and detect changes before committing. Warn about high or critical impact; refresh a stale index before relying on it.
- Do not run destructive commands or modify dependencies/environment files unless the task explicitly requires it.

## 11. Definition of Done

- The requested change is implemented in the established architecture, localized where needed, and scoped to expected files.
- Relevant lint/type checks were run and their limitations reported; browser-only behavior is clearly marked if unverified.
- No unrelated files, secrets, or generated artifacts were added to the change.

## 12. UI Design System

- Canonical design tokens live in `src/styles/design-tokens.css`; reuse these tokens and Tailwind utilities instead of adding duplicate values.
- Reusable storefront components live in `src/components/` and `src/components/commercetools-ui/`. Inspect and reuse their APIs before creating another component.
- Follow `.agents/skills/ui-design-system/SKILL.md` when changing shared UI or design tokens.
- The development component showcase is `/dev/ui-kit` and its implementation is in `src/app/dev/ui-kit/`.
- Update the showcase when a shared component API, supported variant, or token changes. The route is development-only and returns 404 in production.
