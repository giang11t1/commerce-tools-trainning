import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createLabelMediaUpload,
  MAX_IMAGE_BYTES,
  parseImageBytes,
  preflightImage,
  validateImageFile,
  validateUploadedImage,
} from './label-media.ts';
import type { LabelImage } from './label-configuration';
import type { LabelMediaAdapter } from './label-media';

function png(width = 40, height = 20) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function webp(kind: string, data: number[]) {
  const bytes = new Uint8Array(20 + data.length + (data.length % 2));
  const view = new DataView(bytes.buffer);
  bytes.set(Buffer.from('RIFF'));
  view.setUint32(4, bytes.length - 8, true);
  bytes.set(Buffer.from(`WEBP${kind}`), 8);
  view.setUint32(16, data.length, true);
  bytes.set(data, 20);
  return bytes;
}

test('parses PNG, JPEG and three WebP signatures and dimensions', () => {
  assert.deepEqual(parseImageBytes(png()), {
    mimeType: 'image/png',
    width: 40,
    height: 20,
    size: 33,
  });
  assert.equal(
    parseImageBytes(
      Uint8Array.from([255, 216, 255, 192, 0, 11, 8, 0, 20, 0, 40, 1, 1, 17, 0])
    ).width,
    40
  );
  const fixtures = [
    webp('VP8X', [0, 0, 0, 0, 39, 0, 0, 19, 0, 0]),
    webp('VP8 ', [0, 0, 0, 157, 1, 42, 40, 0, 20, 0]),
    webp('VP8L', [47, 39, 192, 4, 0]),
  ];
  for (const fixture of fixtures) {
    const parsed = parseImageBytes(fixture);
    assert.equal(parsed.mimeType, 'image/webp');
    assert.equal(parsed.width, 40);
    assert.equal(parsed.height, 20);
  }
});

test('rejects SVG, unknown signatures, truncated headers and malformed containers', () => {
  for (const bytes of [
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    new Uint8Array(),
    png().slice(0, 24),
    Uint8Array.from([255, 216, 255, 192, 0, 255]),
    webp('FAKE', [0, 0]),
    webp('VP8L', [47, 0]),
  ])
    assert.throws(() => parseImageBytes(bytes), /signature/);
  const invalid = webp('VP8X', [0, 0, 0, 0, 39, 0, 0, 19, 0, 0]);
  invalid[4] = 0;
  assert.throws(() => parseImageBytes(invalid), /signature/);
});

test('enforces MIME, nonempty size and byte/dimension bounds', () => {
  for (const type of [
    'image/svg+xml',
    'application/octet-stream',
    '',
    'IMAGE/PNG',
  ])
    assert.throws(() => validateImageFile({ type, size: 10 }), /SVG/);
  assert.throws(
    () => validateImageFile({ type: 'image/png', size: 0 }),
    /empty/
  );
  assert.throws(
    () => validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }),
    /2 MB/
  );
  assert.doesNotThrow(() =>
    validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES })
  );
  assert.throws(
    () => parseImageBytes(new Uint8Array(MAX_IMAGE_BYTES + 1)),
    /2 MB/
  );
  for (const [width, height] of [
    [0, 1],
    [4097, 1],
    [4096, 4096],
  ])
    assert.throws(() => parseImageBytes(png(width, height)), /dimensions/);
  assert.equal(parseImageBytes(png(4000, 4000)).height, 4000);
});

test('preflight compares declared MIME and actual decoded dimensions, closing bitmap', async () => {
  const file = new File([png()], 'label.png', { type: 'image/png' });
  let closed = 0;
  const decode = async () => ({
    width: 40,
    height: 20,
    close: () => {
      closed++;
    },
  });
  assert.equal(
    (await preflightImage(file, new AbortController().signal, decode)).width,
    40
  );
  assert.equal(closed, 1);
  await assert.rejects(
    preflightImage(file, new AbortController().signal, async () => ({
      width: 20,
      height: 40,
      close: () => {
        closed++;
      },
    })),
    /do not match/
  );
  assert.equal(closed, 2);
  await assert.rejects(
    preflightImage(
      new File([png()], 'wrong.jpg', { type: 'image/jpeg' }),
      new AbortController().signal,
      decode
    ),
    /declared/
  );
  await assert.rejects(
    preflightImage(file, new AbortController().signal, async () => {
      throw new Error('Undecodable fixture');
    }),
    /Undecodable/
  );
});

test('aborts before upload/decode and closes a late decoded bitmap', async () => {
  const file = new File([png()], 'label.png', { type: 'image/png' });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(preflightImage(file, controller.signal), {
    name: 'AbortError',
  });
  const late = new AbortController();
  let closed = false;
  await assert.rejects(
    preflightImage(file, late.signal, async () => {
      late.abort();
      return {
        width: 40,
        height: 20,
        close: () => {
          closed = true;
        },
      };
    }),
    { name: 'AbortError' }
  );
  assert.equal(closed, true);
});

test('requires complete validated provider metadata matching the original', () => {
  const original = parseImageBytes(png());
  const image = {
    url: 'https://assets.example.com/label.png',
    alt: { en: 'Product label' },
    width: 40,
    height: 20,
    objectFit: 'contain',
    mimeType: 'image/png',
    size: 33,
    originalWidth: 40,
    originalHeight: 20,
  };
  assert.equal(validateUploadedImage(image, original).url, image.url);
  for (const field of ['mimeType', 'size', 'originalWidth', 'originalHeight']) {
    assert.throws(() =>
      validateUploadedImage({ ...image, [field]: undefined }, original)
    );
  }
  assert.throws(() => validateUploadedImage({ ...image, size: 32 }, original));
  assert.throws(() =>
    validateUploadedImage(
      { ...image, url: 'http://assets.example.com/label.png' },
      original
    )
  );
  assert.throws(() =>
    validateUploadedImage({ ...image, opacity: 2 }, original)
  );
});

