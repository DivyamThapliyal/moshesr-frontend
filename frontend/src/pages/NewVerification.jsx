import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { GREETING, NEW_TASK } from '../data';
import {
  addCreatedTask, saveLocalDocument, setJustCreated,
} from '../utils/storage';
import useTopbar from '../hooks/useTopbar';
import { useShell } from '../context/ShellContext';
import { Crumbs } from '../components/Topbar';
import Icon from '../components/Icon';

const SUPPORTED = ['pdf', 'jpg', 'jpeg', 'png', 'tif', 'tiff'];
const nameSchema = z.string().trim().max(120, 'That name is too long (120 characters max)');
const filename = (path) => path.trim().split(/[\\/]/).pop() || '';
const extension = (path) => (filename(path).split('.').pop() || '').toLowerCase();

function shortDate() {
  const parts = String(GREETING.date).split(' ');
  return parts.length >= 3 ? `${parts[1]} ${parts[2].slice(0, 3)}` : GREETING.date;
}

function suggestedName(path) {
  const stem = filename(path).replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim();
  return `${stem || NEW_TASK.nameFallback}, ${shortDate()}`;
}

export default function NewVerification() {
  const lead = useMemo(
    () => <Crumbs trail={[{ label: 'My tasks', href: '/' }, { label: 'New verification' }]} />,
    [],
  );
  useTopbar({ nav: 'tasks', crumbs: true, lead });
  const navigate = useNavigate();
  const { confirm, toast, say } = useShell();
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const leaving = useRef(false);
  const documentName = filename(path);
  const hasPath = path.trim().length > 0;
  const supported = SUPPORTED.includes(extension(path));

  useEffect(() => {
    if (!nameTouched) setName(suggestedName(path));
  }, [path, nameTouched]);

  useEffect(() => {
    const warn = (event) => {
      if (leaving.current || !hasPath) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasPath]);

  const create = () => {
    if (!hasPath) return;
    const normalizedPath = path.trim().replace(/^"|"$/g, '');
    if (!/^[a-zA-Z]:[\\/]|^\\\\/.test(normalizedPath)) {
      toast('Enter an absolute Windows file path.', { icon: 'alert-circle', tone: 'danger' });
      return;
    }
    if (!supported) {
      toast('Use a PDF, JPG, JPEG, PNG, TIF, or TIFF document.', { icon: 'alert-circle', tone: 'danger' });
      return;
    }
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      toast(parsed.error.issues[0].message, { icon: 'alert-circle', tone: 'danger' });
      return;
    }
    const id = `t-new-${Date.now().toString(36)}`;
    const title = parsed.data || suggestedName(path);
    const document = {
      id: 'local-document',
      path: normalizedPath,
      name: documentName,
      type: documentName.toLowerCase().includes('transcript') ? 'transcript' : 'unknown',
      institution: null,
      country: null,
      pages: 1,
    };
    saveLocalDocument(id, document);
    addCreatedTask({
      id,
      status: 'new',
      title,
      count: 1,
      meta: `local document reference | today ${GREETING.time}`,
      stat: '1 to check',
      action: 'Start',
      href: `/task/${encodeURIComponent(id)}`,
    });
    setJustCreated(id);
    leaving.current = true;
    navigate(`/task/${encodeURIComponent(id)}`);
  };

  const cancel = async () => {
    if (!hasPath) {
      leaving.current = true;
      navigate('/');
      return;
    }
    const ok = await confirm({
      title: 'Leave without creating the task?',
      body: 'The local path reference will be discarded. The file on your computer is untouched.',
      confirm: 'Leave',
      cancel: 'Stay here',
      icon: 'alert-triangle',
    });
    if (!ok) { say('Still here'); return; }
    leaving.current = true;
    navigate('/');
  };

  return (
    <div className="newtask" id="newtask">
      <section className="pagehead" aria-labelledby="newTitle">
        <div className="pagehead__row">
          <h2 className="pagehead__title" id="newTitle">{NEW_TASK.title}</h2>
          <span className="pagehead__count">{hasPath ? '1 local document' : ''}</span>
        </div>
        <p className="pagehead__meta">Enter a document path on the machine running the backend.</p>
      </section>

      <section className="dropzone" aria-labelledby="pathTitle">
        <span className="dropzone__tile" aria-hidden="true"><Icon name="file-text" size={26} /></span>
        <h3 className="dropzone__title" id="pathTitle">Local document path</h3>
        <p className="dropzone__sub">The browser sends only this path reference to FastAPI. No document copy is stored by the app.</p>
        <div className="field" style={{ width: 'min(680px, 100%)' }}>
          <label className="visually-hidden" htmlFor="documentPath">Absolute document path</label>
          <input
            id="documentPath"
            type="text"
            autoComplete="off"
            spellCheck="false"
            placeholder="C:\Documents\certificate.pdf"
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />
        </div>
        <p className="dropzone__tip">
          <span><Icon name="info" size={14} /></span>
          <span>Supported: PDF, JPG, JPEG, PNG, TIF, TIFF. Maximum 10 MB.</span>
        </p>
      </section>

      {hasPath ? (
        <>
          <div className="namesection">
            <label className="label" htmlFor="taskName">Task name</label>
            <div className="namerow">
              <div className="field namerow__field">
                <input
                  id="taskName"
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(event) => { setNameTouched(true); setName(event.target.value); }}
                />
              </div>
              <p className="namerow__hint">You can rename this verification.</p>
            </div>
          </div>

          <section className="filetable" aria-label="Local document" style={{ '--filetable-cols': 'minmax(0,1fr) 168px 28px' }}>
            <div className="filetable__head"><span>File</span><span>Status</span><span /></div>
            <div className={`filetable__row${supported ? '' : ' is-warn'}`}>
              <div className="filetable__cert">
                <span className="filetable__icon"><Icon name="file-text" size={18} /></span>
                <span className="filetable__name" title={path}>{documentName}</span>
              </div>
              <span className="filetable__status">
                <span className={`pill pill--${supported ? 'done' : 'pending'}`}>{supported ? 'Path ready' : 'Unsupported type'}</span>
              </span>
              <button className="rowdel" type="button" aria-label="Clear document path" onClick={() => setPath('')}><Icon name="x" size={16} /></button>
            </div>
          </section>

          <section className="runbar" aria-label="Create the task">
            <div className="runbar__info">
              <p className="runbar__est">Ready to create one verification task</p>
              <p className="runbar__sub">The backend validates the path when verification starts.</p>
            </div>
            <div className="runbar__actions">
              <button className="btn btn--ghost" type="button" onClick={cancel}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={create}>Create task</button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
