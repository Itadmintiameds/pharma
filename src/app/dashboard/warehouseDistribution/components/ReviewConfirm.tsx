import Image from 'next/image'
import {
  AllocationDraft,
  distributionTypeLabel,
  resolveSourceLabel,
} from '@/app/dashboard/warehouseDistribution/allocationDraft'

type DetailRowProps = {
  label: string
  value: string
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="flex w-full items-start gap-2">
    <p className="w-37.5 shrink-0 text-label-l4 font-normal text-pneutral-600">
      {label}
    </p>
    <p className="shrink-0 text-label-l4 font-normal text-pneutral-500">:</p>
    <p className="flex-1 text-label-l4 font-medium text-pneutral-800">{value}</p>
  </div>
)

type ReviewConfirmProps = {
  draft: AllocationDraft
  onEditAllocationDetails?: () => void
  /** Set when the final createAllocation call failed — nothing was persisted. */
  submitError?: string | null
}

const ReviewConfirm = ({ draft, onEditAllocationDetails, submitError }: ReviewConfirmProps) => {
  const distributionType = distributionTypeLabel(draft.distributionMode)
  const source = resolveSourceLabel(draft)
  const totalQuantity = draft.lines.reduce((sum, line) => sum + line.issueQuantity, 0)

  return (
    <div className="flex w-full flex-col gap-4">
      {submitError && (
        <div className="flex w-full items-start gap-3 rounded-lg border border-warning-300 bg-warning-50 p-4">
          <p className="flex-1 text-p4 font-medium text-warning-600">{submitError}</p>
        </div>
      )}

      <div className="flex w-full items-start gap-3 rounded-lg
       bg-secondary-100 p-4">
        <Image
          src="/warehouseDistribution/information-circle-outline.svg"
          alt=""
          width={22}
          height={22}
        />
        <p className="flex-1 text-p4 font-normal text-secondary-700">
          Please review the allocation details, product list and quantities
          before confirming. Once confirmed, stock will be reserved and an
          allocation record will be created.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 rounded-lg border border-pneutral-200 bg-white p-6">
        <div className="flex w-full items-center gap-2.5">

          <p className="text-label-l5 font-semibold text-pneutral-800">
            1. Allocation Details
          </p>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onEditAllocationDetails}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4"
          >
            <Image
              src="/warehouseDistribution/pencil-mini.svg"
              alt=""
              width={16}
              height={16}
            />
            <span className="text-label-l4 font-medium text-secondary-700">
              Edit Details
            </span>
          </button>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex w-full flex-col gap-3">
            <DetailRow label="Allocation No" value={draft.allocationNo || '—'} />
            <DetailRow label="Allocation Date" value={draft.allocationDate || '—'} />
            <DetailRow label="Distribution Type" value={distributionType} />
          </div>
          <div className="flex w-full flex-col gap-3">
            <DetailRow label="Source Warehouse" value={source} />
            <DetailRow label="Destination Pharmacy" value={draft.destinationLabel || '—'} />
            <DetailRow label="Reference" value={draft.referenceLabel || 'None'} />
          </div>
        </div>

        <DetailRow label="Remarks" value={draft.remarks || 'No remarks added.'} />
      </div>

      <div className="flex w-full flex-col gap-4 rounded-lg border border-pneutral-200 bg-white p-6">
        <div className="flex w-full items-center gap-2.5">
          
          <p className="text-label-l5 font-semibold text-pneutral-800">
            2. Products Summary
          </p>
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
          <div className="min-w-165">
            <div className="flex w-full items-center gap-2 bg-pneutral-50 px-3.5 py-2.5">
              <p className="w-6 shrink-0 text-p4 font-semibold text-pneutral-500">#</p>
              <p className="w-32.5 shrink-0 text-p4 font-semibold text-pneutral-500">
                Product
              </p>
              <p className="w-21.25 shrink-0 text-p4 font-semibold text-pneutral-500">
                Batch No.
              </p>
              <p className="w-21.25 shrink-0 text-p4 font-semibold text-pneutral-500">
                Purchase Unit
              </p>
              <div className="flex-1" />
              <p className="w-32.5 shrink-0 text-right text-p4 font-semibold text-pneutral-500">
                Available Qty (Purchase Unit)
              </p>
              <p className="w-32.5 shrink-0 text-right text-p4 font-semibold text-pneutral-500">
                Issue Qty (Purchase Unit)
              </p>
            </div>

            {draft.lines.length === 0 && (
              <div className="flex w-full items-center justify-center px-3.5 py-6 text-p3 text-pneutral-500">
                No products added yet.
              </div>
            )}

            {draft.lines.map((line, index) => (
              <div
                key={line.id}
                className="flex w-full items-center gap-2 border-t border-pneutral-200 px-3.5 py-2.5"
              >
                <p className="w-6 shrink-0 text-p3 font-normal text-pneutral-800">
                  {index + 1}
                </p>
                <p className="w-32.5 shrink-0 text-p3 font-semibold text-pneutral-800">
                  {line.productName}
                </p>
                <p className="w-21.25 shrink-0 text-p3 font-normal text-pneutral-800">
                  {line.batchNo}
                </p>
                <p className="w-21.25 shrink-0 text-p3 font-normal text-pneutral-800">
                  {line.purchaseUnit}
                </p>
                <div className="flex-1" />
                <p className="w-32.5 shrink-0 text-right text-p3 font-medium text-pneutral-800">
                  {line.availableQuantity}
                </p>
                <p className="w-32.5 shrink-0 text-right text-p3 font-semibold text-pneutral-800">
                  {line.issueQuantity}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-success-50 px-4.5 py-4">
            <div className="flex shrink-0 items-center justify-center rounded-full bg-success-200 p-2">
              <Image
                src="/warehouseDistribution/cube-outline.svg"
                alt=""
                width={20}
                height={21}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-label-l4 font-normal text-pneutral-800">
                Total Products
              </p>
              <p className="text-h6 font-semibold text-success-800">
                {draft.lines.length}
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-success-50 px-4.5 py-4">
            <div className="flex shrink-0 items-center justify-center rounded-full bg-success-200 p-2">
              <Image
                src="/warehouseDistribution/document-text-outline.svg"
                alt=""
                width={17}
                height={21}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-label-l4 font-normal text-pneutral-800">
                Total Quantity
              </p>
              <p className="text-h6 font-semibold text-success-800">
                {totalQuantity} Purchase Units
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 rounded-lg border border-pneutral-200 bg-white p-6">
        <div className="flex w-full items-center gap-2.5">

          <p className="text-label-l5 font-semibold text-pneutral-800">
            3. Stock Impact (Warehouse)
          </p>
        </div>

        <div className="flex w-full flex-col gap-6 rounded-lg bg-primary-100 px-6 py-5 sm:flex-row sm:gap-10">
          <div className="flex flex-col gap-1.5">
            <p className="text-label-l4 font-normal text-pneutral-500">
              Total Quantity to be Allocated
            </p>
            <p className="text-h6 font-semibold text-primary-800">
              {totalQuantity} Purchase Units
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-label-l4 font-normal text-pneutral-500">
              Stock will be reserved in
            </p>
            <p className="text-h6 font-semibold text-primary-800">{source}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewConfirm
