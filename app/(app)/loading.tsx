export default function Loading() {
  return (
    <div className="space-y-6" aria-label="Carregando" role="status" aria-live="polite">
      <span className="sr-only">Carregando conteúdo…</span>
      <div className="skeleton h-20 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => <div key={index} className="skeleton h-32" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-80" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
