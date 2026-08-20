import React from 'react'
import {
  Check,
  Printer,
  Download,
  Warehouse,
  Store,
  ArrowLeftRight,
  Calendar,
  CalendarDays,
  Pill,
  Box,
  BarChart3,
} from 'lucide-react'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'
import {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
  WarehouseDistributionStatusData,
} from '@/types/WarehouseDistributionData'
import { formatDateTime } from '@/utils/formatDate'

interface ReceiptCompleteProps {
  referenceNo?: string
  fromStore?: string
  toStore?: string
  distribution?: WarehouseDistributionData | null
  onPrintReceipt?: () => void
  onDownload?: () => void
  onGoToDashboard?: () => void
}

const headerButtonClass =
  'flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700'

const EM_DASH = '—'

// First timestamp recorded for a given lifecycle status, if the transfer reached it.
const statusAt = (
  statuses: WarehouseDistributionStatusData[] | undefined,
  status: DistributionStatus
): string | undefined => statuses?.find((s) => s.status === status)?.createdAt

const TIMELINE_LABEL: Record<DistributionStatus, string> = {
  DISTRIBUTION_CREATED: 'Transfer Created',
  PRODUCTS_DISPATCHED: 'Dispatched',
  STOCK_RECEIVED: 'Receipt Completed',
  STOCK_REJECTED: 'Rejected',
}

interface ProgressStep {
  label: string
  timestamp?: string
  actor?: string
  bold?: boolean
}

const buildProgressSteps = (
  distribution?: WarehouseDistributionData | null
): ProgressStep[] => {
  const statuses = distribution?.statuses ?? []
  if (statuses.length === 0) {
    return [{ label: 'Receipt Completed', bold: true }]
  }

  return statuses.map((s, index) => ({
    label: TIMELINE_LABEL[s.status] ?? s.status,
    timestamp: s.createdAt ? formatDateTime(s.createdAt) : undefined,
    actor: s.createdBy,
    bold: index === statuses.length - 1,
  }))
}

