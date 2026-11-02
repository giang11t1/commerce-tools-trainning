import React from 'react';

export type BreadcrumbProps = {
  Separator?: React.ReactNode;
  className?: string;
  listClassName?: string;
};

const Breadcrumb = ({
  children,
  Separator = '/',
  className = '',
  listClassName,
}: React.PropsWithChildren<BreadcrumbProps>) => {
  return (
    <nav className={`scrollbar-hide relative max-w-full overflow-x-auto ${className}`} aria-label="Breadcrumb">
      <ol
        role="list"
        className={`flex items-center justify-center gap-x-4 gap-y-5 whitespace-pre px-4 ${listClassName}`}
      >
        {React.Children.map(children, (Child, index) => (
          <>
            <li>{Child}</li>
            {Separator && <li>{index < React.Children.count(children) - 1 && <span>{Separator}</span>}</li>}
          </>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
