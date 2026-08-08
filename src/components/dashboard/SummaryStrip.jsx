/* SummaryStrip — a toast that reports the queue and can be dismissed. The
   dismissal is deliberately not persisted: it lasts until the page loads again,
   because this is the only running total on the screen. The height collapse
   animates from the measured value, exactly as the original. */
import { Fragment, useRef, useState } from 'react';
import { SUMMARY } from '../../data';
import { useShell } from '../../context/ShellContext';
import Icon from '../Icon';

export default function SummaryStrip() {
  const { say } = useShell();
  const ref = useRef(null);
  const [dismissing, setDismissing] = useState(false);
  const [hidden, setHidden] = useState(false);

  const dismiss = () => {
    const el = ref.current;
    if (!el || dismissing) return;
    el.style.height = `${el.offsetHeight}px`;
    requestAnimationFrame(() => {
      setDismissing(true);
      el.style.height = '0px';
    });
    say('Summary dismissed');
  };

  if (hidden) return null;

  return (
    <section
      className={`summary${dismissing ? ' is-dismissed' : ''}`}
      id="summary"
      ref={ref}
      role="status"
      aria-live="polite"
      aria-label="Queue summary"
      onTransitionEnd={(e) => { if (e.propertyName === 'height' && dismissing) setHidden(true); }}
    >
      <div className="summary__list" id="summaryList">
        {SUMMARY.items.map((it, i) => (
          <Fragment key={it.text}>
            {i ? <span className="summary-sep" aria-hidden="true">•</span> : null}
            <span className={`summary-item${it.tone === 'accent' ? ' summary-item--accent' : ''}`}>{it.text}</span>
          </Fragment>
        ))}
      </div>
      <div className="summary__health" id="summaryHealth">
        <span>{SUMMARY.health.label}</span><span className="dot dot--success" />
      </div>
      <button
        className="summary__close"
        id="summaryClose"
        type="button"
        aria-label="Dismiss summary"
        onClick={dismiss}
      >
        <Icon name="x" size={18} />
      </button>
    </section>
  );
}
