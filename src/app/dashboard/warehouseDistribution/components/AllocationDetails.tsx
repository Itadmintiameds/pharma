'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Input from '@/app/components/common/Input'
import Dropdown, { DropdownOption } from '@/app/components/common/Dropdown'
import { getCities } from '@/services/UserManagementService'
import { getUserOrganization } from '@/services/SetupBusinessService'
import { getWarehousesByOrganizationId } from '@/services/SetupWarehouseService'
import { getNextAllocationNo } from '@/services/WarehouseDistributionService'
import { OrganizationWarehouse } from '@/types/SetupWarehouseData'
import { useWarehouseStore } from '@/store/warehouseStore'
import { warehouseLabel } from '@/types/UserData'
import {
  AllocationDraft,
  distributionTypeLabel,
  resolveSourceLabel,
} from '@/app/dashboard/warehouseDistribution/allocationDraft'

type PharmacyOption = {
  pharmacyId: string
  pharmacyName: string
  pharmacyCity: string
}

// draft.allocationDate is stored as yyyy-mm-dd; display it as dd-mm-yyyy.
const formatAllocationDateDisplay = (value: string): string => {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : value
}

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
  <div className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-secondary-200 bg-secondary-100 p-3">
    <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-200 p-2">
      <Image
        src="/warehouseDistribution/home-outline-purple.svg"
        alt=""
        width={21}
        height={20}
      />
    </div>
    <p className="min-w-0 flex-1 break-words text-center text-label-l3 font-medium text-secondary-700">
      {label}
    </p>
  </div>
)

type AllocationDetailsProps = {
  draft: AllocationDraft
  onChange: (patch: Partial<AllocationDraft>) => void
  /** True once Continue has been clicked without required fields filled — shows inline errors below. */
  showValidation?: boolean
}

