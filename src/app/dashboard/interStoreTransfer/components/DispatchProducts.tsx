'use client'

import { useEffect, useMemo, useState } from 'react'
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
import type {
  DispatchWarehouseDistributionLineRequest,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
} from '@/types/WarehouseDistributionData'
import { dispatchAllocation } from '@/services/WarehouseDistributionService'
import { formatDate } from '@/utils/formatDate'
import { showToast } from '@/app/components/common/Toast'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { getUserById } from '@/services/UserManagementService'
import { ProductService } from '@/services/ProductService'

const EM_DASH = '—'

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// dd-mmm-yyyy with a 12-hour AM/PM time, matching the format the other
// transfer/receipt screens show — rather than the app-wide dd-mm-yyyy 24-hour one.
const formatDateTime = (value?: string | null, fallback = EM_DASH): string => {
  if (!value) return fallback

  const [datePart, timePart] = value.split('T')
  const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const dateLabel = iso
    ? `${iso[3]}-${MONTH_ABBR[Number(iso[2]) - 1] ?? iso[2]}-${iso[1]}`
    : datePart
  if (!timePart) return dateLabel

  const [hourStr, minuteStr] = timePart.split(':')
  const hour24 = parseInt(hourStr, 10)
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${dateLabel} ${String(hour12).padStart(2, '0')}:${minuteStr} ${period}`
}

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
  toStore: string
  requestedOn: string
  requestedBy: string
}

const TransferSummaryBar = ({
  transferNo,
  fromStore,
  toStore,
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
    />
    <SummaryItem
      Icon={Truck}
      iconBg="bg-success-50"
      iconColor="text-success-700"
      label="To (Receiving Store)"
      value={toStore}
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
  batchId: string
  expiryDate: string
  requestedQty: string
  requestedQtyValue: number
  dispatchQty: string
  remarks: string
  unit: string
}

// The dispatch qty can never exceed what was requested; dispatching less
// than requested is fine (a shortfall) but must be explained.
const dispatchExceedsRequested = (item: DispatchProductRow) =>
  Number(item.dispatchQty) > item.requestedQtyValue

const dispatchNeedsRemarks = (item: DispatchProductRow) =>
  Number(item.dispatchQty) < item.requestedQtyValue && item.remarks.trim() === ''

// Shape of one row returned by GET /product/batches/pharmacy/{id}
// (ProductService.getBatchesForPharmacy) — only the fields used here.
interface SourceBatchStockRow {
  batchId?: string
  totalStock?: number
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
    batchId: line.batchId ?? '',
    expiryDate: formatDate(line.batch?.expiryDate),
    requestedQty: unit ? `${issued} ${unit}` : String(issued),
    requestedQtyValue: issued,
    dispatchQty: String(line.dispatchedQuantity ?? issued),
    remarks: line.dispatchRemarks ?? '',
    unit,
  }
}

const dispatchQtyInputClass =
  'h-12 w-full rounded-lg border border-pneutral-300 bg-white p-3 text-p4 font-regular text-sneutral-800 focus:outline-none focus:border-secondary-700'

const remarksInputClass =
  'h-12 w-full rounded-lg border border-pneutral-300 bg-white p-3 text-p4 font-regular text-sneutral-800 focus:outline-none focus:border-secondary-700'

interface DispatchColumn {
  header: string
  width: string
  align?: 'left' | 'center'
  render: (row: DispatchProductRow, index: number) => React.ReactNode
}

// Available stock is live inventory at the source, not something the
// distribution's own lines carry — resolved separately per batch id.
const buildDispatchColumns = (
  onFieldChange: (
    id: number,
    field: 'dispatchQty' | 'remarks',
    value: string
  ) => void,
  availableStockByBatchId: Record<string, number>,
  showValidation: boolean
): DispatchColumn[] => [
  {
    header: '#',
    width: 'w-[5%]',
    align: 'center',
    render: (_row, index) => (
      <span className="text-p3 font-regular text-pneutral-900">{index + 1}</span>
    ),
  },
  {
    header: 'Product Details',
    width: 'w-[20%]',
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
    width: 'w-[12%]',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.batchNo}
      </span>
    ),
  },
  {
    header: 'Expiry Date',
    width: 'w-[12%]',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.expiryDate}
      </span>
    ),
  },
  {
    header: 'Available Stock',
    width: 'w-[13%]',
    align: 'center',
    render: (row) => {
      const stock = row.batchId ? availableStockByBatchId[row.batchId] : undefined
      const label = stock === undefined ? '—' : row.unit ? `${stock} ${row.unit}` : String(stock)
      return <span className="text-label-l4 font-regular text-success-600">{label}</span>
    },
  },
  {
    header: 'Requested Qty',
    width: 'w-[13%]',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.requestedQty}
      </span>
    ),
  },
  {
    header: 'Dispatch Qty',
    width: 'w-[11%]',
    align: 'center',
    render: (row) => {
      const exceeds = showValidation && dispatchExceedsRequested(row)
      return (
        <div className="flex flex-col items-start gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={row.dispatchQty}
            onChange={(e) => onFieldChange(row.id, 'dispatchQty', e.target.value)}
            className={`${dispatchQtyInputClass} ${exceeds ? 'border-warning-600' : ''}`}
          />
          {exceeds && (
            <p className="text-p2 font-normal text-warning-600">
              Cannot exceed requested qty
            </p>
          )}
        </div>
      )
    },
  },
  {
    header: 'Remarks',
    width: 'w-[14%]',
    align: 'center',
    render: (row) => {
      const showError = showValidation && dispatchNeedsRemarks(row)
      return (
        <div className="flex flex-col items-start gap-1">
          <input
            type="text"
            placeholder="Low Stock"
            value={row.remarks}
            onChange={(e) => onFieldChange(row.id, 'remarks', e.target.value)}
            className={`${remarksInputClass} ${showError ? 'border-warning-600' : ''}`}
          />
          {showError && (
            <p className="text-p2 font-normal text-warning-600">Remark is required</p>
          )}
        </div>
      )
    },
  },
]

const ProductsToDispatch = ({
  items,
  onFieldChange,
  loading,
  availableStockByBatchId,
  showValidation,
}: {
  items: DispatchProductRow[]
  onFieldChange: (
    id: number,
    field: 'dispatchQty' | 'remarks',
    value: string
  ) => void
  loading?: boolean
  availableStockByBatchId: Record<string, number>
  showValidation: boolean
}) => {
  const columns = buildDispatchColumns(onFieldChange, availableStockByBatchId, showValidation)

  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
      <p className="text-label-l5 font-semibold text-secondary-700">
        Products to be Dispatched
      </p>

      {loading ? (
        <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
          Loading products…
        </p>
      ) : items.length === 0 ? (
        <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
          No products to dispatch.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="h-18 bg-secondary-600">
                {columns.map((col) => (
                  <th
                    key={col.header}
                    className={`${col.width} border border-secondary-500 px-3 py-3 text-p3 font-semibold text-pneutral-50 ${
                      col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td
                      key={col.header}
                      className={`border border-pneutral-200 px-3 py-2.5 ${
                        col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  canDispatch = true,
}: {
  onBack?: () => void
  onDispatch?: () => void
  submitting?: boolean
  disabled?: boolean
  canDispatch?: boolean
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
      {canDispatch && (
      <button
        type="button"
        onClick={onDispatch}
        disabled={submitting || disabled}
        className={`${actionButtonClass} w-[200px] bg-primary-800 text-pneutral-50 disabled:opacity-50`}
      >
        {submitting ? 'Dispatching…' : 'Dispatch Products'}
      </button>
      )}
    </div>
  </div>
)

const DispatchProducts = ({
  destinationStore = 'Rajajinagar Medical Store',
  status = 'ready_to_dispatch',
  transferNo = 'PT000021',
  fromStore = 'Hebbal Medical Store',
  requestedOn = '05-Aug-2026 09:15 AM',
  requestedBy = 'Warehouse Admin',
  distribution,
  loading,
  onBack,
  onDispatched,
}: DispatchProductsProps) => {
  // Dispatching moves stock out of this store, so it answers to CREATE.
  const { canCreate } = useModulePermissions('INTER_STORE_TRANSFER')
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
  // Set once Dispatch Products is clicked while a row is invalid — tells
  // ProductsToDispatch to show the inline errors.
  const [validationAttempted, setValidationAttempted] = useState(false)

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
    if (items.some((item) => dispatchExceedsRequested(item) || dispatchNeedsRemarks(item))) {
      setValidationAttempted(true)
      return
    }

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

  // createdBy is only ever the requesting user's raw id — resolve it to
  // their role once the distribution loads, since that's what "Requested By" shows.
  const creatorId = distribution?.createdBy
  const [requesterRole, setRequesterRole] = useState<string | null>(null)

  useEffect(() => {
    if (!creatorId) {
      setRequesterRole(null)
      return
    }
    let active = true
    getUserById(creatorId)
      .then((user) => {
        if (active) setRequesterRole(user?.pharmaRolesDto?.roleName ?? null)
      })
      .catch((error) => {
        console.error('Failed to fetch the requesting user', error)
        if (active) setRequesterRole(null)
      })
    return () => {
      active = false
    }
  }, [creatorId])

  // Available stock is live inventory at the source pharmacy — not part of
  // the distribution's own data — fetched separately and matched by batch id.
  const sourcePharmacyId = distribution?.sourceType === 'PHARMACY' ? distribution.sourceId : ''
  const [availableStockByBatchId, setAvailableStockByBatchId] = useState<
    Record<string, number>
  >({})

  useEffect(() => {
    if (!sourcePharmacyId) {
      setAvailableStockByBatchId({})
      return
    }
    let active = true
    ProductService.getBatchesForPharmacy(sourcePharmacyId)
      .then((res) => {
        if (!active) return
        const rows: SourceBatchStockRow[] = res?.data ?? []
        const byBatchId: Record<string, number> = {}
        rows.forEach((row) => {
          if (row.batchId) byBatchId[row.batchId] = Number(row.totalStock) || 0
        })
        setAvailableStockByBatchId(byBatchId)
      })
      .catch((error) => {
        console.error('Failed to fetch source stock', error)
        if (active) setAvailableStockByBatchId({})
      })
    return () => {
      active = false
    }
  }, [sourcePharmacyId])

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
          toStore={destination || destinationStore}
          requestedOn={
            distribution?.allocationDate
              ? formatDateTime(distribution.allocationDate)
              : requestedOn
          }
          requestedBy={requesterRole ?? requestedBy}
        />

        <ProductsToDispatch
          items={items}
          onFieldChange={handleFieldChange}
          loading={loading}
          availableStockByBatchId={availableStockByBatchId}
          showValidation={validationAttempted}
        />
      </div>

      <DispatchProductsActions
        onBack={onBack}
        onDispatch={handleDispatch}
        submitting={submitting}
        disabled={loading || items.length === 0}
        canDispatch={canCreate}
      />
    </div>
  )
}

export default DispatchProducts
