'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import AllocationWizardLayout from './components/AllocationWizardLayout'
import CreateAllocation from './components/CreateAllocation'
import DistributionType from './components/DistributionType'
import AllocationDetails from './components/AllocationDetails'
import AddProducts from './components/AddProducts'
import ReviewConfirm from './components/ReviewConfirm'
import DistributionSummary from './components/DistributionSummary'
import DispatchProducts from './components/StockMovementDetails'
import PaginationFooter from '@/app/components/common/table/Pagination'
import {
  AllocationDraft,
  buildCreateAllocationRequest,
  createInitialAllocationDraft,
} from './allocationDraft'
import {
  createAllocation,
  dispatchAllocation,
  getRequestedByKpi,
  getWarehouseDistribution,
  getWarehouseDistributionList,
} from '@/services/WarehouseDistributionService'
import { showToast } from '@/app/components/common/Toast'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionKpi,
  WarehouseDistributionSummaryData,
} from '@/types/WarehouseDistributionData'

type View = 'list' | 'wizard' | 'summary' | 'dispatch' | 'details'

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// dd-mmm-yyyy with a 12-hour AM/PM time — used only for the Transfer No.
// column's timestamp, which shows this format instead of the app-wide
// dd-mm-yyyy 24-hour one.
const formatDateTimeAmPm = (value?: string | null, fallback = '—'): string => {
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

const cardShadow =
  'shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]'

// Which KPI figure fills each card. 'total' shows an "All time" caption; the rest
// show their share of the total transfers.
type StatCardKey = 'total' | 'completed' | 'pending' | 'readyToDispatch'

interface StatCardTemplate {
  key: StatCardKey
  label: string
  iconBg: string
  valueColor: string
  icon: string
  iconWidth: number
  iconHeight: number
}

interface StatCardData extends StatCardTemplate {
  value: string
  caption: string
}

const statCardTemplates: StatCardTemplate[] = [
  {
    key: 'total',
    label: 'Total Transfers',
    iconBg: 'bg-secondary-50',
    valueColor: 'text-secondary-700',
    icon: '/warehouseDistribution/transferExplorer/statCards/total-transfers.svg',
    iconWidth: 14.625,
    iconHeight: 14.625,
  },
  {
    key: 'completed',
    label: 'Completed',
    iconBg: 'bg-success-50',
    valueColor: 'text-success-700',
    icon: '/warehouseDistribution/transferExplorer/statCards/completed.svg',
    iconWidth: 14.625,
    iconHeight: 14.625,
  },
  {
    key: 'pending',
    label: 'Pending',
    iconBg: 'bg-danger-50',
    valueColor: 'text-danger-600',
    icon: '/warehouseDistribution/transferExplorer/statCards/pending.svg',
    iconWidth: 14.4,
    iconHeight: 14.4,
  },
  {
    key: 'readyToDispatch',
    label: 'Ready to Dispatch',
    iconBg: 'bg-info-50',
    valueColor: 'text-info-600',
    icon: '/warehouseDistribution/transferExplorer/statCards/ready-to-dispatch.svg',
    iconWidth: 15.7229,
    iconHeight: 12.3694,
  },
]

// Percentage of the total, to 2 decimals — matches the caption format the design uses.
const asShareOfTotal = (part: number, total: number): string =>
  total > 0 ? `${((part / total) * 100).toFixed(2)}%` : '0%'

// Fold the server KPI figures into the card templates. Falls back to zeros before
// the KPI has loaded so the cards render in a stable, well-defined state.
const buildStatCards = (kpi: WarehouseDistributionKpi | null): StatCardData[] => {
  const totalTransfers = kpi?.totalTransfers ?? 0
  const valueFor: Record<StatCardKey, number> = {
    total: totalTransfers,
    completed: kpi?.completed ?? 0,
    pending: kpi?.pending ?? 0,
    readyToDispatch: kpi?.readyToDispatch ?? 0,
  }
  return statCardTemplates.map((template) => ({
    ...template,
    value: String(valueFor[template.key]),
    caption:
      template.key === 'total'
        ? 'All time'
        : asShareOfTotal(valueFor[template.key], totalTransfers),
  }))
}

const StatCard = ({ card }: { card: StatCardData }) => (
  <div
    className={`flex h-31 w-full items-center gap-2 rounded-2xl bg-white px-4 py-2 ${cardShadow}`}
  >
    <div
      className={`flex size-10.5 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}
    >
      <Image
        src={card.icon}
        alt=""
        width={card.iconWidth}
        height={card.iconHeight}
      />
    </div>

    <div className="flex min-w-0 flex-col items-start">
      <p className="text-label-l4 font-normal text-pneutral-700">
        {card.label}
      </p>
      <p className={`text-label-l4 font-semibold ${card.valueColor}`}>
        {card.value}
      </p>
      <p className="whitespace-nowrap text-p2 font-normal text-pneutral-500">
        {card.caption}
      </p>
    </div>
  </div>
)

const filterFieldBox =
  'flex min-h-9 max-h-11 w-full items-center gap-2 rounded border border-pneutral-300 bg-white px-3 py-2'

const FilterField = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
    <p className="px-1 text-label-l3 font-medium text-pneutral-600">
      {label}
    </p>
    {children}
  </div>
)

const TextFilterField = ({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) => (
  <FilterField label={label}>
    <div className={filterFieldBox}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 flex-1 bg-transparent text-p2 text-pneutral-900 outline-none placeholder:text-pneutral-500"
      />
    </div>
  </FilterField>
)

interface SelectOption {
  label: string
  value: string
}

const SelectFilterField = ({
  label,
  defaultLabel,
  options,
  value,
  onChange,
}: {
  label: string
  defaultLabel: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}) => (
  <FilterField label={label}>
    <div className={filterFieldBox}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 flex-1 appearance-none bg-transparent text-p2 text-pneutral-900 outline-none"
      >
        <option value="">{defaultLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Image
        src="/warehouseDistribution/transferExplorer/filters/chevron-double.svg"
        alt=""
        width={11}
        height={6.012}
        className="pointer-events-none shrink-0"
      />
    </div>
  </FilterField>
)

const DateRangeFilterField = ({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) => (
  <FilterField label="Date Range">
    <div className={filterFieldBox}>
      <Image
        src="/warehouseDistribution/transferExplorer/filters/calendar-range.svg"
        alt=""
        width={13}
        height={13}
        className="shrink-0"
      />
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="w-full min-w-0 flex-1 bg-transparent text-p2 text-pneutral-900 outline-none"
      />
      <span className="shrink-0 text-p2 text-pneutral-500">→</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="w-full min-w-0 flex-1 bg-transparent text-p2 text-pneutral-900 outline-none"
      />
    </div>
  </FilterField>
)

interface TransferRow {
  transferNo: string
  dateTime: string
  fromName: string
  fromCode: string
  toName: string
  toCode: string
  products: number
  qty: string
  status: string
}

// Maps the lifecycle enum from WarehouseDistributionSummaryResponse.currentStatus
// to the labels the table's status pill already has styles for.
const distributionStatusLabel: Record<DistributionStatus, string> = {
  DISTRIBUTION_CREATED: 'Ready to Dispatch',
  PRODUCTS_DISPATCHED: 'Pending Receipt',
  STOCK_RECEIVED: 'Completed',
  STOCK_REJECTED: 'Rejected',
}

// Advanced Filters state — the whole list is fetched up front, so every
// field here narrows `transferList` client-side rather than re-querying.
interface TransferFilters {
  transferNo: string
  sourceStore: string
  destinationStore: string
  status: string
  dateFrom: string
  dateTo: string
}

const emptyTransferFilters: TransferFilters = {
  transferNo: '',
  sourceStore: '',
  destinationStore: '',
  status: '',
  dateFrom: '',
  dateTo: '',
}

// De-duplicated, sorted {label, value} options for a store dropdown, built
// from whichever store names/ids actually appear in the fetched list.
const uniqueStoreOptions = (names: (string | undefined)[]): SelectOption[] =>
  Array.from(new Set(names.filter((name): name is string => Boolean(name))))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ label: name, value: name }))

const matchesTransferFilters = (
  summary: WarehouseDistributionSummaryData,
  filters: TransferFilters
): boolean => {
  if (
    filters.transferNo &&
    !summary.allocationNo.toLowerCase().includes(filters.transferNo.toLowerCase())
  ) {
    return false
  }
  if (filters.sourceStore && (summary.fromStore || summary.fromId) !== filters.sourceStore) {
    return false
  }
  if (
    filters.destinationStore &&
    (summary.toStore || summary.toId) !== filters.destinationStore
  ) {
    return false
  }
  if (filters.status && summary.currentStatus !== filters.status) {
    return false
  }
  const allocationDate = summary.allocationDate?.slice(0, 10)
  if (filters.dateFrom && (!allocationDate || allocationDate < filters.dateFrom)) {
    return false
  }
  if (filters.dateTo && (!allocationDate || allocationDate > filters.dateTo)) {
    return false
  }
  return true
}

const toTransferRow = (summary: WarehouseDistributionSummaryData): TransferRow => ({
  transferNo: summary.allocationNo,
  dateTime: formatDateTimeAmPm(summary.allocationDate),
  fromName: summary.fromStore || summary.fromId,
  fromCode: summary.fromId,
  toName: summary.toStore || summary.toId,
  toCode: summary.toId,
  products: summary.productsCount,
  qty: `${summary.totalIssueQuantity}`,
  status: distributionStatusLabel[summary.currentStatus] ?? summary.currentStatus,
})

const transferStatusStyles: Record<string, string> = {
  Completed: 'border-success-600 bg-success-50 text-success-600',
  'Pending Receipt': 'border-secondary-700 bg-secondary-50 text-secondary-700',
  Rejected: 'border-warning-600 bg-warning-50 text-warning-600',
  'Ready to Dispatch': 'border-info-600 bg-info-50 text-info-600',
}

const TransferStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex h-7 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-3xl border px-3 py-0.5 text-label-l3 font-medium ${
      transferStatusStyles[status] ?? ''
    }`}
  >
    {status}
  </span>
)

const colTransferNo = 'w-45 shrink-0'
const colStore = 'min-w-42 flex-1'
const colProducts = 'w-24 shrink-0'
const colQty = 'w-26 shrink-0'
const colStatus = 'w-40 shrink-0'
const colActions = 'w-26 shrink-0'

const TransferTableHeader = () => (
  <div className="flex w-full min-w-245 items-stretch">
    <div
      className={`flex h-18 items-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colTransferNo}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Transfer No.
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        From Store
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        To Store
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colProducts}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Products
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colQty}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Total Qty
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colStatus}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Status
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-pneutral-200 bg-secondary-600 px-2 py-4 ${colActions}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Actions
      </p>
    </div>
  </div>
)

const TransferTableRow = ({
  row,
  onView,
}: {
  row: TransferRow
  onView?: () => void
}) => (
  <div className="flex w-full min-w-245 items-stretch">
    <div
      className={`flex h-17 flex-col justify-center gap-1 border-b border-r border-pneutral-200 px-2 py-4 ${colTransferNo}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-primary-800">
        {row.transferNo}
      </p>
      <p className="whitespace-nowrap text-p2 font-normal text-pneutral-600">
        {row.dateTime}
      </p>
    </div>

    <div
      className={`flex h-17 flex-col justify-center gap-1 border-b border-r border-pneutral-200 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-pneutral-900">
        {row.fromName}
      </p>
    </div>

    <div
      className={`flex h-17 flex-col justify-center gap-1 border-b border-r border-pneutral-200 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-pneutral-900">
        {row.toName}
      </p>
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-r border-pneutral-200 px-2 py-4 ${colProducts}`}
    >
      <p className="text-p3 font-normal text-pneutral-900">{row.products}</p>
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-r border-pneutral-200 px-2 py-4 ${colQty}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-pneutral-900">
        {row.qty}
      </p>
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-r border-pneutral-200 px-2 py-4 ${colStatus}`}
    >
      <TransferStatusBadge status={row.status} />
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-pneutral-200 px-2 py-4 ${colActions}`}
    >
      <button
        type="button"
        onClick={onView}
        className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg bg-primary-800 px-3"
      >
        <Image
          src="/warehouseDistribution/transferExplorer/transferList/eye-outline-white.svg"
          alt=""
          width={10.7656}
          height={8.25}
        />
        <span className="whitespace-nowrap text-label-l2 font-medium text-pneutral-50">
          View
        </span>
      </button>
    </div>
  </div>
)

const OutlineActionButton = ({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-12 w-full min-w-27 items-center justify-center rounded-lg border-2 border-secondary-700 px-4 sm:w-auto"
  >
    <span className="whitespace-nowrap text-label-l4 font-medium text-secondary-700">
      {label}
    </span>
  </button>
)

const page = () => {
  const [view, setView] = useState<View>('list')
  const [draft, setDraft] = useState<AllocationDraft>(createInitialAllocationDraft())
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  // Set once Continue is clicked on step 3 without a destination (and, for a
  // pharmacy transfer, a source) picked — tells AllocationDetails to show
  // its inline field errors instead of staying silent.
  const [allocationDetailsValidationAttempted, setAllocationDetailsValidationAttempted] =
    useState(false)
  // Same idea for step 4 — Continue with an empty allocation cart tells
  // AddProducts to show its inline error instead of staying silent.
  const [addProductsValidationAttempted, setAddProductsValidationAttempted] = useState(false)
  // The server's record of the allocation just confirmed — the summary view
  // renders from this (plus the draft, for labels the response doesn't carry)
  // instead of from placeholder data.
  const [createdAllocation, setCreatedAllocation] = useState<WarehouseDistributionData | null>(
    null
  )
  const [isDispatching, setIsDispatching] = useState(false)

  // The transfer whose "View" button was clicked in the Transfer List table —
  // drives the Stock Movement Details view.
  const [selectedTransfer, setSelectedTransfer] =
    useState<WarehouseDistributionSummaryData | null>(null)

  // True while a "Ready to Dispatch" transfer's full distribution is being
  // fetched for the summary view (opened from the list's "View" action,
  // rather than just having been created by the wizard).
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)

  // Transfer Explorer's table — this warehouse's distributions, incoming and
  // outgoing, fetched fresh whenever the list view is shown (so it reflects a
  // just-created or just-dispatched allocation on the way back to it).
  const [transferList, setTransferList] = useState<WarehouseDistributionSummaryData[]>([])
  const [isLoadingTransferList, setIsLoadingTransferList] = useState(true)
  // Transfer Explorer stat cards, computed server-side (see getRequestedByKpi).
  const [kpi, setKpi] = useState<WarehouseDistributionKpi | null>(null)

  useEffect(() => {
    if (view !== 'list') return
    let active = true
    const fetchTransferList = async () => {
      setIsLoadingTransferList(true)
      try {
        const [data, kpiData] = await Promise.all([
          getWarehouseDistributionList(),
          getRequestedByKpi(),
        ])
        if (active) {
          setTransferList(data)
          setKpi(kpiData)
        }
      } catch (err) {
        console.error('Failed to fetch the warehouse distribution list', err)
      } finally {
        if (active) setIsLoadingTransferList(false)
      }
    }
    fetchTransferList()
    return () => {
      active = false
    }
  }, [view])

  const statCards = buildStatCards(kpi)

  // Advanced Filters: the list is fetched in full, so filtering happens
  // client-side. `filterDraft` holds whatever the user has typed/picked;
  // `appliedFilters` is what actually narrows the table, and only moves in
  // step with the draft when Search is clicked (Clear resets both at once).
  const [filterDraft, setFilterDraft] = useState<TransferFilters>(emptyTransferFilters)
  const [appliedFilters, setAppliedFilters] = useState<TransferFilters>(emptyTransferFilters)

  const handleSearchFilters = () => setAppliedFilters(filterDraft)
  const handleClearFilters = () => {
    setFilterDraft(emptyTransferFilters)
    setAppliedFilters(emptyTransferFilters)
  }

  const sourceStoreOptions = useMemo(
    () => uniqueStoreOptions(transferList.map((t) => t.fromStore || t.fromId)),
    [transferList]
  )
  const destinationStoreOptions = useMemo(
    () => uniqueStoreOptions(transferList.map((t) => t.toStore || t.toId)),
    [transferList]
  )
  const statusOptions: SelectOption[] = Object.entries(distributionStatusLabel).map(
    ([value, label]) => ({ value, label })
  )

  const filteredTransferList = useMemo(
    () => transferList.filter((summary) => matchesTransferFilters(summary, appliedFilters)),
    [transferList, appliedFilters]
  )

  // Transfer List pagination — fetched in full, so pages are sliced client-side.
  const TRANSFER_LIST_PAGE_SIZE = 5
  const [transferListPage, setTransferListPage] = useState(1)

  useEffect(() => {
    setTransferListPage(1)
  }, [filteredTransferList])

  const pagedTransferList = filteredTransferList.slice(
    (transferListPage - 1) * TRANSFER_LIST_PAGE_SIZE,
    transferListPage * TRANSFER_LIST_PAGE_SIZE
  )

  const updateDraft = (patch: Partial<AllocationDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }))

  const handleStartWizard = () => {
    setDraft(createInitialAllocationDraft())
    setConfirmError(null)
    setAllocationDetailsValidationAttempted(false)
    setAddProductsValidationAttempted(false)
    setCreatedAllocation(null)
    setView('wizard')
  }

  const handleBeforeNextStep = (fromStep: number) => {
    if (fromStep === 3) {
      const isValid =
        Boolean(draft.destinationId) &&
        (draft.distributionMode !== 'pharmacy' || Boolean(draft.sourceId))
      if (!isValid) setAllocationDetailsValidationAttempted(true)
      return isValid
    }
    if (fromStep === 4) {
      const isValid = draft.lines.length > 0
      if (!isValid) setAddProductsValidationAttempted(true)
      return isValid
    }
    return true
  }

  // The wizard's Continue buttons never touch the network — they only move
  // between steps while each step writes into `draft`. This is the one and
  // only call to the backend, made once the user reviews and confirms.
  const handleConfirmAllocation = async () => {
    setIsConfirming(true)
    setConfirmError(null)
    try {
      const created = await createAllocation(buildCreateAllocationRequest(draft))
      setCreatedAllocation(created)
      showToast.success('Allocation created successfully')
      // A pharmacy transfer has no warehouse-side dispatch step to walk
      // through next, so it goes straight back to the list instead of the
      // dispatch summary screen.
      setView(draft.distributionMode === 'pharmacy' ? 'list' : 'summary')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create allocation.'
      setConfirmError(message)
      showToast.error(message)
    } finally {
      setIsConfirming(false)
    }
  }

  // Source stock leaves once the warehouse actually ships the products —
  // POST /warehouse/distribution/{id}/dispatch moves the allocation from
  // DISTRIBUTION_CREATED to PRODUCTS_DISPATCHED.
  const handleDispatchProducts = async () => {
    if (!createdAllocation?.warehouseDistributionId) return
    setIsDispatching(true)
    try {
      // This screen has no per-line editing, so the whole issued quantity ships.
      const lines = (createdAllocation.lines ?? [])
        .filter((line) => line.warehouseDistributionDetailsId != null)
        .map((line) => ({
          warehouseDistributionDetailsId: line.warehouseDistributionDetailsId!,
          dispatchedQuantity: line.issueQuantity ?? 0,
          remarks: null,
        }))

      const updated = await dispatchAllocation(
        createdAllocation.warehouseDistributionId,
        { lines }
      )
      setCreatedAllocation(updated)
      showToast.success('Products dispatched successfully')
      setView('dispatch')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to dispatch products.'
      showToast.error(message)
    } finally {
      setIsDispatching(false)
    }
  }

  // The Transfer List's "View" action: a "Ready to Dispatch" transfer hasn't
  // shipped anything yet, so it opens on the same summary screen the create
  // wizard ends on (with its own "Dispatch Products" action) rather than the
  // movement-history screen the other statuses use.
  const handleViewTransfer = async (summary: WarehouseDistributionSummaryData) => {
    if (summary.currentStatus !== 'DISTRIBUTION_CREATED') {
      setSelectedTransfer(summary)
      setView('details')
      return
    }

    setCreatedAllocation(null)
    setView('summary')
    setIsLoadingSummary(true)
    try {
      const data = await getWarehouseDistribution(summary.warehouseDistributionId)
      setCreatedAllocation(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load the allocation.'
      showToast.error(message)
      setView('list')
    } finally {
      setIsLoadingSummary(false)
    }
  }

  if (view === 'wizard') {
    return (
      <AllocationWizardLayout
        onCancel={() => setView('list')}
        onConfirm={handleConfirmAllocation}
        isConfirming={isConfirming}
        onBeforeNext={handleBeforeNextStep}
      >
        {(step, goToStep) => {
          if (step === 1) return <CreateAllocation draft={draft} onChange={updateDraft} />
          if (step === 2) return <DistributionType draft={draft} onChange={updateDraft} />
          if (step === 3)
            return (
              <AllocationDetails
                draft={draft}
                onChange={updateDraft}
                showValidation={allocationDetailsValidationAttempted}
              />
            )
          if (step === 4)
            return (
              <AddProducts
                draft={draft}
                onChange={updateDraft}
                showValidation={addProductsValidationAttempted}
              />
            )
          if (step === 5)
            return (
              <ReviewConfirm
                draft={draft}
                onEditAllocationDetails={() => goToStep(3)}
                submitError={confirmError}
              />
            )

          return (
            <div className="flex w-full items-center justify-center rounded-2xl border border-pneutral-200 bg-white p-8 text-p3 text-pneutral-500">
              Step {step} content coming soon.
            </div>
          )
        }}
      </AllocationWizardLayout>
    )
  }

  if (view === 'summary') {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        {isLoadingSummary || !createdAllocation ? (
          <div className="flex w-full items-center justify-center rounded-2xl border border-pneutral-200 bg-white p-8 text-p3 text-pneutral-500">
            Loading allocation...
          </div>
        ) : (
          <DistributionSummary
            distributionNo={
              createdAllocation.warehouseDistributionId
                ? `WD${String(createdAllocation.warehouseDistributionId).padStart(6, '0')}`
                : undefined
            }
            sourceType="Stock Allocation"
            sourceNo={createdAllocation.allocationNo || undefined}
            distributionDate={formatDate(createdAllocation.allocationDate)}
            sourceWarehouse={
              createdAllocation.sourceName?.trim() || createdAllocation.sourceId || '—'
            }
            destinationPharmacy={
              createdAllocation.destinationName?.trim() ||
              createdAllocation.destinationId ||
              '—'
            }
            reference={createdAllocation.reference || 'No reference specified'}
            remarks={createdAllocation.remarks || 'No remarks added.'}
            products={(createdAllocation.lines ?? []).map((line) => ({
              product: line.product?.productName ?? line.productId,
              genericName: line.product?.brandName ?? '',
              batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
              purchaseUnit: line.packaging?.purchaseUnit ?? '—',
              dispatchQty: line.issueQuantity ?? 0,
            }))}
            timelineSteps={[
              {
                icon: '/warehouseDistribution/document-text-mini-white.svg',
                label: 'Draft',
                timestamp: formatDate(createdAllocation.createdAt),
                description: 'Allocation created',
                active: true,
              },
              {
                icon: '/warehouseDistribution/truck-outline-gray.svg',
                label: 'Pending Receipt',
                description: 'Waiting for pharmacy to acknowledge receipt',
              },
              {
                icon: '/warehouseDistribution/check-circle-outline-gray.svg',
                label: 'Received',
                description: 'Stock received and available at pharmacy',
              },
            ]}
            onBack={() => setView('list')}
            onDispatchProducts={handleDispatchProducts}
            isDispatching={isDispatching}
          />
        )}
      </div>
    )
  }

  if (view === 'dispatch') {
    return (
      <DispatchProducts
        distributionId={createdAllocation?.warehouseDistributionId}
        onBack={() => setView('list')}
      />
    )
  }

  if (view === 'details' && selectedTransfer) {
    return (
      <DispatchProducts
        distributionId={selectedTransfer.warehouseDistributionId}
        movementNo={selectedTransfer.allocationNo}
        movementType="Warehouse Distribution"
        createdOn={formatDateTime(selectedTransfer.allocationDate)}
        lastUpdated={formatDateTime(selectedTransfer.allocationDate)}
        onBack={() => {
          setSelectedTransfer(null)
          setView('list')
        }}
      />
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-5">
      <div className="flex w-full flex-col items-start gap-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <h1 className="whitespace-nowrap text-h5 font-semibold text-pneutral-900">
              Transfer Explorer
            </h1>
            <Image
              src="/warehouseDistribution/transferExplorer/info-icon.svg"
              alt=""
              width={18}
              height={18}
            />
          </div>
          <p className="text-label-l4 font-normal text-pneutral-500">
            Search, track and explore all inter-store transfer transactions.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start lg:shrink-0">
          <OutlineActionButton label="Export Excel" />
          <OutlineActionButton
            label="Create Allocation"
            onClick={handleStartWizard}
          />

          <button
            type="button"
            className="flex h-12 w-full min-w-27 items-center justify-center gap-2 rounded-lg bg-pneutral-900 px-4 sm:w-auto"
          >
            <Image
              src="/warehouseDistribution/transferExplorer/printer-mini-white.svg"
              alt=""
              width={16}
              height={18}
            />
            <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
              Print
            </span>
          </button>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} card={card} />
        ))}
      </div>

      <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
        <div className="flex w-full items-center gap-3">
          <Image
            src="/warehouseDistribution/transferExplorer/filters/filter-icon.svg"
            alt=""
            width={14.4}
            height={14.85}
          />
          <p className="flex-1 text-label-l5 font-semibold text-pneutral-800">
            Advanced Filters
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextFilterField
            label="Transfer No."
            placeholder="Enter transfer no."
            value={filterDraft.transferNo}
            onChange={(value) => setFilterDraft((prev) => ({ ...prev, transferNo: value }))}
          />
          <SelectFilterField
            label="Source Store"
            defaultLabel="All Source Stores"
            options={sourceStoreOptions}
            value={filterDraft.sourceStore}
            onChange={(value) => setFilterDraft((prev) => ({ ...prev, sourceStore: value }))}
          />
          <SelectFilterField
            label="Destination Store"
            defaultLabel="All Destination Stores"
            options={destinationStoreOptions}
            value={filterDraft.destinationStore}
            onChange={(value) => setFilterDraft((prev) => ({ ...prev, destinationStore: value }))}
          />
          <SelectFilterField
            label="Status"
            defaultLabel="All Statuses"
            options={statusOptions}
            value={filterDraft.status}
            onChange={(value) => setFilterDraft((prev) => ({ ...prev, status: value }))}
          />
        </div>

        <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex w-full flex-col sm:w-1/2 lg:w-1/4">
            <DateRangeFilterField
              from={filterDraft.dateFrom}
              to={filterDraft.dateTo}
              onFromChange={(value) => setFilterDraft((prev) => ({ ...prev, dateFrom: value }))}
              onToChange={(value) => setFilterDraft((prev) => ({ ...prev, dateTo: value }))}
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex h-12 w-full items-center justify-center rounded-lg border-2 border-secondary-700 px-4 sm:w-35"
            >
              <span className="whitespace-nowrap text-label-l4 font-medium text-secondary-700">
                Clear Filters
              </span>
            </button>

            <button
              type="button"
              onClick={handleSearchFilters}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 sm:w-30"
            >
              <Image
                src="/warehouseDistribution/transferExplorer/filters/search-white.svg"
                alt=""
                width={16.25}
                height={16.25}
              />
              <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
                Search
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
        <p className="text-label-l5 font-semibold text-primary-800">
          Transfer List ({filteredTransferList.length})
        </p>

        <div className="w-full overflow-x-auto rounded-sm border border-pneutral-200">
          <TransferTableHeader />
          {isLoadingTransferList ? (
            <div className="flex min-w-245 items-center justify-center py-10 text-p3 text-pneutral-500">
              Loading transfers...
            </div>
          ) : filteredTransferList.length === 0 ? (
            <div className="flex min-w-245 items-center justify-center py-10 text-p3 text-pneutral-500">
              {transferList.length === 0
                ? 'No transfers found.'
                : 'No transfers match the selected filters.'}
            </div>
          ) : (
            pagedTransferList.map((summary) => (
              <TransferTableRow
                key={summary.warehouseDistributionId}
                row={toTransferRow(summary)}
                onView={() => handleViewTransfer(summary)}
              />
            ))
          )}
        </div>

        {!isLoadingTransferList && filteredTransferList.length > 0 && (
          <div className="w-full">
            <PaginationFooter
              page={transferListPage}
              pageSize={TRANSFER_LIST_PAGE_SIZE}
              totalItems={filteredTransferList.length}
              onPageChange={setTransferListPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default page
