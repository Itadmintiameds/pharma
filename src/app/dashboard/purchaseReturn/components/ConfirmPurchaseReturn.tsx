'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Button from '@/app/components/common/Button'

interface ConfirmPurchaseReturnProps {
  isOpen: boolean
  supplier: string
  invoiceNo: string
  itemCount: number
  returnPurchaseQty: number
  returnAmount: number
  /** Purchase units leaving stock — the paid and free quantities together. */
  unitsDeducted: number
  gstReversed: number
  amountAdjustedAgainstPayable: number
  outstandingBefore: number
  outstandingAfter: number
  /** True while the create call is in flight. */
  isConfirming?: boolean
  onGoBack: () => void
  onConfirm: () => void
}

const inr = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-1 flex-col gap-1">
    <p className="text-p2 font-regular text-pneutral-600">{label}</p>
    <p className="text-p3 font-semibold text-pneutral-900">{value}</p>
  </div>
)

/** One of the four consequences listed under "This will result in...". */
const ChangeRow = ({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) => (
  <div className="flex w-full items-start gap-sm">
    {/* The asset carries its own rounded background, so it needs no wrapper. */}
    <Image src={`/PurchaseReturns/${icon}`} alt="" width={40} height={40} className="shrink-0" />
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-p3 font-semibold text-pneutral-900">{title}</p>
      <p className="text-p3 font-regular text-pneutral-600">{description}</p>
    </div>
  </div>
)

const ConfirmPurchaseReturn = ({
  isOpen,
  supplier,
  invoiceNo,
  itemCount,
  returnPurchaseQty,
  returnAmount,
  unitsDeducted,
  gstReversed,
  amountAdjustedAgainstPayable,
  outstandingBefore,
  outstandingAfter,
  isConfirming = false,
  onGoBack,
  onConfirm,
}: ConfirmPurchaseReturnProps) => {
  // Escape backs out of the dialog, but not once the return is being posted —
  // the call cannot be recalled at that point.
  useEffect(() => {
    if (!isOpen || isConfirming) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onGoBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isConfirming, onGoBack])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      {/* 460 x 736 as designed, shrinking only when the screen itself is
          smaller — the same way the other popups adapt. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-purchase-return-title"
        className="flex h-184 max-h-[95vh] w-115 max-w-full flex-col gap-sm overflow-y-auto rounded-lg bg-white p-md shadow-[0px_8px_32px_0px_#00000040]"
      >
        <div className="flex w-full shrink-0 items-start gap-sm">
          <Image
            src="/PurchaseReturns/Warning Icon Wrapper.svg"
            alt=""
            width={48}
            height={48}
            className="shrink-0"
          />
          <div className="flex flex-1 flex-col gap-1">
            <h2
              id="confirm-purchase-return-title"
              className="text-h6 leading-6 font-semibold text-pneutral-900"
            >
              Confirm Purchase Return?
            </h2>
            <p className="text-p3 font-regular text-pneutral-600">
              Please review the details and confirm that you want to post this
              Purchase Return.
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-xsm rounded-xsm bg-pneutral-50 p-xsm">
          <div className="flex w-full items-start gap-md">
            <Field label="Supplier" value={supplier} />
            <Field label="Invoice No." value={invoiceNo} />
          </div>
          <div className="flex w-full items-start gap-md">
            <Field label="Items" value={String(itemCount)} />
            <Field label="Return Purchase Qty" value={String(returnPurchaseQty)} />
            <Field label="Return Amount" value={inr(returnAmount)} />
          </div>
        </div>

        <p className="shrink-0 text-p3 font-semibold text-pneutral-900">
          This will result in the following changes:
        </p>

        <div className="flex w-full shrink-0 flex-col gap-sm">
          <ChangeRow
            icon="inventory.svg"
            title="Inventory"
            description={`${unitsDeducted} purchase units will be deducted from the respective batches.`}
          />
          <ChangeRow
            icon="gst.svg"
            title="GST"
            description={`${inr(gstReversed)} will be reversed.`}
          />
          <ChangeRow
            icon="supplierpayable.svg"
            title="Supplier Payable"
            description={`${inr(amountAdjustedAgainstPayable)} will be adjusted against the outstanding payable.`}
          />
          <ChangeRow
            icon="Outstanding.svg"
            title="Outstanding"
            description={`${inr(outstandingBefore)} → ${inr(outstandingAfter)}`}
          />
        </div>

        <div className="flex w-full shrink-0 items-start gap-xsm rounded-xsm bg-warning-50 p-xsm">
          <Image
            src="/PurchaseReturns/Warning Icon Wrapper.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0"
          />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-p3 font-semibold text-pneutral-900">
              Once confirmed, this Purchase Return cannot be directly edited.
            </p>
            <p className="text-p2 font-regular text-warning-600">
              Any correction must be handled through an authorized
              cancellation/reversal.
            </p>
          </div>
        </div>

        {/* mt-auto pins the buttons to the foot of the fixed-height panel. */}
        <div className="mt-auto flex w-full shrink-0 items-center gap-md">
          <Button
            type="button"
            variant="outline"
            disabled={isConfirming}
            onClick={onGoBack}
            className="h-12! min-h-12 w-full! flex-1 rounded-xsm! border-2! border-secondary-700! bg-transparent! px-4 text-label-l4! font-medium! text-secondary-700!"
          >
            Go Back
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isConfirming}
            onClick={onConfirm}
            className="h-12! min-h-12 w-full! flex-1 rounded-xsm! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50!"
          >
            {isConfirming ? 'Confirming...' : 'Yes, Confirm Return'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmPurchaseReturn
