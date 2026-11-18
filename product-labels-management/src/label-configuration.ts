import type { CSSProperties } from 'react';

export const positions = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;
export type LabelPosition = (typeof positions)[number];
export const fontFamilies = [
  'inherit',
  'Arial, sans-serif',
  'Georgia, serif',
  'Verdana, sans-serif',
] as const;
export type LabelImage = {
  url: string;
  alt: Record<string, string>;
  width: number;
  height: number;
  objectFit: 'contain' | 'cover';
  borderRadius?: number;
  opacity?: number;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
  size?: number;
  originalWidth?: number;
  originalHeight?: number;
  assetId?: string;
};
export type LabelStyle = {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: (typeof fontFamilies)[number];
  paddingX?: number;
  paddingY?: number;
  borderWidth?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderColor?: string;
  borderRadius?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  boxShadow?: string;
  opacity?: number;
  rotation?: number;
  maxWidth?: number;
};
export type LabelConfiguration = {
  type?: 'text' | 'image';
  position?: LabelPosition;
  image?: LabelImage;
  style?: LabelStyle;
  advancedCss?: string;
  startDate?: string;
  endDate?: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function number(
  value: unknown,
  min: number,
  max: number,
  field: string
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}
function choice<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string
): T {
  if (typeof value !== 'string' || !options.includes(value as T))
    throw new Error(`Invalid ${field}.`);
  return value as T;
}
function color(value: unknown): string {
  if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value))
    throw new Error('Colors must be six-digit hexadecimal values.');
  return value;
}
export function localizedLabelText(
  values: Record<string, string>,
  locale: string,
  fallback: string
): string {
  const language = locale.split('-')[0];
  return (
    values[locale] ||
    values[language] ||
    values[
      Object.keys(values)
        .sort()
        .find((key) => key.split('-')[0] === language) ?? ''
    ] ||
    values['en-US'] ||
    values.en ||
    values[Object.keys(values).sort()[0]] ||
    fallback
  );
}
export function validateImage(value: unknown): LabelImage {
  if (
    !record(value) ||
    typeof value.url !== 'string' ||
    value.url.length > 2048
  )
    throw new Error('An image URL is required.');
  let url: URL;
  try {
    url = new URL(value.url);
  } catch {
    throw new Error('An absolute HTTPS image URL is required.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    /\.(?:svg|svgz)(?:$|[?#])/i.test(url.pathname) ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.local') ||
    /^[\d.]+$/.test(url.hostname) ||
    url.hostname.includes(':')
  ) {
    throw new Error(
      'Use a public HTTPS raster image URL without credentials or SVG.'
    );
  }
  if (
    !record(value.alt) ||
    !Object.keys(value.alt).length ||
    Object.entries(value.alt).some(
      ([locale, text]) =>
        !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(locale) ||
        typeof text !== 'string' ||
        text.length > 200
    ) ||
    !Object.values(value.alt).some(
      (text) => typeof text === 'string' && text.trim()
    )
  ) {
    throw new Error(
      'Provide localized image alt text (at most 200 characters).'
    );
  }
  const image: LabelImage = {
    url: url.href,
    alt: Object.fromEntries(
      Object.entries(value.alt).map(([key, text]) => [key, String(text).trim()])
    ),
    width: number(value.width, 8, 512, 'Image width'),
    height: number(value.height, 8, 512, 'Image height'),
    objectFit: choice(value.objectFit, ['contain', 'cover'], 'object fit'),
  };
  if (value.borderRadius !== undefined)
    image.borderRadius = number(
      value.borderRadius,
      0,
      256,
      'Image border radius'
    );
  if (value.opacity !== undefined)
    image.opacity = number(value.opacity, 0, 1, 'Image opacity');
  if (value.mimeType !== undefined)
    image.mimeType = choice(
      value.mimeType,
      ['image/png', 'image/jpeg', 'image/webp'] as const,
      'image MIME type'
    );
  if (value.size !== undefined)
    image.size = number(value.size, 1, 2 * 1024 * 1024, 'Image file size');
  if (value.originalWidth !== undefined)
    image.originalWidth = number(
      value.originalWidth,
      1,
      4096,
      'Original image width'
    );
  if (value.originalHeight !== undefined)
    image.originalHeight = number(
      value.originalHeight,
      1,
      4096,
      'Original image height'
    );
  if (
    image.originalWidth &&
    image.originalHeight &&
    image.originalWidth * image.originalHeight > 16000000
  )
    throw new Error('Image exceeds 16 million pixels.');
  if (value.assetId !== undefined) {
    if (typeof value.assetId !== 'string' || value.assetId.length > 256)
      throw new Error('Invalid image asset ID.');
    image.assetId = value.assetId;
  }
  return image;
}

