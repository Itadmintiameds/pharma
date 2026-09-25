'use client'

import Image from 'next/image'
import { ArrowUpRight, Eye } from 'lucide-react'
import Button from '@/app/components/common/Button'

interface SuccessPurchaseReturnPopUpProps {
  isOpen: boolean
  /** The return number the backend assigned, shown as the receipt. */
  returnNo: string
  supplier: string
  invoiceNo: string
  itemsReturned: number
  returnAmount: number
  outstandingAfterReturn: number
  /** True when the credit was netted off a payable, false when the invoice was
   *  already paid and the amount becomes recoverable instead. */
  isAdjustedAgainstPayable: boolean
  amountAdjustedAgainstPayable: number
  onViewPurchaseReturn: () => void
  onGoToPurchaseReturns: () => void
}

const inr = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-1 flex-col gap-1">
    <p className="text-p2 font-regular text-pneutral-500">{label}</p>
    <p className="text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
)

const SuccessPurchaseReturnPopUp = ({
  isOpen,
  returnNo,
  supplier,
  invoiceNo,
  itemsReturned,
  returnAmount,
  outstandingAfterReturn,
  isAdjustedAgainstPayable,
  amountAdjustedAgainstPayable,
  onViewPurchaseReturn,
  onGoToPurchaseReturns,
}: SuccessPurchaseReturnPopUpProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      {/* 520 x 646 as designed, shrinking only when the screen itself is
          smaller. No close affordance — the return is already posted, so the
          dialog is left through one of the two actions at the foot of it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-return-success-title"
        className="flex h-161.5 max-h-[95vh] w-130 max-w-full flex-col gap-md overflow-y-auto rounded-lg bg-white p-md shadow-[0px_8px_32px_0px_#00000040]"
      >
        <div className="flex w-full shrink-0 flex-col items-center gap-sm">
          {/* The asset carries its own round background. */}
          <Image
            src="/PurchaseReturns/Success Check Wrapper.svg"
            alt=""
            width={56}
            height={56}
            className="shrink-0"
          />
          <h2
            id="purchase-return-success-title"
            className="w-full text-center text-h6 leading-6 font-semibold text-pneutral-900"
          >
            Purchase Return Confirmed Successfully
          </h2>
          <p className="w-full text-center text-p3 font-regular text-pneutral-500">
            The purchase return has been posted successfully.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-1 rounded-xsm bg-success-50 py-sm">
          <p className="text-p3 font-semibold text-success-600">Purchase Return No.</p>
          <p className="text-label-l4 font-semibold text-success-600">{returnNo}</p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-sm">
          <div className="flex w-full items-start gap-md">
            <Field label="Supplier" value={supplier} />
            <Field label="Original Invoice" value={invoiceNo} />
          </div>
          <div className="flex w-full items-start gap-md">
            <Field label="Items Returned" value={String(itemsReturned)} />
            <Field label="Return Amount" value={inr(returnAmount)} />
          </div>
          <div className="flex w-full items-start gap-md">
            <Field label="Outstanding After Return" value={inr(outstandingAfterReturn)} />
            {/* Keeps the last value aligned with the column above it. */}
            <div className="flex-1" />
          </div>
        </div>

        <div className="flex w-full shrink-0 items-start gap-sm rounded-xsm bg-secondary-50 p-sm text-secondary-700">
          <Image
            src="/PurchaseReturns/Financial status.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0"
          />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-p3 font-semibold">Financial Status</p>
            <p className="text-p3 font-semibold">
              {isAdjustedAgainstPayable
                ? `Adjusted Against Supplier Payable — ${inr(amountAdjustedAgainstPayable)}`
                : `Supplier Credit / Refund Receivable — ${inr(returnAmount)}`}
            </p>
            <p className="text-p3 font-regular">
              {isAdjustedAgainstPayable
                ? 'The return amount has been adjusted against the supplier outstanding.'
                : 'This invoice was already paid, so the return amount is recoverable from the supplier.'}
            </p>
          </div>
        </div>

        {/* mt-auto pins the buttons to the foot of the fixed-height panel. */}
        <div className="mt-auto flex w-full shrink-0 items-center gap-md">
          <Button
            type="button"
            variant="outline"
            onClick={onViewPurchaseReturn}
            className="h-12! min-h-12 w-full! flex-1 gap-2 rounded-xsm! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700!"
          >
            <Eye size={20} className="shrink-0" />
            View Purchase Return
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onGoToPurchaseReturns}
            className="h-12! min-h-12 w-full! flex-1 gap-2 rounded-xsm! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50!"
          >
            Go to Purchase Returns
            <ArrowUpRight size={20} className="shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SuccessPurchaseReturnPopUp
