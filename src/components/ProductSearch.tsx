import { useState, useRef, useMemo } from 'react'
import { searchProducts } from '../api'
import type { ProductVariant, OrderLineItem } from '../types'

interface Props {
  companyLocationId?: string
  onAddToOrder: (item: OrderLineItem) => void
}

interface ProductGroup {
  productId: string
  productTitle: string
  variants: ProductVariant[]
}

export default function ProductSearch({ companyLocationId, onAddToOrder }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductVariant[]>([])
  const [searching, setSearching] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Group variants by product
  const productGroups = useMemo<ProductGroup[]>(() => {
    const groups: ProductGroup[] = []
    const map = new Map<string, ProductGroup>()

    for (const variant of results) {
      let group = map.get(variant.productId)
      if (!group) {
        group = {
          productId: variant.productId,
          productTitle: variant.productTitle,
          variants: [],
        }
        map.set(variant.productId, group)
        groups.push(group)
      }
      group.variants.push(variant)
    }

    // Sort: products with any in-stock variants first
    groups.sort((a, b) => {
      const aInStock = a.variants.some((v) => v.inventoryQuantity > 0) ? 0 : 1
      const bInStock = b.variants.some((v) => v.inventoryQuantity > 0) ? 0 : 1
      return aInStock - bInStock
    })

    return groups
  }, [results])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchProducts(value, companyLocationId)
        setResults(data)

        // Auto-select first variant per product and init quantities
        const selected: Record<string, string> = {}
        const q: Record<string, number> = {}
        const seen = new Set<string>()
        data.forEach((v) => {
          if (!seen.has(v.productId)) {
            selected[v.productId] = v.id
            seen.add(v.productId)
          }
          q[v.id] = 1
        })
        setSelectedVariants(selected)
        setQuantities(q)
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 300)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
  }

  function setQuantity(variantId: string, qty: number, maxStock: number) {
    const capped = maxStock > 0 ? Math.min(qty, maxStock) : qty
    setQuantities((prev) => ({ ...prev, [variantId]: Math.max(1, capped) }))
  }

  function selectVariant(productId: string, variantId: string) {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }))
  }

  function getWholesalePricing(retailPrice: number) {
    const wholesaleIncGst = Math.round(retailPrice * 0.35 * 100) / 100
    const priceExGst = Math.round((wholesaleIncGst / 1.1) * 100) / 100
    const gst = Math.round((wholesaleIncGst - priceExGst) * 100) / 100
    return { priceExGst, gst, wholesaleIncGst }
  }

  function addToOrder(variant: ProductVariant) {
    const retail = parseFloat(variant.price)
    const { priceExGst, gst } = getWholesalePricing(retail)
    onAddToOrder({
      variantId: variant.id,
      title: variant.productTitle + (variant.title !== 'Default Title' ? ` - ${variant.title}` : ''),
      sku: variant.sku,
      price: priceExGst,
      gst,
      quantity: quantities[variant.id] || 1,
      maxQuantity: variant.inventoryQuantity,
      imageUrl: variant.imageUrl,
    })
  }

  function renderStockBadge(qty: number, incoming?: number) {
    if (qty <= 0) {
      if (incoming && incoming > 0) {
        return (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            Coming Back in Stock ({incoming} incoming)
          </span>
        )
      }
      return (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          Out of Stock
        </span>
      )
    }
    if (qty <= 5) {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
          Only {qty} left
        </span>
      )
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        Available
      </span>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Add Products</h2>
      <label className="block text-sm text-gray-600 mb-2">Search products</label>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="Search by name, SKU, or tags..."
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {searching && (
        <div className="mt-4 text-sm text-gray-500">Searching products...</div>
      )}

      {productGroups.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {productGroups.map((group) => {
            const selectedId = selectedVariants[group.productId]
            const selectedVariant = group.variants.find((v) => v.id === selectedId) || group.variants[0]
            const retail = parseFloat(selectedVariant.price)
            const { priceExGst, gst } = getWholesalePricing(retail)
            const hasMultipleVariants = group.variants.length > 1 || group.variants[0]?.title !== 'Default Title'

            return (
              <div
                key={group.productId}
                className="border border-gray-200 rounded-lg p-3 flex flex-col"
              >
                {/* Product Image */}
                {selectedVariant.imageUrl ? (
                  <img
                    src={selectedVariant.imageUrl}
                    alt={group.productTitle}
                    className="w-full rounded-md mb-3"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center text-gray-400 text-xs">
                    No image
                  </div>
                )}

                {/* Product Title */}
                <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                  {group.productTitle}
                </div>

                {/* SKU */}
                <div className="text-xs text-gray-500 mb-2">
                  SKU: {selectedVariant.sku || '—'}
                </div>

                {/* Variant Selector */}
                {hasMultipleVariants && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-600 mb-1.5">Select Variant</div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.variants.map((v) => {
                        const isSelected = v.id === selectedId
                        const isOutOfStock = v.inventoryQuantity <= 0
                        return (
                          <button
                            key={v.id}
                            onClick={() => selectVariant(group.productId, v.id)}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : isOutOfStock
                                  ? 'border-gray-200 text-gray-400 bg-gray-50'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {v.title}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="text-sm font-semibold text-gray-900">
                  ${priceExGst.toFixed(2)} <span className="font-normal text-gray-500">(ex GST)</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  + GST: ${gst.toFixed(2)}
                </div>

                {/* Stock Badge */}
                <div className="mb-3">
                  {renderStockBadge(selectedVariant.inventoryQuantity, selectedVariant.incomingQuantity)}
                </div>

                {/* Quantity + Add to Order */}
                <div className="mt-auto">
                  {selectedVariant.inventoryQuantity > 0 && (
                    <input
                      type="number"
                      min={1}
                      max={selectedVariant.inventoryQuantity}
                      value={quantities[selectedVariant.id] || 1}
                      onChange={(e) =>
                        setQuantity(selectedVariant.id, parseInt(e.target.value) || 1, selectedVariant.inventoryQuantity)
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm mb-2"
                    />
                  )}
                  <button
                    onClick={() => addToOrder(selectedVariant)}
                    disabled={selectedVariant.inventoryQuantity <= 0}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add to Order
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
