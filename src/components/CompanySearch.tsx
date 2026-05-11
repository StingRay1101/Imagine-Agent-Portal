import { useState, useRef } from 'react'
import { searchCompanyLocations } from '../api'
import type { CompanyLocation } from '../types'

interface Props {
  onSelect: (location: CompanyLocation) => void
  onViewDrafts: () => void
}

export default function CompanySearch({ onSelect, onViewDrafts }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanyLocation[]>([])
  const [searching, setSearching] = useState(false)
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
        const data = await searchCompanyLocations(value)
        setResults(data)
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
        <svg className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-indigo-800">
          New customer? Please call or email Imagine Fashion to set up the new B2B account before placing an order.
        </span>
      </div>

      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Search company locations
      </label>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="Search by company or location name..."
          autoFocus
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

      <button
        onClick={onViewDrafts}
        className="mt-3 px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        View Saved Drafts
      </button>

      {searching && (
        <div className="mt-4 text-sm text-gray-500">Searching...</div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onSelect(loc)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-indigo-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">{loc.companyName}</div>
              <div className="text-sm text-gray-600">{loc.locationName}</div>
              <div className="text-sm text-gray-500">{loc.address}</div>
            </button>
          ))}
        </div>
      )}

      {query && !searching && results.length === 0 && (
        <div className="mt-4 text-sm text-gray-500">No company locations found</div>
      )}
    </div>
  )
}
