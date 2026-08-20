'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Download,
  ClipboardList,
  Send,
  Truck,
  CheckCircle2,
  Search as SearchIcon,
  LucideIcon,
} from 'lucide-react'
import Input from '@/app/components/common/Input'
import Dropdown, { DropdownOption } from '@/app/components/common/Dropdown'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'
import {
  getSourceDistributions,
  getSourceTransferKpi,
  getWarehouseDistribution,
} from '@/services/WarehouseDistributionService'
import type {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionSummary,
  WarehouseDistributionTransferKpi,
} from '@/types/WarehouseDistributionData'
import { showToast } from '@/app/components/common/Toast'
import TransferDetails from './components/TransferDetails'
import DispatchProducts from './components/DispatchProducts'
import PendingReceipt from './components/PendingReceipt'

const cardShadow =
  'shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]'

const HeaderRow = () => (
  <div className="flex w-full flex-col items-start gap-5 sm:flex-row">
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
      <h1 className="text-h5 font-semibold text-pneutral-900">
        Inter-Store Transfer
      </h1>
      <p className="text-label-l4 font-regular text-pneutral-500">
        Review, accept and dispatch stock transfer requests assigned to your store.
      </p>
    </div>

    <button
      type="button"
      className="flex h-12 w-full min-w-27 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700 sm:w-auto sm:min-w-35"
    >
      <Download className="size-5" strokeWidth={2} />
      Export
    </button>
  </div>
)

interface StatCardProps {
  label: [string, string]
  value: string
  Icon: LucideIcon
  borderColor: string
  iconBg: string
  accentText: string
}

const StatCard = ({
  label,
  value,
  Icon,
  borderColor,
  iconBg,
  accentText,
}: StatCardProps) => (
  <div
    className={`flex items-start gap-3 rounded-2xl border-t-[3px] bg-white p-4 ${cardShadow} ${borderColor}`}
  >
    <div
      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}
    >
      <Icon className={`size-5.5 ${accentText}`} strokeWidth={2} />
    </div>

    <div className="flex flex-col items-start gap-3">
      <p className="text-label-l4 font-regular text-pneutral-900">
        {label[0]}
        <br />
        {label[1]}
      </p>
      <p className={`text-label-l4 font-semibold ${accentText}`}>{value}</p>
    </div>
  </div>
)

const CompletedStatCard = ({ value }: { value: string }) => (
  <div
    className={`flex items-start gap-3 self-stretch rounded-2xl border-t-[3px] border-t-success-600 bg-white p-4 ${cardShadow}`}
  >
    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-50">
      <CheckCircle2 className="size-5.5 text-success-600" strokeWidth={2} />
    </div>

    <div className="flex flex-1 flex-col items-start justify-between gap-3">
      <p className="text-p3 font-regular text-pneutral-900">Completed</p>
      <p className="text-label-l4 font-semibold text-success-600">{value}</p>
    </div>
  </div>
)

// The KPI endpoint covers the three lifecycle buckets; "Awaiting Acceptance" has no
// backing status yet, so its card stays blank rather than showing an invented count.
const buildStatCards = (
  kpi: WarehouseDistributionTransferKpi | null
): StatCardProps[] => [
  {
    label: ['Awaiting', 'Acceptance'],
    value: '—',
    Icon: ClipboardList,
    borderColor: 'border-t-danger-600',
    iconBg: 'bg-danger-50',
    accentText: 'text-danger-600',
  },
  {
    label: ['Ready to', 'Dispatch'],
    value: kpi ? String(kpi.readyToDispatch) : '—',
    Icon: Send,
    borderColor: 'border-t-info-600',
    iconBg: 'bg-info-50',
    accentText: 'text-info-600',
  },
  {
    label: ['Pending', 'Receipt'],
    value: kpi ? String(kpi.pendingReceipt) : '—',
    Icon: Truck,
    borderColor: 'border-t-primary-800',
    iconBg: 'bg-primary-100',
    accentText: 'text-primary-800',
  },
]

const StatCardsRow = ({
  kpi,
}: {
  kpi: WarehouseDistributionTransferKpi | null
}) => (
  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
    {buildStatCards(kpi).map((card) => (
      <StatCard key={card.label.join(' ')} {...card} />
    ))}
    <CompletedStatCard value={kpi ? String(kpi.completed) : '—'} />
  </div>
)

const STATUS_OPTIONS: DropdownOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Awaiting Acceptance', value: 'awaiting_acceptance' },
  { label: 'Ready to Dispatch', value: 'ready_to_dispatch' },
  { label: 'Pending Receipt', value: 'pending_receipt' },
  { label: 'Completed', value: 'completed' },
]

