import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function UserManagement({ onClose }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'sales'
    })

    useEffect(() => { fetchUsers() }, [])

    async function fetchUsers() {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
        setUsers(data || [])
        setLoading(false)
    }

    async function handleAddUser(e) {
        e.preventDefault()
        setAdding(true)
        setError('')

        const { data, error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password
        })

        if (error) {
            setError(error.message)
            setAdding(false)
            return
        }

        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: form.full_name,
                role: form.role
            })
        }

        setForm({ full_name: '', email: '', password: '', role: 'sales' })
        setShowForm(false)
        await fetchUsers()
        setAdding(false)
    }

    async function updateRole(userId, newRole) {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
        await fetchUsers()
    }

    const ROLE_COLORS = {
        admin: 'bg-purple-100 text-purple-700',
        sales: 'bg-blue-100 text-blue-700',
        contractor: 'bg-green-100 text-green-700'
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

                <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Team Members</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="p-6">

                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 mb-4"
                        >
                            Add New Member
                        </button>
                    ) : (
                        <form onSubmit={handleAddUser} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                            <h3 className="font-medium text-gray-700">New Team Member</h3>

                            <input type="text" placeholder="Full name" value={form.full_name}
                                onChange={e => setForm({ ...form, full_name: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required />

                            <input type="email" placeholder="Email" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required />

                            <input type="password" placeholder="Password" value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required />

                            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="sales">Sales</option>
                                <option value="contractor">Contractor</option>
                                <option value="admin">Admin</option>
                            </select>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={adding}
                                    className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                                    {adding ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    )}

                    {loading ? (
                        <p className="text-gray-400 text-sm text-center py-4">Loading...</p>
                    ) : (
                        <div className="space-y-3">
                            {users.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{user.full_name}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <select
                                        value={user.role}
                                        onChange={e => updateRole(user.id, e.target.value)}
                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="sales">Sales</option>
                                        <option value="contractor">Contractor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}