/* ============================================================================
   Topbar — carries only what says which page you are on. A page passes a
   `lead`: a title (destination pages) or a breadcrumb (pages you arrive at).
   Ported from shell.js's topbarHTML / titleHTML / crumbsHTML.
   ========================================================================== */
import { Link } from 'react-router-dom';
import Icon from './Icon';

export function TopbarTitle({ text }) {
  return <h1 className="topbar__title">{text}</h1>;
}

export function Crumbs({ trail }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol className="crumbs__list">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li className="crumbs__item" key={`${c.label}-${i}`}>
              {last ? (
                <span className="crumbs__here" aria-current="page">{c.label}</span>
              ) : (
                <Link className="crumbs__link" to={c.href || '#'}>{c.label}</Link>
              )}
              {last ? null : (
                <span className="crumbs__sep" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function Topbar({ lead, crumbs = false, actions }) {
  return (
    <header className={`topbar${crumbs ? ' topbar--crumbs' : ''}`}>
      {lead}
      {actions ? <div className="topbar__actions">{actions}</div> : null}
    </header>
  );
}
