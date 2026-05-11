import { useState, useEffect, useCallback } from 'react'
import Login from './components/Login'
import CompanySearch from './components/CompanySearch'
import CompanyDetails from './components/CompanyDetails'
import ProductSearch from './components/ProductSearch'
import DraftOrderPanel from './components/DraftOrderPanel'
import SavedDrafts from './components/SavedDrafts'
import { verifyPassword, createDraftOrder, saveDraft } from './api'
import type { CompanyLocation, OrderLineItem, ShippingMethod, DraftOrder } from './types'

type View = 'main' | 'drafts'

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [view, setView] = useState<View>('main')
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null)
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([])
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const pw = localStorage.getItem('portal_password')
    if (!pw) {
      setAuthenticated(false)
      return
    }
    verifyPassword().then((ok) => setAuthenticated(ok))
  }, [])

  const handleAddToOrder = useCallback((item: OrderLineItem) => {
    setLineItems((prev) => {
      const existing = prev.find((li) => li.variantId === item.variantId)
      if (existing) {
        return prev.map((li) =>
          li.variantId === item.variantId
            ? { ...li, quantity: li.quantity + item.quantity }
            : li
        )
      }
      return [...prev, item]
    })
  }, [])

  function updateQuantity(variantId: string, quantity: number) {
    setLineItems((prev) =>
      prev.map((li) => (li.variantId === variantId ? { ...li, quantity } : li))
    )
  }

  function removeItem(variantId: string) {
    setLineItems((prev) => prev.filter((li) => li.variantId !== variantId))
  }

  function startAgain() {
    setSelectedLocation(null)
    setLineItems([])
    setSuccessMessage('')
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
    setLineItems(draft.lineItems)
    setView('main')
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.shopify.com/s/files/1/2724/6858/files/White_Logo_Wholesale.png?v=1738893136"
              alt="Imagine Fashion"
              className="h-8"
            />
            <span className="text-white text-sm font-medium">Sales Agent</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('portal_password')
              setAuthenticated(false)
            }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
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
            <CompanySearch
              onSelect={(loc) => {
                setSelectedLocation(loc)
                setLineItems([])
                setSuccessMessage('')
              }}
              onViewDrafts={() => setView('drafts')}
            />

            {selectedLocation && (
              <>
                <CompanyDetails location={selectedLocation} />
                <ProductSearch
                  companyLocationId={selectedLocation.id}
                  onAddToOrder={handleAddToOrder}
                />
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
              </>
            )}

            {!selectedLocation && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500">
                  Search and select a company location to begin creating an order
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
