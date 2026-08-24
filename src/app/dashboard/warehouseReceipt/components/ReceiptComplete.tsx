import React, { useEffect, useRef, useState } from 'react'
import {
  Check,
  Printer,
  Download,
  Warehouse,
  Store,
  ArrowLeftRight,
  Calendar,
  CalendarDays,
  Pill,
  Box,
  BarChart3,
} from 'lucide-react'
import {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
  WarehouseDistributionStatusData,
} from '@/types/WarehouseDistributionData'
import { getUserById } from '@/services/UserManagementService'
import { downloadElementAsPdf, printElementAsPdf } from '@/utils/downloadPdf'
import { showToast } from '@/app/components/common/Toast'

interface ReceiptCompleteProps {
  referenceNo?: string
  fromStore?: string
  toStore?: string
  distribution?: WarehouseDistributionData | null
  onPrintReceipt?: () => void
  onDownload?: () => void
  onGoToDashboard?: () => void
}

const headerButtonClass =
  'flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700'

const EM_DASH = '—'

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// dd-mmm-yyyy, with a 12-hour AM/PM time when the value carries one — this
// screen shows every date/time this way rather than the app-wide dd-mm-yyyy
// / 24-hour convention.
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

// First timestamp recorded for a given lifecycle status, if the transfer reached it.
const statusAt = (
  statuses: WarehouseDistributionStatusData[] | undefined,
  status: DistributionStatus
): string | undefined => statuses?.find((s) => s.status === status)?.createdAt

const TIMELINE_LABEL: Record<DistributionStatus, string> = {
  DISTRIBUTION_CREATED: 'Transfer Created',
  PRODUCTS_DISPATCHED: 'Dispatched',
  STOCK_RECEIVED: 'Receipt Completed',
  STOCK_REJECTED: 'Rejected',
}

interface ProgressStep {
  label: string
  timestamp?: string
  actor?: string
  bold?: boolean
}

// createdBy on a status entry is only ever the acting user's raw id — the
// timeline instead shows what's actually meaningful per step: the creator's
// role for the transfer's creation, and which store dispatched/received for
// the later steps.
const buildProgressSteps = (
  distribution: WarehouseDistributionData | null | undefined,
  creatorRole: string | null,
  sourceLabel: string,
  destinationLabel: string
): ProgressStep[] => {
  const statuses = distribution?.statuses ?? []
  if (statuses.length === 0) {
    return [{ label: 'Receipt Completed', bold: true }]
  }

  const steps = statuses.flatMap((s): Omit<ProgressStep, 'bold'>[] => {
    const timestamp = s.createdAt ? formatDateTime(s.createdAt) : undefined

    switch (s.status) {
      case 'DISTRIBUTION_CREATED':
        // The transfer's creation reads as two steps: who created it, then
        // the receiving store taking it on before dispatch.
        return [
          { label: 'Transfer Created', timestamp, actor: creatorRole ?? undefined },
          { label: 'Accepted', timestamp, actor: destinationLabel },
        ]
      case 'PRODUCTS_DISPATCHED':
        return [{ label: 'Dispatched', timestamp, actor: sourceLabel }]
      case 'STOCK_RECEIVED':
        return [{ label: 'Receipt Completed', timestamp, actor: destinationLabel }]
      default:
        return [{ label: TIMELINE_LABEL[s.status] ?? s.status, timestamp }]
    }
  })

  return steps.map((step, index) => ({
    ...step,
    bold: index === steps.length - 1,
  }))
}

