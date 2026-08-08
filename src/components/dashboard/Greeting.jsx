/* Greeting — salutation, live date/time, and the page-level search that acts on
   THIS list. The date and time reflect the real current moment (updated every
   30s) rather than the pinned reference timestamp. */
import { useEffect, useState } from 'react';
import { USER } from '../../data';
import Icon from '../Icon';

function salutation(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Greeting({ query, onQuery, searchRef }) {
  const now = useNow();
  // built manually to match the original format exactly: "Monday 3 August 2026"
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = now.toLocaleDateString('en-GB', { month: 'long' });
  const date = `${weekday} ${now.getDate()} ${month} ${now.getFullYear()}`;
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="greeting" aria-labelledby="greetingTitle">
      <div className="greeting__text">
        <h2 className="greeting__title" id="greetingTitle">{`${salutation(now.getHours())}, ${USER.firstName}`}</h2>
        <p className="greeting__meta" id="greetingMeta">{`${date} • ${time}`}</p>
      </div>

      <div className="field greeting__search">
        <span className="field__icon"><Icon name="search" size={18} /></span>
        <label className="visually-hidden" htmlFor="search">Search your tasks</label>
        <input
          id="search"
          type="search"
          data-pagesearch
          placeholder="Search your tasks"
          autoComplete="off"
          spellCheck="false"
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onQuery(''); }}
        />
        <kbd className="field__kbd" aria-hidden="true">/</kbd>
      </div>
    </section>
  );
}