const TransferProgressTimeline = ({ steps }: { steps: ProgressStep[] }) => (
  <div className="flex w-full flex-col items-start gap-5 rounded-2xl border border-pneutral-200 bg-white p-4 shadow-[0px_9px_28px_8px_rgba(0,0,0,0.05),0px_3px_6px_-4px_rgba(0,0,0,0.12),0px_6px_16px_0px_rgba(0,0,0,0.08)]">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Transfer Progress
    </p>

    <div className="flex w-full items-center">
      {steps.map((step, index) => (
        <React.Fragment key={`${step.label}-${index}`}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-600">
              <Check className="size-4.5 text-white" strokeWidth={3} />
            </div>

            <span
              className={`whitespace-nowrap text-center text-label-l2 text-pneutral-900 ${
                step.bold ? 'font-semibold' : 'font-regular'
              }`}
            >
              {step.label}
            </span>

            {step.timestamp && (
              <span className="whitespace-nowrap text-center text-label-l2 font-regular text-pneutral-600">
                {step.timestamp}
              </span>
            )}

            {step.actor && (
              <span className="whitespace-nowrap text-center text-label-l2 font-regular text-pneutral-600">
                {step.actor}
              </span>
            )}
          </div>

          {index < steps.length - 1 && (
            <div className="h-0.5 flex-1 bg-success-600" />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
)

const DateField = ({
  icon,
  label,
  labelClass,
  value,
}: {
  icon: React.ReactNode
  label: string
  labelClass?: string
  value: string
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
    <div className="flex items-center gap-3">
      {icon}
      <p className={`text-label-l3 font-regular ${labelClass ?? 'text-pneutral-500'}`}>
        {label}
      </p>
    </div>
    <p className="text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
)

const TransferDetails = ({
  referenceNo,
  fromStore,
  toStore,
  requestedOn,
  dispatchedOn,
  receivedOn,
}: {
  referenceNo: string
  fromStore: string
  toStore: string
  requestedOn: string
  dispatchedOn: string
  receivedOn: string
}) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <div className="flex w-full flex-wrap items-start gap-4">
      <div className="flex w-37.5 shrink-0 flex-col items-start gap-1">
        <p className="text-label-l3 font-regular text-pneutral-500">Transfer No.</p>
        <p className="text-label-l4 font-semibold text-primary-800">{referenceNo}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-8">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <p className="text-label-l3 font-regular text-pneutral-500">
            From (Sending Store)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-50 p-2">
              <Warehouse className="size-8 text-secondary-700" strokeWidth={1.5} />
            </div>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {fromStore}
            </p>
          </div>
        </div>

        <ArrowLeftRight className="size-6 shrink-0 text-secondary-700" strokeWidth={2} />

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <p className="text-label-l3 font-regular text-pneutral-500">
            To (Receiving Store)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-50 p-2">
              <Store className="size-8 text-secondary-700" strokeWidth={1.5} />
            </div>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {toStore}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="h-px w-full bg-pneutral-200" />

    <div className="flex w-full flex-wrap items-start gap-4">
      <DateField
        icon={<Calendar className="size-5 text-secondary-700" strokeWidth={2} />}
        label="Requested On"
        value={requestedOn}
      />
      <DateField
        icon={<Calendar className="size-5 text-secondary-700" strokeWidth={2} />}
        label="Dispatch Date & Time"
        value={dispatchedOn}
      />
      <DateField
        icon={<CalendarDays className="size-6 text-secondary-700" strokeWidth={2} />}
        label="Receipt Date & Time"
        labelClass="text-pneutral-600"
        value={receivedOn}
      />
    </div>
  </div>
)

type ProductIcon = 'pill' | 'box'

interface ReceivedItem {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  purchaseUnit: string
  expiryDate: string
  dispatchedQty: string
  receivedQty: string
  damagedQty: string
}

const iconForUnit = (unit?: string): ProductIcon => {
  const u = (unit ?? '').toLowerCase()
  return u.includes('strip') || u.includes('tablet') || u.includes('tab')
    ? 'pill'
    : 'box'
}

const mapLineToReceivedItem = (
  line: WarehouseDistributionLineData,
  index: number
): ReceivedItem => {
  const unit = line.packaging?.purchaseUnit ?? ''
  const contains = line.packaging?.purchaseUnitContains
  const dispatched = line.dispatchedQuantity ?? line.issueQuantity ?? 0
  const suffix = unit ? ` ${unit}` : ''
  return {
    id: line.warehouseDistributionDetailsId ?? index + 1,
    icon: iconForUnit(unit),
    productName: line.product?.productName ?? line.productId,
    packInfo:
      unit && contains && contains > 1 ? `${unit} of ${contains}` : unit || EM_DASH,
    batchNo: line.batch?.batchNumber ?? line.batchId ?? EM_DASH,
    purchaseUnit: unit || EM_DASH,
    expiryDate: line.batch?.expiryDate ? formatDateTime(line.batch.expiryDate) : EM_DASH,
    dispatchedQty: `${dispatched}${suffix}`,
    receivedQty: `${line.receivedQuantity ?? 0}${suffix}`,
    damagedQty: `${line.damagedQuantity ?? 0}${suffix}`,
  }
}

const receivedColumns: TableColumn<ReceivedItem>[] = [
  {
    header: '#',
    width: 'w-12',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-regular text-pneutral-900">{row.id}</span>
    ),
  },
  {
    header: 'Product Details',
    render: (row) => (
      <div className="flex items-center gap-2">
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded bg-secondary-100">
          {row.icon === 'pill' ? (
            <Pill className="size-3.5 text-secondary-700" strokeWidth={2} />
          ) : (
            <Box className="size-3.5 text-secondary-700" strokeWidth={2} />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-p3 font-semibold text-pneutral-900">
            {row.productName}
          </span>
          <span className="text-p3 font-regular text-pneutral-600">
            {row.packInfo}
          </span>
        </div>
      </div>
    ),
  },
  {
    header: 'Batch No.',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-regular text-pneutral-900">{row.batchNo}</span>
    ),
  },
  {
    header: 'Purchase Unit',
    width: 'w-24',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.purchaseUnit}
      </span>
    ),
  },
  {
    header: 'Expiry Date',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.expiryDate}
      </span>
    ),
  },
  {
    header: 'Dispatched Qty',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.dispatchedQty}
      </span>
    ),
  },
  {
    header: 'Received Qty',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.receivedQty}
      </span>
    ),
  },
  {
    header: 'Damaged/ Not Received Qty',
    width: 'w-36',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.damagedQty}
      </span>
    ),
  },
  {
    header: 'Status',
    width: 'w-32',
    align: 'center',
    render: () => (
      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-success-600 bg-success-50 px-3 py-1 text-label-l3 font-medium text-success-800">
        Received
      </span>
    ),
  },
]