const TransferProgressTimeline = ({ steps }: { steps: ProgressStep[] }) => (
  <div className="flex w-full flex-col items-start gap-5 rounded-2xl border border-pneutral-200 bg-white p-4 shadow-[0px_9px_28px_8px_rgba(0,0,0,0.05),0px_3px_6px_-4px_rgba(0,0,0,0.12),0px_6px_16px_0px_rgba(0,0,0,0.08)]">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Transfer Progress
    </p>

    <div className="flex w-full items-center">
      {steps.map((step, index) => (
        <React.Fragment key={`${step.label}-${index}`}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-600">
              <Check className="size-4.5 text-white" strokeWidth={3} />
            </div>

            <span
              className={`whitespace-nowrap text-center text-label-l2 text-pneutral-900 ${
                step.bold ? 'font-semibold' : 'font-regular'
              }`}
            >
              {step.label}
            </span>

            {step.timestamp && (
              <span className="whitespace-nowrap text-center text-label-l2 font-regular text-pneutral-600">
                {step.timestamp}
              </span>
            )}

            {step.actor && (
              <span className="whitespace-nowrap text-center text-label-l2 font-regular text-pneutral-600">
                {step.actor}
              </span>
            )}
          </div>

          {index < steps.length - 1 && (
            <div className="h-0.5 flex-1 bg-success-600" />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
)

const DateField = ({
  icon,
  label,
  labelClass,
  value,
}: {
  icon: React.ReactNode
  label: string
  labelClass?: string
  value: string
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
    <div className="flex items-center gap-3">
      {icon}
      <p className={`text-label-l3 font-regular ${labelClass ?? 'text-pneutral-500'}`}>
        {label}
      </p>
    </div>
    <p className="text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
)

const TransferDetails = ({
  referenceNo,
  fromStore,
  toStore,
  requestedOn,
  dispatchedOn,
  receivedOn,
}: {
  referenceNo: string
  fromStore: string
  toStore: string
  requestedOn: string
  dispatchedOn: string
  receivedOn: string
}) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <div className="flex w-full flex-wrap items-start gap-4">
      <div className="flex w-37.5 shrink-0 flex-col items-start gap-1">
        <p className="text-label-l3 font-regular text-pneutral-500">Transfer No.</p>
        <p className="text-label-l4 font-semibold text-primary-800">{referenceNo}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-8">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <p className="text-label-l3 font-regular text-pneutral-500">
            From (Sending Store)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-50 p-2">
              <Warehouse className="size-8 text-secondary-700" strokeWidth={1.5} />
            </div>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {fromStore}
            </p>
          </div>
        </div>

        <ArrowLeftRight className="size-6 shrink-0 text-secondary-700" strokeWidth={2} />

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <p className="text-label-l3 font-regular text-pneutral-500">
            To (Receiving Store)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-50 p-2">
              <Store className="size-8 text-secondary-700" strokeWidth={1.5} />
            </div>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {toStore}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="h-px w-full bg-pneutral-200" />

    <div className="flex w-full flex-wrap items-start gap-4">
      <DateField
        icon={<Calendar className="size-5 text-secondary-700" strokeWidth={2} />}
        label="Requested On"
        value={requestedOn}
      />
      <DateField
        icon={<Calendar className="size-5 text-secondary-700" strokeWidth={2} />}
        label="Dispatch Date & Time"
        value={dispatchedOn}
      />
      <DateField
        icon={<CalendarDays className="size-6 text-secondary-700" strokeWidth={2} />}
        label="Receipt Date & Time"
        labelClass="text-pneutral-600"
        value={receivedOn}
      />
    </div>
  </div>
)

type ProductIcon = 'pill' | 'box'

interface ReceivedItem {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  purchaseUnit: string
  expiryDate: string
  dispatchedQty: string
  receivedQty: string
  damagedQty: string
}

const iconForUnit = (unit?: string): ProductIcon => {
  const u = (unit ?? '').toLowerCase()
  return u.includes('strip') || u.includes('tablet') || u.includes('tab')
    ? 'pill'
    : 'box'
}

const mapLineToReceivedItem = (
  line: WarehouseDistributionLineData,
  index: number
): ReceivedItem => {
  const unit = line.packaging?.purchaseUnit ?? ''
  const contains = line.packaging?.purchaseUnitContains
  const dispatched = line.dispatchedQuantity ?? line.issueQuantity ?? 0
  const suffix = unit ? ` ${unit}` : ''
  return {
    id: line.warehouseDistributionDetailsId ?? index + 1,
    icon: iconForUnit(unit),
    productName: line.product?.productName ?? line.productId,
    packInfo:
      unit && contains && contains > 1 ? `${unit} of ${contains}` : unit || EM_DASH,
    batchNo: line.batch?.batchNumber ?? line.batchId ?? EM_DASH,
    purchaseUnit: unit || EM_DASH,
    expiryDate: line.batch?.expiryDate ? formatDateTime(line.batch.expiryDate) : EM_DASH,
    dispatchedQty: `${dispatched}${suffix}`,
    receivedQty: `${line.receivedQuantity ?? 0}${suffix}`,
    damagedQty: `${line.damagedQuantity ?? 0}${suffix}`,
  }
}

interface ReceivedColumn {
  header: string
  width?: string
  align?: 'left' | 'center'
  render: (row: ReceivedItem, index: number) => React.ReactNode
}

const receivedColumns: ReceivedColumn[] = [
  {
    header: '#',
    width: 'w-12',
    align: 'center',
    render: (_row, index) => (
      <span className="text-p3 font-regular text-pneutral-900">{index + 1}</span>
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
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-regular text-pneutral-900">{row.batchNo}</span>
    ),
  },
  {
    header: 'Purchase Unit',
    width: 'w-24',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.purchaseUnit}
      </span>
    ),
  },
  {
    header: 'Expiry Date',
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.expiryDate}
      </span>
    ),
  },
  {
    header: 'Dispatched Qty',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.dispatchedQty}
      </span>
    ),
  },
  {
    header: 'Received Qty',
    width: 'w-28',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.receivedQty}
      </span>
    ),
  },
  {
    header: 'Damaged/ Not Received Qty',
    width: 'w-36',
    align: 'center',
    render: (row) => (
      <span className="text-p3 font-medium text-pneutral-900">
        {row.damagedQty}
      </span>
    ),
  },
  {
    header: 'Status',
    width: 'w-32',
    align: 'center',
    render: () => (
      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-success-600 bg-success-50 px-3 py-1 text-label-l3 font-medium text-success-800">
        Received
      </span>
    ),
  },
]

