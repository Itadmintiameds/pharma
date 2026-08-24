'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, CheckCircle2, Package } from 'lucide-react'
import PaginationFooter from '@/app/components/common/table/Pagination'
import StockReceiptView from './components/StockReceipt'
import ReceiptCompleteView from './components/ReceiptComplete'
import {
  getDestinationDistributions,
  getDestinationReceiptKpi,
  getWarehouseDistribution,
} from '@/services/WarehouseDistributionService'
import {
  WarehouseDistributionData,
  WarehouseDistributionReceiptKpi,
  WarehouseDistributionSummary,
} from '@/types/WarehouseDistributionData'
import { formatDate } from '@/utils/formatDate'
import { showToast } from '@/app/components/common/Toast'
import { useOrgInventoryGuard } from '@/hooks/useOrgInventoryGuard'

interface StatCardProps {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
}

const StatCard = ({ icon, iconBg, label, value }: StatCardProps) => (
  <div className="flex h-[108px] w-72 flex-col gap-0.5 rounded-xl border border-pneutral-100 bg-white p-4">
    <div className="flex w-full items-center gap-2">
      <div
        className={`flex size-[52px] shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="whitespace-nowrap text-label-l4 font-medium text-pneutral-900">
          {label}
        </p>
        <p className="text-h4 font-medium text-pneutral-900">{value}</p>
      </div>
    </div>
  </div>
)

type ReceiptStatus = 'Awaiting Dispatch' | 'Pending Receipt' | 'Completed'

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

// Receipt-side view of the distribution lifecycle:
//   DISTRIBUTION_CREATED  -> Awaiting Dispatch (not yet sent — nothing to receive)
//   PRODUCTS_DISPATCHED   -> Pending Receipt   (in flight — ready to action)
//   STOCK_RECEIVED        -> Completed
const mapSummaryToReceipt = (
  summary: WarehouseDistributionSummary,
  index: number
): StockReceipt => ({
  id: index + 1,
  warehouseDistributionId: summary.warehouseDistributionId,
  transferNo: summary.allocationNo,
  from: summary.fromStore ?? '—',
  products: summary.productsCount,
  // totalDispatchedQuantity is legitimately 0 before dispatch happens — fall
  // back to what was issued so the row shows the expected quantity instead
  // of a confusing "0 PU".
  quantity: summary.totalDispatchedQuantity || summary.totalIssueQuantity,
  date: formatDate(summary.allocationDate),
  status:
    summary.currentStatus === 'STOCK_RECEIVED'
      ? 'Completed'
      : summary.currentStatus === 'PRODUCTS_DISPATCHED'
        ? 'Pending Receipt'
        : 'Awaiting Dispatch',
})

const RECEIPT_STATUS_CLASS: Record<ReceiptStatus, string> = {
  'Awaiting Dispatch': 'border-warning-600 bg-warning-50 text-warning-600',
  'Pending Receipt': 'border-danger-600 bg-danger-50 text-danger-600',
  Completed: 'border-success-600 bg-success-50 text-success-800',
}

const ReceiptStatusBadge = ({ status }: { status: ReceiptStatus }) => (
  <span
    className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-label-l3 font-medium ${RECEIPT_STATUS_CLASS[status]}`}
  >
    {status}
  </span>
)

interface ReceiptColumn {
  header: string
  width?: string
  align?: 'left' | 'center'
  render: (row: StockReceipt) => ReactNode
}

