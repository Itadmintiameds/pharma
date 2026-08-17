'use client'

import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, CheckCircle2, Package } from 'lucide-react'
import TableWithoutGrid, {
  TableColumn,
} from '@/app/components/common/table/TableWithoutGrid'
import StockReceiptView from './components/StockReceipt'
import ReceiptCompleteView from './components/ReceiptComplete'

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
  transferNo: string
  from: string
  products: number
  quantity: number
  date: string
  status: ReceiptStatus
}

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

const stockReceipts: StockReceipt[] = [
  {
    id: 1,
    transferNo: 'TR00022',
    from: 'Hebbal Medical Store',
    products: 5,
    quantity: 5,
    date: '323332',
    status: 'Pending Receipt',
  },
  {
    id: 2,
    transferNo: 'TR00022',
    from: 'Central Warehouse',
    products: 16,
    quantity: 16,
    date: '464664',
    status: 'Completed',
  },
  {
    id: 3,
    transferNo: 'TR00022',
    from: 'JP Nagar Medical Store',
    products: 13,
    quantity: 13,
    date: '666653',
    status: 'Completed',
  },
]

const buildReceiptColumns = (
  onReceiveNow: (row: StockReceipt) => void
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
          className="flex h-9 min-w-27 items-center justify-center rounded-lg border-[1.5px] border-secondary-700 px-3 text-label-l3 font-medium text-secondary-700"
        >
          View
        </button>
      ),
  },
]

const PAGE_SIZE = 7
const TOTAL_ENTRIES = 128

type View = 'list' | 'receipt' | 'complete'

const page = () => {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [view, setView] = useState<View>('list')
  const [activeReceipt, setActiveReceipt] = useState<StockReceipt | null>(null)

  if (view === 'complete' && activeReceipt) {
    return (
      <ReceiptCompleteView
        referenceNo={activeReceipt.transferNo}
        fromStore={activeReceipt.from}
        onGoToDashboard={() => {
          setView('list')
          setActiveReceipt(null)
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
        onBack={() => setView('list')}
        onConfirmReceipt={() => setView('complete')}
      />
    )
  }

  const receiptColumns = buildReceiptColumns((row) => {
    setActiveReceipt(row)
    setView('receipt')
  })

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
          value="03"
        />
        <StatCard
          icon={<CheckCircle2 className="size-6 text-success-600" strokeWidth={1.8} />}
          iconBg="bg-success-50"
          label="Received Today"
          value="07"
        />
        <StatCard
          icon={<Package className="size-6 text-info-600" strokeWidth={1.8} />}
          iconBg="bg-info-50"
          label="Products Received Today"
          value="45"
        />
      </div>

      <div className="flex w-full flex-col items-start gap-2">
        <h2 className="text-h6 font-semibold text-pneutral-900">
          Recent Stock Receipts
        </h2>

        <TableWithoutGrid
          columns={receiptColumns}
          data={stockReceipts}
          rowKey={(row) => row.id.toString()}
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
    </div>
  )
}

export default page
