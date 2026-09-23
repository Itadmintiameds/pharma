import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Info, Search } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import Button from '@/app/components/common/Button'
import Input from '@/app/components/common/Input'
import Dropdown from '@/app/components/common/Dropdown'
import DataTable from '@/app/components/common/table/DataTable'
import { getAllSupplier } from '@/services/SupplierService'
import type { SupplierData } from '@/types/SupplierData'
import PurchaseReturnItems from './PurchaseReturnItems'
import WizardHeader from './WizardHeader'

interface AddPurchaseReturnProps {
  onClose?: () => void
}

export type PaymentType = 'Cash' | 'Credit'
type ReturnStatus = 'Not Returned' | 'Partially Returned' | 'Fully Returned'

/** One row of the invoice-picker table — Figma node 3543:32579 ("SPI Table Card"). */
export interface InvoiceRow {
  id: string
  invoiceDate: string
  supplier: string
  invoiceNo: string
  grnNo: string
  paymentType: PaymentType
  amount: number
  outstanding: number
  returnStatus: ReturnStatus
  /** "Fully Returned" invoices can't be picked for another return. */
  selectable: boolean
}

// No invoice-picker API exists yet, so the table is seeded with the same
// sample rows shown in the Figma mock until a real service lands.
const SAMPLE_INVOICES: InvoiceRow[] = [
  {
    id: '1',
    invoiceDate: '08-09-2026',
    supplier: 'Medilife Distributors',
    invoiceNo: '1234564',
    grnNo: 'GRN-2026-00001',
    paymentType: 'Cash',
    amount: 525,
    outstanding: 0,
    returnStatus: 'Not Returned',
    selectable: true,
  },
  {
    id: '2',
    invoiceDate: '01-09-2026',
    supplier: 'HealthCare Pharma',
    invoiceNo: 'INV-2234',
    grnNo: 'GRN-2026-00005',
    paymentType: 'Credit',
    amount: 10500,
    outstanding: 6000,
    returnStatus: 'Not Returned',
    selectable: true,
  },
  {
    id: '3',
    invoiceDate: '28-08-2026',
    supplier: 'Sunrise Medicals',
    invoiceNo: 'INV-2211',
    grnNo: 'GRN-2026-00003',
    paymentType: 'Credit',
    amount: 3200,
    outstanding: 1500,
    returnStatus: 'Partially Returned',
    selectable: true,
  },
  {
    id: '4',
    invoiceDate: '25-08-2026',
    supplier: 'Medilife Distributors',
    invoiceNo: '1234001',
    grnNo: 'GRN-2026-00002',
    paymentType: 'Cash',
    amount: 980,
    outstanding: 0,
    returnStatus: 'Partially Returned',
    selectable: true,
  },
  {
    id: '5',
    invoiceDate: '15-08-2026',
    supplier: 'Wellness Pharma',
    invoiceNo: 'INV-2188',
    grnNo: 'GRN-2026-00001',
    paymentType: 'Credit',
    amount: 4250,
    outstanding: 0,
    returnStatus: 'Fully Returned',
    selectable: false,
  },
  {
    id: '6',
    invoiceDate: '10-08-2026',
    supplier: 'LifeCare Distributors',
    invoiceNo: 'INV-2175',
    grnNo: 'GRN-2026-00004',
    paymentType: 'Credit',
    amount: 7800,
    outstanding: 7800,
    returnStatus: 'Not Returned',
    selectable: true,
  },
]

const PAYMENT_TYPE_BADGE_STYLES: Record<PaymentType, string> = {
  Cash: 'bg-success-50 border-success-600 text-success-800',
  // The project's "danger" tokens are this Figma file's yellow scale (see
  // figma-design-to-code-project memory) — matched by hex, not by name.
  Credit: 'bg-danger-50 border-danger-600 text-danger-600',
}

const RETURN_STATUS_BADGE_STYLES: Record<'Partially Returned' | 'Fully Returned', string> = {
  'Partially Returned': 'bg-danger-50 border-danger-600 text-danger-600',
  'Fully Returned': 'bg-success-50 border-success-600 text-success-800',
}

const InlineBadge = ({ label, styles }: { label: string; styles: string }) => (
  <span
    className={`inline-flex items-center justify-center gap-1 rounded-sm border px-sm py-0.5 text-label-l3 font-medium ${styles}`}
  >
    {label}
  </span>
)

