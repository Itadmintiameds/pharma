'use client'

import { useEffect, useState } from 'react'
import { getPurchaseById } from '@/services/PurchaseServiceNew'
import { getAllPurchaseReturn } from '@/services/PurchaseReturnService'
import type { PurchaseDetailsData } from '@/types/PurchaseData'
import {
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
}

/**
 * A saved return, shown on the same layout as the wizard's review step but as
 * a record: nothing is editable and nothing is submitted.
 *
 * Unlike the draft-edit flow, the quantities here are taken exactly as saved —
 * this is what was returned, not what could be returned now — so they are not
 * re-validated against current stock.
 */
const ViewPurchaseReturn = ({ purchaseReturnId, onClose }: ViewPurchaseReturnProps) => {
  const [invoice, setInvoice] = useState<InvoiceRow>()
  const [lines, setLines] = useState<ReturnDraftLine[]>([])
  const [returnNo, setReturnNo] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    setIsLoading(true)

    const load = async () => {
      const returns = await getAllPurchaseReturn()
      const saved = returns.find((item) => item.purchaseReturnId === purchaseReturnId)
      if (!saved) throw new Error('This purchase return could no longer be found.')

      const purchase = await getPurchaseById(saved.purchaseId)

      // The invoice card wants the supplier account as it stands apart from
      // this return, so this one is left out of the totals behind it.
      const consumedByOthers =
        buildReturnedByPurchase(
          returns.filter((item) => item.purchaseReturnId !== purchaseReturnId)
        ).get(saved.purchaseId) ?? new Map<string, ReturnedQuantities>()

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

      if (!active) return
      setInvoice(buildInvoiceRow(purchase, consumedByOthers))
      setLines(savedLines)
      setReturnNo(saved.returnNo)
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
    />
  )
}

export default ViewPurchaseReturn
