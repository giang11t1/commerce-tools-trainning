import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ProductType, ProductUpdate } from '@commercetools/platform-sdk';
import {
  assignedKeys,
  assignmentActions,
  errorMessage,
  localizedName,
  parseLabelRecord,
  productSearchPredicate,
  validateLabel,
  verifyProductType,
} from './domain.ts';
import type { Access, Label, LabelRecord, ProductRecord } from './domain.ts';
import { createService } from './service.ts';
import type { Request } from './service.ts';

const access: Access = { view: true, manage: true };
const label = (key = 'new-arrival'): Label => ({
  key,
  name: { en: 'New arrival', de: 'Neu' },
  color: '#ffffff',
  backgroundColor: '#213c73',
  priority: 10,
  active: true,
  description: '',
});
const record = (key = 'new-arrival'): LabelRecord => ({
  key,
  version: 1,
  value: label(key),
});
const product = (
  id = 'product-1',
  keys: string[] = ['existing-label']
): ProductRecord => ({
  id,
  version: 4,
  key: id,
  productType: { typeId: 'product-type', id: 'type-1' },
  masterData: {
    published: true,
    hasStagedChanges: false,
    staged: {
      name: { en: 'Box' },
      attributes: [{ name: 'productLabels', value: keys }],
    },
    current: {
      name: { en: 'Box' },
      attributes: [{ name: 'productLabels', value: [...keys] }],
    },
  },
});
const compatibleType: Pick<ProductType, 'attributes'> = {
  attributes: [
    {
      name: 'productLabels',
      label: { en: 'Product labels' },
      type: { name: 'set', elementType: { name: 'text' } },
      level: 'Product',
      isRequired: false,
      attributeConstraint: 'None',
      isSearchable: false,
      inputHint: 'SingleLine',
      savedToLineItem: false,
    },
  ],
};

function harness(grants = access) {
  const labels = new Map<string, LabelRecord>();
  const products = new Map<string, ProductRecord>([['product-1', product()]]);
  const calls: { method: string; path: string; body?: unknown }[] = [];
  let type = structuredClone(compatibleType);
  let failProductWrite = false;
  const request: Request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ) => {
    calls.push({ method, path, body: structuredClone(body) });
    let response: unknown;
    if (method === 'GET' && path.startsWith('custom-objects/product-labels/')) {
      const key = decodeURIComponent(path.split('/')[2]);
      response = labels.get(key);
      if (!response)
        throw Object.assign(new Error('Label not found'), { statusCode: 404 });
    } else if (
      method === 'GET' &&
      path.startsWith('custom-objects/product-labels?')
    ) {
      const params = new URLSearchParams(path.split('?')[1]);
      const offset = Number(params.get('offset'));
      const limit = Number(params.get('limit'));
      const all = [...labels.values()].sort((a, b) =>
        a.key.localeCompare(b.key)
      );
      const results = all.slice(offset, offset + limit);
      response = { results, total: all.length, offset, count: results.length };
    } else if (method === 'POST' && path === 'custom-objects') {
      const input = body as { key: string; value: Label; version: number };
      const current = labels.get(input.key);
      if ((current?.version ?? 0) !== input.version) {
        throw Object.assign(new Error('Concurrent modification'), {
          statusCode: 409,
        });
      }
      response = {
        key: input.key,
        value: input.value,
        version: input.version + 1,
      };
      labels.set(input.key, response as LabelRecord);
    } else if (method === 'GET' && path.startsWith('product-types/')) {
      response = type;
    } else if (path.startsWith('products/') && method === 'GET') {
      response = products.get(decodeURIComponent(path.split('/')[1]));
      if (!response)
        throw Object.assign(new Error('Product not found'), {
          statusCode: 404,
        });
    } else if (path.startsWith('products/') && method === 'POST') {
      if (failProductWrite)
        throw Object.assign(new Error('Concurrent modification'), {
          statusCode: 409,
        });
      const id = decodeURIComponent(path.split('/')[1]);
      const current = products.get(id);
      const input = body as ProductUpdate;
      assert.ok(current);
      assert.equal(input.version, current.version);
      const next = {
        ...structuredClone(current),
        version: current.version + 1,
      };
      for (const action of input.actions) {
        if (action.action === 'setProductAttribute') {
          assert.equal(action.staged, true);
          assert.equal(action.name, 'productLabels');
          next.masterData.staged = {
            ...next.masterData.staged,
            attributes: [{ name: 'productLabels', value: action.value }],
          };
          next.masterData.hasStagedChanges = true;
        } else if (action.action === 'publish') {
          next.masterData.current = structuredClone(next.masterData.staged);
          next.masterData.hasStagedChanges = false;
          next.masterData.published = true;
        } else {
          assert.fail(`Unexpected action ${action.action}`);
        }
      }
      products.set(id, next);
      response = next;
    } else if (path.startsWith('products?')) {
      response = {
        results: [...products.values()],
        total: products.size,
        offset: 0,
        count: products.size,
      };
    } else {
      assert.fail(`Unexpected request ${method} ${path}`);
    }
    return structuredClone(response) as T;
  };
  return {
    service: createService(request, grants),
    calls,
    labels,
    products,
    setType: (next: Pick<ProductType, 'attributes'>) => {
      type = next;
    },
    conflictOnProductWrite: () => {
      failProductWrite = true;
    },
  };
}