const ProductsReceived = ({ items }: { items: ReceivedItem[] }) => (
  <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
    <p className="text-label-l5 font-semibold text-secondary-700">
      Products Received
    </p>

    {items.length === 0 ? (
      <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
        No products recorded.
      </p>
    ) : (
      <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-secondary-600">
              {receivedColumns.map((col) => (
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
            {items.map((row, index) => (
              <tr key={row.id}>
                {receivedColumns.map((col) => (
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

const actionButtonClass =
  'flex h-12 min-w-27 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-label-l4 font-medium sm:flex-none'

const ReceiptCompleteActions = ({
  onGoToDashboard,
}: {
  onGoToDashboard?: () => void
}) => (
  <div
    data-html2canvas-ignore
    className="flex w-full items-center justify-end border-t border-pneutral-200 bg-white py-4"
  >
    <button
      type="button"
      onClick={onGoToDashboard}
      className={`${actionButtonClass} bg-primary-800 text-pneutral-50`}
    >
      <BarChart3 className="size-5" strokeWidth={2} />
      Go to Dashboard
    </button>
  </div>
)

const ReceiptComplete = ({
  referenceNo,
  fromStore,
  toStore,
  distribution,
  onPrintReceipt,
  onDownload,
  onGoToDashboard,
}: ReceiptCompleteProps) => {
  const statuses = distribution?.statuses
  const reference = distribution?.allocationNo ?? referenceNo ?? EM_DASH
  const from = distribution?.sourceName ?? fromStore ?? EM_DASH
  const to = distribution?.destinationName ?? toStore ?? EM_DASH

  const requestedOn = formatDateTime(
    statusAt(statuses, 'DISTRIBUTION_CREATED') ?? distribution?.allocationDate,
    EM_DASH
  )
  const dispatchedOn = formatDateTime(statusAt(statuses, 'PRODUCTS_DISPATCHED'), EM_DASH)
  const receivedOn = formatDateTime(statusAt(statuses, 'STOCK_RECEIVED'), EM_DASH)

  // The creator's role for the "Transfer Created" step — createdBy is only a
  // raw user id, so it's resolved to a role name once the distribution loads.
  const creatorId = statuses?.find((s) => s.status === 'DISTRIBUTION_CREATED')?.createdBy
  const [creatorRole, setCreatorRole] = useState<string | null>(null)

  useEffect(() => {
    if (!creatorId) {
      setCreatorRole(null)
      return
    }
    let active = true
    getUserById(creatorId)
      .then((user) => {
        if (active) setCreatorRole(user?.pharmaRolesDto?.roleName ?? null)
      })
      .catch((error) => {
        console.error('Failed to fetch the transfer creator', error)
        if (active) setCreatorRole(null)
      })
    return () => {
      active = false
    }
  }, [creatorId])

  const progressSteps = buildProgressSteps(distribution, creatorRole, from, to)
  const receivedItems = (distribution?.lines ?? []).map(mapLineToReceivedItem)

  // The receipt is printed and downloaded as this screen stands. Printing goes
  // through the same PDF as the download, so the two agree on layout and
  // pagination rather than the printer reflowing the markup at paper width.
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handlePrint = async () => {
    if (!receiptRef.current || isPrinting) return
    setIsPrinting(true)
    try {
      await printElementAsPdf(receiptRef.current)
    } catch (error) {
      console.error('Failed to open the print view', error)
      showToast.error('Could not open the print dialog.')
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownload = async () => {
    if (!receiptRef.current || isDownloading) return
    setIsDownloading(true)
    try {
      const label = reference.replace(/[^a-zA-Z0-9-_]+/g, '-')
      await downloadElementAsPdf(receiptRef.current, `stock-receipt-${label}.pdf`)
      showToast.success('Stock receipt downloaded.')
    } catch (error) {
      console.error('Failed to generate the stock receipt PDF', error)
      showToast.error('Could not generate the PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    // bg-secondary-50 is the colour <main> already paints, so this is invisible on
    // screen — but the capture only gets a background if the element paints one,
    // and without it the white cards vanish into a white page.
    <div
      ref={receiptRef}
      className="flex w-full flex-col items-start gap-4 bg-secondary-50"
    >
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h5 font-semibold text-pneutral-900">
              Receipt Completed
            </h1>
            <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
              {reference}
            </span>
          </div>

          <p className="text-label-l4 font-regular text-pneutral-600">
            The stock receipt has been completed successfully.
          </p>
        </div>

        <div data-html2canvas-ignore className="flex flex-wrap items-stretch gap-4">
          <button
            type="button"
            onClick={onPrintReceipt ?? handlePrint}
            disabled={isPrinting}
            className={`${headerButtonClass} disabled:opacity-50`}
          >
            <Printer className="size-5" strokeWidth={2} />
            {isPrinting ? 'Preparing…' : 'Print Receipt'}
          </button>

          <button
            type="button"
            onClick={onDownload ?? handleDownload}
            disabled={isDownloading}
            className={`${headerButtonClass} disabled:opacity-50`}
          >
            <Download className="size-5" strokeWidth={2} />
            {isDownloading ? 'Preparing…' : 'Download'}
          </button>
        </div>
      </div>

      <TransferProgressTimeline steps={progressSteps} />

      <TransferDetails
        referenceNo={reference}
        fromStore={from}
        toStore={to}
        requestedOn={requestedOn}
        dispatchedOn={dispatchedOn}
        receivedOn={receivedOn}
      />

      <ProductsReceived items={receivedItems} />

      <ReceiptCompleteActions onGoToDashboard={onGoToDashboard} />
    </div>
  )
}

export default ReceiptComplete
