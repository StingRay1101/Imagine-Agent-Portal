export interface CompanyLocation {
  id: string
  companyId: string
  companyName: string
  locationName: string
  address: string
  contactName: string
  contactEmail: string
  catalogId?: string
}

export interface ProductVariant {
  id: string
  productId: string
  title: string
  productTitle: string
  sku: string
  price: string
  compareAtPrice: string | null
  imageUrl: string | null
  inventoryQuantity: number
  available: boolean
}

export interface OrderLineItem {
  variantId: string
  title: string
  sku: string
  price: number
  gst: number
  quantity: number
  imageUrl: string | null
}

export interface DraftOrder {
  id: string
  name: string
  createdAt: string
  companyName: string
  locationName: string
  lineItems: OrderLineItem[]
  notes: string
  shippingMethod: string
  subtotal: number
  gst: number
  total: number
  status: 'draft' | 'submitted'
}

export interface Order {
  id: string
  name: string
  createdAt: string
  totalPrice: string
  financialStatus: string
  fulfillmentStatus: string
  lineItemCount: number
}

export type ShippingMethod =
  | 'parcel_post'
  | 'express_post'
  | 'star_track'
  | ''
