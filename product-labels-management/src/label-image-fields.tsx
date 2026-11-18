import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import FlatButton from '@commercetools-uikit/flat-button';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { ContentNotification } from '@commercetools-uikit/notifications';
import { validateImage } from './label-configuration';
import type { LabelImage } from './label-configuration';
import { createLabelMediaUpload } from './label-media';
import type { LabelMediaAdapter } from './label-media';
import { errorMessage } from './domain';
import { useText } from './messages';
import styles from './styles.module.css';

export type LabelImageFieldsProps = {
  image?: LabelImage;
  onChange: (image: LabelImage | undefined) => void;
  languages: string[];
  locale: string;
  disabled?: boolean;
  adapter?: LabelMediaAdapter;
  onBusyChange?: (busy: boolean) => void;
};

export default function LabelImageFields({
  image,
  onChange,
  languages,
  locale,
  disabled = false,
  adapter,
  onBusyChange,
}: LabelImageFieldsProps) {
  const t = useText();
  const [url, setUrl] = useState(image?.url ?? '');
  const [alt, setAlt] = useState<Record<string, string>>(image?.alt ?? {});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(0);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const changeCallback = useRef(onChange);
  changeCallback.current = onChange;
  const operation = useRef<
    ReturnType<typeof createLabelMediaUpload> | undefined
  >(undefined);
  if (!operation.current)
    operation.current = createLabelMediaUpload({
      onBusyChange(value) {
        if (mounted.current) setBusy(value);
        busyCallback.current?.(value);
      },
      onProgress(value) {
        if (mounted.current) setProgress(value);
      },
      onError(failure) {
        if (mounted.current) setError(errorMessage(failure));
      },
      onSuccess(next) {
        if (!mounted.current || fileInput.current?.matches(':disabled')) return;
        changeCallback.current(next);
        setSuccess('Image uploaded.');
      },
    });

  useEffect(() => {
    setUrl(image?.url ?? '');
  }, [image?.url]);
  useEffect(() => {
    setAlt(image?.alt ?? {});
  }, [image?.alt]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current?.cancel();
    };
  }, []);
  useEffect(() => {
    operation.current?.cancel();
  }, [adapter, disabled, image]);

  function cancel() {
    operation.current?.cancel();
  }

  function update(value: unknown) {
    setError(undefined);
    setSuccess(undefined);
    try {
      const next = validateImage(value);
      cancel();
      onChange(next);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const blocked = event.currentTarget.matches(':disabled');
    event.target.value = '';
    if (!file || blocked || disabled || !adapter) return;
    setError(undefined);
    setSuccess(undefined);
    await operation.current?.start(file, adapter);
  }

  return (
    <section className={styles.stack} aria-label={t('Label image')}>
      <h3>{t('Label image')}</h3>
      {!adapter && (
        <ContentNotification type="info">
          {t(
            'Upload provider not configured. Enter an existing HTTPS image URL below.'
          )}
        </ContentNotification>
      )}
      <label>
        {t(image ? 'Replace image' : 'Upload image')}
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || !adapter}
          onChange={(event) => {
            void upload(event);
          }}
        />
      </label>
      <p>
        {t(
          'PNG, JPEG or WebP. Maximum 2 MB, 4096 pixels per side and 16 million pixels. SVG is not allowed.'
        )}
      </p>
      {busy && (
        <div role="status">
          <LoadingSpinner>{t('Validating and uploading image')}</LoadingSpinner>
          <progress
            max={100}
            value={progress ?? undefined}
            aria-label={t('Upload progress')}
          />
          {progress !== null && <span>{Math.round(progress)}%</span>}
          <FlatButton label={t('Cancel upload')} onClick={cancel} />
        </div>
      )}
      {error && (
        <div role="alert">
          <ContentNotification type="error">{t(error)}</ContentNotification>
        </div>
      )}
      {success && (
        <div role="status">
          <ContentNotification type="success">{t(success)}</ContentNotification>
        </div>
      )}
      <div className={styles.toolbar}>
        <label>
          {t('Hosted image URL')}
          <input
            type="url"
            value={url}
            disabled={disabled}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <FlatButton
          label={t('Use image URL')}
          isDisabled={disabled || !url.trim()}
          onClick={() =>
            update(
              image?.url === url.trim()
                ? image
                : {
                    url: url.trim(),
                    alt,
                    width: image?.width ?? 64,
                    height: image?.height ?? 64,
                    objectFit: image?.objectFit ?? 'contain',
                    borderRadius: image?.borderRadius,
                    opacity: image?.opacity,
                  }
            )
          }
        />
      </div>
      <p>
        {t(
          'Use a trusted HTTPS PNG, JPEG or WebP asset URL. Hosted assets are not downloaded or verified by this form.'
        )}
      </p>
      {[...new Set([...languages, locale])].map((language) => (
        <label key={language}>
          {t('Alternative text')} ({language})
          <input
            type="text"
            maxLength={200}
            disabled={disabled || busy}
            value={alt[language] ?? ''}
            onChange={(event) => {
              const next = { ...alt, [language]: event.target.value };
              setAlt(next);
              if (image) update({ ...image, alt: next });
            }}
          />
        </label>
      ))}
      {image && (
        <>
          <img
            src={image.url}
            alt={image.alt[locale] ?? ''}
            width={image.width}
            height={image.height}
            referrerPolicy="no-referrer"
            style={{
              objectFit: image.objectFit,
              borderRadius: image.borderRadius,
              opacity: image.opacity,
              maxWidth: '100%',
            }}
            onError={() =>
              setError(
                'The image preview could not be loaded. Check the URL and image access permissions.'
              )
            }
          />
          <FlatButton
            label={t('Remove image')}
            isDisabled={disabled}
            onClick={() => {
              cancel();
              setError(undefined);
              setSuccess(undefined);
              setUrl('');
              setAlt({});
              onChange(undefined);
            }}
          />
          <p>
            {t(
              'Replacing or removing an image only changes this label. The stored asset is not deleted.'
            )}
          </p>
          <fieldset disabled={disabled || busy} className={styles.stack}>
            <legend>{t('Image settings')}</legend>
            <div className={styles.toolbar}>
              {(['width', 'height', 'borderRadius', 'opacity'] as const).map(
                (field) => (
                  <label key={field}>
                    {t(
                      {
                        width: 'Image width',
                        height: 'Image height',
                        borderRadius: 'Border radius',
                        opacity: 'Opacity',
                      }[field]
                    )}
                    <input
                      type="number"
                      min={field === 'width' || field === 'height' ? 8 : 0}
                      max={
                        field === 'opacity'
                          ? 1
                          : field === 'borderRadius'
                          ? 256
                          : 512
                      }
                      step={field === 'opacity' ? 0.05 : 1}
                      value={image[field] ?? (field === 'opacity' ? 1 : 0)}
                      onChange={(event) =>
                        update({
                          ...image,
                          [field]:
                            event.target.value === ''
                              ? NaN
                              : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                )
              )}
              <label>
                {t('Image fit')}
                <select
                  value={image.objectFit}
                  onChange={(event) =>
                    update({ ...image, objectFit: event.target.value })
                  }
                >
                  <option value="contain">{t('Contain')}</option>
                  <option value="cover">{t('Cover')}</option>
                </select>
              </label>
            </div>
          </fieldset>
        </>
      )}
    </section>
  );
}
