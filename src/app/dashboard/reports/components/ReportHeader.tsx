import Image from "next/image";

interface ReportHeaderProps {
  title: string;
  description: string;
  /** Path under /public for the 28px tile icon. */
  icon?: string;
  onPrint?: () => void;
  onDownload?: () => void;
}

/** Title row of a report page: icon tile, title and description, Print / Download. */
export default function ReportHeader({
  title,
  description,
  icon = "/Reports/DocumentChartBar.svg",
  onPrint,
  onDownload,
}: ReportHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
        <Image src={icon} alt="" width={28} height={28} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-h5 font-semibold text-pneutral-900">{title}</h1>
        <p className="text-p3 font-normal text-pneutral-500">{description}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPrint}
          className="flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg border-2 border-pneutral-900 px-4 text-label-l4 font-medium text-pneutral-900"
        >
          <Image src="/Reports/Printer.svg" alt="" width={20} height={20} />
          Print
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg bg-pneutral-900 px-4 text-label-l4 font-medium text-pneutral-50 sm:w-46.75"
        >
          <Image src="/Reports/ArrowDownTray.svg" alt="" width={20} height={20} />
          Download
        </button>
      </div>
    </div>
  );
}