const AllocationDetails = ({ draft, onChange, showValidation }: AllocationDetailsProps) => {
  const distributionType = distributionTypeLabel(draft.distributionMode)
  const sourceWarehouseLabel = resolveSourceLabel(draft)

  const sourcePharmacyError =
    showValidation && draft.distributionMode === 'pharmacy' && !draft.sourceId
      ? 'Please select a source pharmacy'
      : undefined
  const destinationPharmacyError =
    showValidation && !draft.destinationId ? 'Please select a destination pharmacy' : undefined

  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([])
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(true)
  const [warehouses, setWarehouses] = useState<OrganizationWarehouse[]>([])
  // The warehouse(s) the signed-in user is actually mapped to, and the one
  // selected as X-Warehouse-Id on every request (see utils/api.ts). A
  // warehouse manager may only create an allocation sourced from this one —
  // the backend rejects any other warehouse in the org, even one that
  // belongs to the same organization.
  const { selectedWarehouse } = useWarehouseStore()

  useEffect(() => {
    let active = true
    const fetchPharmacies = async () => {
      try {
        const data = await getCities()
        if (active) setPharmacies(data || [])
      } catch (err) {
        console.error('Failed to fetch destination pharmacies', err)
      } finally {
        if (active) setIsLoadingPharmacies(false)
      }
    }
    fetchPharmacies()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (draft.allocationNo) return
    let active = true
    const fetchAllocationNo = async () => {
      try {
        const allocationNo = await getNextAllocationNo()
        if (active && allocationNo) onChange({ allocationNo })
      } catch (err) {
        console.error('Failed to fetch the next allocation number', err)
      }
    }
    fetchAllocationNo()
    return () => {
      active = false
    }
  }, [draft.allocationNo])

  useEffect(() => {
    let active = true
    const fetchSourceWarehouse = async () => {
      try {
        const org = await getUserOrganization()
        if (!org?.organizationId) return
        const data = await getWarehousesByOrganizationId(org.organizationId)
        if (active) setWarehouses(data)
      } catch (err) {
        console.error('Failed to fetch the source warehouse', err)
      }
    }
    fetchSourceWarehouse()
    return () => {
      active = false
    }
  }, [])

  // No source-warehouse picker exists, so this fills the draft in as soon as
  // it loads. Prefer the warehouse the user is mapped to and currently acting
  // as (matches what the backend will validate the request against); only a
  // non-warehouse-manager admin on a centrally managed org — who isn't mapped
  // to any warehouse and isn't subject to that check — falls back to the
  // org's warehouse list, where a centrally managed org has exactly one.
  useEffect(() => {
    if (draft.distributionMode !== 'warehouse') return
    if (draft.sourceId) return
    if (selectedWarehouse) {
      onChange({
        sourceId: selectedWarehouse.warehouseId,
        sourceLabel: warehouseLabel(selectedWarehouse),
      })
      return
    }
    if (warehouses.length === 0) return
    const warehouse = warehouses[0]
    onChange({ sourceId: warehouse.warehouseId ?? '', sourceLabel: warehouse.warehouseName })
  }, [draft.distributionMode, draft.sourceId, warehouses, selectedWarehouse])

  // Same pharmacy list backs both fields — a pharmacy transfer's source and
  // destination are both picked from the org's pharmacies.
  const pharmacyOptions: DropdownOption[] = pharmacies.map((pharmacy) => ({
    label: `${pharmacy.pharmacyName} - ${pharmacy.pharmacyCity}`,
    value: pharmacy.pharmacyId,
  }))

  // A pharmacy transfer can't move stock to itself, so once a source pharmacy
  // is picked it drops out of the destination choices.
  const destinationPharmacyOptions =
    draft.distributionMode === 'pharmacy'
      ? pharmacyOptions.filter((option) => option.value !== draft.sourceId)
      : pharmacyOptions

  return (
    <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
    <div className="flex w-full flex-1 flex-col gap-1 rounded-xl border border-pneutral-200 bg-white px-4 py-4">
      <p className="w-full text-h6 font-semibold text-primary-800">
        Allocation Information
      </p>

      <FormRow label="Allocation No">
        <Input value={draft.allocationNo} readOnly />
      </FormRow>

      <FormRow label="Allocation Date">
        <Input value={formatAllocationDateDisplay(draft.allocationDate)} readOnly />
      </FormRow>

      <FormRow label="Distribution Type">
        <Input value={distributionType} readOnly />
      </FormRow>

      {draft.distributionMode === 'warehouse' ? (
        <FormRow label="Source Warehouse">
          <Input value={sourceWarehouseLabel} readOnly />
        </FormRow>
      ) : (
        <FormRow label="Source Pharmacy" required>
          <Dropdown
            options={pharmacyOptions}
            value={draft.sourceId}
            onChange={(value) => {
              const label = pharmacyOptions.find((option) => option.value === value)?.label ?? ''
              // The pharmacy just picked as source can no longer stand as the
              // destination too, so drop a now-invalid selection there.
              const clearsDestination = draft.destinationId === value
              onChange({
                sourceId: String(value),
                sourceLabel: label,
                ...(clearsDestination ? { destinationId: '', destinationLabel: '' } : {}),
              })
            }}
            placeholder="Select Source Pharmacy"
            isLoading={isLoadingPharmacies}
            error={sourcePharmacyError}
          />
        </FormRow>
      )}

      <FormRow label="Destination Pharmacy" required>
        <Dropdown
          options={destinationPharmacyOptions}
          value={draft.destinationId}
          onChange={(value) => {
            const label =
              destinationPharmacyOptions.find((option) => option.value === value)?.label ?? ''
            onChange({ destinationId: String(value), destinationLabel: label })
          }}
          placeholder="Select Destination Pharmacy"
          isLoading={isLoadingPharmacies}
          error={destinationPharmacyError}
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
              value={draft.reference}
              onChange={(value) => {
                const label =
                  referenceOptions.find((option) => option.value === value)?.label ?? ''
                onChange({ reference: String(value), referenceLabel: label })
              }}
              placeholder="Select Reference (Optional)"
              clearable
            />
          </div>
        </div>

      </div>

      <FormRow label="Remarks (Optional)" noBorder>
        <textarea
          value={draft.remarks}
          onChange={(e) => onChange({ remarks: e.target.value })}
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
            {distributionType}
          </p>

          <div className="h-px w-full border-t border-pneutral-100" />

          <div className="flex w-full flex-col items-center gap-2">
            <p className="w-full text-center text-p3 font-normal text-pneutral-800">
              Stock will be transferred from
            </p>

            <FlowBadge label={sourceWarehouseLabel} />

            <Image
              src="/warehouseDistribution/arrow-down-solid.svg"
              alt=""
              width={17}
              height={19}
            />

            <FlowBadge label={draft.destinationLabel || 'Selected Pharmacy'} />
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
