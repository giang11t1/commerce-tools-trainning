import { validateImage } from './label-configuration';
import type { LabelImage } from './label-configuration';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4096;
export const MAX_IMAGE_PIXELS = 16_000_000;

/**
 * Supply this adapter to LabelImageFields to enable uploads. No provider is
 * configured by default. Implement authentication, storage and progress in the
 * host application; never put storage credentials in this client bundle.
 *
 * Browser validation is preflight only. The provider MUST independently validate
 * the actual bytes, MIME, decoded dimensions and limits server-side, enforce
 * authorization, and return a durable HTTPS URL plus complete LabelImage metadata.
 * size/originalWidth/originalHeight describe the submitted original file.
 * Honor signal; report progress in [0, 100], or null when indeterminate. Replacing/removing a reference
 * never deletes an asset; retention/orphan cleanup is the provider's concern.
 */
export interface LabelMediaAdapter {
  upload(
    file: File,
    options: {
      onProgress: (percent: number | null) => void;
      signal: AbortSignal;
    }
  ): Promise<LabelImage>;
}

export type ImageMetadata = {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  size: number;
};

function dimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  )
    throw new Error(
      'Image dimensions must be 1–4096 pixels per side and at most 16 million pixels.'
    );
}

export function validateImageFile(file: Pick<File, 'type' | 'size'>) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('Choose a PNG, JPEG or WebP image. SVG is not allowed.');
  if (!Number.isInteger(file.size) || file.size < 1)
    throw new Error('The image file is empty.');
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error('The image must be 2 MB or smaller.');
}

/** Reads container signatures/dimensions, not proof that the image decodes. */
export function parseImageBytes(bytes: Uint8Array): ImageMetadata {
  if (bytes.length > MAX_IMAGE_BYTES)
    throw new Error('The image must be 2 MB or smaller.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const matches = (offset: number, values: number[]) =>
    values.every((value, index) => bytes[offset + index] === value);
  const text = (offset: number, value: string) =>
    matches(
      offset,
      Array.from(value, (character) => character.charCodeAt(0))
    );
  const result = (
    mimeType: ImageMetadata['mimeType'],
    width: number,
    height: number
  ): ImageMetadata => {
    dimensions(width, height);
    return { mimeType, width, height, size: bytes.length };
  };
  if (
    bytes.length >= 33 &&
    matches(0, [137, 80, 78, 71, 13, 10, 26, 10]) &&
    view.getUint32(8) === 13 &&
    text(12, 'IHDR')
  )
    return result('image/png', view.getUint32(16), view.getUint32(20));
  if (matches(0, [255, 216, 255])) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 8
      )
        return result(
          'image/jpeg',
          view.getUint16(offset + 5),
          view.getUint16(offset + 3)
        );
      offset += length;
    }
  }
  if (
    bytes.length >= 20 &&
    text(0, 'RIFF') &&
    text(8, 'WEBP') &&
    view.getUint32(4, true) + 8 === bytes.length
  ) {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset + 4, true);
      const data = offset + 8;
      if (data + length > bytes.length) break;
      const uint24 = (at: number) =>
        bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
      if (text(offset, 'VP8X') && length >= 10)
        return result('image/webp', uint24(data + 4) + 1, uint24(data + 7) + 1);
      if (
        text(offset, 'VP8 ') &&
        length >= 10 &&
        (bytes[data] & 1) === 0 &&
        matches(data + 3, [157, 1, 42])
      )
        return result(
          'image/webp',
          view.getUint16(data + 6, true) & 16383,
          view.getUint16(data + 8, true) & 16383
        );
      if (text(offset, 'VP8L') && length >= 5 && bytes[data] === 47) {
        const bits = view.getUint32(data + 1, true);
        return result(
          'image/webp',
          (bits & 16383) + 1,
          ((bits >>> 14) & 16383) + 1
        );
      }
      offset = data + length + (length % 2);
    }
  }
  throw new Error(
    'The image signature is invalid or unsupported. SVG is not allowed.'
  );
}

type DecodedImage = { width: number; height: number; close: () => void };
type DecodeImage = (file: File) => Promise<DecodedImage>;

const decodeImage: DecodeImage = async (file) => {
  if (typeof createImageBitmap !== 'function')
    throw new Error(
      'This browser cannot validate images. Use a current browser.'
    );
  try {
    return await createImageBitmap(file, { imageOrientation: 'none' });
  } catch {
    throw new Error('The image cannot be decoded. Choose a valid image file.');
  }
};

export async function preflightImage(
  file: File,
  signal: AbortSignal,
  decode: DecodeImage = decodeImage
): Promise<ImageMetadata> {
  signal.throwIfAborted();
  validateImageFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal.throwIfAborted();
  const metadata = parseImageBytes(bytes);
  if (metadata.size !== file.size || metadata.mimeType !== file.type)
    throw new Error(
      'The file contents do not match its declared image type or size.'
    );
  const decoded = await decode(file);
  try {
    signal.throwIfAborted();
    dimensions(decoded.width, decoded.height);
    if (decoded.width !== metadata.width || decoded.height !== metadata.height)
      throw new Error(
        'The decoded image dimensions do not match its file header.'
      );
    return metadata;
  } finally {
    decoded.close();
  }
}

export function validateUploadedImage(
  value: unknown,
  original: ImageMetadata
): LabelImage {
  const image = validateImage(value);
  if (
    image.mimeType !== original.mimeType ||
    image.size !== original.size ||
    image.originalWidth !== original.width ||
    image.originalHeight !== original.height
  )
    throw new Error(
      'The upload provider returned missing or inconsistent original image metadata.'
    );
  return image;
}

/** Owns one upload at a time; cancellation invalidates even non-cooperative providers. */
export function createLabelMediaUpload(
  callbacks: {
    onBusyChange: (busy: boolean) => void;
    onProgress: (percent: number | null) => void;
    onError: (error: unknown) => void;
    onSuccess: (image: LabelImage) => void;
  },
  preflight: typeof preflightImage = preflightImage
) {
  let active: AbortController | undefined;
  function cancel() {
    if (!active) return;
    active.abort();
    active = undefined;
    callbacks.onBusyChange(false);
  }
  return {
    cancel,
    async start(file: File, adapter: LabelMediaAdapter) {
      cancel();
      const current = new AbortController();
      active = current;
      callbacks.onBusyChange(true);
      callbacks.onProgress(0);
      try {
        const metadata = await preflight(file, current.signal);
        current.signal.throwIfAborted();
        const uploaded = await adapter.upload(file, {
          signal: current.signal,
          onProgress(percent) {
            if (
              active === current &&
              (percent === null || Number.isFinite(percent))
            )
              callbacks.onProgress(
                percent === null ? null : Math.max(0, Math.min(100, percent))
              );
          },
        });
        if (active !== current || current.signal.aborted) return;
        const image = validateUploadedImage(uploaded, metadata);
        callbacks.onSuccess(image);
      } catch (error) {
        if (active === current && !current.signal.aborted)
          callbacks.onError(error);
      } finally {
        if (active === current) {
          active = undefined;
          callbacks.onBusyChange(false);
        }
      }
    },
  };
}
