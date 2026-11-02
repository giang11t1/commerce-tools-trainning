import { graphql } from 'msw';
import { setupServer } from 'msw/node';
import {
  mapResourceAccessToAppliedPermissions,
  screen,
} from '@commercetools-frontend/application-shell/test-utils';
import { entryPointUriPath, PERMISSIONS } from '../../constants';
import { renderApplicationWithRedux } from '../../test-utils';
import ApplicationRoutes from '../../routes';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('shows dashboard totals without downloading all reviews', async () => {
  server.use(
    graphql.query('FetchReviewStates', (_request, response, context) =>
      response(context.data({ states: { results: [] } }))
    ),
    graphql.query('FetchReviews', (_request, response, context) =>
      response(
        context.data({
          allReviews: { total: 27 },
          pendingReviews: { total: 4 },
          approvedReviews: { total: 20 },
          rejectedReviews: { total: 3 },
          reviews: { count: 0, total: 27, offset: 0, results: [] },
        })
      )
    )
  );

  renderApplicationWithRedux(<ApplicationRoutes />, {
    route: `/my-project/${entryPointUriPath}`,
    project: {
      allAppliedPermissions: mapResourceAccessToAppliedPermissions([
        PERMISSIONS.View,
      ]),
    },
  });

  await screen.findByText('Product reviews');
  expect(await screen.findByText('27')).toBeInTheDocument();
  for (const label of ['Pending', 'Approved', 'Rejected']) {
    expect(screen.getByText(label).parentElement).toHaveTextContent(/\d+/);
  }
  expect(
    screen.getByText('No reviews match these filters.')
  ).toBeInTheDocument();
});
