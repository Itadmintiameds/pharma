import { useMemo } from 'react'
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import Button from '@/app/components/common/Button'
import DataTable from '@/app/components/common/table/DataTable'
import WizardHeader from './WizardHeader'
import type { InvoiceRow } from './AddPurchaseReturn'

interface PurchaseReturnViewProps {
  /** The invoice picked in step 1, carried through for the read-only reference card. */
  invoice?: InvoiceRow
  /** Back to step 2 (Select Return Items) of the wizard. */
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

/** dd-mm-yyyy, matching the format the other invoice dates already use. */
const formatReturnDate = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${date.getFullYear()}`
}

const inr = (value: number) => value.toLocaleString('en-IN', { minimumFractionDigits: 2 })
/** No decimals, for the inline "₹45 GST" style mentions in the confirmation bullets. */
const inrShort = (value: number) => value.toLocaleString('en-IN')

interface ReturnLineItem {
  id: string
  product: string
  batch: string
  expiry: string
  unit: string
  retQty: number
  freeQty: number
  rate: number
  discount: number
  taxable: number
  gst: number
  lineAmount: number
  reason: string
  isTotal?: boolean
}

// The items and quantities picked on step 2 aren't threaded through yet, so
// this is seeded with the same two lines carried by the sample data on that
// step (Crocin / Augmentin) — node 3543:33310 ("Amount Calculation Card").
const RETURN_LINE_ITEMS: ReturnLineItem[] = [
  {
    id: 'crocin',
    product: 'Crocin 500 mg Tablet',
    batch: 'BCH001',
    expiry: 'Dec 2027',
    unit: 'Strip (10)',
    retQty: 10,
    freeQty: 0,
    rate: 50,
    discount: 0,
    taxable: 500,
    gst: 25,
    lineAmount: 525,
    reason: 'Near Expiry',
  },
  {
    id: 'augmentin',
    product: 'Augmentin 625 mg Tablet',
    batch: 'BCH002',
    expiry: 'Mar 2028',
    unit: 'Strip (10)',
    retQty: 5,
    freeQty: 0,
    rate: 80,
    discount: 0,
    taxable: 400,
    gst: 20,
    lineAmount: 420,
    reason: 'Damaged',
  },
]

const returnLineColumns: ColumnDef<ReturnLineItem, any>[] = [
  {
    accessorKey: 'product',
    header: 'PRODUCT',
    cell: ({ row }) => <span className="font-semibold text-pneutral-900">{row.original.product}</span>,
  },
  {
    accessorKey: 'batch',
    header: 'BATCH NO.',
    cell: ({ row }) => (row.original.isTotal ? '' : row.original.batch),
  },
  {
    accessorKey: 'expiry',
    header: 'EXPIRY',
    cell: ({ row }) => (row.original.isTotal ? '' : row.original.expiry),
  },
  {
    accessorKey: 'unit',
    header: 'UNIT',
    cell: ({ row }) => (row.original.isTotal ? '' : row.original.unit),
  },
  {
    accessorKey: 'retQty',
    header: 'RET. QTY',
    cell: ({ row }) => <span className="font-semibold text-pneutral-900">{row.original.retQty}</span>,
  },
  {
    accessorKey: 'freeQty',
    header: 'FREE QTY',
    cell: ({ row }) => (
      <span className={row.original.isTotal ? 'font-semibold text-pneutral-900' : ''}>
        {row.original.freeQty}
      </span>
    ),
  },
  {
    accessorKey: 'rate',
    header: 'RATE (₹)',
    cell: ({ row }) => (row.original.isTotal ? '' : inr(row.original.rate)),
  },
  {
    accessorKey: 'discount',
    header: 'DISCOUNT (₹)',
    cell: ({ row }) => (row.original.isTotal ? '' : inr(row.original.discount)),
  },
  {
    accessorKey: 'taxable',
    header: 'TAXABLE (₹)',
    cell: ({ row }) => (
      <span className="font-semibold text-pneutral-900">{inr(row.original.taxable)}</span>
    ),
  },
  {
    accessorKey: 'gst',
    header: 'GST (₹)',
    cell: ({ row }) => (
      <span className={row.original.isTotal ? 'font-semibold text-pneutral-900' : ''}>
        {inr(row.original.gst)}
      </span>
    ),
  },
  {
    accessorKey: 'lineAmount',
    header: 'LINE AMT (₹)',
    cell: ({ row }) => (
      <span className="font-semibold text-pneutral-900">{inr(row.original.lineAmount)}</span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'REASON',
    cell: ({ row }) =>
      row.original.isTotal ? '' : (
        <span className="text-label-l2 font-regular text-pneutral-500">{row.original.reason}</span>
      ),
  },
]

const SummaryLine = ({
  label,
  value,
  labelBold = false,
  valueClassName = 'text-pneutral-900',
}: {
  label: string
  value: string
  labelBold?: boolean
  valueClassName?: string
}) => (
  <div className="flex w-full items-start justify-between gap-2">
    <p
      className={
        labelBold
          ? 'text-label-l4 font-semibold text-pneutral-900'
          : 'text-p3 font-regular text-pneutral-500'
      }
    >
      {label}
    </p>
    <p className={`shrink-0 text-label-l4 font-semibold ${valueClassName}`}>{value}</p>
  </div>
)

const PurchaseReturnView = ({ invoice, onBack, onClose }: PurchaseReturnViewProps) => {
  const totals = useMemo(() => {
    const retQty = RETURN_LINE_ITEMS.reduce((sum, item) => sum + item.retQty, 0)
    const freeQty = RETURN_LINE_ITEMS.reduce((sum, item) => sum + item.freeQty, 0)
    const discount = RETURN_LINE_ITEMS.reduce((sum, item) => sum + item.discount, 0)
    const taxable = RETURN_LINE_ITEMS.reduce((sum, item) => sum + item.taxable, 0)
    const gst = RETURN_LINE_ITEMS.reduce((sum, item) => sum + item.gst, 0)
    const lineAmount = RETURN_LINE_ITEMS.reduce((sum, item) => sum + item.lineAmount, 0)

    const grossReturnValue = taxable + discount
    const cgst = gst / 2
    const sgst = gst / 2
    const totalPurchaseReturnAmount = lineAmount

    const currentSupplierPayable = invoice?.outstanding ?? 0
    const amountAdjustedAgainstPayable = Math.min(totalPurchaseReturnAmount, currentSupplierPayable)
    const supplierPayableAfterReturn = currentSupplierPayable - amountAdjustedAgainstPayable
    const amountDueFromSupplier = totalPurchaseReturnAmount - amountAdjustedAgainstPayable

    return {
      retQty,
      freeQty,
      taxable,
      gst,
      lineAmount,
      grossReturnValue,
      discount,
      cgst,
      sgst,
      totalPurchaseReturnAmount,
      currentSupplierPayable,
      amountAdjustedAgainstPayable,
      supplierPayableAfterReturn,
      amountDueFromSupplier,
    }
  }, [invoice])

  const tableRows: ReturnLineItem[] = [
    ...RETURN_LINE_ITEMS,
    {
      id: 'total',
      product: 'Total',
      batch: '',
      expiry: '',
      unit: '',
      retQty: totals.retQty,
      freeQty: totals.freeQty,
      rate: 0,
      discount: 0,
      taxable: totals.taxable,
      gst: totals.gst,
      lineAmount: totals.lineAmount,
      reason: '',
      isTotal: true,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Step 3 of the wizard — Select Invoice and Return Items are now
          complete, Review & Confirm is active. */}
      <WizardHeader
        title="Review & Financial Impact"
        subtitle="Verify the return details, tax calculations and supplier account impact before confirming."
        currentStep={3}
      />

      {invoice && (
        <div className="flex w-full flex-col gap-sm rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_4px_#c0c1be33]">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Purchase Invoice Reference (Read Only)
          </p>

          <div className="grid w-full grid-cols-2 gap-md sm:grid-cols-4">
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
            <InvoiceField label="Return Date" value={formatReturnDate(new Date())} />
          </div>
        </div>
      )}

      {/* Figma node 3543:33310 ("Amount Calculation Card"). */}
      <div className="flex w-full flex-col gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_4px_#c0c1be33]">
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Returned Items &amp; Amount Calculation
        </p>
        <DataTable columns={returnLineColumns} data={tableRows} />
      </div>

      <div className="flex w-full flex-col items-start gap-md lg:flex-row">
        <div className="flex w-full flex-1 flex-col gap-sm rounded-lg border border-pneutral-200 bg-white p-md">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Purchase Return Value Summary
          </p>
          <SummaryLine label="Gross Return Value (₹)" value={inr(totals.grossReturnValue)} />
          <SummaryLine label="Applicable Discount (₹)" value={inr(totals.discount)} />
          <SummaryLine label="Taxable Return Value (₹)" value={inr(totals.taxable)} />
          <SummaryLine label="CGST (₹)" value={inr(totals.cgst)} />
          <SummaryLine label="SGST (₹)" value={inr(totals.sgst)} />
          <div className="h-px w-full bg-pneutral-200" />
          <SummaryLine
            label="Total Purchase Return Amount (₹)"
            value={inr(totals.totalPurchaseReturnAmount)}
            labelBold
            valueClassName="text-primary-800"
          />
        </div>

        <div className="flex w-full flex-1 flex-col gap-sm rounded-lg border border-pneutral-200 bg-white p-md">
          <p className="text-label-l5 font-semibold text-pneutral-900">Supplier Financial Impact</p>
          <SummaryLine
            label="Total Purchase Return Amount (₹)"
            value={inr(totals.totalPurchaseReturnAmount)}
          />
          <SummaryLine
            label="Current Supplier Payable (₹)"
            value={inr(totals.currentSupplierPayable)}
          />
          <SummaryLine
            label="Amount Adjusted Against Payable (₹)"
            value={inr(totals.amountAdjustedAgainstPayable)}
          />
          <div className="h-px w-full bg-pneutral-200" />
          <SummaryLine
            label="Supplier Payable After Return (₹)"
            value={inr(totals.supplierPayableAfterReturn)}
            labelBold
            valueClassName="text-success-600"
          />
          <SummaryLine
            label="Amount Due from Supplier (₹)"
            value={inr(totals.amountDueFromSupplier)}
            valueClassName="text-pneutral-500"
          />
        </div>
      </div>

      {/* Figma node 3543:33423 ("On Confirmation Box") + Financial Impact
          Card. Numbers are the same computed totals above, not a copy of
          Figma's sample values. */}
      <div className="flex w-full flex-col items-start gap-md lg:flex-row">
        <div className="flex w-full flex-1 flex-col gap-2 rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_4px_#c0c1be33]">
          <p className="text-label-l5 font-semibold text-pneutral-900">On confirmation:</p>
          <p className="text-p3 font-regular text-pneutral-600">
            • Selected quantities will be deducted from inventory.
          </p>
          <p className="text-p3 font-regular text-pneutral-600">
            • ₹{inrShort(totals.gst)} GST will be reversed.
          </p>
          <p className="text-p3 font-regular text-pneutral-600">
            • ₹{inrShort(totals.totalPurchaseReturnAmount)} Purchase Return will be posted against{' '}
            {invoice?.invoiceNo ?? 'the invoice'}.
          </p>
          <p className="text-p3 font-regular text-pneutral-600">
            • Supplier payable will reduce from ₹{inr(totals.currentSupplierPayable)} to ₹
            {inr(totals.supplierPayableAfterReturn)}.
          </p>
          <p className="text-p3 font-regular text-pneutral-600">
            • The confirmed Purchase Return cannot be directly edited.
          </p>
        </div>

        <div className="flex w-full flex-1 flex-col gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_4px_#c0c1be33]">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Return Financial Impact ({invoice?.paymentType === 'Cash' ? 'Cash Purchase' : 'Credit Purchase'})
          </p>

          <div className="flex w-full items-center gap-sm rounded-sm bg-secondary-50 px-md py-sm">
            <Info size={24} className="shrink-0 text-secondary-700" />
            <p className="text-p3 font-regular text-secondary-700">
              This return will be automatically adjusted against the supplier payable since this
              is a credit purchase.
            </p>
          </div>

          <div className="flex w-full sm:w-75">
            <div className="flex w-full flex-col gap-2 rounded-sm bg-success-50 p-sm text-success-600">
              <p className="text-p3 font-regular">Outstanding After Return</p>
              <p className="text-label-l4 font-semibold">{inr(totals.supplierPayableAfterReturn)}</p>
            </div>
          </div>

          <div className="flex w-full flex-col items-start justify-center gap-sm">
            <p className="text-p3 font-semibold text-pneutral-900">Financial Treatment:</p>
            <span className="inline-flex items-start rounded-sm bg-success-50 px-sm py-1 text-p3 font-semibold text-success-600">
              Adjusted Against Supplier Payable
            </span>
            <p className="text-p3 font-regular text-pneutral-500">
              The return amount will be adjusted against the current outstanding payable to this
              supplier.
            </p>
          </div>
        </div>
      </div>

      {/* Figma node 3543:33430 ("Review Footer Row"). */}
      <div className="flex w-full flex-col items-stretch gap-sm sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12! w-full! min-w-27 gap-2 rounded-lg! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700! sm:w-35.25!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back
        </Button>

        <div className="flex w-full flex-col items-stretch gap-sm sm:w-auto sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="h-12! w-full! min-w-27 gap-2 rounded-lg! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700! sm:w-37.5!"
          >
            Save as Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            className="h-12! w-full! min-w-27 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
          >
            Confirm Purchase Return
            <CheckCircle2 size={20} className="shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PurchaseReturnView
