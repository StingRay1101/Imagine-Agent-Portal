import { useState } from 'react'
import type { NewCustomerInfo } from '../types'

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

interface Props {
  onSubmit: (info: NewCustomerInfo) => void
  onBack: () => void
}

export default function NewCustomerForm({ onSubmit, onBack }: Props) {
  const [form, setForm] = useState<NewCustomerInfo>({
    firstName: '',
    lastName: '',
    companyName: '',
    streetAddress: '',
    shopNumber: '',
    suburb: '',
    state: '',
    postcode: '',
    phone: '',
    email: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof NewCustomerInfo, string>>>({})

  function update(field: keyof NewCustomerInfo, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function validate(): boolean {
    const required: (keyof NewCustomerInfo)[] = [
      'firstName', 'lastName', 'companyName', 'streetAddress',
      'suburb', 'state', 'postcode', 'phone', 'email',
    ]
    const newErrors: Partial<Record<keyof NewCustomerInfo, string>> = {}

    for (const field of required) {
      if (!form[field].trim()) {
        newErrors[field] = 'Required'
      }
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email'
    }

    if (form.postcode && !/^\d{4}$/.test(form.postcode)) {
      newErrors.postcode = 'Must be 4 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) {
      onSubmit(form)
    }
  }

  function renderField(
    label: string,
    field: keyof NewCustomerInfo,
    options?: { required?: boolean; type?: string; placeholder?: string; half?: boolean }
  ) {
    const { required = true, type = 'text', placeholder } = options || {}
    return (
      <div className={options?.half ? '' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${
            errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          placeholder={placeholder || label}
        />
        {errors[field] && (
          <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">New Customer Details</h2>
          <p className="text-sm text-gray-500">Enter the stockist information for this order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Row */}
        <div className="grid grid-cols-2 gap-4">
          {renderField('First Name', 'firstName')}
          {renderField('Last Name', 'lastName')}
        </div>

        {/* Company */}
        {renderField('Company Name', 'companyName')}

        {/* Address */}
        {renderField('Delivery Street Address', 'streetAddress')}
        {renderField('Delivery Shop Number', 'shopNumber', { required: false, placeholder: 'Shop/Unit number (optional)' })}

        <div className="grid grid-cols-3 gap-4">
          {renderField('Suburb', 'suburb')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${
                errors.state ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.state && (
              <p className="text-red-500 text-xs mt-1">{errors.state}</p>
            )}
          </div>
          {renderField('Postcode', 'postcode', { placeholder: '0000' })}
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          {renderField('Phone Number', 'phone', { type: 'tel' })}
          {renderField('Email Address', 'email', { type: 'email' })}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Continue to Products
          </button>
        </div>
      </form>
    </div>
  )
}