const ProductsReceived = ({ items }: { items: ReceivedItem[] }) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Products Received
    </p>

    {items.length === 0 ? (
      <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
        No products recorded.
      </p>
    ) : (
      <TableWithoutGrid
        columns={receivedColumns}
        data={items}
        rowKey={(row) => row.id.toString()}
        headerVariant="primary"
        container="box"
      />
    )}
  </div>
)

const actionButtonClass =
  'flex h-12 min-w-27 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-label-l4 font-medium sm:flex-none'

const ReceiptCompleteActions = ({
  onGoToDashboard,
}: {
  onGoToDashboard?: () => void
}) => (
  <div className="flex w-full items-center justify-end border-t border-pneutral-200 bg-white py-4">
    <button
      type="button"
      onClick={onGoToDashboard}
      className={`${actionButtonClass} bg-primary-800 text-pneutral-50`}
    >
      <BarChart3 className="size-5" strokeWidth={2} />
      Go to Dashboard
    </button>
  </div>
)

const ReceiptComplete = ({
  referenceNo,
  fromStore,
  toStore,
  distribution,
  onPrintReceipt,
  onDownload,
  onGoToDashboard,
}: ReceiptCompleteProps) => {
  const statuses = distribution?.statuses
  const reference = distribution?.allocationNo ?? referenceNo ?? EM_DASH
  const from = distribution?.sourceName ?? fromStore ?? EM_DASH
  const to = distribution?.destinationName ?? toStore ?? EM_DASH

  const requestedOn = formatDateTime(
    statusAt(statuses, 'DISTRIBUTION_CREATED') ?? distribution?.allocationDate,
    EM_DASH
  )
  const dispatchedOn = formatDateTime(statusAt(statuses, 'PRODUCTS_DISPATCHED'), EM_DASH)
  const receivedOn = formatDateTime(statusAt(statuses, 'STOCK_RECEIVED'), EM_DASH)

  const progressSteps = buildProgressSteps(distribution)
  const receivedItems = (distribution?.lines ?? []).map(mapLineToReceivedItem)

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              Receipt Completed
            </h1>
            <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
              {reference}
            </span>
          </div>

          <p className="text-label-l4 font-regular text-pneutral-600">
            The stock receipt has been completed successfully.
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-4">
          <button
            type="button"
            onClick={onPrintReceipt}
            className={headerButtonClass}
          >
            <Printer className="size-5" strokeWidth={2} />
            Print Receipt
          </button>

          <button
            type="button"
            onClick={onDownload}
            className={headerButtonClass}
          >
            <Download className="size-5" strokeWidth={2} />
            Download
          </button>
        </div>
      </div>

      <TransferProgressTimeline steps={progressSteps} />

      <TransferDetails
        referenceNo={reference}
        fromStore={from}
        toStore={to}
        requestedOn={requestedOn}
        dispatchedOn={dispatchedOn}
        receivedOn={receivedOn}
      />

      <ProductsReceived items={receivedItems} />

      <ReceiptCompleteActions onGoToDashboard={onGoToDashboard} />
    </div>
  )
}

export default ReceiptComplete
