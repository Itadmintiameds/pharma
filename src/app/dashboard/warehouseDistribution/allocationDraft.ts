import {
  AllocationMode,
  CreateWarehouseDistributionRequest,
  WarehouseDistributionData,
} from '@/types/WarehouseDistributionData'
import { formatDate } from '@/utils/formatDate'

// Which side of the transfer stock moves between. Chosen in DistributionType
// (step 2) and read by every later step to render the right labels.
export type DistributionMode = 'warehouse' | 'pharmacy'

// One line added in AddProducts (step 4). Carries both the ids the backend
// needs (productId/batchId) and the display fields ReviewConfirm renders —
// there is no separate product/batch lookup once a line is in the draft.
export interface AllocationDraftLine {
  id: string
  productId: string
  productName: string
  packagingId: string
  batchId: string
  batchNo: string
  purchaseUnit: string
  /** Base unit the issueQuantity is expressed in (e.g. Tablet, Bottle) for the
   *  warehouse-distribution flow, where issueQuantity is stored in base units.
   *  Empty for the pharmacy-transfer flow, which keeps qty in a single unit. */
  smallestUnit?: string
  /** Divisor to convert the base-unit availableQuantity back to purchaseUnit for
   *  display (batch.purchaseUnitContains for warehouse, 1 for pharmacy transfer). */
  unitContains?: number
  availableQuantity: number
  issueQuantity: number
}

// The single object shared across all five wizard steps. Nothing here is
// persisted until Confirm Allocation on step 5 calls createAllocation.
export interface AllocationDraft {
  allocationMode: AllocationMode
  distributionMode: DistributionMode
  allocationNo: string
  allocationDate: string
  sourceId: string
  sourceLabel: string
  destinationId: string
  destinationLabel: string
  reference: string
  referenceLabel: string
  remarks: string
  lines: AllocationDraftLine[]
}

export const createInitialAllocationDraft = (): AllocationDraft => ({
  allocationMode: 'myself',
  distributionMode: 'warehouse',
  // Populated once AllocationDetails fetches the real value from
  // GET /warehouse/distribution/next-allocation-no.
  allocationNo: '',
  // Native <input type="date"> needs an ISO (YYYY-MM-DD) value; defaults to
  // today, since that's when the allocation is actually being created.
  allocationDate: new Date().toISOString().slice(0, 10),
  sourceId: '',
  sourceLabel: '',
  destinationId: '',
  destinationLabel: '',
  reference: '',
  referenceLabel: '',
  remarks: '',
  lines: [],
})

export const distributionTypeLabel = (mode: DistributionMode) =>
  mode === 'warehouse' ? 'Warehouse Distribution' : 'Pharmacy Transfer'

// Generic placeholder for the source side before the real value loads —
// the org's warehouse (AllocationDetails fetches it via
// getWarehousesByOrganizationId) in warehouse mode; there is no
// source-pharmacy picker yet, so pharmacy mode never has more than this.
export const defaultSourceLabel = (mode: DistributionMode) =>
  mode === 'warehouse' ? 'Central Warehouse' : 'Another Pharmacy'

// What every step should actually display: the real warehouse once it has
// loaded, else the generic placeholder for the chosen distribution mode.
export const resolveSourceLabel = (draft: AllocationDraft) =>
  draft.sourceLabel || defaultSourceLabel(draft.distributionMode)

// Reconstructs a review-only draft from an already-created distribution, so
// ReviewConfirm can show a "Ready to Dispatch" allocation pulled from the
// Transfer Explorer list instead of one still being built in the wizard.
export const distributionToAllocationDraft = (
  distribution: WarehouseDistributionData
): AllocationDraft => ({
  allocationMode: distribution.allocationMode ?? 'myself',
  distributionMode: distribution.sourceType === 'WAREHOUSE' ? 'warehouse' : 'pharmacy',
  allocationNo: distribution.allocationNo,
  allocationDate: formatDate(distribution.allocationDate),
  sourceId: distribution.sourceId,
  sourceLabel: distribution.sourceName || distribution.sourceId,
  destinationId: distribution.destinationId,
  destinationLabel: distribution.destinationName || distribution.destinationId,
  reference: distribution.reference ?? '',
  referenceLabel: distribution.reference ?? '',
  remarks: distribution.remarks ?? '',
  lines: (distribution.lines ?? []).map((line) => ({
    id: String(line.warehouseDistributionDetailsId ?? line.productId),
    productId: line.productId,
    productName: line.product?.productName ?? line.productId,
    packagingId: line.packagingId ?? '',
    batchId: line.batchId ?? '',
    batchNo: line.batch?.batchNumber ?? line.batchId ?? '—',
    purchaseUnit: line.packaging?.purchaseUnit ?? '—',
    // The stock-availability snapshot from creation time isn't preserved —
    // the issued quantity is the closest stand-in for a post-creation review.
    availableQuantity: line.issueQuantity,
    issueQuantity: line.issueQuantity,
  })),
})

export const buildCreateAllocationRequest = (
  draft: AllocationDraft
): CreateWarehouseDistributionRequest => ({
  allocationMode: draft.allocationMode,
  distributionType: distributionTypeLabel(draft.distributionMode),
  reference: draft.referenceLabel || undefined,
  remarks: draft.remarks || undefined,
  sourceType: draft.distributionMode === 'warehouse' ? 'WAREHOUSE' : 'PHARMACY',
  sourceId: draft.sourceId,
  destinationType: 'PHARMACY',
  destinationId: draft.destinationId,
  lines: draft.lines.map((line) => ({
    productId: line.productId,
    packagingId: line.packagingId,
    batchId: line.batchId,
    issueQuantity: line.issueQuantity,
  })),
})
