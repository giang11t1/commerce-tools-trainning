import gql from 'graphql-tag';

export const REVIEW_STATES_QUERY = gql`
  query FetchReviewStates($where: String!) {
    states(where: $where, limit: 100) {
      results {
        id
        key
        initial
        roles
        transitions {
          id
          key
        }
      }
    }
  }
`;

export const REVIEWS_QUERY = gql`
  query FetchReviews(
    $where: String
    $sort: [String!]
    $limit: Int!
    $offset: Int!
    $pendingWhere: String!
    $approvedWhere: String!
    $rejectedWhere: String!
  ) {
    allReviews: reviews(limit: 0) {
      total
    }
    pendingReviews: reviews(where: $pendingWhere, limit: 0) {
      total
    }
    approvedReviews: reviews(where: $approvedWhere, limit: 0) {
      total
    }
    rejectedReviews: reviews(where: $rejectedWhere, limit: 0) {
      total
    }
    reviews(where: $where, sort: $sort, limit: $limit, offset: $offset) {
      count
      total
      offset
      results {
        id
        version
        authorName
        title
        text
        rating
        createdAt
        includedInStatistics
        customer {
          id
        }
        target {
          id
          __typename
        }
        state {
          id
          key
          transitions {
            id
            key
          }
        }
      }
    }
  }
`;

export const REVIEW_BY_ID_QUERY = gql`
  query FetchReviewById($id: String!) {
    review(id: $id) {
      id
      version
      authorName
      title
      text
      rating
      createdAt
      includedInStatistics
      customer {
        id
      }
      target {
        id
        __typename
      }
      state {
        id
        key
        transitions {
          id
          key
        }
      }
    }
  }
`;

export const REVIEW_PRODUCTS_QUERY = gql`
  query FetchReviewProducts($where: String!, $locale: Locale!) {
    products(where: $where, limit: 50) {
      results {
        id
        masterData {
          current {
            name(locale: $locale)
            masterVariant {
              sku
            }
          }
        }
      }
    }
  }
`;

export const TRANSITION_REVIEW_MUTATION = gql`
  mutation TransitionReview($id: String!, $version: Long!, $stateId: String!) {
    updateReview(
      id: $id
      version: $version
      actions: [
        { transitionState: { state: { typeId: "state", id: $stateId } } }
      ]
    ) {
      id
      version
      includedInStatistics
      state {
        id
        key
        transitions {
          id
          key
        }
      }
    }
  }
`;
