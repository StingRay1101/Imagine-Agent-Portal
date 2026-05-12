import { useState, useEffect } from 'react'
import { getAdminSettings, updateAdminSettings, getShopifyTags } from '../api'
import type { AdminSettings, Sale } from '../types'

interface Props {
  onLogout: () => void
}

export default function AdminPanel({ onLogout }: Props) {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [saleTagSearch, setSaleTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [showSaleTagDropdown, setShowSaleTagDropdown] = useState(false)
  const [newSalePercentage, setNewSalePercentage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [s, tags] = await Promise.all([getAdminSettings(), getShopifyTags()])
      setSettings(s)
      setAllTags(tags)
    } catch (err) {
      console.error('Failed to load admin data:', err)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    setSaveMessage('')
    try {
      const updated = await updateAdminSettings(settings)
      setSettings(updated)
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveMessage(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`)
    }
    setSaving(false)
  }

  function addProductTag(tag: string) {
    if (!settings || settings.productTags.includes(tag)) return
    setSettings({ ...settings, productTags: [...settings.productTags, tag] })
    setTagSearch('')
    setShowTagDropdown(false)
  }

  function removeProductTag(tag: string) {
    if (!settings) return
    setSettings({ ...settings, productTags: settings.productTags.filter((t) => t !== tag) })
  }

  function addSale() {
    if (!settings || !saleTagSearch.trim() || !newSalePercentage) return
    const percentage = parseInt(newSalePercentage)
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) return

    const newSale: Sale = {
      id: crypto.randomUUID(),
      tag: saleTagSearch.trim(),
      percentage,
      active: true,
    }
    setSettings({ ...settings, sales: [...settings.sales, newSale] })
    setSaleTagSearch('')
    setNewSalePercentage('')
    setShowSaleTagDropdown(false)
  }

  function removeSale(id: string) {
    if (!settings) return
    setSettings({ ...settings, sales: settings.sales.filter((s) => s.id !== id) })
  }

  function toggleSaleActive(id: string) {
    if (!settings) return
    setSettings({
      ...settings,
      sales: settings.sales.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    })
  }

  function updateSalePercentage(id: string, value: string) {
    if (!settings) return
    const percentage = parseInt(value)
    if (isNaN(percentage)) return
    setSettings({
      ...settings,
      sales: settings.sales.map((s) => (s.id === id ? { ...s, percentage: Math.min(100, Math.max(1, percentage)) } : s)),
    })
  }

  const filteredTags = allTags.filter(
    (t) =>
      t.toLowerCase().includes(tagSearch.toLowerCase()) &&
      (!settings || !settings.productTags.includes(t))
  )

  const filteredSaleTags = allTags.filter((t) =>
    t.toLowerCase().includes(saleTagSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-black px-6 py-3">
          <div className="mx-auto flex items-center justify-between max-w-[1200px]">
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.shopify.com/s/files/1/2724/6858/files/White_Logo_Wholesale.png?v=1738893136"
                alt="Imagine Fashion"
                className="h-8"
              />
              <span className="text-white text-sm font-medium">Admin Panel</span>
            </div>
          </div>
        </header>
        <main className="mx-auto p-6 max-w-[1200px]">
          <div className="text-gray-500 text-center py-12">Loading settings...</div>
        </main>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-black px-6 py-3">
          <div className="mx-auto flex items-center justify-between max-w-[1200px]">
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.shopify.com/s/files/1/2724/6858/files/White_Logo_Wholesale.png?v=1738893136"
                alt="Imagine Fashion"
                className="h-8"
              />
              <span className="text-white text-sm font-medium">Admin Panel</span>
            </div>
            <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </header>
        <main className="mx-auto p-6 max-w-[1200px]">
          <div className="text-red-500 text-center py-12">Failed to load settings. Please try again.</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black px-6 py-3">
        <div className="mx-auto flex items-center justify-between max-w-[1200px]">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.shopify.com/s/files/1/2724/6858/files/White_Logo_Wholesale.png?v=1738893136"
              alt="Imagine Fashion"
              className="h-8"
            />
            <span className="text-white text-sm font-medium">Admin Panel</span>
          </div>
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white">
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto p-6 max-w-[1200px]">
        {/* Save Banner */}
        {saveMessage && (
          <div
            className={`rounded-lg px-4 py-3 flex items-center justify-between mb-6 ${
              saveMessage.startsWith('Error')
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}
          >
            <span className="text-sm">{saveMessage}</span>
            <button onClick={() => setSaveMessage('')} className="text-current opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Tag Filter */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Product Tag Filter</h2>
            <p className="text-sm text-gray-500 mb-4">
              Only products matching these tags will be shown to agents. Leave empty to show all products.
            </p>

            {/* Current Tags */}
            {settings.productTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {settings.productTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-sm font-medium"
                  >
                    {tag}
                    <button
                      onClick={() => removeProductTag(tag)}
                      className="ml-0.5 text-indigo-400 hover:text-indigo-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Tag */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add a tag</label>
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => {
                  setTagSearch(e.target.value)
                  setShowTagDropdown(true)
                }}
                onFocus={() => setShowTagDropdown(true)}
                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                placeholder="Search Shopify tags..."
              />
              {showTagDropdown && tagSearch && filteredTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addProductTag(tag)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sales / Discounts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sale Discounts</h2>
            <p className="text-sm text-gray-500 mb-4">
              Apply discount percentages to products by tag. Active sales show a badge on the agent portal and reduce
              the wholesale price accordingly.
            </p>

            {/* Existing Sales */}
            {settings.sales.length > 0 && (
              <div className="space-y-3 mb-4">
                {settings.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      sale.active ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{sale.tag}</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            sale.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {sale.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={sale.percentage}
                          onChange={(e) => updateSalePercentage(sale.id, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <button
                        onClick={() => toggleSaleActive(sale.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                          sale.active
                            ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {sale.active ? 'Pause' : 'Enable'}
                      </button>
                      <button
                        onClick={() => removeSale(sale.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Remove sale"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Sale */}
            <div className="border border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Add New Sale</div>
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <label className="block text-xs text-gray-500 mb-1">Product Tag</label>
                  <input
                    type="text"
                    value={saleTagSearch}
                    onChange={(e) => {
                      setSaleTagSearch(e.target.value)
                      setShowSaleTagDropdown(true)
                    }}
                    onFocus={() => setShowSaleTagDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSaleTagDropdown(false), 200)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="Search tags..."
                  />
                  {showSaleTagDropdown && saleTagSearch && filteredSaleTags.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredSaleTags.slice(0, 20).map((tag) => (
                        <button
                          key={tag}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSaleTagSearch(tag)
                            setShowSaleTagDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newSalePercentage}
                    onChange={(e) => setNewSalePercentage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="%"
                  />
                </div>
                <button
                  onClick={addSale}
                  disabled={!saleTagSearch.trim() || !newSalePercentage}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  )
}
