import { Result } from '@/../types-root/product/Result';
import { ProductQuery } from '@/../types-root/query/ProductQuery';
import { Category } from '@/../types-root/product/Category';
import { SDKResponse } from '@commercetools/frontend-sdk';

export interface Filter {
  type: 'boolean' | 'term' | 'range';
  identifier: string;
}

export interface UseProductReturn {
  categories?: Category[];
  query: (productQuery: ProductQuery) => Promise<SDKResponse<Result>>;
}
