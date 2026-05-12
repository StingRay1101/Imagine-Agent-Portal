import { useState, useEffect, useCallback } from 'react'
import Login from './components/Login'
import CompanySearch from './components/CompanySearch'
import ProductSearch from './components/ProductSearch'
import DraftOrderPanel from './components/DraftOrderPanel'
import SavedDrafts from './components/SavedDrafts'
import AdminPanel from './components/AdminPanel'
import { verifyPassword, verifyAdminPassword, createDraftOrder, saveDraft, getOrderHistory } from './api'
import type { CompanyLocation, OrderLineItem, ShippingMethod, DraftOrder, Order } from './types'

type View = 'main' | 'drafts'
type AuthState = 'loading' | 'unauthenticated' | 'agent' | 'admin'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [view, setView] = useState<View>('main')
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null)
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([])
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      // Check admin auth first
      const adminPw = localStorage.getItem('admin_password')
      if (adminPw) {
        const ok = await verifyAdminPassword()
        if (ok) {
          setAuthState('admin')
          return
        }
        localStorage.removeItem('admin_password')
      }
      // Check agent auth
      const portalPw = localStorage.getItem('portal_password')
      if (portalPw) {
        const ok = await verifyPassword()
        if (ok) {
          setAuthState('agent')
          return
        }
        localStorage.removeItem('portal_password')
      }
      setAuthState('unauthenticated')
    }
    checkAuth()
  }, [])

  const handleAddToOrder = useCallback((item: OrderLineItem) => {
    setLineItems((prev) => {
      const existing = prev.find((li) => li.variantId === item.variantId)
      if (existing) {
        return prev.map((li) =>
          li.variantId === item.variantId
            ? { ...li, quantity: Math.min(li.quantity + item.quantity, li.maxQuantity) }
            : li
        )
      }
      return [...prev, item]
    })
  }, [])

  function updateQuantity(variantId: string, quantity: number) {
    setLineItems((prev) =>
      prev.map((li) => (li.variantId === variantId ? { ...li, quantity: Math.min(quantity, li.maxQuantity) } : li))
    )
  }

  function removeItem(variantId: string) {
    setLineItems((prev) => prev.filter((li) => li.variantId !== variantId))
  }

  function startAgain() {
    setSelectedLocation(null)
    setLineItems([])
    setSuccessMessage('')
    setShowOrderHistory(false)
    setOrders([])
  }

  async function toggleOrderHistory() {
    if (!showOrderHistory && orders.length === 0 && selectedLocation) {
      setLoadingOrders(true)
      try {
        const data = await getOrderHistory(selectedLocation.companyId)
        setOrders(data)
      } catch {
        setOrders([])
      }
      setLoadingOrders(false)
    }
    setShowOrderHistory(!showOrderHistory)
  }

  async function handleCreateDraftOrder(notes: string, shippingMethod: ShippingMethod) {
    if (!selectedLocation || lineItems.length === 0) return
    setCreating(true)
    try {
      const result = await createDraftOrder({
        companyLocationId: selectedLocation.id,
        companyId: selectedLocation.companyId,
        companyContactId: selectedLocation.companyContactId,
        lineItems: lineItems.map((li) => ({
          variantId: li.variantId,
          quantity: li.quantity,
        })),
        notes,
        shippingMethod,
      })
      setSuccessMessage(`Draft order ${result.name} created successfully!`)
      setLineItems([])
    } catch (err) {
      alert(`Failed to create draft order: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setCreating(false)
  }

  async function handleSaveDraft(notes: string, shippingMethod: ShippingMethod) {
    if (!selectedLocation || lineItems.length === 0) return
    setSaving(true)
    try {
      await saveDraft({
        companyLocationId: selectedLocation.id,
        companyId: selectedLocation.companyId,
        companyContactId: selectedLocation.companyContactId,
        companyName: selectedLocation.companyName,
        locationName: selectedLocation.locationName,
        lineItems,
        notes,
        shippingMethod,
      })
      setSuccessMessage('Draft saved successfully!')
    } catch (err) {
      alert(`Failed to save draft: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSaving(false)
  }

  function handleResumeDraft(draft: DraftOrder) {
    setSelectedLocation({
      id: draft.companyLocationId || draft.id,
      companyId: draft.companyId || '',
      companyContactId: draft.companyContactId || '',
      companyName: draft.companyName,
      locationName: draft.locationName,
      address: '',
      contactName: '',
      contactEmail: '',
    })
    // Ensure maxQuantity exists on resumed draft items (older drafts may not have it)
    setLineItems(draft.lineItems.map((li) => ({
      ...li,
      maxQuantity: li.maxQuantity || 9999,
    })))
    setView('main')
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return (
      <Login
        onLogin={() => setAuthState('agent')}
        onAdminLogin={() => setAuthState('admin')}
      />
    )
  }

  if (authState === 'admin') {
    return (
      <AdminPanel
        onLogout={() => {
          localStorage.removeItem('admin_password')
          setAuthState('unauthenticated')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black px-6 py-3">
        <div className="mx-auto flex items-center justify-between max-w-[1600px]">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.shopify.com/s/files/1/2724/6858/files/White_Logo_Wholesale.png?v=1738893136"
              alt="Imagine Fashion"
              className="h-8"
            />
            <span className="text-white text-sm font-medium">Sales Agent App</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('portal_password')
              setAuthState('unauthenticated')
            }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto p-6 max-w-[1600px]">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-sm text-green-800">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {view === 'drafts' ? (
          <SavedDrafts
            onBack={() => setView('main')}
            onResumeDraft={handleResumeDraft}
          />
        ) : (
          <>
            {!selectedLocation ? (
              <div className="max-w-3xl mx-auto space-y-4">
                <CompanySearch
                  onSelect={(loc) => {
                    setSelectedLocation(loc)
                    setLineItems([])
                    setSuccessMessage('')
                  }}
                  onViewDrafts={() => setView('drafts')}
                />
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-sm text-gray-500">
                    Search and select a company location to begin creating an order
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm mb-4">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{selectedLocation.companyName}</div>
                        <div className="text-xs text-gray-500">{selectedLocation.locationName}{selectedLocation.address ? ` · ${selectedLocation.address}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleOrderHistory}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Order History
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={startAgain}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Change Company
                      </button>
                    </div>
                  </div>

                  {showOrderHistory && (
                    <div className="border-t border-gray-200 px-5 py-4">
                      {loadingOrders ? (
                        <div className="text-sm text-gray-500">Loading orders...</div>
                      ) : orders.length === 0 ? (
                        <div className="text-sm text-gray-500">No order history found</div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Order</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Payment</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Fulfillment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {orders.map((order) => {
                                const numericId = order.id.split('/').pop()
                                return (
                                  <tr key={order.id}>
                                    <td className="px-3 py-2">
                                      <a
                                        href={`https://admin.shopify.com/store/imagine-retail/orders/${numericId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        {order.name}
                                      </a>
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-900">${order.totalPrice}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                        order.financialStatus === 'paid'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {order.financialStatus}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                        order.fulfillmentStatus === 'fulfilled'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {order.fulfillmentStatus}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-1 min-w-0">
                    <ProductSearch
                      companyLocationId={selectedLocation.id}
                      onAddToOrder={handleAddToOrder}
                    />
                  </div>
                  <div className="w-[420px] shrink-0 sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DraftOrderPanel
                      lineItems={lineItems}
                      onUpdateQuantity={updateQuantity}
                      onRemoveItem={removeItem}
                      onCreateDraftOrder={handleCreateDraftOrder}
                      onSaveDraft={handleSaveDraft}
                      onStartAgain={startAgain}
                      creating={creating}
                      saving={saving}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
