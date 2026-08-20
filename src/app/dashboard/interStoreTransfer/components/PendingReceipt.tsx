import React, { useMemo } from 'react'
import {
  Check,
  Printer,
  FileText,
  Truck,
  Calendar,
  Users,
  Pill,
  Box,
  ArrowLeft,
  X,
  LucideIcon,
} from 'lucide-react'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'
import type {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
} from '@/types/WarehouseDistributionData'
import { formatDate, formatDateTime } from '@/utils/formatDate'

interface PendingReceiptProps {
  referenceNo?: string
  fromStore?: string
  fromCode?: string
  destinationStore?: string
  toCode?: string
  requestedOn?: string
  requestedBy?: string
  dispatchedOn?: string
  // The distribution as the dispatch call returned it — the source for this summary.
  distribution?: WarehouseDistributionData | null
  onPrintDispatchNote?: () => void
  onBack?: () => void
  onClose?: () => void
}

type StepState = 'done' | 'current' | 'upcoming'

interface TransferStep {
  label: string
  state: StepState
}

const STEP_LABELS = [
  'Requested',
  'Accepted',
  'Dispatched',
  'Pending Receipt',
  'Completed',
] as const

// Where the lifecycle sits on the 5-step bar. This screen is reached straight after a
// dispatch, so "Pending Receipt" is the live step unless the destination already received.
const currentStepIndexFor = (status?: DistributionStatus): number => {
  switch (status) {
    case 'STOCK_RECEIVED':
      return 4
    case 'DISTRIBUTION_CREATED':
      return 2
    case 'PRODUCTS_DISPATCHED':
    default:
      return 3
  }
}

const buildTransferSteps = (status?: DistributionStatus): TransferStep[] => {
  const currentIndex = currentStepIndexFor(status)
  return STEP_LABELS.map((label, index) => ({
    label,
    state:
      index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

const StepCircle = ({ step, index }: { step: TransferStep; index: number }) => {
  if (step.state === 'done') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-600">
        <Check className="size-4.5 text-white" strokeWidth={3} />
      </div>
    )
  }

  if (step.state === 'current') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-700">
        <span className="text-label-l4 font-semibold text-white">{index + 1}</span>
      </div>
    )
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-pneutral-200">
      <span className="text-label-l4 font-semibold text-pneutral-500">{index + 1}</span>
    </div>
  )
}

const stepLabelClass = (state: StepState) => {
  if (state === 'current') return 'font-semibold text-secondary-700'
  if (state === 'upcoming') return 'font-regular text-pneutral-500'
  return 'font-regular text-pneutral-900'
}

const TransferStatusStepper = ({ steps }: { steps: TransferStep[] }) => (
  <div className="flex w-full flex-1 flex-col gap-5 rounded-2xl bg-white p-4 shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]">
    <p className="text-label-l5 font-semibold text-secondary-700">Transfer Status</p>

    <div className="flex w-full items-center">
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-2">
            <StepCircle step={step} index={index} />
            <span
              className={`w-22.5 text-center text-label-l2 ${stepLabelClass(step.state)}`}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 ${
                step.state === 'done' ? 'bg-success-600' : 'bg-pneutral-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
)

const CurrentStatusPanel = ({
  statusLabel,
  description,
}: {
  statusLabel: string
  description: string
}) => (
  <div className="flex w-full shrink-0 flex-col items-start justify-center gap-3 self-stretch rounded-2xl bg-secondary-100 p-4 lg:w-65">
    <p className="text-label-l2 font-regular text-pneutral-500">Current Status</p>
    <p className="text-h5 font-semibold text-secondary-700">{statusLabel}</p>
    <p className="text-label-l2 font-regular text-pneutral-900">{description}</p>
  </div>
)

interface SummaryItemProps {
  Icon: LucideIcon
  iconBg: string
  iconColor: string
  label: string
  value: string
  subvalue?: string
}

const SummaryItem = ({
  Icon,
  iconBg,
  iconColor,
  label,
  value,
  subvalue,
}: SummaryItemProps) => (
  <div className="flex items-center gap-3">
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}
    >
      <Icon className={`size-4.5 ${iconColor}`} strokeWidth={1.8} />
    </div>
    <div className="flex flex-col items-start gap-1">
      <p className="text-p3 font-regular text-pneutral-600">{label}</p>
      <p className="text-p3 font-medium text-pneutral-900">{value}</p>
      {subvalue && (
        <p className="text-p3 font-medium text-pneutral-900">{subvalue}</p>
      )}
    </div>
  </div>
)

interface TransferSummaryBarProps {
  transferNo: string
  fromStore: string
  fromCode: string
  toStore: string
  toCode: string
  requestedOn: string
  requestedBy: string
  dispatchedOn: string
}

