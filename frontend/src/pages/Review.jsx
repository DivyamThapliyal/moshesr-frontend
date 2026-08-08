/* ============================================================================
   Certificate Review — where "Review these N" and every found-list "Open" land.
   Three independent panes (queue · certificate · findings), finding markers
   drawn in the certificate's own 595×842 coordinate space so a box lands on the
   seal not near it, and the decision that closes a certificate out. Decisions
   live in the shared store (utils/storage) so the task page reads the same
   record. Ported from review.html + js/review.js.
   ========================================================================== */
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  TASKS, TASK_DETAIL, DOCUMENTS, GREETING, RUN_STAGES, RUN_PROBLEMS, SEVERITY,
  REVIEW, SIGNOFF, BRAND,
} from '../data';
import {
  isSettled, currentDecision, addDecision, popDecision,
} from '../utils/storage';
import { certPage, certFacts, seeded } from '../utils/certs';
import useTopbar from '../hooks/useTopbar';
import { useShell } from '../context/ShellContext';
import { Crumbs } from '../components/Topbar';
import Icon from '../components/Icon';
import AnchoredPopover from '../components/AnchoredPopover';

const STAGE_LABEL = Object.fromEntries(RUN_STAGES.map((s) => [s.id, s.label]));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const doc = (id) => DOCUMENTS.find((d) => d.id === id);
const problem = (id) => RUN_PROBLEMS.find((p) => p.doc === id);
const rank = (p) => SEVERITY[p.severity].rank;
const verdictMeta = (v) => SEVERITY[v] || { label: 'Genuine', pill: 'done', note: 'Rechecked clear.' };
const shortDate = () => { const p = String(GREETING.date).split(' '); return p.length >= 3 ? `${p[1]} ${p[2].slice(0, 3)}` : GREETING.date; };

function synthesize(p) {
  const w = p.why.toLowerCase();
  const has = (...words) => words.some((x) => w.includes(x));
  let region = 'fullpage';
  if (has('seal')) region = 'seal';
  else if (has('signature', 'specimen')) region = 'signature';
  else if (has('serial')) region = 'serial';
  else if (has('institution', 'record')) region = 'institution';
  else if (has('name') && has('typeface', 'font')) region = 'name';
  else if (has('date', 'year')) region = 'date';
  else if (has('grade', 'compression')) region = 'grade';
  else if (has('font', 'typeface')) region = 'award';
  else if (has('table', 'layout') && doc(p.doc).type === 'transcript') region = 'table';
  let stage = p.severity === 'minor' ? 'read' : 'tamper';
  if (has('photoshop', 'edited', 'compression', 'layout')) stage = 'tamper';
  else if (has('cross-check', 'record', 'specimen', 'range', 'seal copied')) stage = 'cross';
  else if (has('typeface', 'font')) stage = 'read';
  else if (has('scan', 'resolution')) stage = 'scan';
  const page = /page 2/.test(w) ? 2 : 1;
  return [{ stage, region, page, evidence: STAGE_LABEL[stage], summary: p.why, detail: null }];
}
function findingsFor(p) {
  return (p.findings || synthesize(p)).map((f) => ({ page: f.page || 1, evidence: f.evidence || STAGE_LABEL[f.stage], ...f }));
}
function confidenceFor(p) {
  if (p.confidence != null) return p.confidence;
  const band = { forged: [82, 97], suspicious: [55, 78], minor: [28, 52] }[p.severity];
  const rnd = seeded(p.doc + 'confidence');
  return band[0] + Math.floor(rnd() * (band[1] - band[0] + 1));
}
const confidenceWord = (n) => (n >= 80 ? 'high' : n >= 50 ? 'medium' : 'low');

