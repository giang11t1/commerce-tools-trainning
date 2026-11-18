import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import FlatButton from '@commercetools-uikit/flat-button';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { ContentNotification } from '@commercetools-uikit/notifications';
import { errorMessage, localizedName } from './domain';
import type { Label, LabelRecord } from './domain';
import { useText } from './messages';
import styles from './styles.module.css';
import {
  labelStatus,
  labelStyle,
  localizedLabelText,
  positions,
  validateConfiguration,
} from './label-configuration';

export function useLabelClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function useResource<T>(load: () => Promise<T>): {
  data?: T;
  error?: string;
  loading: boolean;
  reload: () => void;
} {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
    source: () => Promise<T>;
  }>({ loading: true, source: load });
  useEffect(() => {
    let active = true;
    setState({ loading: true, source: load });
    load().then(
      (data) => {
        if (active) setState({ data, loading: false, source: load });
      },
      (error: unknown) => {
        if (active)
          setState({
            error: errorMessage(error),
            loading: false,
            source: load,
          });
      }
    );
    return () => {
      active = false;
    };
  }, [load, revision]);
  // Never render another project's or query's stale data while its effect starts.
  return {
    ...(state.source === load ? state : { loading: true }),
    reload: () => setRevision((value) => value + 1),
  };
}

export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  const t = useText();
  if (loading) return <LoadingSpinner>{t('Loading')}</LoadingSpinner>;
  if (error)
    return (
      <ContentNotification type="error">
        <p>
          {t('Unable to load data.')} {error}
        </p>
        <FlatButton label={t('Refresh')} onClick={retry} />
      </ContentNotification>
    );
  return null;
}

export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  const t = useText();
  if (error)
    return (
      <div role="alert">
        <ContentNotification type="error">
          {t('Operation failed.')} {error}
        </ContentNotification>
      </div>
    );
  if (success)
    return (
      <div role="status">
        <ContentNotification type="success">{t(success)}</ContentNotification>
      </div>
    );
  return null;
}

export function Badge({
  label,
  locale,
  thumbnail = false,
}: {
  label: Label;
  locale: string;
  thumbnail?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const t = useText();
  let style;
  try {
    validateConfiguration(label);
    style = labelStyle(label);
  } catch (error) {
    return <span className={styles.warning}>{errorMessage(error)}</span>;
  }
  const image = label.type === 'image' ? label.image : undefined;
  if (image && thumbnail) style = { ...style, maxWidth: 96, maxHeight: 64 };
  return (
    <span className={styles.badge} style={style}>
      {image && failedUrl !== image.url ? (
        <img
          src={image.url}
          alt={localizedLabelText(
            image.alt,
            locale,
            localizedName(label, locale)
          )}
          width={image.width}
          height={image.height}
          style={{
            width: '100%',
            height: '100%',
            objectFit: image.objectFit,
            borderRadius: 'inherit',
          }}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(image.url)}
        />
      ) : image ? (
        <span role="status">
          {t('Image unavailable')}: {localizedName(label, locale)}
        </span>
      ) : (
        localizedName(label, locale)
      )}
    </span>
  );
}

export function AssignedBadges({
  keys,
  definitions,
  locale,
}: {
  keys: string[];
  definitions: LabelRecord[];
  locale: string;
}) {
  const t = useText();
  if (!keys.length) return <span>{t('None')}</span>;
  return (
    <div className={styles.badges}>
      {[...keys]
        .sort(
          (a, b) =>
            (definitions.find(({ key }) => key === b)?.value.priority ?? 0) -
            (definitions.find(({ key }) => key === a)?.value.priority ?? 0)
        )
        .map((key) => {
          const label = definitions.find((item) => item.key === key)?.value;
          if (!label)
            return (
              <span className={styles.warning} key={key}>
                {t('Unknown label')}: {key}
              </span>
            );
          if (label.deletedAt || !label.active)
            return (
              <span className={styles.warning} key={key}>
                {localizedName(label, locale)} (
                {t(label.deletedAt ? 'Deleted' : 'Inactive')})
              </span>
            );
          return <Badge key={key} label={label} locale={locale} thumbnail />;
        })}
    </div>
  );
}

export function Preview({
  labels,
  locale,
}: {
  labels: Label[];
  locale: string;
}) {
  const t = useText();
  const now = useLabelClock();
  return (
    <aside className={styles.preview} aria-label={t('Product Card preview')}>
      <h3>{t('Product Card preview')}</h3>
      <div className={styles.productImage}>
        {positions.map((position) => (
          <div
            key={position}
            className={`${styles.badges} ${styles.positioned}`}
            data-position={position}
          >
            {labels
              .filter(
                (label) =>
                  labelStatus(label, now) === 'Active' &&
                  (label.position ?? 'top-left') === position
              )
              .sort(
                (a, b) => b.priority - a.priority || a.key.localeCompare(b.key)
              )
              .map((label) => (
                <Badge key={label.key} label={label} locale={locale} />
              ))}
          </div>
        ))}
        <svg viewBox="0 0 160 110" width="160" height="110" aria-hidden="true">
          <path
            d="M35 32 80 12l45 20v50l-45 20-45-20Z"
            fill="#d7dee8"
            stroke="#71819b"
            strokeWidth="2"
          />
          <path
            d="m35 32 45 21 45-21M80 53v49M57 22l46 21v19l-15 7V50L43 29"
            fill="none"
            stroke="#71819b"
            strokeWidth="2"
          />
        </svg>
      </div>
      {labels.map((label) => (
        <p key={label.key}>
          {localizedName(label, locale)}: {t(labelStatus(label, now))}
        </p>
      ))}
      <strong>{t('Preview product')}</strong>
      <p>
        {t(
          'Preview uses current time. Save definition changes to update the storefront after cache refresh.'
        )}
      </p>
    </aside>
  );
}

export function Pager({
  page,
  total,
  size = 20,
  change,
  disabled = false,
  maxPage,
}: {
  page: number;
  total: number;
  size?: number;
  change: (page: number) => void;
  disabled?: boolean;
  maxPage?: number;
}) {
  const t = useText();
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav className={styles.toolbar} aria-label={`${t('Page')} ${page}`}>
      <FlatButton
        label={t('Previous')}
        isDisabled={disabled || page <= 1}
        onClick={() => change(page - 1)}
      />
      <span>
        {t('Page')} {page} {t('of')} {pages} ({total})
      </span>
      <FlatButton
        label={t('Next')}
        isDisabled={
          disabled ||
          page >= pages ||
          (maxPage !== undefined && page >= maxPage)
        }
        onClick={() => change(page + 1)}
      />
    </nav>
  );
}

export function Confirmation({
  title,
  children,
  confirm,
  cancel,
  busy,
  label,
}: {
  title: string;
  children: ReactNode;
  confirm: () => void;
  cancel: () => void;
  busy: boolean;
  label: string;
}) {
  const t = useText();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    heading.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <section
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="confirmation-title"
      className={styles.confirm}
    >
      <h3 id="confirmation-title" tabIndex={-1} ref={heading}>
        {t(title)}
      </h3>
      <p>{children}</p>
      <div className={styles.toolbar}>
        <FlatButton label={t(label)} isDisabled={busy} onClick={confirm} />
        <FlatButton label={t('Cancel')} isDisabled={busy} onClick={cancel} />
      </div>
    </section>
  );
}
