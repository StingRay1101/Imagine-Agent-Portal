import { useState, useEffect } from 'react'
import type { OrderLineItem, ShippingMethod } from '../types'

interface Props {
  lineItems: OrderLineItem[]
  onUpdateQuantity: (variantId: string, quantity: number) => void
  onRemoveItem: (variantId: string) => void
  onCreateDraftOrder: (notes: string, shippingMethod: ShippingMethod) => void
  onSaveDraft: (notes: string, shippingMethod: ShippingMethod) => void
  onStartAgain: () => void
  creating: boolean
  saving: boolean
}

const SHIPPING_OPTIONS: { value: ShippingMethod; label: string }[] = [
  { value: 'parcel_post', label: 'Australia Post - PARCEL POST + SIGNATURE (Economical)' },
  { value: 'express_post', label: 'Australia Post - EXPRESS POST + SIGNATURE (Fastest Economical Method)' },
  { value: 'star_track', label: 'Star Track (Usually most expensive. But quickest)' },
]

const FREE_SHIPPING_OPTION: { value: ShippingMethod; label: string } = {
  value: 'free_shipping',
  label: 'Free Standard Shipping Over $500',
}

export default function DraftOrderPanel({
  lineItems,
  onUpdateQuantity,
  onRemoveItem,
  onCreateDraftOrder,
  onSaveDraft,
  onStartAgain,
  creating,
  saving,
}: Props) {
  const [notes, setNotes] = useState('')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('')
  const [searchFilter, setSearchFilter] = useState('')

  const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = lineItems.reduce((sum, item) => sum + item.gst * item.quantity, 0)
  const total = subtotal + gst

  // Auto-deselect free shipping if total drops below $500
  useEffect(() => {
    if (total <= 500 && shippingMethod === 'free_shipping') {
      setShippingMethod('')
    }
  }, [total, shippingMethod])

  const filteredItems = searchFilter
    ? lineItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : lineItems

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Draft Order</h2>

      {lineItems.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">Add products to create a draft order</p>
      ) : (
        <>
          <label className="block text-sm text-gray-600 mb-1">Search draft order</label>
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Search by product name or SKU..."
            />
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-600 w-16">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Price</th>
                  <th className="px-1 py-2 text-center font-medium text-gray-600 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.variantId}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                    </td>
                    <td className="px-1 py-3">
                      <input
                        type="number"
                        min={1}
                        max={item.maxQuantity}
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.variantId, Math.min(parseInt(e.target.value) || 1, item.maxQuantity))}
                        className="w-16 px-1 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                      {item.maxQuantity <= 5 && (
                        <div className="text-xs text-amber-600 text-center mt-0.5">{item.maxQuantity} left</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-gray-900">${(item.price * item.quantity).toFixed(2)} (ex GST)</div>
                      <div className="text-xs text-gray-500">GST: ${(item.gst * item.quantity).toFixed(2)}</div>
                    </td>
                    <td className="px-1 py-3 text-center">
                      <button
                        onClick={() => onRemoveItem(item.variantId)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              placeholder="e.g., Confirming quantities, waiting for stock to arrive..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Method</label>
            <div className="space-y-2">
              {total > 500 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shipping"
                    value={FREE_SHIPPING_OPTION.value}
                    checked={shippingMethod === FREE_SHIPPING_OPTION.value}
                    onChange={() => setShippingMethod(FREE_SHIPPING_OPTION.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-green-700 font-medium">{FREE_SHIPPING_OPTION.label}</span>
                </label>
              )}
              {SHIPPING_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.value}
                    checked={shippingMethod === opt.value}
                    onChange={() => setShippingMethod(opt.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Subtotal (ex GST):</span>
              <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">GST:</span>
              <span className="text-gray-900">${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-700">Total (inc GST):</span>
              <span className="text-gray-900">${total.toFixed(2)}</span>
            </div>
          </div>

          {!shippingMethod && (
            <p className="text-xs text-amber-600 mb-2">Please select a shipping method to create a draft order.</p>
          )}

          <div className="space-y-2">
            <button
              onClick={() => onCreateDraftOrder(notes, shippingMethod)}
              disabled={creating || !shippingMethod}
              className="w-full px-4 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {creating ? 'Creating...' : 'Create Draft Order'}
            </button>
            <button
              onClick={() => onSaveDraft(notes, shippingMethod)}
              disabled={saving}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {saving ? 'Saving...' : 'Save Draft for Later'}
            </button>
            <button
              onClick={onStartAgain}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Again
            </button>
          </div>
        </>
      )}
    </div>
  )
}