const TransferSummaryBar = ({
  transferNo,
  fromStore,
  fromCode,
  toStore,
  toCode,
  requestedOn,
  requestedBy,
  dispatchedOn,
}: TransferSummaryBarProps) => (
  <div className="flex w-full flex-wrap items-start justify-between gap-y-4 gap-x-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <SummaryItem
      Icon={FileText}
      iconBg="bg-secondary-100"
      iconColor="text-secondary-700"
      label="Transfer No."
      value={transferNo}
    />
    <SummaryItem
      Icon={Truck}
      iconBg="bg-secondary-100"
      iconColor="text-secondary-700"
      label="From (Sending Store)"
      value={fromStore}
      subvalue={fromCode}
    />
    <SummaryItem
      Icon={Truck}
      iconBg="bg-success-50"
      iconColor="text-success-700"
      label="To (Receiving Store)"
      value={toStore}
      subvalue={toCode}
    />
    <SummaryItem
      Icon={Calendar}
      iconBg="bg-secondary-100"
      iconColor="text-secondary-700"
      label="Requested On"
      value={requestedOn}
    />
    <SummaryItem
      Icon={Users}
      iconBg="bg-secondary-100"
      iconColor="text-secondary-700"
      label="Requested By"
      value={requestedBy}
    />
    <div className="basis-full">
      <SummaryItem
        Icon={Calendar}
        iconBg="bg-secondary-100"
        iconColor="text-secondary-700"
        label="Dispatched On"
        value={dispatchedOn}
      />
    </div>
  </div>
)

type ProductIcon = 'pill' | 'box'

type LineReceiptStatus = 'pending_receipt' | 'received'

interface DispatchedProductRow {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  dispatchedQty: string
  pendingReceiptQty: string
  expiryDate: string
  status: LineReceiptStatus
}

// "Strip"/"Tablet" packs read as pills; anything else (Bottle, Box, …) gets the box icon.
const iconForUnit = (unit?: string): ProductIcon => {
  const u = (unit ?? '').toLowerCase()
  return u.includes('strip') || u.includes('tablet') || u.includes('tab')
    ? 'pill'
    : 'box'
}

// One dispatched line -> one summary row. Anything dispatched but not yet confirmed
// by the destination is still pending receipt.
const mapLineToDispatchedRow = (
  line: WarehouseDistributionLineData,
  index: number
): DispatchedProductRow => {
  const unit = line.packaging?.purchaseUnit ?? ''
  const contains = line.packaging?.purchaseUnitContains
  const dispatched = line.dispatchedQuantity ?? line.issueQuantity ?? 0
  const received = line.receivedQuantity
  const pending = received != null ? Math.max(dispatched - received, 0) : dispatched
  const withUnit = (qty: number) => (unit ? `${qty} ${unit}` : String(qty))

  return {
    id: line.warehouseDistributionDetailsId ?? index + 1,
    icon: iconForUnit(unit),
    productName: line.product?.productName ?? line.productId,
    packInfo:
      unit && contains && contains > 1 ? `${unit} of ${contains}` : unit || '—',
    batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
    dispatchedQty: withUnit(dispatched),
    pendingReceiptQty: withUnit(pending),
    expiryDate: formatDate(line.batch?.expiryDate),
    status: pending === 0 ? 'received' : 'pending_receipt',
  }
}

const receiptStatusLabel: Record<LineReceiptStatus, string> = {
  pending_receipt: 'Pending Receipt',
  received: 'Received',
}

const receiptStatusClass: Record<LineReceiptStatus, string> = {
  pending_receipt: 'border-danger-600 bg-danger-50 text-danger-600',
  received: 'border-success-600 bg-success-50 text-success-800',
}

const receiptStatusDotClass: Record<LineReceiptStatus, string> = {
  pending_receipt: 'bg-danger-600',
  received: 'bg-success-600',
}

