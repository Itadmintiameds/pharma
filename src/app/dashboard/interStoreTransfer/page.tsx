'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
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
import PaginationFooter from '@/app/components/common/table/Pagination'
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
import { useOrgInventoryGuard } from '@/hooks/useOrgInventoryGuard'
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
  { label: 'All Time', value: 'all_time' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
  { label: 'Custom Range', value: 'custom_range' },
]

interface TransferFilters {
  search: string
  status: string
  dateRange: string
  customFrom: string
  customTo: string
}

const emptyTransferFilters: TransferFilters = {
  search: '',
  status: 'all',
  dateRange: 'all_time',
  customFrom: '',
  customTo: '',
}

// `dateRange`/date fields carry ISO yyyy-mm-dd, so plain string comparison
// stays chronologically correct without parsing.
const daysAgoIso = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

const matchesTransferFilters = (row: TransferRow, filters: TransferFilters): boolean => {
  if (filters.search) {
    const query = filters.search.toLowerCase()
    const haystack = `${row.ptNo} ${row.from} ${row.toStore}`.toLowerCase()
    if (!haystack.includes(query)) return false
  }

  if (filters.status !== 'all' && row.status !== filters.status) {
    return false
  }

  const allocationDate = row.allocationDate?.slice(0, 10)
  if (filters.dateRange === 'custom_range') {
    if (filters.customFrom && (!allocationDate || allocationDate < filters.customFrom)) {
      return false
    }
    if (filters.customTo && (!allocationDate || allocationDate > filters.customTo)) {
      return false
    }
  } else if (filters.dateRange !== 'all_time') {
    const sinceDays =
      filters.dateRange === 'last_7_days'
        ? 7
        : filters.dateRange === 'last_30_days'
          ? 30
          : filters.dateRange === 'last_90_days'
            ? 90
            : null
    if (sinceDays !== null && (!allocationDate || allocationDate < daysAgoIso(sinceDays))) {
      return false
    }
  }

  return true
}

const FiltersRow = ({
  filters,
  onChange,
}: {
  filters: TransferFilters
  onChange: (patch: Partial<TransferFilters>) => void
}) => (
  <div className="flex w-full flex-col items-stretch gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-end">
      <div className="w-full sm:flex-1">
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search by transfer no., source or destination store"
          leftIcon={<SearchIcon className="size-5 text-pneutral-500" strokeWidth={2} />}
        />
      </div>

      <div className="w-full sm:w-51 sm:shrink-0">
        <Dropdown
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(value) => onChange({ status: String(value) })}
        />
      </div>

      <div className="w-full sm:w-51 sm:shrink-0">
        <Dropdown
          label="Date Range"
          options={DATE_RANGE_OPTIONS}
          value={filters.dateRange}
          onChange={(value) => onChange({ dateRange: String(value) })}
        />
      </div>
    </div>

    {filters.dateRange === 'custom_range' && (
      <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row">
        <div className="w-full sm:w-51 sm:shrink-0">
          <Input
            type="date"
            label="From"
            value={filters.customFrom}
            onChange={(e) => onChange({ customFrom: e.target.value })}
          />
        </div>
        <div className="w-full sm:w-51 sm:shrink-0">
          <Input
            type="date"
            label="To"
            value={filters.customTo}
            onChange={(e) => onChange({ customTo: e.target.value })}
          />
        </div>
      </div>
    )}
  </div>
)

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
  allocationDate?: string
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
    allocationDate: summary.allocationDate,
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

interface TransferColumn {
  header: string
  width?: string
  align?: 'left' | 'center'
  render: (row: TransferRow) => ReactNode
}