const DATE_RANGE_OPTIONS: DropdownOption[] = [
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
  { label: 'Custom Range', value: 'custom_range' },
]

const FiltersRow = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | number>('all')
  const [dateRange, setDateRange] = useState<string | number>('last_30_days')

  return (
    <div className="flex w-full flex-col items-stretch gap-4 rounded-2xl border border-pneutral-200 bg-white p-4 sm:flex-row sm:items-end">
      <div className="w-full sm:flex-1">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by molecule, Brand or therapeutic area"
          leftIcon={<SearchIcon className="size-5 text-pneutral-500" strokeWidth={2} />}
        />
      </div>

      <div className="w-full sm:w-51 sm:shrink-0">
        <Dropdown
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </div>

      <div className="w-full sm:w-51 sm:shrink-0">
        <Dropdown
          label="Date Range"
          options={DATE_RANGE_OPTIONS}
          value={dateRange}
          onChange={setDateRange}
        />
      </div>
    </div>
  )
}

type TransferStatus =
  | 'awaiting_acceptance'
  | 'ready_to_dispatch'
  | 'pending_receipt'
  | 'completed'
  | 'rejected'

interface TransferRow {
  key: string
  distributionId: number
  displayNo: string
  ptNo: string
  from: string
  toStore: string
  toCode: string
  products: string
  qty: string
  status: TransferStatus
  action: string
}

// The backend lifecycle only covers the three states below; "awaiting_acceptance"
// and "rejected" have no DistributionStatus behind them yet.
const STATUS_FROM_API: Partial<Record<DistributionStatus, TransferStatus>> = {
  DISTRIBUTION_CREATED: 'ready_to_dispatch',
  PRODUCTS_DISPATCHED: 'pending_receipt',
  STOCK_RECEIVED: 'completed',
}

const ACTION_LABEL: Record<TransferStatus, string> = {
  awaiting_acceptance: 'Review',
  ready_to_dispatch: 'Dispatch',
  pending_receipt: 'View',
  completed: 'View',
  rejected: 'Reason',
}

const toTransferRow = (
  summary: WarehouseDistributionSummary,
  index: number
): TransferRow => {
  const status = STATUS_FROM_API[summary.currentStatus] ?? 'ready_to_dispatch'

  return {
    key: String(summary.warehouseDistributionId ?? `row-${index}`),
    distributionId: summary.warehouseDistributionId,
    displayNo: String(index + 1),
    ptNo: summary.allocationNo,
    from: summary.fromStore || summary.fromId,
    toStore: summary.toStore || summary.toId,
    toCode: summary.toId,
    products: String(summary.productsCount ?? 0),
    qty: String(summary.totalIssueQuantity ?? 0),
    status,
    action: ACTION_LABEL[status],
  }
}

const statusBadgeClass: Record<TransferStatus, string> = {
  awaiting_acceptance: 'border-danger-600 bg-danger-50 text-danger-600',
  ready_to_dispatch: 'border-info-600 bg-info-50 text-info-600',
  pending_receipt: 'border-primary-800 bg-primary-100 text-primary-800',
  completed: 'border-success-600 bg-success-50 text-success-800',
  rejected: 'border-warning-600 bg-warning-50 text-warning-600',
}

const statusLabel: Record<TransferStatus, string> = {
  awaiting_acceptance: 'Awaiting Acceptance',
  ready_to_dispatch: 'Ready to Dispatch',
  pending_receipt: 'Pending Receipt',
  completed: 'Completed',
  rejected: 'Rejected',
}

const TransferStatusBadge = ({ status }: { status: TransferStatus }) => (
  <span
    className={`inline-flex h-7 w-fit items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-label-l3 font-medium ${statusBadgeClass[status]}`}
  >
    {statusLabel[status]}
  </span>
)

const buildTransferColumns = (
  onAction: (row: TransferRow) => void
): TableColumn<TransferRow>[] => [
  {
    header: '#',
    width: 'w-12',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.displayNo}
      </span>
    ),
  },
  {
    header: 'PT No.',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.ptNo}
      </span>
    ),
  },
  {
    header: 'From',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.from}
      </span>
    ),
  },
  {
    header: 'To',
    width: 'w-55',
    align: 'center',
    render: (row) => (
      <div className="flex flex-col items-start gap-1">
        <span className="text-label-l4 font-semibold text-pneutral-900">
          {row.toStore}
        </span>
        <span className="text-label-l3 font-regular text-pneutral-900">
          {row.toCode}
        </span>
      </div>
    ),
  },
  {
    header: 'Prod.',
    width: 'w-20',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.products}
      </span>
    ),
  },
  {
    header: 'Qty',
    width: 'w-24',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.qty}
      </span>
    ),
  },
  {
    header: 'Status',
    align: 'center',
    render: (row) => <TransferStatusBadge status={row.status} />,
  },
  {
    header: 'Action',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <button
        type="button"
        onClick={() => onAction(row)}
        className="flex h-9 min-w-27 items-center justify-center rounded-lg border-[1.5px] border-secondary-700 px-3 text-label-l3 font-medium text-secondary-700"
      >
        {row.action}
      </button>
    ),
  },
]

