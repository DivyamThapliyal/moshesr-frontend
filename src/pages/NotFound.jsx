import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useTopbar from '../hooks/useTopbar';
import { TopbarTitle } from '../components/Topbar';

export default function NotFound() {
  const lead = useMemo(() => <TopbarTitle text="Not found" />, []);
  useTopbar({ nav: 'tasks', lead });
  return (
    <div className="detail">
      <section className="pagehead">
        <div className="pagehead__row">
          <h2 className="pagehead__title">This page does not exist</h2>
        </div>
        <p className="pagehead__meta">
          The page you were looking for was moved or never existed.{' '}
          <Link className="crumbs__link" to="/" style={{ textDecoration: 'underline' }}>Back to My tasks</Link>
        </p>
      </section>
    </div>
  );
}
