import { classnames } from '@/helpers/untils/classnames';

const useClassNames = (classNames: Parameters<typeof classnames>) => {
  return classnames(...classNames);
};

export default useClassNames;