const buildInvoiceColumns = (
  selectedId: string,
  onSelect: (id: string) => void
): ColumnDef<InvoiceRow, any>[] => [
  {
    id: 'select',
    header: 'SELECT',
    cell: ({ row }) => {
      const invoice = row.original
      const isSelected = invoice.id === selectedId
      return (
        <div className="flex justify-center">
          <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Select invoice ${invoice.invoiceNo}`}
            disabled={!invoice.selectable}
            onClick={() => invoice.selectable && onSelect(invoice.id)}
            className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
              isSelected ? 'border-secondary-700' : 'border-pneutral-300'
            } ${!invoice.selectable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {isSelected && <span className="size-3 rounded-full bg-secondary-700" />}
          </button>
        </div>
      )
    },
  },
  { accessorKey: 'invoiceDate', header: 'INVOICE DATE' },
  {
    accessorKey: 'supplier',
    header: 'SUPPLIER',
    cell: ({ row }) => <span className="font-semibold">{row.original.supplier}</span>,
  },
  { accessorKey: 'invoiceNo', header: 'INVOICE NO.' },
  { accessorKey: 'grnNo', header: 'GRN NO.' },
  {
    accessorKey: 'paymentType',
    header: 'PAYMENT TYPE',
    cell: ({ row }) => (
      <InlineBadge
        label={row.original.paymentType}
        styles={PAYMENT_TYPE_BADGE_STYLES[row.original.paymentType]}
      />
    ),
  },
  {
    accessorKey: 'amount',
    header: 'INVOICE AMT (₹)',
    cell: ({ row }) => (
      <span className="font-semibold">
        {row.original.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: 'outstanding',
    header: 'OUTSTANDING (₹)',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-semibold">
          {row.original.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        {row.original.outstanding === 0 && (
          <span className="text-p2 text-success-600">(Paid)</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'returnStatus',
    header: 'RETURN STATUS',
    cell: ({ row }) => {
      const { returnStatus, selectable } = row.original
      if (returnStatus === 'Not Returned') {
        return <span className="text-pneutral-500">{returnStatus}</span>
      }
      return (
        <div className="flex flex-col gap-1">
          <InlineBadge label={returnStatus} styles={RETURN_STATUS_BADGE_STYLES[returnStatus]} />
          {!selectable && <span className="text-p2 text-pneutral-500">Cannot select</span>}
        </div>
      )
    },
  },
]

const PAYMENT_TYPE_OPTIONS = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Credit', value: 'Credit' },
]

const RETURN_STATUS_OPTIONS = [
  { label: 'Approved', value: 'Approved' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Rejected', value: 'Rejected' },
]

const AddPurchaseReturn = ({ onClose }: AddPurchaseReturnProps) => {
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState<string | number>('')
  const [paymentType, setPaymentType] = useState<string | number>('')
  const [returnStatus, setReturnStatus] = useState<string | number>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [suppliers, setSuppliers] = useState<SupplierData[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('1')
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    getAllSupplier()
      .then(setSuppliers)
      .catch((err) => console.error('Failed to fetch suppliers for the filter row:', err))
  }, [])

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        label: supplier.supplierName,
        value: supplier.supplierId ?? supplier.supplierName,
      })),
    [suppliers]
  )

  if (step === 2) {
    const selectedInvoice = SAMPLE_INVOICES.find((invoice) => invoice.id === selectedInvoiceId)
    return (
      <PurchaseReturnItems
        invoice={selectedInvoice}
        onBack={() => setStep(1)}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-label-l4 font-medium text-pneutral-700 hover:text-pneutral-900"
        >
          <ArrowLeft size={20} />
          Back to Purchase Returns
        </button>
      </div>

      <WizardHeader
        title="Select Purchase Invoice"
        subtitle="Select the Purchase Invoice against which products are being returned to the supplier."
        currentStep={1}
      />

      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-start">
        <Input
          placeholder="Search by Invoice No., GRN No., Supplier Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />

        <Dropdown
          options={supplierOptions}
          value={supplierId}
          onChange={setSupplierId}
          placeholder="All Suppliers"
          clearable
          className="w-full sm:w-42.5"
        />

        <Dropdown
          options={PAYMENT_TYPE_OPTIONS}
          value={paymentType}
          onChange={setPaymentType}
          placeholder="All Payment Types"
          clearable
          className="w-full sm:w-50"
        />

        <Dropdown
          options={RETURN_STATUS_OPTIONS}
          value={returnStatus}
          onChange={setReturnStatus}
          placeholder="All Return Statuses"
          clearable
          className="w-full sm:w-47.5"
        />
      </div>

      {/* Figma node 3543:32577 ("Input Field"): no left icon, a 22px text
          inset in place of an icon slot. */}
      <div className="flex min-h-12 w-92.5 items-center rounded-lg border border-pneutral-300 bg-base-white p-sm">
        <div className="flex flex-1 items-center gap-sm pl-5.5">
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Invoice date from"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none"
          />
          <span className="shrink-0 text-label-l4 text-pneutral-500">–</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Invoice date to"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-md rounded-lg border border-pneutral-200 bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <DataTable
          columns={buildInvoiceColumns(selectedInvoiceId, setSelectedInvoiceId)}
          data={SAMPLE_INVOICES}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              No purchase invoices found.
            </div>
          }
        />
      </div>

      <div className="flex w-full items-start gap-sm rounded-lg bg-secondary-100 p-md text-secondary-700">
        <Info size={24} className="shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-label-l5 font-semibold">Important:</p>
          <p className="text-p3 font-regular">
            • You can select a purchase invoice to return products received
            against it.
          </p>
          <p className="text-p3 font-regular">
            • For cash/fully paid invoices, the return amount will be
            recorded as supplier credit / refund receivable.
          </p>
          <p className="text-p3 font-regular">
            • For credit invoices, the return amount will be adjusted
            against the supplier payable. If the return amount exceeds the
            outstanding, the excess will be recorded as supplier credit.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-sm">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
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
          Next: Select Return Items
          <ArrowRight size={20} className="shrink-0" />
        </Button>
      </div>
    </div>
  )
}

export default AddPurchaseReturn
