import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Info, Search } from 'lucide-react'
import Button from '@/app/components/common/Button'
import Input from '@/app/components/common/Input'
import WizardHeader from './WizardHeader'
import PurchaseReturnView from './PurchaseReturnView'
import type { InvoiceRow } from './AddPurchaseReturn'

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
  id: string
  name: string
  composition: string
  batch: string
  exp: string
  unit: string
  purchasedQty: number
  freeQty: number
  prevReturnedPurch: number
  prevReturnedFree: number
  availStockPurch: number
  availStockFree: number
  eligibleReturnPurch: number
  eligibleReturnFree: number
}

interface ReturnEntry {
  selected: boolean
  returnPurchaseQty: number
  returnFreeQty: number
  returnReason: string
}

// No products-received API exists yet, so this is seeded with the same
// sample items shown in the Figma mock — node 3543:32829 ("Products
// Received Card").
const PRODUCT_ITEMS: ProductReturnItem[] = [
  {
    id: 'crocin',
    name: 'Crocin 500 mg Tablet',
    composition: 'Paracetamol 500 mg',
    batch: 'BCH001',
    exp: 'Dec 2027',
    unit: 'Strip (10)',
    purchasedQty: 100,
    freeQty: 10,
    prevReturnedPurch: 20,
    prevReturnedFree: 0,
    availStockPurch: 80,
    availStockFree: 10,
    eligibleReturnPurch: 80,
    eligibleReturnFree: 10,
  },
  {
    id: 'augmentin',
    name: 'Augmentin 625 mg Tablet',
    composition: 'Amoxicillin 500 mg + Clavulanic Acid 125 mg',
    batch: 'BCH002',
    exp: 'Mar 2028',
    unit: 'Strip (10)',
    purchasedQty: 50,
    freeQty: 5,
    prevReturnedPurch: 0,
    prevReturnedFree: 0,
    availStockPurch: 50,
    availStockFree: 5,
    eligibleReturnPurch: 50,
    eligibleReturnFree: 5,
  },
  {
    id: 'pantop',
    name: 'Pantop 40 mg Tablet',
    composition: 'Pantoprazole 40 mg',
    batch: 'BCH003',
    exp: 'Jan 2028',
    unit: 'Strip (10)',
    purchasedQty: 200,
    freeQty: 20,
    prevReturnedPurch: 50,
    prevReturnedFree: 0,
    availStockPurch: 0,
    availStockFree: 0,
    eligibleReturnPurch: 0,
    eligibleReturnFree: 0,
  },
  {
    id: 'azithral',
    name: 'Azithral 500 mg Tablet',
    composition: 'Azithromycin 500 mg',
    batch: 'BCH004',
    exp: 'Feb 2028',
    unit: 'Strip (3)',
    purchasedQty: 30,
    freeQty: 3,
    prevReturnedPurch: 30,
    prevReturnedFree: 3,
    availStockPurch: 15,
    availStockFree: 0,
    eligibleReturnPurch: 0,
    eligibleReturnFree: 0,
  },
  {
    id: 'ors',
    name: 'ORS Powder',
    composition: 'Oral Rehydration Salts',
    batch: 'BCH005',
    exp: 'Jun 2028',
    unit: 'Sachet',
    purchasedQty: 100,
    freeQty: 10,
    prevReturnedPurch: 0,
    prevReturnedFree: 0,
    availStockPurch: 100,
    availStockFree: 10,
    eligibleReturnPurch: 100,
    eligibleReturnFree: 10,
  },
]

const INITIAL_ENTRIES: Record<string, ReturnEntry> = {
  crocin: { selected: true, returnPurchaseQty: 10, returnFreeQty: 0, returnReason: 'Near Expiry' },
  augmentin: { selected: true, returnPurchaseQty: 5, returnFreeQty: 0, returnReason: 'Damaged' },
  pantop: { selected: false, returnPurchaseQty: 0, returnFreeQty: 0, returnReason: '' },
  azithral: { selected: false, returnPurchaseQty: 0, returnFreeQty: 0, returnReason: '' },
  ors: { selected: false, returnPurchaseQty: 0, returnFreeQty: 0, returnReason: '' },
}

type ProductStatus = 'Eligible' | 'Not Selected' | 'No Stock' | 'Fully Returned'

/** No API-driven status field exists, so it's derived from the same stock
 * numbers the card itself displays. */
const statusOf = (item: ProductReturnItem, selected: boolean): ProductStatus => {
  const hasEligibleStock = item.eligibleReturnPurch > 0 || item.eligibleReturnFree > 0
  if (!hasEligibleStock) {
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
            {item.composition} · Batch {item.batch} · Exp {item.exp} · Unit: {item.unit}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-sm border px-sm py-0.5 text-label-l3 font-medium ${STATUS_BADGE_STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="grid w-full grid-cols-2 gap-md sm:grid-cols-4">
        <StatBlock label="PURCHASED QTY" value={item.purchasedQty} />
        <StatBlock label="FREE QTY" value={item.freeQty} />
        <StatBlock label="PREV. RETURNED (PURCH.)" value={item.prevReturnedPurch} />
        <StatBlock label="PREV. RETURNED (FREE)" value={item.prevReturnedFree} />
        <StatBlock label="AVAIL. STOCK (PURCH.)" value={item.availStockPurch} />
        <StatBlock label="AVAIL. STOCK (FREE)" value={item.availStockFree} />
        <StatBlock
          label="ELIGIBLE RETURN (PURCH.)"
          value={item.eligibleReturnPurch}
          highlight={item.eligibleReturnPurch > 0}
        />
        <StatBlock
          label="ELIGIBLE RETURN (FREE)"
          value={item.eligibleReturnFree}
          highlight={item.eligibleReturnFree > 0}
        />
      </div>

      <div className="h-px w-full bg-pneutral-200" />

      <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
        <EditField
          label="Return Purchase Qty"
          type="number"
          value={entry.returnPurchaseQty}
          onChange={(value) => onChange({ returnPurchaseQty: Number(value) || 0 })}
          disabled={disabled}
        />
        <EditField
          label="Return Free Qty"
          type="number"
          value={entry.returnFreeQty}
          onChange={(value) => onChange({ returnFreeQty: Number(value) || 0 })}
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
  const [entries, setEntries] = useState<Record<string, ReturnEntry>>(INITIAL_ENTRIES)
  const [step, setStep] = useState<1 | 2>(1)

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return PRODUCT_ITEMS
    return PRODUCT_ITEMS.filter((item) =>
      [item.name, item.composition, item.batch].some((field) => field.toLowerCase().includes(query))
    )
  }, [search])

  const handleReturnAllEligible = () => {
    setEntries((prev) => {
      const next = { ...prev }
      PRODUCT_ITEMS.forEach((item) => {
        const hasEligibleStock = item.eligibleReturnPurch > 0 || item.eligibleReturnFree > 0
        if (!hasEligibleStock) return
        next[item.id] = {
          ...next[item.id],
          selected: true,
          returnPurchaseQty: item.eligibleReturnPurch,
          returnFreeQty: item.eligibleReturnFree,
        }
      })
      return next
    })
  }

  if (step === 2) {
    return <PurchaseReturnView invoice={invoice} onBack={() => setStep(1)} onClose={onClose} />
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
              No products match your search.
            </p>
          ) : (
            filteredItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                entry={entries[item.id]}
                onToggle={() =>
                  setEntries((prev) => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], selected: !prev[item.id].selected },
                  }))
                }
                onChange={(patch) =>
                  setEntries((prev) => ({ ...prev, [item.id]: { ...prev[item.id], ...patch } }))
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
