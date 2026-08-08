/* ============================================================================
   Task detail — /task/:id is the ONLY route for a task. Which of the five
   bodies renders (new-empty · new-list · checking · pending · done) is chosen
   entirely by state, never by which page loaded. Ported from task.html +
   js/task.js (~1,950 lines): the certificate table with filters/sort/selection/
   load-more/run-bar, the checking monitor, the found list, the not-verified
   list, real drag/zip/folder upload, check-again, remove/split/undo, and the
   shared document viewer. Progress survives navigation via the shell's
   wall-clock live-run records.

   The original was an imperative controller over one mutable `state` object; to
   preserve its behaviour exactly this uses the same shape — a state ref plus a
   force-render — rather than fragmenting it into competing pieces of React
   state that could disagree.
   ========================================================================== */
import {
  useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TASK_DETAIL, TASKS, DOCUMENTS, DOC_COLUMNS, DOC_TYPES, DOC_TYPE_META,
  STATUS_META, SELECTION_ACTIONS, CHECKAGAIN_ACTION, TASK_STATE,
  RUN, RUN_STAGES, RUN_PROBLEMS, RUN_SET_ASIDE, SEVERITY, SIGNOFF,
  GREETING, LIVE_RUN, NEW_TASK, BRAND,
} from '../data';
import {
  getTaskState, setTaskState, getLiveRuns, liveProgress, startLiveRun, stopLiveRun,
  getDecisions, addDecision, currentDecision, isSettled,
  loadStoredDocs, saveStoredDocs, saveCreatedCard, takeJustCreated,
  getCreatedTasks, VERIFIED_STORE, RUN_TARGET_STORE, ADDED_AFTER_STORE,
  loadLocalDocument, saveLocalDocument, loadForgeryAnalysis, saveForgeryAnalysis,
} from '../utils/storage';
import { analyzeLocalDocument } from '../services';
import { readZipEntries } from '../utils/zipread';
import useTopbar from '../hooks/useTopbar';
import { useShell } from '../context/ShellContext';
import { useViewer } from '../context/ViewerContext';
import { Crumbs } from '../components/Topbar';
import Icon from '../components/Icon';
import AnchoredPopover from '../components/AnchoredPopover';

const SORT_OPTIONS = [
  { id: 'added', label: 'Recently added' },
  { id: 'name-asc', label: 'Name (A–Z)' },
  { id: 'name-desc', label: 'Name (Z–A)' },
  { id: 'type', label: 'Type' },
];

function Check({ checked, indeterminate, onChange, label, hint, aria, id }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className="check">
      <input
        ref={ref}
        className="check__input"
        type="checkbox"
        id={id}
        checked={!!checked}
        onChange={onChange}
        aria-label={label ? undefined : aria}
      />
      <span className="check__box"><Icon name="check" size={14} /></span>
      {label ? (
        <span className="check__label">{label}{hint ? <span className="check__hint">{hint}</span> : null}</span>
      ) : null}
    </label>
  );
}

function TypePill({ type }) {
  const m = DOC_TYPE_META[type];
  if (!m) return null;
  return <span className={`pill pill--${m.variant === 'unknown' ? 'unknown' : 'outline'}`}>{m.label}</span>;
}

export default function TaskPage() {
  const { id } = useParams();
  return loadLocalDocument(id) ? <LocalDocumentTask taskId={id} /> : <FixtureTask />;
}

