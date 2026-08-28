import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import StatusBadge from '@/app/components/common/table/StatusBadge'
import { getWarehouseDistribution } from '@/services/WarehouseDistributionService'
import { getUserById } from '@/services/UserManagementService'
import {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
  WarehouseDistributionStatusData,
} from '@/types/WarehouseDistributionData'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { downloadElementAsPdf, printElementAsPdf } from '@/utils/downloadPdf'
import { showToast } from '@/app/components/common/Toast'
import { useModulePermissions } from '@/hooks/useModulePermissions'

// Both the printout and the PDF are this screen as it stands — no separate
// document design. Printing goes through the same PDF the download produces
// (printElementAsPdf), so the two agree on layout and pagination instead of the
// printer reflowing the markup at paper width.
const PRINT_ROOT_ID = 'stock-movement-print'

// The timeline shows time as 12-hour AM/PM (unlike formatDateTime's 24-hour
// clock, which the rest of this screen keeps for consistency with the app).
const formatTimelineTimestamp = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const [datePart, timePart] = value.split('T')
  const date = formatDate(datePart)
  if (!timePart) return date

  const [hourStr, minuteStr] = timePart.split(':')
  const hour24 = parseInt(hourStr, 10)
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${date} ${String(hour12).padStart(2, '0')}:${minuteStr} ${period}`
}

// Maps the lifecycle enum to the label this card's status tag shows.
const distributionStatusLabel: Record<DistributionStatus, string> = {
  DISTRIBUTION_CREATED: 'Ready to Dispatch',
  PRODUCTS_DISPATCHED: 'Pending Receipt',
  STOCK_RECEIVED: 'Received',
  STOCK_REJECTED: 'Rejected',
}

interface StockMovementDetailsProps {
  distributionId?: number
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
}

// Each lifecycle status the backend actually records unfolds into the
// multi-step story the design shows: creating a distribution reads as two
// steps, dispatching as two, and receiving as three (the last of which —
// billing availability — is implied, not a status of its own).
const buildTimelineSteps = (
  statuses: WarehouseDistributionStatusData[],
  userNamesById: Record<string, string>,
  destinationLabel: string
): TimelineStepData[] =>
  statuses.flatMap((entry): TimelineStepData[] => {
    const timestamp = formatTimelineTimestamp(entry.createdAt)
    const by = entry.createdBy ? userNamesById[entry.createdBy] ?? entry.createdBy : undefined

    switch (entry.status) {
      case 'DISTRIBUTION_CREATED':
        return [
          { title: 'Create Allocation', timestamp, by },
          { title: 'Warehouse Distribution Created', timestamp, by },
        ]
      case 'PRODUCTS_DISPATCHED':
        return [
          { title: 'Products Dispatched', timestamp, by },
          { title: 'Pending Receipt', timestamp, by: 'System Update' },
        ]
      case 'STOCK_RECEIVED':
        return [
          { title: 'Stock Received', timestamp, by: destinationLabel },
          { title: 'Inventory Updated', timestamp, by: destinationLabel },
          { title: 'Available for Billing / POS', note: 'Completed' },
        ]
      case 'STOCK_REJECTED':
        return [{ title: 'Stock Rejected', timestamp, by }]
      default:
        return []
    }
  })

interface ProductMovementRow {
  product: string
  genericName: string
  batchNo: string
  unit: string
  dispatchedQty: number
  receivedQty: number
  // null until the destination actually confirms receipt — a line simply
  // pending receipt is not the same as a line received short/over.
  diff: number | null
  isReceived: boolean
  remarks: string
}

// Maps one API line (product/packaging/batch info nested) to the row shape the
// Product Movement table renders.
const toProductMovementRow = (line: WarehouseDistributionLineData): ProductMovementRow => {
  const dispatchedQty = line.dispatchedQuantity ?? line.issueQuantity ?? 0
  const isReceived = line.receivedQuantity != null
  const receivedQty = line.receivedQuantity ?? 0
  return {
    product: line.product?.productName ?? line.productId,
    genericName: line.product?.brandName ?? '',
    batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
    unit: line.packaging?.purchaseUnit ?? '—',
    dispatchedQty,
    receivedQty,
    diff: isReceived ? dispatchedQty - receivedQty : null,
    isReceived,
    remarks: line.receiveRemarks || line.dispatchRemarks || line.remarks || '—',
  }
}

const cardShadow =
  'shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]'

const tightCardShadow =
  'shadow-[0px_1px_1px_rgba(0,0,0,0.16),0px_3px_3px_rgba(0,0,0,0.12),0px_5px_6px_rgba(0,0,0,0.09)]'

const MovementTimeline = ({
  steps,
  isLoading,
}: {
  steps: TimelineStepData[]
  isLoading?: boolean
}) => (
  <div className={`flex w-full flex-1 flex-col items-start gap-4.5 rounded-xl bg-white p-5 ${cardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Movement Timeline
    </p>

    {isLoading ? (
      <p className="w-full py-8 text-center text-p3 text-pneutral-500">
        Loading movement timeline...
      </p>
    ) : steps.length === 0 ? (
      <p className="w-full py-8 text-center text-p3 text-pneutral-500">
        No movement history found for this distribution.
      </p>
    ) : (
    steps.map((step, index) => {
      const isLast = index === steps.length - 1

      return (
        <div
          key={`${step.title}-${index}`}
          className="flex w-full items-start gap-3"
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
    })
    )}
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

// One audit row per status the distribution actually went through, in the
// same order as its history — the receipt-side entry credits the receiving
// pharmacy, everything else credits whichever user performed the action.
const auditLogDescription: Record<DistributionStatus, string> = {
  DISTRIBUTION_CREATED: 'Allocation created',
  PRODUCTS_DISPATCHED: 'Products dispatched',
  STOCK_RECEIVED: 'Receipt confirmed',
  STOCK_REJECTED: 'Receipt rejected',
}

const buildAuditLog = (
  statuses: WarehouseDistributionStatusData[],
  userNamesById: Record<string, string>,
  destinationLabel: string
): AuditLogEntryData[] =>
  statuses.map((entry) => ({
    timestamp: formatTimelineTimestamp(entry.createdAt) ?? '—',
    by:
      entry.status === 'STOCK_RECEIVED'
        ? destinationLabel
        : entry.createdBy
          ? userNamesById[entry.createdBy] ?? entry.createdBy
          : '—',
    description: auditLogDescription[entry.status] ?? entry.status,
  }))

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

const AuditLog = ({
  entries,
  isLoading,
}: {
  entries: AuditLogEntryData[]
  isLoading?: boolean
}) => (
  <div className={`flex w-full flex-col items-start gap-4 rounded-xl bg-white p-4 ${tightCardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Audit Log
    </p>

    {isLoading ? (
      <p className="w-full py-8 text-center text-p3 text-pneutral-500">
        Loading audit log...
      </p>
    ) : entries.length === 0 ? (
      <p className="w-full py-8 text-center text-p3 text-pneutral-500">
        No audit history found for this distribution.
      </p>
    ) : (
      entries.map((entry, index) => {
        const isLast = index === entries.length - 1

        return (
          <div key={`${entry.timestamp}-${index}`} className="flex w-full items-start gap-3">
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
      })
    )}
  </div>
)

const StockMovementFooter = ({
  onBack,
  onPrintTimeline,
  onDownloadPdf,
  isPrinting,
  isDownloading,
  canPrint = true,
  canExport = true,
}: {
  onBack?: () => void
  onPrintTimeline?: () => void
  onDownloadPdf?: () => void
  isPrinting?: boolean
  isDownloading?: boolean
  canPrint?: boolean
  canExport?: boolean
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
      {canPrint && (
      <button
        type="button"
        onClick={onPrintTimeline}
        disabled={isPrinting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 disabled:opacity-50 sm:w-auto"
      >
        <Image
          src="/warehouseDistribution/printer-mini.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="whitespace-nowrap text-label-l4 font-medium text-secondary-700">
          {isPrinting ? 'Preparing…' : 'Print Timeline'}
        </span>
      </button>
      )}

      {canExport && (
      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={isDownloading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 disabled:opacity-50 sm:w-auto"
      >
        <Image
          src="/warehouseDistribution/arrow-down-tray-white.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
          {isDownloading ? 'Preparing…' : 'Download PDF'}
        </span>
      </button>
      )}
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

const ProductMovement = ({
  rows,
  isLoading,
}: {
  rows: ProductMovementRow[]
  isLoading?: boolean
}) => {
  const allReceived = rows.length > 0 && rows.every((row) => row.isReceived)
  const hasDifference = rows.some((row) => row.isReceived && row.diff !== 0)

  return (
  <div className={`flex w-full flex-col items-start gap-4 rounded-xl bg-white p-4 ${tightCardShadow}`}>
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Product Movement
    </p>

    <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
      <div className="min-w-165">
        <div className="flex w-full items-center gap-4 bg-pneutral-50 px-3.5 py-2.5">
          <p className="w-12 shrink-0 text-p3 font-semibold text-pneutral-500">Sl No.</p>
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
          <p className="min-w-32.5 flex-1 text-p3 font-semibold text-pneutral-500">
            Remarks
          </p>
        </div>

        {isLoading ? (
          <div className="flex w-full items-center justify-center py-8 text-p3 text-pneutral-500">
            Loading product movement...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex w-full items-center justify-center py-8 text-p3 text-pneutral-500">
            No products found for this distribution.
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.product}-${row.batchNo}-${index}`}
              className="flex w-full items-center gap-4 border-t border-pneutral-200 px-3.5 py-2.5"
            >
              <p className="w-12 shrink-0 text-p3 font-normal text-pneutral-900">
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
                {row.isReceived ? row.receivedQty : '—'}
              </p>
              <p
                className={`w-12.5 shrink-0 text-right text-p3 font-semibold ${
                  !row.isReceived
                    ? 'text-pneutral-500'
                    : row.diff !== 0
                      ? 'text-warning-600'
                      : 'text-success-600'
                }`}
              >
                {row.isReceived ? row.diff : '—'}
              </p>
              <p className="min-w-32.5 flex-1 text-p3 font-normal text-pneutral-900">
                {row.remarks}
              </p>
            </div>
          ))
        )}
      </div>
    </div>

    {!isLoading && rows.length > 0 && (
      <div
        className={`flex w-full items-center gap-2.5 rounded-lg px-4 py-3 ${
          !allReceived ? 'bg-secondary-50' : hasDifference ? 'bg-warning-50' : 'bg-success-50'
        }`}
      >
        {allReceived && !hasDifference && (
          <Image
            src="/warehouseDistribution/check-circle-solid.svg"
            alt=""
            width={20}
            height={20}
          />
        )}
        <p
          className={`text-label-l4 font-semibold ${
            !allReceived
              ? 'text-secondary-700'
              : hasDifference
                ? 'text-warning-800'
                : 'text-success-800'
          }`}
        >
          {!allReceived
            ? 'Awaiting receipt confirmation for one or more dispatched products.'
            : hasDifference
              ? 'Difference found between dispatched and received quantities.'
              : 'No difference found. All items received as dispatched.'}
        </p>
      </div>
    )}
  </div>
  )
}