function regionRect(d, key, page, totalPages) {
  const W = 595;
  if (key === 'fullpage') return { x: 34, y: 34, w: W - 68, h: 842 - 68 };
  if (d.type === 'transcript') {
    if (page === 1 && key === 'institution') return { x: 60, y: 46, w: 300, h: 32 };
    if (page === 1 && key === 'name') return { x: 58, y: 160, w: 264, h: 32 };
    if (key === 'table') return { x: 58, y: 288, w: 479, h: 378 };
    if (key === 'grade') return { x: 502, y: 288, w: 56, h: 378 };
    if (key === 'seal' && page === totalPages) return { x: 432, y: 702, w: 92, h: 92 };
    return null;
  }
  if (d.type === 'unknown') return null;
  if (page === 1) {
    if (key === 'institution') return { x: W / 2 - 230, y: 150, w: 460, h: 36 };
    if (key === 'name') return { x: W / 2 - 210, y: 284, w: 420, h: 36 };
    if (key === 'award') return { x: W / 2 - 210, y: 392, w: 420, h: 60 };
    if (key === 'grade') return { x: W / 2 - 210, y: 452, w: 420, h: 30 };
    if (key === 'date') return { x: W / 2 - 190, y: 500, w: 380, h: 52 };
    if (key === 'seal') return { x: W / 2 - 46, y: 576, w: 92, h: 92 };
    if (key === 'signature') return { x: 80, y: 690, w: 176, h: 40 };
    if (key === 'serial') return { x: W / 2 - 160, y: 762, w: 320, h: 28 };
  } else {
    if (key === 'institution') return { x: 112, y: 46, w: 300, h: 32 };
    if (key === 'seal') return { x: 74, y: 644, w: 92, h: 92 };
    if (key === 'signature') return { x: 80, y: 678, w: 176, h: 40 };
  }
  return null;
}

