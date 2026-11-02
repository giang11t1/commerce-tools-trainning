import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { ApplicationPageTitle } from '@commercetools-frontend/application-shell';
import { DOMAINS, GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import { useIsAuthorized } from '@commercetools-frontend/permissions';
import { PageUnauthorized } from '@commercetools-frontend/application-components';
import DataTable from '@commercetools-uikit/data-table';
import FlatButton from '@commercetools-uikit/flat-button';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { ContentNotification } from '@commercetools-uikit/notifications';
import { Pagination } from '@commercetools-uikit/pagination';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import { PERMISSIONS } from '../../constants';
import type {
  ReviewFilters,
  ReviewRecord,
  ReviewState,
} from '../../types/reviews';
import {
  useReviewById,
  useReviewStates,
  useReviewsFetcher,
} from '../../hooks/use-reviews-connector';
import { isReviewTransitionAllowed } from '../../hooks/use-reviews-connector/review-utils';
import styles from './review-management.module.css';

const PAGE_SIZE = 20;
const EMPTY_FILTERS: ReviewFilters = {
  stateId: '',
  rating: '',
  productId: '',
  fromDate: '',
  toDate: '',
  search: '',
};

const columns = [
  { key: 'review', label: 'Review' },
  { key: 'rating', label: 'Rating' },
  { key: 'author', label: 'Customer / author' },
  { key: 'product', label: 'Related product' },
  { key: 'state', label: 'Workflow state' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: 'Actions' },
];

const errorMessage = (error: unknown) => {
  const candidate = error as {
    message?: string;
    graphQLErrors?: Array<{ message?: string; extensions?: { code?: string } }>;
    networkError?: { statusCode?: number };
  };
  const graphError = candidate.graphQLErrors?.[0];
  if (
    graphError?.extensions?.code === 'ConcurrentModification' ||
    candidate.networkError?.statusCode === 409
  ) {
    return 'This review changed since it was loaded. Refresh the list and try again.';
  }
  return (
    graphError?.message ??
    candidate.message ??
    'Unable to load reviews from commercetools.'
  );
};

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale || 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const statusLabel = (review: ReviewRecord, states: ReviewState[]) =>
  states.find((state) => state.id === review.state?.id)?.key ??
  'No configured state';

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className={styles.metric}>
    <Text.Detail>{label}</Text.Detail>
    <Text.Headline as="h2">{value.toLocaleString()}</Text.Headline>
  </div>
);

