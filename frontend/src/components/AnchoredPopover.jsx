/* ============================================================================
   AnchoredPopover — a portal popover positioned against a trigger button,
   flipped above when the viewport is short, following the anchor on
   scroll/resize and dismissing on outside-click / Esc. Shared by the task
   page's Sort menu, Notify panel and row menu (the `.popover` / `.menu`
   surfaces). Ported from js/task.js's openPop/placePop.
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function AnchoredPopover({
  anchor, className = '', align = 'end', onClose, children,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, above: false });

  const place = useCallback(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const h = el.offsetHeight;
    const below = window.innerHeight - r.bottom > h + 12;
    setPos({
      top: below ? r.bottom + 8 : r.top - h - 8,
      left: align === 'end'
        ? Math.max(12, r.right - el.offsetWidth)
        : Math.min(r.left, window.innerWidth - el.offsetWidth - 12),
      above: !below,
    });
    if (r.bottom < 0 || r.top > window.innerHeight) onClose();
  }, [anchor, align, onClose]);

  useLayoutEffect(() => { place(); }, [place]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(true); } };
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || anchor?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place, true);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', place, true);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [place, onClose, anchor]);

  return createPortal(
    <div
      className={`${className}${pos.above ? ' is-above' : ''}`}
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body,
  );
}
