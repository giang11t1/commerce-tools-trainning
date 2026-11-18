import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route } from 'react-router-dom';
import type { ComponentType } from 'react';

const require = createRequire(import.meta.url);
const appDirectory = path.resolve(import.meta.dirname, '..');
const scriptsRequire = createRequire(
  require.resolve('@commercetools-frontend/mc-scripts/package.json')
);
const { transformSync } = scriptsRequire('@babel/core');
const scriptsDist = path.join(
  path.dirname(
    scriptsRequire.resolve('@commercetools-frontend/mc-scripts/package.json')
  ),
  'dist'
);
const optimizationModule = readdirSync(scriptsDist).find((file) =>
  /^optimizations-.*\.cjs\.dev\.js$/.test(file)
);
assert.ok(
  optimizationModule,
  'Application Kit runtime selector must be available'
);
const { hasJsxRuntime } = scriptsRequire(
  path.join(scriptsDist, optimizationModule)
);
const tsxFiles = readdirSync(path.join(appDirectory, 'src')).filter((file) =>
  file.endsWith('.tsx')
);

function compile(filename: string, environment: string, runtime: string) {
  const previousEnvironment = process.env.BABEL_ENV;
  process.env.BABEL_ENV = environment;
  try {
    const result = transformSync(readFileSync(filename, 'utf8'), {
      filename,
      envName: environment,
      babelrc: false,
      configFile: false,
      presets: [
        [
          scriptsRequire.resolve('@commercetools-frontend/babel-preset-mc-app'),
          { runtime },
        ],
      ],
    });
    assert.ok(result?.code);
    const executable = transformSync(result.code, {
      filename,
      babelrc: false,
      configFile: false,
      plugins: [
        scriptsRequire.resolve('@babel/plugin-transform-modules-commonjs'),
      ],
    });
    assert.ok(executable?.code);
    return executable.code as string;
  } finally {
    if (previousEnvironment === undefined) delete process.env.BABEL_ENV;
    else process.env.BABEL_ENV = previousEnvironment;
  }
}

test('dev and production commands enable the same JSX runtime as TypeScript and ESLint', () => {
  const manifest = JSON.parse(
    readFileSync(path.join(appDirectory, 'package.json'), 'utf8')
  );
  for (const command of ['start', 'build', 'test']) {
    assert.match(manifest.scripts[command], /^ENABLE_NEW_JSX_TRANSFORM=true /);
  }
  assert.equal(hasJsxRuntime(), true);
  assert.ok(tsxFiles.includes('labels.tsx'));
});

for (const environment of ['development', 'production']) {
  test(`${environment}: every TSX file compiles without unbound React namespace references`, () => {
    for (const file of tsxFiles) {
      const code = compile(
        path.join(appDirectory, 'src', file),
        environment,
        hasJsxRuntime() ? 'automatic' : 'classic'
      );
      assert.doesNotMatch(code, /\bReact\.(?:Fragment|createElement)\b/, file);
      assert.match(code, /@emotion\/react\/jsx-(?:dev-)?runtime/, file);
    }
  });

  test(`${environment}: /test-project/product-labels/labels renders populated and empty lists without global React`, () => {
    for (const populated of [true, false]) {
      const cache = new Map<string, Record<string, unknown>>();
      const label = {
        key: 'new-arrival',
        version: 1,
        value: {
          key: 'new-arrival',
          name: { en: 'New arrival' },
          color: '#ffffff',
          backgroundColor: '#213c73',
          priority: 10,
          active: true,
          description: '',
        },
      };
      function load(filename: string): Record<string, unknown> {
        const cached = cache.get(filename);
        if (cached) return cached;
        const module = { exports: {} as Record<string, unknown> };
        cache.set(filename, module.exports);
        const localRequire = (specifier: string): unknown => {
          if (specifier === './use-label-media')
            return { useLabelMedia: () => ({}) };
          if (specifier.endsWith('.module.css'))
            return new Proxy({}, { get: (_, key) => key });
          if (specifier === './use-service')
            return {
              useService: () => ({
                projectKey: 'test-project',
                view: true,
                manage: true,
                service: { listLabels: async () => (populated ? [label] : []) },
              }),
            };
          if (specifier === '@commercetools-frontend/application-shell')
            return {
              ApplicationPageTitle: () => null,
            };
          if (specifier === '@commercetools-frontend/application-components')
            return {
              PageUnauthorized: () => {
                throw new Error(
                  'The authorized labels route must not render PageUnauthorized'
                );
              },
            };
          if (
            specifier === '@commercetools-frontend/application-shell-connectors'
          )
            return {
              useApplicationContext: (
                selector: (context: unknown) => unknown
              ) =>
                selector({
                  dataLocale: 'en',
                  project: { languages: ['en', 'de'] },
                }),
            };
          if (specifier.startsWith('.')) {
            const base = path.resolve(path.dirname(filename), specifier);
            const target = ['.tsx', '.ts']
              .map((extension) => base + extension)
              .find((candidate) => existsSync(candidate));
            assert.ok(target, `Local import ${specifier} must resolve`);
            const exports = load(target);
            if (specifier === './components')
              return {
                ...exports,
                useResource: () => ({
                  data: populated ? [label] : [],
                  loading: false,
                  reload: () => {},
                }),
              };
            return exports;
          }
          return require(specifier);
        };
        const execute = runInNewContext(
          `(function(require, module, exports) { ${compile(
            filename,
            environment,
            hasJsxRuntime() ? 'automatic' : 'classic'
          )}\n})`,
          { console, process, URLSearchParams }
        );
        execute(localRequire, module, module.exports);
        return module.exports;
      }
      const App = load(path.join(appDirectory, 'src/app.tsx'))
        .default as ComponentType;
      const html = renderToStaticMarkup(
        createElement(
          IntlProvider,
          { locale: 'en', messages: {} },
          createElement(
            MemoryRouter,
            { initialEntries: ['/test-project/product-labels/labels'] },
            createElement(
              Route,
              { path: '/:projectKey/product-labels' },
              createElement(App)
            )
          )
        )
      );
      assert.match(html, /Search labels/);
      assert.match(html, /Create label/);
      assert.match(html, populated ? /New arrival/ : /No labels match/);
    }
  });
}
