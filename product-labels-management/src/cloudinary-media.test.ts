import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import type { TSdkAction } from '@commercetools-frontend/sdk';

const require = createRequire(import.meta.url);
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    app: { mcApiUrl: 'https://mc-api.us-central1.gcp.commercetools.com' },
  },
});
let createCloudinaryMediaAdapter: typeof import('./cloudinary-media').createCloudinaryMediaAdapter;
try {
  ({ createCloudinaryMediaAdapter } = require('./cloudinary-media'));
} finally {
  if (previousWindow)
    Object.defineProperty(globalThis, 'window', previousWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}

function fixture() {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, 64);
  new DataView(bytes.buffer).setUint32(20, 32);
  return new File([bytes], 'label.png', { type: 'image/png' });
}
const image = {
  url: 'https://res.cloudinary.com/test/image/upload/label.png',
  alt: { en: 'Product label' },
  width: 64,
  height: 32,
  objectFit: 'contain',
  originalWidth: 64,
  originalHeight: 32,
  size: 33,
  mimeType: 'image/png',
};
const url = 'https://labels.example/api/product-labels/images';

test('uses supported MC forward-to action, permission claims and current project, without credentials', async () => {
  const calls: TSdkAction[] = [];
  const adapter = createCloudinaryMediaAdapter(
    url,
    async (action) => {
      calls.push(action);
      return image;
    },
    'test-project'
  );
  const progress: (number | null)[] = [];
  const result = await adapter.upload(fixture(), {
    signal: new AbortController().signal,
    onProgress: (value) => progress.push(value),
  });
  assert.equal(result.url, image.url);
  assert.equal(calls.length, 1);
  const action = calls[0];
  assert.ok('uri' in action.payload);
  assert.equal(action.payload.uri, '/proxy/forward-to');
  assert.equal(action.payload.headers?.['X-Forward-To'], url);
  assert.equal(action.payload.headers?.['X-Forward-To-Claims'], 'permissions');
  assert.equal(
    action.payload.headers?.['X-Forward-To-Audience-Policy'],
    'forward-url-full-path'
  );
  assert.equal(action.payload.includeUserPermissions, true);
  assert.equal(action.payload.audiencePolicy, 'forward-url-full-path');
  assert.deepEqual(progress, [null, 100]);
  assert.match(JSON.stringify(action), /test-project/);
  assert.match(JSON.stringify(action), /forward-to/);
  assert.doesNotMatch(JSON.stringify(action), /api_secret|CLOUDINARY_API/);
});

test('rejects insecure configuration, invalid files, provider failures and inconsistent metadata', async () => {
  assert.throws(() =>
    createCloudinaryMediaAdapter(
      'http://localhost/upload',
      async () => image,
      'p'
    )
  );
  const options = { signal: new AbortController().signal, onProgress() {} };
  await assert.rejects(
    () =>
      createCloudinaryMediaAdapter(url, async () => image, 'p').upload(
        new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }),
        options
      ),
    /SVG/
  );
  await assert.rejects(
    () =>
      createCloudinaryMediaAdapter(
        url,
        async () => {
          throw new Error('Upload denied');
        },
        'p'
      ).upload(fixture(), options),
    /Upload denied/
  );
  await assert.rejects(
    () =>
      createCloudinaryMediaAdapter(
        url,
        async () => ({ ...image, size: 99 }),
        'p'
      ).upload(fixture(), options),
    /inconsistent/
  );
});

test('cancelled gateway uploads cannot replace the image even if the server completes', async () => {
  const controller = new AbortController();
  const adapter = createCloudinaryMediaAdapter(
    url,
    async () => {
      controller.abort();
      return image;
    },
    'p'
  );
  await assert.rejects(
    () =>
      adapter.upload(fixture(), {
        signal: controller.signal,
        onProgress() {},
      }),
    { name: 'AbortError' }
  );
});

test('development loopback enables an adapter but does not bypass MC authorization or claim HTTP forwarding works', async () => {
  let dispatches = 0;
  const adapter = createCloudinaryMediaAdapter(
    'http://localhost:3000/api/product-labels/images',
    async () => {
      dispatches++;
      return image;
    },
    'test-project',
    true
  );
  await assert.rejects(
    () =>
      adapter.upload(fixture(), {
        signal: new AbortController().signal,
        onProgress() {},
      }),
    /Merchant Center cannot forward/
  );
  assert.equal(dispatches, 0);
  assert.throws(
    () =>
      createCloudinaryMediaAdapter(
        'http://localhost:3000/api/product-labels/images',
        async () => image,
        'p',
        false
      ),
    /HTTPS/
  );
});