const buildTransferColumns = (
  onAction: (row: TransferRow) => void
): TransferColumn[] => [
  {
    header: '#',
    width: 'w-[4%] min-w-10',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.displayNo}
      </span>
    ),
  },
  {
    header: 'Transfer No.',
    width: 'w-[13%] min-w-32.5',
    align: 'center',
    render: (row) => (
      <span className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {row.ptNo}
      </span>
    ),
  },
  {
    header: 'From',
    width: 'w-[15%] min-w-37.5',
    align: 'center',
    render: (row) => (
      <span className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {row.from}
      </span>
    ),
  },
  {
    header: 'To',
    width: 'w-[21%] min-w-50',
    align: 'center',
    render: (row) => (
      <span className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {row.toStore}
      </span>
    ),
  },
  {
    header: 'Prod.',
    width: 'w-[6%] min-w-15',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.products}
      </span>
    ),
  },
  {
    header: 'Qty',
    width: 'w-[7%] min-w-17.5',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.qty}
      </span>
    ),
  },
  {
    header: 'Status',
    width: 'w-[17%] min-w-42.5',
    align: 'center',
    render: (row) => <TransferStatusBadge status={row.status} />,
  },
  {
    header: 'Action',
    width: 'w-[17%] min-w-35',
    align: 'center',
    render: (row) => (
      <button
        type="button"
        onClick={() => onAction(row)}
        className="mx-auto flex h-9 min-w-27 items-center justify-center rounded-lg border-[1.5px] border-secondary-700 px-3 text-label-l3 font-medium text-secondary-700"
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

  // A filter change can leave `currentPage` past the end of the new, smaller
  // result set — snap back to page 1 whenever the filtered rows change.
  useEffect(() => {
    setCurrentPage(1)
  }, [rows])

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <h2 className="text-h6 font-semibold text-pneutral-900">
        Inter-Store Transfers
      </h2>

      {error && (
        <p className="text-label-l4 font-regular text-danger-600">{error}</p>
      )}

      <div className="w-full overflow-hidden rounded-xl border border-pneutral-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="h-18 bg-secondary-600">
                {transferColumns.map((col) => (
                  <th
                    key={col.header}
                    className={`border border-secondary-500 px-3 py-3 text-p3 font-semibold text-pneutral-50 ${
                      col.width ?? ''
                    } ${col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={transferColumns.length}
                    className="h-40 text-center text-label-l4 text-pneutral-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={transferColumns.length}
                    className="h-40 text-center text-label-l4 text-pneutral-500"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.key}>
                    {transferColumns.map((col) => (
                      <td
                        key={col.header}
                        className={`border border-pneutral-200 px-3 py-2.5 ${
                          col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          page={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={rows.length}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}

type PageView = 'list' | 'details' | 'dispatch' | 'pending_receipt'

const page = () => {
  // Inter-Store Transfer only exists with centralized inventory — block
  // direct-URL access when the organization's inventory is decentralized.
  const { checking: accessChecking } = useOrgInventoryGuard({
    deny: ({ isDecentralizedInventory }) => isDecentralizedInventory,
    message: 'Inter-Store Transfer is available only with centralized inventory.',
  })

  const [view, setView] = useState<PageView>('list')
  const [activeTransfer, setActiveTransfer] = useState<TransferRow | null>(
    null
  )
  const [rows, setRows] = useState<TransferRow[]>([])
  const [filters, setFilters] = useState<TransferFilters>(emptyTransferFilters)
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

  // Hold the page blank until the guard resolves, so a decentralized-inventory
  // user never sees the dashboard before being redirected.
  if (accessChecking) {
    return (
      <p className="w-full py-8 text-center text-label-l4 font-regular text-pneutral-500">
        Loading…
      </p>
    )
  }

  if (view === 'pending_receipt' && activeTransfer) {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <PendingReceipt
          referenceNo={activeTransfer.ptNo}
          fromStore={activeTransfer.from}
          destinationStore={activeTransfer.toStore}
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

  const filteredRows = rows.filter((row) => matchesTransferFilters(row, filters))

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <HeaderRow />
      <StatCardsRow kpi={kpi} />
      <FiltersRow
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
      />
      <TransfersTable
        rows={filteredRows}
        loading={loading}
        error={error}
        onSelectRow={openTransfer}
      />
    </div>
  )
}

export default page
