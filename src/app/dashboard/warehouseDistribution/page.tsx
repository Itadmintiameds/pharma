'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import AllocationWizardLayout from './components/AllocationWizardLayout'
import CreateAllocation from './components/CreateAllocation'
import DistributionType from './components/DistributionType'
import AllocationDetails from './components/AllocationDetails'
import AddProducts from './components/AddProducts'
import ReviewConfirm from './components/ReviewConfirm'
import DistributionSummary from './components/DistributionSummary'
import DispatchProducts from './components/StockMovementDetails'
import {
  AllocationDraft,
  buildCreateAllocationRequest,
  createInitialAllocationDraft,
  resolveSourceLabel,
} from './allocationDraft'
import {
  createAllocation,
  dispatchAllocation,
  getWarehouseDistributionList,
} from '@/services/WarehouseDistributionService'
import { showToast } from '@/app/components/common/Toast'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import {
  DistributionStatus,
  WarehouseDistributionData,
  WarehouseDistributionSummaryData,
} from '@/types/WarehouseDistributionData'

type View = 'list' | 'wizard' | 'summary' | 'dispatch'

const cardShadow =
  'shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)]'

interface StatCardData {
  label: string
  value: string
  caption: string
  iconBg: string
  valueColor: string
  icon: string
  iconWidth: number
  iconHeight: number
}

const statCards: StatCardData[] = [
  {
    label: 'Total Transfers',
    value: '128',
    caption: 'All time',
    iconBg: 'bg-secondary-50',
    valueColor: 'text-secondary-700',
    icon: '/warehouseDistribution/transferExplorer/statCards/total-transfers.svg',
    iconWidth: 14.625,
    iconHeight: 14.625,
  },
  {
    label: 'Completed',
    value: '86',
    caption: '67.19%',
    iconBg: 'bg-success-50',
    valueColor: 'text-success-700',
    icon: '/warehouseDistribution/transferExplorer/statCards/completed.svg',
    iconWidth: 14.625,
    iconHeight: 14.625,
  },
  {
    label: 'Pending',
    value: '23',
    caption: '17.97%',
    iconBg: 'bg-danger-50',
    valueColor: 'text-danger-600',
    icon: '/warehouseDistribution/transferExplorer/statCards/pending.svg',
    iconWidth: 14.4,
    iconHeight: 14.4,
  },
  {
    label: 'Ready to Dispatch',
    value: '23',
    caption: '7.97%',
    iconBg: 'bg-info-50',
    valueColor: 'text-info-600',
    icon: '/warehouseDistribution/transferExplorer/statCards/ready-to-dispatch.svg',
    iconWidth: 15.7229,
    iconHeight: 12.3694,
  },
]

