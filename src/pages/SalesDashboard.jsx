import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const STATUS_COLORS = {
  lead: 'bg-gray-100 text-gray-700',
  interested: 'bg-blue-100 text-blue-700',
  booked: 'bg-yellow-100 text-yellow-700',
  wip: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-purple-100 text-purple-700'
}

const STATUS_LABELS = {
  lead: 'Lead',
  interested: 'Interested',
  booked: 'Booked',
  wip: 'In Progress',
  completed: 'Completed',
  closed: 'Closed'
}

export default function SalesDashboard({ profile }) {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [tempStatus, setTempStatus] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selected) {
      setTempStatus(selected.status)
      setNote('')
    }
  }, [selected])

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('sales_rep_id', profile.id)
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function handleSaveDetails() {
    setUpdating(true)
    try {
      let statusChanged = false

      if (tempStatus !== selected.status) {
        statusChanged = true
        await supabase
          .from('projects')
          .update({ status: tempStatus })
          .eq('id', selected.id)

        await supabase
          .from('project_updates')
          .insert({
            project_id: selected.id,
            user_id: profile.id,
            update_type: 'status_change',
            content: `Status changed to ${STATUS_LABELS[tempStatus]}`
          })
      }

      if (note.trim()) {
        await supabase
          .from('project_updates')
          .insert({
            project_id: selected.id,
            user_id: profile.id,
            update_type: 'note',
            content: note
          })
      }

      await fetchProjects()
      setSelected(null)
      setNote('')
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  // Project detail view
  if (selected) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => setSelected(null)} className="text-indigo-200 hover:text-white">
          ← Back
        </button>
        <h1 className="text-lg font-bold">{selected.customer_name}</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">

        {/* Customer Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Customer Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <a href={`tel:${selected.phone}`} className="text-indigo-600 font-medium">{selected.phone}</a>
            </div>
            {selected.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-800">{selected.email}</span>
              </div>
            )}
            {selected.address && (
              <div className="flex justify-between">
                <span className="text-gray-500">Address</span>
                <span className="text-gray-800 text-right ml-4">{selected.address}</span>
              </div>
            )}
            {selected.product_interest && (
              <div className="flex justify-between">
                <span className="text-gray-500">Interest</span>
                <span className="text-gray-800">{selected.product_interest}</span>
              </div>
            )}
          </div>
        </div>

        {/* Update Status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Update Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTempStatus(key)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition ${tempStatus === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Add Note */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Add Note</h2>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Add a note about this lead..."
          />
        </div>

        {/* Financial Info */}
        {(selected.total_value > 0 || selected.balance_due > 0) && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Financial</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Value</span>
                <span className="font-medium">₹{selected.total_value?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance Due</span>
                <span className="font-medium text-red-600">₹{selected.balance_due?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setSelected(null)}
            className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDetails}
            disabled={updating}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  // Main list view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">My Leads</h1>
          <p className="text-indigo-200 text-sm">{projects.length} assigned to you</p>
        </div>
        <button onClick={handleLogout} className="text-indigo-200 text-sm hover:text-white">
          Logout
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No leads assigned yet
          </div>
        ) : (
          projects.map(project => (
            <div
              key={project.id}
              onClick={() => setSelected(project)}
              className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{project.customer_name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{project.phone}</p>
                  {project.product_interest && (
                    <p className="text-gray-400 text-xs mt-1">{project.product_interest}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}