const PAGE_SIZE = 7

const TransfersTable = ({
  rows,
  loading,
  error,
  onSelectRow,
}: {
  rows: TransferRow[]
  loading: boolean
  error: string | null
  onSelectRow: (row: TransferRow) => void
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const transferColumns = buildTransferColumns(onSelectRow)
  // The API returns every transfer at once, so pages are sliced client-side.
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <h2 className="text-h6 font-semibold text-pneutral-900">
        Inter-Store Transfers
      </h2>

      {error && (
        <p className="text-label-l4 font-regular text-danger-600">{error}</p>
      )}

      <TableWithoutGrid
        columns={transferColumns}
        data={pageRows}
        rowKey={(row) => row.key}
        headerVariant="primary"
        container="card"
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalItems: rows.length,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  )
}

type PageView = 'list' | 'details' | 'dispatch' | 'pending_receipt'

const page = () => {
  const [view, setView] = useState<PageView>('list')
  const [activeTransfer, setActiveTransfer] = useState<TransferRow | null>(
    null
  )
  const [rows, setRows] = useState<TransferRow[]>([])
  const [kpi, setKpi] = useState<WarehouseDistributionTransferKpi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDistribution, setActiveDistribution] =
    useState<WarehouseDistributionData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // The list and the stat cards are fetched together, but a failing KPI call only
  // blanks the cards — the table still renders.
  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [list, kpiResult] = await Promise.allSettled([
      getSourceDistributions(),
      getSourceTransferKpi(),
    ])

    if (list.status === 'fulfilled') {
      setRows(list.value.map(toTransferRow))
    } else {
      console.error('Failed to fetch inter-store transfers:', list.reason)
      setError(
        list.reason instanceof Error
          ? list.reason.message
          : 'Failed to load inter-store transfers.'
      )
      setRows([])
    }

    if (kpiResult.status === 'fulfilled') {
      setKpi(kpiResult.value)
    } else {
      console.error('Failed to fetch inter-store transfer KPIs:', kpiResult.reason)
      setKpi(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  // Fetch the full distribution, then show the given screen. A transfer still awaiting
  // dispatch opens on the review screen; anything already dispatched opens on its summary.
  const openTransfer = async (row: TransferRow) => {
    const nextView: PageView =
      row.status === 'ready_to_dispatch' ? 'details' : 'pending_receipt'

    setActiveTransfer(row)
    setActiveDistribution(null)
    setDetailLoading(true)
    setView(nextView)
    try {
      setActiveDistribution(await getWarehouseDistribution(row.distributionId))
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : 'Failed to fetch the transfer details.'
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const backToList = () => {
    setView('list')
    setActiveTransfer(null)
    setActiveDistribution(null)
    fetchTransfers()
  }

  if (view === 'pending_receipt' && activeTransfer) {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <PendingReceipt
          referenceNo={activeTransfer.ptNo}
          fromStore={activeTransfer.from}
          destinationStore={activeTransfer.toStore}
          toCode={activeTransfer.toCode}
          distribution={activeDistribution}
          onBack={backToList}
          onClose={backToList}
        />
      </div>
    )
  }

  if (view === 'dispatch' && activeTransfer) {
    return (
      <div className="flex min-h-full w-full flex-col items-start gap-4">
        <DispatchProducts
          transferNo={activeTransfer.ptNo}
          fromStore={activeTransfer.from}
          destinationStore={activeTransfer.toStore}
          toCode={activeTransfer.toCode}
          status="ready_to_dispatch"
          distribution={activeDistribution}
          loading={detailLoading}
          onBack={() => setView('details')}
          onDispatched={(updated) => {
            setActiveDistribution(updated)
            setView('pending_receipt')
          }}
        />
      </div>
    )
  }

  if (view === 'details' && activeTransfer) {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <TransferDetails
          referenceNo={activeTransfer.ptNo}
          status={activeTransfer.status}
          distribution={activeDistribution}
          loading={detailLoading}
          onBack={backToList}
          onAccept={() => setView('dispatch')}
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <HeaderRow />
      <StatCardsRow kpi={kpi} />
      <FiltersRow />
      <TransfersTable
        rows={rows}
        loading={loading}
        error={error}
        onSelectRow={openTransfer}
      />
    </div>
  )
}

export default page