const buildReceiptColumns = (
  onReceiveNow: (row: StockReceipt) => void,
  onView: (row: StockReceipt) => void
): ReceiptColumn[] => [
  {
    header: '#',
    width: 'w-[4%] min-w-10',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-semibold text-pneutral-900">{row.id}</span>
    ),
  },
  {
    header: 'Transfer No.',
    width: 'w-[13%] min-w-35',
    align: 'center',
    render: (row) => (
      <span className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {row.transferNo}
      </span>
    ),
  },
  {
    header: 'From',
    width: 'w-[15%] min-w-35',
    align: 'center',
    render: (row) => (
      <span className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {row.from}
      </span>
    ),
  },
  {
    header: 'Products',
    width: 'w-[8%] min-w-17.5',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.products}
      </span>
    ),
  },
  {
    header: 'Quantity (Purchase Units)',
    width: 'w-[14%] min-w-27.5',
    align: 'center',
    render: (row) => (
      <span className="text-label-l4 font-semibold text-pneutral-900">
        {row.quantity}
      </span>
    ),
  },
  {
    header: 'Date',
    width: 'w-[11%] min-w-27.5',
    align: 'center',
    render: (row) => (
      <span className="whitespace-nowrap text-label-l4 font-regular text-pneutral-900">
        {row.date}
      </span>
    ),
  },
  {
    header: 'Status',
    width: 'w-[16%] min-w-37.5',
    align: 'center',
    render: (row) => <ReceiptStatusBadge status={row.status} />,
  },
  {
    header: 'Action',
    width: 'w-[19%] min-w-32.5',
    align: 'center',
    render: (row) =>
      row.status === 'Pending Receipt' ? (
        <button
          type="button"
          onClick={() => onReceiveNow(row)}
          className="mx-auto flex h-9 min-w-27 items-center justify-center rounded-lg bg-secondary-700 px-3 text-label-l3 font-medium text-pneutral-50"
        >
          Receive Now
        </button>
      ) : row.status === 'Completed' ? (
        <button
          type="button"
          onClick={() => onView(row)}
          className="mx-auto flex h-9 min-w-27 items-center justify-center rounded-lg border-[1.5px] border-secondary-700 px-3 text-label-l3 font-medium text-secondary-700"
        >
          View
        </button>
      ) : (
        // Awaiting Dispatch — nothing has been sent yet, so there's nothing to
        // receive or view.
        <span className="text-label-l4 font-regular text-pneutral-500">—</span>
      ),
  },
]

const PAGE_SIZE = 7

type View = 'list' | 'receipt' | 'complete'

const page = () => {
  const router = useRouter()

  // Warehouse Receipt only exists with centralized inventory — block direct-URL
  // access when the organization's inventory is decentralized.
  const { checking: accessChecking } = useOrgInventoryGuard({
    deny: ({ isDecentralizedInventory }) => isDecentralizedInventory,
    message: 'Warehouse Receipt is available only with centralized inventory.',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [view, setView] = useState<View>('list')

  const [receipts, setReceipts] = useState<StockReceipt[]>([])
  const [kpi, setKpi] = useState<WarehouseDistributionReceiptKpi | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeReceipt, setActiveReceipt] = useState<StockReceipt | null>(null)
  const [activeDistribution, setActiveDistribution] =
    useState<WarehouseDistributionData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const [data, kpiData] = await Promise.all([
        getDestinationDistributions(),
        getDestinationReceiptKpi(),
      ])
      setReceipts(data.map(mapSummaryToReceipt))
      setKpi(kpiData)
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

  // Hold the page blank until the guard resolves, so a decentralized-inventory
  // user never sees the dashboard before being redirected.
  if (accessChecking) {
    return (
      <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
        Loading…
      </p>
    )
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
          value={pad2(kpi?.pendingReceipts ?? 0)}
        />
        <StatCard
          icon={<CheckCircle2 className="size-6 text-success-600" strokeWidth={1.8} />}
          iconBg="bg-success-50"
          label="Received Today"
          value={pad2(kpi?.receivedToday ?? 0)}
        />
        <StatCard
          icon={<Package className="size-6 text-info-600" strokeWidth={1.8} />}
          iconBg="bg-info-50"
          label="Products Received Today"
          value={pad2(kpi?.productsReceivedToday ?? 0)}
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
          <div className="w-full overflow-hidden rounded-xl border border-pneutral-100 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="bg-secondary-600">
                    {receiptColumns.map((col) => (
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
                  {receipts
                    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                    .map((row) => (
                      <tr key={row.id}>
                        {receiptColumns.map((col) => (
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
                    ))}
                </tbody>
              </table>
            </div>

            <PaginationFooter
              page={currentPage}
              pageSize={PAGE_SIZE}
              totalItems={receipts.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default page