test('create, read and edit preserve localized names and use expected versions', async () => {
  const { service, calls } = harness();
  const created = await service.saveLabel(label(), 0);
  assert.equal(created.version, 1);
  assert.equal((await service.readLabel(created.key)).value.name.de, 'Neu');
  const edited = await service.saveLabel(
    { ...created.value, priority: 20 },
    created.version
  );
  assert.equal(edited.version, 2);
  assert.equal(edited.value.priority, 20);
  assert.deepEqual(
    calls
      .filter(({ method }) => method === 'POST')
      .map(({ body }) => (body as { version: number }).version),
    [0, 1]
  );
});

test('create-only version zero rejects duplicate keys, including tombstones', async () => {
  const { service } = harness();
  const created = await service.saveLabel(label(), 0);
  await assert.rejects(() => service.saveLabel(label(), 0), {
    statusCode: 409,
  });
  await service.deleteLabel(created);
  await assert.rejects(() => service.saveLabel(label(), 0), {
    statusCode: 409,
  });
});

test('delete retains a tombstone without reading or changing product assignments', async () => {
  const { service, calls, products } = harness();
  const created = await service.saveLabel(label(), 0);
  const before = structuredClone(products);
  const deleted = await service.deleteLabel(created);
  assert.ok(deleted.value.deletedAt);
  assert.equal(deleted.value.active, false);
  assert.deepEqual(products, before);
  assert.equal(
    calls.some(({ path }) => path.startsWith('products')),
    false
  );
  await assert.rejects(
    () =>
      service.saveLabel(
        { ...deleted.value, deletedAt: undefined },
        deleted.version
      ),
    /Deleted labels/
  );
});

test('stale label edits and deletes stop before a write', async () => {
  const { service, calls } = harness();
  const created = await service.saveLabel(label(), 0);
  await service.saveLabel({ ...created.value, priority: 9 }, 1);
  const writes = calls.filter(({ method }) => method === 'POST').length;
  await assert.rejects(() => service.saveLabel(label(), 1), /changed/);
  await assert.rejects(() => service.deleteLabel(created), /changed/);
  assert.equal(calls.filter(({ method }) => method === 'POST').length, writes);
});

test('every read and write operation enforces permission gates', async () => {
  const denied = harness({ view: false, manage: false });
  await assert.rejects(() => denied.service.listLabels(), /View permission/);
  await assert.rejects(
    () => denied.service.searchProducts('', 'en', 1),
    /View permission/
  );
  await assert.rejects(
    () => denied.service.inspectProduct(product()),
    /View permission/
  );
  assert.throws(
    () => denied.service.readProduct('product-1'),
    /View permission/
  );
  await assert.rejects(
    () => denied.service.readLabel('new-arrival'),
    /View permission/
  );
  for (const grants of [
    { view: true, manage: false },
    { view: false, manage: true },
  ]) {
    const { service, calls } = harness(grants);
    await assert.rejects(() => service.saveLabel(label(), 0), /permission/);
    await assert.rejects(() => service.deleteLabel(record()), /permission/);
    await assert.rejects(
      () => service.assignProduct(product(), ['new-arrival'], 'assign'),
      /permission/
    );
    await assert.rejects(() => service.publishProduct(product()), /permission/);
    await assert.rejects(
      () => service.bulk([product()], ['new-arrival'], 'assign'),
      /permission/
    );
    assert.equal(calls.length, 0);
  }
});

