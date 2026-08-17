import Image from 'next/image'
import StatusBadge from '@/app/components/common/table/StatusBadge'

interface StockMovementDetailsProps {
  movementNo?: string
  movementType?: string
  status?: 'Received'
  createdOn?: string
  lastUpdated?: string
  onBack?: () => void
  onPrintTimeline?: () => void
  onDownloadPdf?: () => void
}

const Divider = () => (
  <div className="hidden h-10 w-px shrink-0 bg-pneutral-200 sm:block" />
)

interface TimelineStepData {
  title: string
  timestamp?: string
  by?: string
  note?: string
  highlighted?: boolean
}

const defaultTimelineSteps: TimelineStepData[] = [
  { title: 'Create Allocation', timestamp: '05-Aug-2026 09:10 AM', by: 'Super Admin' },
  { title: 'Warehouse Distribution Created', timestamp: '05-Aug-2026 09:12 AM', by: 'Warehouse Manager' },
  { title: 'Products Dispatched', timestamp: '05-Aug-2026 10:30 AM', by: 'Warehouse Executive' },
  { title: 'Pending Receipt', timestamp: '05-Aug-2026 10:31 AM', by: 'System Update' },
  { title: 'Stock Received', timestamp: '05-Aug-2026 02:15 PM', by: 'Rajajinagar Pharmacy', highlighted: true },
  { title: 'Inventory Updated', timestamp: '05-Aug-2026 02:15 PM', by: 'System Update' },
  { title: 'Available for Billing / POS', note: 'Completed' },
]

interface ProductMovementRow {
  product: string
  genericName: string
  batchNo: string
  unit: string
  dispatchedQty: number
  receivedQty: number
  diff: number
  remarks: string
}

const defaultProductMovement: ProductMovementRow[] = [
  {
    product: 'Dolo 650 Tablet',
    genericName: '650 mg Tablet',
    batchNo: 'B24001',
    unit: 'Strip',
    dispatchedQty: 20,
    receivedQty: 20,
    diff: 0,
    remarks: 'Received in good condition',
  },
  {
    product: 'Crocin Syrup',
    genericName: 'Paracetamol Syrup',
    batchNo: 'C12001',
    unit: 'Bottle',
    dispatchedQty: 15,
    receivedQty: 15,
    diff: 0,
    remarks: 'OK',
  },
]

const cardShadow =
  'shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]'

const tightCardShadow =
  'shadow-[0px_1px_1px_rgba(0,0,0,0.16),0px_3px_3px_rgba(0,0,0,0.12),0px_5px_6px_rgba(0,0,0,0.09)]'