export const numericStyleFields = {
  fontSize: [8, 72],
  fontWeight: [100, 900],
  paddingX: [0, 48],
  paddingY: [0, 48],
  borderWidth: [0, 12],
  borderRadius: [0, 256],
  letterSpacing: [-2, 20],
  opacity: [0, 1],
  rotation: [-180, 180],
  maxWidth: [16, 512],
} as const;
export function validateStyle(value: unknown): LabelStyle {
  if (!record(value)) throw new Error('Invalid style configuration.');
  const result: Record<string, string | number> = {};
  const allowed = new Set([
    ...Object.keys(numericStyleFields),
    'backgroundColor',
    'color',
    'borderColor',
    'fontFamily',
    'borderStyle',
    'textTransform',
    'boxShadow',
  ]);
  for (const [key, item] of Object.entries(value)) {
    if (!allowed.has(key))
      throw new Error(`Unsupported style property: ${key}`);
    if (key in numericStyleFields) {
      const [min, max] =
        numericStyleFields[key as keyof typeof numericStyleFields];
      result[key] = number(item, min, max, key);
    } else if (['backgroundColor', 'color', 'borderColor'].includes(key))
      result[key] = color(item);
    else if (key === 'fontFamily')
      result[key] = choice(item, fontFamilies, 'font family');
    else if (key === 'borderStyle')
      result[key] = choice(
        item,
        ['none', 'solid', 'dashed', 'dotted', 'double'],
        'border style'
      );
    else if (key === 'textTransform')
      result[key] = choice(
        item,
        ['none', 'uppercase', 'lowercase', 'capitalize'],
        'text transform'
      );
    else if (key === 'boxShadow') {
      if (
        typeof item !== 'string' ||
        (item !== 'none' &&
          !/^-?\d{1,2}px -?\d{1,2}px \d{1,2}px(?: \d{1,2}px)? #[a-f0-9]{6}$/i.test(
            item
          ))
      ) {
        throw new Error(
          'Box shadow must be none or pixel offsets, blur, optional spread and a six-digit hex color.'
        );
      }
      result[key] = item;
    }
  }
  return result as LabelStyle;
}
const advancedProperties = {
  'background-color': 'backgroundColor',
  color: 'color',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-family': 'fontFamily',
  'padding-left': 'paddingLeft',
  'padding-right': 'paddingRight',
  'padding-top': 'paddingTop',
  'padding-bottom': 'paddingBottom',
  'border-width': 'borderWidth',
  'border-style': 'borderStyle',
  'border-color': 'borderColor',
  'border-radius': 'borderRadius',
  'letter-spacing': 'letterSpacing',
  'text-transform': 'textTransform',
  'box-shadow': 'boxShadow',
  opacity: 'opacity',
  transform: 'transform',
  'max-width': 'maxWidth',
} as const;
const imageProperties = new Set([
  'borderWidth',
  'borderStyle',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'opacity',
  'rotation',
  'transform',
  'maxWidth',
]);