test('label validation rejects malformed inputs and unsafe colors', () => {
  for (const invalid of [
    { ...label(), key: '../unsafe' },
    { ...label(), name: {} },
    { ...label(), name: { en: '   ' } },
    { ...label(), name: { en: 123 } },
    { ...label(), color: 'url(javascript:bad)' },
    { ...label(), backgroundColor: 'red' },
    { ...label(), priority: NaN },
    { ...label(), priority: 0.1 },
    { ...label(), active: 'true' },
    { ...label(), description: 'x'.repeat(2001) },
  ])
    assert.throws(() => validateLabel(invalid));
  assert.throws(
    () => parseLabelRecord({ ...record(), key: 'different-key' }),
    /mismatched/
  );
  assert.equal(localizedName(label(), 'de'), 'Neu');
  assert.equal(localizedName(label(), 'fr'), 'New arrival');
});

test('label pagination loads all pages including tombstones', async () => {
  const { service, labels, calls } = harness();
  for (let index = 0; index < 501; index++)
    labels.set(`label-${index}`, record(`label-${index}`));
  const results = await service.listLabels();
  assert.equal(results.length, 501);
  assert.equal(calls.length, 2);
  assert.match(calls[1].path, /offset=500/);
});

test('assign merges several labels without changing current or unrelated assignments', async () => {
  const { service, labels, products } = harness();
  labels.set('new-arrival', record());
  labels.set('sale', record('sale'));
  const updated = await service.assignProduct(
    product(),
    ['new-arrival', 'sale', 'sale'],
    'assign'
  );
  assert.deepEqual(assignedKeys(updated.masterData.staged), [
    'existing-label',
    'new-arrival',
    'sale',
  ]);
  assert.deepEqual(assignedKeys(updated.masterData.current), [
    'existing-label',
  ]);
  assert.equal(products.get(updated.id)?.version, 5);
});

test('remove preserves other labels and supports unknown or deleted keys', async () => {
  const { service, products } = harness();
  const snapshot = product('product-1', [
    'unknown-label',
    'deleted-label',
    'keep',
  ]);
  products.set(snapshot.id, snapshot);
  const updated = await service.assignProduct(
    snapshot,
    ['unknown-label', 'deleted-label'],
    'remove'
  );
  assert.deepEqual(assignedKeys(updated.masterData.staged), ['keep']);
  assert.deepEqual(assignedKeys(updated.masterData.current), [
    'unknown-label',
    'deleted-label',
    'keep',
  ]);
});

test('no-op assignment does not issue a product update', async () => {
  const { service, calls } = harness();
  await service.assignProduct(product(), ['not-present'], 'remove');
  assert.equal(
    calls.some(({ method }) => method === 'POST'),
    false
  );
  assert.deepEqual(assignmentActions(product(), [], 'assign'), []);
});

test('legacy keys that do not match new-key validation can still be explicitly removed', async () => {
  const { service, products } = harness();
  const snapshot = product('product-1', ['x', 'legacy key', 'keep']);
  products.set(snapshot.id, snapshot);
  const updated = await service.assignProduct(
    snapshot,
    ['x', 'legacy key'],
    'remove'
  );
  assert.deepEqual(assignedKeys(updated.masterData.staged), ['keep']);
});

test('invalid versions and empty label selections fail before product writes', async () => {
  const { service, calls } = harness();
  await assert.rejects(
    () => service.assignProduct(product(), [], 'assign'),
    /at least one label/
  );
  await assert.rejects(
    () => service.saveLabel(label(), -1),
    /Invalid label version/
  );
  assert.equal(calls.length, 0);
});

test('assignment rejects absent, inactive and deleted definitions', async () => {
  for (const state of ['missing', 'inactive', 'deleted']) {
    const { service, labels, calls } = harness();
    if (state !== 'missing')
      labels.set('new-arrival', {
        ...record(),
        value: {
          ...label(),
          active: false,
          ...(state === 'deleted'
            ? { deletedAt: new Date().toISOString() }
            : {}),
        },
      });
    await assert.rejects(() =>
      service.assignProduct(product(), ['new-arrival'], 'assign')
    );
    assert.equal(
      calls.some(({ method }) => method === 'POST'),
      false
    );
  }
});

