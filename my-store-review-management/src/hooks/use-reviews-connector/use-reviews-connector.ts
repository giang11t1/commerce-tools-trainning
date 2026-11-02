import { useMemo } from 'react';
import {
  useMcMutation,
  useMcQuery,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import type {
  ReviewProduct,
  ReviewFilters,
  ReviewRecord,
  ReviewState,
} from '../../types/reviews';
import {
  REVIEW_PRODUCTS_QUERY,
  REVIEW_BY_ID_QUERY,
  REVIEW_STATES_QUERY,
  REVIEWS_QUERY,
  TRANSITION_REVIEW_MUTATION,
} from './review-queries';
import { buildReviewPredicate, quotePredicate } from './review-utils';

type StatesData = { states: { results: ReviewState[] } };
type StatesVariables = { where: string };
type ReviewsData = {
  allReviews: { total: number };
  pendingReviews: { total: number };
  approvedReviews: { total: number };
  rejectedReviews: { total: number };
  reviews: {
    count: number;
    total: number;
    offset: number;
    results: ReviewRecord[];
  };
};
type ReviewsVariables = {
  where: string | null;
  sort: string[];
  limit: number;
  offset: number;
  pendingWhere: string;
  approvedWhere: string;
  rejectedWhere: string;
};
type ReviewByIdData = { review: ReviewRecord | null };
type ReviewByIdVariables = { id: string };
type ProductsData = { products: { results: ReviewProduct[] } };
type ProductsVariables = { where: string; locale: string };
type TransitionData = { updateReview: ReviewRecord };
type TransitionVariables = { id: string; version: number; stateId: string };

const NO_STATE_ID = '00000000-0000-0000-0000-000000000000';

export const useReviewStates = () =>
  useMcQuery<StatesData, StatesVariables>(REVIEW_STATES_QUERY, {
    variables: { where: 'type="ReviewState"' },
    context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM },
  });

export const useReviewById = (id: string | null) =>
  useMcQuery<ReviewByIdData, ReviewByIdVariables>(REVIEW_BY_ID_QUERY, {
    variables: { id: id ?? '' },
    skip: !id,
    context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM },
  });

export const useReviewsFetcher = ({
  filters,
  page,
  perPage,
  locale,
  states,
}: {
  filters: ReviewFilters;
  page: number;
  perPage: number;
  locale: string;
  states: ReviewState[];
}) => {
  const pending = states.find((state) => state.key === 'review-pending');
  const approved = states.find((state) => state.key === 'review-approved');
  const rejected = states.find((state) => state.key === 'review-rejected');
  const variables = useMemo<ReviewsVariables>(
    () => ({
      where: buildReviewPredicate(filters),
      sort: ['createdAt desc'],
      limit: perPage,
      offset: (page - 1) * perPage,
      pendingWhere: `state(id=${quotePredicate(pending?.id ?? NO_STATE_ID)})`,
      approvedWhere: `state(id=${quotePredicate(approved?.id ?? NO_STATE_ID)})`,
      rejectedWhere: `state(id=${quotePredicate(rejected?.id ?? NO_STATE_ID)})`,
    }),
    [filters, page, perPage, pending?.id, approved?.id, rejected?.id]
  );

  const reviewsQuery = useMcQuery<ReviewsData, ReviewsVariables>(
    REVIEWS_QUERY,
    {
      variables,
      context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM },
      notifyOnNetworkStatusChange: true,
    }
  );
  const reviewRows = useMemo<ReviewRecord[]>(
    () => (reviewsQuery.data?.reviews.results ?? []) as ReviewRecord[],
    [reviewsQuery.data?.reviews.results]
  );

  const productIds = useMemo(
    () => [
      ...new Set(
        reviewRows
          .filter((review) => review.target?.__typename === 'Product')
          .map((review) => review.target?.id)
          .filter((id): id is string => Boolean(id))
      ),
    ],
    [reviewRows]
  );
  const productsWhere = productIds.length
    ? `id in (${productIds.map(quotePredicate).join(',')})`
    : '';
  const productsQuery = useMcQuery<ProductsData, ProductsVariables>(
    REVIEW_PRODUCTS_QUERY,
    {
      variables: { where: productsWhere, locale },
      skip: !productsWhere,
      context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM },
    }
  );
  const [transitionReview, transitionState] = useMcMutation<
    TransitionData,
    TransitionVariables
  >(TRANSITION_REVIEW_MUTATION);
  const products = (productsQuery.data?.products.results ??
    []) as ReviewProduct[];
  const data = reviewsQuery.data as ReviewsData | undefined;

  return {
    data,
    error: reviewsQuery.error ?? productsQuery.error,
    loading: reviewsQuery.loading || productsQuery.loading,
    products,
    refetch: reviewsQuery.refetch,
    transitionReview,
    transitionLoading: transitionState.loading,
  };
};
