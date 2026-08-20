'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, CheckCircle2, Package } from 'lucide-react'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'
import StockReceiptView from './components/StockReceipt'
import ReceiptCompleteView from './components/ReceiptComplete'
import {
  getDestinationDistributions,
  getWarehouseDistribution,
} from '@/services/WarehouseDistributionService'
import {
  WarehouseDistributionData,
  WarehouseDistributionSummary,
} from '@/types/WarehouseDistributionData'
import { formatDate } from '@/utils/formatDate'
import { showToast } from '@/app/components/common/Toast'

interface StatCardProps {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
}

const StatCard = ({ icon, iconBg, label, value }: StatCardProps) => (
  <div className="flex h-[108px] w-55 flex-col gap-0.5 rounded-xl border border-pneutral-100 bg-white p-4">
    <div className="flex w-full items-center gap-2">
      <div
        className={`flex size-[52px] shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="text-label-l4 font-medium text-pneutral-900">{label}</p>
        <p className="text-h4 font-medium text-pneutral-900">{value}</p>
      </div>
    </div>
  </div>
)

type ReceiptStatus = 'Pending Receipt' | 'Completed'

interface StockReceipt {
  id: number
  warehouseDistributionId: number
  transferNo: string
  from: string
  products: number
  quantity: number
  date: string
  status: ReceiptStatus
}

// A distribution is "Completed" once its stock has been received; anything still
// in flight (dispatched, awaiting receipt) shows as a pending receipt to action.
const mapSummaryToReceipt = (
  summary: WarehouseDistributionSummary,
  index: number
): StockReceipt => ({
  id: index + 1,
  warehouseDistributionId: summary.warehouseDistributionId,
  transferNo: summary.allocationNo,
  from: summary.fromStore ?? '—',
  products: summary.productsCount,
  quantity: summary.totalDispatchedQuantity ?? summary.totalIssueQuantity,
  date: formatDate(summary.allocationDate),
  status: summary.currentStatus === 'STOCK_RECEIVED' ? 'Completed' : 'Pending Receipt',
})

const ReceiptStatusBadge = ({ status }: { status: ReceiptStatus }) => (
  <span
    className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-label-l3 font-medium ${
      status === 'Completed'
        ? 'border-success-600 bg-success-50 text-success-800'
        : 'border-danger-600 bg-danger-50 text-danger-600'
    }`}
  >
    {status}
  </span>
)

const buildReceiptColumns = (
  onReceiveNow: (row: StockReceipt) => void,
  onView: (row: StockReceipt) => void
): TableColumn<StockReceipt>[] => [
  {
    header: '#',
    width: 'w-12',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-semibold text-pneutral-900">{row.id}</span>
    ),
  },
  {
    header: 'Transfer No.',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.transferNo}
      </span>
    ),
  },
  {
    header: 'From',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.from}
      </span>
    ),
  },
  {
    header: 'Products',
    width: 'w-20',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.products}
      </span>
    ),
  },
  {
    header: 'Quantity (Purchase Units)',
    width: 'w-36',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.quantity}
      </span>
    ),
  },
  {
    header: 'Date',
    width: 'w-24',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {row.date}
      </span>
    ),
  },
  {
    header: 'Status',
    width: 'w-40',
    align: 'center',
    render: (row) => <ReceiptStatusBadge status={row.status} />,
  },
  {
    header: 'Action',
    width: 'w-40',
    align: 'center',
    render: (row) =>
      row.status === 'Pending Receipt' ? (
        <button
          type="button"
          onClick={() => onReceiveNow(row)}
          className="flex h-9 min-w-27 items-center justify-center rounded-lg bg-secondary-700 px-3 text-label-l3 font-medium text-pneutral-50"
        >
          Receive Now
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onView(row)}
          className="flex h-9 min-w-27 items-center justify-center rounded-lg border-[1.5px] border-secondary-700 px-3 text-label-l3 font-medium text-secondary-700"
        >
          View
        </button>
      ),
  },
]

const PAGE_SIZE = 7

type View = 'list' | 'receipt' | 'complete'

const isSameDay = (iso: string | undefined, today: string): boolean =>
  !!iso && iso.split('T')[0] === today

