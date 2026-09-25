/**
 * What step 2 hands to step 3: the lines the viewer picked, already priced.
 * Step 3 only reads these — it re-derives nothing — so the amounts reviewed on
 * screen are byte-for-byte the ones POSTed to /purchase-return/create.
 */

import { usePharmacyStore } from '@/store/pharmacyStore'
import { useWarehouseStore } from '@/store/warehouseStore'
import type { PurchaseDetailsData } from '@/types/PurchaseData'
import type {
  PurchaseReturnCreatePayload,
  PurchaseReturnStatus,
} from '@/types/PurchaseReturnData'
import { sumLineAmounts, type ReturnLineAmounts } from '@/utils/purchaseReturnAmounts'
import type { InvoiceRow } from './AddPurchaseReturn'

export interface ReturnDraftLine {
  /** product + batch, as `purchaseReturnTotals.returnLineKey` writes it. */
  id: string
  productId: string
  batchId: string
  /** Display-only, carried so step 3 needs no second lookup. */
  productName: string
  batchNumber: string
  expiry: string
  unit: string
  returnPurchaseQty: number
  returnFreeQty: number
  returnReason: string
  amounts: ReturnLineAmounts
}

/** The purchase line a draft line was priced from, for anything step 3 needs
 *  beyond the fields above. */
export type DetailById = Record<string, PurchaseDetailsData>

/**
 * Exactly one location id travels on the body, matching the header the request
 * is sent with (see the request interceptor in utils/api): a user acting as a
 * warehouse — or one that has only a warehouse — sends warehouseId, everyone
 * else sends pharmacyId.
 */
const currentScope = (): Pick<PurchaseReturnCreatePayload, 'pharmacyId' | 'warehouseId'> => {
  const { actingAsWarehouse, selectedWarehouse } = useWarehouseStore.getState()
  const pharmacy = usePharmacyStore.getState().selectedPharmacy

  if (actingAsWarehouse && selectedWarehouse?.warehouseId) {
    return { pharmacyId: null, warehouseId: selectedWarehouse.warehouseId }
  }
  if (pharmacy?.pharmacyId) {
    return { pharmacyId: pharmacy.pharmacyId, warehouseId: null }
  }
  return { pharmacyId: null, warehouseId: selectedWarehouse?.warehouseId ?? null }
}

export const buildCreatePayload = (
  invoice: InvoiceRow,
  lines: ReturnDraftLine[],
  status: PurchaseReturnStatus
): PurchaseReturnCreatePayload => {
  const totals = sumLineAmounts(lines.map((line) => line.amounts))

  return {
    purchaseId: Number(invoice.purchase.purchaseId),
    ...currentScope(),
    status,
    cancelReason: null,
    editReason: null,
    ...totals,
    purchaseReturnDetails: lines.map((line) => ({
      productId: line.productId,
      batchId: line.batchId,
      purchaseReturnQuantity: line.returnPurchaseQty,
      // The API takes the free quantity as a string, unlike the paid one.
      freeReturnQuantity: String(line.returnFreeQty),
      returnReason: line.returnReason,
      grossAmount: line.amounts.grossAmount,
      gstAmount: line.amounts.gstAmount,
      netAmount: line.amounts.netAmount,
    })),
  }
}
