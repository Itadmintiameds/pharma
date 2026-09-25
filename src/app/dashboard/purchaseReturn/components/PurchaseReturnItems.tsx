import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Info, Search } from 'lucide-react'
import Button from '@/app/components/common/Button'
import Input from '@/app/components/common/Input'
import { getPurchaseById } from '@/services/PurchaseServiceNew'
import type { PurchaseData, PurchaseDetailsData } from '@/types/PurchaseData'
import { formatMonthYear } from '@/utils/formatDate'
import { eligibleForLine, returnedForLine, returnLineKey } from '@/utils/purchaseReturnTotals'
import { lineAmounts } from '@/utils/purchaseReturnAmounts'
import WizardHeader from './WizardHeader'
import PurchaseReturnView from './PurchaseReturnView'
import type { InvoiceRow } from './AddPurchaseReturn'
import type { ReturnDraftLine } from './returnDraft'

interface PurchaseReturnItemsProps {
  /** The invoice picked in step 1 — Figma node 3543:32805 ("Selected Invoice Card"). */
  invoice?: InvoiceRow
  /** Back to step 1 (Select Purchase Invoice) of the wizard. */
  onBack?: () => void
  /** Out of the wizard entirely, back to the Purchase Return list. */
  onClose?: () => void
}

const InvoiceField = ({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: string
  valueClassName?: string
}) => (
  <div className="flex flex-1 flex-col gap-1">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className={`text-label-l4 font-semibold text-pneutral-900 ${valueClassName}`}>{value}</p>
  </div>
)

interface ProductReturnItem {
  /** product + batch, matching how a return line is keyed. */
  id: string
  name: string
  batch: string
  exp: string
  unit: string
  purchasedQty: number
  freeQty: number
  prevReturnedPurch: number
  prevReturnedFree: number
  /** Stock on hand, converted from smallest units to the purchase unit the
   *  quantities on this card are counted in. */
  availStock: number
  /** One figure covering paid and free together: what is left unreturned of
   *  both, capped by stock. The two quantity fields share it — their sum is
   *  what gets validated, not each on its own. */
  eligibleReturn: number
  /** The paid/free split behind `eligibleReturn`. Not shown; used to fill the
   *  two fields sensibly when "Return All Eligible Items" is clicked. */
  unreturnedPurch: number
  unreturnedFree: number
  /** The purchase line this card was built from, for pricing the return. */
  detail: PurchaseDetailsData
}

/**
 * Stock is held in smallest units (tablets) while everything on this card is
 * counted in purchase units (blisters), so it is divided by the pack size.
 * Rounded down: half a pack cannot go back to the supplier.
 */
const availableInPurchaseUnits = (detail: PurchaseDetailsData): number => {
  const stock = Number(detail.availableStock) || 0
  const perPack = Number(detail.unitContains) || 0
  return perPack > 0 ? Math.floor(stock / perPack) : stock
}

/** "Blister (12 Tablet)" — the pack as purchased, and what it breaks into. */
const describeUnit = (
  purchaseUnit?: string,
  unitContains?: number,
  smallestUnit?: string
): string => {
  if (!purchaseUnit) return smallestUnit ?? '—'
  if (!unitContains || !smallestUnit) return purchaseUnit
  return `${purchaseUnit} (${unitContains} ${smallestUnit})`
}

/**
 * The products shown on this step are the lines of the purchase picked on step
 * 1, netted off against everything already returned on that purchase and
 * capped by what is still in stock — you cannot send back goods you have
 * already sold.
 */
const buildProductItems = (
  invoice: InvoiceRow | undefined,
  purchase: PurchaseData | undefined
): ProductReturnItem[] => {
  if (!invoice || !purchase) return []

  return (purchase.purchaseDetails ?? []).map((detail) => {
    const returned = returnedForLine(invoice.returnedLines, detail)
    const unreturned = eligibleForLine(detail, returned)
    const availStock = availableInPurchaseUnits(detail)

    return {
      id: returnLineKey(detail.productId, detail.batchId),
      name: detail.productName ?? detail.productId,
      batch: detail.batchNumber ?? detail.batchId,
      exp: formatMonthYear(detail.expiryDate),
      unit: describeUnit(detail.purchaseUnit, detail.unitContains, detail.smallestUnit),
      purchasedQty: Number(detail.purchaseQuantity) || 0,
      freeQty: Number(detail.freeQuantity) || 0,
      prevReturnedPurch: returned.paid,
      prevReturnedFree: returned.free,
      availStock,
      // Stock is held per batch, not split into paid and free, so one pool
      // caps the two together. With nothing returned yet this is simply
      // everything received — purchased plus free.
      eligibleReturn: Math.min(unreturned.paid + unreturned.free, availStock),
      unreturnedPurch: Math.min(unreturned.paid, availStock),
      unreturnedFree: Math.min(
        unreturned.free,
        Math.max(availStock - Math.min(unreturned.paid, availStock), 0)
      ),
      detail,
    }
  })
}

