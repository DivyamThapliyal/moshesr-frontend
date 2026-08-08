/* ============================================================================
   CardMenu — the card's ⋯ menu. Lives on <body>, positioned fixed (right-
   aligned under its button, flipped above when the viewport is short) so the
   last row's menu never opens into a clipped scroll edge. Follows its anchor on
   scroll/resize and closes only once the card leaves the viewport. Ported from
   js/app.js's card-menu block.
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CARD_MENU } from '../../data';
import Icon from '../Icon';

export default function CardMenu({ anchor, onClose, onSelect }) {
  const elRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  const place = useCallback(() => {
    const el = elRef.current;
    if (!el || !anchor) return null;
    const r = anchor.getBoundingClientRect();
    const h = el.offsetHeight;
    const below = window.innerHeight - r.bottom > h + 12;
    setPos({
      top: below ? r.bottom + 6 : r.top - h - 6,
      left: Math.max(12, r.right - el.offsetWidth),
    });
    return r;
  }, [anchor]);

  useLayoutEffect(() => {
    place();
    // focus the first item once positioned
    elRef.current?.querySelector('.menu__item')?.focus();
  }, [place]);

  useEffect(() => {
    const reposition = () => {
      const r = place();
      if (r && (r.bottom < 0 || r.top > window.innerHeight)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) return;
      const items = [...elRef.current.querySelectorAll('.menu__item')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'Tab' && i < 0) return;
      e.preventDefault();
      const step = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1;
      items[(Math.max(i, 0) + step + items.length) % items.length].focus();
    };
    const onDown = (e) => {
      if (e.target.closest('.menu') || e.target.closest('[data-more]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', reposition, true);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', reposition, true);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [place, onClose]);

  return createPortal(
    <div className="menu" role="menu" ref={elRef} style={{ position: 'fixed', top: pos.top, left: pos.left }}>
      {CARD_MENU.map((m) => (
        <button
          key={m.id}
          className={`menu__item${m.tone ? ` menu__item--${m.tone}` : ''}`}
          role="menuitem"
          type="button"
          onClick={() => onSelect(m)}
        >
          <Icon name={m.icon} size={18} />
          <span>{m.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
