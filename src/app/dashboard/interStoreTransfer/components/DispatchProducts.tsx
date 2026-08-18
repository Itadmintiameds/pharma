'use client'

import { useState } from 'react'
import {
  FileText,
  Truck,
  Calendar,
  Users,
  Pill,
  Box,
  ArrowLeft,
  LucideIcon,
} from 'lucide-react'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'

export type DispatchProductsStatus =
  | 'awaiting_acceptance'
  | 'ready_to_dispatch'
  | 'pending_receipt'
  | 'completed'
  | 'rejected'

interface DispatchProductsProps {
  destinationStore?: string
  status?: DispatchProductsStatus
  transferNo?: string
  fromStore?: string
  fromCode?: string
  toCode?: string
  requestedOn?: string
  requestedBy?: string
  onBack?: () => void
  onDispatch?: () => void
}

const statusBadgeClass: Record<DispatchProductsStatus, string> = {
  awaiting_acceptance: 'bg-danger-50 text-danger-600',
  ready_to_dispatch: 'bg-info-50 text-info-600',
  pending_receipt: 'bg-primary-100 text-primary-800',
  completed: 'bg-success-50 text-success-800',
  rejected: 'bg-warning-50 text-warning-600',
}

const statusDotClass: Record<DispatchProductsStatus, string> = {
  awaiting_acceptance: 'bg-danger-600',
  ready_to_dispatch: 'bg-info-600',
  pending_receipt: 'bg-primary-800',
  completed: 'bg-success-800',
  rejected: 'bg-warning-600',
}

const statusLabel: Record<DispatchProductsStatus, string> = {
  awaiting_acceptance: 'Awaiting Acceptance',
  ready_to_dispatch: 'Ready to Dispatch',
  pending_receipt: 'Pending Receipt',
  completed: 'Completed',
  rejected: 'Rejected',
}

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
      <p className="text-label-l4 font-medium text-pneutral-900">{value}</p>
      {subvalue && (
        <p className="text-label-l4 font-medium text-pneutral-900">{subvalue}</p>
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
}

const TransferSummaryBar = ({
  transferNo,
  fromStore,
  fromCode,
  toStore,
  toCode,
  requestedOn,
  requestedBy,
}: TransferSummaryBarProps) => (
  <div className="flex w-full flex-wrap items-start justify-between gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
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
  </div>
)

type ProductIcon = 'pill' | 'box'

interface DispatchProductRow {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  expiryDate: string
  availableStock: string
  requestedQty: string
  dispatchQty: string
  remarks: string
}

const initialDispatchProducts: DispatchProductRow[] = [
  {
    id: 1,
    icon: 'pill',
    productName: 'Dolo 650 Tablet',
    packInfo: 'Strip of 10 Tablets',
    batchNo: 'B24001',
    expiryDate: '31-Dec-2027',
    availableStock: '120 Strip',
    requestedQty: '20 Strip',
    dispatchQty: '15',
    remarks: 'Something',
  },
  {
    id: 2,
    icon: 'box',
    productName: 'Crocin Syrup',
    packInfo: 'Bottle of 60 ml',
    batchNo: 'C12001',
    expiryDate: '31-Aug-2027',
    availableStock: '25 Bottle',
    requestedQty: '15 Bottle',
    dispatchQty: '10',
    remarks: 'Something',
  },
]

const dispatchQtyInputClass =
  'h-12 w-full rounded-lg border border-pneutral-300 bg-white p-3 text-p4 font-regular text-success-600 focus:outline-none focus:border-secondary-700'

const remarksInputClass =
  'h-12 w-full rounded-lg border border-pneutral-300 bg-white p-3 text-p4 font-regular text-sneutral-800 focus:outline-none focus:border-secondary-700'

const buildDispatchColumns = (
  onFieldChange: (
    id: number,
    field: 'dispatchQty' | 'remarks',
    value: string
  ) => void
): TableColumn<DispatchProductRow>[] => [
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
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.batchNo}
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
    header: 'Available Stock',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-success-600">
        {row.availableStock}
      </span>
    ),
  },
  {
    header: 'Requested Qty',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.requestedQty}
      </span>
    ),
  },
  {
    header: 'Dispatch Qty',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <input
        type="text"
        inputMode="numeric"
        value={row.dispatchQty}
        onChange={(e) => onFieldChange(row.id, 'dispatchQty', e.target.value)}
        className={dispatchQtyInputClass}
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
        placeholder="Something"
        value={row.remarks}
        onChange={(e) => onFieldChange(row.id, 'remarks', e.target.value)}
        className={remarksInputClass}
      />
    ),
  },
]

const ProductsToDispatch = () => {
  const [items, setItems] = useState<DispatchProductRow[]>(
    initialDispatchProducts
  )

  const handleFieldChange = (
    id: number,
    field: 'dispatchQty' | 'remarks',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const columns = buildDispatchColumns(handleFieldChange)

  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
      <p className="text-label-l5 font-semibold text-secondary-700">
        Products to be Dispatched
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

const DispatchProductsActions = ({
  onBack,
  onDispatch,
}: {
  onBack?: () => void
  onDispatch?: () => void
}) => (
  <div className="sticky bottom-0 z-10 flex w-full flex-col items-stretch gap-4 border-t border-pneutral-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      className={`${actionButtonClass} w-[141px] border-2 border-pneutral-900 text-pneutral-900`}
    >
      <ArrowLeft className="size-5" strokeWidth={2} />
      Back
    </button>

    <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row">
      <button
        type="button"
        onClick={onDispatch}
        className={`${actionButtonClass} w-[200px] bg-primary-800 text-pneutral-50`}
      >
        Dispatch Products
      </button>
    </div>
  </div>
)

const DispatchProducts = ({
  destinationStore = 'Rajajinagar Medical Store',
  status = 'ready_to_dispatch',
  transferNo = 'PT000021',
  fromStore = 'Hebbal Medical Store',
  fromCode = 'STO0008',
  toCode = 'STO0012',
  requestedOn = '05-Aug-2026 09:15 AM',
  requestedBy = 'Warehouse Admin',
  onBack,
  onDispatch,
}: DispatchProductsProps) => {
  return (
    <div className="flex w-full flex-1 flex-col items-start gap-4">
      <div className="flex w-full flex-1 flex-col items-start gap-4">
        <div className="flex w-full flex-col items-start gap-5 sm:flex-row">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              Dispatch Products
            </h1>
            <p className="text-label-l4 font-regular text-pneutral-600">
              Prepare and dispatch the products to {destinationStore}.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1">
            <p className="text-label-l4 font-regular text-pneutral-600">Status</p>

            <span
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-label-l2 font-semibold ${statusBadgeClass[status]}`}
            >
              <span className={`size-1.5 shrink-0 rounded-full ${statusDotClass[status]}`} />
              {statusLabel[status]}
            </span>
          </div>
        </div>

        <TransferSummaryBar
          transferNo={transferNo}
          fromStore={fromStore}
          fromCode={fromCode}
          toStore={destinationStore}
          toCode={toCode}
          requestedOn={requestedOn}
          requestedBy={requestedBy}
        />

        <ProductsToDispatch />
      </div>

      <DispatchProductsActions onBack={onBack} onDispatch={onDispatch} />
    </div>
  )
}

export default DispatchProducts
