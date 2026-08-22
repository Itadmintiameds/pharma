import React, { useEffect, useMemo, useState } from 'react'
import {
  Users,
  CalendarRange,
  Warehouse,
  Store,
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight,
  Pill,
  Box,
  LucideIcon,
} from 'lucide-react'
import type {
  WarehouseDistributionData,
  WarehouseDistributionLineData,
} from '@/types/WarehouseDistributionData'
import { formatDate } from '@/utils/formatDate'
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

export type TransferDetailsStatus =
  | 'awaiting_acceptance'
  | 'ready_to_dispatch'
  | 'pending_receipt'
  | 'completed'
  | 'rejected'

interface TransferDetailsProps {
  referenceNo?: string
  assignedBy?: string
  status?: TransferDetailsStatus
  distribution?: WarehouseDistributionData | null
  loading?: boolean
  onBack?: () => void
  onAccept?: () => void
}

const statusBadgeClass: Record<TransferDetailsStatus, string> = {
  awaiting_acceptance: 'border-danger-600 bg-danger-50 text-danger-600',
  ready_to_dispatch: 'border-info-600 bg-info-50 text-info-600',
  pending_receipt: 'border-primary-800 bg-primary-100 text-primary-800',
  completed: 'border-success-600 bg-success-50 text-success-800',
  rejected: 'border-warning-600 bg-warning-50 text-warning-600',
}

const statusDotClass: Record<TransferDetailsStatus, string> = {
  awaiting_acceptance: 'bg-danger-600',
  ready_to_dispatch: 'bg-info-600',
  pending_receipt: 'bg-primary-800',
  completed: 'bg-success-800',
  rejected: 'bg-warning-600',
}

const statusLabel: Record<TransferDetailsStatus, string> = {
  awaiting_acceptance: 'Awaiting Acceptance',
  ready_to_dispatch: 'Ready to Dispatch',
  pending_receipt: 'Pending Receipt',
  completed: 'Completed',
  rejected: 'Rejected',
}

interface InfoRowProps {
  Icon: LucideIcon
  label: string
  value: string
  valueClass?: string
}

const InfoRow = ({ Icon, label, value, valueClass = 'text-pneutral-900' }: InfoRowProps) => (
  <div className="flex items-start gap-3">
    <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-50 p-2">
      <Icon className="size-6 text-secondary-700" strokeWidth={1.8} />
    </div>
    <div className="flex flex-col items-start gap-1">
      <p className="text-p3 font-regular text-pneutral-600">{label}</p>
      <p className={`text-label-l4 font-semibold ${valueClass}`}>{value}</p>
    </div>
  </div>
)

interface StoreBlockProps {
  label: string
  iconBg: string
  Icon: LucideIcon
  iconColor: string
  name: string
}

