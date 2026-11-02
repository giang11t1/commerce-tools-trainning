import React, { ComponentProps, FC, useMemo, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import useClassNames from '@/helpers/hooks/useClassNames';
import { StringHelpers } from '@/helpers/stringHelpers';

export interface InputProps extends ComponentProps<'input'> {
  label?: string;
  labelDesc?: string;
  labelDescClassName?: string;
  variant?: 'primary' | 'secondary';
  labelPosition?: 'top' | 'inline';
  error?: string;
  errorMessage?: string;
  hideCheckIcon?: boolean;
  renderEndIcon?: () => React.ReactNode;
  isDirty?: boolean;
}

const Input: FC<InputProps> = ({
  label,
  labelDesc,
  variant = 'primary',
  labelPosition = 'inline',
  className = '',
  errorMessage,
  children,
  hideCheckIcon,
  isDirty = false,
  onFocus,
  onBlur,
  error,
  labelDescClassName = '',
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isInline = labelPosition === 'inline' && !!label;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const bgClassName = useMemo(
    () =>
      ({
        primary: 'bg-white',
        secondary: 'bg-neutral-200',
      })[variant],
    [variant],
  );

  const topLabelClassName = useClassNames([
    'leading-loose text-14 font-medium text-gray-600',
  ]);

  const inlineLabelClassName = useClassNames([
    'pointer-events-none absolute left-[12px] z-[1] block font-medium text-gray-600 transition-all duration-150 ease-out',
    'top-1/2 -translate-y-1/2 text-14 origin-left',
    'peer-focus:top-[6px] peer-focus:translate-y-0 peer-focus:text-10',
    'peer-not-placeholder-shown:top-[6px] peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-10',
  ]);

  const labelContainerClassName = useClassNames([
    {
      'mb-8': labelPosition === 'top',
    },
  ]);

  const inputClassName = useClassNames([
    'h-40 focus:border-gray-400 focus:ring-0 w-full rounded-md border border-gray-300 px-12 text-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-400',
    bgClassName,
    isInline
      ? 'peer py-10 placeholder:text-transparent focus:pt-[20px] focus:pb-[4px] not-placeholder-shown:pt-[20px] not-placeholder-shown:pb-[4px]'
      : 'py-10 placeholder:text-14 placeholder:leading-normal placeholder:text-gray-600',
    {
      'border-red-500 focus:border-red-500': !!error,
    },
    { 'border-green-500 focus:border-green-500': !error && isFocused && isDirty },
    className,
  ]);

  const id = StringHelpers.convertToKebabCase(props.name);

  // Space placeholder enables :placeholder-shown detection for floating labels
  const resolvedPlaceholder = isInline ? ' ' : placeholder;

  const labelText = props.required ? `${label} *` : label;

  return (
    <div className="relative">
      {labelPosition === 'top' && (
        <div className={labelContainerClassName}>
          {label && (
            <label className={topLabelClassName} htmlFor={id}>
              {labelText}
            </label>
          )}
          {labelDesc && (
            <label className={labelDescClassName || 'text-sm text-gray-500'}>{` (${labelDesc})`}</label>
          )}
        </div>
      )}
      <div className="relative">
        <input
          className={inputClassName}
          id={id}
          {...(error && { 'aria-describedby': `${id}_input_error` })}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={resolvedPlaceholder}
        />
        {isInline && label && (
          <label className={inlineLabelClassName} htmlFor={id}>
            {labelText}
          </label>
        )}
        {isDirty && !error && !isFocused && !hideCheckIcon && (
          <CheckIcon
            data-testid="check-icon"
            className="absolute right-12 top-1/2 size-16 -translate-y-1/2 text-green-500"
          />
        )}
        {children}
      </div>
      {labelPosition === 'inline' && labelDesc && (
        <span className={labelDescClassName || 'text-sm text-gray-500'}>{` (${labelDesc})`}</span>
      )}
      {error && (
        <span className="text-12 font-medium leading-[16px] text-red-500" id={`${id}_input_error`}>
          {error ?? errorMessage}
        </span>
      )}
    </div>
  );
};

export default Input;
