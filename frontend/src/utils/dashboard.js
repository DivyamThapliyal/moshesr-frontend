/* ============================================================================
   Dashboard derivation — a pure rebuild of the My-tasks board from immutable
   sources (authored TASKS + counts) plus this session's records (created tasks,
   live runs, per-task state, decisions). Mirrors js/app.js's init sequence:
   adoptCreated → adoptLiveTasks → syncTaskStates, and the incremental count
   arithmetic that keeps the authored totals honest (All stays 12; only some of
   those tasks have cards) rather than recounting the visible slice.
   ========================================================================== */
import {
  TASKS, FILTER_COUNTS, GREETING, RUN_PROBLEMS, LIVE_RUN,
} from '../data';
import {
  getLiveRuns, getCreatedTasks, getTaskState, liveProgress, isSettled,
} from './storage';

/* The card fields a task with a live run and/or a session state should show. */
export function cardFieldsFor(id, rec) {
  const p = rec ? liveProgress(rec) : null;
  const kind = getTaskState(id) || (p ? (p.finished ? 'pending' : 'checking') : 'new');

  if (kind === 'done') {
    const decided = RUN_PROBLEMS.filter((x) => isSettled(id, x.doc)).length;
    return { status: 'done', stat: `${decided} decided` };
  }
  if (kind === 'pending') {
    const need = RUN_PROBLEMS.filter((x) => !isSettled(id, x.doc)).length;
    return { status: 'pending', stat: `${need} to decide` };
  }
  if (p) return { status: 'progress', stat: LIVE_RUN.checking(p.done, rec.total) };
  return { status: 'new', stat: LIVE_RUN.startingLabel };
}

export function computeDashboard(deletedIds = new Set()) {
  const counts = { ...FILTER_COUNTS };
  const runs = getLiveRuns();
  const created = getCreatedTasks(); // newest-first in storage

  // base authored tasks, deletions applied to both the list and the counts
  const tasks = [];
  TASKS.forEach((t) => {
    if (deletedIds.has(t.id)) {
      counts.all = Math.max(0, (counts.all || 0) - 1);
      const bucket = t.late ? 'late' : t.status;
      if (counts[bucket] != null) counts[bucket] = Math.max(0, counts[bucket] - 1);
      return;
    }
    tasks.push({ ...t });
  });

  // adoptCreated — newest on top, counts incremented (not recounted)
  created.slice().reverse().forEach((t) => {
    if (deletedIds.has(t.id) || tasks.some((x) => x.id === t.id)) return;
    tasks.unshift({ ...t });
    counts.all = (counts.all || 0) + 1;
    counts[t.status] = (counts[t.status] || 0) + 1;
  });

  // adoptLiveTasks — a run becomes a card, or updates the card it already has
  runs.slice().reverse().forEach((rec) => {
    if (deletedIds.has(rec.id)) return;
    const existing = tasks.find((x) => x.id === rec.id);
    const fields = cardFieldsFor(rec.id, rec);
    if (existing) {
      if (existing._liveId) return;
      if (counts[existing.status] != null) counts[existing.status] = Math.max(0, counts[existing.status] - 1);
      existing._liveId = rec.id;
      Object.assign(existing, fields);
      counts[fields.status] = (counts[fields.status] || 0) + 1;
      return;
    }
    tasks.unshift({
      id: rec.id,
      _liveId: rec.id,
      title: rec.title,
      meta: `you uploaded it • today ${GREETING.time}`,
      action: 'View',
      href: `/task/${encodeURIComponent(rec.id)}`,
      ...fields,
    });
    counts.all = (counts.all || 0) + 1;
    counts[fields.status] = (counts[fields.status] || 0) + 1;
  });

  // syncTaskStates — static tasks with a session state reflect it too
  tasks.forEach((t) => {
    const id = t._liveId || t.id;
    if (!t._liveId && !getTaskState(id)) return;
    const rec = runs.find((r) => r.id === id);
    const fields = cardFieldsFor(id, rec);
    if (fields.status !== t.status) {
      if (counts[t.status] != null) counts[t.status] = Math.max(0, counts[t.status] - 1);
      counts[fields.status] = (counts[fields.status] || 0) + 1;
    }
    Object.assign(t, fields);
  });

  return { tasks, counts };
}