const MovementTimeline = ({ steps }: { steps: TimelineStepData[] }) => (
  <div className={`flex w-full flex-1 flex-col items-start gap-4.5 rounded-xl bg-white p-5 ${cardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Movement Timeline
    </p>

    {steps.map((step, index) => {
      const isLast = index === steps.length - 1

      return (
        <div
          key={step.title}
          className={`flex w-full items-start gap-3 ${
            step.highlighted ? 'rounded-lg bg-success-50 px-2.5 py-2' : ''
          }`}
        >
          <div className="flex shrink-0 flex-col items-center">
            <Image
              src="/warehouseDistribution/check-circle-solid.svg"
              alt=""
              width={22}
              height={22}
            />
            {!isLast && <div className="h-6 w-0.5 shrink-0 bg-pneutral-200" />}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
              {step.title}
            </p>

            {step.timestamp && (
              <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
                {step.timestamp}
              </p>
            )}

            {step.by && (
              <div className="flex items-start gap-1 text-label-l2">
                <p className="font-normal text-pneutral-500">By</p>
                <p className="font-medium text-pneutral-900">{step.by}</p>
              </div>
            )}

            {step.note && (
              <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
                {step.note}
              </p>
            )}
          </div>
        </div>
      )
    })}
  </div>
)

const StatusTag = ({
  value,
  size = 'md',
}: {
  value: string
  size?: 'sm' | 'md'
}) => (
  <div
    className={`flex w-fit shrink-0 items-center justify-center gap-1 rounded-lg border border-success-600 bg-success-50 px-3 ${
      size === 'sm' ? 'py-0.5' : 'py-1'
    }`}
  >
    <p className="whitespace-nowrap text-label-l3 font-medium text-success-800">
      {value}
    </p>
  </div>
)

interface AuditLogEntryData {
  timestamp: string
  by: string
  description: string
}

const defaultAuditLog: AuditLogEntryData[] = [
  { timestamp: '05-Aug-2026  09:10 AM', by: 'Super Admin', description: 'Allocation created' },
  { timestamp: '05-Aug-2026  09:25 AM', by: 'Warehouse Manager', description: 'Distribution reviewed' },
  { timestamp: '05-Aug-2026  10:30 AM', by: 'Warehouse Executive', description: 'Products dispatched' },
  { timestamp: '05-Aug-2026  02:15 PM', by: 'Rajajinagar Pharmacy', description: 'Receipt confirmed' },
]

interface TransactionSummaryProps {
  products: number
  totalQuantity: string
  dispatchedQuantity: string
  receivedQuantity: string
  difference: string
  inventoryStatus: string
  billingStatus: string
}

const TransactionSummaryRow = ({
  label,
  value,
  valueClassName = 'text-label-l4',
}: {
  label: string
  value: string
  valueClassName?: string
}) => (
  <div className="flex w-full items-start gap-2">
    <p className="flex-1 text-label-l4 font-normal text-pneutral-500">{label}</p>
    <p className={`whitespace-nowrap text-right font-semibold text-pneutral-900 ${valueClassName}`}>
      {value}
    </p>
  </div>
)

const TransactionSummary = ({
  products,
  totalQuantity,
  dispatchedQuantity,
  receivedQuantity,
  difference,
  inventoryStatus,
  billingStatus,
}: TransactionSummaryProps) => (
  <div className={`flex h-150 w-full flex-col items-start justify-between gap-4 rounded-xl bg-white p-5 ${cardShadow}`}>
    <div className="flex w-full items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary-50">
        <Image
          src="/warehouseDistribution/document-text-mini.svg"
          alt=""
          width={14}
          height={16}
        />
      </div>
      <p className="flex-1 text-label-l5 font-semibold text-pneutral-900">
        Transaction Summary
      </p>
    </div>

    <TransactionSummaryRow label="Products" value={String(products)} valueClassName="text-p3" />
    <TransactionSummaryRow label="Total Quantity" value={totalQuantity} />
    <TransactionSummaryRow label="Dispatched Quantity" value={dispatchedQuantity} />
    <TransactionSummaryRow label="Received Quantity" value={receivedQuantity} />
    <TransactionSummaryRow label="Difference" value={difference} />

    <div className="h-px w-full shrink-0 bg-pneutral-200" />

    <div className="flex w-full items-center gap-2">
      <p className="flex-1 text-label-l4 font-normal text-pneutral-500">
        Inventory Status
      </p>
      <StatusTag value={inventoryStatus} size="sm" />
    </div>

    <div className="flex w-full items-center gap-2">
      <p className="flex-1 text-label-l4 font-normal text-pneutral-500">
        Billing / POS Status
      </p>
      <StatusTag value={billingStatus} size="sm" />
    </div>
  </div>
)

const AuditLog = ({ entries }: { entries: AuditLogEntryData[] }) => (
  <div className={`flex w-full flex-col items-start gap-4 rounded-xl bg-white p-4 ${tightCardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Audit Log
    </p>

    {entries.map((entry, index) => {
      const isLast = index === entries.length - 1

      return (
        <div key={entry.timestamp} className="flex w-full items-start gap-3">
          <div className="flex shrink-0 flex-col items-center">
            <div className="size-2.5 shrink-0 rounded bg-secondary-700" />
            {!isLast && <div className="h-10 w-0.5 shrink-0 bg-pneutral-200" />}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="whitespace-pre text-label-l2 font-semibold text-pneutral-900">
              {entry.timestamp}
            </p>
            <div className="flex items-start gap-1 text-label-l2">
              <p className="font-normal text-pneutral-500">By</p>
              <p className="font-medium text-pneutral-900">{entry.by}</p>
            </div>
            <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
              {entry.description}
            </p>
          </div>
        </div>
      )
    })}
  </div>
)

const StockMovementFooter = ({
  onBack,
  onPrintTimeline,
  onDownloadPdf,
}: {
  onBack?: () => void
  onPrintTimeline?: () => void
  onDownloadPdf?: () => void
}) => (
  <div className="flex w-full flex-col gap-3 border-t border-pneutral-200  py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 sm:w-auto"
    >
      <span className="whitespace-pre  w-[100px] text-label-l4 font-medium text-secondary-700">
        {`←  Back`}
      </span>
    </button>

    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onPrintTimeline}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 sm:w-auto"
      >
        <Image
          src="/warehouseDistribution/printer-mini.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="whitespace-nowrap text-label-l4 font-medium text-secondary-700">
          Print Timeline
        </span>
      </button>

      <button
        type="button"
        onClick={onDownloadPdf}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 sm:w-auto"
      >
        <Image
          src="/warehouseDistribution/arrow-down-tray-white.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
          Download PDF
        </span>
      </button>
    </div>
  </div>
)

const InfoRow = ({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: React.ReactNode
}) => (
  <div className="flex w-full items-center gap-2.5">
    <Image src={icon} alt="" width={18} height={18} />
    <p className="flex-1 whitespace-nowrap text-label-l4 font-normal text-pneutral-500">
      {label}
    </p>
    {children}
  </div>
)

interface MovementInformationProps {
  allocationNo: string
  distributionNo: string
  source: string
  destination: string
  transferType: string
  status: string
  receiptConfirmedOn: string
  confirmedBy: string
}

const MovementInformation = ({
  allocationNo,
  distributionNo,
  source,
  destination,
  transferType,
  status,
  receiptConfirmedOn,
  confirmedBy,
}: MovementInformationProps) => (
  <div className={`flex w-full flex-1 flex-col items-start justify-between gap-4 rounded-xl bg-white p-5 ${cardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Movement Information
    </p>

    <InfoRow icon="/warehouseDistribution/document-text-mini.svg" label="Allocation No.">
      <p className="whitespace-nowrap text-label-l4 font-semibold text-secondary-700">
        {allocationNo}
      </p>
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/truck-outline-small.svg" label="Distribution No.">
      <p className="whitespace-nowrap text-label-l4 font-semibold text-secondary-700">
        {distributionNo}
      </p>
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/cube-mini.svg" label="Source">
      <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {source}
      </p>
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/map-pin-mini.svg" label="Destination">
      <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {destination}
      </p>
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/arrows-right-left-outline.svg" label="Transfer Type">
      <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {transferType}
      </p>
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/check-circle-outline-purple.svg" label="Current Status">
      <StatusTag value={status} />
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/calendar-mini.svg" label="Receipt Confirmed On">
      <p className="whitespace-pre text-label-l4 font-semibold text-pneutral-900">
        {receiptConfirmedOn}
      </p>
    </InfoRow>

    <InfoRow icon="/warehouseDistribution/users-outline.svg" label="Confirmed By">
      <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {confirmedBy}
      </p>
    </InfoRow>
  </div>
)

const ProductMovement = ({ rows }: { rows: ProductMovementRow[] }) => (
  <div className={`flex w-full flex-col items-start gap-4 rounded-xl bg-white p-4 ${tightCardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Product Movement
    </p>

    <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
      <div className="min-w-165">
        <div className="flex w-full items-center gap-2 bg-pneutral-50 px-3.5 py-2.5">
          <p className="w-5 shrink-0 text-p3 font-semibold text-pneutral-500">#</p>
          <p className="w-32.5 shrink-0 text-p3 font-semibold text-pneutral-500">
            Product
          </p>
          <p className="w-18.75 shrink-0 text-p3 font-semibold text-pneutral-500">
            Batch No.
          </p>
          <p className="w-13.75 shrink-0 text-p3 font-semibold text-pneutral-500">
            Unit
          </p>
          <p className="w-17.5 shrink-0 text-right text-p3 font-semibold text-pneutral-500">
            Dispatched
          </p>
          <p className="w-17.5 shrink-0 text-right text-p3 font-semibold text-pneutral-500">
            Received
          </p>
          <p className="w-12.5 shrink-0 text-right text-p3 font-semibold text-pneutral-500">
            Diff.
          </p>
          <div className="flex-1" />
          <p className="w-32.5 shrink-0 text-p3 font-semibold text-pneutral-500">
            Remarks
          </p>
        </div>

        {rows.map((row, index) => (
          <div
            key={row.batchNo}
            className="flex w-full items-center gap-2 border-t border-pneutral-200 px-3.5 py-2.5"
          >
            <p className="w-5 shrink-0 text-p3 font-normal text-pneutral-900">
              {index + 1}
            </p>
            <div className="flex w-32.5 shrink-0 items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded bg-secondary-50">
                <Image
                  src="/warehouseDistribution/pill-icon-dark.svg"
                  alt=""
                  width={16}
                  height={16}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-px">
                <p className="truncate text-p3 font-semibold text-pneutral-900">
                  {row.product}
                </p>
                <p className="truncate text-p3 font-normal text-pneutral-500">
                  {row.genericName}
                </p>
              </div>
            </div>
            <p className="w-18.75 shrink-0 text-p3 font-normal text-pneutral-900">
              {row.batchNo}
            </p>
            <p className="w-13.75 shrink-0 text-p3 font-normal text-pneutral-900">
              {row.unit}
            </p>
            <p className="w-17.5 shrink-0 text-right text-p3 font-medium text-pneutral-900">
              {row.dispatchedQty}
            </p>
            <p className="w-17.5 shrink-0 text-right text-p3 font-medium text-pneutral-900">
              {row.receivedQty}
            </p>
            <p className="w-12.5 shrink-0 text-right text-p3 font-semibold text-success-600">
              {row.diff}
            </p>
            <div className="flex-1" />
            <p className="w-32.5 shrink-0 text-p3 font-normal text-pneutral-900">
              {row.remarks}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="flex w-full items-center gap-2.5 rounded-lg bg-success-50 px-4 py-3">
      <Image
        src="/warehouseDistribution/check-circle-solid.svg"
        alt=""
        width={20}
        height={20}
      />
      <p className="text-label-l4 font-semibold text-success-800">
        No difference found. All items received as dispatched.
      </p>
    </div>
  </div>
)

const StockMovementDetails = ({
  movementNo = 'WD000245',
  movementType = 'Warehouse Distribution',
  status = 'Received',
  createdOn = '05-Aug-2026  09:12 AM',
  lastUpdated = '05-Aug-2026  02:15 PM',
  onBack,
  onPrintTimeline,
  onDownloadPdf,
}: StockMovementDetailsProps) => {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="text-h5 font-semibold text-pneutral-900">
        Stock Movement Details
      </div>

      <div className="flex w-full flex-col gap-5 rounded-xl bg-white px-6 py-4.5 shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)] sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-50">
            <Image
              src="/warehouseDistribution/truck-outline.svg"
              alt=""
              width={22}
              height={22}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
              {movementNo}
            </p>
            <p className="whitespace-nowrap text-label-l4 font-normal text-pneutral-500">
              {movementType}
            </p>
          </div>
        </div>

        <Divider />

        <div className="flex shrink-0 flex-col gap-2">
          <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
            Status
          </p>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <Image
              src="/warehouseDistribution/check-circle-solid.svg"
              alt=""
              width={22}
              height={22}
            />
          </div>
        </div>

        <Divider />

        <div className="flex min-w-0 items-center gap-2.5 sm:flex-1">
          <Image
            src="/warehouseDistribution/calendar-mini.svg"
            alt=""
            width={20}
            height={20}
          />
          <div className="flex flex-col gap-0.5">
            <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
              Created On
            </p>
            <p className="whitespace-pre text-label-l4 font-semibold text-pneutral-900">
              {createdOn}
            </p>
          </div>
        </div>

        <Divider />

        <div className="flex min-w-0 items-center gap-2.5 sm:flex-1">
          <Image
            src="/warehouseDistribution/clock-mini.svg"
            alt=""
            width={20}
            height={20}
          />
          <div className="flex flex-col gap-0.5">
            <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
              Last Updated
            </p>
            <p className="whitespace-pre text-label-l4 font-semibold text-pneutral-900">
              {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-5 xl:flex-row">
        <div className="flex w-full min-w-0 flex-col gap-5 xl:flex-[2_0_0]">
          <div className="flex w-full flex-col items-stretch gap-5 lg:flex-row">
            <MovementTimeline steps={defaultTimelineSteps} />
            <MovementInformation
              allocationNo="ALO000124"
              distributionNo="WD000245"
              source="Central Warehouse"
              destination="Rajajinagar Medical Store"
              transferType="Warehouse Distribution"
              status="Received"
              receiptConfirmedOn="05-Aug-2026  02:15 PM"
              confirmedBy="Rajajinagar Pharmacy"
            />
          </div>

          <ProductMovement rows={defaultProductMovement} />
        </div>

        <div className="flex w-full flex-col gap-4 xl:w-90 xl:shrink-0">
          <TransactionSummary
            products={2}
            totalQuantity="35 Purchase Units"
            dispatchedQuantity="35 Purchase Units"
            receivedQuantity="35 Purchase Units"
            difference="0 Purchase Units"
            inventoryStatus="Updated"
            billingStatus="Available"
          />

          <AuditLog entries={defaultAuditLog} />
        </div>
      </div>

      <StockMovementFooter
        onBack={onBack}
        onPrintTimeline={onPrintTimeline}
        onDownloadPdf={onDownloadPdf}
      />
    </div>
  )
}

export default StockMovementDetails
