export interface CompanyLocation {
  id: string
  companyId: string
  companyContactId: string
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
  incomingQuantity?: number
  discountPercentage?: number
  available: boolean
}

export interface OrderLineItem {
  variantId: string
  title: string
  sku: string
  price: number
  gst: number
  quantity: number
  maxQuantity: number
  imageUrl: string | null
}

export interface DraftOrder {
  id: string
  name: string
  createdAt: string
  companyLocationId: string
  companyId: string
  companyContactId: string
  companyName: string
  locationName: string
  newCustomer?: NewCustomerInfo | null
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
  | 'free_shipping'
  | ''

// New Customer types
export interface NewCustomerInfo {
  firstName: string
  lastName: string
  companyName: string
  streetAddress: string
  shopNumber: string
  suburb: string
  state: string
  postcode: string
  phone: string
  email: string
}

// Admin types
export interface Sale {
  id: string
  tag: string
  percentage: number
  active: boolean
}

export interface AdminSettings {
  productTags: string[]
  sales: Sale[]
}
