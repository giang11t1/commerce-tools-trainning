export type ReviewState = {
  id: string;
  key: string;
  initial: boolean;
  roles: string[];
  transitions: Array<{ id: string; key: string }>;
};

export type ReviewRecord = {
  id: string;
  version: number;
  authorName?: string | null;
  title?: string | null;
  text?: string | null;
  rating?: number | null;
  createdAt: string;
  includedInStatistics: boolean;
  customer?: { id: string } | null;
  target?: { id: string; __typename?: string | null } | null;
  state?: {
    id: string;
    key?: string | null;
    transitions?: Array<{ id: string; key?: string | null }> | null;
  } | null;
};

export type ReviewProduct = {
  id: string;
  masterData: {
    current: {
      name?: string | null;
      masterVariant?: { sku?: string | null } | null;
    };
  };
};

export type ReviewFilters = {
  stateId: string;
  rating: string;
  productId: string;
  fromDate: string;
  toDate: string;
  search: string;
};
