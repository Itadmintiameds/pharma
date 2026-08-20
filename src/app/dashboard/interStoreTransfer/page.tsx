'use client'

import { useState } from 'react'
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

const CompletedStatCard = () => (
  <div
    className={`flex items-start gap-3 self-stretch rounded-2xl border-t-[3px] border-t-success-600 bg-white p-4 ${cardShadow}`}
  >
    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-50">
      <CheckCircle2 className="size-5.5 text-success-600" strokeWidth={2} />
    </div>

    <div className="flex flex-1 flex-col items-start justify-between gap-3">
      <p className="text-p3 font-regular text-pneutral-900">Completed</p>
      <p className="text-label-l4 font-semibold text-success-600">142</p>
    </div>
  </div>
)

const statCards: StatCardProps[] = [
  {
    label: ['Awaiting', 'Acceptance'],
    value: '6',
    Icon: ClipboardList,
    borderColor: 'border-t-danger-600',
    iconBg: 'bg-danger-50',
    accentText: 'text-danger-600',
  },
  {
    label: ['Ready to', 'Dispatch'],
    value: '4',
    Icon: Send,
    borderColor: 'border-t-info-600',
    iconBg: 'bg-info-50',
    accentText: 'text-info-600',
  },
  {
    label: ['Pending', 'Receipt'],
    value: '3',
    Icon: Truck,
    borderColor: 'border-t-primary-800',
    iconBg: 'bg-primary-100',
    accentText: 'text-primary-800',
  },
]

const StatCardsRow = () => (
  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
    {statCards.map((card) => (
      <StatCard key={card.value} {...card} />
    ))}
    <CompletedStatCard />
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

const transferRows: TransferRow[] = [
  {
    key: 'row-1',
    displayNo: '1',
    ptNo: 'TR00022',
    from: 'Hebbal',
    toStore: 'Malleshwaram Store',
    toCode: 'STO0010',
    products: '5',
    qty: '35 PU',
    status: 'awaiting_acceptance',
    action: 'Review',
  },
  {
    key: 'row-2',
    displayNo: '2',
    ptNo: 'TR00022',
    from: 'Hebbal',
    toStore: 'Malleshwaram Store',
    toCode: 'STO0010',
    products: '16',
    qty: '35 PU',
    status: 'ready_to_dispatch',
    action: 'Dispatch',
  },
  {
    key: 'row-3',
    displayNo: '3',
    ptNo: 'TR00022',
    from: 'Hebbal',
    toStore: 'Malleshwaram Store',
    toCode: 'STO0010',
    products: '13',
    qty: '35 PU',
    status: 'pending_receipt',
    action: 'Reason',
  },
  {
    key: 'row-4',
    displayNo: '3',
    ptNo: 'TR00022',
    from: 'Hebbal',
    toStore: 'Malleshwaram Store',
    toCode: 'STO0010',
    products: '13',
    qty: '35 PU',
    status: 'completed',
    action: 'Reason',
  },
  {
    key: 'row-5',
    displayNo: '3',
    ptNo: 'TR00022',
    from: 'Hebbal',
    toStore: 'Malleshwaram Store',
    toCode: 'STO0010',
    products: '13',
    qty: '35 PU',
    status: 'rejected',
    action: 'Reason',
  },
]

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
const TOTAL_ENTRIES = 128

const TransfersTable = ({
  onSelectRow,
}: {
  onSelectRow: (row: TransferRow) => void
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const transferColumns = buildTransferColumns(onSelectRow)

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <h2 className="text-h6 font-semibold text-pneutral-900">
        Inter-Store Transfers
      </h2>

      <TableWithoutGrid
        columns={transferColumns}
        data={transferRows}
        rowKey={(row) => row.key}
        headerVariant="primary"
        container="card"
        pagination={{
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalItems: TOTAL_ENTRIES,
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

  if (view === 'pending_receipt' && activeTransfer) {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <PendingReceipt
          referenceNo={activeTransfer.ptNo}
          destinationStore={activeTransfer.toStore}
          onBack={() => setView('dispatch')}
          onClose={() => {
            setView('list')
            setActiveTransfer(null)
          }}
        />
      </div>
    )
  }

  if (view === 'dispatch' && activeTransfer) {
    return (
      <div className="flex min-h-full w-full flex-col items-start gap-4">
        <DispatchProducts
          destinationStore={activeTransfer.toStore}
          status="ready_to_dispatch"
          onBack={() => setView('details')}
          onDispatch={() => setView('pending_receipt')}
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
          onBack={() => {
            setView('list')
            setActiveTransfer(null)
          }}
          onAccept={() => setView('dispatch')}
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <HeaderRow />
      <StatCardsRow />
      <FiltersRow />
      <TransfersTable
        onSelectRow={(row) => {
          setActiveTransfer(row)
          setView('details')
        }}
      />
    </div>
  )
}

export default page
