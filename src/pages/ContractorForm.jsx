import { useState } from 'react'
import { supabase } from '../supabase'

export default function ContractorForm({ profile }) {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        customer_name: '',
        phone: '',
        email: '',
        address: '',
        product_interest: '',
        notes: ''
    })

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await supabase
            .from('projects')
            .insert({
                ...form,
                status: 'lead'
            })

        if (error) setError(error.message)
        else {
            setSuccess(true)
            setForm({
                customer_name: '',
                phone: '',
                email: '',
                address: '',
                product_interest: '',
                notes: ''
            })
            setTimeout(() => setSuccess(false), 3000)
        }
        setLoading(false)
    }

    async function handleLogout() {
        await supabase.auth.signOut()
    }

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Header */}
            <div className="bg-indigo-600 text-white px-4 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold">Submit Lead</h1>
                    <p className="text-indigo-200 text-sm">Welcome, {profile.full_name}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-indigo-200 text-sm hover:text-white"
                >
                    Logout
                </button>
            </div>

            {/* Form */}
            <div className="p-4 max-w-lg mx-auto">
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
                        Lead submitted successfully!
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name *
                        </label>
                        <input
                            type="text"
                            name="customer_name"
                            value={form.customer_name}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Full name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="+91 XXXXX XXXXX"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="optional"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Customer address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product / Service Interest
                        </label>
                        <input
                            type="text"
                            name="product_interest"
                            value={form.product_interest}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="What are they interested in?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Any additional info..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white rounded-lg px-4 py-4 font-medium hover:bg-indigo-700 transition disabled:opacity-50 text-lg"
                    >
                        {loading ? 'Submitting...' : 'Submit Lead'}
                    </button>
                </form>
            </div>
        </div>
    )
}