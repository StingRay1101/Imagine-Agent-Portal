import { useState, useEffect } from 'react'
import { getOrderHistory } from '../api'
import type { CompanyLocation, Order } from '../types'

interface Props {
  location: CompanyLocation
}

export default function CompanyDetails({ location }: Props) {
  const [showHistory, setShowHistory] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    setShowHistory(false)
    setOrders([])
  }, [location.id])

  async function toggleHistory() {
    if (!showHistory && orders.length === 0) {
      setLoadingOrders(true)
      try {
        const data = await getOrderHistory(location.companyId)
        setOrders(data)
      } catch {
        setOrders([])
      }
      setLoadingOrders(false)
    }
    setShowHistory(!showHistory)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Company & Location Details
      </h2>
      <div className="space-y-1 text-sm">
        <div className="font-semibold text-gray-900">{location.companyName}</div>
        <div className="text-gray-700">{location.locationName}</div>
        <div className="text-gray-500">{location.address}</div>
        {location.contactName && (
          <div className="text-gray-600 pt-1">
            Contact: {location.contactName}
          </div>
        )}
        {location.contactEmail && (
          <div className="text-gray-500">{location.contactEmail}</div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">Order History</span>
        <button
          onClick={toggleHistory}
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          {showHistory ? 'Hide' : 'Show'}
        </button>
      </div>

      {loadingOrders && (
        <div className="mt-2 text-sm text-gray-500">Loading orders...</div>
      )}

      {showHistory && orders.length > 0 && (
        <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Order</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-3 py-2 text-gray-900">{order.name}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && !loadingOrders && orders.length === 0 && (
        <div className="mt-2 text-sm text-gray-500">No order history found</div>
      )}
    </div>
  )
}
