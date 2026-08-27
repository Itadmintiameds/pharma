'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Check, Pill, Box, ArrowLeft, CheckCircle2 } from 'lucide-react'
import {
  DistributionStatus,
  ReceiveWarehouseDistributionLineRequest,
  WarehouseDistributionData,
  WarehouseDistributionLineData,
} from '@/types/WarehouseDistributionData'
import { formatDate } from '@/utils/formatDate'
import { receiveAllocation } from '@/services/WarehouseDistributionService'
import { showToast } from '@/app/components/common/Toast'
import { useModulePermissions } from '@/hooks/useModulePermissions'

interface StockReceiptProps {
  referenceNo?: string
  fromLocation?: string
  distribution?: WarehouseDistributionData | null
  loading?: boolean
  onBack?: () => void
  // Fires after the receive is confirmed server-side; receives the updated distribution.
  onReceived?: (updated: WarehouseDistributionData) => void
}

type StepState = 'done' | 'current' | 'upcoming'

interface TransferStep {
  label: string
  state: StepState
}

const STEP_LABELS = [
  'Requested',
  'Accepted',
  'Dispatched',
  'Pending Receipt',
  'Completed',
] as const

// Where the lifecycle sits on the 5-step bar. The receipt screen normally opens on a
// PRODUCTS_DISPATCHED transfer, so "Pending Receipt" is the live step by default.
const currentStepIndexFor = (status?: DistributionStatus): number => {
  switch (status) {
    case 'STOCK_RECEIVED':
      return 5
    case 'DISTRIBUTION_CREATED':
      return 2
    case 'PRODUCTS_DISPATCHED':
    default:
      return 3
  }
}

const buildTransferSteps = (status?: DistributionStatus): TransferStep[] => {
  const currentIndex = currentStepIndexFor(status)
  return STEP_LABELS.map((label, index) => ({
    label,
    state:
      index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

const STATUS_META: Record<DistributionStatus, { label: string; description: string }> = {
  DISTRIBUTION_CREATED: {
    label: 'Created',
    description: 'The transfer has been created and is awaiting dispatch.',
  },
  PRODUCTS_DISPATCHED: {
    label: 'Pending Receipt',
    description: 'Stock has been dispatched and is awaiting your receipt confirmation.',
  },
  STOCK_RECEIVED: {
    label: 'Completed',
    description: 'Stock has been received and recorded.',
  },
  STOCK_REJECTED: {
    label: 'Rejected',
    description: 'The stock transfer was rejected.',
  },
}

const StepCircle = ({ step, index }: { step: TransferStep; index: number }) => {
  if (step.state === 'done') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-600">
        <Check className="size-4.5 text-white" strokeWidth={3} />
      </div>
    )
  }

  if (step.state === 'current') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-700">
        <span className="text-label-l4 font-semibold text-white">{index + 1}</span>
      </div>
    )
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-pneutral-200">
      <span className="text-label-l4 font-semibold text-pneutral-500">{index + 1}</span>
    </div>
  )
}

const stepLabelClass = (state: StepState) => {
  if (state === 'current') return 'font-semibold text-secondary-700'
  if (state === 'upcoming') return 'font-regular text-pneutral-500'
  return 'font-regular text-pneutral-900'
}

