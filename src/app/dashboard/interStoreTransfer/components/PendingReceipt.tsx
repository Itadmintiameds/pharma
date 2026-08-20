import React from 'react'
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

interface PendingReceiptProps {
  referenceNo?: string
  fromStore?: string
  fromCode?: string
  destinationStore?: string
  toCode?: string
  requestedOn?: string
  requestedBy?: string
  dispatchedOn?: string
  onPrintDispatchNote?: () => void
  onBack?: () => void
  onClose?: () => void
}

type StepState = 'done' | 'current' | 'upcoming'

interface TransferStep {
  label: string
  state: StepState
}

const transferSteps: TransferStep[] = [
  { label: 'Requested', state: 'done' },
  { label: 'Accepted', state: 'done' },
  { label: 'Dispatched', state: 'done' },
  { label: 'Pending Receipt', state: 'current' },
  { label: 'Completed', state: 'upcoming' },
]

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

const TransferStatusStepper = () => (
  <div className="flex w-full flex-1 flex-col gap-5 rounded-2xl bg-white p-4 shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]">
    <p className="text-label-l5 font-semibold text-secondary-700">Transfer Status</p>

    <div className="flex w-full items-center">
      {transferSteps.map((step, index) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-2">
            <StepCircle step={step} index={index} />
            <span
              className={`w-22.5 text-center text-label-l2 ${stepLabelClass(step.state)}`}
            >
              {step.label}
            </span>
          </div>

          {index < transferSteps.length - 1 && (
            <div className="h-0.5 flex-1 bg-success-600" />
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

interface DispatchedProductRow {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  dispatchedQty: string
  pendingReceiptQty: string
  expiryDate: string
  status: 'pending_receipt'
}

const dispatchedProducts: DispatchedProductRow[] = [
  {
    id: 1,
    icon: 'pill',
    productName: 'Dolo 650 Tablet',
    packInfo: 'Strip of 10 Tablets',
    batchNo: 'B24001',
    dispatchedQty: '20 Strip',
    pendingReceiptQty: '20 Strip',
    expiryDate: '31-Dec-2027',
    status: 'pending_receipt',
  },
  {
    id: 2,
    icon: 'box',
    productName: 'Crocin Syrup',
    packInfo: 'Bottle of 60 ml',
    batchNo: 'C12001',
    dispatchedQty: '15 Bottle',
    pendingReceiptQty: '15 Bottle',
    expiryDate: '31-Aug-2027',
    status: 'pending_receipt',
  },
]

const receiptStatusLabel: Record<DispatchedProductRow['status'], string> = {
  pending_receipt: 'Pending Receipt',
}

const ReceiptStatusBadge = ({ status }: { status: DispatchedProductRow['status'] }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-danger-600 bg-danger-50 px-3 py-1 text-label-l3 font-medium text-danger-600">
    <span className="size-1.5 shrink-0 rounded-full bg-danger-600" />
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

const DispatchedProductsCard = () => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Dispatched Products
    </p>

    <TableWithoutGrid
      columns={dispatchedProductColumns}
      data={dispatchedProducts}
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
  onPrintDispatchNote,
  onBack,
  onClose,
}: PendingReceiptProps) => {
  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-5 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              Pending Receipt
            </h1>
            <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
              {referenceNo}
            </span>
          </div>

          <p className="text-p3 font-regular text-pneutral-500">
            Products have been dispatched. Awaiting receipt confirmation from{' '}
            {destinationStore}.
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
        <TransferStatusStepper />
        <CurrentStatusPanel
          statusLabel="Pending Receipt"
          description={`Awaiting stock receipt confirmation from ${destinationStore}.`}
        />
      </div>

      <TransferSummaryBar
        transferNo={referenceNo}
        fromStore={fromStore}
        fromCode={fromCode}
        toStore={destinationStore}
        toCode={toCode}
        requestedOn={requestedOn}
        requestedBy={requestedBy}
        dispatchedOn={dispatchedOn}
      />

      <DispatchedProductsCard />

      <PendingReceiptActions onBack={onBack} onClose={onClose} />
    </div>
  )
}

export default PendingReceipt
