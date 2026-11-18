import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route } from 'react-router-dom';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const baseUrl = '/test-project/product-labels';

function renderRoute(
  route: string,
  key = 'new',
  overrides: Record<string, unknown> = {},
  uploadSettings: { url?: unknown; environment?: string } = {}
) {
  const reads: string[] = [];
  const record = {
    key,
    version: 7,
    value: {
      key,
      name: { 'en-US': 'New arrival', 'de-DE': 'Neu eingetroffen' },
      color: '#123456',
      backgroundColor: '#abcdef',
      priority: 42,
      active: false,
      description: 'Existing label description',
      ...overrides,
    },
  };
  const cache = new Map<string, Record<string, unknown>>();
  function load(filename: string): Record<string, unknown> {
    const cached = cache.get(filename);
    if (cached) return cached;
    const loaded = { exports: {} as Record<string, unknown> };
    cache.set(filename, loaded.exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = (specifier: string): unknown => {
      if (specifier === '@commercetools-frontend/sdk')
        return {
          useAsyncDispatch: () => async () => {
            throw new Error('Rendering must not send an upload request.');
          },
        };
      if (specifier.endsWith('.module.css'))
        return new Proxy({}, { get: (_, property) => property });
      if (specifier === './use-service')
        return {
          useService: () => ({
            projectKey: 'test-project',
            view: true,
            manage: true,
            service: {
              listLabels: async () => [record],
              readLabel: async (requestedKey: string) => {
                reads.push(requestedKey);
                return record;
              },
            },
          }),
        };
      if (specifier === '@commercetools-frontend/application-shell')
        return { ApplicationPageTitle: () => null };
      if (specifier === '@commercetools-frontend/application-components')
        return { PageUnauthorized: () => null };
      if (specifier === '@commercetools-frontend/application-shell-connectors')
        return {
          useApplicationContext: (selector: (value: unknown) => unknown) =>
            selector({
              dataLocale: 'en-US',
              project: { key: 'test-project', languages: ['en-US', 'de-DE'] },
              environment: { labelUploadUrl: uploadSettings.url },
            }),
        };
      if (specifier.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), specifier);
        const target = ['.tsx', '.ts']
          .map((extension) => base + extension)
          .find(existsSync);
        assert.ok(target, `Local import ${specifier} must resolve`);
        const exports = load(target);
        if (specifier === './components')
          return {
            ...exports,
            useResource: (fetch: () => Promise<unknown>) => {
              // Execute the real loader to check which route key is requested;
              // provide its settled snapshot because effects do not run in SSR.
              void fetch();
              return {
                data:
                  route === '/labels'
                    ? [record]
                    : reads.length
                    ? record
                    : undefined,
                loading: false,
                reload: () => {},
              };
            },
          };
        return exports;
      }
      return require(specifier);
    };
    const execute = runInNewContext(
      `(function(require, module, exports) { ${code}\n})`,
      {
        console,
        process: {
          env: {
            ...process.env,
            NODE_ENV: uploadSettings.environment ?? 'development',
          },
        },
        URL,
        URLSearchParams,
      }
    );
    execute(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  const App = load(path.join(import.meta.dirname, 'app.tsx'))
    .default as ComponentType;
  const html = renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale: 'en', messages: {} },
      createElement(
        MemoryRouter,
        { initialEntries: [baseUrl + route] },
        createElement(
          Route,
          { path: '/:projectKey/product-labels' },
          createElement(App)
        )
      )
    )
  );
  return { html, reads };
}

test('Edit links use an unambiguous URL even when the label key is new', () => {
  const { html } = renderRoute('/labels');
  assert.match(
    html,
    /href="\/test-project\/product-labels\/labels\/new\/edit"/
  );
  assert.match(html, /href="\/test-project\/product-labels\/labels\/new"/);
});

for (const key of ['new', 'seasonal']) {
  test(`editing ${key} loads all current label values instead of create defaults`, () => {
    const { html, reads } = renderRoute(`/labels/${key}/edit`, key);
    assert.deepEqual(reads, [key]);
    assert.match(html, /<h2>Edit label<\/h2>/);
    for (const value of [
      key,
      'New arrival',
      'Neu eingetroffen',
      '#123456',
      '#abcdef',
      '42',
    ])
      assert.ok(html.includes(`value="${value}"`), value);
    assert.match(html, /Existing label description<\/textarea>/);
    assert.doesNotMatch(html, /type="checkbox"[^>]*checked/);
    assert.match(html, /disabled=""[^>]*value="(?:new|seasonal)"/);
  });
}