const ReviewManagement = () => {
  const intl = useIntl();
  const showNotification = useShowNotification();
  const { dataLocale, project } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale ?? 'en-US',
    project: context.project,
  }));
  const canView = useIsAuthorized({ demandedPermissions: [PERMISSIONS.View] });
  const canManage = useIsAuthorized({
    demandedPermissions: [PERMISSIONS.Manage],
  });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const statesQuery = useReviewStates();
  const states: ReviewState[] = statesQuery.data?.states.results ?? [];
  const {
    data,
    error,
    loading,
    products,
    refetch,
    transitionReview,
    transitionLoading,
  } = useReviewsFetcher({
    filters,
    page,
    perPage: PAGE_SIZE,
    locale: dataLocale,
    states,
  });
  const reviewDetailsQuery = useReviewById(selectedReviewId);
  const reviews: ReviewRecord[] = data?.reviews.results ?? [];
  const selectedReview: ReviewRecord | null =
    reviewDetailsQuery.data?.review ?? null;
  const productMap = useMemo(
    () =>
      new Map<string, (typeof products)[number]>(
        products.map((product) => [product.id, product])
      ),
    [products]
  );
  const pendingState = states.find((state) => state.key === 'review-pending');
  const approvedState = states.find((state) => state.key === 'review-approved');
  const rejectedState = states.find((state) => state.key === 'review-rejected');
  const stateMachineReady = Boolean(
    pendingState && approvedState && rejectedState
  );
  const approvedCountsInRatings =
    approvedState?.roles.includes('ReviewIncludedInStatistics') ?? false;

  if (!canView) return <PageUnauthorized />;

  const applyFilters = () => {
    setPage(1);
    setSelectedReviewId(null);
    setFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSelectedReviewId(null);
  };

  const changeReviewState = async (
    review: ReviewRecord,
    state: ReviewState
  ) => {
    try {
      const result = await transitionReview({
        context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM },
        variables: {
          id: review.id,
          version: review.version,
          stateId: state.id,
        },
      });
      if (!result.data?.updateReview) {
        throw new Error(
          'commercetools did not confirm the review state transition.'
        );
      }
      await refetch();
      if (selectedReviewId === review.id) await reviewDetailsQuery.refetch();
      showNotification({
        kind: 'success',
        domain: DOMAINS.SIDE,
        text: `Review moved to ${state.key}.`,
      });
    } catch (mutationError) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: errorMessage(mutationError),
      });
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil((data?.reviews.total ?? 0) / PAGE_SIZE)
  );

  return (
    <Spacings.Stack scale="l">
      <ApplicationPageTitle additionalParts={['Review Management']} />
      <Spacings.Stack scale="xs">
        <Text.Headline as="h1">Product reviews</Text.Headline>
        <Text.Detail>
          Project: {project?.key ?? 'Current Merchant Center project'}
        </Text.Detail>
      </Spacings.Stack>

      {(error || statesQuery.error || reviewDetailsQuery.error) && (
        <ContentNotification type="error">
          <Text.Body>
            {errorMessage(
              error ?? statesQuery.error ?? reviewDetailsQuery.error
            )}
          </Text.Body>
        </ContentNotification>
      )}

      {!statesQuery.loading && !statesQuery.error && !stateMachineReady && (
        <ContentNotification type="warning">
          <Text.Body>
            Review states are not configured in this project. Reviews can be
            inspected, but approval and rejection are disabled until
            review-pending, review-approved, and review-rejected exist with the
            intended transitions.
          </Text.Body>
        </ContentNotification>
      )}
      {stateMachineReady && !approvedCountsInRatings && (
        <ContentNotification type="warning">
          <Text.Body>
            The approved review state does not have the
            ReviewIncludedInStatistics role. Approved reviews will not
            contribute to product rating statistics until that role is
            configured.
          </Text.Body>
        </ContentNotification>
      )}

      <div className={styles.metrics}>
        <Metric label="Total reviews" value={data?.allReviews.total ?? 0} />
        <Metric label="Pending" value={data?.pendingReviews.total ?? 0} />
        <Metric label="Approved" value={data?.approvedReviews.total ?? 0} />
        <Metric label="Rejected" value={data?.rejectedReviews.total ?? 0} />
      </div>

      <section aria-label="Review filters" className={styles.filters}>
        <label>
          Search title, text, or author (exact)
          <input
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, search: event.target.value })
            }
          />
        </label>
        <label>
          State
          <select
            value={draftFilters.stateId}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, stateId: event.target.value })
            }
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.key}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rating
          <select
            value={draftFilters.rating}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, rating: event.target.value })
            }
          >
            <option value="">All ratings</option>
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating} stars
              </option>
            ))}
          </select>
        </label>
        <label>
          Product ID
          <input
            value={draftFilters.productId}
            onChange={(event) =>
              setDraftFilters({
                ...draftFilters,
                productId: event.target.value,
              })
            }
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={draftFilters.fromDate}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, fromDate: event.target.value })
            }
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={draftFilters.toDate}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, toDate: event.target.value })
            }
          />
        </label>
        <div className={styles.filterActions}>
          <FlatButton label="Apply filters" onClick={applyFilters} />
          <FlatButton label="Clear" onClick={clearFilters} />
        </div>
      </section>

      {statesQuery.loading && <LoadingSpinner />}
      {loading && <LoadingSpinner />}
      {reviewDetailsQuery.loading && selectedReviewId && <LoadingSpinner />}
      {!loading && !error && reviews.length === 0 && (
        <ContentNotification type="info">
          <Text.Body>No reviews match these filters.</Text.Body>
        </ContentNotification>
      )}

      {reviews.length > 0 && (
        <div className={styles.workspace}>
          <div className={styles.tableWrap}>
            <DataTable<ReviewRecord>
              isCondensed
              columns={columns}
              rows={reviews}
              itemRenderer={(review, column) => {
                const product = review.target?.id
                  ? productMap.get(review.target.id)
                  : undefined;
                switch (column.key) {
                  case 'review':
                    return (
                      <button
                        className={styles.rowLink}
                        type="button"
                        onClick={() => setSelectedReviewId(review.id)}
                      >
                        <strong>{review.title || 'Untitled review'}</strong>
                        <span>{review.text || 'No review text'}</span>
                      </button>
                    );
                  case 'rating':
                    return `${review.rating ?? '—'} / 5`;
                  case 'author':
                    return (
                      review.authorName || review.customer?.id || 'Anonymous'
                    );
                  case 'product':
                    return (
                      product?.masterData.current.name ||
                      review.target?.id ||
                      'No target'
                    );
                  case 'state':
                    return statusLabel(review, states);
                  case 'createdAt':
                    return formatDate(review.createdAt, intl.locale);
                  case 'actions': {
                    if (!canManage || !stateMachineReady || !review.state)
                      return 'View only';
                    const canApprove = isReviewTransitionAllowed(
                      review,
                      approvedState
                    );
                    const canReject = isReviewTransitionAllowed(
                      review,
                      rejectedState
                    );
                    return (
                      <Spacings.Inline scale="xs">
                        {canApprove && (
                          <FlatButton
                            label="Approve"
                            isDisabled={transitionLoading}
                            onClick={() =>
                              void changeReviewState(review, approvedState!)
                            }
                          />
                        )}
                        {canReject && (
                          <FlatButton
                            label="Reject"
                            isDisabled={transitionLoading}
                            onClick={() =>
                              void changeReviewState(review, rejectedState!)
                            }
                          />
                        )}
                        {!canApprove && !canReject && 'No allowed transition'}
                      </Spacings.Inline>
                    );
                  }
                  default:
                    return null;
                }
              }}
              onRowClick={(review) => setSelectedReviewId(review.id)}
            />
            <Pagination
              page={page}
              onPageChange={setPage}
              perPage={PAGE_SIZE}
              onPerPageChange={() => undefined}
              totalItems={data?.reviews.total ?? 0}
              perPageRange="s"
            />
          </div>

          {selectedReview && (
            <aside className={styles.detail} aria-label="Review details">
              <div className={styles.detailHeader}>
                <Text.Subheadline as="h4">Review details</Text.Subheadline>
                <FlatButton
                  label="Close"
                  onClick={() => setSelectedReviewId(null)}
                />
              </div>
              <Text.Headline as="h3">
                {selectedReview.title || 'Untitled review'}
              </Text.Headline>
              <Text.Body>{selectedReview.text || 'No review text.'}</Text.Body>
              <Text.Detail>
                Rating: {selectedReview.rating ?? '—'} / 5
              </Text.Detail>
              <Text.Detail>
                Author: {selectedReview.authorName || 'Anonymous'}
              </Text.Detail>
              <Text.Detail>
                Customer ID: {selectedReview.customer?.id || 'Not linked'}
              </Text.Detail>
              <Text.Detail>
                State: {statusLabel(selectedReview, states)}
              </Text.Detail>
              <Text.Detail>
                Created: {formatDate(selectedReview.createdAt, intl.locale)}
              </Text.Detail>
              <Text.Detail>
                {selectedReview.includedInStatistics
                  ? 'Included in rating statistics'
                  : 'Excluded from rating statistics'}
              </Text.Detail>
              <Text.Detail>
                Product:{' '}
                {productMap.get(selectedReview.target?.id ?? '')?.masterData
                  .current.name ??
                  selectedReview.target?.id ??
                  'No target'}
              </Text.Detail>
              {canManage && stateMachineReady && selectedReview.state && (
                <Spacings.Inline scale="s">
                  {isReviewTransitionAllowed(selectedReview, approvedState) && (
                    <FlatButton
                      label="Approve review"
                      isDisabled={transitionLoading}
                      onClick={() =>
                        void changeReviewState(selectedReview, approvedState!)
                      }
                    />
                  )}
                  {isReviewTransitionAllowed(selectedReview, rejectedState) && (
                    <FlatButton
                      label="Reject review"
                      isDisabled={transitionLoading}
                      onClick={() =>
                        void changeReviewState(selectedReview, rejectedState!)
                      }
                    />
                  )}
                </Spacings.Inline>
              )}
            </aside>
          )}
        </div>
      )}
      {data && totalPages > 1 && (
        <Text.Detail>
          Page {page} of {totalPages}
        </Text.Detail>
      )}
    </Spacings.Stack>
  );
};

ReviewManagement.displayName = 'ReviewManagement';

export default ReviewManagement;
