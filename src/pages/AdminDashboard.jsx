import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import AddLeadModal from '../components/AddLeadModal'
import UserManagement from '../components/UserManagement'

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

export default function AdminDashboard({ profile }) {
  const [projects, setProjects] = useState([])
  const [salesPeople, setSalesPeople] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [note, setNote] = useState('')
  const [updates, setUpdates] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAddLead, setShowAddLead] = useState(false)
  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [tempStatus, setTempStatus] = useState('')
  const [tempSalesRepId, setTempSalesRepId] = useState('')

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (selected) {
      setTempStatus(selected.status)
      setTempSalesRepId(selected.sales_rep_id || '')
      setNote('')
      fetchUpdates(selected.id)
    }
  }, [selected])

  async function fetchAll() {
    const [{ data: projects }, { data: sales }] = await Promise.all([
      supabase.from('projects').select('*, sales_rep:profiles!sales_rep_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'sales')
    ])
    setProjects(projects || [])
    setSalesPeople(sales || [])
    setLoading(false)
  }

  async function fetchUpdates(projectId) {
    const { data } = await supabase
      .from('project_updates')
      .select('*, user:profiles!user_id(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setUpdates(data || [])
  }

  async function assignSales(projectId, salesId) {
    setUpdating(true)
    await supabase.from('projects').update({ sales_rep_id: salesId }).eq('id', projectId)
    await fetchAll()
    setUpdating(false)
  }

  async function updateStatus(projectId, newStatus) {
    setUpdating(true)
    await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
    await supabase.from('project_updates').insert({
      project_id: projectId,
      user_id: profile.id,
      update_type: 'status_change',
      content: `Status changed to ${STATUS_LABELS[newStatus]}`
    })
    await fetchAll()
    setSelected(prev => ({ ...prev, status: newStatus }))
    setUpdating(false)
  }

  async function addNote(projectId) {
    if (!note.trim()) return
    setUpdating(true)
    await supabase.from('project_updates').insert({
      project_id: projectId,
      user_id: profile.id,
      update_type: 'note',
      content: note
    })
    setNote('')
    await fetchUpdates(projectId)
    setUpdating(false)
  }

  async function handleSaveDetails() {
    setUpdating(true)
    try {
      const updatesObj = {}
      let statusChanged = false
      let salesRepChanged = false

      if (tempStatus !== selected.status) {
        updatesObj.status = tempStatus
        statusChanged = true
      }
      if (tempSalesRepId !== (selected.sales_rep_id || '')) {
        updatesObj.sales_rep_id = tempSalesRepId || null
        salesRepChanged = true
      }

      if (statusChanged || salesRepChanged) {
        await supabase.from('projects').update(updatesObj).eq('id', selected.id)
      }

      if (statusChanged) {
        await supabase.from('project_updates').insert({
          project_id: selected.id,
          user_id: profile.id,
          update_type: 'status_change',
          content: `Status changed to ${STATUS_LABELS[tempStatus]}`
        })
      }

      if (note.trim()) {
        await supabase.from('project_updates').insert({
          project_id: selected.id,
          user_id: profile.id,
          update_type: 'note',
          content: note
        })
        setNote('')
      }

      await fetchAll()
      setSelected(null)
      setUpdates([])
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  function exportCSV() {
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Interest', 'Status', 'Total Value', 'Balance Due', 'Payment Status', 'Created At']
    const rows = filteredProjects.map(p => [
      p.customer_name, p.phone, p.email || '', p.address || '',
      p.product_interest || '', p.status, p.total_value || 0,
      p.balance_due || 0, p.payment_status,
      new Date(p.created_at).toLocaleDateString()
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-export-${new Date().toLocaleDateString()}.csv`
    a.click()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const stats = {
    total: projects.length,
    leads: projects.filter(p => p.status === 'lead').length,
    inProgress: projects.filter(p => ['interested', 'booked', 'wip'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
    closed: projects.filter(p => p.status === 'closed').length,
    totalValue: projects.reduce((sum, p) => sum + (p.total_value || 0), 0)
  }

  const filteredProjects = projects
    .filter(p => activeTab === 'all' || p.status === activeTab)
    .filter(p => {
      if (!search) return true
      return (
        p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
      )
    })
    .filter(p => {
      if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(p.created_at) > new Date(dateTo)) return false
      return true
    })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  if (selected) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => { setSelected(null); setUpdates([]) }} className="text-indigo-200 hover:text-white">
          ← Back
        </button>
        <h1 className="text-lg font-bold">{selected.customer_name}</h1>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Customer Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <a href={`tel:${selected.phone}`} className="text-indigo-600 font-medium">{selected.phone}</a>
            </div>
            {selected.email && <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{selected.email}</span></div>}
            {selected.address && <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-right ml-4">{selected.address}</span></div>}
            {selected.product_interest && <div className="flex justify-between"><span className="text-gray-500">Interest</span><span>{selected.product_interest}</span></div>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Assign to Sales</h2>
          <select
            onChange={e => setTempSalesRepId(e.target.value)}
            value={tempSalesRepId}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Unassigned</option>
            {salesPeople.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTempStatus(key)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition ${tempStatus === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Financial</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total Value</span><span className="font-medium">₹{(selected.total_value || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Balance Due</span><span className="font-medium text-red-600">₹{(selected.balance_due || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment Status</span><span className="font-medium capitalize">{selected.payment_status}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Add Note</h2>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Add a note..."
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">Activity Log</h2>
            <button onClick={() => fetchUpdates(selected.id)} className="text-indigo-600 text-sm">Refresh</button>
          </div>
          {updates.length === 0 ? (
            <p className="text-gray-400 text-sm">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {updates.map(u => (
                <div key={u.id} className="text-sm border-l-2 border-indigo-200 pl-3">
                  <p className="text-gray-800">{u.content}</p>
                  <p className="text-gray-400 text-xs mt-1">{u.user?.full_name} — {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setSelected(null); setUpdates([]) }}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
          <p className="text-indigo-200 text-sm">Welcome, {profile.full_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="bg-white text-indigo-600 text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-50 transition">
            Export CSV
          </button>
          <button onClick={() => setShowUserMgmt(true)} className="bg-white text-indigo-600 text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-50 transition">Team</button>
          <button onClick={() => setShowAddLead(true)} className="bg-white text-indigo-600 text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-50 transition">Add Lead</button>
          <button onClick={handleLogout} className="text-indigo-100 text-xs sm:text-sm px-2 py-1.5 hover:text-white transition">Logout</button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">New Leads</p>
          <p className="text-3xl font-bold text-blue-600">{stats.leads}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">In Progress</p>
          <p className="text-3xl font-bold text-orange-500">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm col-span-2 md:col-span-4">
          <p className="text-gray-500 text-sm">Total Pipeline Value</p>
          <p className="text-3xl font-bold text-indigo-600">₹{stats.totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="px-4 max-w-4xl mx-auto mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Pipeline Overview</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Leads', value: stats.leads },
                { name: 'In Progress', value: stats.inProgress },
                { name: 'Completed', value: stats.completed },
                { name: 'Closed', value: stats.closed }
              ]}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Status Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Lead', value: stats.leads },
                    { name: 'In Progress', value: stats.inProgress },
                    { name: 'Completed', value: stats.completed },
                    { name: 'Closed', value: stats.closed }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {['#6366f1', '#f97316', '#22c55e', '#a855f7'].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {[
                { name: 'Lead', color: '#6366f1', value: stats.leads },
                { name: 'In Progress', color: '#f97316', value: stats.inProgress },
                { name: 'Completed', color: '#22c55e', value: stats.completed },
                { name: 'Closed', color: '#a855f7', value: stats.closed }
              ].filter(d => d.value > 0).map(item => (
                <div key={item.name} className="flex items-center gap-1 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-4xl mx-auto mb-3 space-y-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="px-4 max-w-4xl mx-auto mb-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[['all', 'All'], ...Object.entries(STATUS_LABELS)].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap font-medium transition ${activeTab === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No projects found</div>
        ) : (
          filteredProjects.map(project => (
            <div
              key={project.id}
              onClick={() => setSelected(project)}
              className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{project.customer_name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{project.phone}</p>
                  <p className="text-gray-400 text-xs mt-1">{project.sales_rep?.full_name || 'Unassigned'}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
              {project.total_value > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">₹{project.total_value.toLocaleString()}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddLead && (
        <AddLeadModal
          salesPeople={salesPeople}
          onClose={() => setShowAddLead(false)}
          onSuccess={() => { setShowAddLead(false); fetchAll() }}
        />
      )}

      {showUserMgmt && (
        <UserManagement onClose={() => setShowUserMgmt(false)} />
      )}
    </div>
  )
}