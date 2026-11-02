import { FC } from 'react';
import { DisclosureButton } from '@headlessui/react';
import { ChevronDownIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import useClassNames from '@/helpers/hooks/useClassNames';
import { AccordionProps } from '.';

type AccordionButtonProps = AccordionProps & {
  open: boolean;
  buttonWrapperClassName?: string;
  buttonClassName?: string;
};

const AccordionButton: FC<AccordionButtonProps> = ({
  open,
  buttonWrapperClassName,
  buttonClassName,
  openSectionTitle,
  closedSectionTitle,
  collapsedLabel,
  variant,
  iconClassName,
}) => {
  const buttonClassNames = useClassNames(['w-full flex justify-between', buttonClassName]);

  return (
    <DisclosureButton className={`${buttonWrapperClassName} w-full`}>
      <div className={buttonClassNames}>
        <h4 className="self-center transition">{open ? openSectionTitle : closedSectionTitle}</h4>
        <div className="flex items-center gap-2">
          {!open && collapsedLabel && <p className="font-medium text-primary">{collapsedLabel}</p>}
          {variant === 'arrow' ? (
            <ChevronDownIcon width={4} strokeWidth={1} className={`${open ? 'rotate-180' : ''} ${iconClassName}`} />
          ) : !open ? (
            <PlusIcon width={4} strokeWidth={2} className={iconClassName} />
          ) : (
            <MinusIcon width={4} strokeWidth={2} className={iconClassName} />
          )}
        </div>
      </div>
    </DisclosureButton>
  );
};

export default AccordionButton;
