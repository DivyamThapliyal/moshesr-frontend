/* ============================================================================
   Sidebar — the primary rail, shared by every page. Ported from shell.js's
   sidebarHTML: brand, collapse toggle, nav, theme segmented control, language,
   account. Class names are identical to the original so the reused CSS styles
   it pixel-for-pixel; behaviour comes from ShellContext.
   ========================================================================== */
import { useNavigate } from 'react-router-dom';
import { BRAND, USER, NAV } from '../data';
import { useShell } from '../context/ShellContext';
import Icon from './Icon';

export default function Sidebar({ current }) {
  const navigate = useNavigate();
  const { theme, setTheme, collapsed, setCollapsed, langLabel, cycleLang } = useShell();

  const goHome = () => navigate('/');

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand brand">
        <button
          className="brand__mark"
          type="button"
          aria-label={`${BRAND.name} home`}
          onClick={() => { if (collapsed) setCollapsed(false); }}
        >
          <span className="brand__mark-text">{BRAND.mark}</span>
          <span className="brand__mark-exp"><Icon name="panel-left-open" size={22} /></span>
          <span className="tip">Expand navigation</span>
        </button>
        <button className="brand__text brand__home" type="button" onClick={goHome}>
          <span className="brand__name">{BRAND.name}</span>
          <span className="brand__sub">{BRAND.tagline}</span>
        </button>
        <button
          className="rail-toggle"
          type="button"
          aria-expanded={!collapsed}
          aria-controls="nav"
          data-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="rail-toggle__icon"><Icon name="panel-right-open" size={20} /></span>
          <span className="tip">Collapse navigation</span>
        </button>
      </div>

      <nav aria-label="Sections">
        <ul className="sidebar__nav" id="nav">
          {NAV.map((n) => {
            const on = n.id === current;
            return (
              <li key={n.id}>
                <button
                  className={`nav-item${on ? ' is-active' : ''}`}
                  data-nav={n.id}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => { if (n.href) navigate(n.href); }}
                >
                  <Icon name={n.icon} size={23} className="nav-item__icon" />
                  <span className="nav-item__label">{n.label}</span>
                  <span className="tip">
                    {n.label}
                    {n.count ? <span className="tip__count">{n.count}</span> : null}
                  </span>
                  {n.count ? (
                    <span className={`badge${on ? '' : ' badge--muted'}`}>{n.count}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__prefs prefs">
        <div className="seg" role="group" aria-label="Theme">
          <button
            className={`seg__btn${theme === 'dark' ? ' is-on' : ''}`}
            type="button"
            aria-pressed={theme === 'dark'}
            aria-label="Dark theme"
            onClick={() => setTheme('dark')}
          >
            <span><Icon name="moon" size={18} /></span>
            <span className="tip">Dark theme</span>
          </button>
          <button
            className={`seg__btn${theme === 'light' ? ' is-on' : ''}`}
            type="button"
            aria-pressed={theme === 'light'}
            aria-label="Light theme"
            onClick={() => setTheme('light')}
          >
            <span><Icon name="sun" size={18} /></span>
            <span className="tip">Light theme</span>
          </button>
        </div>

        <span className="prefs__sep" aria-hidden="true" />

        <button className="select select--bare" type="button" aria-label="Change language" onClick={cycleLang}>
          <span><Icon name="globe" size={20} /></span>
          <span className="select__value">{langLabel}</span>
          <span className="select__chevron"><Icon name="chevron-down" size={18} /></span>
          <span className="tip">{langLabel}</span>
        </button>
      </div>

      <div className="sidebar__foot">
        <button className="user" type="button" aria-label="Account menu">
          <span className="avatar" aria-hidden="true">{USER.initials}</span>
          <span className="user__text">
            <span className="user__name">{USER.name}</span>
            <span className="user__role">{USER.email}</span>
          </span>
          <span className="user__chevron"><Icon name="chevron-right" size={18} /></span>
          <span className="tip">{USER.name}</span>
        </button>
      </div>
    </aside>
  );
}
