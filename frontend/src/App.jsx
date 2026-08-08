/* ============================================================================
   App — the router. Replaces index.html / task.html / review.html / new.html
   with real routes under one shared shell layout. Pages are lazy-loaded for
   code splitting; the shell (rail, top bar) stays mounted across navigations.
   ========================================================================== */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import PageFallback from './components/PageFallback';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Task = lazy(() => import('./pages/Task'));
const Review = lazy(() => import('./pages/Review'));
const NewVerification = lazy(() => import('./pages/NewVerification'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/task/:id" element={<Task />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/new" element={<NewVerification />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
