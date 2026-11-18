import { createHash, randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import sharp from 'sharp';
import {
    MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS, parseImageBytes,
} from '../src/label-media';
import type { LabelImage } from '../src/label-configuration';
import { labelUploadEndpoint } from '../src/label-upload-url';

const ISSUERS = [
    'https://mc-api.us-central1.gcp.commercetools.com',
    'https://mc-api.europe-west1.gcp.commercetools.com',
    'https://mc-api.australia-southeast1.gcp.commercetools.com',
    'https://mc-api.eu-central-1.aws.commercetools.com',
    'https://mc-api.us-east-2.aws.commercetools.com',
];
const MAX_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1024;
const keySets = new Map<string, JWTVerifyGetKey>();

export class LabelUploadError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

export type LabelUploadConfig = {
    issuer: string;
    url: string;
    projectKey: string;
    cloudName: string;
    apiKey: string;
    apiSecret: string;
};

export function labelUploadConfig(env: Record<string, string | undefined>): LabelUploadConfig {
    const config = {
        issuer: env.MC_LABEL_UPLOAD_ISSUER ?? '',
        url: env.MC_LABEL_UPLOAD_URL ?? '',
        projectKey: env.MC_LABEL_UPLOAD_PROJECT_KEY ?? '',
        cloudName: env.CLOUDINARY_CLOUD_NAME ?? '',
        apiKey: env.CLOUDINARY_API_KEY ?? '',
        apiSecret: env.CLOUDINARY_API_SECRET ?? '',
    };
    if (Object.values(config).some((value) => !value))
        throw new LabelUploadError(503, 'Image uploads are not configured on the server.');
    const endpoint = labelUploadEndpoint(config.url, env.NODE_ENV === 'development');
    if (!endpoint.endpoint)
        throw new LabelUploadError(503, endpoint.error);
    if (!ISSUERS.includes(config.issuer) ||
        !/^[a-z0-9_-]+$/i.test(config.cloudName) ||
        !/^[a-z0-9_-]+$/i.test(config.projectKey))
        throw new LabelUploadError(503, 'The upload server configuration is invalid.');
    return { ...config, url: endpoint.endpoint.href };
}

export async function authorizeLabelUpload(
    request: Request,
    config: LabelUploadConfig,
    getKey?: JWTVerifyGetKey,
) {
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token || token.length > 32768)
        throw new LabelUploadError(401, 'A Merchant Center exchange token is required.');
    if (!getKey) {
        if (!keySets.has(config.issuer))
            keySets.set(config.issuer, createRemoteJWKSet(
                new URL(`${config.issuer}/.well-known/jwks.json`),
                { timeoutDuration: 5000 },
            ));
        getKey = keySets.get(config.issuer)!;
    }
    let payload;
    try {
        ({ payload } = await jwtVerify(token, getKey, {
            issuer: config.issuer, audience: config.url, algorithms: ['RS256'],
            requiredClaims: ['exp', 'iat', 'sub'], maxTokenAge: '60s',
        }));
    } catch {
        throw new LabelUploadError(401, 'The Merchant Center exchange token is invalid or expired.');
    }
    if (payload.type !== 'exchange' || typeof payload.sub !== 'string' || !payload.sub)
        throw new LabelUploadError(401, 'A Merchant Center exchange token is required.');
    const permissions = payload[`${config.issuer}/claims/user_permissions`];
    if (payload[`${config.issuer}/claims/project_key`] !== config.projectKey ||
        !Array.isArray(permissions) || !permissions.includes('canManageProductLabels'))
        throw new LabelUploadError(403, 'Product Labels Manage permission for the configured project is required.');
}

async function readUpload(request: Request) {
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
        throw new LabelUploadError(415, 'Send an image using the Merchant Center JSON upload adapter.');
    const length = request.headers.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES))
        throw new LabelUploadError(413, 'Image files must not exceed 2 MB.');
    if (!request.body) throw new LabelUploadError(400, 'An image file is required.');
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > MAX_BODY_BYTES) {
                await reader.cancel();
                throw new LabelUploadError(413, 'Image files must not exceed 2 MB.');
            }
            chunks.push(value);
        }
    } finally { reader.releaseLock(); }
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
        throw new LabelUploadError(400, 'The image upload body is invalid JSON.');
    }
    if (!value || typeof value !== 'object' ||
        typeof value.data !== 'string' ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(value.mimeType) ||
        !value.data || value.data.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data))
        throw new LabelUploadError(400, 'Choose a PNG, JPEG or WebP image. SVG is not allowed.');
    const bytes = Buffer.from(value.data, 'base64');
    if (bytes.toString('base64') !== value.data)
        throw new LabelUploadError(400, 'The image encoding is invalid.');
    if (bytes.length > MAX_IMAGE_BYTES)
        throw new LabelUploadError(413, 'Image files must not exceed 2 MB.');
    return { bytes, mimeType: value.mimeType as string };
}

