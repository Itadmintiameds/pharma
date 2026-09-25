import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Download, Info, Printer } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import Button from '@/app/components/common/Button'
import DataTable from '@/app/components/common/table/DataTable'
import {
  createPurchaseReturn,
  updatePurchaseReturn,
} from '@/services/PurchaseReturnService'
import type { PurchaseReturnStatus } from '@/types/PurchaseReturnData'
import { sumLineAmounts, toMoney } from '@/utils/purchaseReturnAmounts'
import { downloadElementAsPdf, printElementAsPdf } from '@/utils/downloadPdf'
import WizardHeader from './WizardHeader'
import ConfirmPurchaseReturn from './ConfirmPurchaseReturn'
import SuccessPurchaseReturnPopUp from './SuccessPurchaseReturnPopUp'
import { buildCreatePayload, type ReturnDraftLine } from './returnDraft'
import type { InvoiceRow } from './AddPurchaseReturn'

interface PurchaseReturnViewProps {
  /** The invoice picked in step 1, carried through for the read-only reference card. */
  invoice?: InvoiceRow
  /** The lines picked on step 2, already priced — this screen only reads them. */
  lines: ReturnDraftLine[]
  /** Set when reopening a saved DRAFT: the return is updated in place instead
   *  of a second one being created. */
  editingReturnId?: number
  /**
   * Renders the same figures as a record of a return already raised: nothing
   * is submitted, and the footer offers print and PDF instead of save/confirm.
   */
  readOnly?: boolean
  /** Shown in place of the wizard header when `readOnly`. */
  returnNo?: string
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

const toLineItem = (line: ReturnDraftLine): ReturnLineItem => ({
  id: line.id,
  product: line.productName,
  batch: line.batchNumber,
  expiry: line.expiry,
  unit: line.unit,
  retQty: line.returnPurchaseQty,
  freeQty: line.returnFreeQty,
  rate: line.amounts.rate,
  // Purchase-level discount is not apportioned to the line on the purchase
  // response, so a return is credited at the undiscounted line rate.
  discount: 0,
  taxable: line.amounts.grossAmount,
  gst: line.amounts.gstAmount,
  lineAmount: line.amounts.netAmount,
  reason: line.returnReason,
})

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

const PurchaseReturnView = ({
  invoice,
  lines,
  editingReturnId,
  readOnly = false,
  returnNo,
  onBack,
  onClose,
}: PurchaseReturnViewProps) => {
  // Wraps everything above the footer, so the buttons stay out of the print
  // and the PDF.
  const documentRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [submitting, setSubmitting] = useState<PurchaseReturnStatus>()
  const [submitError, setSubmitError] = useState('')
  // Confirming posts the return for real, so it goes through the dialog first;
  // saving a draft is reversible and posts straight away.
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Set from the create response once a CONFIRMED return is posted — holds the
  // return number the backend assigned, and drives the success dialog.
  const [postedReturnNo, setPostedReturnNo] = useState<string>()

  const lineItems = useMemo(() => lines.map(toLineItem), [lines])

  const totals = useMemo(() => {
    const retQty = lineItems.reduce((sum, item) => sum + item.retQty, 0)
    const freeQty = lineItems.reduce((sum, item) => sum + item.freeQty, 0)
    const discount = toMoney(lineItems.reduce((sum, item) => sum + item.discount, 0))

    // The same sum the POST body carries, so the screen and the payload agree.
    const { totalGrossAmount, totalGstAmount, totalNetAmount } = sumLineAmounts(
      lines.map((line) => line.amounts)
    )
    const taxable = totalGrossAmount
    const gst = totalGstAmount
    const lineAmount = totalNetAmount

    const grossReturnValue = toMoney(taxable + discount)
    const cgst = toMoney(gst / 2)
    const sgst = toMoney(gst - cgst)
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
  }, [invoice, lines, lineItems])

  const documentTitle = returnNo ? `Purchase Return ${returnNo}` : 'Purchase Return'

  // Printing goes through the same page-planning pass as the download rather
  // than re-flowing the markup at paper width, so the printout matches the PDF
  // sheet for sheet instead of coming out as a differently laid-out page.
  const handlePrint = async () => {
    if (!documentRef.current || exporting) return

    setExporting(true)
    setSubmitError('')
    try {
      await printElementAsPdf(documentRef.current)
    } catch (err: any) {
      console.error('Failed to print the purchase return:', err)
      setSubmitError(err?.message || 'Could not prepare the printout.')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!documentRef.current || exporting) return

    setExporting(true)
    setSubmitError('')
    try {
      const safeName = documentTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      await downloadElementAsPdf(documentRef.current, `${safeName}.pdf`)
    } catch (err: any) {
      console.error('Failed to export the purchase return:', err)
      setSubmitError(err?.message || 'Could not prepare the PDF.')
    } finally {
      setExporting(false)
    }
  }

  const handleSubmit = async (status: PurchaseReturnStatus) => {
    if (!invoice || lines.length === 0) return

    setSubmitting(status)
    setSubmitError('')
    try {
      const payload = buildCreatePayload(invoice, lines, status)
      // Reopening a draft updates it in place; a fresh return is created.
      const saved = editingReturnId
        ? await updatePurchaseReturn(editingReturnId, payload)
        : await createPurchaseReturn(payload)
      setConfirmOpen(false)

      // A draft is just parked, so it goes straight back to the list; a posted
      // return shows its number and what it did to the supplier account.
      if (status === 'CONFIRMED') {
        setPostedReturnNo(saved?.returnNo || '—')
        return
      }
      onClose?.()
    } catch (err: any) {
      console.error('Failed to create the purchase return:', err)
      setSubmitError(err?.message || 'Failed to create the purchase return.')
      // Drop back to the review screen so the error is read against the
      // figures it applies to.
      setConfirmOpen(false)
    } finally {
      setSubmitting(undefined)
    }
  }

  const isSubmitting = submitting !== undefined
  // Nothing is owed on a paid invoice, so the credit cannot be netted off — it
  // becomes recoverable from the supplier instead.
  const isAdjustedAgainstPayable = totals.amountAdjustedAgainstPayable > 0

  const tableRows: ReturnLineItem[] = [
    ...lineItems,
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
      <div ref={documentRef} className="flex flex-col gap-4">
      {/* A saved return is a record, not a step, so the wizard indicator is
          replaced by a plain heading. */}
      {readOnly ? (
        <div className="flex flex-col gap-1">
          <p className="text-h5 font-semibold text-pneutral-900">
            {returnNo ? `Purchase Return ${returnNo}` : 'Purchase Return'}
          </p>
          <p className="text-label-l4 font-regular text-pneutral-500">
            The return details, tax calculations and supplier account impact as
            recorded.
          </p>
        </div>
      ) : (
        <WizardHeader
          title="Review & Financial Impact"
          subtitle="Verify the return details, tax calculations and supplier account impact before confirming."
          currentStep={3}
        />
      )}

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
          {/* The purchase carries a total discount but does not apportion it to
              the lines, so there is no per-return share to show yet. */}
          {/* <SummaryLine label="Applicable Discount (₹)" value={inr(totals.discount)} /> */}
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
              {isAdjustedAgainstPayable
                ? 'This return will be automatically adjusted against the supplier payable since there is an outstanding balance on this invoice.'
                : 'There is no outstanding balance on this invoice, so the return will be recorded as supplier credit / refund receivable.'}
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
              {isAdjustedAgainstPayable
                ? 'Adjusted Against Supplier Payable'
                : 'Supplier Credit / Refund Receivable'}
            </span>
            <p className="text-p3 font-regular text-pneutral-500">
              {isAdjustedAgainstPayable
                ? 'The return amount will be adjusted against the current outstanding payable to this supplier.'
                : 'This invoice is fully paid, so the return amount becomes recoverable from the supplier.'}
            </p>
          </div>
        </div>
      </div>

      </div>

      {submitError && (
        <p
          role="alert"
          className="w-full rounded-lg bg-warning-50 p-md text-label-l4 font-medium text-warning-600"
        >
          {submitError}
        </p>
      )}

      {/* Every figure here is the one already reviewed above — the dialog
          recomputes nothing. A saved return submits nothing, so neither
          dialog belongs on it. */}
      {!readOnly && (
        <>
      <ConfirmPurchaseReturn
        isOpen={confirmOpen}
        supplier={invoice?.supplier ?? '—'}
        invoiceNo={invoice?.invoiceNo ?? '—'}
        itemCount={lines.length}
        returnPurchaseQty={totals.retQty}
        returnAmount={totals.totalPurchaseReturnAmount}
        unitsDeducted={totals.retQty + totals.freeQty}
        gstReversed={totals.gst}
        amountAdjustedAgainstPayable={totals.amountAdjustedAgainstPayable}
        outstandingBefore={totals.currentSupplierPayable}
        outstandingAfter={totals.supplierPayableAfterReturn}
        isConfirming={submitting === 'CONFIRMED'}
        onGoBack={() => setConfirmOpen(false)}
        onConfirm={() => handleSubmit('CONFIRMED')}
      />

      <SuccessPurchaseReturnPopUp
        isOpen={postedReturnNo !== undefined}
        returnNo={postedReturnNo ?? ''}
        supplier={invoice?.supplier ?? '—'}
        invoiceNo={invoice?.invoiceNo ?? '—'}
        itemsReturned={lines.length}
        returnAmount={totals.totalPurchaseReturnAmount}
        outstandingAfterReturn={totals.supplierPayableAfterReturn}
        isAdjustedAgainstPayable={isAdjustedAgainstPayable}
        amountAdjustedAgainstPayable={totals.amountAdjustedAgainstPayable}
        // Nothing reads a single purchase return yet, so both actions land on
        // the list — the view screen can be pointed at it once it exists.
        onViewPurchaseReturn={() => onClose?.()}
        onGoToPurchaseReturns={() => onClose?.()}
      />
        </>
      )}

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

        {readOnly ? (
          <div className="flex w-full flex-col items-stretch gap-sm sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              disabled={exporting}
              onClick={handlePrint}
              className="h-12! w-full! min-w-27 gap-2 rounded-lg! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700! sm:w-37.5!"
            >
              <Printer size={20} className="shrink-0" />
              Print
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={exporting}
              onClick={handleDownloadPdf}
              className="h-12! w-full! min-w-27 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
            >
              <Download size={20} className="shrink-0" />
              {exporting ? 'Preparing...' : 'Download as PDF'}
            </Button>
          </div>
        ) : (
        <div className="flex w-full flex-col items-stretch gap-sm sm:w-auto sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="h-12! w-full! min-w-27 gap-2 rounded-lg! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700! sm:w-37.5!"
          >
            {submitting === 'DRAFT' ? 'Saving...' : 'Save as Draft'}
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => {
              setSubmitError('')
              setConfirmOpen(true)
            }}
            className="h-12! w-full! min-w-27 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
          >
            {submitting === 'CONFIRMED' ? 'Confirming...' : 'Confirm Purchase Return'}
            <CheckCircle2 size={20} className="shrink-0" />
          </Button>
        </div>
        )}
      </div>
    </div>
  )
}

export default PurchaseReturnView
