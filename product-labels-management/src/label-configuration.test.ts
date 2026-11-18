import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import {
  labelStatus,
  labelStyle,
  localDateTimeToUtc,
  parseAdvancedCss,
  positions,
  utcToLocalDateTime,
  validateConfiguration,
  validateImage,
} from './label-configuration';
import { validateLabel } from './domain';
import { createService } from './service';
import type { Request } from './service';

const legacy = {
  key: 'new',
  name: { en: 'New' },
  color: '#14e16d',
  backgroundColor: '#ed1a02',
  priority: 10,
  active: true,
  description: '',
};
const image = {
  url: 'https://res.cloudinary.com/demo/image/upload/label.webp',
  alt: { en: 'Certified', de: 'Zertifiziert' },
  width: 96,
  height: 64,
  objectFit: 'contain',
};

test('legacy definitions keep their exact data and colors', () => {
  assert.deepEqual(validateLabel(legacy), legacy);
  assert.equal(labelStatus(legacy), 'Active');
  assert.equal(labelStyle(legacy).color, '#14e16d');
});

test('positions and both label types are validated, with no new required fields for text', () => {
  for (const position of positions)
    assert.equal(validateLabel({ ...legacy, position }).position, position);
  assert.equal(validateLabel({ ...legacy, type: 'text' }).type, 'text');
  assert.equal(
    validateLabel({ ...legacy, type: 'image', image }).image?.url,
    image.url
  );
  assert.throws(
    () => validateLabel({ ...legacy, type: 'image' }),
    /require an image/
  );
  assert.throws(
    () => validateLabel({ ...legacy, position: 'center' }),
    /position/
  );
  assert.throws(() => validateLabel({ ...legacy, type: 'html' }), /type/);
});

test('safe defaults, structured styles and validated advanced CSS have explicit precedence', () => {
  const css = labelStyle({
    ...legacy,
    style: { color: '#ff0000', paddingX: 20, fontSize: 24 },
    advancedCss:
      'color: #ffffff; font-size: 30px; padding-left: 12px; transform: rotate(-15deg);',
  });
  assert.equal(css.color, '#ffffff');
  assert.equal(css.fontSize, 30);
  assert.equal(css.paddingLeft, 12);
  assert.equal(css.paddingRight, 20);
  assert.equal(css.transform, 'rotate(-15deg)');
  assert.equal(
    labelStyle({ ...legacy, style: { maxWidth: 200 } }).maxWidth,
    'min(100%, 200px)'
  );
  assert.deepEqual(
    parseAdvancedCss('font-family: Georgia, serif; opacity: 0.5;'),
    { fontFamily: 'Georgia, serif', opacity: 0.5 }
  );
});

test('unsafe and unsupported CSS, selectors, URLs and out-of-range values are rejected', () => {
  for (const source of [
    '.label { color: #ffffff; }',
    '@import "evil";',
    'background: url(https://evil.example/x);',
    'color: expression(alert(1));',
    'color: var(--color);',
    'color: #ffffff !important;',
    'position: fixed;',
    'z-index: 999;',
    'font-size: 500px;',
    'opacity: -1;',
    'transform: scale(100);',
    'transform: rotate(181deg);',
    'font-family: Evil;',
    'color: \\72 ed;',
    '/* comment */ color: #ffffff;',
    'padding-left: -1px;',
    'background-color: red;',
    'max-width: 100vw;',
    'box-shadow: 0 0 1px red;',
  ])
    assert.throws(() => parseAdvancedCss(source), Error, source);
  for (const style of [
    { fontSize: 0 },
    { opacity: NaN },
    { rotation: 181 },
    { paddingX: Infinity },
    { position: 'fixed' },
  ]) {
    assert.throws(() => validateConfiguration({ style }));
  }
});

test('image styles ignore irrelevant structured text properties and reject advanced text overrides', () => {
  const css = labelStyle({
    ...legacy,
    type: 'image',
    image: validateImage(image),
    style: {
      color: '#ffffff',
      fontSize: 30,
      paddingX: 20,
      borderRadius: 8,
      rotation: 10,
    },
  });
  assert.equal(css.color, undefined);
  assert.equal(css.fontSize, undefined);
  assert.equal(css.paddingLeft, undefined);
  assert.equal(css.width, 96);
  assert.equal(css.borderRadius, 8);
  assert.equal(css.transform, 'rotate(10deg)');
  assert.throws(
    () => parseAdvancedCss('color: #ffffff;', true),
    /not supported for image/
  );
});

