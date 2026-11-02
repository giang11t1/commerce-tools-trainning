import React, { useCallback, useId, useRef, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import useClassNames from '@/helpers/hooks/useClassNames';
import useControllableState from '@/helpers/hooks/useControllable';
import useMediaQuery from '@/helpers/hooks/useMediaQuery';
import { desktop } from '@/helpers/untils/screensizes';

export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'key'> {
  label?: string;
  labelPosition?: 'on-left' | 'on-right';
  containerClassName?: string;
  onChange?: (props: { name: string; checked: boolean }) => void;
  disableBackground?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  className = '',
  checked,
  onChange,
  onMouseOver,
  onMouseLeave,
  containerClassName,
  label,
  defaultChecked = false,
  labelPosition = 'on-right',
  disableBackground = false,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isChecked, setIsChecked] = useControllableState(checked, defaultChecked);
  const generatedId = useId();
  const inputId = props.id ?? generatedId;

  const [isDesktopSize] = useMediaQuery(desktop);

  const checkboxRef = useRef<HTMLInputElement>(null);

  const toggleIsChecked = useCallback(() => {
    onChange?.({ name: props.name ?? '', checked: !isChecked });

    setIsChecked(!isChecked);
  }, [isChecked, onChange, props.name, setIsChecked]);

  const handleMouseOver = (e: React.MouseEvent<HTMLInputElement>) => {
    setIsHovered(isDesktopSize);
    onMouseOver?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLInputElement>) => {
    setIsHovered(false);
    onMouseLeave?.(e);
  };

  const containerClassNames = useClassNames(['flex items-center gap-12', containerClassName]);
  const buttonClassName = useClassNames([
    'relative size-5 shrink-0 cursor-pointer rounded-sm border',
    isChecked || isHovered ? 'border-gray-600' : 'border-neutral-400',
  ]);

  const inputClassName = useClassNames([
    'absolute w-full h-full z-[2] checked:bg-none bg-transparent focus:border-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 rounded-sm text-transparent border-neutral-400',
    className,
  ]);

  const iconClassName = useClassNames([
    'absolute top-[50%] z-[1] left-[50%] h-16 w-16 translate-y-[-50%] translate-x-[-50%] stroke-[2px]',
    isChecked || isHovered ? 'block' : 'hidden',
    isChecked && !disableBackground ? 'text-white' : 'text-gray-600',
  ]);

  const backgroundClassName = useClassNames(['absolute inset-0 z-0 rounded-sm', { 'bg-gray-600': !!isChecked }]);

  const LabelElement = (
    <label id={`${inputId}-label`} htmlFor={inputId} className="text-14 text-gray-600">
      {label}
    </label>
  );

  return (
    <div className={containerClassNames}>
      {label && labelPosition === 'on-left' && LabelElement}

      <div className={buttonClassName}>
        <input
          ref={checkboxRef}
          type="checkbox"
          id={inputId}
          aria-labelledby={label ? `${inputId}-label` : undefined}
          checked={isChecked}
          className={inputClassName}
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
          onChange={toggleIsChecked}
          {...props}
        />

        <CheckIcon className={iconClassName} />

        {!disableBackground && <div className={backgroundClassName} />}
      </div>

      {label && labelPosition === 'on-right' && LabelElement}
    </div>
  );
};

export default Checkbox;
