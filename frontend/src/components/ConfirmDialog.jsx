/* ============================================================================
   ConfirmDialog — one destructive-confirm for the whole product, a native
   <dialog> opened with showModal() so the platform owns focus-trap, Esc,
   inertness and the top layer. The question names what is at stake; Cancel
   takes focus, never the destructive button. Ported from shell.js's confirm().
   ========================================================================== */
import { useEffect, useRef } from 'react';
import { useShell } from '../context/ShellContext';
import Icon from './Icon';

export default function ConfirmDialog() {
  const { confirmReq, resolveConfirm } = useShell();
  const ref = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (confirmReq) {
      if (!el.open) el.showModal();
      cancelRef.current?.focus();
    }
    return undefined;
  }, [confirmReq]);

  if (!confirmReq) return null;
  const o = confirmReq.opts || {};

  const onCancel = (e) => { e.preventDefault(); resolveConfirm(false); };

  return (
    <dialog
      className="dialog"
      ref={ref}
      onCancel={onCancel}
      onClick={(e) => { if (e.target === ref.current) resolveConfirm(false); }}
    >
      <div className="dialog__box" role="document">
        <div className="dialog__head">
          <span className="dialog__icon dialog__icon--danger"><Icon name={o.icon || 'trash-2'} size={20} /></span>
          <div className="dialog__text">
            <h2 className="dialog__title">{o.title}</h2>
            <p className="dialog__body">{o.body}</p>
          </div>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--ghost" type="button" ref={cancelRef} onClick={() => resolveConfirm(false)}>
            {o.cancel || 'Cancel'}
          </button>
          <button className="btn btn--danger" type="button" onClick={() => resolveConfirm(true)}>
            {o.confirm || 'Delete'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
