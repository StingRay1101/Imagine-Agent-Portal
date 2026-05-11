import { useState, useRef } from 'react'
import { searchProducts } from '../api'
import type { ProductVariant, OrderLineItem } from '../types'

interface Props {
  companyLocationId?: string
  onAddToOrder: (item: OrderLineItem) => void
}

export default function ProductSearch({ companyLocationId, onAddToOrder }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductVariant[]>([])
  const [searching, setSearching] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

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
        const q: Record<string, number> = {}
        data.forEach((v) => { q[v.id] = 1 })
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

  function setQuantity(variantId: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [variantId]: Math.max(1, qty) }))
  }

  function addToOrder(variant: ProductVariant) {
    const price = parseFloat(variant.price)
    const gst = Math.round(price * 0.1 * 100) / 100
    onAddToOrder({
      variantId: variant.id,
      title: variant.productTitle + (variant.title !== 'Default Title' ? ` - ${variant.title}` : ''),
      sku: variant.sku,
      price,
      gst,
      quantity: quantities[variant.id] || 1,
      imageUrl: variant.imageUrl,
    })
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

      {results.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((variant) => {
            const price = parseFloat(variant.price)
            const gst = Math.round(price * 0.1 * 100) / 100
            return (
              <div
                key={variant.id}
                className="border border-gray-200 rounded-lg p-3 flex flex-col"
              >
                {variant.imageUrl ? (
                  <img
                    src={variant.imageUrl}
                    alt={variant.productTitle}
                    className="w-full h-48 object-cover rounded-md mb-3"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-md mb-3 flex items-center justify-center text-gray-400 text-xs">
                    No image
                  </div>
                )}
                <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                  {variant.productTitle}
                  {variant.title !== 'Default Title' && (
                    <span className="text-gray-600"> - {variant.title}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  SKU: {variant.sku || '—'}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  AUD {price.toFixed(2)} <span className="font-normal text-gray-500">(ex GST)</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  GST: AUD {gst.toFixed(2)}
                </div>
                <div className="mb-3">
                  {variant.available ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      Available
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                      Out of Stock
                    </span>
                  )}
                </div>
                <div className="mt-auto">
                  <input
                    type="number"
                    min={1}
                    value={quantities[variant.id] || 1}
                    onChange={(e) => setQuantity(variant.id, parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm mb-2"
                  />
                  <button
                    onClick={() => addToOrder(variant)}
                    disabled={!variant.available}
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