export default function Review() {
  const { id: routeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { confirm, toast, toastHide, say } = useShell();
  const [, force] = useReducer((x) => x + 1, 0);

  const task = useMemo(() => {
    const t = TASKS.find((x) => x.id === routeId);
    return { id: routeId || TASK_DETAIL.id, title: (t || TASK_DETAIL).title };
  }, [routeId]);

  const QUEUE = useMemo(() => [...RUN_PROBLEMS].sort((a, b) => rank(a) - rank(b)), []);
  const firstUnresolved = () => { const p = QUEUE.find((x) => !isSettled(task.id, x.doc)); return p ? p.doc : null; };

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    const requested = params.get('doc');
    stateRef.current = {
      current: (requested && QUEUE.some((p) => p.doc === requested)) ? requested : firstUnresolved(),
      page: 1, zoom: 1, marksOn: true, queueOpen: true, tab: 'case', override: null, noteDraft: '',
    };
  }
  const s = stateRef.current;
  const noteRef = useRef(null);
  const lastDecided = useRef(null);
  const changeBtnRef = useRef(null);
  const menuAnchorRef = useRef(null);
  const menuAnchor = menuAnchorRef.current;
  const setMenuAnchor = (v) => { menuAnchorRef.current = v; force(); };

  const lead = useMemo(
    () => (
      <Crumbs trail={[
        { label: 'My tasks', href: '/' },
        { label: task.title, href: `/task/${task.id}` },
        { label: 'Reviewing' },
      ]}
      />
    ),
    [task.title, task.id],
  );
  useTopbar({ nav: 'tasks', crumbs: true, lead });

  const currentNote = () => (noteRef.current?.value || '').trim();

  const open = (docId) => { s.current = docId; s.page = 1; s.zoom = 1; s.noteDraft = ''; s.override = null; force(); };
  const advance = () => { const next = firstUnresolved(); if (next) open(next); else { s.current = null; force(); } };

  const recordDecision = (verdict, note, message) => {
    addDecision(task.id, s.current, { verdict, note, decidedAt: shortDate(), source: 'review' });
    lastDecided.current = s.current;
    toast(message, { icon: 'check', undo: undoDecision, onExpire: () => { lastDecided.current = null; } });
    advance();
  };
  function undoDecision() {
    if (!lastDecided.current) return;
    const target = lastDecided.current;
    popDecision(task.id, target);
    lastDecided.current = null;
    toastHide();
    open(target);
    say('Restored');
  }
  const confirmForged = async () => {
    const ok = await confirm({
      title: REVIEW.refuseTitle, body: REVIEW.refuseBody(SIGNOFF.name),
      confirm: REVIEW.refuseConfirm, cancel: REVIEW.refuseCancel, icon: 'alert-triangle',
    });
    if (!ok) say('Not refused');
    return ok;
  };
  const agree = async () => {
    const p = problem(s.current);
    if (p.severity === 'forged') {
      const note = currentNote();
      if (!note) { noteRef.current?.focus(); toast(REVIEW.refuseNoteRequired, { icon: 'alert-circle', tone: 'danger' }); return; }
      if (!(await confirmForged())) return;
      recordDecision(p.severity, note, `Refused: ${SEVERITY[p.severity].label}`);
      return;
    }
    recordDecision(p.severity, currentNote() || null, `Agreed: ${SEVERITY[p.severity].label}`);
  };
  const skip = () => {
    const i = QUEUE.findIndex((p) => p.doc === s.current);
    const next = QUEUE.slice(i + 1).find((p) => !isSettled(task.id, p.doc)) || QUEUE.slice(0, i).find((p) => !isSettled(task.id, p.doc));
    if (next) { say('Skipped'); open(next.doc); }
  };
  const saveChange = async () => {
    const note = currentNote();
    if (!note) { noteRef.current?.focus(); toast('A note is required to change the verdict', { icon: 'alert-circle', tone: 'danger' }); return; }
    const verdict = s.override;
    if (verdict === 'forged' && !(await confirmForged())) return;
    s.override = null;
    recordDecision(verdict, note, `Changed to ${SEVERITY[verdict].label}`);
  };

  const highlightFinding = (i) => {
    s.page = findingsFor(problem(s.current))[i].page; force();
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-finding="${i}"]`);
      card?.scrollIntoView({ block: 'nearest' });
      card?.classList.add('is-pulse');
      setTimeout(() => card?.classList.remove('is-pulse'), 900);
    });
  };
  const highlightMark = (i) => {
    const mk = document.querySelector(`[data-mark="${i}"]`);
    mk?.classList.add('is-pulse');
    setTimeout(() => mk?.classList.remove('is-pulse'), 900);
  };
  const toggleFullscreen = () => {
    const el = document.getElementById('reviewStage');
    if (document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen?.();
  };
  const downloadPage = () => {
    const svg = document.querySelector('#certFrame svg.cert');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${doc(s.current).name.replace(/\.\w+$/, '')}-page-${s.page}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // keyboard shortcuts (A agree · C change · S skip · M marks · arrows step)
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if (typing || !s.current) return;
      const key = e.key.toLowerCase();
      if (key === 'a') { if (!s.override) agree(); }
      else if (key === 'c') { if (!s.override && changeBtnRef.current) setMenuAnchor(changeBtnRef.current); }
      else if (key === 's') { if (!s.override) skip(); }
      else if (key === 'm') { s.marksOn = !s.marksOn; force(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = QUEUE.findIndex((p) => p.doc === s.current);
        const j = i + (e.key === 'ArrowDown' ? 1 : -1);
        if (QUEUE[j]) open(QUEUE[j].doc);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }); // re-bind each render so closures see current state

  useEffect(() => {
    const d = s.current ? doc(s.current) : null;
    document.title = `${d ? d.name : 'Reviewing'} · ${BRAND.name}`;
  });

  const decisionStats = () => {
    let decided = 0; let agreed = 0; let changed = 0; let signoff = 0;
    QUEUE.forEach((p) => {
      if (!isSettled(task.id, p.doc)) return;
      const cur = currentDecision(task.id, p.doc);
      decided++;
      if (cur.verdict === p.severity) agreed++; else changed++;
      if (cur.verdict === 'forged') signoff++;
    });
    return { decided, agreed, changed, signoff };
  };

  /* ---- markers SVG (built as a string, injected over the certificate) ----- */
  const marksSvg = (d, findings, totalPages) => {
    const boxes = findings.map((f, i) => {
      if (f.page !== s.page) return '';
      const r = regionRect(d, f.region, s.page, totalPages);
      if (!r) return '';
      const sev = SEVERITY[problem(s.current).severity];
      return `
        <g class="mark mark--${sev.pill}" data-mark="${i}" tabindex="0" role="button"
           aria-label="Finding ${i + 1}: ${esc(f.summary)}">
          <rect class="mark__box" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="6"/>
          <circle class="mark__badge" cx="${r.x - 2}" cy="${r.y - 2}" r="13"/>
          <text class="mark__n" x="${r.x - 2}" y="${r.y - 2}">${i + 1}</text>
        </g>`;
    }).join('');
    return `<svg class="certmarks${s.marksOn ? '' : ' is-hidden'}" viewBox="0 0 595 842" aria-hidden="true">${boxes}</svg>`;
  };

  const done = !s.current;
  const reviewClass = `review${s.queueOpen ? '' : ' is-queue-collapsed'}${done ? ' is-done' : ''}`;

  // done-state head
  const stats = done ? decisionStats() : null;
  const doneTitle = done ? (stats.decided ? REVIEW.doneTitle(stats) : REVIEW.doneEmpty) : '';

  const p = s.current ? problem(s.current) : null;
  const d = s.current ? doc(s.current) : null;
  const sev = p ? SEVERITY[p.severity] : null;
  const findings = p ? findingsFor(p) : [];
  const totalPages = d ? d.pages : 1;

  return (
    <>
      <section className="pagehead pagehead--review" aria-labelledby="reviewTitle">
        <div className="pagehead__row">
          <h2 className="pagehead__title" id="reviewTitle" title={d?.name}>{done ? doneTitle : d.name}</h2>
          {done ? null : (
            <span className="pagehead__state" id="reviewNav">
              <span className={`pill pill--${sev.pill}`}>{sev.label}</span>
              <span className="revconf">
                <span className="revconf__n">{confidenceFor(p)}</span>
                <span className="revconf__w">{`${confidenceWord(confidenceFor(p))} confidence`}</span>
              </span>
              <span className="seg">
                {(() => {
                  const i = QUEUE.findIndex((x) => x.doc === s.current);
                  return (
                    <>
                      <button className="seg__btn" type="button" aria-label="Previous certificate" disabled={i <= 0} onClick={() => QUEUE[i - 1] && open(QUEUE[i - 1].doc)}><Icon name="chevron-left" size={18} /></button>
                      <button className="seg__btn" type="button" aria-label="Next certificate" disabled={i >= QUEUE.length - 1} onClick={() => QUEUE[i + 1] && open(QUEUE[i + 1].doc)}><Icon name="chevron-right" size={18} /></button>
                    </>
                  );
                })()}
              </span>
            </span>
          )}
        </div>
        <p className="pagehead__meta" id="reviewMeta">
          {done || !d ? '' : `${certFacts(d).name} · ${certFacts(d).award} · ${d.institution || 'institution not shown'} · ${certFacts(d).year}`}
        </p>
      </section>

      <div className={reviewClass} id="review">
        {/* queue */}
        <aside className="review__queue" id="reviewQueue" aria-label="Certificates to review">
          <div className="revq__head">
            <span className="revq__title">{REVIEW.queueTitle}</span>
            <button className="linkbtn" type="button" onClick={() => { s.queueOpen = !s.queueOpen; force(); }}>
              {s.queueOpen ? REVIEW.queueHide : REVIEW.queueShow}
            </button>
          </div>
          {s.queueOpen ? (
            <>
              <p className="revq__status">
                {`${QUEUE.findIndex((x) => x.doc === s.current) + 1} of ${QUEUE.length} · `}
                {QUEUE.filter((x) => isSettled(task.id, x.doc)).length ? `${QUEUE.filter((x) => isSettled(task.id, x.doc)).length} decided` : 'none decided yet'}
              </p>
              <div className="revq__list" role="listbox" aria-label={REVIEW.queueTitle}>
                {QUEUE.map((qp) => {
                  const qd = doc(qp.doc); const qsev = SEVERITY[qp.severity];
                  const settled = isSettled(task.id, qp.doc);
                  const cur = currentDecision(task.id, qp.doc);
                  const on = qp.doc === s.current;
                  const n = findingsFor(qp).length;
                  return (
                    <button key={qp.doc} className={`revq__row${on ? ' is-active' : ''}${settled ? ' is-resolved' : ''}`} type="button" role="option" aria-selected={on} onClick={() => open(qp.doc)}>
                      <span className="revq__name" title={qd.name}>{qd.name}</span>
                      <span className="revq__sub">
                        {settled && cur ? (
                          <><Icon name="check" size={13} /><span>{`Decided: ${verdictMeta(cur.verdict).label}`}</span></>
                        ) : (
                          <>
                            <span className={`pill pill--${qsev.pill}`}>{qsev.label}</span>
                            <span className="revq__n">{`${n} finding${n === 1 ? '' : 's'}`}</span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="revq__note">{REVIEW.queueNote}</p>
            </>
          ) : null}
        </aside>

        {/* stage */}
        <section className="review__stage" id="reviewStage" aria-label="Certificate">
          {done ? (
            <div className="revdone">
              <p className="revdone__title">{doneTitle}</p>
              <div className="revdone__actions">
                <button className="btn btn--primary" type="button" onClick={() => navigate(`/task/${task.id}`)}>{REVIEW.backToTask}</button>
                <button className="btn btn--secondary" type="button" onClick={() => navigate('/')}>{REVIEW.myTasks}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="revstage__bar">
                <div className="revstage__zoom">
                  <button className="icon-btn icon-btn--sm" type="button" aria-label="Zoom out" onClick={() => { s.zoom = Math.min(2, Math.max(0.6, s.zoom - 0.15)); force(); }}><Icon name="minus" size={14} /></button>
                  <button className="linkbtn revstage__pct" type="button" onClick={() => { s.zoom = 1; force(); }}>{`${Math.round(s.zoom * 100)}%`}</button>
                  <button className="icon-btn icon-btn--sm" type="button" aria-label="Zoom in" onClick={() => { s.zoom = Math.min(2, Math.max(0.6, s.zoom + 0.15)); force(); }}><Icon name="plus" size={14} /></button>
                </div>
                {totalPages > 1 ? (
                  <div className="revstage__pages">
                    <button className="icon-btn icon-btn--sm" type="button" aria-label="Previous page" disabled={s.page <= 1} onClick={() => { s.page -= 1; force(); }}><Icon name="chevron-left" size={14} /></button>
                    <span>{`Page ${s.page} of ${totalPages}`}</span>
                    <button className="icon-btn icon-btn--sm" type="button" aria-label="Next page" disabled={s.page >= totalPages} onClick={() => { s.page += 1; force(); }}><Icon name="chevron-right" size={14} /></button>
                  </div>
                ) : <span className="revstage__pages">Page 1 of 1</span>}
                <div className="revstage__tools">
                  <button className={`icon-btn icon-btn--sm${s.marksOn ? ' is-active' : ''}`} type="button" aria-pressed={s.marksOn} aria-label="Toggle finding boxes" onClick={() => { s.marksOn = !s.marksOn; force(); }}><Icon name="eye" size={16} /></button>
                  <button className="icon-btn icon-btn--sm" type="button" aria-label="Full screen" onClick={toggleFullscreen}><Icon name="maximize" size={16} /></button>
                </div>
              </div>

              <div
                className="certframe"
                id="certFrame"
                onClick={(e) => { const g = e.target.closest('[data-mark]'); if (g) highlightFinding(+g.dataset.mark); }}
              >
                <div
                  className="certframe__page"
                  style={{ width: `calc(420px * ${s.zoom})` }}
                  dangerouslySetInnerHTML={{ __html: certPage(d, s.page) + marksSvg(d, findings, totalPages) }}
                />
              </div>

              <p className="revstage__hint">Boxes come from the highlight service. Press M to hide them.</p>
              <div className="revstage__foot">
                <span>{`PDF · ${d.institution ? d.country || 'country not shown' : 'source not shown'} · Page ${s.page} of ${totalPages}`}</span>
                <button className="linkbtn" type="button" onClick={downloadPage}>Download this page</button>
              </div>
            </>
          )}
        </section>

        {/* panel */}
        <aside className="review__panel" id="reviewPanel" aria-label="Findings">
          {done ? null : renderPanel()}
        </aside>
      </div>

      {menuAnchor ? (
        <AnchoredPopover anchor={menuAnchor} className="menu" align="end" onClose={() => setMenuAnchor(null)}>
          {Object.keys(SEVERITY).filter((kk) => kk !== p.severity).map((kk) => (
            <button key={kk} className="menu__item" role="menuitem" type="button" onClick={() => { s.override = kk; s.noteDraft = currentNote(); setMenuAnchor(null); requestAnimationFrame(() => noteRef.current?.focus()); }}>
              <Icon name="circle-dot" size={16} /><span>{SEVERITY[kk].label}</span>
            </button>
          ))}
        </AnchoredPopover>
      ) : null}
    </>
  );

  function renderPanel() {
    const flaggedN = new Set(findings.map((f) => f.stage)).size;
    const settled = isSettled(task.id, s.current);
    const res = settled ? currentDecision(task.id, s.current) : null;
    const left = QUEUE.filter((x) => !isSettled(task.id, x.doc)).length;
    const flaggedStages = new Set(findings.map((f) => f.stage));
    return (
      <>
        <div className="revtabs" role="tablist">
          <button className={`tab${s.tab === 'case' ? ' is-active' : ''}`} role="tab" aria-selected={s.tab === 'case'} onClick={() => { s.tab = 'case'; force(); }}><span className="tab__label">{REVIEW.caseTab}</span></button>
          <button className={`tab${s.tab === 'history' ? ' is-active' : ''}`} role="tab" aria-selected={s.tab === 'history'} onClick={() => { s.tab = 'history'; force(); }}><span className="tab__label">{REVIEW.historyTab}</span></button>
        </div>

        <div className="revpanel__scroll">
          {s.tab === 'case' ? (
            <>
              <p className="panel__title">{REVIEW.whyTitle}
                <span className="revpanel__subcount">{`${flaggedN} of ${RUN_STAGES.length} checks flagged something`}</span>
              </p>
              <ol className="revfindings">
                {findings.map((f, i) => (
                  <li className="revfinding" data-finding={i} tabIndex={0} key={i} onClick={() => highlightMark(i)}>
                    <span className="revfinding__n">{i + 1}</span>
                    <div className="revfinding__body">
                      <div className="revfinding__row">
                        <span className="revfinding__summary">{f.summary}</span>
                        <span className="revfinding__ev">{f.evidence}</span>
                      </div>
                      {f.detail ? <p className="revfinding__detail">{f.detail}</p> : null}
                      {f.page !== s.page ? (
                        <button className="linkbtn revfinding__jump" type="button" onClick={(e) => { e.stopPropagation(); s.page = f.page; force(); }}>{`On page ${f.page} · go there`}</button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <p className="panel__title">{REVIEW.checkTitle}</p>
              <ol className="revchecks">
                {RUN_STAGES.map((st) => (
                  <li className={`revcheck${flaggedStages.has(st.id) ? ' is-flagged' : ''}`} key={st.id}>
                    <span className="revcheck__dot" aria-hidden="true" />
                    <span className="revcheck__label">{st.label}</span>
                    <span className="revcheck__result">{flaggedStages.has(st.id) ? 'Flagged something' : 'Nothing found'}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="revdecide">
          {res ? (
            <p className="revdecide__done"><Icon name="circle-check" size={16} />
              {' Decided: '}<b>{verdictMeta(res.verdict).label}</b>{res.note ? ` · "${res.note}"` : ''}
            </p>
          ) : (
            <>
              <label className="visually-hidden" htmlFor="revNote">Your note</label>
              <textarea className="revnote" id="revNote" rows={2} ref={noteRef} placeholder={REVIEW.notePlaceholder} defaultValue={s.noteDraft || ''} />
              {s.override ? (
                <>
                  <p className="revdecide__pending">{'Changing to '}<b>{SEVERITY[s.override].label}</b>{'. A note is required.'}</p>
                  <div className="revdecide__actions">
                    <button className="btn btn--secondary" type="button" onClick={() => { s.override = null; force(); }}>{REVIEW.cancelChange}</button>
                    <button className="btn btn--primary" type="button" onClick={saveChange}>{REVIEW.saveChange}</button>
                  </div>
                </>
              ) : (
                <div className="revdecide__actions">
                  <button className="btn btn--secondary" type="button" ref={changeBtnRef} onClick={(e) => setMenuAnchor(e.currentTarget)}>{REVIEW.changeVerdict}</button>
                  <button className={`btn btn--primary${p.severity === 'forged' ? ' btn--danger' : ''}`} type="button" onClick={agree}>{REVIEW.agree}</button>
                </div>
              )}
            </>
          )}
          <p className="revdecide__keys">A agree · C change · S skip · M marks
            <span className="revdecide__left">{`${left} left`}</span>
          </p>
        </div>
      </>
    );
  }
}
