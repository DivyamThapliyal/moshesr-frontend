/* ============================================================================
   LivePanel — the floating panel "Start verification" hands off to. It lives in
   the shell (not any one page) because it must survive navigation: it is driven
   entirely by the sessionStorage records in utils/storage. Progress is derived
   fresh from wall-clock time every tick, so the panel, the task card and the
   task page always agree. Ported from shell.js's renderLivePanel/watchLiveRun.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LIVE_RUN, RUN_PROBLEMS } from '../data';
import {
  getLiveRun, getLiveRuns, liveProgress, patchLiveRun, setLiveRuns,
} from '../utils/storage';
import { useShell } from '../context/ShellContext';
import Icon from './Icon';

export default function LivePanel() {
  const { toast, bumpLive, liveTick } = useShell();
  const [, force] = useState(0);

  /* the engine: tick every second while any run this session is still moving */
  useEffect(() => {
    if (!getLiveRuns().length) return undefined;
    const timer = setInterval(() => {
      const list = getLiveRuns();
      if (!list.length) { force((n) => n + 1); return; }

      // a run that just finished announces itself once, here
      list.forEach((rec) => {
        const p = liveProgress(rec);
        if (p.finished && !rec._announced) {
          patchLiveRun(rec.id, { _announced: true });
          toast(LIVE_RUN.finished(rec.title, RUN_PROBLEMS.length), { icon: 'check' });
        }
      });
      const remaining = getLiveRuns().filter((r) => !(r._announced && liveProgress(r).finished));
      if (remaining.length !== getLiveRuns().length) setLiveRuns(remaining);

      bumpLive();          // let task cards / task page re-read the same list
      force((n) => n + 1);
    }, 1000);
    return () => clearInterval(timer);
    // re-arm whenever a new run is started (liveTick bumped by startLiveRun path)
  }, [liveTick, toast, bumpLive]);

  const rec = getLiveRun();
  if (!rec || rec.hidden) return null;

  const p = liveProgress(rec);
  const leftMs = Math.max(0, rec.durationMs - p.elapsed);
  const sub = p.finished
    ? LIVE_RUN.doneLead
    : p.stopped
      ? `Stopped · ${LIVE_RUN.checking(p.done, rec.total)}`
      : LIVE_RUN.checking(p.done, rec.total);

  return (
    <div className={`livepanel is-up${rec.expanded ? ' is-expanded' : ''}`} id="livePanel">
      <div className="livepanel__top">
        <span className={`livepanel__icon livepanel__icon--${p.finished ? 'done' : 'live'}`} aria-hidden="true">
          {p.finished ? <Icon name="check" size={14} /> : null}
        </span>
        <span className="livepanel__text">
          <span className="livepanel__title" title={rec.title}>{rec.title}</span>
          <span className="livepanel__sub">{sub}</span>
        </span>
        <span className="livepanel__acts">
          <button
            className="livepanel__btn"
            type="button"
            aria-label={rec.expanded ? LIVE_RUN.minimizeLabel : LIVE_RUN.expandLabel}
            onClick={() => { patchLiveRun(rec.id, { expanded: !rec.expanded }); force((n) => n + 1); }}
          >
            <Icon name={rec.expanded ? 'chevron-down' : 'chevron-up'} size={15} />
          </button>
          <button
            className="livepanel__btn"
            type="button"
            aria-label={LIVE_RUN.dismissLabel}
            onClick={() => { patchLiveRun(rec.id, { hidden: true }); force((n) => n + 1); }}
          >
            <Icon name="x" size={14} />
          </button>
        </span>
      </div>
      <div className="livepanel__bar">
        <span
          className={`progress${!p.finished && !p.stopped ? ' progress--live' : ''}`}
          role="progressbar"
          aria-valuenow={p.done}
          aria-valuemin={0}
          aria-valuemax={rec.total}
          aria-label={rec.title}
        >
          <span className="progress__fill" style={{ width: `${Math.round(p.frac * 100)}%` }} />
        </span>
      </div>
      <div className="livepanel__foot">
        <span className="livepanel__left">
          {p.finished ? LIVE_RUN.doneSub(rec.total) : LIVE_RUN.leftLabel(leftMs)}
        </span>
        <Link className="linkbtn" to={`/task/${encodeURIComponent(rec.id)}`}>{LIVE_RUN.viewDetails}</Link>
      </div>
    </div>
  );
}