export function parseAdvancedCss(
  source: unknown,
  image = false
): CSSProperties {
  if (source === undefined || source === '') return {};
  if (
    typeof source !== 'string' ||
    source.length > 2000 ||
    /[{}@\\<>]|\/\*|url\s*\(|expression\s*\(|!important|var\s*\(/i.test(source)
  )
    throw new Error('Unsafe advanced CSS.');
  const result: Record<string, string | number> = {};
  for (const declaration of source.split(';').filter((part) => part.trim())) {
    const match = /^\s*([a-z-]+)\s*:\s*([^:]+?)\s*$/i.exec(declaration);
    if (
      !match ||
      !Object.prototype.hasOwnProperty.call(
        advancedProperties,
        match[1].toLowerCase()
      )
    )
      throw new Error('Unsupported CSS declaration.');
    const key =
      advancedProperties[
        match[1].toLowerCase() as keyof typeof advancedProperties
      ];
    let value: string | number = match[2];
    if (key === 'transform') {
      const rotation = /^rotate\((-?(?:\d+(?:\.\d+)?|\.\d+))deg\)$/.exec(value);
      if (!rotation)
        throw new Error('Only rotate(-180deg..180deg) is supported.');
      number(Number(rotation[1]), -180, 180, 'Rotation');
    } else if (key.startsWith('padding')) {
      if (!/^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(value))
        throw new Error('Padding requires pixels.');
      value = number(Number(value.slice(0, -2)), 0, 48, 'Padding');
    } else if (key in numericStyleFields) {
      const unitless = key === 'opacity' || key === 'fontWeight';
      if (
        !(
          unitless
            ? /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
            : /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/
        ).test(value)
      )
        throw new Error(`Invalid CSS value for ${key}.`);
      value = Number(unitless ? value : value.slice(0, -2));
      validateStyle({ [key]: value });
    } else {
      validateStyle({ [key]: value });
    }
    if (image && !imageProperties.has(key))
      throw new Error(`${key} is not supported for image labels.`);
    result[key] = value;
  }
  return result as CSSProperties;
}

export function validateConfiguration(
  value: Record<string, unknown>
): LabelConfiguration {
  const result: LabelConfiguration = {};
  if (value.type !== undefined)
    result.type = choice(value.type, ['text', 'image'] as const, 'label type');
  if (value.position !== undefined)
    result.position = choice(value.position, positions, 'position');
  if (value.image !== undefined) result.image = validateImage(value.image);
  if (result.type === 'image' && !result.image)
    throw new Error('Image labels require an image.');
  if (value.style !== undefined) result.style = validateStyle(value.style);
  if (value.advancedCss !== undefined) {
    parseAdvancedCss(value.advancedCss, result.type === 'image');
    result.advancedCss = value.advancedCss as string;
  }
  for (const key of ['startDate', 'endDate'] as const) {
    if (value[key] !== undefined) {
      if (
        typeof value[key] !== 'string' ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value[key]) ||
        !Number.isFinite(Date.parse(value[key]))
      )
        throw new Error(`${key} must be a UTC ISO timestamp.`);
      result[key] = new Date(value[key]).toISOString();
      if (result[key]?.slice(0, 19) !== value[key].slice(0, 19))
        throw new Error(`${key} is not a valid calendar date.`);
    }
  }
  if (result.startDate && result.endDate && result.endDate <= result.startDate)
    throw new Error('End date must be later than start date.');
  return result;
}
export function labelStatus(
  label: LabelConfiguration & { active: boolean; deletedAt?: string },
  now = Date.now()
): 'Scheduled' | 'Active' | 'Expired' | 'Inactive' {
  if (!label.active || label.deletedAt) return 'Inactive';
  if (label.endDate && now >= Date.parse(label.endDate)) return 'Expired';
  if (label.startDate && now < Date.parse(label.startDate)) return 'Scheduled';
  return 'Active';
}
export function labelStyle(
  label: LabelConfiguration & { color: string; backgroundColor: string }
): CSSProperties {
  const image = label.type === 'image';
  const style = validateStyle(label.style ?? {});
  const result: CSSProperties = image
    ? {
        width: label.image?.width,
        height: label.image?.height,
        borderRadius: label.image?.borderRadius ?? 0,
        opacity: label.image?.opacity ?? 1,
      }
    : {
        color: label.color,
        backgroundColor: label.backgroundColor,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'inherit',
        lineHeight: 1.5,
        padding: '3px 9px',
        borderRadius: 4,
      };
  for (const [key, value] of Object.entries(style)) {
    if (image && !imageProperties.has(key)) continue;
    if (key === 'paddingX') {
      result.paddingLeft = value;
      result.paddingRight = value;
    } else if (key === 'paddingY') {
      result.paddingTop = value;
      result.paddingBottom = value;
    } else if (key === 'rotation') result.transform = `rotate(${value}deg)`;
    else Object.assign(result, { [key]: value });
  }
  const resolved: CSSProperties = {
    ...result,
    ...parseAdvancedCss(label.advancedCss, image),
  };
  if (typeof resolved.maxWidth === 'number') {
    resolved.maxWidth = `min(100%, ${resolved.maxWidth}px)`;
  }
  return resolved;
}
export function localDateTimeToUtc(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(value))
    throw new Error('Invalid local date and time.');
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    utcToLocalDateTime(date.toISOString()) !== value.slice(0, 16)
  ) {
    throw new Error('This local date/time does not exist in your timezone.');
  }
  return date.toISOString();
}
export function utcToLocalDateTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error('Invalid UTC timestamp.');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}T${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
