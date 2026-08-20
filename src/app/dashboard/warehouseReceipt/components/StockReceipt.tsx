'use client'

import React, { useState } from 'react'
import { Check, Pill, Box, ArrowLeft, CheckCircle2 } from 'lucide-react'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'

interface StockReceiptProps {
  referenceNo?: string
  fromLocation?: string
  currentStatus?: string
  statusDescription?: string
  onBack?: () => void
  onConfirmReceipt?: () => void
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

type ProductIcon = 'pill' | 'box'

interface ReceiveItem {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  expiryDate: string
  dispatchedQty: string
  receivedQty: string
  damagedQty: string
  remarks: string
}

const initialReceiveItems: ReceiveItem[] = [
  {
    id: 1,
    icon: 'pill',
    productName: 'Dolo 650 Tablet',
    packInfo: 'Strip of 10 Tablets',
    batchNo: 'B24001',
    expiryDate: '31-Dec-2027',
    dispatchedQty: '20 Strip',
    receivedQty: '15',
    damagedQty: '15',
    remarks: '15',
  },
  {
    id: 2,
    icon: 'box',
    productName: 'Crocin Syrup',
    packInfo: 'Bottle of 60 ml',
    batchNo: 'C12001',
    expiryDate: '31-Aug-2027',
    dispatchedQty: '15 Bottle',
    receivedQty: '15',
    damagedQty: '15',
    remarks: '15',
  },
]

const receiveInputClass =
  'h-12 w-full rounded-lg border border-pneutral-300 bg-white p-3 text-p4 font-regular text-sneutral-800 focus:outline-none focus:border-secondary-700'

const buildReceiveColumns = (
  onFieldChange: (
    id: number,
    field: 'receivedQty' | 'damagedQty' | 'remarks',
    value: string
  ) => void
): TableColumn<ReceiveItem>[] => [
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
      <span className="text-p3 font-regular text-pneutral-900">{row.batchNo}</span>
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
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <input
        type="text"
        inputMode="numeric"
        value={row.receivedQty}
        onChange={(e) => onFieldChange(row.id, 'receivedQty', e.target.value)}
        className={receiveInputClass}
      />
    ),
  },
  {
    header: 'Damaged/ Not Received Qty',
    width: 'w-40',
    align: 'center',
    render: (row) => (
      <input
        type="text"
        inputMode="numeric"
        value={row.damagedQty}
        onChange={(e) => onFieldChange(row.id, 'damagedQty', e.target.value)}
        className={receiveInputClass}
      />
    ),
  },
  {
    header: 'Remarks',
    width: 'w-50',
    align: 'center',
    render: (row) => (
      <input
        type="text"
        value={row.remarks}
        onChange={(e) => onFieldChange(row.id, 'remarks', e.target.value)}
        className={receiveInputClass}
      />
    ),
  },
]

const ProductsToReceive = () => {
  const [items, setItems] = useState<ReceiveItem[]>(initialReceiveItems)

  const handleFieldChange = (
    id: number,
    field: 'receivedQty' | 'damagedQty' | 'remarks',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const columns = buildReceiveColumns(handleFieldChange)

  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
      <p className="text-label-l5 font-semibold text-secondary-700">
        Products to be Received
      </p>

      <TableWithoutGrid
        columns={columns}
        data={items}
        rowKey={(row) => row.id.toString()}
        headerVariant="primary"
        container="box"
      />
    </div>
  )
}

const actionButtonClass =
  'flex h-12 min-w-27 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-label-l4 font-medium sm:flex-none'

const StockReceiptActions = ({
  onBack,
  onConfirmReceipt,
}: {
  onBack?: () => void
  onConfirmReceipt?: () => void
}) => (
  <div className="flex w-full flex-col items-stretch gap-4 border-t border-pneutral-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      className={`${actionButtonClass} border-2 border-pneutral-900 text-pneutral-900`}
    >
      <ArrowLeft className="size-5" strokeWidth={2} />
      Back
    </button>

    <button
      type="button"
      onClick={onConfirmReceipt}
      className={`${actionButtonClass} bg-primary-800 text-pneutral-50`}
    >
      <CheckCircle2 className="size-5" strokeWidth={2} />
      Confirm Receipt
    </button>
  </div>
)

const StockReceipt = ({
  referenceNo = 'PT000021',
  fromLocation = 'Hebbal Medical Store',
  currentStatus = 'Pending Receipt',
  statusDescription = 'Awaiting stock receipt confirmation from Rajajinagar Medical Store.',
  onBack,
  onConfirmReceipt,
}: StockReceiptProps) => {
  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h5 font-semibold text-pneutral-900">
            Stock Receipt
          </h1>
          <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
            {referenceNo}
          </span>
        </div>

        <p className="text-label-l4 font-regular text-pneutral-500">
          Confirm the received quantities from {fromLocation}.
        </p>
      </div>

      <div className="flex w-full flex-col items-stretch gap-4 rounded-2xl border border-pneutral-200 bg-white p-4 lg:flex-row">
        <TransferStatusStepper />
        <CurrentStatusPanel statusLabel={currentStatus} description={statusDescription} />
      </div>

      <ProductsToReceive />

      <StockReceiptActions onBack={onBack} onConfirmReceipt={onConfirmReceipt} />
    </div>
  )
}

export default StockReceipt
