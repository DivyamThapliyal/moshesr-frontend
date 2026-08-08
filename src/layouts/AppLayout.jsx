/* ============================================================================
   AppLayout — the shell every page shares. Reproduces the exact DOM the
   original built: the ambient background, the `.app` grid with the sidebar, the
   `.stage` with its top bar and the scroll-owning `.stage__body`, plus the
   overlays that float above every page (toasts, confirm, live panel) and the
   polite live region. A page owns only what it renders into the Outlet.
   ========================================================================== */
import { Outlet } from 'react-router-dom';
import { useShell } from '../context/ShellContext';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import ToastHost from '../components/ToastHost';
import ConfirmDialog from '../components/ConfirmDialog';
import LivePanel from '../components/LivePanel';
import Viewer from '../components/Viewer';

export default function AppLayout() {
  const { topbar } = useShell();
  const t = topbar || {};

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="app-bg" aria-hidden="true" />

      <div className="app">
        <Sidebar current={t.nav} />
        <main className="stage" id="main">
          <Topbar lead={t.lead} crumbs={t.crumbs} actions={t.actions} />
          <div className="stage__body">
            <Outlet />
          </div>
        </main>
        <Viewer />
      </div>

      <div id="liveRegion" className="visually-hidden" role="status" aria-live="polite" />
      <ToastHost />
      <ConfirmDialog />
      <LivePanel />
    </>
  );
}
