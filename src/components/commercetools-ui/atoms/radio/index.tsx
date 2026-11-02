import React from 'react';
import useClassNames from '@/helpers/hooks/useClassNames';
import useControllableState from '@/helpers/hooks/useControllable';

interface Props extends Omit<React.ComponentProps<'input'>, 'key'> {
  className?: string;
  inputClassName?: string;
  onChecked?: () => void;
}

const Radio: React.FC<Props> = ({
  className = '',
  inputClassName = '',
  onChecked,
  children,
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  ...props
}) => {
  const [checked, setChecked] = useControllableState(checkedProp, defaultChecked);

  const labelClassName = useClassNames([
    'grid place-content-center w-20 h-20 border border-gray-600 rounded-full',
    className,
  ]);

  const inputClassNames = useClassNames([
    'size-5 shrink-0 accent-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:cursor-not-allowed',
    inputClassName,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onChecked?.();
    setChecked(true);
  };

  return (
    <label className={labelClassName} htmlFor={props.id}>
      <input
        className={inputClassNames}
        type="radio"
        checked={checked}
        onChange={(e) => handleChange(e)}
        {...props}
      />
      {children}
    </label>
  );
};

export default Radio;
