import assert from 'node:assert/strict';
import { test } from 'node:test';
import { labelUploadEndpoint } from './label-upload-url';

test('only explicit development permits HTTP localhost and 127.0.0.1', () => {
  for (const host of ['localhost', '127.0.0.1']) {
    const url = `http://${host}:3000/api/product-labels/images`;
    assert.equal(labelUploadEndpoint(url, true).endpoint?.href, url);
    assert.equal(labelUploadEndpoint(url, true).localHttp, true);
    assert.ok(labelUploadEndpoint(url, false).error);
  }
});

test('non-local HTTP is rejected, and HTTPS is accepted in development and production', () => {
  for (const development of [false, true]) {
    assert.ok(
      labelUploadEndpoint(
        'https://upload.example/api/product-labels/images',
        development
      ).endpoint
    );
    for (const host of [
      'remote.example',
      'localhost.evil.example',
      '127.0.0.2',
      '[::1]',
    ])
      assert.ok(
        labelUploadEndpoint(
          `http://${host}/api/product-labels/images`,
          development
        ).error
      );
  }
});

test('missing, malformed and unsafe configuration returns errors instead of throwing', () => {
  for (const value of [
    undefined,
    '',
    null,
    {},
    'invalid',
    '/relative',
    'https://user:pass@upload.example/api/product-labels/images',
    'https://upload.example/api/product-labels/images?key=value',
    'https://upload.example/api/product-labels/images#fragment',
    'https://upload.example/other',
    'ftp://localhost/api/product-labels/images',
  ]) {
    assert.doesNotThrow(() => labelUploadEndpoint(value, true));
    assert.ok(labelUploadEndpoint(value, true).error);
  }
});
