import { StrictMode, Suspense, lazy } from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

const isEditorRoute = ['/editor', '/projects'].includes(window.location.pathname.replace(/\/$/, ''));
const App = isEditorRoute
  ? lazy(() => import('./App.tsx'))
  : lazy(() => import('./WebsiteApp.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#070912]" />}>
      <App />
    </Suspense>
  </StrictMode>,
);