test('Create label still opens empty defaults without reading an existing label', () => {
  const { html, reads } = renderRoute('/labels/new');
  assert.deepEqual(reads, []);
  assert.match(html, /<h2>Create label<\/h2>/);
  assert.doesNotMatch(html, /New arrival|Existing label description/);
});

test('existing non-conflicting edit URLs still load the saved label', () => {
  const { html, reads } = renderRoute('/labels/seasonal', 'seasonal');
  assert.deepEqual(reads, ['seasonal']);
  assert.match(html, /<h2>Edit label<\/h2>/);
  assert.match(html, /value="New arrival"/);
});

test('image edit form and preview retain saved dimensions, position, alt text and styling', () => {
  const { html } = renderRoute('/labels/new/edit', 'new', {
    type: 'image',
    active: true,
    position: 'bottom-right',
    image: {
      url: 'https://res.cloudinary.com/demo/label.webp',
      alt: { 'en-US': 'Certified', 'de-DE': 'Zertifiziert' },
      width: 96,
      height: 64,
      objectFit: 'cover',
    },
    advancedCss: 'border-radius: 8px;',
  });
  assert.match(html, /Image settings/);
  assert.match(html, /value="96"/);
  assert.match(html, /value="64"/);
  assert.match(html, /alt="Certified"/);
  assert.match(html, /value="bottom-right" selected/);
  assert.ok(html.includes('border-radius:8px'), html.slice(-1800));
  assert.match(html, /Upload provider not configured/);
  assert.match(html, /type="file"[^>]*disabled/);
});

test('list exposes label type, position, UTC schedule dates and scheduled status without deleting assignments', () => {
  const { html } = renderRoute('/labels', 'new', {
    position: 'bottom-left',
    active: true,
    startDate: '2099-01-01T10:00:00.000Z',
    endDate: '2099-01-02T10:00:00.000Z',
  });
  assert.match(html, /<td>Text<\/td>/);
  assert.match(html, /<td>bottom-left<\/td>/);
  assert.match(html, /<td>Scheduled<\/td>/);
  assert.match(html, /2099-01-01T10:00:00.000Z/);
  assert.match(html, /2099-01-02T10:00:00.000Z/);
});

for (const url of [
  undefined,
  'not a URL',
  'http://remote.example/api/product-labels/images',
]) {
  test(`invalid or missing upload configuration (${url}) keeps App routes and editor usable`, () => {
    const { html } = renderRoute(
      '/labels/new/edit',
      'new',
      {
        type: 'image',
      },
      { url }
    );
    assert.match(html, /<h1[^>]*>Product labels<\/h1>/);
    assert.match(html, /<h2>Edit label<\/h2>/);
    if (url !== undefined) assert.match(html, /role="alert"/);
    else assert.match(html, /Upload provider not configured/);
    assert.match(html, /type="file"[^>]*disabled/);
  });
}

for (const host of ['localhost', '127.0.0.1']) {
  test(`development HTTP ${host} enables image selection with the MC transport limitation visible`, () => {
    const { html } = renderRoute(
      '/labels/new/edit',
      'new',
      {
        type: 'image',
      },
      { url: `http://${host}:3000/api/product-labels/images` }
    );
    assert.match(html, /type="file"/);
    assert.doesNotMatch(html, /type="file"[^>]*disabled/);
    assert.match(html, /Merchant Center forwarding requires a public HTTPS/);
  });
}

test('production HTTP loopback disables uploads without crashing; HTTPS enables them', () => {
  const { html } = renderRoute(
    '/labels/new/edit',
    'new',
    { type: 'image' },
    {
      url: 'http://localhost:3000/api/product-labels/images',
      environment: 'production',
    }
  );
  assert.match(html, /type="file"[^>]*disabled/);
  assert.match(html, /Configure an HTTPS upload URL/);
  const https = renderRoute(
    '/labels/new/edit',
    'new',
    { type: 'image' },
    {
      url: 'https://upload.example/api/product-labels/images',
      environment: 'production',
    }
  ).html;
  assert.doesNotMatch(https, /type="file"[^>]*disabled/);
  assert.doesNotMatch(https, /role="alert"/);
});
