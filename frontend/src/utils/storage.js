/* ============================================================================
   STORAGE — the persistence engines ported verbatim from js/shell.js.
   Live runs, decisions and per-task lifecycle state survive navigation the same
   way the original did: sessionStorage for run/decision/task state (per-tab),
   localStorage for durable preferences (theme). Kept as pure functions so any
   component or hook can read/write the same records without a race.
   ========================================================================== */
import { LIVE_RUN } from '../data';

export const RAIL_KEY = 'mohsar.rail';
export const THEME_KEY = 'mohsar.theme';
const LIVE_KEY = 'mohsar.liveTasks';
const DECISIONS_KEY = 'mohsar.decisions';
const TASK_STATE_KEY = 'mohsar.taskState';
const CREATED_KEY = 'mohsar.created';
const LOCAL_DOCUMENT_KEY = 'mohsar.localDocuments';
const ANALYSIS_KEY = 'mohsar.forgeryAnalyses';

/* ---------------------------------------------------------------- LIVE RUNS */
export function getLiveRuns() {
  try {
    const raw = sessionStorage.getItem(LIVE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function setLiveRuns(list) {
  try { sessionStorage.setItem(LIVE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
export function getLiveRun() {
  const list = getLiveRuns();
  return list.length ? list[list.length - 1] : null;
}
export function patchLiveRun(id, patch) {
  const list = getLiveRuns();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  setLiveRuns(list);
}
export function startLiveRun({ id, title, total }) {
  const durationMs = LIVE_RUN.durationFor(total);
  const list = getLiveRuns();
  list.push({ id, title, total, startedAt: Date.now(), durationMs, expanded: false, hidden: false });
  setLiveRuns(list);
}
export function stopLiveRun(id) {
  patchLiveRun(id, { stoppedAt: Date.now() });
}

/* Pure: (record, now) in, a snapshot out — reads nothing, writes nothing. */
export function liveProgress(rec, now) {
  const clockNow = now == null ? Date.now() : now;
  const effectiveNow = rec.stoppedAt ? Math.min(clockNow, rec.stoppedAt) : clockNow;
  const elapsed = Math.max(0, effectiveNow - rec.startedAt);
  const frac = rec.durationMs ? Math.min(1, elapsed / rec.durationMs) : 1;
  const done = Math.min(rec.total, Math.round(frac * rec.total));
  return {
    frac, done, remaining: rec.total - done, elapsed,
    finished: frac >= 1,
    stopped: !!rec.stoppedAt && frac < 1,
  };
}

/* ---------------------------------------------------------------- DECISIONS */
export function getDecisions(taskId) {
  try {
    const all = JSON.parse(sessionStorage.getItem(DECISIONS_KEY) || '{}');
    return all[taskId] || {};
  } catch {
    return {};
  }
}
export function addDecision(taskId, docId, entry) {
  try {
    const all = JSON.parse(sessionStorage.getItem(DECISIONS_KEY) || '{}');
    all[taskId] = all[taskId] || {};
    all[taskId][docId] = [...(all[taskId][docId] || []), entry];
    sessionStorage.setItem(DECISIONS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
export function popDecision(taskId, docId) {
  try {
    const all = JSON.parse(sessionStorage.getItem(DECISIONS_KEY) || '{}');
    if (!all[taskId] || !all[taskId][docId]) return;
    all[taskId][docId].pop();
    if (!all[taskId][docId].length) delete all[taskId][docId];
    sessionStorage.setItem(DECISIONS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
export function currentDecision(taskId, docId) {
  const list = getDecisions(taskId)[docId];
  return list && list.length ? list[list.length - 1] : null;
}
export function isSettled(taskId, docId) {
  const history = getDecisions(taskId)[docId];
  if (!history || !history.length) return false;
  const lastReview = [...history].reverse().find((h) => h.source === 'review');
  if (!lastReview) return false;
  const cur = history[history.length - 1];
  if (cur !== lastReview && cur.source === 'recheck' && cur.verdict !== lastReview.verdict) return false;
  return true;
}

/* --------------------------------------------------------------- TASK STATE */
export function getTaskState(id) {
  try { return JSON.parse(sessionStorage.getItem(TASK_STATE_KEY) || '{}')[id] || null; }
  catch { return null; }
}
export function setTaskState(id, kind) {
  try {
    const all = JSON.parse(sessionStorage.getItem(TASK_STATE_KEY) || '{}');
    all[id] = kind;
    sessionStorage.setItem(TASK_STATE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

/* --------------------------------------------------- PER-TASK CERTIFICATES */
const TASK_DOCS_KEY = 'mohsar.taskDocs';
export function loadStoredDocs(id) {
  try {
    const all = JSON.parse(sessionStorage.getItem(TASK_DOCS_KEY) || '{}');
    return Array.isArray(all[id]) ? all[id] : [];
  } catch { return []; }
}
export function saveStoredDocs(id, docs) {
  try {
    const all = JSON.parse(sessionStorage.getItem(TASK_DOCS_KEY) || '{}');
    all[id] = docs;
    sessionStorage.setItem(TASK_DOCS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

/* Three per-task id-lists: which certs were actually run (verified), which ids
   the current run targets (runTarget → merged into verified when it finishes),
   and which ids landed after the task first reached pending/done (addedAfter). */
function idStore(key) {
  return {
    load: (id) => { try { const a = JSON.parse(sessionStorage.getItem(key) || '{}'); return Array.isArray(a[id]) ? a[id] : null; } catch { return null; } },
    save: (id, ids) => { try { const a = JSON.parse(sessionStorage.getItem(key) || '{}'); a[id] = ids; sessionStorage.setItem(key, JSON.stringify(a)); } catch { /* ignore */ } },
  };
}
export const VERIFIED_STORE = idStore('mohsar.taskVerified');
export const RUN_TARGET_STORE = idStore('mohsar.taskRunTarget');
export const ADDED_AFTER_STORE = idStore('mohsar.taskAddedAfter');

/* Keeps the My-tasks card for a task built here in step with what is on it. */
export function saveCreatedCard(taskId, fields) {
  try {
    const made = JSON.parse(sessionStorage.getItem(CREATED_KEY) || '[]');
    const i = made.findIndex((x) => x.id === taskId);
    const merged = { ...(i >= 0 ? made[i] : {}), ...fields };
    if (i >= 0) made[i] = merged; else made.unshift(merged);
    sessionStorage.setItem(CREATED_KEY, JSON.stringify(made));
  } catch { /* ignore */ }
}

/* True only on the ONE load that lands here straight from New verification. */
export function takeJustCreated(taskId) {
  try {
    if (sessionStorage.getItem('mohsar.justCreated') !== taskId) return false;
    sessionStorage.removeItem('mohsar.justCreated');
    return true;
  } catch { return false; }
}
export function setJustCreated(taskId) {
  try { sessionStorage.setItem('mohsar.justCreated', taskId); } catch { /* ignore */ }
}

/* ---------------------------------------------- TASKS CREATED THIS SESSION */
export function getCreatedTasks() {
  try {
    const list = JSON.parse(sessionStorage.getItem(CREATED_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function addCreatedTask(task) {
  const list = getCreatedTasks();
  list.unshift(task);
  try { sessionStorage.setItem(CREATED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/* --------------------------------------- LOCAL DOCUMENT FORGERY ANALYSIS */
function taskRecord(key, taskId, value) {
  try {
    const all = JSON.parse(sessionStorage.getItem(key) || '{}');
    if (value !== undefined) {
      all[taskId] = value;
      sessionStorage.setItem(key, JSON.stringify(all));
    }
    return all[taskId] || null;
  } catch {
    return null;
  }
}

export const saveLocalDocument = (taskId, document) => taskRecord(LOCAL_DOCUMENT_KEY, taskId, document);
export const loadLocalDocument = (taskId) => taskRecord(LOCAL_DOCUMENT_KEY, taskId);
export const saveForgeryAnalysis = (taskId, analysis) => taskRecord(ANALYSIS_KEY, taskId, analysis);
export const loadForgeryAnalysis = (taskId) => taskRecord(ANALYSIS_KEY, taskId);
