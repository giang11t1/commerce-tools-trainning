import { useState } from 'react';
import type { Label } from './domain';
import { errorMessage } from './domain';
import {
  fontFamilies,
  localDateTimeToUtc,
  numericStyleFields,
  positions,
  utcToLocalDateTime,
} from './label-configuration';
import type { LabelStyle } from './label-configuration';
import LabelImageFields from './label-image-fields';
import type { LabelMediaAdapter } from './label-media';
import { useText } from './messages';
import { Notice } from './components';
import styles from './styles.module.css';

const numericLabels: Record<keyof typeof numericStyleFields, string> = {
  fontSize: 'Font size',
  fontWeight: 'Font weight',
  paddingX: 'Padding X',
  paddingY: 'Padding Y',
  borderWidth: 'Border width',
  borderRadius: 'Border radius',
  letterSpacing: 'Letter spacing',
  opacity: 'Opacity',
  rotation: 'Rotation',
  maxWidth: 'Maximum width',
};
const imageFields = new Set([
  'borderWidth',
  'borderRadius',
  'opacity',
  'rotation',
  'maxWidth',
]);

export default function LabelConfigurationFields({
  label,
  change,
  languages,
  locale,
  adapter,
  onBusyChange,
}: {
  label: Label;
  change: <K extends keyof Label>(key: K, value: Label[K]) => void;
  languages: string[];
  locale: string;
  adapter?: LabelMediaAdapter;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useText();
  const [dateError, setDateError] = useState<string>();
  const image = label.type === 'image';
  const setStyle = (
    key: keyof LabelStyle,
    value: string | number | undefined
  ) => {
    const updated = { ...label.style };
    if (value === undefined) delete updated[key];
    else Object.assign(updated, { [key]: value });
    change('style', updated);
  };
  const setDate = (key: 'startDate' | 'endDate', input: HTMLInputElement) => {
    try {
      change(key, localDateTimeToUtc(input.value));
      input.setCustomValidity('');
      setDateError(undefined);
    } catch (error) {
      const message = errorMessage(error);
      input.setCustomValidity(message);
      setDateError(message);
    }
  };
  return (
    <>
      <label>
        {t('Label type')}
        <select
          value={label.type ?? 'text'}
          onChange={(event) => {
            change('type', event.target.value as 'text' | 'image');
            // Overrides valid for text might be invalid for images.
            change('advancedCss', '');
          }}
        >
          <option value="text">{t('Text')}</option>
          <option value="image">{t('Image')}</option>
        </select>
      </label>
      {image && (
        <LabelImageFields
          image={label.image}
          onChange={(value) => change('image', value)}
          languages={languages}
          locale={locale}
          adapter={adapter}
          onBusyChange={onBusyChange}
        />
      )}
      <fieldset className={styles.stack}>
        <legend>{t('Position and schedule')}</legend>
        <label>
          {t('Position')}
          <select
            value={label.position ?? 'top-left'}
            onChange={(event) =>
              change('position', event.target.value as Label['position'])
            }
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {t(position)}
              </option>
            ))}
          </select>
        </label>
        <p>
          {t(
            'Dates use your browser timezone and are stored in UTC. Start is inclusive; end is exclusive.'
          )}{' '}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
        <Notice error={dateError} />
        <label>
          {t('Start date and time')}
          <input
            type="datetime-local"
            value={utcToLocalDateTime(label.startDate)}
            onChange={(event) => setDate('startDate', event.target)}
          />
        </label>
        <label>
          {t('End date and time')}
          <input
            type="datetime-local"
            value={utcToLocalDateTime(label.endDate)}
            min={utcToLocalDateTime(label.startDate) || undefined}
            onChange={(event) => setDate('endDate', event.target)}
          />
        </label>
      </fieldset>
      <fieldset className={styles.stack}>
        <legend>{t('Style configuration')}</legend>
        {!image && (
          <div className={styles.toolbar}>
            {(['color', 'backgroundColor'] as const).map((key) => (
              <label key={key}>
                {t(key === 'color' ? 'Color' : 'Background color')}
                <input
                  type="color"
                  value={label.style?.[key] ?? label[key]}
                  onChange={(event) => {
                    change(key, event.target.value);
                    if (label.style?.[key]) setStyle(key, event.target.value);
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <div className={styles.styleGrid}>
          {Object.entries(numericStyleFields)
            .filter(([key]) => !image || imageFields.has(key))
            .map(([key, range]) => (
              <label key={key}>
                {t(numericLabels[key as keyof typeof numericStyleFields])}
                <input
                  type="number"
                  min={range[0]}
                  max={range[1]}
                  step={
                    key === 'opacity' ? 0.05 : key === 'letterSpacing' ? 0.1 : 1
                  }
                  value={
                    label.style?.[key as keyof typeof numericStyleFields] ?? ''
                  }
                  placeholder={t('Default')}
                  onChange={(event) =>
                    setStyle(
                      key as keyof LabelStyle,
                      event.target.value === ''
                        ? undefined
                        : event.target.valueAsNumber
                    )
                  }
                />
              </label>
            ))}
          {!image && (
            <>
              <label>
                {t('Font family')}
                <select
                  value={label.style?.fontFamily ?? 'inherit'}
                  onChange={(event) =>
                    setStyle('fontFamily', event.target.value)
                  }
                >
                  {fontFamilies.map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Text transform')}
                <select
                  value={label.style?.textTransform ?? 'none'}
                  onChange={(event) =>
                    setStyle('textTransform', event.target.value)
                  }
                >
                  {['none', 'uppercase', 'lowercase', 'capitalize'].map(
                    (value) => (
                      <option key={value} value={value}>
                        {t(value)}
                      </option>
                    )
                  )}
                </select>
              </label>
            </>
          )}
          <label>
            {t('Border style')}
            <select
              value={label.style?.borderStyle ?? 'none'}
              onChange={(event) => setStyle('borderStyle', event.target.value)}
            >
              {['none', 'solid', 'dashed', 'dotted', 'double'].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Border color')}
            <input
              type="color"
              value={label.style?.borderColor ?? '#000000'}
              onChange={(event) => setStyle('borderColor', event.target.value)}
            />
          </label>
        </div>
        <label>
          {t('Box shadow')}
          <input
            value={label.style?.boxShadow ?? ''}
            placeholder="2px 2px 4px #333333"
            onChange={(event) =>
              setStyle('boxShadow', event.target.value || undefined)
            }
          />
        </label>
        <label>
          {t('Advanced CSS')}
          <textarea
            value={label.advancedCss ?? ''}
            maxLength={2000}
            placeholder={
              image
                ? 'border-radius: 8px; opacity: 0.9;'
                : 'font-size: 14px; padding-left: 12px;'
            }
            onChange={(event) => change('advancedCss', event.target.value)}
          />
          <small>
            {t(
              'Only supported declarations are allowed. Selectors, URLs, variables and !important are rejected.'
            )}
          </small>
        </label>
      </fieldset>
    </>
  );
}
