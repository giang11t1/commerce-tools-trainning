import type {
  Product,
  ProductData,
  ProductType,
  ProductUpdateAction,
} from '@commercetools/platform-sdk';
import {
  localizedLabelText,
  validateConfiguration,
} from './label-configuration';
import type { LabelConfiguration } from './label-configuration';

export const CONTAINER = 'product-labels';
export const ATTRIBUTE = 'productLabels';

export type Label = LabelConfiguration & {
  key: string;
  name: Record<string, string>;
  color: string;
  backgroundColor: string;
  priority: number;
  active: boolean;
  description: string;
  deletedAt?: string;
};
export type LabelRecord = {
  key: string;
  version: number;
  value: Label;
};
export type ProductRecord = Pick<
  Product,
  'id' | 'version' | 'key' | 'productType'
> & {
  masterData: {
    published: boolean;
    hasStagedChanges: boolean;
    staged: Pick<ProductData, 'name' | 'attributes'>;
    current: Pick<ProductData, 'name' | 'attributes'>;
  };
};
export type Page<T> = {
  results: T[];
  total: number;
  offset: number;
  count: number;
};
export type Access = { view: boolean; manage: boolean };
export type Operation = 'assign' | 'remove';

export function requireView(access: Access) {
  if (!access.view) throw new Error('View permission is required.');
}

export function requireManage(access: Access) {
  requireView(access);
  if (!access.manage) throw new Error('Manage permission is required.');
}

export function validateKey(key: string) {
  if (!/^[a-zA-Z0-9_-]{2,256}$/.test(key)) {
    throw new Error(
      'Use a stable key of 2-256 letters, numbers, underscores or hyphens.'
    );
  }
  return key;
}

export function validateLabel(value: unknown): Label {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid label definition.');
  const label = value as Record<string, unknown>;
  if (typeof label.key !== 'string')
    throw new Error('A label key is required.');
  validateKey(label.key);
  if (
    !label.name ||
    typeof label.name !== 'object' ||
    Array.isArray(label.name)
  ) {
    throw new Error('Localized names are required.');
  }
  const names = Object.entries(label.name);
  if (
    !names.length ||
    !names.some(([, name]) => typeof name === 'string' && name.trim())
  ) {
    throw new Error('Provide at least one translated name.');
  }
  for (const [locale, name] of names) {
    if (
      !/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(locale) ||
      typeof name !== 'string' ||
      name.length > 200
    ) {
      throw new Error(
        'Names must use valid locales and at most 200 characters.'
      );
    }
  }
  if (
    typeof label.color !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(label.color) ||
    typeof label.backgroundColor !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(label.backgroundColor)
  ) {
    throw new Error('Colors must be six-digit hexadecimal values.');
  }
  if (
    typeof label.priority !== 'number' ||
    !Number.isSafeInteger(label.priority) ||
    Math.abs(label.priority) > 1000000
  ) {
    throw new Error(
      'Priority must be an integer between -1000000 and 1000000.'
    );
  }
  if (
    typeof label.active !== 'boolean' ||
    typeof label.description !== 'string' ||
    label.description.length > 2000
  ) {
    throw new Error(
      'Provide an active status and a description of at most 2000 characters.'
    );
  }
  if (
    label.deletedAt !== undefined &&
    (typeof label.deletedAt !== 'string' ||
      !Number.isFinite(Date.parse(label.deletedAt)))
  ) {
    throw new Error('Invalid deletion timestamp.');
  }
  return {
    ...validateConfiguration(label),
    key: label.key,
    name: Object.fromEntries(
      names.map(([locale, name]) => [locale, (name as string).trim()])
    ),
    color: label.color,
    backgroundColor: label.backgroundColor,
    priority: label.priority,
    active: label.active,
    description: label.description,
    ...(typeof label.deletedAt === 'string'
      ? { deletedAt: label.deletedAt }
      : {}),
  };
}

export function parseLabelRecord(record: {
  key: string;
  version: number;
  value: unknown;
}): LabelRecord {
  const value = validateLabel(record.value);
  if (record.key !== value.key)
    throw new Error(`Label ${record.key} has a mismatched value key.`);
  return { ...record, value };
}

export function localizedName(label: Label, locale: string) {
  return localizedLabelText(label.name, locale, label.key);
}

export function verifyProductType(type: Pick<ProductType, 'attributes'>) {
  const attribute = type.attributes?.find((item) => item.name === ATTRIBUTE);
  if (
    !attribute ||
    attribute.level !== 'Product' ||
    attribute.type.name !== 'set' ||
    attribute.type.elementType.name !== 'text' ||
    attribute.isRequired ||
    attribute.attributeConstraint !== 'None'
  ) {
    throw new Error(
      'Product Type must define optional productLabels at level Product, type set<text>, constraint None. No data was written.'
    );
  }
}

export function assignedKeys(data: Pick<ProductData, 'attributes'>): string[] {
  const value: unknown = data.attributes?.find(
    (item) => item.name === ATTRIBUTE
  )?.value;
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    !value.every((key): key is string => typeof key === 'string')
  ) {
    throw new Error(
      'productLabels contains invalid data. Repair it before changing assignments.'
    );
  }
  return [...new Set(value)];
}

export function assignmentActions(
  product: ProductRecord,
  keys: string[],
  operation: Operation
): ProductUpdateAction[] {
  if (operation !== 'assign' && operation !== 'remove')
    throw new Error('Invalid assignment operation.');
  const existing = assignedKeys(product.masterData.staged);
  const next =
    operation === 'assign'
      ? [...new Set([...existing, ...keys])]
      : existing.filter((key) => !keys.includes(key));
  if (
    next.length === existing.length &&
    next.every((key) => existing.includes(key))
  )
    return [];
  return [
    {
      action: 'setProductAttribute',
      name: ATTRIBUTE,
      value: next,
      staged: true,
    },
  ];
}

export function errorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error &&
    'statusCode' in error &&
    error.statusCode === 409
  ) {
    return 'This resource changed. Refresh, review the latest values and try again. Nothing was automatically retried.';
  }
  return error instanceof Error
    ? error.message
    : 'The request failed. Refresh to verify its outcome before retrying.';
}

export function queryString(values: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(values).map(([key, value]) => [key, String(value)])
  ).toString();
}

export function productSearchPredicate(search: string, locale: string) {
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(locale))
    throw new Error('Invalid data locale.');
  if (search.length > 256)
    throw new Error('Product search is limited to 256 characters.');
  if (!search.trim()) return undefined;
  const value = JSON.stringify(search.trim());
  return `key=${value} or masterData(staged(name(${locale}=${value}) or masterVariant(sku=${value}) or variants(sku=${value})))`;
}
