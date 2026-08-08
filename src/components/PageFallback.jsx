/* A quiet fallback while a lazy page chunk loads — the shell is already on
   screen, so this only fills the stage body. */
export default function PageFallback() {
  return (
    <div className="stage__body" style={{ padding: 'var(--stage-pad)' }}>
      <div className="skeleton-block" aria-hidden="true" />
    </div>
  );
}
