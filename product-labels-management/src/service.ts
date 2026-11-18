import type { ProductType } from '@commercetools/platform-sdk';
import {
  CONTAINER,
  assignedKeys,
  assignmentActions,
  errorMessage,
  parseLabelRecord,
  productSearchPredicate,
  queryString,
  requireManage,
  requireView,
  validateKey,
  validateLabel,
  verifyProductType,
} from './domain';
import type {
  Access,
  Label,
  LabelRecord,
  Operation,
  Page,
  ProductRecord,
} from './domain';

export type Request = <T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
) => Promise<T>;
export type BulkResult = { id: string; success: boolean; message: string };
const segment = encodeURIComponent;

export function createService(request: Request, access: Access) {
  const readLabel = async (key: string) => {
    requireView(access);
    validateKey(key);
    return parseLabelRecord(
      await request<LabelRecord>(
        'GET',
        `custom-objects/${CONTAINER}/${segment(key)}`
      )
    );
  };
  const readProduct = (id: string) => {
    requireView(access);
    if (!id) throw new Error('A product ID is required.');
    return request<ProductRecord>('GET', `products/${segment(id)}`);
  };
  const verify = async (product: ProductRecord) => {
    const type = await request<ProductType>(
      'GET',
      `product-types/${segment(product.productType.id)}`
    );
    verifyProductType(type);
  };
  const service = {
    readLabel,
    readProduct,
    async listLabels(): Promise<LabelRecord[]> {
      requireView(access);
      const results: LabelRecord[] = [];
      for (let offset = 0; offset < 10000; offset += 500) {
        const page = await request<Page<LabelRecord>>(
          'GET',
          `custom-objects/${CONTAINER}?${queryString({
            limit: 500,
            offset,
            sort: 'key asc',
          })}`
        );
        results.push(...page.results.map(parseLabelRecord));
        if (offset + page.count >= page.total) return results;
      }
      throw new Error(
        'More than 10000 label definitions exist. Narrow the catalog with a server-side index before using this application.'
      );
    },
    async saveLabel(input: Label, version: number): Promise<LabelRecord> {
      requireManage(access);
      const value = validateLabel(input);
      if (value.deletedAt)
        throw new Error('Deleted labels cannot be edited or recreated.');
      if (!Number.isSafeInteger(version) || version < 0)
        throw new Error('Invalid label version.');
      if (version > 0) {
        const existing = await readLabel(value.key);
        if (existing.value.deletedAt)
          throw new Error('Deleted labels cannot be edited or recreated.');
        if (existing.version !== version)
          throw new Error('This label changed. Refresh before saving.');
      }
      // version 0 is create-only: existing keys, including tombstones, conflict.
      return parseLabelRecord(
        await request<LabelRecord>('POST', 'custom-objects', {
          container: CONTAINER,
          key: value.key,
          value,
          version,
        })
      );
    },
    async deleteLabel(label: LabelRecord): Promise<LabelRecord> {
      requireManage(access);
      const current = await readLabel(label.key);
      if (current.version !== label.version)
        throw new Error('This label changed. Refresh before deleting.');
      if (current.value.deletedAt)
        throw new Error('This label is already deleted.');
      return parseLabelRecord(
        await request<LabelRecord>('POST', 'custom-objects', {
          container: CONTAINER,
          key: current.key,
          version: current.version,
          value: {
            ...current.value,
            active: false,
            deletedAt: new Date().toISOString(),
          },
        })
      );
    },
    async searchProducts(
      search: string,
      locale: string,
      page: number
    ): Promise<Page<ProductRecord>> {
      requireView(access);
      if (!Number.isInteger(page) || page < 1 || page > 501)
        throw new Error('Product page must be between 1 and 501.');
      const where = productSearchPredicate(search, locale);
      return request(
        'GET',
        `products?${queryString({
          limit: 20,
          offset: (page - 1) * 20,
          sort: 'id asc',
          ...(where ? { where } : {}),
        })}`
      );
    },
    async inspectProduct(product: ProductRecord) {
      requireView(access);
      await verify(product);
      return {
        staged: assignedKeys(product.masterData.staged),
        current: assignedKeys(product.masterData.current),
      };
    },
    async assignProduct(
      snapshot: ProductRecord,
      keys: string[],
      operation: Operation
    ) {
      requireManage(access);
      if (!keys.length) throw new Error('Select at least one label.');
      if (operation === 'assign') keys.forEach(validateKey);
      else if (operation !== 'remove')
        throw new Error('Invalid assignment operation.');
      else if (!keys.every((key) => typeof key === 'string'))
        throw new Error('Label keys must be strings.');
      const product = await readProduct(snapshot.id);
      if (product.version !== snapshot.version)
        throw new Error(
          'This product changed. Refresh and review it before saving.'
        );
      await verify(product);
      if (operation === 'assign') {
        const definitions = await Promise.all(
          [...new Set(keys)].map(readLabel)
        );
        if (definitions.some(({ value }) => !value.active || value.deletedAt)) {
          throw new Error(
            'Only active, non-deleted labels can be assigned. Refresh the labels list.'
          );
        }
      }
      const actions = assignmentActions(product, keys, operation);
      if (!actions.length) return product;
      return request<ProductRecord>('POST', `products/${segment(product.id)}`, {
        version: product.version,
        actions,
      });
    },
    async publishProduct(snapshot: ProductRecord) {
      requireManage(access);
      const product = await readProduct(snapshot.id);
      if (product.version !== snapshot.version)
        throw new Error(
          'This product changed. Refresh and review all staged changes before publishing.'
        );
      await verify(product);
      // Retired/unknown existing assignments are preserved, never silently removed.
      assignedKeys(product.masterData.staged);
      return request<ProductRecord>('POST', `products/${segment(product.id)}`, {
        version: product.version,
        actions: [{ action: 'publish', scope: 'All' }],
      });
    },
    async bulk(
      products: ProductRecord[],
      keys: string[],
      operation: Operation
    ): Promise<BulkResult[]> {
      requireManage(access);
      if (
        !products.length ||
        products.length > 20 ||
        new Set(products.map(({ id }) => id)).size !== products.length
      ) {
        throw new Error(
          'Select between 1 and 20 distinct products from the current page.'
        );
      }
      const results: BulkResult[] = [];
      // Deliberately bounded: a partial failure never hides successful writes.
      for (const product of products) {
        try {
          await service.assignProduct(product, keys, operation);
          results.push({
            id: product.id,
            success: true,
            message: 'Staged assignments saved.',
          });
        } catch (error) {
          results.push({
            id: product.id,
            success: false,
            message: errorMessage(error),
          });
        }
      }
      return results;
    },
  };
  return service;
}
