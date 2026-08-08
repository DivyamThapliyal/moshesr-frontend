/* ============================================================================
   New verification — three states in one screen (drop zone → named list →
   list-with-refusals), real folder/zip intake, a suggested-but-editable task
   name, and Create, which hands the task to My tasks via sessionStorage and
   opens it. Ported from new.html + js/new.js. The name is validated with Zod on
   create (Phase 12).
   ========================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { NEW_TASK, GREETING } from '../data';
import { addCreatedTask, setJustCreated } from '../utils/storage';
import { createTask, uploadCertificate } from '../services';
import useTopbar from '../hooks/useTopbar';
import { useShell } from '../context/ShellContext';
import { Crumbs } from '../components/Topbar';
import Icon from '../components/Icon';

const ext = (name) => (name.split('.').pop() || '').toLowerCase();
const accepted = Object.keys(NEW_TASK.kinds);
const nameSchema = z.string().trim().max(120, 'That name is too long (120 characters max)');

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function shortDate() {
  const p = String(GREETING.date).split(' ');
  return p.length >= 3 ? `${p[1]} ${p[2].slice(0, 3)}` : GREETING.date;
}

export default function NewVerification() {
  const lead = useMemo(
    () => <Crumbs trail={[{ label: 'My tasks', href: '/' }, { label: 'New verification' }]} />,
    [],
  );
  useTopbar({ nav: 'tasks', crumbs: true, lead });
  const navigate = useNavigate();
  const { confirm, toast, say } = useShell();

  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const seq = useRef(0);
  const dragDepth = useRef(0);
  const leaving = useRef(false);
  const fileInputRef = useRef(null);

  const added = files.filter((f) => f.state === 'added');
  const failed = files.filter((f) => f.state === 'failed');
  const totalBytes = added.reduce((n, f) => n + f.size, 0);

  const suggestName = useCallback((list) => {
    const ok = list.filter((f) => f.state === 'added');
    const folder = ok.find((f) => f.folder);
    const zip = ok.length === 1 && ext(ok[0].name) === 'zip' ? ok[0] : null;
    const src = folder || zip;
    let stem = NEW_TASK.nameFallback;
    if (src) {
      stem = src.folder || src.name.replace(/\.[^.]+$/, '');
      stem = stem.replace(/_+/g, ' ').trim();
    }
    return `${stem}, ${shortDate()}`;
  }, []);

  // keep the suggested name in step until the officer types their own
  useEffect(() => {
    if (!nameTouched) setName(suggestName(files));
  }, [files, nameTouched, suggestName]);

  const intake = useCallback((list) => {
    if (!list.length) return;
    let ok = 0; let bad = 0;
    setFiles((prev) => {
      const next = [...prev];
      const addedNames = () => next.filter((f) => f.state === 'added');
      list.forEach((file) => {
        const rec = {
          uid: `f${++seq.current}`,
          name: file.name,
          size: file.size,
          folder: file.webkitRelativePath ? file.webkitRelativePath.split('/')[0] : null,
          state: 'added',
          reason: null,
          file, // kept so Create can persist the real bytes to the backend
        };
        if (addedNames().some((f) => f.name === rec.name && f.size === rec.size)) { rec.state = 'failed'; rec.reason = NEW_TASK.reject.dupe; }
        else if (!accepted.includes(ext(rec.name))) { rec.state = 'failed'; rec.reason = NEW_TASK.reject.kind; }
        else if (rec.size > NEW_TASK.maxBytes) { rec.state = 'failed'; rec.reason = NEW_TASK.reject.size; }
        if (rec.state === 'failed') bad++; else ok++;
        next.push(rec);
      });
      return next;
    });
    toast(bad ? `${ok} ${ok === 1 ? 'file' : 'files'} added, ${bad} could not be added` : `${ok} ${ok === 1 ? 'file' : 'files'} added`,
      { icon: bad ? 'alert-circle' : 'check', tone: bad ? 'danger' : null });
  }, [toast]);

  const removeFile = (uid) => {
    const f = files.find((x) => x.uid === uid);
    if (!f) return;
    setFiles((prev) => prev.filter((x) => x.uid !== uid));
    toast(`${f.name} removed`, { icon: 'trash-2' });
  };
  const removeFailed = () => {
    const n = failed.length;
    if (!n) return;
    setFiles((prev) => prev.filter((f) => f.state !== 'failed'));
    toast(`${n} ${n === 1 ? 'file' : 'files'} removed`, { icon: 'trash-2' });
  };

  /* ---- drag + drop (whole page) ------------------------------------------- */
  const walk = (entry, depth, out, folderName) => new Promise((done) => {
    if (!entry || depth > 4) return done();
    if (entry.isFile) {
      return entry.file((f) => {
        if (folderName && !f.webkitRelativePath) {
          try { Object.defineProperty(f, 'webkitRelativePath', { value: `${folderName}/${f.name}` }); } catch { /* ignore */ }
        }
        out.push(f); done();
      }, done);
    }
    const reader = entry.createReader();
    const batch = () => reader.readEntries((entries) => {
      if (!entries.length) return done();
      Promise.all(entries.map((e) => walk(e, depth + 1, out, folderName))).then(batch, done);
    }, done);
    return batch();
  });

  useEffect(() => {
    const over = (on) => {
      const empty = files.length === 0;
      document.getElementById('dropzone')?.classList.toggle('is-over', on && empty);
      document.getElementById('newtask')?.classList.toggle('is-dragging', on && !empty);
    };
    const onEnterOver = (e) => {
      if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      if (e.type === 'dragenter') dragDepth.current++;
      over(true);
    };
    const onLeave = () => { if (--dragDepth.current <= 0) { dragDepth.current = 0; over(false); } };
    const onDrop = async (e) => {
      e.preventDefault(); dragDepth.current = 0; over(false);
      const dt = e.dataTransfer; if (!dt) return;
      const items = [...(dt.items || [])].filter((i) => i.kind === 'file').map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null));
      const dirs = items.filter((en) => en && en.isDirectory);
      const folderName = dirs.length === 1 && items.length === 1 ? dirs[0].name : null;
      if (items.some(Boolean)) {
        const out = [];
        for (const en of items) await walk(en, 0, out, folderName); // eslint-disable-line no-await-in-loop
        intake(out);
        return;
      }
      intake([...(dt.files || [])]);
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
  }, [files.length, intake]); // eslint-disable-line react-hooks/exhaustive-deps

  // warn before leaving with queued files (routes this page does not own)
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (leaving.current || !files.length) return;
      e.preventDefault(); e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [files.length]);

  /* ---- create / cancel ---------------------------------------------------- */
  const create = () => {
    const docs = added;
    if (!docs.length) return;
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) { toast(parsed.error.issues[0].message, { icon: 'alert-circle', tone: 'danger' }); return; }
    const title = parsed.data || suggestName(files);
    const id = `t-new-${Date.now().toString(36)}`;
    addCreatedTask({
      id, status: 'new', title, count: docs.length,
      meta: `you uploaded it • today ${GREETING.time}`,
      stat: `${docs.length} to check`,
      action: 'Start', href: `/task/${encodeURIComponent(id)}`,
    });
    setJustCreated(id);
    // Best-effort: persist the task and its real files to the FastAPI backend so
    // the uploads are stored permanently and reopenable. Fire-and-forget with a
    // graceful fallback — if the API is unreachable the app still works offline
    // from sessionStorage (the fixture flow), so navigation is never blocked.
    persistToBackend(id, title, docs);
    leaving.current = true;
    navigate(`/task/${encodeURIComponent(id)}`);
  };

  async function persistToBackend(id, title, docs) {
    try {
      await createTask({ id, title, status: 'new' });
      for (const rec of docs) {
        if (rec.file) {
          // eslint-disable-next-line no-await-in-loop
          await uploadCertificate(id, rec.file).catch(() => {});
        }
      }
    } catch {
      /* backend offline — the app continues in fixture mode */
    }
  }
  const cancel = async () => {
    if (!files.length) { leaving.current = true; navigate('/'); return; }
    const ok = await confirm({
      title: 'Leave without creating the task?',
      body: `The ${added.length} ${added.length === 1 ? 'certificate' : 'certificates'} you added will not be uploaded, and nothing will appear in your queue. The files on your computer are untouched.`,
      confirm: 'Leave', cancel: 'Stay here', icon: 'alert-triangle',
    });
    if (!ok) { say('Still here'); return; }
    leaving.current = true;
    navigate('/');
  };

  /* ---- preview rows: always surface every refusal ------------------------- */
  const previewRows = () => {
    const bad = failed;
    const okCap = Math.max(0, NEW_TASK.previewRows - bad.length);
    const shown = new Set([...bad, ...added.slice(0, okCap)].map((f) => f.uid));
    return files.filter((f) => shown.has(f.uid));
  };

  const total = files.length;
  const good = added.length;
  const bad = failed.length;
  const hasFiles = total > 0;
  const rows = expanded ? files : previewRows();
  const rest = total - rows.length;
  const badCols = bad > 0;

  const kindIcon = (f) => NEW_TASK.kinds[ext(f.name)] || 'file-text';
  const metaText = total === 0 ? '' : bad === 0 ? NEW_TASK.metaClean(good, fmtSize(totalBytes)) : NEW_TASK.metaBad(total, good);

  const off = good === 0;
  const runLead = off ? NEW_TASK.noneLead : NEW_TASK.readyLead(good);
  const runSub = off ? (bad ? NEW_TASK.noneSubBad : NEW_TASK.noneSubEmpty) : (bad ? NEW_TASK.readySubBad(bad) : NEW_TASK.readySubClean);

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="newtask" id="newtask">
      <section className="pagehead" aria-labelledby="newTitle">
        <div className="pagehead__row">
          <h2 className="pagehead__title" id="newTitle">{NEW_TASK.title}</h2>
          <span className="pagehead__count" id="newMeta">{metaText}</span>
        </div>
        <p className="pagehead__meta" id="newSubtitle" hidden={hasFiles}>{NEW_TASK.subtitle}</p>
      </section>

      {/* state 1 — drop zone */}
      <section className="dropzone" id="dropzone" aria-labelledby="dropTitle" hidden={hasFiles} onClick={(e) => { if (!e.target.closest('button')) openPicker(); }}>
        <span className="dropzone__tile" aria-hidden="true"><Icon name="upload" size={26} /></span>
        <h3 className="dropzone__title" id="dropTitle">{NEW_TASK.dropTitle}</h3>
        <p className="dropzone__sub" id="dropSub">{NEW_TASK.dropSub}</p>
        <div className="ordivider" aria-hidden="true">
          <span className="ordivider__line" /><span className="ordivider__label">{NEW_TASK.orLabel}</span><span className="ordivider__line" />
        </div>
        <button className="btn btn--secondary" type="button" onClick={openPicker}>
          <span><Icon name="folder" size={18} /></span>
          <span>{NEW_TASK.dropBrowse}</span>
        </button>
        <p className="dropzone__tip" id="dropTip">
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
          accept={accepted.map((e) => `.${e}`).join(',')}
          onChange={(e) => { intake([...e.target.files]); e.target.value = ''; }}
        />
      </section>

      <div className="formatrow" id="formats" role="list" aria-label="Supported file types" hidden={hasFiles}>
        {NEW_TASK.formats.map((f, i) => (
          <span key={f.ext} style={{ display: 'contents' }}>
            <span className="formatrow__item" role="listitem"><Icon name={f.icon} size={18} /><span className="formatrow__label">{f.label}</span></span>
            {i < NEW_TASK.formats.length - 1 ? <span className="formatrow__sep" aria-hidden="true" /> : null}
          </span>
        ))}
      </div>
      <p className="dropzone__kinds" id="dropCap" hidden={hasFiles}>{NEW_TASK.dropCap}</p>

      {/* state 2 — the name row */}
      <div className="namesection" id="namesection" hidden={!hasFiles}>
        <label className="label" htmlFor="taskName" id="nameLabelText">{NEW_TASK.nameLabel}</label>
        <div className="namerow">
          <div className="field namerow__field">
            <input
              id="taskName"
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={name}
              onChange={(e) => { setNameTouched(true); setName(e.target.value); }}
              onBlur={(e) => { if (!e.target.value.trim()) { setNameTouched(false); setName(suggestName(files)); } }}
            />
          </div>
          <p className="namerow__hint" id="nameHint">{NEW_TASK.nameHint}</p>
          <button className="btn btn--secondary btn--dashed namerow__add" type="button" onClick={openPicker}>
            <span><Icon name="plus" size={16} /></span>
            <span>{NEW_TASK.addMore}</span>
          </button>
        </div>
      </div>

      {/* state 3 — refusals notice */}
      <div id="notice">
        {bad ? (
          <div className="notice notice--warn" role="status">
            <span className="notice__icon" aria-hidden="true"><Icon name="alert-circle" size={16} /></span>
            <span className="notice__lead">{NEW_TASK.warnLead(bad)}</span>
            <span className="notice__body">{NEW_TASK.warnBody}</span>
            <button className="linkbtn notice__act" type="button" onClick={removeFailed}>{NEW_TASK.warnRemove(bad)}</button>
          </div>
        ) : null}
      </div>

      {/* the file table */}
      <section
        className="filetable"
        id="filetable"
        aria-label="Files added"
        hidden={!hasFiles}
        data-bad={badCols ? '1' : ''}
        style={{ '--filetable-cols': badCols ? 'minmax(0,1fr) 90px 168px 28px' : 'minmax(0,1fr) 90px 28px' }}
      >
        {hasFiles ? (
          <>
            <div className="filetable__head">
              <span>{NEW_TASK.colFile}</span>
              <span>{NEW_TASK.colSize}</span>
              {badCols ? <span>{NEW_TASK.colStatus}</span> : null}
              <span />
            </div>
            {rows.map((f) => {
              const warn = f.state === 'failed';
              return (
                <div className={`filetable__row${warn ? ' is-warn' : ''}`} data-file={f.uid} key={f.uid}>
                  <div className="filetable__cert">
                    <span className="filetable__icon"><Icon name={kindIcon(f)} size={18} /></span>
                    <span className="filetable__name" title={f.name}>{f.name}</span>
                  </div>
                  <span className="filetable__size">{fmtSize(f.size)}</span>
                  {warn || badCols ? (
                    <span className="filetable__status">
                      {warn ? <span className="pill pill--pending">{f.reason}</span> : <span className="pill pill--done">{NEW_TASK.addedLabel}</span>}
                    </span>
                  ) : null}
                  <button className="rowdel" type="button" aria-label={`Remove ${f.name}`} onClick={() => removeFile(f.uid)}><Icon name="x" size={16} /></button>
                </div>
              );
            })}
            {rest > 0 || expanded ? (
              <p className="filetable__more">
                {rest > 0 ? <span>{NEW_TASK.moreCount(rest)}</span> : null}
                <button className="linkbtn" type="button" onClick={() => setExpanded((v) => !v)}>{expanded ? NEW_TASK.showLess : NEW_TASK.showAll(total)}</button>
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {/* sticky create bar */}
      <section className="runbar" id="runbar" aria-label="Create the task" hidden={!hasFiles}>
        {hasFiles ? (
          <>
            <div className="runbar__info">
              <p className="runbar__est">{runLead}</p>
              <p className="runbar__sub">{runSub}</p>
            </div>
            <div className="runbar__actions">
              <button className="btn btn--ghost" type="button" onClick={cancel}>Cancel</button>
              <button className="btn btn--primary" type="button" aria-disabled={off || undefined} tabIndex={off ? -1 : undefined} onClick={() => { if (!off) create(); }}>{NEW_TASK.ctaStart}</button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
