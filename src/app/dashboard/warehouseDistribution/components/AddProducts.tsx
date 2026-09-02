'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import Input from '@/app/components/common/Input'
import StatusBadge from '@/app/components/common/table/StatusBadge'
import { ProductService } from '@/services/ProductService'
import {
  AllocationDraft,
  AllocationDraftLine,
  distributionTypeLabel,
  resolveSourceLabel,
} from '@/app/dashboard/warehouseDistribution/allocationDraft'

type Batch = {
  batchId: string
  batchNo: string
  expiryDate: string
  available: number
  packagingId: string
}

type Product = {
  id: string
  name: string
  purchaseUnit: string
  batches: Batch[]
}

// Shape of one row returned by GET /product/batches (ProductService.getAllBatches).
type BatchApiRow = {
  batchId?: string
  batchNumber?: string
  expiryDate?: string
  productId?: string
  productName?: string
  purchaseUnit?: string
  packagingId?: string
  totalStock?: number
}

// A row of the batch list is a batch *within a packaging*, so the packaging has to
// be part of its identity: the same batch can come back once per packaging, and
// keying on the batch alone made those rows share a React key, an issue-qty box
// and a cart line.
const batchKey = (productId: string, batchId: string, packagingId: string) =>
  `${productId}-${batchId}-${packagingId}`

