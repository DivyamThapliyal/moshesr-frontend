/* Each page declares what the chrome should show — which nav entry is current
   and what the top bar's lead is (a title or a breadcrumb). Set with
   useLayoutEffect so the chrome is correct on first paint, never a frame late. */
import { useLayoutEffect } from 'react';
import { useShell } from '../context/ShellContext';

export default function useTopbar({ nav, lead, crumbs = false }) {
  const { setTopbar } = useShell();
  useLayoutEffect(() => {
    setTopbar({ nav, lead, crumbs });
  }, [setTopbar, nav, lead, crumbs]);
}