test('assignment and publication reject incompatible Product Types before writing', async () => {
  const attribute = compatibleType.attributes![0];
  for (const attributes of [
    [],
    [{ ...attribute, level: 'Variant' }],
    [{ ...attribute, type: { name: 'text' as const } }],
    [
      {
        ...attribute,
        type: {
          name: 'set' as const,
          elementType: { name: 'enum' as const, values: [] },
        },
      },
    ],
    [{ ...attribute, isRequired: true }],
    [{ ...attribute, attributeConstraint: 'SameForAll' }],
  ]) {
    const { service, setType, calls } = harness();
    setType({ attributes });
    await assert.rejects(
      () => service.assignProduct(product(), ['new-arrival'], 'assign'),
      /Product Type/
    );
    await assert.rejects(
      () => service.publishProduct(product()),
      /Product Type/
    );
    assert.equal(
      calls.some(({ method }) => method === 'POST'),
      false
    );
  }
  assert.doesNotThrow(() => verifyProductType(compatibleType));
});

test('malformed stored assignments fail closed', async () => {
  const { service, products, calls } = harness();
  const snapshot = product();
  snapshot.masterData.staged = {
    ...snapshot.masterData.staged,
    attributes: [{ name: 'productLabels', value: 'not-an-array' }],
  };
  products.set(snapshot.id, snapshot);
  await assert.rejects(
    () => service.assignProduct(snapshot, ['anything'], 'remove'),
    /invalid data/
  );
  await assert.rejects(() => service.publishProduct(snapshot), /invalid data/);
  assert.equal(
    calls.some(({ method }) => method === 'POST'),
    false
  );
});

test('stale products and last-moment version conflicts never auto-retry or publish', async () => {
  const { service, products, calls, conflictOnProductWrite } = harness();
  products.set('product-1', { ...product(), version: 5 });
  await assert.rejects(
    () => service.assignProduct(product(), ['existing-label'], 'remove'),
    /changed/
  );
  await assert.rejects(() => service.publishProduct(product()), /changed/);
  assert.equal(
    calls.some(({ method }) => method === 'POST'),
    false
  );
  products.set('product-1', product());
  conflictOnProductWrite();
  await assert.rejects(
    () => service.assignProduct(product(), ['existing-label'], 'remove'),
    { statusCode: 409 }
  );
  assert.equal(calls.filter(({ method }) => method === 'POST').length, 1);
  assert.match(
    errorMessage({ statusCode: 409 }),
    /Nothing was automatically retried/
  );
});

test('publication is an explicit separate versioned operation', async () => {
  const { service, calls } = harness();
  const staged = await service.assignProduct(
    product(),
    ['existing-label'],
    'remove'
  );
  assert.equal(staged.masterData.published, true);
  assert.deepEqual(assignedKeys(staged.masterData.current), ['existing-label']);
  const published = await service.publishProduct(staged);
  assert.deepEqual(assignedKeys(published.masterData.current), []);
  const last = calls.at(-1)!;
  assert.deepEqual(last.body, {
    version: 5,
    actions: [{ action: 'publish', scope: 'All' }],
  });
});

test('bulk processing reports partial failures per product and continues', async () => {
  const { service, products } = harness();
  products.set('product-2', product('product-2'));
  const results = await service.bulk(
    [product('missing-product'), product('product-2')],
    ['existing-label'],
    'remove'
  );
  assert.equal(results[0].success, false);
  assert.equal(results[1].success, true);
  assert.deepEqual(
    assignedKeys(products.get('product-2')!.masterData.staged),
    []
  );
});

test('bulk bounds and selection deduplication are enforced', async () => {
  const { service } = harness();
  await assert.rejects(
    () => service.bulk([], ['existing-label'], 'remove'),
    /1 and 20/
  );
  await assert.rejects(
    () => service.bulk([product(), product()], ['existing-label'], 'remove'),
    /distinct/
  );
  await assert.rejects(
    () =>
      service.bulk(
        Array.from({ length: 21 }, (_, i) => product(`p-${i}`)),
        ['existing-label'],
        'remove'
      ),
    /1 and 20/
  );
});

test('product queries escape predicate values and use supported query endpoints', async () => {
  const value = 'a") or key="injected';
  const predicate = productSearchPredicate(value, 'en-US');
  assert.ok(predicate?.includes(JSON.stringify(value)));
  assert.throws(
    () => productSearchPredicate('box', 'en)=true'),
    /Invalid data locale/
  );
  const { service, calls } = harness();
  await service.searchProducts('box', 'en', 2);
  assert.match(calls[0].path, /^products\?/);
  const params = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(params.get('offset'), '20');
  assert.equal(params.get('where'), productSearchPredicate('box', 'en'));
  assert.equal(params.has('filter'), false);
  await assert.rejects(() => service.searchProducts('', 'en', 502), /501/);
});
