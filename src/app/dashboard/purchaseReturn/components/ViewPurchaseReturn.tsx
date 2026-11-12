'use client'

import { useEffect, useState } from 'react'
import { getPurchaseById } from '@/services/PurchaseServiceNew'
import {
  cancelPurchaseReturn,
  getAllPurchaseReturn,
  getPurchaseReturnById,
} from '@/services/PurchaseReturnService'
import type { PurchaseDetailsData } from '@/types/PurchaseData'
import {
  buildReturnedAmountByPurchase,
  buildReturnedByPurchase,
  returnLineKey,
  type ReturnedQuantities,
} from '@/utils/purchaseReturnTotals'
import PurchaseReturnView from './PurchaseReturnView'
import { buildInvoiceRow, type InvoiceRow } from './AddPurchaseReturn'
import { buildDraftLine, type ReturnDraftLine } from './returnDraft'

interface ViewPurchaseReturnProps {
  /** purchaseReturnId of the return being opened. */
  purchaseReturnId: number
  /** Back to the Purchase Return list. */
  onClose?: () => void
  /** Export to run once the record has loaded (from the list row's icons). */
  autoAction?: 'download' | 'print'
  /** Opens the edit screen — the draft wizard or the revision screen. */
  onEdit?: (isDraft: boolean) => void
}

/**
 * A saved return, shown on the same layout as the wizard's review step but as
 * a record: nothing is editable and nothing is submitted.
 *
 * Unlike the draft-edit flow, the quantities here are taken exactly as saved —
 * this is what was returned, not what could be returned now — so they are not
 * re-validated against current stock.
 */
const ViewPurchaseReturn = ({
  purchaseReturnId,
  onClose,
  autoAction,
  onEdit,
}: ViewPurchaseReturnProps) => {
  const [invoice, setInvoice] = useState<InvoiceRow>()
  const [lines, setLines] = useState<ReturnDraftLine[]>([])
  const [returnNo, setReturnNo] = useState<string>()
  const [isCancelled, setIsCancelled] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    setIsLoading(true)

    const load = async () => {
      const returns = await getAllPurchaseReturn()
      const saved = returns.find((item) => item.purchaseReturnId === purchaseReturnId)
      if (!saved) throw new Error('This purchase return could no longer be found.')

      // The single-return GET carries the supplier account figures for it
      // (supplierCreditAmount etc.); the list may not.
      const [purchase, detail] = await Promise.all([
        getPurchaseById(saved.purchaseId),
        getPurchaseReturnById(purchaseReturnId).catch(() => undefined),
      ])

      // The invoice card wants the supplier account as it stands apart from
      // this return, so this one is left out of the totals behind it.
      const otherReturns = returns.filter(
        (item) => item.purchaseReturnId !== purchaseReturnId
      )
      const consumedByOthers =
        buildReturnedByPurchase(otherReturns).get(saved.purchaseId) ??
        new Map<string, ReturnedQuantities>()
      // Likewise for the payable: the outstanding shown is the position
      // before this return is applied, so its own value is left out.
      const returnedAmountByOthers =
        buildReturnedAmountByPurchase(otherReturns).get(saved.purchaseId) ?? 0

      const detailByKey = new Map<string, PurchaseDetailsData>(
        (purchase.purchaseDetails ?? []).map((detail) => [
          returnLineKey(detail.productId, detail.batchId),
          detail,
        ])
      )

      const savedLines = (saved.purchaseReturnDetails ?? []).flatMap((line) => {
        const detail = detailByKey.get(returnLineKey(line.productId, line.batchId))
        // Without the purchase line there is no rate to show the return at.
        if (!detail) return []

        return [
          buildDraftLine(detail, {
            returnPurchaseQty: Number(line.purchaseReturnQuantity) || 0,
            returnFreeQty: Number(line.freeReturnQuantity) || 0,
            returnReason: line.returnReason ?? '',
          }),
        ]
      })

      const savedStatus = (saved.status ?? '').toUpperCase()
      // Amount Due from Supplier is the purchase return response's own figure
      // (amountDueFromSupplier, else supplierCreditAmount), falling back to the
      // purchase's. Only a draft — which hasn't touched the supplier account —
      // still works it out from the outstanding.
      const credit =
        detail?.amountDueFromSupplier ??
        saved.amountDueFromSupplier ??
        detail?.supplierCreditAmount ??
        saved.supplierCreditAmount ??
        purchase.supplierCreditAmount
      const isDraftReturn = savedStatus === 'DRAFT'

      if (!active) return
      setInvoice({
        ...buildInvoiceRow(purchase, consumedByOthers, returnedAmountByOthers),
        outstanding: Number(
          detail?.purchaseOutstandingAmount ??
            saved.purchaseOutstandingAmount ??
            purchase.outstandingAmount ??
            0
        ),
        supplierCredit:
          !isDraftReturn && credit !== undefined && credit !== null
            ? Number(credit) || 0
            : undefined,
      })
      setLines(savedLines)
      setReturnNo(saved.returnNo)
      setIsDraft(savedStatus === 'DRAFT')
      // Same rule as the list badge: `isCancel` only counts when the
      // response carries no status of its own.
      setIsCancelled(
        savedStatus === 'CANCELLED' ||
          (!['DRAFT', 'CONFIRMED'].includes(savedStatus) && Boolean(saved.isCancel))
      )
      setLoadError('')
    }

    load()
      .catch((err) => {
        if (!active) return
        console.error('Failed to open the purchase return:', err)
        setLoadError(err?.message || 'Failed to open this purchase return.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [purchaseReturnId])

  if (isLoading) {
    return (
      <p className="py-8 text-center text-label-l4 text-pneutral-500">
        Loading purchase return...
      </p>
    )
  }

  if (loadError || !invoice) {
    return (
      <p
        role="alert"
        className="w-full rounded-lg bg-warning-50 p-md text-label-l4 font-medium text-warning-600"
      >
        {loadError || 'This purchase return could not be opened.'}
      </p>
    )
  }

  return (
    <PurchaseReturnView
      invoice={invoice}
      lines={lines}
      readOnly
      returnNo={returnNo}
      onBack={onClose}
      onClose={onClose}
      autoAction={autoAction}
      isCancelled={isCancelled}
      onEdit={onEdit ? () => onEdit(isDraft) : undefined}
      onCancelReturn={async (reason) => {
        await cancelPurchaseReturn(purchaseReturnId, reason)
        // Back to the list, which refetches and shows the Cancelled badge.
        onClose?.()
      }}
    />
  )
}

export default ViewPurchaseReturn
