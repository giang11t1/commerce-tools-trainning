import { useCallback, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import FlatButton from '@commercetools-uikit/flat-button';
import { ContentNotification } from '@commercetools-uikit/notifications';
import {
  Badge,
  Confirmation,
  Notice,
  Pager,
  Preview,
  ResourceState,
  useResource,
  useLabelClock,
} from './components';
import { errorMessage, localizedName } from './domain';
import type { Label, LabelRecord } from './domain';
import type { createService } from './service';
import { useText } from './messages';
import styles from './styles.module.css';
import LabelConfigurationFields from './label-configuration-fields';
import { labelStatus } from './label-configuration';
import type { LabelMediaAdapter } from './label-media';

export type PageProps = {
  service: ReturnType<typeof createService>;
  manage: boolean;
  locale: string;
  languages: string[];
  baseUrl: string;
  mediaAdapter?: LabelMediaAdapter;
};

export function LabelsList({ service, manage, locale, baseUrl }: PageProps) {
  const t = useText();
  const load = useCallback(() => service.listLabels(), [service]);
  const resource = useResource(load);
  const now = useLabelClock();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<LabelRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const filtered = useMemo(
    () =>
      (resource.data ?? [])
        .filter(
          ({ value }) =>
            !value.deletedAt &&
            (status === 'all' ||
              labelStatus(value, now).toLowerCase() === status) &&
            [value.key, ...Object.values(value.name), value.description].some(
              (value) =>
                value.toLocaleLowerCase().includes(search.toLocaleLowerCase())
            )
        )
        .sort(
          (a, b) =>
            b.value.priority - a.value.priority || a.key.localeCompare(b.key)
        ),
    [resource.data, search, status, now]
  );
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await service.deleteLabel(deleting);
      setDeleting(undefined);
      setSuccess('Label deleted. Existing assignments are preserved.');
      resource.reload();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.stack}>
      <div className={styles.toolbar}>
        <h2>{t('Labels')}</h2>
        {manage && (
          <Link className={styles.actionLink} to={`${baseUrl}/labels/new`}>
            {t('Create label')}
          </Link>
        )}
        <FlatButton
          label={t('Refresh')}
          isDisabled={busy || resource.loading}
          onClick={resource.reload}
        />
      </div>
      <Notice error={error} success={success} />
      <div className={styles.toolbar}>
        <label>
          {t('Search labels')}
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          {t('Status')}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t('All')}</option>
            <option value="active">{t('Active')}</option>
            <option value="inactive">{t('Inactive')}</option>
            <option value="scheduled">{t('Scheduled')}</option>
            <option value="expired">{t('Expired')}</option>
          </select>
        </label>
      </div>
      {deleting && (
        <Confirmation
          title="Delete this label?"
          busy={busy}
          label="Delete"
          confirm={() => {
            void remove();
          }}
          cancel={() => setDeleting(undefined)}
        >
          {localizedName(deleting.value, locale)}:{' '}
          {t(
            'The definition will be retained as a tombstone. Existing product assignments will not be removed, and this key cannot be reused.'
          )}
        </Confirmation>
      )}
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && !resource.loading && (
        <>
          {!filtered.length ? (
            <ContentNotification type="info">
              {t('No labels match. Create a label or change the filters.')}
            </ContentNotification>
          ) : (
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    {[
                      'Name',
                      'Key',
                      'Label type',
                      'Position',
                      'Priority',
                      'Status',
                      'Start date and time',
                      'End date and time',
                      'Actions',
                    ].map((key) => (
                      <th key={key} scope="col">
                        {t(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice((safePage - 1) * 20, safePage * 20)
                    .map((label) => (
                      <tr key={label.key}>
                        <td>
                          <Badge
                            label={label.value}
                            locale={locale}
                            thumbnail
                          />
                        </td>
                        <td>{label.key}</td>
                        <td>
                          {t(label.value.type === 'image' ? 'Image' : 'Text')}
                        </td>
                        <td>{t(label.value.position ?? 'top-left')}</td>
                        <td>{label.value.priority}</td>
                        <td>{t(labelStatus(label.value, now))}</td>
                        <td>{label.value.startDate ?? '—'}</td>
                        <td>{label.value.endDate ?? '—'}</td>
                        <td>
                          <div className={styles.toolbar}>
                            <Link
                              to={`${baseUrl}/labels/${encodeURIComponent(
                                label.key
                              )}/edit`}
                            >
                              {t('Edit')}
                            </Link>
                            {manage && (
                              <FlatButton
                                label={t('Delete')}
                                isDisabled={busy || Boolean(deleting)}
                                onClick={() => setDeleting(label)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            page={safePage}
            total={filtered.length}
            change={setPage}
            disabled={busy}
          />
        </>
      )}
    </section>
  );
}

const initialLabel = (): Label => ({
  key: '',
  name: {},
  color: '#ffffff',
  backgroundColor: '#213c73',
  priority: 0,
  active: true,
  description: '',
});

export function LabelEditor(props: PageProps & { create?: boolean }) {
  const { key } = useParams<{ key?: string }>();
  const load = useCallback(
    async () => (props.create ? undefined : props.service.readLabel(key ?? '')),
    [props.service, props.create, key]
  );
  const resource = useResource(load);
  const t = useText();
  if (resource.loading || resource.error)
    return <ResourceState {...resource} retry={resource.reload} />;
  if (!props.create && !resource.data) return <p>{t('Label not found.')}</p>;
  if (resource.data?.value.deletedAt)
    return <p>{t('Deleted labels cannot be edited.')}</p>;
  return (
    <EditorForm
      {...props}
      record={resource.data}
      key={`${key ?? 'new'}-${resource.data?.version ?? 0}`}
    />
  );
}

function EditorForm({
  service,
  manage,
  locale,
  languages,
  baseUrl,
  record,
  mediaAdapter,
}: PageProps & { record?: LabelRecord }) {
  const t = useText();
  const history = useHistory();
  const [label, setLabel] = useState<Label>(() =>
    record
      ? { ...record.value, name: { ...record.value.name } }
      : initialLabel()
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<LabelRecord | undefined>(record);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const locales = [
    ...new Set([...languages, locale, ...Object.keys(label.name)]),
  ];
  const change = <K extends keyof Label>(key: K, value: Label[K]) => {
    setLabel((current) => ({ ...current, [key]: value }));
    setSuccess(undefined);
  };
  async function save() {
    if (uploading) {
      setError('Wait for the image upload to finish before saving.');
      return;
    }
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const result = await service.saveLabel(label, saved?.version ?? 0);
      setSaved(result);
      setSuccess('Label saved.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.stack}>
      <h2>{t(record ? 'Edit label' : 'Create label')}</h2>
      <Notice error={error} success={success} />
      <div className={styles.editor}>
        <form
          className={styles.stack}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy || !manage} className={styles.stack}>
            <label>
              {t('Key')}
              <input
                required
                value={label.key}
                pattern="[a-zA-Z0-9_-]{2,256}"
                maxLength={256}
                disabled={Boolean(saved)}
                onChange={(event) => change('key', event.target.value)}
              />
              <small>
                {t('Stable keys cannot be renamed or reused after deletion.')}
              </small>
            </label>
            <fieldset className={styles.stack}>
              <legend>{t('Localized names')}</legend>
              <p>
                {t(
                  'Label names use the project languages. Existing translations in other languages are retained.'
                )}
              </p>
              {locales.map((language) => (
                <label key={language}>
                  {t('Name')} ({language})
                  <input
                    lang={language}
                    value={label.name[language] ?? ''}
                    maxLength={200}
                    onChange={(event) =>
                      change('name', {
                        ...label.name,
                        [language]: event.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </fieldset>
            <LabelConfigurationFields
              label={label}
              change={change}
              languages={languages}
              locale={locale}
              adapter={mediaAdapter}
              onBusyChange={setUploading}
            />
            <label>
              {t('Priority')}
              <input
                type="number"
                step={1}
                min={-1000000}
                max={1000000}
                required
                value={label.priority}
                onChange={(event) =>
                  change('priority', event.target.valueAsNumber)
                }
              />
              <small>{t('Higher priority appears first.')}</small>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={label.active}
                onChange={(event) => change('active', event.target.checked)}
              />
              {t('Active')}
            </label>
            <label>
              {t('Description')}
              <textarea
                value={label.description}
                maxLength={2000}
                onChange={(event) => change('description', event.target.value)}
              />
            </label>
          </fieldset>
          <div className={styles.toolbar}>
            <FlatButton
              type="submit"
              label={t(busy ? 'Working' : 'Save label')}
              isDisabled={busy || uploading || !manage}
            />
            <FlatButton
              label={t('Cancel')}
              isDisabled={busy}
              onClick={() => history.push(`${baseUrl}/labels`)}
            />
          </div>
        </form>
        <Preview labels={[label]} locale={locale} />
      </div>
    </section>
  );
}
