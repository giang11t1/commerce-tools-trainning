import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { generateKeyPair, SignJWT } from 'jose';
import sharp from 'sharp';
import { createImageHandler } from '../api/product-labels/images';
import { MAX_IMAGE_BYTES, validateUploadedImage } from '../src/label-media';

const issuer = 'https://mc-api.us-central1.gcp.commercetools.com';
const url = 'https://labels.example/api/product-labels/images';
const project = 'test-project';
const env = {
  MC_LABEL_UPLOAD_ISSUER: issuer,
  MC_LABEL_UPLOAD_URL: url,
  MC_LABEL_UPLOAD_PROJECT_KEY: project,
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
};
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let otherKeys: typeof keys;

before(async () => {
  [keys, otherKeys] = await Promise.all([
    generateKeyPair('RS256'),
    generateKeyPair('RS256'),
  ]);
});

function token(claims = {}, privateKey = keys.privateKey) {
  return new SignJWT({
    type: 'exchange',
    [`${issuer}/claims/project_key`]: project,
    [`${issuer}/claims/user_permissions`]: ['canManageProductLabels'],
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(issuer)
    .setAudience(url)
    .setSubject('test-user')
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(privateKey);
}

function request(jwt: string | undefined, body: unknown, contentType = 'application/json') {
  const headers = new Headers({
    'Content-Type': contentType,
    'X-Project-Key': project,
    'X-User-Permissions': 'canManageProductLabels',
  });
  if (jwt) headers.set('Authorization', ['Bearer', jwt].join(' '));
  return new Request(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

function handler(fetcher: typeof fetch = async () => {
  assert.fail('Unexpected Cloudinary request');
}) {
  return createImageHandler(env, { getKey: async () => keys.publicKey, fetcher });
}

test('requires a signed exchange token and signed Manage permission before reading the body', async () => {
  for (const [jwt, status] of [
    [undefined, 401],
    [await token({}, otherKeys.privateKey), 401],
    [await token({ [`${issuer}/claims/user_permissions`]: undefined }), 403],
    [await token({ [`${issuer}/claims/user_permissions`]: ['canViewProductLabels'] }), 403],
    [await token({ [`${issuer}/claims/project_key`]: 'other-project' }), 403],
  ] as const) {
    const req = request(jwt, { data: 'invalid' });
    assert.equal((await handler()(req)).status, status);
    assert.equal(req.bodyUsed, false);
  }
});

test('fails closed without configuration and only accepts POST', async () => {
  const upload = createImageHandler({});
  const get = await upload(new Request(url));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal((await upload(request(await token(), {}))).status, 503);
});

function fixture(format: 'png' | 'jpeg' | 'webp', width = 512, height = 128) {
  return sharp({ create: { width, height, channels: 3, background: '#ff0000' } })
    .toFormat(format).toBuffer();
}

test('rejects malformed, unsupported, mismatched and oversized uploads before Cloudinary', async () => {
  const jwt = await token();
  const png = await fixture('png');
  for (const [data, mimeType, status] of [
    ['AAAA====', 'image/png', 400],
    ['AB==', 'image/png', 400], // Non-canonical padding bits.
    ['PHN2Zy8+', 'image/svg+xml', 400],
    ['PHN2Zy8+', 'image/png', 400],
    [png.toString('base64'), 'image/jpeg', 400],
    [png.subarray(0, 40).toString('base64'), 'image/png', 400],
    [Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64'), 'image/png', 413],
    [(await fixture('png', 4097, 1)).toString('base64'), 'image/png', 400],
    [(await fixture('png', 4096, 4096)).toString('base64'), 'image/png', 400],
  ] as const) {
    assert.equal((await handler()(request(jwt, { data, mimeType }))).status, status);
  }
  assert.equal((await handler()(request(jwt, {}, 'multipart/form-data'))).status, 415);
});

test('masks Cloudinary failures and returns 502', async () => {
  const data = (await fixture('png')).toString('base64');
  const jwt = await token();
  for (const fetcher of [
    async () => new Response('provider detail', { status: 401 }),
    async () => { throw new Error('provider detail'); },
    async () => new Response('invalid JSON'),
  ]) {
    const response = await handler(fetcher)(request(jwt, { data, mimeType: 'image/png' }));
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /provider detail|test-secret/);
  }
});

test('uploads PNG, JPEG and WebP and returns metadata accepted by the editor', async () => {
  const jwt = await token();
  for (const format of ['png', 'jpeg', 'webp'] as const) {
    const bytes = await fixture(format);
    const mimeType = `image/${format}` as const;
    const response = await handler(async (target, options) => {
      assert.equal(target, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
      assert.equal(options?.method, 'POST');
      assert.ok(options.body instanceof FormData);
      assert.ok(options.body.get('signature'));
      const file = options.body.get('file');
      assert.ok(file instanceof File);
      assert.equal(file.type, mimeType);
      const publicId = options.body.get('public_id');
      return Response.json({
        secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v1/${publicId}.${format}`,
        public_id: publicId,
        asset_id: 'test-asset',
        width: 512,
        height: 128,
        format: format === 'jpeg' ? 'jpg' : format,
      });
    })(request(jwt, { data: bytes.toString('base64'), mimeType }));
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const image = validateUploadedImage(await response.json(), {
      mimeType, size: bytes.length, width: 512, height: 128,
    });
    assert.deepEqual(image.alt, { 'en-US': 'Product label' });
    assert.deepEqual([image.width, image.height, image.objectFit], [128, 32, 'contain']);
    assert.equal(image.assetId, 'test-asset');
  }
});