const StoreBlock = ({
  label,
  iconBg,
  Icon,
  iconColor,
  name,
}: StoreBlockProps) => (
  <div className="flex w-full flex-col items-start gap-1 md:w-64">
    <p className="text-p3 font-regular text-pneutral-600">{label}</p>
    <div className="flex w-full items-center gap-3">
      <div className={`flex shrink-0 items-center justify-center rounded-full p-3 ${iconBg}`}>
        <Icon className={`size-8 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="text-label-l4 font-semibold text-pneutral-900">{name}</p>
      </div>
    </div>
  </div>
)

const TransferInformationCard = ({
  requestedBy,
  requestedOn,
  sourceName,
  destinationName,
  destinationIsWarehouse,
}: {
  requestedBy: string
  requestedOn: string
  sourceName: string
  destinationName: string
  destinationIsWarehouse: boolean
}) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Transfer Information
    </p>

    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 border-pneutral-200 lg:w-72 lg:shrink-0 lg:border-r lg:pr-8">
        <InfoRow
          Icon={Users}
          label="Requested By"
          value={requestedBy}
          valueClass="text-secondary-700"
        />
        <InfoRow
          Icon={CalendarRange}
          label="Request Date & Time"
          value={requestedOn}
        />
      </div>

      <div className="flex w-full flex-1 flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
        <StoreBlock
          label="Source Store (Sending)"
          iconBg="bg-secondary-50"
          Icon={Warehouse}
          iconColor="text-secondary-700"
          name={sourceName}
        />

        <div className="flex shrink-0 items-center justify-center self-center rounded-full bg-pneutral-50 p-3">
          <ArrowRightLeft className="size-8 text-pneutral-500" strokeWidth={1.8} />
        </div>

        <StoreBlock
          label="Destination Store (Receiving)"
          iconBg="bg-success-50"
          Icon={destinationIsWarehouse ? Warehouse : Store}
          iconColor="text-success-700"
          name={destinationName}
        />
      </div>
    </div>
  </div>
)

type ProductIcon = 'pill' | 'box'

interface RequestedProductRow {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  batchId: string
  expiryDate: string
  requestedQty: string
  unit: string
}

// "Strip"/"Tablet" packs read as pills; anything else (Bottle, Box, …) gets the box icon.
const iconForUnit = (unit?: string): ProductIcon => {
  const u = (unit ?? '').toLowerCase()
  return u.includes('strip') || u.includes('tablet') || u.includes('tab')
    ? 'pill'
    : 'box'
}

// One issued line -> one read-only review row. Quantities are the issued amounts;
// nothing has been dispatched yet at this point in the flow.
const mapLineToRequestedRow = (
  line: WarehouseDistributionLineData,
  index: number
): RequestedProductRow => {
  const unit = line.packaging?.purchaseUnit ?? ''
  const contains = line.packaging?.purchaseUnitContains

  return {
    id: line.warehouseDistributionDetailsId ?? index + 1,
    icon: iconForUnit(unit),
    productName: line.product?.productName ?? line.productId,
    packInfo:
      unit && contains && contains > 1 ? `${unit} of ${contains}` : unit || '—',
    batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
    batchId: line.batchId ?? '',
    expiryDate: formatDate(line.batch?.expiryDate),
    requestedQty: unit
      ? `${line.issueQuantity ?? 0} ${unit}`
      : String(line.issueQuantity ?? 0),
    unit,
  }
}

// Shape of one row returned by GET /product/batches/pharmacy/{id}
// (ProductService.getBatchesForPharmacy) — only the fields used here.
interface SourceBatchStockRow {
  batchId?: string
  totalStock?: number
}

interface RequestedProductColumn {
  header: string
  width: string
  align?: 'left' | 'center'
  render: (row: RequestedProductRow, index: number) => React.ReactNode
}

// Available stock is live inventory at the source, not something the
// distribution's own lines carry — resolved separately per batch id.
const buildRequestedProductColumns = (
  availableStockByBatchId: Record<string, number>
): RequestedProductColumn[] => [
  {
    header: '#',
    width: 'w-[6%]',
    align: 'center',
    render: (_row, index) => (
      <span className="text-p3 font-regular text-pneutral-900">{index + 1}</span>
    ),
  },
  {
    header: 'Product Details',
    width: 'w-[22%]',
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
    width: 'w-[18%]',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.batchNo}
      </span>
    ),
  },
  {
    header: 'Expiry Date',
    width: 'w-[18%]',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.expiryDate}
      </span>
    ),
  },
  {
    header: 'Requested Qty',
    width: 'w-[18%]',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.requestedQty}
      </span>
    ),
  },
  {
    header: 'Available Stock',
    width: 'w-[18%]',
    align: 'center',
    render: (row) => {
      const stock = row.batchId ? availableStockByBatchId[row.batchId] : undefined
      const label = stock === undefined ? '—' : row.unit ? `${stock} ${row.unit}` : String(stock)
      return <span className="text-label-l4 font-regular text-success-600">{label}</span>
    },
  },
]

const RequestedProductsCard = ({
  rows,
  loading,
  availableStockByBatchId,
}: {
  rows: RequestedProductRow[]
  loading?: boolean
  availableStockByBatchId: Record<string, number>
}) => {
  const requestedProductColumns = buildRequestedProductColumns(availableStockByBatchId)

  return (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Requested Products
    </p>

    {loading ? (
      <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
        Loading products…
      </p>
    ) : rows.length === 0 ? (
      <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
        No products found.
      </p>
    ) : (
      <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-secondary-600">
              {requestedProductColumns.map((col) => (
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
            {rows.map((row, index) => (
              <tr key={row.id}>
                {requestedProductColumns.map((col) => (
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

const TransferDetailsActions = ({
  onBack,
  onAccept,
  acceptDisabled,
}: {
  onBack?: () => void
  onAccept?: () => void
  acceptDisabled?: boolean
}) => (
  <div className="flex w-full flex-col items-stretch gap-4 border-t border-pneutral-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      className={`${actionButtonClass} w-[141px] border-2 border-pneutral-900 text-pneutral-900`}
    >
      <ArrowLeft className="size-5" strokeWidth={2} />
      Back
    </button>

    <button
      type="button"
      onClick={onAccept}
      disabled={acceptDisabled}
      className={`${actionButtonClass} w-[180px] bg-primary-800 text-pneutral-50 disabled:opacity-50`}
    >
      Accept
      <ArrowRight className="size-5" strokeWidth={2} />
    </button>
  </div>
)

const TransferDetails = ({
  referenceNo = 'PT000021',
  assignedBy = 'Warehouse Admin',
  status = 'awaiting_acceptance',
  distribution,
  loading,
  onBack,
  onAccept,
}: TransferDetailsProps) => {
  const productRows = useMemo(
    () => (distribution?.lines ?? []).map(mapLineToRequestedRow),
    [distribution]
  )

  // createdBy is only ever the requesting user's raw id — resolve it to their
  // role once the distribution loads, since that's what "Requested By" shows.
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

  const requestedBy = requesterRole ?? assignedBy
  const allocationNo = distribution?.allocationNo ?? referenceNo

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
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-5 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              Inter-Store Transfer Details
            </h1>
            <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
              {allocationNo}
            </span>
          </div>

          <p className="text-label-l4 font-regular text-pneutral-600">
            Review transfer request from {requestedBy} and take action.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1">
          <p className="text-label-l4 font-medium text-pneutral-600">Status</p>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-label-l3 font-medium ${statusBadgeClass[status]}`}
          >
            <span className={`size-1.5 shrink-0 rounded-full ${statusDotClass[status]}`} />
            {statusLabel[status]}
          </span>
        </div>
      </div>

      <TransferInformationCard
        requestedBy={requestedBy}
        requestedOn={formatDateTime(distribution?.allocationDate)}
        sourceName={distribution?.sourceName?.trim() || distribution?.sourceId || '—'}
        destinationName={
          distribution?.destinationName?.trim() || distribution?.destinationId || '—'
        }
        destinationIsWarehouse={distribution?.destinationType === 'WAREHOUSE'}
      />
      <RequestedProductsCard
        rows={productRows}
        loading={loading}
        availableStockByBatchId={availableStockByBatchId}
      />
      <TransferDetailsActions
        onBack={onBack}
        onAccept={onAccept}
        acceptDisabled={loading || productRows.length === 0}
      />
    </div>
  )
}

export default TransferDetails