export async function prepareLabelImage(bytes: Buffer, mimeType: string) {
    try {
        const original = parseImageBytes(new Uint8Array(bytes));
        if (original.mimeType !== mimeType)
            throw new Error('The file contents do not match its declared MIME type.');
        const image = sharp(bytes, {
            limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning',
        });
        const metadata = await image.metadata();
        if (`image/${metadata.format}` !== original.mimeType ||
            (metadata.pages ?? 1) !== 1 || metadata.width !== original.width ||
            metadata.height !== original.height ||
            metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)
            throw new Error('Unsupported or inconsistent image dimensions.');
        // Fully decode and re-encode raster pixels, stripping metadata and trailing payloads.
        const format = original.mimeType === 'image/jpeg' ? 'jpeg' :
            original.mimeType === 'image/webp' ? 'webp' : 'png';
        const clean = await image.toFormat(format).toBuffer();
        if (clean.length > MAX_IMAGE_BYTES)
            throw new Error('The processed image exceeds 2 MB. Choose a smaller image.');
        return { original, clean };
    } catch (error) {
        throw new LabelUploadError(400, error instanceof Error ?
            `Invalid image: ${error.message}` : 'The image could not be decoded.');
    }
}

export async function uploadLabelImage(
    prepared: Awaited<ReturnType<typeof prepareLabelImage>>,
    config: LabelUploadConfig,
    fetcher: typeof fetch = fetch,
): Promise<LabelImage> {
    const { original, clean } = prepared;
    const publicId = `product-labels/${config.projectKey}/${randomUUID()}`;
    const params = {
        overwrite: 'false', public_id: publicId,
        timestamp: String(Math.floor(Date.now() / 1000)), type: 'upload',
    };
    const signature = createHash('sha256').update(
        Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&') +
        config.apiSecret,
    ).digest('hex');
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.set(key, value);
    form.set('api_key', config.apiKey);
    form.set('signature', signature);
    const extension = original.mimeType.split('/')[1];
    form.set('file', new Blob([new Uint8Array(clean)], { type: original.mimeType }), `label.${extension}`);
    let response: Response;
    try {
        response = await fetcher(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
            method: 'POST', body: form, signal: AbortSignal.timeout(25000), redirect: 'error',
        });
    } catch {
        throw new LabelUploadError(502, 'Cloudinary could not be reached. Retry the upload.');
    }
    if (!response.ok)
        throw new LabelUploadError(502, 'Cloudinary rejected the upload. Check the server provider configuration.');
    let asset;
    try { asset = await response.json(); } catch {
        throw new LabelUploadError(502, 'Cloudinary returned an invalid response.');
    }
    let url: URL;
    try { url = new URL(asset.secure_url); } catch {
        throw new LabelUploadError(502, 'Cloudinary returned an invalid image URL.');
    }
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' ||
        !url.pathname.startsWith(`/${config.cloudName}/image/upload/`) ||
        url.username || url.password || asset.public_id !== publicId ||
        typeof asset.asset_id !== 'string' || !asset.asset_id ||
        asset.width !== original.width || asset.height !== original.height ||
        !(original.mimeType === 'image/jpeg' ? ['jpg', 'jpeg'].includes(asset.format) :
            asset.format === extension))
        throw new LabelUploadError(502, 'Cloudinary returned inconsistent image metadata.');
    const scale = Math.min(1, 128 / original.width, 128 / original.height);
    return {
        url: url.href, alt: { 'en-US': 'Product label' }, objectFit: 'contain',
        width: Math.max(8, Math.round(original.width * scale)),
        height: Math.max(8, Math.round(original.height * scale)),
        mimeType: original.mimeType, size: original.size,
        originalWidth: original.width, originalHeight: original.height, assetId: asset.asset_id,
    };
}

export type LabelUploadDependencies = { getKey?: JWTVerifyGetKey; fetcher?: typeof fetch };

export async function handleLabelUpload(
    request: Request,
    config: LabelUploadConfig,
    dependencies: LabelUploadDependencies = {},
) {
    await authorizeLabelUpload(request, config, dependencies.getKey);
    const { bytes, mimeType } = await readUpload(request);
    const image = await prepareLabelImage(bytes, mimeType);
    return uploadLabelImage(image, config, dependencies.fetcher);
}