const StockMovementDetails = ({
  distributionId,
  movementNo = 'WD000245',
  movementType = 'Warehouse Distribution',
  status = 'Received',
  createdOn = '05-Aug-2026  09:12 AM',
  lastUpdated = '05-Aug-2026  02:15 PM',
  onBack,
  onPrintTimeline,
  onDownloadPdf,
}: StockMovementDetailsProps) => {
  const [distribution, setDistribution] = useState<WarehouseDistributionData | null>(null)
  const [isLoadingLines, setIsLoadingLines] = useState(Boolean(distributionId))
  // Printing the timeline is PRINT; saving it as a PDF is EXPORT.
  const { canPrint, canExport } = useModulePermissions('WAREHOUSE_DISTRIBUTION')
  // Everything above the action bar — what both the printout and the PDF capture.
  const printRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const fileLabel = movementNo.replace(/[^a-zA-Z0-9-_]+/g, '-')

  const handlePrint = async () => {
    if (!printRef.current || isPrinting) return
    setIsPrinting(true)
    try {
      await printElementAsPdf(printRef.current)
    } catch (err) {
      console.error('Failed to open the print view', err)
      showToast.error('Could not open the print dialog.')
    } finally {
      setIsPrinting(false)
    }
  }

  // Captures the live element rather than an off-screen copy, so the file shows
  // exactly what is on screen.
  const handleDownloadPdf = async () => {
    if (!printRef.current || isDownloading) return
    setIsDownloading(true)
    try {
      await downloadElementAsPdf(printRef.current, `stock-movement-${fileLabel}.pdf`)
      showToast.success('Stock movement details downloaded.')
    } catch (err) {
      console.error('Failed to generate the stock movement PDF', err)
      showToast.error('Could not generate the PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    if (!distributionId) {
      setDistribution(null)
      setIsLoadingLines(false)
      return
    }
    let active = true
    const fetchLines = async () => {
      setIsLoadingLines(true)
      try {
        const data = await getWarehouseDistribution(distributionId)
        if (active) {
          setDistribution(data)
        }
      } catch (err) {
        console.error('Failed to fetch the distribution details', err)
        if (active) setDistribution(null)
      } finally {
        if (active) setIsLoadingLines(false)
      }
    }
    fetchLines()
    return () => {
      active = false
    }
  }, [distributionId])

  const productMovementRows = (distribution?.lines ?? []).map(toProductMovementRow)

  const receivedStatusEntry = distribution?.statuses?.find(
    (entry) => entry.status === 'STOCK_RECEIVED'
  )
  const confirmedByUserId = receivedStatusEntry?.createdBy

  // Every status entry's createdBy is the acting user's raw id, not a display
  // name — resolve the whole history's actors in one pass.
  const [userNamesById, setUserNamesById] = useState<Record<string, string>>({})

  useEffect(() => {
    const userIds = Array.from(
      new Set(
        (distribution?.statuses ?? [])
          .map((entry) => entry.createdBy)
          .filter((id): id is string => Boolean(id))
      )
    )
    if (userIds.length === 0) {
      setUserNamesById({})
      return
    }
    let active = true
    const fetchUserNames = async () => {
      const resolved = await Promise.all(
        userIds.map(async (id) => {
          try {
            const user = await getUserById(id)
            return [id, user?.fullName ?? id] as const
          } catch (err) {
            console.error('Failed to fetch a status history actor', err)
            return [id, id] as const
          }
        })
      )
      if (active) setUserNamesById(Object.fromEntries(resolved))
    }
    fetchUserNames()
    return () => {
      active = false
    }
  }, [distribution])

  const destinationLabel = distribution?.destinationName ?? distribution?.destinationId ?? '—'
  const timelineSteps = buildTimelineSteps(
    distribution?.statuses ?? [],
    userNamesById,
    destinationLabel
  )
  const auditLogEntries = buildAuditLog(distribution?.statuses ?? [], userNamesById, destinationLabel)

  const movementInfo = {
    allocationNo: distribution?.allocationNo ?? '—',
    distributionNo: distribution?.warehouseDistributionId
      ? `WD${String(distribution.warehouseDistributionId).padStart(6, '0')}`
      : '—',
    source: distribution?.sourceName ?? distribution?.sourceId ?? '—',
    destination: destinationLabel,
    transferType: distribution?.distributionType ?? '—',
    status: distribution?.currentStatus
      ? distributionStatusLabel[distribution.currentStatus]
      : '—',
    receiptConfirmedOn: receivedStatusEntry?.createdAt
      ? formatDateTime(receivedStatusEntry.createdAt)
      : '—',
    confirmedBy: confirmedByUserId ? userNamesById[confirmedByUserId] ?? '—' : '—',
  }

  const distributionLines = distribution?.lines ?? []
  const totalIssueQuantity = distributionLines.reduce(
    (sum, line) => sum + (line.issueQuantity ?? 0),
    0
  )
  const totalDispatchedQuantity = distributionLines.reduce(
    (sum, line) => sum + (line.dispatchedQuantity ?? line.issueQuantity ?? 0),
    0
  )
  const totalReceivedQuantity = distributionLines.reduce(
    (sum, line) => sum + (line.receivedQuantity ?? 0),
    0
  )
  const isStockReceived = distribution?.currentStatus === 'STOCK_RECEIVED'

  const transactionSummary = {
    products: distributionLines.length,
    totalQuantity: `${totalIssueQuantity} Purchase Units`,
    dispatchedQuantity: `${totalDispatchedQuantity} Purchase Units`,
    receivedQuantity: `${totalReceivedQuantity} Purchase Units`,
    difference: `${totalDispatchedQuantity - totalReceivedQuantity} Purchase Units`,
    inventoryStatus: isStockReceived ? 'Updated' : 'Pending',
    billingStatus: isStockReceived ? 'Available' : 'Pending',
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* bg-secondary-50 is the colour <main> already paints, so this is invisible
          on screen — but the PDF capture and the printout only get a background
          if the captured element paints one itself, or the white cards vanish. */}
      <div
        id={PRINT_ROOT_ID}
        ref={printRef}
        className="flex w-full flex-col gap-5 bg-secondary-50"
      >
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
            <MovementTimeline steps={timelineSteps} isLoading={isLoadingLines} />
            <MovementInformation
              allocationNo={movementInfo.allocationNo}
              distributionNo={movementInfo.distributionNo}
              source={movementInfo.source}
              destination={movementInfo.destination}
              transferType={movementInfo.transferType}
              status={movementInfo.status}
              receiptConfirmedOn={movementInfo.receiptConfirmedOn}
              confirmedBy={movementInfo.confirmedBy}
            />
          </div>

          <ProductMovement rows={productMovementRows} isLoading={isLoadingLines} />
        </div>

        <div className="flex w-full flex-col gap-4 xl:w-90 xl:shrink-0">
          <TransactionSummary
            products={transactionSummary.products}
            totalQuantity={transactionSummary.totalQuantity}
            dispatchedQuantity={transactionSummary.dispatchedQuantity}
            receivedQuantity={transactionSummary.receivedQuantity}
            difference={transactionSummary.difference}
            inventoryStatus={transactionSummary.inventoryStatus}
            billingStatus={transactionSummary.billingStatus}
          />

          <AuditLog entries={auditLogEntries} isLoading={isLoadingLines} />
        </div>
      </div>

      </div>

      <StockMovementFooter
        onBack={onBack}
        onPrintTimeline={onPrintTimeline ?? handlePrint}
        onDownloadPdf={onDownloadPdf ?? handleDownloadPdf}
        isPrinting={isPrinting}
        isDownloading={isDownloading}
        canPrint={canPrint}
        canExport={canExport}
      />
    </div>
  )
}

export default StockMovementDetails