test('image metadata rejects unsafe URLs, unsupported formats and malformed dimensions/alt', () => {
  for (const patch of [
    { url: 'data:image/png;base64,abc' },
    // eslint-disable-next-line no-script-url
    { url: 'javascript:alert(1)' },
    { url: 'http://example.com/image.png' },
    { url: 'https://example.com/image.svg' },
    { url: 'https://secret@example.com/image.png' },
    { url: 'https://127.0.0.1/image.png' },
    { mimeType: 'image/svg+xml' },
    { width: 0 },
    { height: 513 },
    { alt: {} },
    { size: 3000000 },
  ])
    assert.throws(() => validateImage({ ...image, ...patch }));
});

test('scheduled visibility uses inclusive start, exclusive end and inactive always wins', () => {
  const schedule = {
    active: true,
    startDate: '2026-11-17T10:00:00.000Z',
    endDate: '2026-11-17T11:00:00.000Z',
  };
  const start = Date.parse(schedule.startDate);
  const end = Date.parse(schedule.endDate);
  assert.equal(labelStatus(schedule, start - 1), 'Scheduled');
  assert.equal(labelStatus(schedule, start), 'Active');
  assert.equal(labelStatus(schedule, end - 1), 'Active');
  assert.equal(labelStatus(schedule, end), 'Expired');
  assert.equal(labelStatus({ ...schedule, active: false }, start), 'Inactive');
  assert.equal(
    labelStatus({ ...schedule, deletedAt: schedule.startDate }, start),
    'Inactive'
  );
  assert.equal(
    labelStatus({ active: true, startDate: schedule.startDate }, end),
    'Active'
  );
  assert.equal(
    labelStatus({ active: true, endDate: schedule.endDate }, start),
    'Active'
  );
});

test('invalid ranges and non-UTC or impossible dates fail validation', () => {
  for (const patch of [
    { startDate: '2026-11-17T10:00' },
    { startDate: '2026-02-31T10:00:00Z' },
    { startDate: 'invalid' },
    { startDate: '2026-11-17T10:00:00Z', endDate: '2026-11-17T10:00:00Z' },
    { startDate: '2026-11-17T10:00:00Z', endDate: '2026-11-17T09:00:00Z' },
  ])
    assert.throws(() => validateConfiguration(patch));
});

test('local datetime conversion roundtrips and handles explicit browser timezone including DST gaps', () => {
  assert.equal(localDateTimeToUtc(''), undefined);
  assert.equal(utcToLocalDateTime(), '');
  const local = '2026-11-17T17:30';
  assert.equal(utcToLocalDateTime(localDateTimeToUtc(local)), local);
  const script = `
    const { localDateTimeToUtc, utcToLocalDateTime } = require('./src/label-configuration.ts');
    const assert = require('node:assert/strict');
    assert.equal(localDateTimeToUtc('2026-11-17T17:30'), '2026-11-17T10:30:00.000Z');
    assert.equal(utcToLocalDateTime('2026-11-17T10:30:00.000Z'), '2026-11-17T17:30');
  `;
  execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
    env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh' },
  });
  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '-e',
      `
    const assert = require('node:assert/strict');
    const {localDateTimeToUtc} = require('./src/label-configuration.ts');
    assert.throws(() => localDateTimeToUtc('2026-03-08T02:30'), /does not exist/);
  `,
    ],
    { env: { ...process.env, TZ: 'America/New_York' } }
  );
});

test('image replacement/removal and style edits persist through versioned Custom Objects without product writes', async () => {
  let stored = {
    key: legacy.key,
    version: 1,
    value: validateLabel({ ...legacy, type: 'image', image }),
  };
  const writes: string[] = [];
  const request: Request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> => {
    if (method === 'GET') return stored as T;
    writes.push(path);
    const update = body as { value: typeof stored.value; version: number };
    assert.equal(update.version, stored.version);
    stored = { ...stored, value: update.value, version: stored.version + 1 };
    return stored as T;
  };
  const service = createService(request, { view: true, manage: true });
  const replacement = {
    ...stored.value,
    image: {
      ...validateImage(image),
      url: 'https://res.cloudinary.com/demo/replaced.png',
    },
  };
  await service.saveLabel(replacement, 1);
  assert.equal(stored.value.image?.url, replacement.image.url);
  await service.saveLabel(
    { ...legacy, type: 'text', style: { borderRadius: 10 } },
    2
  );
  assert.equal(stored.value.image, undefined);
  assert.equal(stored.value.style?.borderRadius, 10);
  assert.deepEqual(writes, ['custom-objects', 'custom-objects']);
});