const emptyEntry = (): ReturnEntry => ({
  selected: false,
  returnPurchaseQty: 0,
  returnFreeQty: 0,
  returnReason: '',
})

interface ReturnEntry {
  selected: boolean
  returnPurchaseQty: number
  returnFreeQty: number
  returnReason: string
}

type ProductStatus = 'Eligible' | 'Not Selected' | 'No Stock' | 'Fully Returned'

/** No API-driven status field exists, so it's derived from the same numbers
 * the card itself displays. */
const statusOf = (item: ProductReturnItem, selected: boolean): ProductStatus => {
  if (item.eligibleReturn <= 0) {
    // Nothing can go back either because it already has, or because the stock
    // is gone — two different things to tell the viewer.
    const fullyReturned =
      item.prevReturnedPurch >= item.purchasedQty && item.prevReturnedFree >= item.freeQty
    return fullyReturned ? 'Fully Returned' : 'No Stock'
  }
  return selected ? 'Eligible' : 'Not Selected'
}

const STATUS_BADGE_STYLES: Record<ProductStatus, string> = {
  Eligible: 'bg-success-50 border-success-600 text-success-800',
  'Fully Returned': 'bg-success-50 border-success-600 text-success-800',
  // The project's "danger" tokens are this Figma file's yellow scale, and its
  // "warning" tokens are the red scale — matched by hex, not by name (see
  // figma-design-to-code-project memory).
  'Not Selected': 'bg-danger-50 border-danger-600 text-danger-600',
  'No Stock': 'bg-warning-50 border-warning-600 text-warning-600',
}

const StatBlock = ({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: number
  highlight?: boolean
}) => (
  <div className="flex flex-1 flex-col gap-1">
    <p className="text-label-l2 font-regular uppercase text-pneutral-500">{label}</p>
    <p className={`text-label-l4 font-semibold ${highlight ? 'text-success-600' : 'text-pneutral-900'}`}>
      {value}
    </p>
  </div>
)

