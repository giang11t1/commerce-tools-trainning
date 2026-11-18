import { useCallback, useState } from 'react';
import FlatButton from '@commercetools-uikit/flat-button';
import { ContentNotification } from '@commercetools-uikit/notifications';
import {
  AssignedBadges,
  Confirmation,
  Notice,
  Pager,
  Preview,
  ResourceState,
  useResource,
} from './components';
import { errorMessage, localizedName } from './domain';
import type { Operation, ProductRecord } from './domain';
import type { BulkResult } from './service';
import type { PageProps } from './labels';
import { useText } from './messages';
import styles from './styles.module.css';

export default function Assignments({ service, manage, locale }: PageProps) {
  const t = useText();
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [results, setResults] = useState<BulkResult[]>([]);
  const [publishing, setPublishing] = useState<ProductRecord>();
  const load = useCallback(async () => {
    const [definitions, products] = await Promise.all([
      service.listLabels(),
      service.searchProducts(search, locale, page),
    ]);
    const rows = await Promise.all(
      products.results.map(async (product) => {
        try {
          return {
            product,
            ...(await service.inspectProduct(product)),
            schemaError: undefined,
          };
        } catch (failure) {
          return {
            product,
            staged: [],
            current: [],
            schemaError: errorMessage(failure),
          };
        }
      })
    );
    return { definitions, products, rows };
  }, [service, search, locale, page]);
  const resource = useResource(load);
  const definitions = resource.data?.definitions ?? [];
  const rows = resource.data?.rows ?? [];
  const eligible = rows.filter(({ schemaError }) => !schemaError);
  const selectedProducts = eligible
    .filter(({ product }) => selected.includes(product.id))
    .map(({ product }) => product);
  const choices = [
    ...new Set([
      ...definitions
        .filter(({ value }) => !value.deletedAt)
        .map(({ key }) => key),
      ...rows.flatMap(({ staged, current }) => [...staged, ...current]),
    ]),
  ];
  const canAssign =
    keys.length > 0 &&
    keys.every((key) =>
      definitions.some(
        (label) =>
          label.key === key && label.value.active && !label.value.deletedAt
      )
    );
  function changePage(next: number) {
    setSelected([]);
    setPublishing(undefined);
    setPage(next);
  }
  function refresh() {
    setSelected([]);
    setPublishing(undefined);
    resource.reload();
  }
  async function bulk(operation: Operation) {
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    setResults([]);
    try {
      const result = await service.bulk(selectedProducts, keys, operation);
      setResults(result);
      setSuccess('The operation finished. Review each product result below.');
      refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!publishing) return;
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await service.publishProduct(publishing);
      setSuccess('Product published.');
      refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.stack}>
      <h2>{t('Product assignments')}</h2>
      <Notice error={error} success={success} />
      <form
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          setSelected([]);
          setPublishing(undefined);
          setPage(1);
          setSearch(draftSearch);
          resource.reload();
        }}
      >
        <label>
          {t('Search products')}
          <input
            type="search"
            maxLength={256}
            placeholder={t('Exact product key, SKU or localized name')}
            value={draftSearch}
            disabled={busy}
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </label>
        <FlatButton type="submit" label={t('Search')} isDisabled={busy} />
        <FlatButton
          label={t('Refresh')}
          isDisabled={busy || resource.loading}
          onClick={refresh}
        />
      </form>
      <p>
        {t(
          'Search uses exact matches in the selected data locale; leave empty to browse.'
        )}
      </p>
      <ResourceState {...resource} retry={refresh} />
      {publishing && (
        <Confirmation
          title="Publish this product?"
          busy={busy}
          label="Confirm publish"
          confirm={() => {
            void publish();
          }}
          cancel={() => setPublishing(undefined)}
        >
          {publishing.key ?? publishing.id}:{' '}
          {t(
            'Publishing makes ALL staged product changes live, including unrelated changes. Review the product in Merchant Center before confirming.'
          )}
        </Confirmation>
      )}
      {results.length > 0 && (
        <section aria-label={t('Bulk results')} className={styles.stack}>
          <h3>{t('Bulk results')}</h3>
          <ul>
            {results.map((result) => (
              <li key={result.id}>
                <strong>{t(result.success ? 'Saved' : 'Failed')}</strong>{' '}
                {result.id}:{' '}
                {result.success ? t(result.message) : result.message}
              </li>
            ))}
          </ul>
        </section>
      )}
      {resource.data && !resource.loading && (
        <>
          <div className={styles.assignmentLayout}>
            <div className={styles.stack}>
              <p>
                {t(
                  'Select products on this page. Saves update staged data only.'
                )}
              </p>
              <fieldset
                disabled={!manage || busy || Boolean(publishing)}
                className={styles.choices}
              >
                <legend>{t('Choose labels')}</legend>
                {!choices.length && (
                  <p>
                    {t(
                      'No labels are available. Create a label before assigning products.'
                    )}
                  </p>
                )}
                {choices.map((key) => {
                  const label = definitions.find(
                    (item) => item.key === key
                  )?.value;
                  return (
                    <label className={styles.checkbox} key={key}>
                      <input
                        type="checkbox"
                        checked={keys.includes(key)}
                        onChange={(event) =>
                          setKeys((current) =>
                            event.target.checked
                              ? [...current, key]
                              : current.filter((value) => value !== key)
                          )
                        }
                      />
                      {label ? localizedName(label, locale) : key}
                      {(!label || label.deletedAt || !label.active) && (
                        <small>
                          (
                          {t(
                            !label
                              ? 'Unknown label'
                              : label.deletedAt
                              ? 'Deleted'
                              : 'Inactive'
                          )}
                          )
                        </small>
                      )}
                    </label>
                  );
                })}
              </fieldset>
              <div className={styles.toolbar}>
                <span>
                  {selectedProducts.length} {t('selected')}
                </span>
                <FlatButton
                  label={t('Assign selected labels')}
                  isDisabled={
                    !manage ||
                    busy ||
                    !selectedProducts.length ||
                    !canAssign ||
                    Boolean(publishing)
                  }
                  onClick={() => {
                    void bulk('assign');
                  }}
                />
                <FlatButton
                  label={t('Remove selected labels')}
                  isDisabled={
                    !manage ||
                    busy ||
                    !selectedProducts.length ||
                    !keys.length ||
                    Boolean(publishing)
                  }
                  onClick={() => {
                    void bulk('remove');
                  }}
                />
              </div>
            </div>
            <Preview
              labels={definitions
                .filter(({ key }) => keys.includes(key))
                .map(({ value }) => value)}
              locale={locale}
            />
          </div>
          {!rows.length ? (
            <ContentNotification type="info">
              {t('No products match. Change the search to continue.')}
            </ContentNotification>
          ) : (
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">
                      <input
                        type="checkbox"
                        aria-label={t('Select all products on this page')}
                        disabled={
                          !manage ||
                          busy ||
                          !eligible.length ||
                          Boolean(publishing)
                        }
                        checked={
                          eligible.length > 0 &&
                          eligible.every(({ product }) =>
                            selected.includes(product.id)
                          )
                        }
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? eligible.map(({ product }) => product.id)
                              : []
                          )
                        }
                      />
                    </th>
                    {[
                      'Product',
                      'Staged labels',
                      'Published labels',
                      'Actions',
                    ].map((key) => (
                      <th key={key} scope="col">
                        {t(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ product, staged, current, schemaError }) => (
                    <tr key={product.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${t('Select product')} ${
                            product.key ?? product.id
                          }`}
                          checked={selected.includes(product.id)}
                          disabled={
                            !manage ||
                            busy ||
                            Boolean(schemaError) ||
                            Boolean(publishing)
                          }
                          onChange={(event) =>
                            setSelected((value) =>
                              event.target.checked
                                ? [...value, product.id]
                                : value.filter((id) => id !== product.id)
                            )
                          }
                        />
                      </td>
                      <td>
                        <strong>
                          {product.masterData.staged.name[locale] ||
                            Object.values(product.masterData.staged.name)[0] ||
                            product.key ||
                            product.id}
                        </strong>
                        <small className={styles.metadata}>
                          {product.key ?? product.id}
                        </small>
                        {product.masterData.hasStagedChanges && (
                          <small className={styles.metadata}>
                            {t('Pending staged changes')}
                          </small>
                        )}
                        {schemaError && (
                          <p className={styles.warning}>
                            {t('Schema not compatible')}: {schemaError}
                          </p>
                        )}
                      </td>
                      <td>
                        {!schemaError && (
                          <AssignedBadges
                            keys={staged}
                            definitions={definitions}
                            locale={locale}
                          />
                        )}
                      </td>
                      <td>
                        {!product.masterData.published
                          ? t('Not published')
                          : !schemaError && (
                              <AssignedBadges
                                keys={current}
                                definitions={definitions}
                                locale={locale}
                              />
                            )}
                      </td>
                      <td>
                        <FlatButton
                          label={t('Publish')}
                          isDisabled={
                            !manage ||
                            busy ||
                            Boolean(schemaError) ||
                            Boolean(publishing) ||
                            (product.masterData.published &&
                              !product.masterData.hasStagedChanges)
                          }
                          onClick={() => setPublishing(product)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            page={page}
            total={resource.data.products.total}
            change={changePage}
            disabled={busy || Boolean(publishing)}
            maxPage={501}
          />
          {resource.data.products.total > 10020 && (
            <ContentNotification type="info">
              {t(
                'Browsing is limited to the first 10020 products. Use an exact search to find other products.'
              )}
            </ContentNotification>
          )}
        </>
      )}
    </section>
  );
}