const TransferStatusStepper = ({ steps }: { steps: TransferStep[] }) => (
  <div className="flex w-full flex-1 flex-col gap-5 rounded-2xl bg-white p-4 shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]">
    <p className="text-label-l5 font-semibold text-secondary-700">Transfer Status</p>

    <div className="flex w-full items-center">
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-2">
            <StepCircle step={step} index={index} />
            <span
              className={`w-22.5 text-center text-label-l2 ${stepLabelClass(step.state)}`}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 ${
                steps[index].state === 'done' ? 'bg-success-600' : 'bg-pneutral-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
)

const CurrentStatusPanel = ({
  statusLabel,
  description,
}: {
  statusLabel: string
  description: string
}) => (
  <div className="flex w-full shrink-0 flex-col items-start justify-center gap-3 self-stretch rounded-2xl bg-secondary-100 p-4 lg:w-65">
    <p className="text-label-l2 font-regular text-pneutral-500">Current Status</p>
    <p className="text-h5 font-semibold text-secondary-700">{statusLabel}</p>
    <p className="text-label-l2 font-regular text-pneutral-900">{description}</p>
  </div>
)

type ProductIcon = 'pill' | 'box'

interface ReceiveItem {
  id: number
  icon: ProductIcon
  productName: string
  packInfo: string
  batchNo: string
  /** Display string for the Dispatched column, e.g. "10 Strip". */
  dispatchedQty: string
  /** Raw dispatched count the received/damaged split is computed against. */
  dispatchedQtyValue: number
  expiryDate: string
  receivedQty: string
  damagedQty: string
  remarks: string
}

// "Strip"/"Tablet" packs read as pills; anything else (Bottle, Box, …) gets the box icon.
const iconForUnit = (unit?: string): ProductIcon => {
  const u = (unit ?? '').toLowerCase()
  return u.includes('strip') || u.includes('tablet') || u.includes('tab')
    ? 'pill'
    : 'box'
}

// One dispatched line -> one editable receive row. Received qty defaults to the
// dispatched qty (the common case is "all arrived"); the received and damaged/
// not-received split always sums to dispatched, so damaged defaults to the
// remainder and the two stay in lockstep as the user edits (see handleFieldChange).
const mapLineToReceiveItem = (
  line: WarehouseDistributionLineData,
  index: number
): ReceiveItem => {
  const unit = line.packaging?.purchaseUnit ?? ''
  const contains = line.packaging?.purchaseUnitContains
  const dispatched = line.dispatchedQuantity ?? line.issueQuantity ?? 0
  const received = line.receivedQuantity != null ? line.receivedQuantity : dispatched
  const damaged =
    line.damagedQuantity != null
      ? line.damagedQuantity
      : Math.max(0, dispatched - received)
  return {
    id: line.warehouseDistributionDetailsId ?? index + 1,
    icon: iconForUnit(unit),
    productName: line.product?.productName ?? line.productId,
    packInfo:
      unit && contains && contains > 1 ? `${unit} of ${contains}` : unit || '—',
    batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
    expiryDate: formatDate(line.batch?.expiryDate),
    dispatchedQty: unit ? `${dispatched} ${unit}` : `${dispatched}`,
    dispatchedQtyValue: dispatched,
    receivedQty: String(received),
    damagedQty: String(damaged),
    remarks: line.receiveRemarks ?? line.remarks ?? '',
  }
}

const receiveInputClass =
  'h-12 w-full rounded-lg border border-pneutral-300 bg-white p-3 text-p4 font-regular text-sneutral-800 focus:outline-none focus:border-secondary-700'

// Receiving anything other than the full dispatched quantity (i.e. some was
// damaged or not received) without a remark leaves no record of why — require
// one before the row can be treated as valid.
const rowNeedsRemarks = (item: ReceiveItem) =>
  Number(item.receivedQty) !== item.dispatchedQtyValue && item.remarks.trim() === ''

interface ReceiveColumn {
  header: string
  width?: string
  align?: 'left' | 'center'
  render: (row: ReceiveItem, index: number) => React.ReactNode
}

const buildReceiveColumns = (
  onFieldChange: (
    id: number,
    field: 'receivedQty' | 'damagedQty' | 'remarks',
    value: string
  ) => void,
  showValidation: boolean
): ReceiveColumn[] => [
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
          <span className="text-p3 font-regular text-pneutral-500">
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
    width: 'w-32',
    align: 'center',
    render: (row) => (
      <input
        type="text"
        inputMode="numeric"
        value={row.receivedQty}
        onChange={(e) => onFieldChange(row.id, 'receivedQty', e.target.value)}
        className={receiveInputClass}
      />
    ),
  },
  {
    header: 'Damaged/ Not Received Qty',
    width: 'w-40',
    align: 'center',
    render: (row) => (
      <input
        type="text"
        inputMode="numeric"
        value={row.damagedQty}
        onChange={(e) => onFieldChange(row.id, 'damagedQty', e.target.value)}
        className={receiveInputClass}
      />
    ),
  },
  {
    header: 'Remarks',
    width: 'w-50',
    align: 'center',
    render: (row) => {
      const showError = showValidation && rowNeedsRemarks(row)
      return (
        <div className="flex flex-col items-start gap-1">
          <input
            type="text"
            value={row.remarks}
            onChange={(e) => onFieldChange(row.id, 'remarks', e.target.value)}
            className={`${receiveInputClass} ${showError ? 'border-warning-600' : ''}`}
          />
          {showError && (
            <p className="text-p2 font-normal text-warning-600">Remark is required</p>
          )}
        </div>
      )
    },
  },
]

const ProductsToReceive = ({
  items,
  onFieldChange,
  loading,
  showValidation,
}: {
  items: ReceiveItem[]
  onFieldChange: (
    id: number,
    field: 'receivedQty' | 'damagedQty' | 'remarks',
    value: string
  ) => void
  loading?: boolean
  showValidation: boolean
}) => {
  const columns = buildReceiveColumns(onFieldChange, showValidation)

  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
      <p className="text-label-l5 font-semibold text-secondary-700">
        Products to be Received
      </p>

      {loading ? (
        <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
          Loading products…
        </p>
      ) : items.length === 0 ? (
        <p className="w-full py-8 text-center text-p3 font-regular text-pneutral-500">
          No products to receive.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary-600">
                {columns.map((col) => (
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
                  {columns.map((col) => (
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

const StockReceiptActions = ({
  onBack,
  onConfirmReceipt,
  submitting,
  disabled,
  canConfirm = true,
}: {
  onBack?: () => void
  onConfirmReceipt?: () => void
  submitting?: boolean
  disabled?: boolean
  canConfirm?: boolean
}) => (
  <div className="flex w-full flex-col items-stretch gap-4 border-t border-pneutral-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      disabled={submitting}
      className={`${actionButtonClass} border-2 border-pneutral-900 text-pneutral-900 disabled:opacity-50`}
    >
      <ArrowLeft className="size-5" strokeWidth={2} />
      Back
    </button>

    {canConfirm && (
      <button
        type="button"
        onClick={onConfirmReceipt}
        disabled={submitting || disabled}
        className={`${actionButtonClass} bg-primary-800 text-pneutral-50 disabled:opacity-50`}
      >
        <CheckCircle2 className="size-5" strokeWidth={2} />
        {submitting ? 'Confirming…' : 'Confirm Receipt'}
      </button>
    )}
  </div>
)

const StockReceipt = ({
  referenceNo = 'PT000021',
  fromLocation = 'Hebbal Medical Store',
  distribution,
  loading,
  onBack,
  onReceived,
}: StockReceiptProps) => {
  const receiveItems = useMemo(
    () => (distribution?.lines ?? []).map(mapLineToReceiveItem),
    [distribution]
  )

  // Confirming a receipt writes stock into the destination, so it answers to
  // CREATE; without it the rows stay readable but nothing can be committed.
  const { canCreate } = useModulePermissions('WAREHOUSE_RECEIPT')
  const [items, setItems] = useState<ReceiveItem[]>(receiveItems)
  const [submitting, setSubmitting] = useState(false)
  // Set once Confirm Receipt is clicked while a damaged qty is missing its
  // remark — tells ProductsToReceive to show the inline errors.
  const [validationAttempted, setValidationAttempted] = useState(false)

  // Re-seed the editable rows whenever a different distribution is loaded.
  useEffect(() => {
    setItems(receiveItems)
  }, [receiveItems])

  const steps = buildTransferSteps(distribution?.currentStatus)
  const statusMeta = distribution?.currentStatus
    ? STATUS_META[distribution.currentStatus]
    : STATUS_META.PRODUCTS_DISPATCHED

  const handleFieldChange = (
    id: number,
    field: 'receivedQty' | 'damagedQty' | 'remarks',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (field === 'remarks') return { ...item, remarks: value }

        // Received and Damaged/Not-Received always sum to Dispatched, so editing
        // one auto-fills the other. The entry is clamped to [0, dispatched] so
        // the pair can never go negative or exceed what was sent.
        const dispatched = item.dispatchedQtyValue
        const entered = Math.max(0, Math.min(dispatched, Number(value) || 0))
        return field === 'receivedQty'
          ? {
              ...item,
              receivedQty: String(entered),
              damagedQty: String(dispatched - entered),
            }
          : {
              ...item,
              damagedQty: String(entered),
              receivedQty: String(dispatched - entered),
            }
      })
    )
  }

  const handleConfirm = async () => {
    if (items.some(rowNeedsRemarks)) {
      setValidationAttempted(true)
      return
    }

    const distributionId = distribution?.warehouseDistributionId
    if (distributionId == null) {
      showToast.error('Missing distribution reference — cannot confirm receipt.')
      return
    }

    const lines: ReceiveWarehouseDistributionLineRequest[] = items.map((item) => {
      const remarks = item.remarks.trim()
      return {
        warehouseDistributionDetailsId: item.id,
        receivedQuantity: Number(item.receivedQty) || 0,
        damagedQuantity: Number(item.damagedQty) || 0,
        remarks: remarks ? remarks : null,
      }
    })

    setSubmitting(true)
    try {
      const updated = await receiveAllocation(distributionId, { lines })
      showToast.success('Stock receipt confirmed.')
      onReceived?.(updated)
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to confirm stock receipt.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h5 font-semibold text-pneutral-900">
            Stock Receipt
          </h1>
          <span className="rounded-lg bg-secondary-100 px-3 py-1 text-label-l4 font-semibold text-secondary-700">
            {distribution?.allocationNo ?? referenceNo}
          </span>
        </div>

        <p className="text-label-l4 font-regular text-pneutral-500">
          Confirm the received quantities from{' '}
          {distribution?.sourceName ?? fromLocation}.
        </p>
      </div>

      <div className="flex w-full flex-col items-stretch gap-4 rounded-2xl border border-pneutral-200 bg-white p-4 lg:flex-row">
        <TransferStatusStepper steps={steps} />
        <CurrentStatusPanel
          statusLabel={statusMeta.label}
          description={statusMeta.description}
        />
      </div>

      <ProductsToReceive
        items={items}
        onFieldChange={handleFieldChange}
        loading={loading}
        showValidation={validationAttempted}
      />

      <StockReceiptActions
        onBack={onBack}
        onConfirmReceipt={handleConfirm}
        submitting={submitting}
        disabled={loading || items.length === 0}
        canConfirm={canCreate}
      />
    </div>
  )
}

export default StockReceipt
