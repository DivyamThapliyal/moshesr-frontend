/* ============================================================================
   ShellContext — the chrome's shared state and behaviour, ported from the
   behaviour half of js/shell.js: theme, rail collapse, language, the toast
   system, the destructive-confirm dialog, the live-region announcer, and the
   topbar "lead" slot each page fills. One provider so a change to the chrome is
   made once, never N times.
   ========================================================================== */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { LANGUAGES } from '../data';
import { RAIL_KEY, THEME_KEY } from '../utils/storage';

const ShellContext = createContext(null);
export const useShell = () => useContext(ShellContext);

const readTheme = () => {
  try { const t = localStorage.getItem(THEME_KEY); if (t) return t; } catch { /* ignore */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
const readCollapsed = () => {
  try { return sessionStorage.getItem(RAIL_KEY) === '1'; } catch { return false; }
};

let toastSeq = 0;
const TOAST_MAX = 3;
const TOAST_MIN = 3500;
const TOAST_CAP = 12000;

/* Duration scales with reading time — never a fixed timeout. */
function toastMs(text, hasAction) {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  const ms = 1200 + words * 300 + (hasAction ? 2500 : 0);
  return Math.min(Math.max(ms, TOAST_MIN), TOAST_CAP);
}

export function ShellProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);
  const [collapsed, setCollapsedState] = useState(readCollapsed);
  const [lang, setLang] = useState('en');
  const [topbar, setTopbar] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmReq, setConfirmReq] = useState(null);
  const [liveTick, setLiveTick] = useState(0);

  const liveRef = useRef();
  const announceRef = useRef(null);

  /* ---- theme: reflected onto <html data-theme> and the color-scheme meta --- */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    announceRef.current?.(next === 'dark' ? 'Dark theme' : 'Light theme');
  }, []);

  /* ---- rail collapse: a class on .app, persisted per tab ------------------- */
  useEffect(() => {
    document.querySelector('.app')?.classList.toggle('is-collapsed', collapsed);
    try { sessionStorage.setItem(RAIL_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  const setCollapsed = useCallback((on) => {
    setCollapsedState(on);
    announceRef.current?.(on ? 'Navigation collapsed' : 'Navigation expanded');
  }, []);

  /* Below 1180 the rail is not a choice — apply .is-rail on the shell. */
  useEffect(() => {
    const mq = window.matchMedia('(max-width:1180px)');
    const apply = () => document.querySelector('.app')?.classList.toggle('is-rail', mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /* ---- live-region announcer ---------------------------------------------- */
  const announce = useCallback((msg) => {
    const r = document.getElementById('liveRegion');
    if (r) r.textContent = msg;
  }, []);
  announceRef.current = announce;
  const say = announce;

  /* ---- toasts ------------------------------------------------------------- */
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, going: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 320);
  }, []);

  const toast = useCallback((message, opts = {}) => {
    const id = ++toastSeq;
    const life = opts.duration || toastMs(message, !!opts.undo);
    setToasts((list) => {
      const next = [{ id, message, ...opts, going: false }, ...list];
      const live = next.filter((t) => !t.going);
      // three at once; the oldest leaves early to make room
      live.slice(TOAST_MAX).forEach((t) => { t.going = true; });
      return next;
    });
    announce(message);
    if (life !== Infinity) {
      setTimeout(() => {
        opts.onExpire?.();
        dismissToast(id);
      }, life);
    }
    return id;
  }, [announce, dismissToast]);

  const toastHide = useCallback(() => setToasts([]), []);

  /* ---- confirm (native <dialog> via ConfirmDialog) ------------------------ */
  const confirm = useCallback((opts) => new Promise((resolve) => {
    setConfirmReq({ opts, resolve });
  }), []);
  const resolveConfirm = useCallback((answer) => {
    setConfirmReq((req) => {
      req?.resolve(answer);
      return null;
    });
  }, []);

  /* ---- language cycle ----------------------------------------------------- */
  const cycleLang = useCallback(() => {
    setLang((cur) => {
      const i = LANGUAGES.findIndex((l) => l.id === cur);
      const next = LANGUAGES[(i + 1) % LANGUAGES.length];
      say(next.label);
      return next.id;
    });
  }, [say]);

  const langLabel = useMemo(
    () => LANGUAGES.find((l) => l.id === lang)?.label || 'English',
    [lang],
  );

  /* ---- global keyboard shortcuts (/, Ctrl/Cmd-K focus search; [ toggles) --- */
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      const field = document.querySelector('[data-pagesearch]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); field?.focus(); field?.select(); return;
      }
      if (e.key === '/' && !typing) { e.preventDefault(); field?.focus(); return; }
      if (e.key === '[' && !typing) { e.preventDefault(); setCollapsedState((c) => !c); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const bumpLive = useCallback(() => setLiveTick((n) => n + 1), []);

  const value = useMemo(() => ({
    theme, setTheme,
    collapsed, setCollapsed,
    lang, langLabel, cycleLang,
    topbar, setTopbar,
    toast, toastHide, dismissToast, toasts,
    confirm, confirmReq, resolveConfirm,
    announce, say,
    liveTick, bumpLive,
  }), [theme, setTheme, collapsed, setCollapsed, lang, langLabel, cycleLang,
    topbar, toast, toastHide, dismissToast, toasts, confirm, confirmReq,
    resolveConfirm, announce, say, liveTick, bumpLive]);

  liveRef.current = value;

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