const ReceiptStatusBadge = ({ status }: { status: LineReceiptStatus }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-label-l3 font-medium ${receiptStatusClass[status]}`}
  >
    <span
      className={`size-1.5 shrink-0 rounded-full ${receiptStatusDotClass[status]}`}
    />
    {receiptStatusLabel[status]}
  </span>
)

const dispatchedProductColumns: TableColumn<DispatchedProductRow>[] = [
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
          <span className="text-p3 font-medium text-pneutral-900">
            {row.productName}
          </span>
          <span className="text-p3 font-regular text-pneutral-500">
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
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.batchNo}
      </span>
    ),
  },
  {
    header: 'Dispatched Qty',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-medium text-pneutral-900">
        {row.dispatchedQty}
      </span>
    ),
  },
  {
    header: 'Pending Receipt Qty',
    width: 'w-36',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-medium text-pneutral-900">
        {row.pendingReceiptQty}
      </span>
    ),
  },
  {
    header: 'Expiry Date',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.expiryDate}
      </span>
    ),
  },
  {
    header: 'Status',
    align: 'center',
    render: (row) => <ReceiptStatusBadge status={row.status} />,
  },
]

const DispatchedProductsCard = ({ rows }: { rows: DispatchedProductRow[] }) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Dispatched Products
    </p>

    <TableWithoutGrid
      columns={dispatchedProductColumns}
      data={rows}
      rowKey={(row) => row.id.toString()}
      headerVariant="primary"
      container="box"
    />
  </div>
)

const actionButtonClass =
  'flex h-12 min-w-27 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-label-l4 font-medium sm:flex-none'

const PendingReceiptActions = ({
  onBack,
  onClose,
}: {
  onBack?: () => void
  onClose?: () => void
}) => (
  <div className="flex w-full flex-col items-stretch gap-4 border-t border-pneutral-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      className={`${actionButtonClass} w-35.25 border-2 border-pneutral-900 text-pneutral-900`}
    >
      <ArrowLeft className="size-5" strokeWidth={2} />
      Back
    </button>

    <button
      type="button"
      onClick={onClose}
      className={`${actionButtonClass} w-35.25 bg-primary-800 text-pneutral-50`}
    >
      <X className="size-5" strokeWidth={2} />
      Close
    </button> 
  </div>
)

const PendingReceipt = ({
  referenceNo = 'PT000021',
  fromStore = 'Hebbal Medical Store',
  fromCode = 'STO0008',
  destinationStore = 'Rajajinagar Medical Store',
  toCode = 'STO0012',
  requestedOn = '05-Aug-2026 09:15 AM',
  requestedBy = 'Warehouse Admin',
  dispatchedOn = '05-Aug-2026 09:15 AM',
  distribution,
  onPrintDispatchNote,
  onBack,
  onClose,
}: PendingReceiptProps) => {
  const productRows = useMemo(
    () => (distribution?.lines ?? []).map(mapLineToDispatchedRow),
    [distribution]
  )

  const steps = buildTransferSteps(distribution?.currentStatus)
  const isReceived = distribution?.currentStatus === 'STOCK_RECEIVED'

  const allocationNo = distribution?.allocationNo ?? referenceNo
  const source = distribution?.sourceName?.trim() || distribution?.sourceId
  const destination =
    distribution?.destinationName?.trim() || distribution?.destinationId
  const destinationLabel = destination || destinationStore

  // The dispatch timestamp lives in the status history rather than on the header.
  const dispatchedAt = distribution?.statuses?.find(
    (entry) => entry.status === 'PRODUCTS_DISPATCHED'
  )?.createdAt

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-5 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              {isReceived ? 'Transfer Completed' : 'Pending Receipt'}
            </h1>
            <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
              {allocationNo}
            </span>
          </div>

          <p className="text-p3 font-regular text-pneutral-500">
            {isReceived
              ? `Stock has been received and recorded by ${destinationLabel}.`
              : `Products have been dispatched. Awaiting receipt confirmation from ${destinationLabel}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={onPrintDispatchNote}
          className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700 sm:w-auto sm:min-w-50"
        >
          <Printer className="size-5" strokeWidth={2} />
          Print Dispatch Note
        </button>
      </div>

      <div className="flex w-full flex-col items-stretch gap-4 rounded-2xl border border-pneutral-200 bg-white p-4 lg:flex-row">
        <TransferStatusStepper steps={steps} />
        <CurrentStatusPanel
          statusLabel={isReceived ? 'Completed' : 'Pending Receipt'}
          description={
            isReceived
              ? `${destinationLabel} has confirmed the stock receipt.`
              : `Awaiting stock receipt confirmation from ${destinationLabel}.`
          }
        />
      </div>

      <TransferSummaryBar
        transferNo={allocationNo}
        fromStore={source || fromStore}
        fromCode={distribution?.sourceId ?? fromCode}
        toStore={destinationLabel}
        toCode={distribution?.destinationId ?? toCode}
        requestedOn={
          distribution?.allocationDate
            ? formatDateTime(distribution.allocationDate)
            : requestedOn
        }
        requestedBy={
          distribution?.allocationRequestedBy ||
          distribution?.createdBy ||
          requestedBy
        }
        dispatchedOn={dispatchedAt ? formatDateTime(dispatchedAt) : dispatchedOn}
      />

      <DispatchedProductsCard rows={productRows} />

      <PendingReceiptActions onBack={onBack} onClose={onClose} />
    </div>
  )
}

export default PendingReceipt