// Batches with no remaining stock or a lapsed expiry can't be allocated, so
// they're dropped before the product list is even built.
const isBatchExpired = (expiryDate: string): boolean => {
  const date = new Date(expiryDate)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

// The API returns yyyy-mm-dd; the batch table displays it as dd-mm-yyyy.
const formatExpiryDate = (expiryDate: string): string => {
  const match = expiryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : expiryDate
}

type AddProductsProps = {
  draft: AllocationDraft
  onChange: (patch: Partial<AllocationDraft>) => void
  /** True once Continue has been clicked with an empty cart — shows the inline error below. */
  showValidation?: boolean
}

const AddProducts = ({ draft, onChange, showValidation }: AddProductsProps) => {
  const [searchInput, setSearchInput] = useState('')
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  // Products picked from the search suggestions — each renders its own
  // batch panel below, until removed.
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  // Quantities typed in the batch rows before "Add" commits them into the
  // shared draft — transient per-row input, not part of the allocation yet.
  const [issueQtyByBatch, setIssueQtyByBatch] = useState<Record<string, string>>({})

  const [batchCatalog, setBatchCatalog] = useState<BatchApiRow[]>([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(true)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // A pharmacy transfer's products must come from the chosen source pharmacy,
  // not whichever pharmacy the caller is currently scoped to — those two can
  // differ, and fetching the wrong one lets a batch get added here that the
  // source has no stock of, only to fail later at dispatch.
  const isPharmacyTransfer = draft.distributionMode === 'pharmacy'
  const sourcePharmacyId = isPharmacyTransfer ? draft.sourceId : ''

  useEffect(() => {
    if (isPharmacyTransfer && !sourcePharmacyId) {
      setBatchCatalog([])
      setIsLoadingBatches(false)
      return
    }
    let active = true
    const fetchBatches = async () => {
      setIsLoadingBatches(true)
      try {
        const res = isPharmacyTransfer
          ? await ProductService.getBatchesForPharmacy(sourcePharmacyId)
          : await ProductService.getAllBatches()
        if (active) setBatchCatalog(res?.data || [])
      } catch (err) {
        console.error('Failed to fetch batches', err)
      } finally {
        if (active) setIsLoadingBatches(false)
      }
    }
    fetchBatches()
    return () => {
      active = false
    }
  }, [isPharmacyTransfer, sourcePharmacyId])

  // Batches come back flat (one row per batch, product fields repeated on
  // every row) — group them into a searchable per-product list.
  const products = useMemo(() => {
    const byProduct = new Map<string, Product>()
    // Guards against the catalog repeating a row: the same batch and packaging
    // listed twice is one stock position, not two.
    const seen = new Set<string>()
    batchCatalog.forEach((row) => {
      if (!row.productId || !row.batchId) return
      const identity = batchKey(row.productId, row.batchId, row.packagingId || '')
      if (seen.has(identity)) return
      seen.add(identity)
      const available = Number(row.totalStock) || 0
      if (available <= 0 || isBatchExpired(row.expiryDate || '')) return
      const batch: Batch = {
        batchId: row.batchId,
        batchNo: row.batchNumber || 'N/A',
        expiryDate: row.expiryDate || 'N/A',
        available,
        packagingId: row.packagingId || '',
      }
      const existing = byProduct.get(row.productId)
      if (existing) {
        existing.batches.push(batch)
      } else {
        byProduct.set(row.productId, {
          id: row.productId,
          name: row.productName || 'Unknown Product',
          purchaseUnit: row.purchaseUnit || '',
          batches: [batch],
        })
      }
    })
    return Array.from(byProduct.values())
  }, [batchCatalog])

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

  // Suggestions shown under the search box as the user types — nothing is
  // shown until there's a query, else it would dump the whole catalog.
  const trimmedQuery = searchInput.trim().toLowerCase()
  const suggestions = trimmedQuery
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(trimmedQuery) ||
          product.batches.some((batch) => batch.batchNo.toLowerCase().includes(trimmedQuery))
      )
    : []

  // Products picked from the suggestions — each gets its own batch panel
  // below, in the order they were picked.
  const selectedProducts = selectedProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product))

  const handleSelectProduct = (product: Product) => {
    setSelectedProductIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]))
    setSearchInput('')
    setIsSuggestionsOpen(false)
  }

  const handleRemoveProductPanel = (productId: string) => {
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId))
  }

  // A batch row's issue qty can never exceed what's actually available in it.
  const issueQtyError = (batch: Batch, rawQty: string) => {
    if (!rawQty) return undefined
    return Number(rawQty) > batch.available
      ? `Cannot exceed available quantity (${batch.available})`
      : undefined
  }

  const handleAddToCart = (product: Product, batch: Batch) => {
    const rawQty = issueQtyByBatch[batchKey(product.id, batch.batchId, batch.packagingId)] || ''
    const qty = Number(rawQty)
    if (!qty || issueQtyError(batch, rawQty)) return

    const line: AllocationDraftLine = {
      id: batchKey(product.id, batch.batchId, batch.packagingId),
      productId: product.id,
      productName: product.name,
      packagingId: batch.packagingId,
      batchId: batch.batchId,
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

      <div ref={searchBoxRef} className="relative flex w-full flex-col gap-4 rounded-lg border border-pneutral-200 bg-white p-4">
        <p className="text-label-l5 font-medium text-pneutral-900">Search Product</p>
        <Input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setIsSuggestionsOpen(true)
          }}
          onFocus={() => setIsSuggestionsOpen(true)}
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

        {isSuggestionsOpen && trimmedQuery && (
          <div className="absolute left-4 right-4 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-pneutral-200 bg-white shadow-lg">
            {isLoadingBatches ? (
              <p className="p-3 text-center text-p4 text-pneutral-500">Loading products...</p>
            ) : suggestions.length === 0 ? (
              <p className="p-3 text-center text-p4 text-pneutral-500">
                No products found for &quot;{searchInput.trim()}&quot;.
              </p>
            ) : (
              suggestions.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-pneutral-50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-100">
                    <Image
                      src="/warehouseDistribution/pill-icon.svg"
                      alt=""
                      width={16}
                      height={16}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label-l4 font-medium text-pneutral-900">
                      {product.name}
                    </p>
                    <p className="truncate text-p4 text-pneutral-500">
                      Purchase Unit : {product.purchaseUnit}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedProducts.map((product) => (
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
            <button
              type="button"
              onClick={() => handleRemoveProductPanel(product.id)}
              aria-label={`Remove ${product.name} from view`}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-pneutral-500 transition-colors hover:bg-pneutral-100 hover:text-pneutral-900"
            >
              <X size={16} />
            </button>
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
              <div className="grid w-full grid-cols-5 items-center gap-2 bg-pneutral-50 px-3 py-2">
                <p className="text-p4 font-semibold text-pneutral-500">Batch No.</p>
                <p className="text-p4 font-semibold text-pneutral-500">Expiry Date</p>
                <p className="text-p4 font-semibold text-pneutral-500">
                  Available ({product.purchaseUnit})
                </p>
                <p className="text-p4 font-semibold text-pneutral-500">
                  Issue Qty ({product.purchaseUnit})
                </p>
                <p className="text-p4 font-semibold text-pneutral-500">Action</p>
              </div>

              {product.batches.map((batch) => {
                const rawQty = issueQtyByBatch[batchKey(product.id, batch.batchId, batch.packagingId)] ?? ''
                const qtyError = issueQtyError(batch, rawQty)
                const isAddDisabled = !rawQty || Number(rawQty) <= 0 || Boolean(qtyError)

                return (
                  <div
                    key={batchKey(product.id, batch.batchId, batch.packagingId)}
                    className="grid w-full grid-cols-5 items-start gap-2 border-t border-pneutral-200 px-3 py-2"
                  >
                    <p className="pt-3 truncate text-p4 font-medium text-pneutral-900" title={batch.batchNo}>
                      {batch.batchNo}
                    </p>
                    <p className="pt-3 text-p4 font-normal text-pneutral-900">
                      {formatExpiryDate(batch.expiryDate)}
                    </p>
                    <p className="pt-3 text-p4 font-semibold text-success-600">
                      {batch.available}
                    </p>
                    <Input
                      type="number"
                      min={0}
                      max={batch.available}
                      error={qtyError}
                      value={rawQty}
                      onChange={(e) =>
                        setIssueQtyByBatch((prev) => ({
                          ...prev,
                          [batchKey(product.id, batch.batchId, batch.packagingId)]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product, batch)}
                      disabled={isAddDisabled}
                      className={`flex h-12 items-center justify-center rounded-lg border-2 px-4 font-medium text-label-l4 transition-colors ${
                        isAddDisabled
                          ? 'cursor-not-allowed border-pneutral-200 bg-pneutral-100 text-pneutral-400'
                          : 'border-secondary-700 text-secondary-700 hover:bg-secondary-50'
                      }`}
                    >
                      Add to Cart
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {cart.length === 0 && showValidation && (
        <p className="w-full text-p3 font-normal text-warning-500">
          Please add at least one product to the allocation cart before continuing.
        </p>
      )}

      {cart.length > 0 && (
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
                <p className="w-16 shrink-0 text-p4 font-semibold text-pneutral-500">Sl No.</p>
                <p className="min-w-0 flex-1 text-p4 font-semibold text-pneutral-500">Product</p>
                <p className="min-w-0 flex-1 text-p4 font-semibold text-pneutral-500">
                  Batch No.
                </p>
                <p className="min-w-0 flex-1 text-p4 font-semibold text-pneutral-500">
                  Purchase Unit
                </p>
                <p className="min-w-0 flex-1 text-right text-p4 font-semibold text-pneutral-500">
                  Issue Qty
                </p>
                <p className="min-w-0 flex-1 text-right text-p4 font-semibold text-pneutral-500">
                  Action
                </p>
              </div>

              {cart.map((line, index) => (
                <div
                  key={line.id}
                  className="flex w-full items-center gap-2 border-b border-pneutral-200 py-2"
                >
                  <p className="w-16 shrink-0 text-p3 font-normal text-pneutral-900">
                    {index + 1}
                  </p>
                  <p className="min-w-0 flex-1 truncate text-label-l4 font-medium text-pneutral-900" title={line.productName}>
                    {line.productName}
                  </p>
                  <p className="min-w-0 flex-1 truncate text-p4 font-normal text-pneutral-900" title={line.batchNo}>
                    {line.batchNo}
                  </p>
                  <p className="min-w-0 flex-1 text-p4 font-normal text-pneutral-900">
                    {line.purchaseUnit}
                  </p>
                  <p className="min-w-0 flex-1 text-right text-p4 font-semibold text-pneutral-900">
                    {line.issueQuantity}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(line.id)}
                    aria-label={`Remove ${line.productName} from cart`}
                    className="flex min-w-0 flex-1 items-center justify-end"
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
      )}
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