const StatCard = ({ card }: { card: StatCardData }) => (
  <div
    className={`flex h-31 w-full items-center gap-2 rounded-2xl bg-white px-4 py-2 ${cardShadow}`}
  >
    <div
      className={`flex size-10.5 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}
    >
      <Image
        src={card.icon}
        alt=""
        width={card.iconWidth}
        height={card.iconHeight}
      />
    </div>

    <div className="flex min-w-0 flex-col items-start">
      <p className="text-label-l4 font-normal text-pneutral-700">
        {card.label}
      </p>
      <p className={`text-label-l4 font-semibold ${card.valueColor}`}>
        {card.value}
      </p>
      <p className="whitespace-nowrap text-p2 font-normal text-pneutral-500">
        {card.caption}
      </p>
    </div>
  </div>
)

const filterFieldBox =
  'flex min-h-9 max-h-11 w-full items-center gap-2 rounded border border-pneutral-300 bg-white px-3 py-2'

const FilterField = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
    <p className="px-1 text-label-l3 font-medium text-pneutral-600">
      {label}
    </p>
    {children}
  </div>
)

const TextFilterField = ({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) => (
  <FilterField label={label}>
    <div className={filterFieldBox}>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full min-w-0 flex-1 bg-transparent text-p2 text-pneutral-900 outline-none placeholder:text-pneutral-500"
      />
    </div>
  </FilterField>
)

const SelectFilterField = ({
  label,
  defaultLabel,
  options,
}: {
  label: string
  defaultLabel: string
  options: string[]
}) => (
  <FilterField label={label}>
    <div className={filterFieldBox}>
      <select
        defaultValue=""
        className="w-full min-w-0 flex-1 appearance-none bg-transparent text-p2 text-pneutral-900 outline-none"
      >
        <option value="">{defaultLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Image
        src="/warehouseDistribution/transferExplorer/filters/chevron-double.svg"
        alt=""
        width={11}
        height={6.012}
        className="pointer-events-none shrink-0"
      />
    </div>
  </FilterField>
)

const SearchFilterField = ({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) => (
  <FilterField label={label}>
    <div className={filterFieldBox}>
      <Image
        src="/warehouseDistribution/transferExplorer/filters/search-gray.svg"
        alt=""
        width={13}
        height={13}
        className="shrink-0"
      />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full min-w-0 flex-1 bg-transparent text-p2 text-pneutral-900 outline-none placeholder:text-pneutral-500"
      />
    </div>
  </FilterField>
)

interface TransferRow {
  transferNo: string
  dateTime: string
  fromName: string
  fromCode: string
  toName: string
  toCode: string
  products: number
  qty: string
  status: string
}

// Maps the lifecycle enum from WarehouseDistributionSummaryResponse.currentStatus
// to the labels the table's status pill already has styles for.
const distributionStatusLabel: Record<DistributionStatus, string> = {
  DISTRIBUTION_CREATED: 'Ready to Dispatch',
  PRODUCTS_DISPATCHED: 'Pending Receipt',
  STOCK_RECEIVED: 'Completed',
  STOCK_REJECTED: 'Rejected',
}

const toTransferRow = (summary: WarehouseDistributionSummaryData): TransferRow => ({
  transferNo: summary.allocationNo,
  dateTime: formatDateTime(summary.allocationDate),
  fromName: summary.fromStore || summary.fromId,
  fromCode: summary.fromId,
  toName: summary.toStore || summary.toId,
  toCode: summary.toId,
  products: summary.productsCount,
  qty: `${summary.totalIssueQuantity} PU`,
  status: distributionStatusLabel[summary.currentStatus] ?? summary.currentStatus,
})

const transferStatusStyles: Record<string, string> = {
  Completed: 'border-success-600 bg-success-50 text-success-600',
  'Pending Receipt': 'border-secondary-700 bg-secondary-50 text-secondary-700',
  Rejected: 'border-warning-600 bg-warning-50 text-warning-600',
  'Ready to Dispatch': 'border-info-600 bg-info-50 text-info-600',
}

const TransferStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex h-7 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-3xl border px-3 py-0.5 text-label-l3 font-medium ${
      transferStatusStyles[status] ?? ''
    }`}
  >
    {status}
  </span>
)

const colTransferNo = 'w-33 shrink-0'
const colStore = 'min-w-42 flex-1'
const colProducts = 'w-24 shrink-0'
const colQty = 'w-26 shrink-0'
const colStatus = 'w-40 shrink-0'
const colActions = 'w-26 shrink-0'