function uploadHarness(preflight?: typeof preflightImage) {
  const busy: boolean[] = [];
  const progress: (number | null)[] = [];
  const errors: unknown[] = [];
  const images: LabelImage[] = [];
  const operation = createLabelMediaUpload(
    {
      onBusyChange: (value) => busy.push(value),
      onProgress: (value) => progress.push(value),
      onError: (value) => errors.push(value),
      onSuccess: (value) => images.push(value),
    },
    preflight ?? (async () => parseImageBytes(png()))
  );
  return { operation, busy, progress, errors, images };
}

function uploadedImage(): LabelImage {
  return {
    url: 'https://assets.example.com/label.png',
    alt: { en: 'Label' },
    width: 40,
    height: 20,
    objectFit: 'contain',
    mimeType: 'image/png',
    size: 33,
    originalWidth: 40,
    originalHeight: 20,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

const uploadFile = () => new File([png()], 'label.png', { type: 'image/png' });

test('upload operation reports provider rejection without success and unwinds busy', async () => {
  const harness = uploadHarness();
  const error = new Error('Storage permission denied');
  await harness.operation.start(uploadFile(), {
    upload: async () => {
      throw error;
    },
  });
  assert.deepEqual(harness.busy, [true, false]);
  assert.deepEqual(harness.errors, [error]);
  assert.deepEqual(harness.images, []);
});

test('upload operation rejects invalid provider metadata without replacing the image', async () => {
  for (const result of [
    { ...uploadedImage(), size: undefined },
    { ...uploadedImage(), originalHeight: 21 },
    { ...uploadedImage(), url: 'http://assets.example.com/label.png' },
  ]) {
    const harness = uploadHarness();
    await harness.operation.start(uploadFile(), {
      upload: async () => result as LabelImage,
    });
    assert.deepEqual(harness.busy, [true, false]);
    assert.equal(harness.errors.length, 1);
    assert.deepEqual(harness.images, []);
  }
});

test('preflight failure unwinds busy and never invokes the provider', async () => {
  const harness = uploadHarness(preflightImage);
  let calls = 0;
  await harness.operation.start(
    new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' }),
    {
      upload: async () => {
        calls++;
        return uploadedImage();
      },
    }
  );
  assert.equal(calls, 0);
  assert.deepEqual(harness.busy, [true, false]);
  assert.equal(harness.errors.length, 1);
  assert.deepEqual(harness.images, []);
});

test('replacement aborts the previous upload and ignores stale completion/progress', async () => {
  const harness = uploadHarness();
  const first = deferred<LabelImage>();
  const second = deferred<LabelImage>();
  const options: Parameters<LabelMediaAdapter['upload']>[1][] = [];
  const adapter: LabelMediaAdapter = {
    upload: async (_file, next) => {
      options.push(next);
      return options.length === 1 ? first.promise : second.promise;
    },
  };
  const old = harness.operation.start(uploadFile(), adapter);
  await Promise.resolve();
  const replacement = harness.operation.start(uploadFile(), adapter);
  await Promise.resolve();
  assert.equal(options[0].signal.aborted, true);
  options[0].onProgress(90);
  assert.deepEqual(harness.progress, [0, 0]);
  first.resolve(uploadedImage());
  await old;
  assert.deepEqual(harness.images, []);
  assert.deepEqual(harness.busy, [true, false, true]);
  options[1].onProgress(150);
  options[1].onProgress(NaN);
  const next = {
    ...uploadedImage(),
    url: 'https://assets.example.com/replacement.png',
  };
  second.resolve(next);
  await replacement;
  assert.deepEqual(harness.images, [next]);
  assert.deepEqual(harness.busy, [true, false, true, false]);
  assert.deepEqual(harness.progress, [0, 0, 100]);
});

test('removal/unmount cancellation is idempotent and suppresses late provider success or failure', async () => {
  for (const outcome of ['success', 'failure']) {
    const harness = uploadHarness();
    const pending = deferred<LabelImage>();
    let signal: AbortSignal | undefined;
    const started = harness.operation.start(uploadFile(), {
      upload: async (_file, options) => {
        signal = options.signal;
        return pending.promise;
      },
    });
    await Promise.resolve();
    harness.operation.cancel();
    harness.operation.cancel();
    assert.equal(signal?.aborted, true);
    if (outcome === 'success') pending.resolve(uploadedImage());
    else pending.reject(new Error('Late provider failure'));
    await started;
    assert.deepEqual(harness.busy, [true, false]);
    assert.deepEqual(harness.errors, []);
    assert.deepEqual(harness.images, []);
  }
});

test('cancellation during preflight never starts provider upload', async () => {
  const metadata = deferred<ReturnType<typeof parseImageBytes>>();
  const harness = uploadHarness(async () => metadata.promise);
  let calls = 0;
  const started = harness.operation.start(uploadFile(), {
    upload: async () => {
      calls++;
      return uploadedImage();
    },
  });
  harness.operation.cancel();
  metadata.resolve(parseImageBytes(png()));
  await started;
  assert.equal(calls, 0);
  assert.deepEqual(harness.busy, [true, false]);
  assert.deepEqual(harness.errors, []);
  assert.deepEqual(harness.images, []);
});
