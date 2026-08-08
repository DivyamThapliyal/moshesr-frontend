/* ============================================================================
   Dashboard — the My-tasks board. Owns the filter tabs, the view switch, the
   debounced search and the cards; the rail and top bar belong to the shell.
   The board is rebuilt each render from immutable data plus this session's
   records (see utils/dashboard), and re-derives every second so a live run's
   card advances without a reload. Ported from index.html + js/app.js.
   ========================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTopbar from '../hooks/useTopbar';
import { useShell } from '../context/ShellContext';
import { TopbarTitle } from '../components/Topbar';
import { computeDashboard } from '../utils/dashboard';
import Greeting from '../components/dashboard/Greeting';
import SummaryStrip from '../components/dashboard/SummaryStrip';
import Toolbar from '../components/dashboard/Toolbar';
import TaskCard from '../components/dashboard/TaskCard';
import CardMenu from '../components/dashboard/CardMenu';

export default function Dashboard() {
  const lead = useMemo(() => <TopbarTitle text="My tasks" />, []);
  useTopbar({ nav: 'tasks', lead });
  const navigate = useNavigate();
  const { confirm, toast, say, liveTick } = useShell();

  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [deletedIds, setDeletedIds] = useState(() => new Set());
  const [menu, setMenu] = useState(null); // { id, anchor }
  const searchRef = useRef(null);

  // debounce the search 120ms, exactly as the original
  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 120);
    return () => clearTimeout(t);
  }, [input]);

  const { tasks, counts } = useMemo(
    () => computeDashboard(deletedIds),
    [deletedIds, liveTick],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => filter === 'all' || t.status === filter)
      .filter((t) => !q || `${t.title} ${t.meta} ${t.stat}`.toLowerCase().includes(q));
  }, [tasks, filter, query]);

  // politely announce the count changing, without stealing focus
  useEffect(() => {
    say(`${visible.length} ${visible.length === 1 ? 'task' : 'tasks'} shown`);
  }, [visible.length, say]);

  const onNew = () => navigate(`/task/t-new-${Date.now().toString(36)}`);

  const closeMenu = useCallback((refocus) => {
    setMenu((m) => {
      if (refocus && m?.anchor) m.anchor.focus();
      return null;
    });
  }, []);

  const onMore = useCallback((id, anchor) => {
    setMenu((m) => (m && m.id === id ? null : { id, anchor }));
  }, []);

  const deleteTask = useCallback(async (id) => {
    const t = visible.find((x) => x.id === id) || tasks.find((x) => x.id === id);
    if (!t) return;
    const ok = await confirm({
      title: 'Delete this task?',
      body: (
        <>
          <b>{t.title}</b>
          {' and everything in it will be removed from your queue. '}
          Anything already signed off stays on the record.
        </>
      ),
      confirm: 'Delete task',
    });
    if (!ok) { say('Nothing deleted'); return; }
    setDeletedIds((prev) => new Set(prev).add(id));
    toast(`${t.title} deleted`, { icon: 'trash-2' });
  }, [visible, tasks, confirm, say, toast]);

  const onMenuSelect = useCallback((m) => {
    const id = menu?.id;
    closeMenu(true);
    if (m.id === 'delete') { deleteTask(id); return; }
    say(`${m.label}: ${id}`);
  }, [menu, closeMenu, deleteTask, say]);

  const empty = visible.length === 0;

  return (
    <>
      <Greeting query={input} onQuery={setInput} searchRef={searchRef} />
      <SummaryStrip />
      <Toolbar
        filter={filter}
        counts={counts}
        onFilter={setFilter}
        view={view}
        onView={setView}
        onNew={onNew}
      />

      <section className={`tasks${empty ? ' is-empty' : ''}`} id="tasks" aria-label="Tasks">
        <div className="task-grid" id="taskGrid" data-view={view}>
          {visible.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              menuOpen={menu?.id === t.id}
              onMore={onMore}
              onDelete={deleteTask}
            />
          ))}
        </div>
        <p className="tasks__empty">
          Nothing matches that. Clear the search or choose a different filter.
        </p>
        <p className="tasks__note" id="tasksNote" hidden={empty}>
          Ordered by what needs attention first: late, then pending, then in progress, then new.
        </p>
      </section>

      {menu ? (
        <CardMenu anchor={menu.anchor} onClose={closeMenu} onSelect={onMenuSelect} />
      ) : null}
    </>
  );
}
