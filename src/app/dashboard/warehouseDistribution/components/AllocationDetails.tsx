'use client'

import { useState } from 'react'
import Image from 'next/image'
import Input from '@/app/components/common/Input'
import Dropdown, { DropdownOption } from '@/app/components/common/Dropdown'

const destinationPharmacyOptions: DropdownOption[] = [
  { label: 'Rajnagar Medical Store', value: 'rajnagar-medical-store' },
]

const referenceOptions: DropdownOption[] = [
  { label: 'Planned Replenishment', value: 'planned-replenishment' },
  { label: 'Emergency Requirement', value: 'emergency-requirement' },
  { label: 'Festival Stock', value: 'festival-stock' },
  { label: 'Monthly Refill', value: 'monthly-refill' },
]

const FormRow = ({
  label,
  required,
  helper,
  noBorder,
  children,
}: {
  label: string
  required?: boolean
  helper?: string
  noBorder?: boolean
  children: React.ReactNode
}) => (
  <div
    className={`flex w-full flex-col gap-2 py-2 sm:flex-row sm:items-center sm:gap-4 ${
      noBorder ? '' : 'border-b border-pneutral-200'
    }`}
  >
    <p className="text-label-l4 font-medium text-pneutral-900 sm:w-48 sm:shrink-0">
      {label}
      {required && <span className="ml-2 text-warning-500">*</span>}
    </p>
    <div className="flex-1">{children}</div>
    {helper && (
      <p className="text-p2 text-pneutral-500 sm:w-28 sm:shrink-0">{helper}</p>
    )}
  </div>
)

const FlowBadge = ({ label }: { label: string }) => (
  <div className="flex shrink-0 items-center justify-center gap-2 rounded-[20px] border border-secondary-200 bg-secondary-100 p-3">
    <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-200 p-2">
      <Image
        src="/warehouseDistribution/home-outline-purple.svg"
        alt=""
        width={21}
        height={20}
      />
    </div>
    <p className="whitespace-nowrap text-label-l3 font-medium text-secondary-700">
      {label}
    </p>
  </div>
)

const AllocationDetails = () => {
  const [allocationNo, setAllocationNo] = useState('AL000124')
  const [allocationDate, setAllocationDate] = useState('05-Aug-2026')
  const [distributionType, setDistributionType] = useState('Warehouse Distribution')
  const [sourceWarehouse, setSourceWarehouse] = useState('Central Warehouse')
  const [destinationPharmacy, setDestinationPharmacy] = useState<string>(
    'rajnagar-medical-store'
  )
  const [reference, setReference] = useState<string>('')
  const [remarks, setRemarks] = useState('')

  return (
    <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
    <div className="flex w-full flex-1 flex-col gap-1 rounded-xl border border-pneutral-200 bg-white px-4 py-4">
      <p className="w-full text-h6 font-semibold text-primary-800">
        Allocation Information
      </p>

      <FormRow label="Allocation No">
        <Input
          value={allocationNo}
          onChange={(e) => setAllocationNo(e.target.value)}
        />
      </FormRow>

      <FormRow label="Allocation Date">
        <Input
          value={allocationDate}
          onChange={(e) => setAllocationDate(e.target.value)}
          leftIcon={
            <Image
              src="/ProductManagement/Calendar.svg"
              alt=""
              width={20}
              height={20}
            />
          }
        />
      </FormRow>

      <FormRow label="Distribution Type">
        <Input
          value={distributionType}
          onChange={(e) => setDistributionType(e.target.value)}
        />
      </FormRow>

      <FormRow label="Source Warehouse">
        <Input
          value={sourceWarehouse}
          onChange={(e) => setSourceWarehouse(e.target.value)}
        />
      </FormRow>

      <FormRow label="Destination Pharmacy" required>
        <Dropdown
          options={destinationPharmacyOptions}
          value={destinationPharmacy}
          onChange={setDestinationPharmacy}
          placeholder="Select Destination Pharmacy"
        />
      </FormRow>

      <div className="flex w-full flex-col gap-2 border-b border-pneutral-200 py-2">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-label-l4 font-medium text-pneutral-900 sm:w-48 sm:shrink-0">
            Reference
          </p>
          <div className="flex-1">
            <Dropdown
              options={referenceOptions}
              value={reference}
              onChange={setReference}
              placeholder="Select Reference (Optional)"
              clearable
            />
          </div>
        </div>

      </div>

      <FormRow label="Remarks (Optional)" noBorder>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter remarks..."
          className="min-h-25 w-full resize-none rounded-md border border-pneutral-300 bg-white px-3 py-3 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500 transition-all focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300"
        />
      </FormRow>
    </div>

      <div className="w-full shrink-0 lg:w-75">
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-secondary-400 bg-white p-6">
          <div className="relative h-29.5 w-57.5 shrink-0">
            <Image
              src="/warehouseDistribution/warehouse-distribution-illustration.svg"
              alt=""
              fill
            />
          </div>

          <p className="w-full text-center text-h6 font-medium text-secondary-700">
            Warehouse Distribution
          </p>

          <div className="h-px w-full border-t border-pneutral-100" />

          <div className="flex w-full flex-col items-center gap-2">
            <p className="w-full text-center text-p3 font-normal text-pneutral-800">
              Stock will be transferred from
            </p>

            <FlowBadge label="Central Warehouse" />

            <Image
              src="/warehouseDistribution/arrow-down-solid.svg"
              alt=""
              width={17}
              height={19}
            />

            <FlowBadge label="Selected Pharmacy" />
          </div>

          <div className="h-px w-full border-t border-pneutral-100" />

          <div className="flex w-full items-start gap-2">
            <Image
              src="/warehouseDistribution/information-circle-outline.svg"
              alt=""
              width={20}
              height={20}
            />
            <p className="flex-1 text-p3 font-normal text-pneutral-800">
              You will add products and quantities in the next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllocationDetails
