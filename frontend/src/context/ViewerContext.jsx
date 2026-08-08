/* ============================================================================
   ViewerContext — the shared document viewer's open/close/step API. Any list of
   documents can open it; the page says which list next/prev walks. Ported from
   js/viewer.js — one component, two shells (drawer / full-screen), `mode` the
   only difference.
   ========================================================================== */
import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';

const ViewerContext = createContext(null);
export const useViewer = () => useContext(ViewerContext);

export function ViewerProvider({ children }) {
  const [state, setState] = useState({ id: null, mode: 'drawer', isOpen: false });
  const listRef = useRef(() => []);
  const fromRef = useRef(null);

  const open = useCallback((id, opts = {}) => {
    if (opts.list) listRef.current = opts.list;
    fromRef.current = opts.from || null;
    setState((s) => ({ ...s, id, isOpen: true, mode: s.mode }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false, id: null }));
    // return focus to the row/thumbnail the preview was opened from
    requestAnimationFrame(() => fromRef.current?.focus?.());
  }, []);

  const step = useCallback((delta) => {
    setState((s) => {
      const list = listRef.current() || [];
      const i = list.findIndex((d) => d.id === s.id);
      const next = i + delta;
      if (next < 0 || next >= list.length) return s;
      return { ...s, id: list[next].id };
    });
  }, []);

  const setMode = useCallback((mode) => setState((s) => ({ ...s, mode })), []);

  const value = useMemo(() => ({
    ...state, open, close, step, setMode, getList: () => listRef.current() || [],
  }), [state, open, close, step, setMode]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}