const EditField = ({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  disabled: boolean
  placeholder?: string
  type?: 'text' | 'number'
}) => (
  <div className="flex flex-1 flex-col gap-2">
    <p className="text-p3 font-medium text-pneutral-900">{label}</p>
    <input
      type={type}
      min={type === 'number' ? 0 : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="min-h-9 w-full rounded-sm border border-pneutral-300 bg-white px-sm py-xsm text-p2 text-pneutral-900 outline-none disabled:cursor-not-allowed disabled:bg-pneutral-50 disabled:text-pneutral-400"
    />
  </div>
)

const clamp = (value: string, max: number): number =>
  Math.max(Math.min(Number(value) || 0, max), 0)

const ProductCard = ({
  item,
  entry,
  onToggle,
  onChange,
}: {
  item: ProductReturnItem
  entry: ReturnEntry
  onToggle: () => void
  onChange: (patch: Partial<ReturnEntry>) => void
}) => {
  const status = statusOf(item, entry.selected)
  const disabled = status === 'No Stock' || status === 'Fully Returned'
  // Only "No Stock" mutes the whole card — "Fully Returned" is still live
  // information, it just has nothing left to return.
  const muted = status === 'No Stock'

  return (
    <div
      className={`flex w-full flex-col gap-sm rounded-lg bg-white p-md shadow-[4px_4px_12px_0px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_0px_#c0c1be33] ${
        muted ? 'opacity-50' : ''
      }`}
    >
      <div className="flex w-full flex-col items-start gap-sm sm:flex-row sm:items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={entry.selected}
          aria-label={`Select ${item.name}`}
          disabled={disabled}
          onClick={onToggle}
          className={`flex size-6 shrink-0 items-center justify-center rounded-xsm border-2 ${
            entry.selected
              ? 'border-primary-900 bg-primary-900'
              : disabled
                ? 'cursor-not-allowed border-pneutral-200 bg-pneutral-100'
                : 'cursor-pointer border-pneutral-300 bg-white'
          }`}
        >
          {entry.selected && <Check size={16} className="text-base-white" />}
        </button>

        <div className="flex flex-1 flex-col gap-1">
          <p className="text-label-l4 font-semibold text-pneutral-900">{item.name}</p>
          <p className="text-p2 font-regular text-pneutral-500">
            Batch {item.batch} · Exp {item.exp} · Unit: {item.unit}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-sm border px-sm py-0.5 text-label-l3 font-medium ${STATUS_BADGE_STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      {/* Stock is one pool per batch, so the design's separate AVAIL. STOCK
          (PURCH.) / (FREE) tiles collapse into the single figure the API
          reports. */}
      <div className="grid w-full grid-cols-2 gap-md sm:grid-cols-3">
        <StatBlock label="PURCHASED QTY" value={item.purchasedQty} />
        <StatBlock label="FREE QTY" value={item.freeQty} />
        <StatBlock label="PREV. RETURNED (PURCH.)" value={item.prevReturnedPurch} />
        <StatBlock label="PREV. RETURNED (FREE)" value={item.prevReturnedFree} />
        <StatBlock label="AVAIL. STOCK" value={item.availStock} />
        <StatBlock
          label="ELIGIBLE RETURN"
          value={item.eligibleReturn}
          highlight={item.eligibleReturn > 0}
        />
      </div>

      <div className="h-px w-full bg-pneutral-200" />

      <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
        <EditField
          label="Return Purchase Qty"
          type="number"
          value={entry.returnPurchaseQty}
          // The two fields share one allowance, so each clamps to what the
          // other has not already taken rather than letting an over-return be
          // typed in.
          onChange={(value) =>
            onChange({
              returnPurchaseQty: clamp(value, item.eligibleReturn - entry.returnFreeQty),
            })
          }
          disabled={disabled}
        />
        <EditField
          label="Return Free Qty"
          type="number"
          value={entry.returnFreeQty}
          onChange={(value) =>
            onChange({
              returnFreeQty: clamp(value, item.eligibleReturn - entry.returnPurchaseQty),
            })
          }
          disabled={disabled}
        />
        <EditField
          label="Return Reason"
          value={entry.returnReason}
          onChange={(value) => onChange({ returnReason: value })}
          disabled={disabled}
          placeholder="Select reason"
        />
      </div>
    </div>
  )
}

const PurchaseReturnItems = ({ invoice, onBack, onClose }: PurchaseReturnItemsProps) => {
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState<Record<string, ReturnEntry>>({})
  const [step, setStep] = useState<1 | 2>(1)
  // /purchase/allPurchase carries no stock, so the picked purchase is re-read
  // on its own to find out what is still on hand per batch.
  // Left undefined until it arrives: the step-1 copy has no stock on it, and
  // showing cards from it would flash every line as "No Stock".
  const [purchase, setPurchase] = useState<PurchaseData>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const purchaseId = invoice?.purchase.purchaseId

  useEffect(() => {
    if (purchaseId === undefined) {
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)

    getPurchaseById(purchaseId)
      .then((data) => {
        if (!active) return
        setPurchase(data)
        setLoadError('')
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to fetch the purchase for its stock:', err)
        setLoadError(err?.message || 'Failed to fetch stock for this invoice.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [purchaseId])

  const productItems = useMemo(
    () => buildProductItems(invoice, purchase),
    [invoice, purchase]
  )

  // One blank entry per line of the selected invoice, rebuilt if the viewer
  // goes back to step 1 and picks a different one.
  useEffect(() => {
    setEntries(Object.fromEntries(productItems.map((item) => [item.id, emptyEntry()])))
  }, [productItems])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return productItems
    return productItems.filter((item) =>
      [item.name, item.batch].some((field) => field.toLowerCase().includes(query))
    )
  }, [productItems, search])

  const handleReturnAllEligible = () => {
    setEntries((prev) => {
      const next = { ...prev }
      productItems.forEach((item) => {
        if (item.eligibleReturn <= 0) return
        next[item.id] = {
          ...(next[item.id] ?? emptyEntry()),
          selected: true,
          // Split the one allowance back out along the paid/free line it came
          // from, so the amounts priced off the paid quantity stay right.
          returnPurchaseQty: item.unreturnedPurch,
          returnFreeQty: item.unreturnedFree,
        }
      })
      return next
    })
  }

  // Only the lines with something actually being returned reach step 3, priced
  // once here so the review screen and the POST body cannot disagree.
  const draftLines: ReturnDraftLine[] = productItems.flatMap((item) => {
    const entry = entries[item.id]
    if (!entry?.selected) return []
    if (entry.returnPurchaseQty <= 0 && entry.returnFreeQty <= 0) return []

    return [
      {
        id: item.id,
        productId: item.detail.productId,
        batchId: item.detail.batchId,
        productName: item.name,
        batchNumber: item.batch,
        expiry: item.exp,
        unit: item.unit,
        returnPurchaseQty: entry.returnPurchaseQty,
        returnFreeQty: entry.returnFreeQty,
        returnReason: entry.returnReason,
        amounts: lineAmounts(item.detail, entry.returnPurchaseQty),
      },
    ]
  })

  if (step === 2) {
    return (
      <PurchaseReturnView
        invoice={invoice}
        lines={draftLines}
        onBack={() => setStep(1)}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Figma node 3543:32800 ("SPI Header Row"): step 2 of the wizard —
          Select Invoice is now complete, Return Items is active. */}
      <WizardHeader
        title="Select Return Items & Quantities"
        subtitle="Choose the products and batches to return. Enter the return quantities for purchase and free items."
        currentStep={2}
      />

      {invoice && (
        <div className="flex w-full flex-col gap-sm rounded-lg bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Selected Purchase Invoice
          </p>

          <div className="grid w-full grid-cols-2 gap-md sm:grid-cols-3 lg:flex lg:items-start">
            <InvoiceField label="Supplier" value={invoice.supplier} />
            <InvoiceField label="Invoice No." value={invoice.invoiceNo} />
            <InvoiceField label="GRN No." value={invoice.grnNo} />
            <InvoiceField label="Invoice Date" value={invoice.invoiceDate} />
            <InvoiceField label="Payment Type" value={invoice.paymentType} />
            <InvoiceField
              label="Invoice Amount (₹)"
              value={invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            />
            <InvoiceField
              label="Outstanding (₹)"
              value={invoice.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              valueClassName={invoice.outstanding > 0 ? 'text-warning-600' : 'text-success-600'}
            />
          </div>
        </div>
      )}

      {/* Figma node 3543:32829 ("Products Received Card"). */}
      <div className="flex w-full flex-col gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_0px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_0px_#c0c1be33]">
        <div className="flex w-full flex-col items-start gap-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Products Received in this Invoice
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleReturnAllEligible}
            className="h-12! w-full! min-w-27 shrink-0 gap-2 rounded-lg! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700! sm:w-auto!"
          >
            Return All Eligible Items
          </Button>
        </div>

        <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
          <Input
            placeholder="Search product, batch no. or composition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={20} className="text-pneutral-500" />}
            className="rounded-lg border-[1.5px]! border-sneutral-100!"
            containerClassName="flex-1"
          />
          <div className="flex items-start gap-2 text-pneutral-500 sm:flex-1">
            <Info size={15} className="mt-1 shrink-0" />
            <p className="text-p3 font-regular">
              This will select all items with available returnable stock and set the maximum
              eligible quantities.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-md">
          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-label-l4 text-pneutral-500">
              {isLoading
                ? 'Loading products...'
                : loadError ||
                  (productItems.length === 0
                    ? 'This invoice has no products recorded against it.'
                    : 'No products match your search.')}
            </p>
          ) : (
            filteredItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                entry={entries[item.id] ?? emptyEntry()}
                onToggle={() =>
                  setEntries((prev) => {
                    const current = prev[item.id] ?? emptyEntry()
                    return { ...prev, [item.id]: { ...current, selected: !current.selected } }
                  })
                }
                onChange={(patch) =>
                  setEntries((prev) => ({
                    ...prev,
                    [item.id]: { ...(prev[item.id] ?? emptyEntry()), ...patch },
                  }))
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Figma node 3543:33015 ("Return Info Box"). */}
      <div className="flex w-full items-start gap-sm rounded-lg bg-secondary-100 p-md text-secondary-700">
        <Info size={16} className="shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-semibold">You can return purchased and/or free quantities.</p>
          <p className="text-p3 font-regular">Returnable quantity is limited to the lower of:</p>
          <p className="text-p3 font-regular">• Remaining unreturned purchase quantity, and</p>
          <p className="text-p3 font-regular">• Available stock for the batch.</p>
        </div>
      </div>

      {/* Figma node 3543:33022 ("SRI Footer Row"). */}
      <div className="flex w-full items-center justify-between gap-sm">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12! w-35.25! min-w-27 gap-2 rounded-lg! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back
        </Button>

        <Button
          type="button"
          variant="primary"
          disabled={draftLines.length === 0}
          onClick={() => setStep(2)}
          className="h-12! w-auto! min-w-27 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50!"
        >
          Next: Return Details
          <ArrowRight size={20} className="shrink-0" />
        </Button>
      </div>
    </div>
  )
}

export default PurchaseReturnItems
