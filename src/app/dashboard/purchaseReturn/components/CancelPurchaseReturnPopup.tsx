'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface CancelPurchaseReturnPopupProps {
  isOpen: boolean
  /** True while the cancel call is in flight. */
  isCancelling?: boolean
  /** Shown under the reason field when the cancel call fails. */
  error?: string
  onClose: () => void
  /** Receives the trimmed reason; only called once one has been entered. */
  onConfirm: (reason: string) => void
}

/** Figma node 4645:3135 ("Cancel Reason Popup"). */
const CancelPurchaseReturnPopup = ({
  isOpen,
  isCancelling = false,
  error,
  onClose,
  onConfirm,
}: CancelPurchaseReturnPopupProps) => {
  // The parent mounts this only while open, so each opening starts empty.
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!isOpen || isCancelling) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isCancelling, onClose])

  if (!isOpen) return null

  const trimmed = reason.trim()
  const canSubmit = trimmed.length > 0 && !isCancelling

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-purchase-return-title"
        className="flex w-138 max-w-full flex-col gap-md rounded-2xl bg-white p-xlg shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]"
      >
        <div className="flex w-full items-start gap-sm">
          <div className="flex flex-1 flex-col gap-1">
            <h2
              id="cancel-purchase-return-title"
              className="text-label-l5 font-semibold text-pneutral-900"
            >
              Cancel Purchase Return
            </h2>
            <p className="text-p3 font-regular text-pneutral-500">
              Please confirm the reason for cancelling this purchase return. The
              selected quantities and financial impact will be discarded.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={isCancelling}
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pneutral-50 disabled:cursor-not-allowed"
          >
            <Image src="/PurchaseReturns/XCircleSolid.svg" alt="" width={24} height={24} />
          </button>
        </div>

        <div className="flex w-full flex-col">
          <label
            htmlFor="cancel-purchase-return-reason"
            className="flex items-center gap-1 px-xxsm text-label-l4 font-medium text-pneutral-900"
          >
            Reason for cancellation
            <span className="text-p3 font-semibold text-warning-500">*</span>
          </label>
          <input
            id="cancel-purchase-return-reason"
            type="text"
            value={reason}
            autoFocus
            disabled={isCancelling}
            placeholder="Enter reason"
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) onConfirm(trimmed)
            }}
            className="min-h-13 w-full rounded-lg border border-pneutral-300 bg-white px-md py-sm text-p4 font-regular text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:border-secondary-700"
          />
          {error && (
            <p role="alert" className="mt-1 px-xxsm text-p3 font-regular text-warning-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex w-full items-center gap-sm rounded-lg bg-secondary-50 px-md py-sm">
          <Image
            src="/PurchaseReturns/InformationCircleOutline.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0"
          />
          <p className="flex-1 text-p3 font-regular text-secondary-700">
            This cancellation will not affect the original invoice or supplier
            payable until the return is confirmed.
          </p>
        </div>

        <div className="flex w-full flex-col items-end">
          {!trimmed && (
            <p className="text-p3 font-regular text-pneutral-500">
              Reason is required to continue.
            </p>
          )}
          <div className="flex w-full items-center justify-between gap-sm">
            <button
              type="button"
              disabled={isCancelling}
              onClick={onClose}
              className="flex h-12 w-31.25 min-w-27 items-center justify-center rounded-lg border-2 border-pneutral-900 px-md text-label-l4 font-medium text-pneutral-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onConfirm(trimmed)}
              className="flex h-12 min-w-27 items-center justify-center gap-xsm rounded-lg border-2 border-warning-500 px-md text-label-l4 font-medium text-warning-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Return'}
              <Image src="/PurchaseReturns/XCircleMicroRed.svg" alt="" width={20} height={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CancelPurchaseReturnPopup
