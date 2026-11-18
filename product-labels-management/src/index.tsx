/// <reference types="@commercetools-frontend/application-config/client" />
import { lazy } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ApplicationShell,
  setupGlobalErrorListener,
} from '@commercetools-frontend/application-shell';
import type { ApplicationWindow } from '@commercetools-frontend/constants';
import { german } from './messages';

declare let window: ApplicationWindow;
const App = lazy(() => import('./app'));
setupGlobalErrorListener();
const container = document.getElementById('app');
if (!container) throw new Error('Application mount point is missing.');
createRoot(container).render(
  <ApplicationShell
    enableReactStrictMode
    environment={window.app}
    applicationMessages={async (locale) =>
      locale.startsWith('de') ? german : {}
    }
  >
    <App />
  </ApplicationShell>
);
