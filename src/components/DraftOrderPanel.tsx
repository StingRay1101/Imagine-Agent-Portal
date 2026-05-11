import { useState } from 'react'
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

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4 text-sm text-indigo-800">
        <div className="font-semibold mb-1">Draft Order Workflow:</div>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Save Draft:</strong> Customer needs to confirm quantities or waiting for stock</li>
          <li><strong>Create Draft Order:</strong> Customer is ready to proceed and receive an invoice</li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 flex items-start gap-2">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-blue-800">
          Automatic discounts will be applied when the customer checks out
        </span>
      </div>

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
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-32">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Price</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.variantId}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-gray-900">${(item.price * item.quantity).toFixed(2)} (ex GST)</div>
                      <div className="text-xs text-gray-500">GST: ${(item.gst * item.quantity).toFixed(2)}</div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onRemoveItem(item.variantId)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-blue-800">
              Shipping costs will be calculated and provided on the final invoice
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onStartAgain}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Again
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => onSaveDraft(notes, shippingMethod)}
                disabled={saving}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {saving ? 'Saving...' : 'Save Draft for Later'}
              </button>
              <button
                onClick={() => onCreateDraftOrder(notes, shippingMethod)}
                disabled={creating}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {creating ? 'Creating...' : 'Create Draft Order'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
