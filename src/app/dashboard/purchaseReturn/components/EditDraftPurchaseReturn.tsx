'use client'

import { useEffect, useState } from 'react'
import { getPurchaseById } from '@/services/PurchaseServiceNew'
import { getAllPurchaseReturn } from '@/services/PurchaseReturnService'
import {
  buildReturnedByPurchase,
  returnLineKey,
  type ReturnedQuantities,
} from '@/utils/purchaseReturnTotals'
import PurchaseReturnItems, { type ReturnEntry } from './PurchaseReturnItems'
import { buildInvoiceRow, type InvoiceRow } from './AddPurchaseReturn'

interface EditDraftPurchaseReturnProps {
  /** purchaseReturnId of the DRAFT being reopened. */
  purchaseReturnId: number
  /** Back to the Purchase Return list. */
  onClose?: () => void
}

/**
 * Reopens a saved DRAFT on step 2 of the wizard, with its lines ticked and its
 * quantities filled in, so they can be changed before the return is saved
 * again or posted.
 *
 * The draft's own numbers are not trusted on the way back in: stock may have
 * been sold and other returns raised against the same purchase since it was
 * parked. Everything returned by *other* returns is re-totalled here and
 * handed to step 2, which re-reads the purchase for current stock and clamps
 * the seeded quantities to whatever is still returnable.
 */
const EditDraftPurchaseReturn = ({
  purchaseReturnId,
  onClose,
}: EditDraftPurchaseReturnProps) => {
  const [invoice, setInvoice] = useState<InvoiceRow>()
  const [entries, setEntries] = useState<Record<string, ReturnEntry>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    setIsLoading(true)

    const load = async () => {
      const returns = await getAllPurchaseReturn()
      const draft = returns.find((item) => item.purchaseReturnId === purchaseReturnId)
      if (!draft) throw new Error('This purchase return could no longer be found.')

      const purchase = await getPurchaseById(draft.purchaseId)

      // Everything returned on this purchase *except* this draft — its own
      // quantities are what is being edited, so they must not count against
      // themselves.
      const consumedByOthers =
        buildReturnedByPurchase(
          returns.filter((item) => item.purchaseReturnId !== purchaseReturnId)
        ).get(draft.purchaseId) ?? new Map<string, ReturnedQuantities>()

      const seeded: Record<string, ReturnEntry> = {}
      ;(draft.purchaseReturnDetails ?? []).forEach((line) => {
        seeded[returnLineKey(line.productId, line.batchId)] = {
          selected: true,
          returnPurchaseQty: Number(line.purchaseReturnQuantity) || 0,
          returnFreeQty: Number(line.freeReturnQuantity) || 0,
          returnReason: line.returnReason ?? '',
        }
      })

      if (!active) return
      setInvoice(buildInvoiceRow(purchase, consumedByOthers))
      setEntries(seeded)
      setLoadError('')
    }

    load()
      .catch((err) => {
        if (!active) return
        console.error('Failed to reopen the draft purchase return:', err)
        setLoadError(err?.message || 'Failed to reopen this purchase return.')
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
    <PurchaseReturnItems
      invoice={invoice}
      initialEntries={entries}
      editingReturnId={purchaseReturnId}
      // The invoice is fixed on an existing return, so there is no step 1 to
      // go back to — Back leaves the return instead.
      onBack={onClose}
      onClose={onClose}
    />
  )
}

export default EditDraftPurchaseReturn
