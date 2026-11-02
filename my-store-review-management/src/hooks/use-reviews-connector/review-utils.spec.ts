import {
  buildReviewPredicate,
  isReviewTransitionAllowed,
} from './review-utils';
import type {
  ReviewFilters,
  ReviewRecord,
  ReviewState,
} from '../../types/reviews';

const emptyFilters: ReviewFilters = {
  stateId: '',
  rating: '',
  productId: '',
  fromDate: '',
  toDate: '',
  search: '',
};

describe('buildReviewPredicate', () => {
  it('does not add a predicate when no filters are selected', () => {
    expect(buildReviewPredicate(emptyFilters)).toBeNull();
  });

  it('escapes values and creates server-side predicates for the selected filters', () => {
    expect(
      buildReviewPredicate({
        ...emptyFilters,
        stateId: 'state-id',
        rating: '4',
        productId: 'product-id',
        search: 'A "quoted" title',
      })
    ).toBe(
      'state(id="state-id") and rating=4 and target(id="product-id") and (title="A \\"quoted\\" title" or authorName="A \\"quoted\\" title" or text="A \\"quoted\\" title")'
    );
  });

  it('uses an exclusive next-day bound for the selected end date', () => {
    expect(
      buildReviewPredicate({ ...emptyFilters, toDate: '2026-10-26' })
    ).toBe('createdAt < "2026-10-27T00:00:00.000Z"');
  });
});

describe('isReviewTransitionAllowed', () => {
  const approved: ReviewState = {
    id: 'approved',
    key: 'review-approved',
    initial: false,
    roles: [],
    transitions: [],
  };
  const review = (
    transitions: NonNullable<ReviewRecord['state']>['transitions']
  ): ReviewRecord => ({
    id: 'review',
    version: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    includedInStatistics: false,
    state: { id: 'pending', transitions },
  });

  it('allows only transitions listed by the current state', () => {
    expect(
      isReviewTransitionAllowed(review([{ id: 'approved' }]), approved)
    ).toBe(true);
    expect(
      isReviewTransitionAllowed(review([{ id: 'rejected' }]), approved)
    ).toBe(false);
  });

  it('follows commercetools behavior when no transition list is configured', () => {
    expect(isReviewTransitionAllowed(review(null), approved)).toBe(true);
    expect(isReviewTransitionAllowed(review([]), approved)).toBe(false);
  });
});