const TransferTableHeader = () => (
  <div className="flex w-full min-w-233 items-stretch">
    <div
      className={`flex h-18 items-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colTransferNo}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Transfer No.
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        From Store
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        To Store
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colProducts}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Products
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colQty}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Total Qty
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-r border-pneutral-200 bg-secondary-600 px-2 py-4 ${colStatus}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Status
      </p>
    </div>
    <div
      className={`flex h-18 items-center justify-center border-b border-pneutral-200 bg-secondary-600 px-2 py-4 ${colActions}`}
    >
      <p className="whitespace-nowrap text-label-l3 font-semibold text-secondary-50">
        Actions
      </p>
    </div>
  </div>
)

const TransferTableRow = ({ row }: { row: TransferRow }) => (
  <div className="flex w-full min-w-233 items-stretch">
    <div
      className={`flex h-17 flex-col justify-center gap-1 border-b border-r border-pneutral-200 px-2 py-4 ${colTransferNo}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-primary-800">
        {row.transferNo}
      </p>
      <p className="whitespace-nowrap text-p2 font-normal text-pneutral-600">
        {row.dateTime}
      </p>
    </div>

    <div
      className={`flex h-17 flex-col justify-center gap-1 border-b border-r border-pneutral-200 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-pneutral-900">
        {row.fromName}
      </p>
      <p className="whitespace-nowrap text-p3 font-normal text-pneutral-600">
        {row.fromCode}
      </p>
    </div>

    <div
      className={`flex h-17 flex-col justify-center gap-1 border-b border-r border-pneutral-200 px-2 py-4 ${colStore}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-pneutral-900">
        {row.toName}
      </p>
      <p className="whitespace-nowrap text-p3 font-normal text-pneutral-600">
        {row.toCode}
      </p>
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-r border-pneutral-200 px-2 py-4 ${colProducts}`}
    >
      <p className="text-p3 font-normal text-pneutral-900">{row.products}</p>
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-r border-pneutral-200 px-2 py-4 ${colQty}`}
    >
      <p className="whitespace-nowrap text-p3 font-medium text-pneutral-900">
        {row.qty}
      </p>
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-r border-pneutral-200 px-2 py-4 ${colStatus}`}
    >
      <TransferStatusBadge status={row.status} />
    </div>

    <div
      className={`flex h-17 items-center justify-center border-b border-pneutral-200 px-2 py-4 ${colActions}`}
    >
      <button
        type="button"
        className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg bg-primary-800 px-3"
      >
        <Image
          src="/warehouseDistribution/transferExplorer/transferList/eye-outline-white.svg"
          alt=""
          width={10.7656}
          height={8.25}
        />
        <span className="whitespace-nowrap text-label-l2 font-medium text-pneutral-50">
          View
        </span>
      </button>
    </div>
  </div>
)

const OutlineActionButton = ({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-12 w-full min-w-27 items-center justify-center rounded-lg border-2 border-secondary-700 px-4 sm:w-auto"
  >
    <span className="whitespace-nowrap text-label-l4 font-medium text-secondary-700">
      {label}
    </span>
  </button>
)

const page = () => {
  const [view, setView] = useState<View>('list')
  const [draft, setDraft] = useState<AllocationDraft>(createInitialAllocationDraft())
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  // Set once Continue is clicked on step 3 without a destination (and, for a
  // pharmacy transfer, a source) picked — tells AllocationDetails to show
  // its inline field errors instead of staying silent.
  const [allocationDetailsValidationAttempted, setAllocationDetailsValidationAttempted] =
    useState(false)
  // Same idea for step 4 — Continue with an empty allocation cart tells
  // AddProducts to show its inline error instead of staying silent.
  const [addProductsValidationAttempted, setAddProductsValidationAttempted] = useState(false)
  // The server's record of the allocation just confirmed — the summary view
  // renders from this (plus the draft, for labels the response doesn't carry)
  // instead of from placeholder data.
  const [createdAllocation, setCreatedAllocation] = useState<WarehouseDistributionData | null>(
    null
  )
  const [isDispatching, setIsDispatching] = useState(false)

  // Transfer Explorer's table — this warehouse's distributions, incoming and
  // outgoing, fetched fresh whenever the list view is shown (so it reflects a
  // just-created or just-dispatched allocation on the way back to it).
  const [transferList, setTransferList] = useState<WarehouseDistributionSummaryData[]>([])
  const [isLoadingTransferList, setIsLoadingTransferList] = useState(true)

  useEffect(() => {
    if (view !== 'list') return
    let active = true
    const fetchTransferList = async () => {
      setIsLoadingTransferList(true)
      try {
        const data = await getWarehouseDistributionList()
        if (active) setTransferList(data)
      } catch (err) {
        console.error('Failed to fetch the warehouse distribution list', err)
      } finally {
        if (active) setIsLoadingTransferList(false)
      }
    }
    fetchTransferList()
    return () => {
      active = false
    }
  }, [view])

  const updateDraft = (patch: Partial<AllocationDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }))

  const handleStartWizard = () => {
    setDraft(createInitialAllocationDraft())
    setConfirmError(null)
    setAllocationDetailsValidationAttempted(false)
    setAddProductsValidationAttempted(false)
    setCreatedAllocation(null)
    setView('wizard')
  }

  const handleBeforeNextStep = (fromStep: number) => {
    if (fromStep === 3) {
      const isValid =
        Boolean(draft.destinationId) &&
        (draft.distributionMode !== 'pharmacy' || Boolean(draft.sourceId))
      if (!isValid) setAllocationDetailsValidationAttempted(true)
      return isValid
    }
    if (fromStep === 4) {
      const isValid = draft.lines.length > 0
      if (!isValid) setAddProductsValidationAttempted(true)
      return isValid
    }
    return true
  }

  // The wizard's Continue buttons never touch the network — they only move
  // between steps while each step writes into `draft`. This is the one and
  // only call to the backend, made once the user reviews and confirms.
  const handleConfirmAllocation = async () => {
    setIsConfirming(true)
    setConfirmError(null)
    try {
      const created = await createAllocation(buildCreateAllocationRequest(draft))
      setCreatedAllocation(created)
      showToast.success('Allocation created successfully')
      setView('summary')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create allocation.'
      setConfirmError(message)
      showToast.error(message)
    } finally {
      setIsConfirming(false)
    }
  }

  // Source stock leaves once the warehouse actually ships the products —
  // POST /warehouse/distribution/{id}/dispatch moves the allocation from
  // DISTRIBUTION_CREATED to PRODUCTS_DISPATCHED.
  const handleDispatchProducts = async () => {
    if (!createdAllocation?.warehouseDistributionId) return
    setIsDispatching(true)
    try {
      const updated = await dispatchAllocation(createdAllocation.warehouseDistributionId)
      setCreatedAllocation(updated)
      showToast.success('Products dispatched successfully')
      setView('dispatch')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to dispatch products.'
      showToast.error(message)
    } finally {
      setIsDispatching(false)
    }
  }

  if (view === 'wizard') {
    return (
      <AllocationWizardLayout
        onCancel={() => setView('list')}
        onConfirm={handleConfirmAllocation}
        isConfirming={isConfirming}
        onBeforeNext={handleBeforeNextStep}
      >
        {(step, goToStep) => {
          if (step === 1) return <CreateAllocation draft={draft} onChange={updateDraft} />
          if (step === 2) return <DistributionType draft={draft} onChange={updateDraft} />
          if (step === 3)
            return (
              <AllocationDetails
                draft={draft}
                onChange={updateDraft}
                showValidation={allocationDetailsValidationAttempted}
              />
            )
          if (step === 4)
            return (
              <AddProducts
                draft={draft}
                onChange={updateDraft}
                showValidation={addProductsValidationAttempted}
              />
            )
          if (step === 5)
            return (
              <ReviewConfirm
                draft={draft}
                onEditAllocationDetails={() => goToStep(3)}
                submitError={confirmError}
              />
            )

          return (
            <div className="flex w-full items-center justify-center rounded-2xl border border-pneutral-200 bg-white p-8 text-p3 text-pneutral-500">
              Step {step} content coming soon.
            </div>
          )
        }}
      </AllocationWizardLayout>
    )
  }

  if (view === 'summary') {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <DistributionSummary
          distributionNo={
            createdAllocation?.warehouseDistributionId
              ? `WD${String(createdAllocation.warehouseDistributionId).padStart(6, '0')}`
              : undefined
          }
          sourceType="Stock Allocation"
          sourceNo={createdAllocation?.allocationNo || draft.allocationNo || undefined}
          distributionDate={formatDate(createdAllocation?.allocationDate || draft.allocationDate)}
          sourceWarehouse={resolveSourceLabel(draft)}
          destinationPharmacy={draft.destinationLabel || '—'}
          reference={draft.referenceLabel || 'No reference specified'}
          remarks={draft.remarks || 'No remarks added.'}
          products={draft.lines.map((line) => ({
            product: line.productName,
            genericName: '',
            batchNo: line.batchNo,
            purchaseUnit: line.purchaseUnit,
            dispatchQty: line.issueQuantity,
          }))}
          timelineSteps={[
            {
              icon: '/warehouseDistribution/document-text-mini-white.svg',
              label: 'Draft',
              timestamp: formatDate(createdAllocation?.createdAt),
              description: 'Allocation created',
              active: true,
            },
            {
              icon: '/warehouseDistribution/truck-outline-gray.svg',
              label: 'Pending Receipt',
              description: 'Waiting for pharmacy to acknowledge receipt',
            },
            {
              icon: '/warehouseDistribution/check-circle-outline-gray.svg',
              label: 'Received',
              description: 'Stock received and available at pharmacy',
            },
          ]}
          onBack={() => setView('list')}
          onDispatchProducts={handleDispatchProducts}
          isDispatching={isDispatching}
        />
      </div>
    )
  }

  if (view === 'dispatch') {
    return <DispatchProducts />
  }

  return (
    <div className="flex w-full flex-col items-start gap-5">
      <div className="flex w-full flex-col items-start gap-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <h1 className="whitespace-nowrap text-h5 font-semibold text-pneutral-900">
              Transfer Explorer
            </h1>
            <Image
              src="/warehouseDistribution/transferExplorer/info-icon.svg"
              alt=""
              width={18}
              height={18}
            />
          </div>
          <p className="text-label-l4 font-normal text-pneutral-500">
            Search, track and explore all inter-store transfer transactions.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start lg:shrink-0">
          <OutlineActionButton label="Export Excel" />
          <OutlineActionButton
            label="Create Allocation"
            onClick={handleStartWizard}
          />

          <button
            type="button"
            className="flex h-12 w-full min-w-27 items-center justify-center gap-2 rounded-lg bg-pneutral-900 px-4 sm:w-auto"
          >
            <Image
              src="/warehouseDistribution/transferExplorer/printer-mini-white.svg"
              alt=""
              width={16}
              height={18}
            />
            <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
              Print
            </span>
          </button>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} card={card} />
        ))}
      </div>

      <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
        <div className="flex w-full items-center gap-3">
          <Image
            src="/warehouseDistribution/transferExplorer/filters/filter-icon.svg"
            alt=""
            width={14.4}
            height={14.85}
          />
          <p className="flex-1 text-label-l5 font-semibold text-pneutral-800">
            Advanced Filters
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextFilterField label="Transfer No." placeholder="Enter transfer no." />
          <SelectFilterField
            label="Source Store"
            defaultLabel="All Source Stores"
            options={[]}
          />
          <SelectFilterField
            label="Destination Store"
            defaultLabel="All Destination Stores"
            options={[]}
          />
          <SelectFilterField
            label="Status"
            defaultLabel="All Statuses"
            options={[]}
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SearchFilterField label="Product" placeholder="Search product name" />
          <SearchFilterField label="Batch No." placeholder="Search batch no." />

          <FilterField label="Date Range">
            <div className={filterFieldBox}>
              <Image
                src="/warehouseDistribution/transferExplorer/filters/calendar-range.svg"
                alt=""
                width={13}
                height={13}
                className="shrink-0"
              />
              <p className="whitespace-nowrap text-p2 font-normal text-pneutral-900">
                {'01-Aug-2026  →  06-Aug-2026'}
              </p>
            </div>
          </FilterField>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-lg border-2 border-secondary-700 px-4 sm:w-35"
          >
            <span className="whitespace-nowrap text-label-l4 font-medium text-secondary-700">
              Clear Filters
            </span>
          </button>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 sm:w-30"
          >
            <Image
              src="/warehouseDistribution/transferExplorer/filters/search-white.svg"
              alt=""
              width={16.25}
              height={16.25}
            />
            <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
              Search
            </span>
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-pneutral-200 bg-white p-4">
        <p className="text-label-l5 font-semibold text-primary-800">
          Transfer List ({transferList.length})
        </p>

        <div className="w-full overflow-x-auto rounded-sm border border-pneutral-200">
          <TransferTableHeader />
          {isLoadingTransferList ? (
            <div className="flex min-w-233 items-center justify-center py-10 text-p3 text-pneutral-500">
              Loading transfers...
            </div>
          ) : transferList.length === 0 ? (
            <div className="flex min-w-233 items-center justify-center py-10 text-p3 text-pneutral-500">
              No transfers found.
            </div>
          ) : (
            transferList.map((summary) => (
              <TransferTableRow
                key={summary.warehouseDistributionId}
                row={toTransferRow(summary)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default page
