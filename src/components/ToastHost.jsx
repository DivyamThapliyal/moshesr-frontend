/* ============================================================================
   ToastHost — the product's acknowledgement surface. Top-centre, promoted into
   the browser top layer via the popover API so a toast can sit above a modal
   <dialog> (the same guarantee the original relied on). Newest at the top.
   ========================================================================== */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useShell } from '../context/ShellContext';
import Icon from './Icon';

export default function ToastHost() {
  const { toasts, dismissToast } = useShell();
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    try {
      if (toasts.length && host.showPopover && !host.matches(':popover-open')) host.showPopover();
      if (!toasts.length && host.hidePopover && host.matches(':popover-open')) host.hidePopover();
    } catch { /* popover unsupported — falls back to fixed positioning */ }
  }, [toasts.length]);

  return createPortal(
    <div id="toasts" className="toasts" popover="manual" ref={hostRef}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast${t.tone ? ` toast--${t.tone}` : ''} is-in${t.going ? ' is-out' : ''}`}
          role={t.tone === 'danger' ? 'alert' : 'status'}
          onMouseEnter={() => {}}
        >
          {t.icon ? <span className="toast__icon"><Icon name={t.icon} size={16} /></span> : null}
          <span className="toast__text">{t.message}</span>
          {t.undo ? (
            <button
              className="toast__undo"
              type="button"
              onClick={() => { t.undo(); dismissToast(t.id); }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ))}
    </div>,
    document.body,
  );
}
