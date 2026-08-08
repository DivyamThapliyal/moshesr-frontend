/* ============================================================================
   Viewer — the document viewer's markup + behaviour. Ported from js/viewer.js:
   docked drawer or full-screen, paging with buttons/arrows/swipe, Esc to close,
   Tab trapped only while modal, and it renders one certificate page per page
   from utils/certs. Marks the active table row via `is-previewing`.
   ========================================================================== */
import { useEffect, useMemo, useRef } from 'react';
import { DOC_TYPE_META, DOCUMENTS } from '../data';
import { certPage } from '../utils/certs';
import { useViewer } from '../context/ViewerContext';
import { useShell } from '../context/ShellContext';
import Icon from './Icon';

export default function Viewer() {
  const viewer = useViewer();
  const { say } = useShell();
  const bodyRef = useRef(null);
  const closeRef = useRef(null);
  const drag = useRef({ sx: 0, sy: 0, on: false });

  const list = viewer.getList();
  const i = list.findIndex((d) => d.id === viewer.id);
  const doc = list[i] || DOCUMENTS.find((d) => d.id === viewer.id) || null;
  const full = viewer.mode === 'full';

  // toggle .app has-drawer + focus the close button on first open
  useEffect(() => {
    document.querySelector('.app')?.classList.toggle('has-drawer', viewer.isOpen && !full);
    if (viewer.isOpen) {
      const t = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
    return undefined;
  }, [viewer.isOpen, full]);

  // mark the active row in whatever table is on the page
  useEffect(() => {
    document.querySelectorAll('.dtable__row').forEach((r) => {
      r.classList.toggle('is-previewing', viewer.isOpen && !!viewer.id && r.dataset.row === viewer.id);
    });
  });

  // Esc closes, arrows step, Tab trapped only while modal
  useEffect(() => {
    if (!viewer.isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); viewer.close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); viewer.step(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); viewer.step(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewer.isOpen, viewer, full]);

  const pages = useMemo(() => {
    if (!doc) return '';
    return Array.from({ length: doc.pages }, (_, n) => `<div class="docpage">${certPage(doc, n + 1)}</div>`).join('');
  }, [doc]);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [viewer.id]);

  if (!viewer.isOpen || !doc) {
    return <div className="scrim" id="scrim" hidden />;
  }

  const meta = DOC_TYPE_META[doc.type];

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { sx: e.clientX, sy: e.clientY, on: true };
  };
  const onPointerUp = (e) => {
    if (!drag.current.on) return;
    drag.current.on = false;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    viewer.step(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <div
        className={`scrim${full ? ' is-open' : ''}`}
        id="scrim"
        hidden={!full}
        onClick={viewer.close}
      />
      <section
        className={`viewer is-open ${full ? 'viewer--full' : 'viewer--drawer'}`}
        id="viewer"
        role="dialog"
        aria-modal={full || undefined}
        aria-labelledby="viewerTitle"
      >
        <header className="viewer__head">
          <div className="viewer__id">
            <h2 className="viewer__title" id="viewerTitle">{doc.name}</h2>
            <p className="viewer__meta">
              <span className={`pill pill--${meta.variant === 'unknown' ? 'unknown' : 'outline'}`}>{meta.label}</span>
              <span aria-hidden="true">·</span>
              {doc.institution || 'institution not shown on the cover page'}
              <span aria-hidden="true">·</span>
              {`${doc.pages} ${doc.pages === 1 ? 'page' : 'pages'}`}
            </p>
          </div>
          <div className="viewer__tools">
            <button
              className="icon-btn icon-btn--sm"
              type="button"
              aria-label={full ? 'Collapse to the side' : 'Expand to full screen'}
              onClick={() => { viewer.setMode(full ? 'drawer' : 'full'); say(full ? 'Side drawer' : 'Full screen'); }}
            >
              <Icon name={full ? 'minimize' : 'maximize'} size={20} />
            </button>
            <button className="icon-btn icon-btn--sm" type="button" aria-label="Close preview" ref={closeRef} onClick={viewer.close}>
              <Icon name="x" size={20} />
            </button>
          </div>
        </header>
        <div
          className="viewer__body"
          id="viewerBody"
          ref={bodyRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { drag.current.on = false; }}
          dangerouslySetInnerHTML={{ __html: pages }}
        />
        <footer className="viewer__foot">
          <button className="icon-btn icon-btn--sm" type="button" aria-label="Previous certificate" disabled={i <= 0} onClick={() => viewer.step(-1)}>
            <Icon name="chevron-left" size={20} />
          </button>
          <span className="viewer__pos" aria-live="polite">{`${i + 1} of ${list.length} · ${doc.name}`}</span>
          <button className="icon-btn icon-btn--sm" type="button" aria-label="Next certificate" disabled={i >= list.length - 1} onClick={() => viewer.step(1)}>
            <Icon name="chevron-right" size={20} />
          </button>
        </footer>
      </section>
    </>
  );
}
