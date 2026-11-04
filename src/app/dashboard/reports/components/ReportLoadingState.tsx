const CARD =
  "rounded-2xl bg-white p-4 shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

/** Widths of the placeholder cells in a skeleton row, as in the design. */
const ROW_WIDTHS = ["w-6", "w-22.5", "w-20", "w-17.5", "w-17.5", "w-30", "w-17.5", "w-22.5", "w-22.5", "w-22.5", "w-20"];

function Bar({ className }: { className: string }) {
  return <div className={`shrink-0 rounded-full bg-pneutral-200 ${className}`} />;
}

/**
 * Stands in for the KPI cards and the results card while a report is being
 * fetched. The bar is not real progress — the request does not report any —
 * just a sign that something is happening.
 */
export default function ReportLoadingState({ kpiCount }: { kpiCount: number }) {
  return (
    <div className="@container flex flex-col gap-4" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <p className="text-label-l4 font-semibold text-pneutral-900">Generating report…</p>
        <div className="relative h-2 w-80 max-w-full overflow-hidden rounded-sm bg-pneutral-100">
          <div className="absolute inset-y-0 left-0 w-2/3 animate-pulse rounded-sm bg-secondary-500" />
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-4 @3xl:grid-cols-[repeat(var(--kpis),minmax(0,1fr))]"
        style={{ "--kpis": kpiCount } as React.CSSProperties}
      >
        {Array.from({ length: kpiCount }, (_, i) => (
          <div key={i} className={`flex animate-pulse flex-col gap-3 ${CARD}`}>
            <Bar className="h-3 w-30" />
            <Bar className="h-7.5 w-47.5 max-w-full" />
            <Bar className="h-2.5 w-22.5" />
          </div>
        ))}
      </div>

      <div className={`flex animate-pulse flex-col gap-4 overflow-hidden ${CARD}`}>
        <Bar className="h-4 w-40" />
        <div className="h-12 w-25 rounded-lg bg-pneutral-200" />
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex items-center gap-4">
            {ROW_WIDTHS.map((width, cell) => (
              <Bar key={cell} className={`h-3 ${width}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
