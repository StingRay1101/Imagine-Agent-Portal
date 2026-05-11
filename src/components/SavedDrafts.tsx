import { useState, useEffect } from 'react'
import { getSavedDrafts, deleteDraft } from '../api'
import type { DraftOrder } from '../types'

interface Props {
  onBack: () => void
  onResumeDraft: (draft: DraftOrder) => void
}

export default function SavedDrafts({ onBack, onResumeDraft }: Props) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDrafts()
  }, [])

  async function loadDrafts() {
    setLoading(true)
    try {
      const data = await getSavedDrafts()
      setDrafts(data)
    } catch {
      setDrafts([])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft?')) return
    try {
      await deleteDraft(id)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    } catch {
      alert('Failed to delete draft')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Saved Drafts</h2>
        <button
          onClick={onBack}
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          &larr; Back to Search
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading saved drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">No saved drafts</div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{draft.companyName}</div>
                  <div className="text-sm text-gray-600">{draft.locationName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {draft.lineItems.length} item{draft.lineItems.length !== 1 ? 's' : ''} &middot; ${draft.total.toFixed(2)} (inc GST)
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Saved {new Date(draft.createdAt).toLocaleString()}
                  </div>
                  {draft.notes && (
                    <div className="text-xs text-gray-500 mt-1 italic">"{draft.notes}"</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onResumeDraft(draft)}
                    className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
