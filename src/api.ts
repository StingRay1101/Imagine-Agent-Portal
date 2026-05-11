import type { CompanyLocation, ProductVariant, Order, DraftOrder } from './types'

const API_BASE = '/api'

function getHeaders(): HeadersInit {
  const password = localStorage.getItem('portal_password') || ''
  return {
    'Content-Type': 'application/json',
    'X-Portal-Password': password,
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  })
  if (res.status === 401) {
    localStorage.removeItem('portal_password')
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `API error ${res.status}`)
  }
  return res.json()
}

export async function verifyPassword(): Promise<boolean> {
  try {
    await apiFetch('/ping')
    return true
  } catch {
    return false
  }
}

export async function searchCompanyLocations(
  query: string
): Promise<CompanyLocation[]> {
  return apiFetch(`/companies?q=${encodeURIComponent(query)}`)
}

export async function getCompanyLocation(
  locationId: string
): Promise<CompanyLocation> {
  return apiFetch(`/companies/${encodeURIComponent(locationId)}`)
}

export async function searchProducts(
  query: string,
  companyLocationId?: string
): Promise<ProductVariant[]> {
  let url = `/products?q=${encodeURIComponent(query)}`
  if (companyLocationId) {
    url += `&locationId=${encodeURIComponent(companyLocationId)}`
  }
  return apiFetch(url)
}

export async function getOrderHistory(
  companyId: string
): Promise<Order[]> {
  return apiFetch(`/orders?companyId=${encodeURIComponent(companyId)}`)
}

export async function createDraftOrder(order: {
  companyLocationId: string
  lineItems: { variantId: string; quantity: number }[]
  notes: string
  shippingMethod: string
}): Promise<{ id: string; name: string; invoiceUrl: string }> {
  return apiFetch('/draft-orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export async function saveDraft(draft: {
  id?: string
  companyLocationId: string
  companyName: string
  locationName: string
  lineItems: { variantId: string; title: string; sku: string; price: number; gst: number; quantity: number; imageUrl: string | null }[]
  notes: string
  shippingMethod: string
}): Promise<{ id: string }> {
  return apiFetch('/drafts', {
    method: 'POST',
    body: JSON.stringify(draft),
  })
}

export async function getSavedDrafts(): Promise<DraftOrder[]> {
  return apiFetch('/drafts')
}

export async function deleteDraft(id: string): Promise<void> {
  await apiFetch(`/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