const page = () => {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [view, setView] = useState<View>('list')

  const [summaries, setSummaries] = useState<WarehouseDistributionSummary[]>([])
  const [receipts, setReceipts] = useState<StockReceipt[]>([])
  const [loading, setLoading] = useState(true)

  const [activeReceipt, setActiveReceipt] = useState<StockReceipt | null>(null)
  const [activeDistribution, setActiveDistribution] =
    useState<WarehouseDistributionData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDestinationDistributions()
      setSummaries(data)
      setReceipts(data.map(mapSummaryToReceipt))
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to fetch incoming stock distributions.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  // Fetch the full distribution, then show the given view (receive form or completed).
  const openDetail = async (row: StockReceipt, nextView: 'receipt' | 'complete') => {
    setActiveReceipt(row)
    setActiveDistribution(null)
    setDetailLoading(true)
    setView(nextView)
    try {
      const detail = await getWarehouseDistribution(row.warehouseDistributionId)
      setActiveDistribution(detail)
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to fetch the distribution details.'
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const backToList = () => {
    setView('list')
    setActiveReceipt(null)
    setActiveDistribution(null)
    loadList()
  }

  if (view === 'complete') {
    return (
      <ReceiptCompleteView
        referenceNo={activeReceipt?.transferNo}
        fromStore={activeReceipt?.from}
        distribution={activeDistribution}
        onGoToDashboard={() => {
          backToList()
          router.push('/dashboard/warehouseReceipt')
        }}
      />
    )
  }

  if (view === 'receipt' && activeReceipt) {
    return (
      <StockReceiptView
        referenceNo={activeReceipt.transferNo}
        fromLocation={activeReceipt.from}
        distribution={activeDistribution}
        loading={detailLoading}
        onBack={backToList}
        onReceived={(updated) => {
          setActiveDistribution(updated)
          setView('complete')
        }}
      />
    )
  }

  const receiptColumns = buildReceiptColumns(
    (row) => openDetail(row, 'receipt'),
    (row) => openDetail(row, 'complete')
  )

  // Stat cards derived from the list. "Today" is measured against the allocation date
  // (the API summary has no dedicated received-on timestamp).
  const todayIso = new Date().toISOString().split('T')[0]
  const pendingCount = receipts.filter((r) => r.status === 'Pending Receipt').length
  const receivedToday = summaries.filter(
    (s) => s.currentStatus === 'STOCK_RECEIVED' && isSameDay(s.allocationDate, todayIso)
  )
  const productsReceivedToday = receivedToday.reduce(
    (sum, s) => sum + (s.productsCount ?? 0),
    0
  )

  const pad2 = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-1">
        <h1 className="text-h4 font-semibold text-pneutral-900">
          Stock Receipt Dashboard
        </h1>
        <p className="text-p3 font-regular text-pneutral-900">
          Receive and verify stock sent from Central Warehouse
        </p>
      </div>

      <div className="flex w-full flex-wrap items-start gap-4">
        <StatCard
          icon={<ClipboardList className="size-6 text-secondary-700" strokeWidth={1.8} />}
          iconBg="bg-secondary-100"
          label="Pending Receipts"
          value={pad2(pendingCount)}
        />
        <StatCard
          icon={<CheckCircle2 className="size-6 text-success-600" strokeWidth={1.8} />}
          iconBg="bg-success-50"
          label="Received Today"
          value={pad2(receivedToday.length)}
        />
        <StatCard
          icon={<Package className="size-6 text-info-600" strokeWidth={1.8} />}
          iconBg="bg-info-50"
          label="Products Received Today"
          value={pad2(productsReceivedToday)}
        />
      </div>

      <div className="flex w-full flex-col items-start gap-2">
        <h2 className="text-h6 font-semibold text-pneutral-900">
          Recent Stock Receipts
        </h2>

        {loading ? (
          <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
            Loading stock receipts…
          </p>
        ) : receipts.length === 0 ? (
          <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
            No stock receipts found.
          </p>
        ) : (
          <TableWithoutGrid
            columns={receiptColumns}
            data={receipts.slice(
              (currentPage - 1) * PAGE_SIZE,
              currentPage * PAGE_SIZE
            )}
            rowKey={(row) => row.id.toString()}
            headerVariant="primary"
            container="card"
            pagination={{
              page: currentPage,
              pageSize: PAGE_SIZE,
              totalItems: receipts.length,
              onPageChange: setCurrentPage,
            }}
          />
        )}
      </div>
    </div>
  )
}

export default page