function FixtureTask() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const viewer = useViewer();
  const {
    confirm, toast, toastHide, say, announce, liveTick, bumpLive,
  } = useShell();
  const [, force] = useReducer((x) => x + 1, 0);

  /* ---- identify the task from the route (fixtures → created → fresh) ------- */
  const task = useMemo(() => {
    const t = TASKS.find((x) => x.id === routeId);
    if (t) {
      return {
        ...TASK_DETAIL, id: t.id, title: t.title, status: t.status, freshUpload: false,
        meta: `${DOCUMENTS.length} certificates · ${t.meta.replace(' • ', ' ')} · nothing examined yet`,
      };
    }
    const c = getCreatedTasks().find((x) => x.id === routeId);
    if (c) return { ...TASK_DETAIL, id: c.id, title: c.title, status: c.status, count: c.count, freshUpload: true };
    return { ...TASK_DETAIL, id: routeId, title: NEW_TASK.title, status: 'new', count: 0, freshUpload: true };
  }, [routeId]);

  const bodyKindFor = (status) => {
    if (status === 'progress') return 'checking';
    if (status === 'pending' || status === 'late') return 'pending';
    if (status === 'done') return 'done';
    return 'new';
  };

  /* ---- the one mutable state object (as in the original) ------------------- */
  const stateRef = useRef(null);
  if (stateRef.current === null || stateRef.current._taskId !== task.id) {
    stateRef.current = {
      _taskId: task.id,
      docs: task.freshUpload ? loadStoredDocs(task.id) : DOCUMENTS.map((d) => ({ ...d })),
      undo: null,
      types: new Set(),
      query: '',
      sort: 'added',
      shown: TASK_DETAIL.pageSize,
      selected: new Set(),
      notify: Object.fromEntries(TASK_DETAIL.notify.map((n) => [n.id, n.on])),
      bodyKind: getTaskState(task.id) || bodyKindFor(task.status),
      tab: 'needs',
      sevFilter: 'all',
      listedCount: 0,
      asideActed: new Set(),
      uploading: false,
      uploadCount: 0,
      uploadPct: 6,
      verifiedIds: new Set(VERIFIED_STORE.load(task.id) || []),
      addedAfterIds: new Set(ADDED_AFTER_STORE.load(task.id) || []),
    };
    // seed verified for a reference task first opened this session
    const s0 = stateRef.current;
    if (!task.freshUpload && (s0.bodyKind === 'pending' || s0.bodyKind === 'done') && !VERIFIED_STORE.load(task.id)) {
      s0.verifiedIds = new Set(task.id === 't-dataflow-3aug'
        ? DOCUMENTS.filter((d) => d.type === 'degree').map((d) => d.id)
        : s0.docs.map((d) => d.id));
      VERIFIED_STORE.save(task.id, [...s0.verifiedIds]);
    }
  }
  const s = stateRef.current;

  const lead = useMemo(
    () => <Crumbs trail={[{ label: 'My tasks', href: '/' }, { label: task.title }]} />,
    [task.title],
  );
  useTopbar({ nav: 'tasks', crumbs: true, lead });

  useEffect(() => { document.title = `${task.title} · ${BRAND.name}`; }, [task.title]);

  /* ---- constants + helpers ------------------------------------------------- */
  const QUEUE = useMemo(() => [...RUN_PROBLEMS].sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank), []);
  const TOTAL = DOCUMENTS.length;
  const ASIDE = RUN_SET_ASIDE.length;
  const ANSWERABLE = TOTAL - ASIDE;
  const doc = (i) => DOCUMENTS.find((d) => d.id === i);
  const problem = (i) => RUN_PROBLEMS.find((p) => p.doc === i);
  const shortDate = () => { const p = String(GREETING.date).split(' '); return p.length >= 3 ? `${p[1]} ${p[2].slice(0, 3)}` : GREETING.date; };
  const verdictMeta = (v) => SEVERITY[v] || { label: TASK_STATE.genuineLabel, pill: 'done', note: 'Rechecked clear.' };

  const sortLabel = () => (SORT_OPTIONS.find((o) => o.id === s.sort) || SORT_OPTIONS[0]).label;
  const sortDocs = (list) => {
    if (s.sort === 'added') return list;
    const out = [...list];
    if (s.sort === 'name-asc') out.sort((a, b) => a.name.localeCompare(b.name));
    if (s.sort === 'name-desc') out.sort((a, b) => b.name.localeCompare(a.name));
    if (s.sort === 'type') out.sort((a, b) => (DOC_TYPE_META[a.type]?.label || '').localeCompare(DOC_TYPE_META[b.type]?.label || '') || a.name.localeCompare(b.name));
    return out;
  };
  const matching = () => {
    const q = s.query.trim().toLowerCase();
    return sortDocs(s.docs
      .filter((d) => s.types.size === 0 || s.types.has(d.type))
      .filter((d) => !q || `${d.name} ${d.institution || ''}`.toLowerCase().includes(q)));
  };
  const visible = () => matching().slice(0, s.shown);
  const isFiltered = () => s.types.size > 0 || s.query.trim() !== '';
  const typeLabel = () => {
    if (s.types.size === 0) return 'All types';
    if (s.types.size === 1) { const i = [...s.types][0]; return (DOC_TYPES.find((t) => t.id === i) || {}).label || 'All types'; }
    return `${s.types.size} types`;
  };
  const typeCounts = () => { const c = {}; s.docs.forEach((d) => { c[d.type] = (c[d.type] || 0) + 1; }); return c; };
  const chipOrder = () => {
    const c = typeCounts();
    return Object.keys(c).filter((i) => DOC_TYPE_META[i]).sort((a, b) => {
      const aa = DOC_TYPE_META[a].absent; const ba = DOC_TYPE_META[b].absent;
      if (aa !== ba) return aa ? 1 : -1;
      return c[b] - c[a];
    }).map((i) => ({ id: i, ...DOC_TYPE_META[i], count: c[i] }));
  };
  const pluralType = () => {
    if (s.types.size !== 1) return 'shown';
    const m = DOC_TYPE_META[[...s.types][0]];
    if (!m) return 'shown';
    const w = m.label.toLowerCase();
    return w.endsWith('s') ? w : `${w}s`;
  };

  /* certificate state (read off verified set + fixture + decisions) */
  const docState = (i) => {
    if (!s.verifiedIds.has(i)) return 'not-verified';
    if (RUN_SET_ASIDE.some((x) => x.doc === i)) return 'set-aside';
    const p = problem(i);
    if (!p) return 'clean';
    if (!isSettled(task.id, i)) return 'needs-you';
    return currentDecision(task.id, i).verdict === 'forged' ? 'signed-off' : 'decided';
  };
  const notVerifiedDocs = () => s.docs.filter((d) => docState(d.id) === 'not-verified');
  const notVerifiedCount = () => notVerifiedDocs().length;
  const notVerifiedReason = (i) => (s.addedAfterIds.has(i) ? TASK_STATE.notVerifiedAdded : TASK_STATE.notVerifiedFiltered);
  const undecided = () => QUEUE.filter((p) => s.verifiedIds.has(p.doc) && !isSettled(task.id, p.doc));
  const clearedCount = () => s.docs.filter((d) => docState(d.id) === 'clean').length;
  const verifiedAsideCount = () => RUN_SET_ASIDE.filter((x) => s.verifiedIds.has(x.doc)).length;
  const severityBreakdownText = () => {
    const c = { forged: 0, suspicious: 0, minor: 0 };
    undecided().forEach((p) => { c[p.severity]++; });
    const parts = [];
    if (c.forged) parts.push(`${c.forged} forged`);
    if (c.suspicious) parts.push(`${c.suspicious} suspicious`);
    if (c.minor) parts.push(`${c.minor} minor`);
    return parts.join(', ') || 'nothing left';
  };
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

  const mergeRunTarget = () => {
    const target = RUN_TARGET_STORE.load(task.id);
    if (!target) return;
    target.forEach((i) => s.verifiedIds.add(i));
    VERIFIED_STORE.save(task.id, [...s.verifiedIds]);
    RUN_TARGET_STORE.save(task.id, null);
  };
  const refreshLifecycle = () => {
    if (s.bodyKind !== 'pending' && s.bodyKind !== 'done') return;
    const next = (undecided().length === 0 && notVerifiedCount() === 0) ? 'done' : 'pending';
    if (next !== s.bodyKind) { s.bodyKind = next; setTaskState(task.id, next); }
  };

  /* ---- upload -------------------------------------------------------------- */
  const ext = (name) => (name.split('.').pop() || '').toLowerCase();
  const acceptedExts = Object.keys(NEW_TASK.kinds);
  const docSeq = useRef(0);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);

  const guessType = (name) => {
    const n = name.toLowerCase();
    if (n.includes('transcript')) return 'transcript';
    if (n.includes('diploma')) return 'diploma';
    if (n.includes('degree')) return 'degree';
    return 'unknown';
  };
  const docFromFile = (file) => ({
    id: `u${Date.now().toString(36)}${++docSeq.current}`,
    name: file.name, type: guessType(file.name), institution: null, country: null, pages: 1,
  });
  const persistDocs = () => {
    saveStoredDocs(task.id, s.docs);
    saveCreatedCard(task.id, {
      id: task.id, status: 'new', title: task.title,
      meta: `you uploaded it • today ${GREETING.time}`,
      stat: `${s.docs.length} to check`, count: s.docs.length,
      action: 'Start', href: `/task/${encodeURIComponent(task.id)}`,
    });
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const resolveUpload = async (list) => {
    const toAdd = []; let bad = 0;
    const take = (f) => {
      const dupe = s.docs.some((d) => d.name === f.name) || toAdd.some((d) => d.name === f.name);
      const okKind = acceptedExts.includes(ext(f.name));
      const okSize = f.size <= NEW_TASK.maxBytes;
      if (dupe || !okKind || !okSize) { bad++; return; }
      toAdd.push(docFromFile(f));
    };
    for (const file of list) {
      if (ext(file.name) !== 'zip') { take(file); continue; }
      say(NEW_TASK.scanningZip(file.name));
      let entries = null;
      try { entries = await readZipEntries(file); } catch { /* fall through */ }
      if (entries === null) { take(file); continue; }
      if (!entries.length) { toast(NEW_TASK.zipEmpty(file.name), { icon: 'alert-circle', tone: 'danger' }); continue; }
      entries.forEach((en) => take({ name: en.name, size: en.size }));
      say(NEW_TASK.foundInZip(entries.length, file.name));
    }
    return { toAdd, bad };
  };
  const walkEntry = (entry, depth, out) => new Promise((done) => {
    if (!entry || depth > 4) return done();
    if (entry.isFile) return entry.file((f) => { out.push(f); done(); }, done);
    const reader = entry.createReader();
    const batch = () => reader.readEntries((entries) => {
      if (!entries.length) return done();
      Promise.all(entries.map((e) => walkEntry(e, depth + 1, out))).then(batch, done);
    }, done);
    return batch();
  });

  const beginUpload = async (list) => {
    if (!list.length || s.uploading) return;
    s.uploading = true; s.uploadCount = list.length; s.uploadPct = 6; force();
    requestAnimationFrame(() => { s.uploadPct = 88; force(); });
    const started = Date.now();
    const { toAdd, bad } = await resolveUpload(list);
    const minMs = Math.min(1800, 500 + list.length * 150);
    const left = minMs - (Date.now() - started);
    if (left > 0) await sleep(left);
    s.uploadPct = 100; force();
    await sleep(180);
    s.uploading = false;
    if (toAdd.length) {
      s.docs.push(...toAdd);
      persistDocs();
      if (s.bodyKind === 'pending' || s.bodyKind === 'done') {
        toAdd.forEach((d) => s.addedAfterIds.add(d.id));
        ADDED_AFTER_STORE.save(task.id, [...s.addedAfterIds]);
      }
    }
    force();
    const ok = toAdd.length;
    if (ok && bad) toast(`${ok} ${ok === 1 ? 'certificate' : 'certificates'} added, ${bad} could not be added`, { icon: 'alert-circle', tone: 'danger' });
    else if (ok) toast(`${ok} ${ok === 1 ? 'certificate' : 'certificates'} added`, { icon: 'check' });
    else if (bad) toast(`${bad} ${bad === 1 ? 'file' : 'files'} could not be added`, { icon: 'alert-circle', tone: 'danger' });
  };

  // drag-and-drop onto the whole page, live only while the empty dropzone shows
  useEffect(() => {
    const active = () => s.bodyKind === 'new' && s.docs.length === 0 && !s.uploading;
    const over = (on) => document.getElementById('tuDropzone')?.classList.toggle('is-over', on);
    const onEnterOver = (e) => {
      if (!active()) return;
      if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      if (e.type === 'dragenter') dragDepth.current++;
      over(true);
    };
    const onLeave = () => { if (--dragDepth.current <= 0) { dragDepth.current = 0; over(false); } };
    const onDrop = async (e) => {
      if (!active()) return;
      e.preventDefault(); dragDepth.current = 0; over(false);
      const dt = e.dataTransfer; if (!dt) return;
      const items = [...(dt.items || [])].filter((i) => i.kind === 'file')
        .map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null));
      if (items.some(Boolean)) {
        const out = [];
        for (const en of items) await walkEntry(en, 0, out);
        beginUpload(out);
        return;
      }
      beginUpload([...(dt.files || [])]);
    };
    document.addEventListener('dragenter', onEnterOver);
    document.addEventListener('dragover', onEnterOver);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnterOver);
      document.removeEventListener('dragover', onEnterOver);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- checking ------------------------------------------------------------ */
  const currentLiveRec = () => getLiveRuns().find((r) => r.id === task.id) || null;
  const stageCap = (i) => (i === 0 ? TOTAL : ANSWERABLE);
  const stageFrac = (i, overall) => { const n = RUN_STAGES.length; const start = i / n; if (overall <= start) return 0; return Math.min(1, (overall - start) / (1 - start)); };
  const stageDone = (i, overall) => Math.round(stageFrac(i, overall) * stageCap(i));
  const shouldHaveCount = (frac) => Math.min(QUEUE.length, Math.round(frac * QUEUE.length));

  const beginChecking = (kind) => {
    if (task.freshUpload) { s.docs = DOCUMENTS.map((d) => ({ ...d })); s.types.clear(); s.query = ''; persistDocs(); }
    const targetIds = kind === 'filtered' ? matching().map((d) => d.id)
      : kind === 'rest' ? notVerifiedDocs().map((d) => d.id)
        : s.docs.map((d) => d.id);
    RUN_TARGET_STORE.save(task.id, targetIds);
    toastHide();
    s.bodyKind = 'checking';
    s.listedCount = Math.min(8, QUEUE.length);
    s.sevFilter = 'all';
    startLiveRun({ id: task.id, title: task.title, total: ANSWERABLE });
    setTaskState(task.id, 'checking');
    bumpLive();
    say(kind === 'all' ? `Starting all ${s.docs.length}`
      : kind === 'rest' ? `Verifying the other ${targetIds.length}`
        : `Starting the ${matching().length} filtered`);
    force();
  };

  const takeFound = () => {
    const rec = currentLiveRec(); if (!rec) return;
    const should = shouldHaveCount(liveProgress(rec).frac);
    const n = should - s.listedCount;
    if (n <= 0) return;
    s.listedCount = should; force();
    say(`${n} added to the list`);
  };
  const stopChecking = () => { stopLiveRun(task.id); force(); say('Verification stopped'); };

  // resolve lifecycle on load (once per task)
  useLayoutEffect(() => {
    if (s.bodyKind === 'checking') {
      const override = getTaskState(task.id);
      const rec = currentLiveRec();
      if (rec) {
        if (!liveProgress(rec).finished) { s.listedCount = Math.min(8, QUEUE.length); force(); return; }
      } else if (!override) {
        startLiveRun({ id: task.id, title: task.title, total: ANSWERABLE });
        s.listedCount = Math.min(8, QUEUE.length);
        setTaskState(task.id, 'checking');
        if (!RUN_TARGET_STORE.load(task.id)) RUN_TARGET_STORE.save(task.id, s.docs.map((d) => d.id));
        bumpLive();
        force();
        return;
      }
      s.bodyKind = 'pending'; s.tab = 'needs'; setTaskState(task.id, 'pending'); mergeRunTarget();
    }
    force();
    if (takeJustCreated(task.id)) toast(TASK_DETAIL.createdToast(task.count), { icon: 'check' });
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // the live-run tick flips checking → pending, and keeps the monitor moving
  useEffect(() => {
    if (s.bodyKind !== 'checking') { refreshLifecycle(); return; }
    const rec = currentLiveRec();
    const finished = rec ? liveProgress(rec).finished : true;
    if (finished) {
      s.bodyKind = 'pending'; s.tab = 'needs'; setTaskState(task.id, 'pending'); mergeRunTarget();
    }
    force();
  }, [liveTick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- check again --------------------------------------------------------- */
  const checkAgainAllowed = (i) => { const cur = currentDecision(task.id, i); return !(cur && cur.verdict === 'forged'); };
  const recheckVerdict = (i) => { const cur = currentDecision(task.id, i); if (cur) return 'genuine'; const p = problem(i); return p ? p.severity : 'genuine'; };
  const checkAgainOne = (i) => {
    if (!checkAgainAllowed(i)) return;
    addDecision(task.id, i, { verdict: recheckVerdict(i), note: null, decidedAt: shortDate(), source: 'recheck' });
    refreshLifecycle(); force();
    const d = doc(i);
    const settled = isSettled(task.id, i);
    toast(settled ? TASK_STATE.recheckToast(d.name) : `${d.name}: the recheck disagrees with the earlier decision`,
      { icon: settled ? 'refresh-cw' : 'alert-triangle' });
  };
  const checkAgainMany = (ids) => {
    const allowed = ids.filter(checkAgainAllowed);
    if (!allowed.length) { toast(`Everything selected is ${TASK_STATE.checkAgainBlocked(SIGNOFF.name).toLowerCase()}`, { icon: 'alert-triangle' }); return; }
    allowed.forEach((i) => addDecision(task.id, i, { verdict: recheckVerdict(i), note: null, decidedAt: shortDate(), source: 'recheck' }));
    s.selected.clear(); refreshLifecycle(); force();
    toast(`${allowed.length} ${allowed.length === 1 ? 'certificate' : 'certificates'} checked again`, { icon: 'refresh-cw' });
  };

  /* ---- remove / split / undo ---------------------------------------------- */
  const snack = (message, undo) => toast(message, { icon: 'trash-2', undo: undo ? undoLast : undefined, onExpire: () => { s.undo = null; } });
  const takeOut = (ids, verb, note) => {
    const taken = s.docs.filter((d) => ids.includes(d.id));
    if (!taken.length) return;
    const at = taken.map((d) => ({ doc: d, i: s.docs.indexOf(d) }));
    s.docs = s.docs.filter((d) => !ids.includes(d.id));
    ids.forEach((i) => s.selected.delete(i));
    s.undo = { at, verb }; force();
    snack(`${taken.length === 1 ? `${taken[0].name} ${verb}` : `${taken.length} certificates ${verb}`}${note ? ` ${note}` : ''}`, true);
  };
  function undoLast() {
    if (!s.undo) return;
    [...s.undo.at].sort((a, b) => a.i - b.i).forEach(({ doc: d, i }) => s.docs.splice(Math.min(i, s.docs.length), 0, d));
    s.undo = null; force();
    toast('Restored', { icon: 'refresh-cw' });
  }
  const askThenRemove = async (ids) => {
    const docs = s.docs.filter((d) => ids.includes(d.id));
    if (!docs.length) return;
    const many = docs.length > 1;
    const ok = await confirm({
      title: many ? `Remove ${docs.length} certificates?` : 'Remove this certificate?',
      body: (
        <>
          {many ? `They will be taken out of ${task.title}. `
            : <>{<b>{docs[0].name}</b>}{` will be taken out of ${task.title}. `}</>}
          {`The ${many ? 'files themselves are' : 'file itself is'} not deleted, and nothing that has already been checked is undone.`}
        </>
      ),
      confirm: many ? `Remove ${docs.length}` : 'Remove',
    });
    if (ok) takeOut(ids, 'removed from this task');
    else announce('Nothing was removed');
  };

  /* ---- popovers (sort / notify / row menu) -------------------------------- */
  const popRef = useRef(null);
  const pop = popRef.current;
  const setPop = (v) => { popRef.current = typeof v === 'function' ? v(popRef.current) : v; force(); };
  const closePop = () => setPop(null);

  /* ---- selection ----------------------------------------------------------- */
  const selectionActions = () => (s.bodyKind === 'new' ? SELECTION_ACTIONS : [...SELECTION_ACTIONS, CHECKAGAIN_ACTION]);
  const toggleDoc = (i, on) => { if (on) s.selected.add(i); else s.selected.delete(i); force(); };
  const toggleSelAll = (on) => { const rows = visible(); rows.forEach((d) => (on ? s.selected.add(d.id) : s.selected.delete(d.id))); force(); };

  const openPreview = (i, el) => viewer.open(i, { list: visible, from: el });

  /* ======================================================================== */
  /* RENDER                                                                    */
  /* ======================================================================== */
  refreshLifecycle();
  const k = s.bodyKind;
  const hasDocs = s.docs.length > 0;
  const showDropzone = k === 'new' && !hasDocs && !s.uploading;
  const showAll = (k === 'new' && hasDocs) || (k !== 'checking' && s.tab === 'all');
  const showFound = k === 'checking' || (k !== 'new' && (s.tab === 'needs' || s.tab === 'notverified'));

  const displayStatusKey = () => {
    if (k === 'checking') return 'progress';
    if (k === 'pending' || k === 'done') {
      if (notVerifiedCount() > 0) return 'partial';
      if (k === 'done') return 'done';
      return task.status === 'late' ? 'late' : 'pending';
    }
    return 'new';
  };
  const statusLabel = (key) => (key === 'progress' ? 'Verifying' : STATUS_META[key].label);
  const freshMeta = () => {
    const n = s.docs.length;
    if (!n) return 'Add certificates below to begin.';
    return `${n} ${n === 1 ? 'certificate' : 'certificates'} · you uploaded it • today ${GREETING.time} · nothing examined yet`;
  };
  const headKey = displayStatusKey();

  const trackList = () => DOC_COLUMNS.map((c) => (c.grow ? 'minmax(240px,1.5fr)' : c.w)).join(' ') + ' 36px';

  return (
    <div className="detail">
      <section className="pagehead" aria-labelledby="taskTitle">
        <div className="pagehead__row">
          <h2 className="pagehead__title" id="taskTitle">{task.title}</h2>
          <span className="pagehead__state">
            <span className={`pill pill--${STATUS_META[headKey].variant}`}>{statusLabel(headKey)}</span>
          </span>
          {showAll ? (
            <div className="field pagehead__search" id="taskSearchWrap">
              <span className="field__icon"><Icon name="search" size={18} /></span>
              <label className="visually-hidden" htmlFor="docSearch">Search certificates in this task</label>
              <input
                id="docSearch"
                type="search"
                placeholder="filename or institution"
                autoComplete="off"
                spellCheck="false"
                data-pagesearch
                defaultValue={s.query}
                onChange={(e) => { const v = e.target.value; clearTimeout(window.__tq); window.__tq = setTimeout(() => { s.query = v; s.shown = TASK_DETAIL.pageSize; force(); }, 140); }}
                onKeyDown={(e) => { if (e.key === 'Escape') { e.target.value = ''; s.query = ''; force(); } }}
              />
            </div>
          ) : null}
        </div>
        <p className="pagehead__meta">{task.freshUpload ? freshMeta() : task.meta}</p>
      </section>

      {/* ---- empty upload ---- */}
      {showDropzone ? <EmptyUpload acceptedExts={acceptedExts} fileInputRef={fileInputRef} onFiles={beginUpload} /> : null}

      {/* ---- uploading ---- */}
      {s.uploading ? (
        <section className="dropzone" aria-live="polite" aria-busy="true">
          <span className="dropzone__tile dropzone__tile--live" aria-hidden="true"><Icon name="upload" size={26} /></span>
          <h3 className="dropzone__title">{`Uploading ${s.uploadCount} ${s.uploadCount === 1 ? 'certificate' : 'certificates'}…`}</h3>
          <div className="progress progress--live dropzone__progress">
            <div className="progress__fill" style={{ width: `${s.uploadPct}%` }} />
          </div>
        </section>
      ) : null}

      {/* ---- monitor ---- */}
      {k !== 'new' ? (
        <section className="monitor" aria-label="Verification progress">
          {k === 'checking' ? renderMonitorChecking() : k === 'pending' ? renderMonitorPending() : renderMonitorDone()}
        </section>
      ) : null}

      {/* ---- tabs ---- */}
      {k !== 'new' && k !== 'checking' ? (
        <div className="revtabs" role="tablist">
          {renderTabs()}
        </div>
      ) : null}

      {/* ---- found / not-verified list ---- */}
      {showFound ? (
        <section className="found" aria-label="Everything that needs a person">
          {s.tab === 'notverified' && k !== 'checking' ? renderNotVerified() : renderFound()}
        </section>
      ) : null}

      {/* ---- all-certificates table furniture ---- */}
      {showAll ? renderTypeBar() : null}
      {showAll && s.selected.size > 0 ? renderSelection() : null}
      {showAll ? (
        <section className="dtable" aria-label="Certificates in this task" style={{ '--dtable-cols': trackList() }}>
          {renderTable()}
        </section>
      ) : null}
      {showAll ? <div className="loadmore">{renderMore()}</div> : null}

      {/* ---- run bar (new state) ---- */}
      {k === 'new' && hasDocs ? <section className="runbar" aria-label="Run the checks">{renderRun()}</section> : null}

      {/* ---- popovers ---- */}
      {pop ? renderPopover() : null}
    </div>
  );

  /* ---------------------------------------------------------------- renders */
  function renderMonitorChecking() {
    const rec = currentLiveRec();
    if (!rec) return null;
    const p = liveProgress(rec);
    const a = p.done;
    const pct = Math.round(p.frac * 100);
    const at = RUN_STAGES.findIndex((_, i) => { const f = stageFrac(i, p.frac); return f > 0 && f < 1; });
    return (
      <>
        <div className="monitor__top">
          <span className="pill pill--progress">{p.stopped ? 'Stopped' : statusLabel('progress')}</span>
          <span className="monitor__count">{`${a} of ${ANSWERABLE} answered`}</span>
          <span className="monitor__left">{p.stopped ? 'stopped' : p.finished ? 'finished' : LIVE_RUN.leftLabel(Math.max(0, rec.durationMs - p.elapsed))}</span>
          {!p.stopped && !p.finished ? <button className="btn btn--ghost btn--sm" type="button" onClick={stopChecking}>Stop</button> : null}
        </div>
        <div className={`progress${!p.stopped && !p.finished ? ' progress--live' : ''}`} role="progressbar" aria-valuenow={a} aria-valuemin={0} aria-valuemax={ANSWERABLE} aria-label="Certificates answered">
          <div className="progress__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="monitor__steps steps">
          {RUN_STAGES.map((st, i) => {
            const n = stageDone(i, p.frac); const cap = stageCap(i); const full = n >= cap; const here = i === at && !p.stopped;
            return (
              <div className={`steps__item${full ? ' is-done' : ''}${here ? ' is-live' : ''}`} title={st.note} key={st.id}>
                <span className="steps__mark">{full ? <Icon name="check" size={13} /> : null}</span>
                <span className="steps__text">
                  <span className="steps__label">{st.label}</span>
                  <span className="steps__count">{`${n} of ${cap}`}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="monitor__note">{`${ASIDE} of the ${TOTAL} were set aside before answering, so the denominator above is ${ANSWERABLE}.`}</p>
      </>
    );
  }

  function renderMonitorPending() {
    const need = undecided().length;
    const nv = notVerifiedCount();
    return (
      <>
        <div className="monitor__top">
          <span className="pill pill--done">Finished</span>
          <span className="monitor__count">{`${need} certificate${need === 1 ? '' : 's'} need your decision`}</span>
          <div className="monitor__cta">
            <button className="btn btn--primary" type="button" onClick={() => navigate(`/review/${task.id}`)}>{RUN.startReviewing}</button>
            {nv ? <button className="btn btn--secondary" type="button" onClick={() => beginChecking('rest')}>{TASK_STATE.verifyRest(nv)}</button> : null}
          </div>
        </div>
        <div className="monitor__summary">
          <Figure n={clearedCount()} label="cleared without you" note={RUN.clearedNote} />
          <Figure n={need} label="need your decision" note={severityBreakdownText()} />
          <Figure n={verifiedAsideCount()} label="set aside" note={RUN.asideNote} />
        </div>
      </>
    );
  }

  function renderMonitorDone() {
    const st = decisionStats();
    return (
      <>
        <div className="monitor__top">
          <span className="pill pill--done">Done</span>
          <span className="monitor__count">{`${st.decided} decided`}</span>
        </div>
        <div className="monitor__summary">
          <Figure n={st.decided} label="decided" />
          <Figure n={st.agreed} label="agreed with the AI" />
          <Figure n={st.changed} label="changed" />
          <Figure n={st.signoff} label="sent for sign-off" note={`waiting on ${SIGNOFF.name}`} />
        </div>
      </>
    );
  }

  function renderTabs() {
    const items = [
      ['needs', TASK_STATE.tabNeeds(undecided().length)],
      ['all', TASK_STATE.tabAll(s.docs.length)],
      ['notverified', TASK_STATE.tabNotVerified(notVerifiedCount())],
    ];
    return items.map(([tid, label]) => (
      <button
        key={tid}
        className={`tab${s.tab === tid ? ' is-active' : ''}`}
        role="tab"
        aria-selected={s.tab === tid}
        onClick={() => { s.tab = tid; s.selected.clear(); force(); }}
      >
        <span className="tab__label">{label}</span>
      </button>
    ));
  }

  function severityRows() {
    const pool = k === 'checking' ? QUEUE.slice(0, s.listedCount) : QUEUE.filter((p) => s.verifiedIds.has(p.doc));
    return pool.map((p) => ({ kind: 'open', doc: p.doc, why: p.why, sevKey: p.severity, rank: SEVERITY[p.severity].rank }));
  }
  function asideRows() {
    const pool = k === 'checking' ? RUN_SET_ASIDE : RUN_SET_ASIDE.filter((x) => s.verifiedIds.has(x.doc));
    return pool.map((x) => ({ kind: 'aside', doc: x.doc, why: x.why, sevKey: 'aside', action: x.action, rank: 99 }));
  }
  function baseRows() {
    return k === 'checking' ? severityRows() : [...severityRows(), ...asideRows()].sort((a, b) => a.rank - b.rank);
  }
  function visibleFoundRows() {
    if (s.sevFilter === 'aside') return asideRows();
    const base = baseRows();
    return s.sevFilter === 'all' ? base : base.filter((r) => r.sevKey === s.sevFilter);
  }

  function renderFound() {
    const rows = visibleFoundRows();
    const checking = k === 'checking';
    const rec = checking ? currentLiveRec() : null;
    const p = rec ? liveProgress(rec) : null;
    const pending = checking && p ? QUEUE.slice(s.listedCount, shouldHaveCount(p.frac)) : [];
    const sc = severityCounts(severityRows());
    return (
      <>
        <div className="found__head">
          <div>
            <span className="label">{checking ? RUN.problemsEyebrow : RUN.everythingEyebrow}</span>
            {checking ? <p className="found__lead">{`${s.listedCount} in your list · ${RUN.problemsLead}`}</p> : null}
          </div>
          {checking
            ? (s.listedCount ? <div className="found__act"><button className="btn btn--primary" type="button" onClick={() => navigate(`/review/${task.id}`)}>{`Review these ${s.listedCount}`}</button></div> : null)
            : <p className="found__done-note">{TASK_STATE.needsCaption}</p>}
        </div>

        <div className="chips" role="group" aria-label="Filter by severity">
          {sevChip('all', 'Needs you', severityRows().length)}
          {sevChip('forged', 'Forged', sc.forged, 'forged')}
          {sevChip('suspicious', 'Suspicious', sc.suspicious, 'suspicious')}
          {sevChip('minor', 'Minor issue', sc.minor, 'minor')}
          {sevChip('aside', 'Set aside', checking ? RUN_SET_ASIDE.length : verifiedAsideCount(), 'aside')}
        </div>

        {checking && pending.length ? (
          <div className="live">
            <span className="live__dot" aria-hidden="true" />
            <span className="live__text">{`${pending.length} ${RUN.liveTitle}`}</span>
            <button className="linkbtn" type="button" onClick={takeFound}>{RUN.liveAction}</button>
            <span className="live__note">{RUN.liveNote}</span>
          </div>
        ) : null}

        {rows.length ? (
          <>
            <div className="dtable" style={{ '--dtable-cols': `minmax(220px,1.2fr) minmax(240px,1.6fr) 150px ${checking ? '160px' : '220px'}` }}>
              <div className="dtable__head"><div>Certificate</div><div>What is wrong</div><div>How bad</div><div /></div>
              {rows.map((row) => foundRow(row))}
            </div>
            <p className="dtable__note">{RUN.listNote}</p>
          </>
        ) : (
          <p className="dtable__empty">{s.sevFilter === 'all' && checking ? 'Nothing flagged yet. The checks are still running.' : 'Nothing here.'}</p>
        )}
      </>
    );
  }

  function severityCounts(rows) { const c = { forged: 0, suspicious: 0, minor: 0 }; rows.forEach((r) => { if (c[r.sevKey] != null) c[r.sevKey]++; }); return c; }
  function sevChip(key, label, count, dot) {
    return (
      <button className={`chip${s.sevFilter === key ? ' is-selected' : ''}`} type="button" aria-pressed={s.sevFilter === key} onClick={() => { s.sevFilter = key; force(); }}>
        {dot ? <span className={`chip__dot chip__dot--${dot}`} /> : null}
        <span className="chip__label">{label}</span>
        <span className="chip__count">{count}</span>
      </button>
    );
  }

  function foundRow(row) {
    const d = doc(row.doc);
    if (row.kind === 'aside') {
      const acted = s.asideActed.has(row.doc);
      return (
        <div className="dtable__row" data-row={d.id} key={d.id}>
          <div className="dtable__cert"><span className="thumb"><Icon name="file-text" size={18} /></span><span className="dtable__name" title={d.name}>{d.name}</span></div>
          <div className="found__why" title={row.why}>{row.why}</div>
          <div className="found__sev"><span className="pill pill--outline">Not judged</span></div>
          <div className="found__open">
            {acted ? <span className="aside-act__done"><Icon name="check" size={14} /><span>Sent</span></span>
              : <button className="linkbtn" type="button" onClick={() => { s.asideActed.add(row.doc); force(); toast(`${row.action}: ${d.name}`, { icon: 'check' }); }}>{row.action}</button>}
          </div>
        </div>
      );
    }
    const sev = SEVERITY[row.sevKey];
    const settledView = k !== 'checking';
    const history = settledView ? (getDecisions(task.id)[row.doc] || []) : [];
    const cur = history.length ? history[history.length - 1] : null;
    const lastReview = [...history].reverse().find((h) => h.source === 'review');
    const conflict = settledView && cur && lastReview && cur !== lastReview && cur.source === 'recheck' && cur.verdict !== lastReview.verdict;
    const blocked = cur && cur.verdict === 'forged';
    return (
      <div
        className="dtable__row"
        data-row={d.id}
        key={d.id}
        onClick={(e) => { if (!e.target.closest('button, a')) navigate(`/review/${task.id}?doc=${d.id}`); }}
      >
        <div className="dtable__cert"><span className="thumb"><Icon name="file-text" size={18} /></span><span className="dtable__name" title={d.name}>{d.name}</span></div>
        <div className="found__why" title={row.why}>{row.why}</div>
        <div className="found__sev">
          <span className={`pill pill--${sev.pill}`} title={sev.note}>{sev.label}</span>
          {conflict ? (
            <span className="found__decision found__decision--conflict">{TASK_STATE.conflict(verdictMeta(lastReview.verdict).label, lastReview.decidedAt, verdictMeta(cur.verdict).label)}</span>
          ) : cur ? (
            <span className="found__decision"><Icon name="check" size={13} />{`Decided: ${verdictMeta(cur.verdict).label}${history.length > 1 ? ` · ${TASK_STATE.checkedTwice}` : ''}`}</span>
          ) : null}
        </div>
        <div className="found__open">
          {settledView ? (
            <button
              className="linkbtn"
              type="button"
              aria-disabled={blocked || undefined}
              title={blocked ? TASK_STATE.checkAgainBlocked(SIGNOFF.name) : undefined}
              onClick={() => { if (!blocked) checkAgainOne(d.id); }}
            >
              {TASK_STATE.checkAgain}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function renderNotVerified() {
    const rows = notVerifiedDocs();
    return (
      <>
        <div className="found__head"><div><span className="label">Not verified</span></div></div>
        {rows.length ? (
          <div className="dtable" style={{ '--dtable-cols': 'minmax(220px,1.2fr) minmax(240px,1.6fr) 150px 220px' }}>
            <div className="dtable__head"><div>Certificate</div><div>Reason</div><div>Status</div><div /></div>
            {rows.map((d) => (
              <div className="dtable__row" data-row={d.id} key={d.id}>
                <div className="dtable__cert">
                  <button className="dtable__open" type="button" aria-label={`Preview ${d.name}`} onClick={(e) => openPreview(d.id, e.currentTarget)}>
                    <span className="thumb"><Icon name="file-text" size={18} /></span>
                    <span className="dtable__name" title={d.name}>{d.name}</span>
                  </button>
                </div>
                <div className="found__why">{notVerifiedReason(d.id)}</div>
                <div className="found__sev"><span className="pill pill--outline">Not verified</span></div>
                <div className="found__open" />
              </div>
            ))}
          </div>
        ) : <p className="dtable__empty">Nothing here.</p>}
      </>
    );
  }

  function renderTypeBar() {
    const none = s.types.size === 0;
    const chip = (o) => (
      <button
        key={o.id}
        className={`chip${o.on ? ' is-on' : ''}${o.absent ? ' chip--absent' : ''}`}
        type="button"
        aria-pressed={o.on}
        data-tone={o.tone || undefined}
        onClick={() => {
          if (o.id === 'all') s.types.clear();
          else if (s.types.has(o.id)) s.types.delete(o.id); else s.types.add(o.id);
          s.shown = TASK_DETAIL.pageSize; force();
          announce(`${typeLabel()}, ${matching().length} shown`);
        }}
      >
        {o.tone ? <span className="chip__dot" aria-hidden="true" /> : null}
        <span className="chip__label">{o.label}</span>
        <span className="chip__count">{o.count}</span>
      </button>
    );
    return (
      <div className="typebar">
        <div className="typebar__chips" role="group" aria-label="Filter by document type">
          {chip({ id: 'all', label: 'All', count: s.docs.length, on: none })}
          {chipOrder().map((t) => chip({ id: t.id, label: t.chip, count: t.count, tone: t.tone, absent: t.absent, on: s.types.has(t.id) }))}
          {isFiltered() ? (
            <button className="chip chip--clear" type="button" aria-label="Clear all filters" title="Clear all filters" onClick={() => { s.types.clear(); s.query = ''; s.shown = TASK_DETAIL.pageSize; const b = document.getElementById('docSearch'); if (b) b.value = ''; force(); say('Filters cleared'); }}>
              <span><Icon name="x" size={15} /></span>
            </button>
          ) : null}
        </div>
        <div className="typebar__end">
          <div className="typebar__ctrls">
            <button className="select" type="button" aria-haspopup="menu" aria-expanded={pop?.kind === 'sort'} onClick={(e) => { e.stopPropagation(); setPop(pop?.kind === 'sort' ? null : { kind: 'sort', anchor: e.currentTarget }); }}>
              <span className="select__value">{`Sort: ${sortLabel()}`}</span>
              <span className="select__chevron"><Icon name="chevron-down" size={16} /></span>
            </button>
            <button className="btn btn--secondary btn--dashed" type="button" onClick={() => fileInputRef.current?.click()}>
              <span><Icon name="plus" size={16} /></span>
              <span>Add more files</span>
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          accept={acceptedExts.map((e) => `.${e}`).join(',')}
          onChange={(e) => { beginUpload([...e.target.files]); e.target.value = ''; }}
        />
      </div>
    );
  }

  function renderSelection() {
    const n = s.selected.size;
    const ids = [...s.selected];
    const allBlocked = s.bodyKind !== 'new' && ids.every((i) => !checkAgainAllowed(i));
    return (
      <div className="selbar" role="status" aria-live="polite">
        <span className="selbar__mark"><Icon name="check" size={14} /></span>
        <span className="selbar__count">{`${n} selected`}</span>
        <span className="selbar__of">{`of ${matching().length} shown`}</span>
        <div className="selbar__actions">
          {selectionActions().map((a) => {
            const blocked = a.id === 'checkagain' && allBlocked;
            return (
              <button
                key={a.id}
                className={`selbar__act${a.danger ? ' selbar__act--danger' : ''}`}
                type="button"
                aria-disabled={blocked || undefined}
                title={blocked ? TASK_STATE.checkAgainBlocked(SIGNOFF.name) : undefined}
                onClick={() => {
                  if (blocked) return;
                  if (a.id === 'remove') askThenRemove(ids);
                  if (a.id === 'split') takeOut(ids, 'split into a new task', `· “${task.title} (2)”`);
                  if (a.id === 'checkagain') checkAgainMany(ids);
                }}
              >
                <span><Icon name={a.icon} size={16} /></span>{a.label}
              </button>
            );
          })}
        </div>
        <button className="selbar__close" type="button" aria-label="Clear the selection" onClick={() => { s.selected.clear(); force(); }}><Icon name="x" size={16} /></button>
      </div>
    );
  }

  function renderTable() {
    const rows = visible();
    const all = rows.length > 0 && rows.every((d) => s.selected.has(d.id));
    const some = rows.some((d) => s.selected.has(d.id)) && !all;
    return (
      <>
        <div className="dtable__head">
          <div className="dtable__cert">
            <Check id="selAll" checked={all} indeterminate={some} onChange={(e) => toggleSelAll(e.target.checked)} aria="Select every certificate shown" />
            <span>{DOC_COLUMNS[0].label}</span>
          </div>
          {DOC_COLUMNS.slice(1).map((c) => (
            <div key={c.id} className={`${c.align === 'center' ? 'dtable__cell--center' : ''}${c.align === 'end' ? ' dtable__cell--num' : ''}`}>{c.label}</div>
          ))}
          <div />
        </div>
        {rows.length ? rows.map((d) => tableRow(d)) : <p className="dtable__empty">Nothing matches that. Clear the search or choose another type.</p>}
      </>
    );
  }

  function tableRow(d) {
    const on = s.selected.has(d.id);
    return (
      <div className={`dtable__row${on ? ' is-selected' : ''}`} data-row={d.id} key={d.id}>
        <div className="dtable__cert">
          <Check data checked={on} onChange={(e) => toggleDoc(d.id, e.target.checked)} aria={`Select ${d.name}`} />
          <button className="dtable__open" type="button" aria-label={`Preview ${d.name}`} onClick={(e) => openPreview(d.id, e.currentTarget)}>
            <span className="thumb"><Icon name="file-text" size={18} /></span>
            <span className="dtable__name" title={d.name}>{d.name}</span>
          </button>
        </div>
        {DOC_COLUMNS.slice(1).map((c) => (
          <div key={c.id} className={c.align === 'center' ? 'dtable__cell--center' : ''}>{cell(d, c)}</div>
        ))}
        <div className="dtable__act">
          {s.bodyKind === 'new' ? (
            <button className="rowdel" type="button" aria-label={`Remove ${d.name} from this task`} onClick={() => askThenRemove([d.id])}><Icon name="trash-2" size={16} /></button>
          ) : (
            <button className="rowdel" type="button" aria-haspopup="menu" aria-expanded={pop?.kind === 'rowmenu' && pop.id === d.id} aria-label={`More actions for ${d.name}`} onClick={(e) => setPop({ kind: 'rowmenu', anchor: e.currentTarget, id: d.id })}><Icon name="ellipsis" size={16} /></button>
          )}
        </div>
      </div>
    );
  }
  function cell(d, col) {
    if (col.id === 'type') return <TypePill type={d.type} />;
    const v = d[col.id];
    if (v === null || v === undefined || v === '') {
      return <span className="dtable__cell dtable__cell--empty">{col.id === 'institution' ? 'not shown on the cover page' : 'not stated'}</span>;
    }
    return <span className={`dtable__cell${col.numeric ? ' dtable__cell--num' : ''}`}>{v}</span>;
  }

  function renderMore() {
    const total = matching().length;
    const rest = total - visible().length;
    return (
      <>
        {rest > 0 ? (
          <button className="btn btn--secondary loadmore__btn" type="button" onClick={() => { s.shown += TASK_DETAIL.pageSize; force(); announce(`Showing ${visible().length} of ${matching().length}`); }}>
            <span><Icon name="chevron-down" size={18} /></span>
            {`Load ${rest} more`}
          </button>
        ) : null}
        <p className="loadmore__note">{`Showing ${visible().length} of ${total} · ${task.listNote}`}</p>
      </>
    );
  }

  function renderRun() {
    const n = matching().length;
    const onCount = Object.values(s.notify).filter(Boolean).length;
    return (
      <>
        <div className="runbar__info">
          <p className="runbar__est">{`About ${LIVE_RUN.estimateLabel(LIVE_RUN.durationFor(s.docs.length))} for all ${s.docs.length}`}</p>
          {isFiltered() ? <p className="runbar__sub">{`About ${LIVE_RUN.estimateLabel(LIVE_RUN.durationFor(n))} for the ${n} you have filtered to.`}</p> : null}
        </div>
        <div className="runbar__actions">
          <button className="btn btn--ghost runbar__notify" type="button" aria-haspopup="dialog" aria-expanded={pop?.kind === 'notify'} onClick={(e) => { e.stopPropagation(); setPop(pop?.kind === 'notify' ? null : { kind: 'notify', anchor: e.currentTarget }); }}>
            <span><Icon name="bell" size={18} /></span>
            Notify me
            {onCount ? <span className="badge badge--muted">{onCount}</span> : null}
            <span><Icon name="chevron-down" size={16} /></span>
          </button>
          {isFiltered() ? <button className="btn btn--secondary" type="button" onClick={() => beginChecking('filtered')}>{`Verify the ${n} ${pluralType()}`}</button> : null}
          <button className="btn btn--primary" type="button" onClick={() => beginChecking('all')}>Start verification</button>
        </div>
      </>
    );
  }

  function renderPopover() {
    if (pop.kind === 'sort') {
      return (
        <AnchoredPopover anchor={pop.anchor} className="popover popover--menu" align="end" onClose={closePop}>
          {SORT_OPTIONS.map((o) => (
            <button key={o.id} className={`menu__item${s.sort === o.id ? ' is-on' : ''}`} type="button" role="menuitemradio" aria-checked={s.sort === o.id} onClick={() => { s.sort = o.id; closePop(); force(); }}>
              <span className="menu__item-tick">{s.sort === o.id ? <Icon name="check" size={14} /> : null}</span>
              <span className="menu__item-label">{o.label}</span>
            </button>
          ))}
        </AnchoredPopover>
      );
    }
    if (pop.kind === 'notify') {
      return (
        <AnchoredPopover anchor={pop.anchor} className="popover popover--notify" align="end" onClose={closePop}>
          <p className="popover__title">{TASK_DETAIL.notifyTitle}</p>
          <div className="popover__rows">
            {TASK_DETAIL.notify.map((o, i) => (
              <div className={`popover__row${i ? ' popover__row--ruled' : ''}`} key={o.id}>
                <Check checked={s.notify[o.id]} label={o.label} hint={o.hint} onChange={(e) => { s.notify[o.id] = e.target.checked; force(); }} />
              </div>
            ))}
          </div>
        </AnchoredPopover>
      );
    }
    // row menu
    const blocked = !checkAgainAllowed(pop.id);
    return (
      <AnchoredPopover anchor={pop.anchor} className="menu" align="end" onClose={closePop}>
        <button className="menu__item" role="menuitem" type="button" aria-disabled={blocked || undefined} title={blocked ? TASK_STATE.checkAgainBlocked(SIGNOFF.name) : undefined} onClick={() => { if (blocked) return; closePop(); checkAgainOne(pop.id); }}>
          <Icon name="refresh-cw" size={16} /><span>{TASK_STATE.checkAgain}</span>
        </button>
        <button className="menu__item menu__item--danger" role="menuitem" type="button" onClick={() => { const rid = pop.id; closePop(); askThenRemove([rid]); }}>
          <Icon name="trash-2" size={16} /><span>Remove</span>
        </button>
      </AnchoredPopover>
    );
  }
}

const LOCAL_VERDICT = {
  genuine: { label: 'Genuine', pill: 'done' },
  minor: { label: 'Minor issue', pill: 'unknown' },
  suspicious: { label: 'Suspicious', pill: 'pending' },
  forged: { label: 'Forged', pill: 'late' },
  unverifiable: { label: 'Unverifiable', pill: 'unknown' },
};

function LocalDocumentTask({ taskId }) {
  const navigate = useNavigate();
  const { toast, say } = useShell();
  const task = getCreatedTasks().find((item) => item.id === taskId) || { title: 'Document verification' };
  const [localDoc, setLocalDoc] = useState(() => loadLocalDocument(taskId));
  const [analysis, setAnalysis] = useState(() => loadForgeryAnalysis(taskId));
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState('scan');
  const [stageMessage, setStageMessage] = useState('Ready to inspect the local document.');
  const [error, setError] = useState('');
  const abortRef = useRef(null);
  const stageOrder = RUN_STAGES.map((item) => item.id);
  const stageIndex = Math.max(0, stageOrder.indexOf(stage));
  const verdict = analysis ? LOCAL_VERDICT[analysis.verdict] : null;

  const lead = useMemo(
    () => <Crumbs trail={[{ label: 'My tasks', href: '/' }, { label: task.title }]} />,
    [task.title],
  );
  useTopbar({ nav: 'tasks', crumbs: true, lead });

  useEffect(() => {
    document.title = `${task.title} | ${BRAND.name}`;
    return () => abortRef.current?.abort();
  }, [task.title]);

  const beginAnalysis = async () => {
    if (running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setAnalysis(null);
    setError('');
    setStage('scan');
    setStageMessage('Starting local validation.');
    try {
      await analyzeLocalDocument(localDoc.path, (event, payload) => {
        if (event === 'stage') {
          setStage(payload.id);
          setStageMessage(payload.message);
          say(payload.message);
        }
        if (event === 'result') {
          const updatedDocument = {
            ...localDoc,
            name: payload.facts.filename,
            type: payload.facts.document_type || 'unknown',
            institution: payload.facts.institution,
            pages: payload.facts.pages || 1,
            size: payload.facts.size_bytes,
          };
          saveLocalDocument(taskId, updatedDocument);
          saveForgeryAnalysis(taskId, payload);
          saveCreatedCard(taskId, {
            status: payload.verdict === 'genuine' ? 'done' : 'pending',
            stat: payload.verdict === 'genuine' ? 'No visible problems' : '1 needs review',
            action: payload.verdict === 'genuine' ? 'Open' : 'Review',
          });
          setLocalDoc(updatedDocument);
          setAnalysis(payload);
          toast(`Analysis finished: ${LOCAL_VERDICT[payload.verdict]?.label || payload.verdict}`, { icon: 'check' });
        }
      }, controller.signal);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message || 'Document analysis failed.');
        toast(requestError.message || 'Document analysis failed.', { icon: 'alert-circle', tone: 'danger' });
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  };

  const stopAnalysis = () => {
    abortRef.current?.abort();
    setRunning(false);
    setStageMessage('Verification stopped.');
    say('Verification stopped');
  };

  return (
    <div className="detail">
      <section className="pagehead" aria-labelledby="taskTitle">
        <div className="pagehead__row">
          <h2 className="pagehead__title" id="taskTitle">{task.title}</h2>
          <span className="pagehead__state">
            <span className={`pill pill--${running ? 'progress' : verdict?.pill || 'new'}`}>
              {running ? 'Verifying' : verdict?.label || 'New'}
            </span>
          </span>
        </div>
        <p className="pagehead__meta">{localDoc.path}</p>
      </section>

      {running ? (
        <section className="monitor" aria-label="Verification progress" aria-live="polite">
          <div className="monitor__top">
            <span className="pill pill--progress">Verifying</span>
            <span className="monitor__count">{stageMessage}</span>
            <button className="btn btn--ghost btn--sm" type="button" onClick={stopAnalysis}>Stop</button>
          </div>
          <div className="progress progress--live" role="progressbar" aria-valuenow={stageIndex + 1} aria-valuemin={0} aria-valuemax={RUN_STAGES.length}>
            <div className="progress__fill" style={{ width: `${((stageIndex + 1) / RUN_STAGES.length) * 100}%` }} />
          </div>
          <div className="monitor__steps steps">
            {RUN_STAGES.map((item, index) => (
              <div className={`steps__item${index < stageIndex ? ' is-done' : ''}${index === stageIndex ? ' is-live' : ''}`} title={item.note} key={item.id}>
                <span className="steps__mark">{index < stageIndex ? <Icon name="check" size={13} /> : null}</span>
                <span className="steps__text"><span className="steps__label">{item.label}</span><span className="steps__count">{index < stageIndex ? 'Done' : index === stageIndex ? 'Running' : 'Waiting'}</span></span>
              </div>
            ))}
          </div>
          <p className="monitor__note">The document is read from its local path and is not copied into application storage.</p>
        </section>
      ) : null}

      {error && !running ? (
        <div className="notice notice--warn" role="alert">
          <span className="notice__icon"><Icon name="alert-circle" size={16} /></span>
          <span className="notice__lead">Analysis failed.</span>
          <span className="notice__body">{error}</span>
        </div>
      ) : null}

      {!analysis && !running ? (
        <>
          <section className="dtable" aria-label="Local document" style={{ '--dtable-cols': 'minmax(240px,1.5fr) 180px 180px 36px' }}>
            <div className="dtable__head"><div>Certificate</div><div>Type</div><div>Source</div><div /></div>
            <div className="dtable__row">
              <div className="dtable__cert"><span className="thumb"><Icon name="file-text" size={18} /></span><span className="dtable__name">{localDoc.name}</span></div>
              <div><span className="pill pill--outline">{localDoc.type || 'unknown'}</span></div>
              <div><span className="dtable__cell">Local path</span></div>
              <div />
            </div>
          </section>
          <section className="runbar" aria-label="Run the checks">
            <div className="runbar__info">
              <p className="runbar__est">Analyze this document for visible forgery indicators</p>
              <p className="runbar__sub">No external registry or known-forgery collection will be queried.</p>
            </div>
            <div className="runbar__actions">
              <button className="btn btn--primary" type="button" onClick={beginAnalysis}>Start verification</button>
            </div>
          </section>
        </>
      ) : null}

      {analysis && !running ? (
        <>
          <section className="monitor" aria-label="Verification result">
            <div className="monitor__top">
              <span className={`pill pill--${verdict.pill}`}>{verdict.label}</span>
              <span className="monitor__count">{analysis.summary}</span>
              <div className="monitor__cta">
                <button className="btn btn--primary" type="button" onClick={() => navigate(`/review/${taskId}`)}>Review analysis</button>
                <button className="btn btn--secondary" type="button" onClick={beginAnalysis}>Check again</button>
              </div>
            </div>
            <div className="monitor__summary">
              <Figure n={`${analysis.confidence}%`} label="model confidence" />
              <Figure n={analysis.findings.length} label="visible findings" />
              <Figure n={analysis.facts.pages} label="pages inspected" />
            </div>
          </section>
          <section className="found" aria-label="Forgery findings">
            <div className="found__head">
              <div><span className="label">Analysis result</span><p className="found__done-note">Human review is required before acting on this assessment.</p></div>
            </div>
            {analysis.findings.length ? (
              <div className="dtable" style={{ '--dtable-cols': 'minmax(180px,0.8fr) minmax(260px,1.6fr) 160px 36px' }}>
                <div className="dtable__head"><div>Check</div><div>Finding</div><div>Evidence</div><div /></div>
                {analysis.findings.map((finding, index) => (
                  <div className="dtable__row" key={`${finding.stage}-${index}`}>
                    <div><span className="pill pill--pending">{RUN_STAGES.find((item) => item.id === finding.stage)?.label || finding.stage}</span></div>
                    <div><span className="dtable__cell">{finding.summary}</span></div>
                    <div><span className="dtable__cell">{finding.evidence}</span></div>
                    <div />
                  </div>
                ))}
              </div>
            ) : <p className="dtable__empty">No visible tampering indicators were found. This is not proof of authenticity.</p>}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Figure({ n, label, note }) {
  return (
    <div className="monitor__figure">
      <span className="monitor__figure-n">{n}</span>
      <span className="monitor__figure-label">{label}</span>
      {note ? <span className="monitor__figure-note">{note}</span> : null}
    </div>
  );
}

function EmptyUpload({ acceptedExts, fileInputRef, onFiles }) {
  return (
    <>
      <section className="dropzone" id="tuDropzone" aria-labelledby="tuDropTitle" onClick={(e) => { if (!e.target.closest('button')) fileInputRef.current?.click(); }}>
        <span className="dropzone__tile" aria-hidden="true"><Icon name="upload" size={26} /></span>
        <h3 className="dropzone__title" id="tuDropTitle">{NEW_TASK.dropTitle}</h3>
        <p className="dropzone__sub">{NEW_TASK.dropSub}</p>
        <div className="ordivider" aria-hidden="true">
          <span className="ordivider__line" /><span className="ordivider__label">{NEW_TASK.orLabel}</span><span className="ordivider__line" />
        </div>
        <button className="btn btn--secondary" type="button" onClick={() => fileInputRef.current?.click()}>
          <span><Icon name="folder" size={18} /></span>
          <span>{NEW_TASK.dropBrowse}</span>
        </button>
        <p className="dropzone__tip">
          <span><Icon name="info" size={14} /></span>
          <span>{NEW_TASK.dropTip}</span>
        </p>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          accept={acceptedExts.map((e) => `.${e}`).join(',')}
          onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }}
        />
      </section>
      <div className="formatrow" role="list" aria-label="Supported file types">
        {NEW_TASK.formats.map((f, i) => (
          <span key={f.ext} style={{ display: 'contents' }}>
            <span className="formatrow__item" role="listitem"><Icon name={f.icon} size={18} /><span className="formatrow__label">{f.label}</span></span>
            {i < NEW_TASK.formats.length - 1 ? <span className="formatrow__sep" aria-hidden="true" /> : null}
          </span>
        ))}
      </div>
      <p className="dropzone__kinds">{NEW_TASK.dropCap}</p>
    </>
  );
}
