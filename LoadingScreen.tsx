export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-balloon" aria-hidden />
      <p>{label}…</p>
    </div>
  );
}
