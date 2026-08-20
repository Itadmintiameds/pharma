'use client'

import { useMemo, useState } from 'react'
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
import type {
  DispatchWarehouseDistributionLineRequest,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
} from '@/types/WarehouseDistributionData'
import { dispatchAllocation } from '@/services/WarehouseDistributionService'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { showToast } from '@/app/components/common/Toast'

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
  distribution?: WarehouseDistributionData | null
  loading?: boolean
  onBack?: () => void
  // Fires after the dispatch is accepted server-side; receives the updated distribution.
  onDispatched?: (updated: WarehouseDistributionData) => void
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
  requestedQty: string
  dispatchQty: string
  remarks: string
}

// "Strip"/"Tablet" packs read as pills; anything else (Bottle, Box, …) gets the box icon.
const iconForUnit = (unit?: string): ProductIcon => {
  const u = (unit ?? '').toLowerCase()
  return u.includes('strip') || u.includes('tablet') || u.includes('tab')
    ? 'pill'
    : 'box'
}

// One issued line -> one editable dispatch row. Dispatch qty defaults to the issued
// qty (the common case is "everything ships"); the user edits it down for shortfalls.
const mapLineToDispatchRow = (
  line: WarehouseDistributionLineData,
  index: number
): DispatchProductRow => {
  const unit = line.packaging?.purchaseUnit ?? ''
  const contains = line.packaging?.purchaseUnitContains
  const issued = line.issueQuantity ?? 0

  return {
    id: line.warehouseDistributionDetailsId ?? index + 1,
    icon: iconForUnit(unit),
    productName: line.product?.productName ?? line.productId,
    packInfo:
      unit && contains && contains > 1 ? `${unit} of ${contains}` : unit || '—',
    batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
    expiryDate: formatDate(line.batch?.expiryDate),
    requestedQty: unit ? `${issued} ${unit}` : String(issued),
    dispatchQty: String(line.dispatchedQuantity ?? issued),
    remarks: line.dispatchRemarks ?? '',
  }
}

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

const ProductsToDispatch = ({
  items,
  onFieldChange,
  loading,
}: {
  items: DispatchProductRow[]
  onFieldChange: (
    id: number,
    field: 'dispatchQty' | 'remarks',
    value: string
  ) => void
  loading?: boolean
}) => {
  const columns = buildDispatchColumns(onFieldChange)

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
        loading={loading}
      />
    </div>
  )
}

const actionButtonClass =
  'flex h-12 min-w-27 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-label-l4 font-medium sm:flex-none'

const DispatchProductsActions = ({
  onBack,
  onDispatch,
  submitting,
  disabled,
}: {
  onBack?: () => void
  onDispatch?: () => void
  submitting?: boolean
  disabled?: boolean
}) => (
  <div className="sticky bottom-0 z-10 flex w-full flex-col items-stretch gap-4 border-t border-pneutral-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      disabled={submitting}
      className={`${actionButtonClass} w-[141px] border-2 border-pneutral-900 text-pneutral-900 disabled:opacity-50`}
    >
      <ArrowLeft className="size-5" strokeWidth={2} />
      Back
    </button>

    <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row">
      <button
        type="button"
        onClick={onDispatch}
        disabled={submitting || disabled}
        className={`${actionButtonClass} w-[200px] bg-primary-800 text-pneutral-50 disabled:opacity-50`}
      >
        {submitting ? 'Dispatching…' : 'Dispatch Products'}
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
  distribution,
  loading,
  onBack,
  onDispatched,
}: DispatchProductsProps) => {
  const dispatchRows = useMemo(
    () => (distribution?.lines ?? []).map(mapLineToDispatchRow),
    [distribution]
  )

  // Only the user's edits are held in state, keyed by line id, so a newly loaded
  // distribution re-seeds the table without an effect syncing a copy of the rows.
  const [edits, setEdits] = useState<
    Record<number, Partial<Pick<DispatchProductRow, 'dispatchQty' | 'remarks'>>>
  >({})
  const [submitting, setSubmitting] = useState(false)

  const items = useMemo(
    () => dispatchRows.map((row) => ({ ...row, ...edits[row.id] })),
    [dispatchRows, edits]
  )

  const handleFieldChange = (
    id: number,
    field: 'dispatchQty' | 'remarks',
    value: string
  ) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const handleDispatch = async () => {
    const distributionId = distribution?.warehouseDistributionId
    if (distributionId == null) {
      showToast.error('Missing distribution reference — cannot dispatch.')
      return
    }

    const lines: DispatchWarehouseDistributionLineRequest[] = items.map((item) => {
      const remarks = item.remarks.trim()
      return {
        warehouseDistributionDetailsId: item.id,
        dispatchedQuantity: Number(item.dispatchQty) || 0,
        remarks: remarks ? remarks : null,
      }
    })

    setSubmitting(true)
    try {
      const updated = await dispatchAllocation(distributionId, { lines })
      showToast.success('Products dispatched.')
      onDispatched?.(updated)
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to dispatch the allocation.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Everything the summary bar shows comes off the fetched distribution; the
  // props stay as fallbacks for when it is still loading.
  const source = distribution?.sourceName?.trim() || distribution?.sourceId
  const destination =
    distribution?.destinationName?.trim() || distribution?.destinationId

  return (
    <div className="flex w-full flex-1 flex-col items-start gap-4">
      <div className="flex w-full flex-1 flex-col items-start gap-4">
        <div className="flex w-full flex-col items-start gap-5 sm:flex-row">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              Dispatch Products
            </h1>
            <p className="text-label-l4 font-regular text-pneutral-600">
              Prepare and dispatch the products to {destination || destinationStore}.
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
          transferNo={distribution?.allocationNo ?? transferNo}
          fromStore={source || fromStore}
          fromCode={distribution?.sourceId ?? fromCode}
          toStore={destination || destinationStore}
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
        />

        <ProductsToDispatch
          items={items}
          onFieldChange={handleFieldChange}
          loading={loading}
        />
      </div>

      <DispatchProductsActions
        onBack={onBack}
        onDispatch={handleDispatch}
        submitting={submitting}
        disabled={loading || items.length === 0}
      />
    </div>
  )
}

export default DispatchProducts
