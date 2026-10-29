import Image from "next/image";

interface ReportEmptyStateProps {
  /** "No bills match your filters" */
  title: string;
  description?: string;
  onClearFilters: () => void;
}

/** Takes the table's place in the results card when a search comes back empty. */
export default function ReportEmptyState({
  title,
  description = "Try widening the date range or removing some of the applied filters.",
  onClearFilters,
}: ReportEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-18 items-center justify-center rounded-full bg-primary-100">
        <Image src="/Reports/MagnifyingGlassPurple.svg" alt="" width={32} height={32} />
      </div>
      <p className="text-label-l5 font-semibold text-pneutral-900">{title}</p>
      <p className="text-p3 text-pneutral-500">{description}</p>
      <button
        type="button"
        onClick={onClearFilters}
        className="flex h-12 w-38 items-center justify-center rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700"
      >
        Clear filters
      </button>
    </div>
  );
}
