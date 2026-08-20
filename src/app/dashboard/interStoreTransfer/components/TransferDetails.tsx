import React, { useMemo } from 'react'
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
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'
import type {
  WarehouseDistributionData,
  WarehouseDistributionLineData,
} from '@/types/WarehouseDistributionData'
import { formatDate, formatDateTime } from '@/utils/formatDate'

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
  code: string
}

const StoreBlock = ({
  label,
  iconBg,
  Icon,
  iconColor,
  name,
  code,
}: StoreBlockProps) => (
  <div className="flex w-full flex-col items-start gap-1 md:w-64">
    <p className="text-p3 font-regular text-pneutral-600">{label}</p>
    <div className="flex w-full items-center gap-3">
      <div className={`flex shrink-0 items-center justify-center rounded-full p-3 ${iconBg}`}>
        <Icon className={`size-8 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="text-label-l4 font-semibold text-pneutral-900">{name}</p>
        <p className="text-p3 font-regular text-pneutral-600">{code}</p>
      </div>
    </div>
  </div>
)

const TransferInformationCard = ({
  requestedBy,
  requestedOn,
  sourceName,
  sourceCode,
  destinationName,
  destinationCode,
  destinationIsWarehouse,
}: {
  requestedBy: string
  requestedOn: string
  sourceName: string
  sourceCode: string
  destinationName: string
  destinationCode: string
  destinationIsWarehouse: boolean
}) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Transfer Information
    </p>

    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 border-pneutral-200 lg:w-auto lg:shrink-0 lg:border-r lg:pr-8">
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
          code={sourceCode}
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
          code={destinationCode}
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
  expiryDate: string
  requestedQty: string
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
    expiryDate: formatDate(line.batch?.expiryDate),
    requestedQty: unit
      ? `${line.issueQuantity ?? 0} ${unit}`
      : String(line.issueQuantity ?? 0),
  }
}

const requestedProductColumns: TableColumn<RequestedProductRow>[] = [
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
    width: 'w-32',
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
]

const RequestedProductsCard = ({
  rows,
  loading,
}: {
  rows: RequestedProductRow[]
  loading?: boolean
}) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Requested Products
    </p>

    <TableWithoutGrid
      columns={requestedProductColumns}
      data={rows}
      rowKey={(row) => row.id.toString()}
      headerVariant="primary"
      container="box"
      loading={loading}
    />
  </div>
)

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

  // Who asked for the transfer: the requesting store if the API recorded one,
  // otherwise the user who created the allocation.
  const requestedBy =
    distribution?.allocationRequestedBy || distribution?.createdBy || assignedBy
  const allocationNo = distribution?.allocationNo ?? referenceNo

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
        sourceCode={distribution?.sourceId ?? '—'}
        destinationName={
          distribution?.destinationName?.trim() || distribution?.destinationId || '—'
        }
        destinationCode={distribution?.destinationId ?? '—'}
        destinationIsWarehouse={distribution?.destinationType === 'WAREHOUSE'}
      />
      <RequestedProductsCard rows={productRows} loading={loading} />
      <TransferDetailsActions
        onBack={onBack}
        onAccept={onAccept}
        acceptDisabled={loading || productRows.length === 0}
      />
    </div>
  )
}

export default TransferDetails
