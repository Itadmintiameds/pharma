'use client'

import { useState } from 'react'
import Image from 'next/image'
import Input from '@/app/components/common/Input'
import StatusBadge from '@/app/components/common/table/StatusBadge'
import {
  AllocationDraft,
  AllocationDraftLine,
  distributionTypeLabel,
  resolveSourceLabel,
} from '@/app/dashboard/warehouseDistribution/allocationDraft'

type Batch = {
  batchNo: string
  expiryDate: string
  available: number
}

type Product = {
  id: string
  name: string
  purchaseUnit: string
  batches: Batch[]
}

const products: Product[] = [
  {
    id: 'dolo-650',
    name: 'Dolo 650 Tablet',
    purchaseUnit: 'Strip',
    batches: [
      { batchNo: 'B24001', expiryDate: 'Jan-2027', available: 120 },
      { batchNo: 'B24008', expiryDate: 'May-2027', available: 80 },
    ],
  },
  
]

const batchKey = (productId: string, batchNo: string) => `${productId}-${batchNo}`

type AddProductsProps = {
  draft: AllocationDraft
  onChange: (patch: Partial<AllocationDraft>) => void
}

const AddProducts = ({ draft, onChange }: AddProductsProps) => {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Quantities typed in the batch rows before "Add" commits them into the
  // shared draft — transient per-row input, not part of the allocation yet.
  const [issueQtyByBatch, setIssueQtyByBatch] = useState<Record<string, string>>({})

  const cart = draft.lines

  const summaryItems = [
    {
      icon: 'summary-calendar',
      iconWidth: 14,
      iconHeight: 14,
      label: 'Allocation No',
      value: draft.allocationNo || '—',
    },
    {
      icon: 'summary-truck',
      iconWidth: 16,
      iconHeight: 12,
      label: 'Distribution Type',
      value: distributionTypeLabel(draft.distributionMode),
    },
    {
      icon: 'summary-cube',
      iconWidth: 14,
      iconHeight: 16,
      label: 'Source',
      value: resolveSourceLabel(draft),
    },
    {
      icon: 'summary-map-pin',
      iconWidth: 13,
      iconHeight: 15,
      label: 'Destination',
      value: draft.destinationLabel || '—',
    },
    {
      icon: 'summary-clipboard',
      iconWidth: 13,
      iconHeight: 16,
      label: 'Reference',
      value: draft.referenceLabel || 'None',
    },
  ]

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  const handleAddToCart = (product: Product, batch: Batch) => {
    const qty = Number(issueQtyByBatch[batchKey(product.id, batch.batchNo)] || 0)
    if (!qty) return

    const line: AllocationDraftLine = {
      id: batchKey(product.id, batch.batchNo),
      productId: product.id,
      productName: product.name,
      batchId: batch.batchNo,
      batchNo: batch.batchNo,
      purchaseUnit: product.purchaseUnit,
      availableQuantity: batch.available,
      issueQuantity: qty,
    }

    onChange({
      lines: [...draft.lines.filter((existing) => existing.id !== line.id), line],
    })
  }

  const handleRemoveFromCart = (id: string) => {
    onChange({ lines: draft.lines.filter((line) => line.id !== id) })
  }

  const totalQuantity = cart.reduce((sum, line) => sum + line.issueQuantity, 0)

  return (
    <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="grid w-full grid-cols-1 gap-4 rounded-lg border border-pneutral-200 bg-white px-6 py-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex flex-1 items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pneutral-100">
              <Image
                src={`/warehouseDistribution/${item.icon}.svg`}
                alt=""
                width={item.iconWidth}
                height={item.iconHeight}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="w-full truncate text-label-l4 font-normal text-pneutral-500">
                {item.label}
              </p>
              <p className="w-full text-label-l4 font-medium text-pneutral-900">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-4 rounded-lg border border-pneutral-200 bg-white p-4">
        <p className="text-label-l5 font-medium text-pneutral-900">Search Product</p>
        <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchInput)}
              placeholder="Search by Product Name / Generic Name / Batch Number"
              leftIcon={
                <Image
                  src="/warehouseDistribution/search-mini.svg"
                  alt=""
                  width={16}
                  height={16}
                />
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery(searchInput)}
            className="flex h-12 w-35.25 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4"
          >
            <Image
              src="/warehouseDistribution/search-outline.svg"
              alt=""
              width={18}
              height={18}
            />
            <span className="text-label-l4 font-medium text-secondary-700">Search</span>
          </button>
        </div>
      </div>

      {filteredProducts.map((product) => (
        <div
          key={product.id}
          className="flex w-full flex-col gap-3 rounded-lg border border-pneutral-200 bg-white p-4"
        >
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-100">
              <Image
                src="/warehouseDistribution/pill-icon.svg"
                alt=""
                width={20}
                height={20}
              />
            </div>
            <p className="text-h6 font-semibold text-pneutral-900">{product.name}</p>
            <StatusBadge status="Active" />
            <div className="flex-1" />
            <button type="button" className="flex items-center gap-2">
              <span className="text-label-l4 font-medium text-primary-800">
                View Product Details
              </span>
              <Image
                src="/warehouseDistribution/exclamation-circle-outline.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>
          </div>

          <p className="text-label-l4 font-normal text-pneutral-500">
            Purchase Unit : {product.purchaseUnit}
          </p>

          <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
            <div className="min-w-165">
              <div className="flex w-full items-center gap-2 bg-pneutral-50 px-3 py-2">
                <p className="w-27 shrink-0 text-p4 font-semibold text-pneutral-500">
                  Batch No.
                </p>
                <p className="w-25 shrink-0 text-p4 font-semibold text-pneutral-500">
                  Expiry Date
                </p>
                <p className="w-32 shrink-0 text-p4 font-semibold text-pneutral-500">
                  Available ({product.purchaseUnit})
                </p>
                <p className="w-35 shrink-0 text-p4 font-semibold text-pneutral-500">
                  Issue Qty ({product.purchaseUnit})
                </p>
                <div className="flex-1" />
                <p className="w-27 shrink-0 text-p4 font-semibold text-pneutral-500">
                  Action
                </p>
              </div>

              {product.batches.map((batch) => (
                <div
                  key={batch.batchNo}
                  className="flex w-full items-center gap-2 border-t border-pneutral-200 px-3 py-2"
                >
                  <p className="w-27 shrink-0 text-p4 font-medium text-pneutral-900">
                    {batch.batchNo}
                  </p>
                  <p className="w-25 shrink-0 text-p4 font-normal text-pneutral-900">
                    {batch.expiryDate}
                  </p>
                  <p className="w-32 shrink-0 text-p4 font-semibold text-success-600">
                    {batch.available}
                  </p>
                  <div className="w-35 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      value={issueQtyByBatch[batchKey(product.id, batch.batchNo)] ?? ''}
                      onChange={(e) =>
                        setIssueQtyByBatch((prev) => ({
                          ...prev,
                          [batchKey(product.id, batch.batchNo)]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product, batch)}
                    className="flex h-12 w-27 shrink-0 items-center justify-center rounded-lg border-2 border-secondary-700 px-4"
                  >
                    <span className="text-label-l4 font-medium text-secondary-700">Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="flex w-full flex-col gap-3 rounded-lg border border-pneutral-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Image
            src="/warehouseDistribution/cart-shopping-outline.svg"
            alt=""
            width={20}
            height={19}
          />
          <p className="text-h6 font-semibold text-pneutral-900">
            Allocation Cart ({cart.length})
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-150">
            <div className="flex w-full items-center gap-2 border-b border-pneutral-200 py-2">
              <p className="w-8 shrink-0 text-p4 font-semibold text-pneutral-500">#</p>
              <p className="w-55 shrink-0 text-p4 font-semibold text-pneutral-500">Product</p>
              <p className="w-27 shrink-0 text-p4 font-semibold text-pneutral-500">Batch No.</p>
              <p className="w-27 shrink-0 text-p4 font-semibold text-pneutral-500">
                Purchase Unit
              </p>
              <p className="w-22 shrink-0 text-p4 font-semibold text-pneutral-500">Issue Qty</p>
              <div className="flex-1" />
              <p className="w-15 shrink-0 text-p4 font-semibold text-pneutral-500">Action</p>
            </div>

            {cart.map((line, index) => (
              <div
                key={line.id}
                className="flex w-full items-center gap-2 border-b border-pneutral-200 py-2"
              >
                <p className="w-8 shrink-0 text-p3 font-normal text-pneutral-900">
                  {index + 1}
                </p>
                <p className="w-55 shrink-0 text-label-l4 font-medium text-pneutral-900">
                  {line.productName}
                </p>
                <p className="w-27 shrink-0 text-p4 font-normal text-pneutral-900">
                  {line.batchNo}
                </p>
                <p className="w-27 shrink-0 text-p4 font-normal text-pneutral-900">
                  {line.purchaseUnit}
                </p>
                <p className="w-22 shrink-0 text-p4 font-semibold text-pneutral-900">
                  {line.issueQuantity}
                </p>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => handleRemoveFromCart(line.id)}
                  aria-label={`Remove ${line.productName} from cart`}
                  className="flex w-15 shrink-0 items-center"
                >
                  <Image
                    src="/warehouseDistribution/trash-outline.svg"
                    alt=""
                    width={18}
                    height={21}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

      <div className="w-full shrink-0 lg:w-75">
        <div className="flex w-full flex-col items-start gap-4 rounded-lg border border-pneutral-200 bg-white p-5">
          <div className="flex w-full items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pneutral-100">
              <Image
                src="/warehouseDistribution/summary-clipboard.svg"
                alt=""
                width={13}
                height={16}
              />
            </div>
            <p className="text-h5 font-semibold text-pneutral-900">Allocation Summary</p>
          </div>

          <div className="h-px w-full bg-pneutral-200" />

          <div className="flex w-full flex-col gap-1">
            <p className="text-label-l4 font-normal text-pneutral-500">Allocation No</p>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {draft.allocationNo || '—'}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1">
            <p className="text-label-l4 font-normal text-pneutral-500">Distribution Type</p>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {distributionTypeLabel(draft.distributionMode)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1">
            <p className="text-label-l4 font-normal text-pneutral-500">Source</p>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {resolveSourceLabel(draft)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1">
            <p className="text-label-l4 font-normal text-pneutral-500">Destination</p>
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {draft.destinationLabel || '—'}
            </p>
          </div>

          <div className="h-px w-full bg-pneutral-200" />

          <div className="flex w-full flex-col gap-1">
            <p className="text-label-l4 font-normal text-pneutral-500">Products</p>
            <p className="text-p3 font-semibold text-primary-800">{cart.length}</p>
          </div>

          <div className="h-px w-full bg-pneutral-200" />

          <div className="flex w-full flex-col gap-1">
            <p className="text-label-l4 font-normal text-pneutral-500">Total Quantity</p>
            <p className="text-label-l5 font-semibold text-primary-800">
              {totalQuantity} Purchase Units
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddProducts
