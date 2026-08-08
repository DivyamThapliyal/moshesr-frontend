/* ============================================================================
   TaskCard — one task on the board. The title IS the card's link; its ::after
   stretches over the whole card, so the entire card is clickable while focus
   still lands on one real named control. The chip swaps to "Partly verified"
   when the task has certificates that never ran. Ported from js/app.js cardHTML.
   ========================================================================== */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_META } from '../../data';
import Icon from '../Icon';

function TaskCard({ task, menuOpen, onMore, onDelete }) {
  const navigate = useNavigate();
  const s = STATUS_META[task.notVerified ? 'partial' : task.status];

  const open = () => { if (task.href) navigate(task.href); };

  return (
    <article className="card" data-task={task.id} data-status={task.status}>
      <div className="card__body">
        <div className="card__states">
          <span className={`pill pill--${s.variant}`}>
            <span className="pill__dot" />{s.label}
          </span>
        </div>
        <div className="card__text">
          <h3 className="card__title">
            <button className="card__link" type="button" onClick={open}>{task.title}</button>
          </h3>
          <p className="card__meta">{task.meta}</p>
        </div>
        <hr className="rule card__rule" />
        <div className="card__foot">
          <span className="card__stat">{task.stat}</span>
          <button className="btn btn--secondary" type="button" onClick={open}>
            {task.action}
            <span className="visually-hidden">{` ${task.title}`}</span>
          </button>
        </div>
        <button
          className="card__more"
          type="button"
          data-more={task.id}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More actions for ${task.title}`}
          onClick={(e) => onMore(task.id, e.currentTarget)}
        >
          <Icon name="ellipsis" size={20} />
        </button>
      </div>
    </article>
  );
}

export default memo(TaskCard);
