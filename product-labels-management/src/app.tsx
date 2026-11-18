import {
  NavLink,
  Redirect,
  Route,
  Switch,
  useRouteMatch,
} from 'react-router-dom';
import { ApplicationPageTitle } from '@commercetools-frontend/application-shell';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { PageUnauthorized } from '@commercetools-frontend/application-components';
import Text from '@commercetools-uikit/text';
import { ContentNotification } from '@commercetools-uikit/notifications';
import Assignments from './assignments';
import { LabelEditor, LabelsList } from './labels';
import { useService } from './use-service';
import { useText } from './messages';
import styles from './styles.module.css';
import type { LabelMediaAdapter } from './label-media';
import { useLabelMedia } from './use-label-media';

export default function App({
  mediaAdapter,
}: { mediaAdapter?: LabelMediaAdapter } = {}) {
  const { projectKey, service, view, manage } = useService();
  const configuredMediaAdapter = useLabelMedia();
  const { locale, languages } = useApplicationContext((context) => ({
    locale: context.dataLocale ?? context.project?.languages[0] ?? 'en',
    languages: context.project?.languages ?? [],
  }));
  const match = useRouteMatch();
  const t = useText();
  if (!view) return <PageUnauthorized />;
  if (!projectKey) return <p>{t('Select a Merchant Center project.')}</p>;
  const props = {
    service,
    manage,
    locale,
    languages,
    baseUrl: match.url,
    mediaAdapter: mediaAdapter ?? configuredMediaAdapter.adapter,
  };
  return (
    <main className={styles.app} key={projectKey}>
      <ApplicationPageTitle additionalParts={[t('Product labels')]} />
      <Text.Headline as="h1">{t('Product labels')}</Text.Headline>
      {!mediaAdapter && configuredMediaAdapter.error && (
        <div role="alert">
          <ContentNotification type="error">
            {t(configuredMediaAdapter.error)}
          </ContentNotification>
        </div>
      )}
      {!mediaAdapter && configuredMediaAdapter.warning && (
        <ContentNotification type="info">
          {t(configuredMediaAdapter.warning)}
        </ContentNotification>
      )}
      <nav className={styles.tabs}>
        <NavLink activeClassName={styles.activeTab} to={`${match.url}/labels`}>
          {t('Labels')}
        </NavLink>
        <NavLink
          activeClassName={styles.activeTab}
          to={`${match.url}/assignments`}
        >
          {t('Product assignments')}
        </NavLink>
      </nav>
      {!manage && (
        <ContentNotification type="info">
          {t(
            'Read-only access. Ask an administrator for Manage permission to make changes.'
          )}
        </ContentNotification>
      )}
      <Switch key={`${projectKey}-${locale}`}>
        <Route exact path={`${match.path}/labels/new`}>
          <LabelEditor {...props} create />
        </Route>
        <Route
          exact
          path={[`${match.path}/labels/:key/edit`, `${match.path}/labels/:key`]}
        >
          <LabelEditor {...props} />
        </Route>
        <Route exact path={`${match.path}/labels`}>
          <LabelsList {...props} />
        </Route>
        <Route exact path={`${match.path}/assignments`}>
          <Assignments {...props} />
        </Route>
        <Redirect to={`${match.url}/labels`} />
      </Switch>
    </main>
  );
}
