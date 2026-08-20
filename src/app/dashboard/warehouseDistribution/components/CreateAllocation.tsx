'use client'

import Image from 'next/image'
import { AllocationDraft } from '@/app/dashboard/warehouseDistribution/allocationDraft'

const allocationByMyselfUseCases = [
  'Planned replenishment',
  'Stock balancing',
  'New pharmacy opening',
  'Manual stock movement',
]

type CreateAllocationProps = {
  draft: AllocationDraft
  onChange: (patch: Partial<AllocationDraft>) => void
}

const CreateAllocation = ({ draft, onChange }: CreateAllocationProps) => {
  const selectedMode = draft.allocationMode

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        className={`flex flex-col items-center gap-5 self-stretch rounded-2xl border-2 bg-white p-8 ${
          selectedMode === 'myself'
            ? 'border-secondary-700 shadow-[0px_9px_28px_8px_rgba(0,0,0,0.05),0px_3px_6px_-4px_rgba(0,0,0,0.12),0px_6px_16px_rgba(0,0,0,0.08)]'
            : 'border-pneutral-200'
        }`}
      >
        <div className="flex w-full items-center justify-end">
          <button
            type="button"
            role="radio"
            aria-checked={selectedMode === 'myself'}
            aria-label="Create Allocation By Myself"
            onClick={() => onChange({ allocationMode: 'myself' })}
          >
            <Image
              src={`/warehouseDistribution/${selectedMode === 'myself' ? 'radio-selected' : 'radio-unselected'}.svg`}
              alt=""
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className="relative h-31.5 w-55.25 shrink-0">
          <Image
            src="/warehouseDistribution/warehouse-illustration.svg"
            alt=""
            fill
          />
        </div>

        <div className="flex w-full flex-col items-start gap-2.5 text-center">
          <p className="w-full text-h6 font-semibold text-secondary-700">
            Create Allocation By <br /> Myself
          </p>
          <p className="w-full text-p3 font-normal text-pneutral-800">
            Create a stock allocation without any stock requirement.
          </p>
        </div>

        <div className="h-px w-full border-t border-pneutral-100" />

        <div className="flex w-full flex-col items-start gap-3">
          <p className="w-full text-label-l3 font-semibold text-secondary-700">
            Use Cases
          </p>
          <div className="flex w-full flex-col items-start gap-2.5">
            {allocationByMyselfUseCases.map((useCase) => (
              <div key={useCase} className="flex w-full items-center gap-2.5">
                <Image
                  src="/warehouseDistribution/CheckMiniBlack.svg"
                  alt=""
                  width={16}
                  height={16}
                />
                <p className="flex-1 text-p3 font-normal text-pneutral-800">
                  {useCase}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`flex flex-col items-center gap-5 self-stretch rounded-2xl border-2 bg-white p-8 ${
          selectedMode === 'requirement'
            ? 'border-success-500 shadow-[0px_9px_28px_8px_rgba(0,0,0,0.05),0px_3px_6px_-4px_rgba(0,0,0,0.12),0px_6px_16px_rgba(0,0,0,0.08)]'
            : 'border-pneutral-200'
        }`}
      >
        <div className="flex w-full items-center justify-end">
          <button
            type="button"
            role="radio"
            aria-checked={selectedMode === 'requirement'}
            aria-label="Against Stock Requirement"
            onClick={() => onChange({ allocationMode: 'requirement' })}
          >
            <Image
              src={`/warehouseDistribution/${selectedMode === 'requirement' ? 'radio-selected-success' : 'radio-unselected'}.svg`}
              alt=""
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className="relative h-35 w-43 shrink-0">
          <Image
            src="/warehouseDistribution/stock-requirement-illustration.svg"
            alt=""
            fill
          />
        </div>

        <div className="flex w-full flex-col items-start gap-2.5 text-center">
          <p className="w-full text-h6 font-semibold text-success-800">
            Against Stock Requirement
          </p>
          <p className="w-full text-p3 font-normal text-pneutral-800">
            Allocate stock against an offline stock <br />requirement received from a pharmacy.
          </p>
        </div>

        <div className="h-px w-full border-t border-pneutral-100" />

        <div className="flex w-full flex-col items-center gap-3">
          <p className="w-full text-center text-label-l3 font-medium text-pneutral-900">
            Pending Requirements
          </p>
          <div className="flex w-30 flex-col items-center justify-center rounded-lg bg-success-50 px-8 py-3">
            <p className="text-h3 font-semibold text-success-800">18</p>
          </div>
          <p className="w-full text-center text-label-l3 font-normal text-success-800 underline">
            View Pending Requirements
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-pneutral-200 bg-white p-8 h-124.5">
        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full flex-col items-start gap-4">
            <p className="w-full text-label-l5 font-semibold text-pneutral-900">
              Need Help?
            </p>

            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-3">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-success-50 p-2">
                  <Image
                    src="/warehouseDistribution/home-outline.svg"
                    alt=""
                    width={21}
                    height={20}
                  />
                </div>
                <p className="flex-1 text-label-l4 font-medium text-secondary-700">
                  Create Allocation By <br /> Myself
                </p>
              </div>
              <p className="w-full text-p3 font-normal text-pneutral-800">
                Use this option when the warehouse proactively decides to move stock without any request.
              </p>
            </div>
          </div>

          <div className="h-px w-full border-t border-pneutral-100" />

          <div className="flex w-full flex-col items-start gap-2">
            <div className="flex w-full items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-full bg-success-50 p-2">
                <Image
                  src="/warehouseDistribution/clipboard-list.svg"
                  alt=""
                  width={18}
                  height={21}
                />
              </div>
              <p className="flex-1 text-label-l4 font-medium text-success-800">
                Against Stock Requirement
              </p>
            </div>

            <div className="flex w-full flex-col items-start gap-3">
              <p className="w-full text-p3 font-normal text-pneutral-800">
                Use this option when allocation is against an offline requirement received from a pharmacy.
              </p>
              <div className="flex w-full flex-col items-start gap-1.5 pl-2 text-p3">
                <p className="w-full font-semibold text-pneutral-900">Examples:</p>
                <p className="w-full font-normal text-pneutral-800">
                  • Pharmacy requested stock via phone/WhatsApp
                </p>
                <p className="w-full font-normal text-pneutral-800">
                  • Urgent stock requirement
                </p>
                <p className="w-full font-normal text-pneutral-800">
                  • Low stock at pharmacy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateAllocation
