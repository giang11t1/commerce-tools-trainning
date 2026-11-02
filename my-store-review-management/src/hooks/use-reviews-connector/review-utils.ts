import type {
  ReviewFilters,
  ReviewRecord,
  ReviewState,
} from '../../types/reviews';

export const quotePredicate = (value: string) => JSON.stringify(value);

export const buildReviewPredicate = (filters: ReviewFilters) => {
  const predicates: string[] = [];

  if (filters.stateId)
    predicates.push(`state(id=${quotePredicate(filters.stateId)})`);
  if (filters.rating) predicates.push(`rating=${Number(filters.rating)}`);
  if (filters.productId.trim()) {
    predicates.push(`target(id=${quotePredicate(filters.productId.trim())})`);
  }
  if (filters.fromDate) {
    predicates.push(
      `createdAt >= ${quotePredicate(
        new Date(`${filters.fromDate}T00:00:00.000Z`).toISOString()
      )}`
    );
  }
  if (filters.toDate) {
    const nextDay = new Date(`${filters.toDate}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    predicates.push(`createdAt < ${quotePredicate(nextDay.toISOString())}`);
  }
  if (filters.search.trim()) {
    const value = quotePredicate(filters.search.trim());
    predicates.push(`(title=${value} or authorName=${value} or text=${value})`);
  }

  return predicates.length ? predicates.join(' and ') : null;
};

export const isReviewTransitionAllowed = (
  review: ReviewRecord,
  target: ReviewState | undefined
) => {
  if (!review.state || !target) return false;
  const transitions = review.state.transitions;
  // commercetools permits any transition when a State has no transitions configured.
  return (
    transitions == null || transitions.some((state) => state.id === target.id)
  );
};
