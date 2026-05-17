import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import SalesDashboard from './pages/SalesDashboard'
import ContractorForm from './pages/ContractorForm'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-lg">Loading...</p>
    </div>
  )

  if (!session) return <Login />

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Profile not found. Contact admin.</p>
    </div>
  )

  if (profile.role === 'admin') return <AdminDashboard profile={profile} />
  if (profile.role === 'sales') return <SalesDashboard profile={profile} />
  if (profile.role === 'contractor') return <ContractorForm profile={profile} />
}