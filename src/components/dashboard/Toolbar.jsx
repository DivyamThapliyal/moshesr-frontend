/* Toolbar — the filter tablist (arrow keys move between tabs), the list/grid
   view switch, and the New verification action. Ported from index.html's
   toolbar + js/app.js's tab/view behaviour. */
import { useRef } from 'react';
import { FILTERS } from '../../data';
import Icon from '../Icon';

export default function Toolbar({ filter, counts, onFilter, view, onView, onNew }) {
  const tabsRef = useRef(null);

  const onTabKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...tabsRef.current.querySelectorAll('.tab')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    onFilter(next.dataset.filter);
  };

  return (
    <div className="toolbar">
      <div className="toolbar__tabs" id="tabs" role="tablist" aria-label="Filter tasks" ref={tabsRef} onKeyDown={onTabKey}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`tab${f.id === filter ? ' is-active' : ''}`}
            role="tab"
            data-filter={f.id}
            aria-selected={f.id === filter}
            onClick={() => onFilter(f.id)}
          >
            <span className="tab__label" data-label={f.label}>{f.label}</span>
            <span className="tab__count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="toolbar__end">
        <div className="toolbar__views" role="group" aria-label="Change layout">
          <button
            className={`icon-btn${view === 'list' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={view === 'list'}
            aria-label="List view"
            onClick={() => onView('list')}
          >
            <Icon name="list" size={22} />
          </button>
          <button
            className={`icon-btn${view === 'grid' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={view === 'grid'}
            aria-label="Grid view"
            onClick={() => onView('grid')}
          >
            <Icon name="grid" size={22} />
          </button>
        </div>
        <button className="btn btn--primary" type="button" id="newTaskBtn" onClick={onNew}>
          New verification
        </button>
      </div>
    </div>
  );
}
