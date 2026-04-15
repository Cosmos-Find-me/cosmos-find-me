'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '../../src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthWrapper from '../../src/components/AuthWrapper'
import { Users, Plus, LogOut, Settings, Trash2, FileUp, Download, Eye, RotateCcw, HelpCircle } from 'lucide-react'
import LLMSettingsModal from '../../src/components/LLMSettingsModal'
import ImportDataModal from '../../src/components/ImportDataModal'
import { DeleteUserConfirmationModal } from '../../src/components/DeleteUserConfirmationModal'
import { llmService } from '../../src/utils/llm/service'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: string
  profile_status: ProfileStatus
  company_count: number
}

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic'

// Profile status determines if user will see onboarding
type ProfileStatus = 'pending' | 'complete' | 'error' | null

// Helper to get onboarding status info
function getOnboardingStatus(profileStatus: ProfileStatus, hasData: boolean): {
  label: string
  color: string
  bgColor: string
  willOnboard: boolean
  tooltip: string
} {
  if (profileStatus === 'complete') {
    return {
      label: 'Complete',
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      willOnboard: false,
      tooltip: 'User has completed onboarding and will go directly to the explorer'
    }
  } else if (profileStatus === 'error') {
    return {
      label: 'Error',
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      willOnboard: true,
      tooltip: 'Onboarding failed - user will retry on next login'
    }
  } else if (profileStatus === 'pending') {
    return {
      label: 'Pending',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      willOnboard: true,
      tooltip: 'User will see onboarding flow on next login'
    }
  } else {
    // null or undefined - new user
    return {
      label: hasData ? 'Legacy' : 'New',
      color: hasData ? 'text-blue-800' : 'text-slate-800',
      bgColor: hasData ? 'bg-blue-100' : 'bg-slate-100',
      willOnboard: !hasData, // Legacy users with data skip onboarding
      tooltip: hasData
        ? 'Legacy user with existing data - will skip onboarding'
        : 'New user - will see onboarding on first login'
    }
  }
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [showLLMSettings, setShowLLMSettings] = useState(false)
  const [llmConfigured, setLLMConfigured] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const router = useRouter()

  useEffect(() => {
    fetchUsers()
    setLLMConfigured(llmService.isConfigured())
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json() as { users?: AdminUser[]; error?: string }

      if (response.ok) {
        setUsers(data.users ?? [])
      } else {
        setMessage(data.error ?? 'Failed to fetch users')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to fetch users')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName
        })
      })

      const data = await response.json() as { inviteLink?: string; error?: string }

      if (response.ok && data.inviteLink) {
        setMessage(`Invitation sent! Share this link: ${data.inviteLink}`)
        setMessageType('success')
        setInviteEmail('')
        setInviteName('')
        fetchUsers()
      } else {
        setMessage(data.error ?? 'Failed to send invitation')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to send invitation')
      setMessageType('error')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClientComponentClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const handleImportData = (userId: string, userEmail: string) => {
    setSelectedUser({ id: userId, email: userEmail })
    setShowImportModal(true)
  }

  const handleExportData = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/admin/export-user-data/${userId}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${userEmail.split('@')[0]}-companies-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage('Data exported successfully!')
        setMessageType('success')
      } else {
        const data = await response.json() as { error?: string }
        setMessage(data.error ?? 'Failed to export data')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to export data')
      setMessageType('error')
    }
  }

  const handleViewAsUser = (userId: string) => {
    const viewUrl = `/?viewAsUserId=${userId}`
    window.open(viewUrl, '_blank')
  }

  const handleDeleteUser = (userId: string, userEmail: string) => {
    setUserToDelete({ id: userId, email: userEmail })
    setShowDeleteModal(true)
  }

  const handleResetOnboarding = async (userId: string, userEmail: string) => {
    if (!confirm(`Reset onboarding for ${userEmail}?\n\nThis will:\n• Clear all their companies and preferences\n• Reset their profile status to 'pending'\n• They will see the onboarding flow on next login`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/reset-user-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json() as { error?: string }

      if (response.ok) {
        setMessage(`Onboarding reset for ${userEmail}`)
        setMessageType('success')
        fetchUsers()
      } else {
        setMessage(data.error ?? 'Failed to reset onboarding')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error)
      setMessage('Failed to reset onboarding')
      setMessageType('error')
    }
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json() as { error?: string }

      if (response.ok) {
        setMessage('User deleted successfully!')
        setMessageType('success')
        setShowDeleteModal(false)
        setUserToDelete(null)
        fetchUsers()
      } else {
        setMessage(data.error ?? 'Failed to delete user')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to delete user')
      setMessageType('error')
    } finally {
      setIsDeleting(false)
    }
  }


  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-y-auto" style={{ height: '100dvh', maxHeight: '100dvh' }}>
        {/* Header */}
        <header className="bg-white/60 backdrop-blur-sm shadow-sm border-b border-blue-200/40">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                  <p className="text-slate-600 mt-1">Manage users and system configuration</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-white/60 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg border ${
              messageType === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* LLM Settings */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">LLM Configuration</h2>
                  <p className="text-sm text-slate-600">Configure AI provider for all users</p>
                </div>
              </div>
              {llmConfigured && (
                <div className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-full flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="font-medium">{llmService.getSettings().provider.toUpperCase()} Configured</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div>
                <p className="text-slate-700 mb-1">
                  <span className="font-medium">Current Provider:</span> {llmConfigured ? llmService.getSettings().provider.charAt(0).toUpperCase() + llmService.getSettings().provider.slice(1) : 'Not configured'}
                </p>
                {llmConfigured && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Model:</span> {llmService.getSettings().model}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowLLMSettings(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
              >
                {llmConfigured ? 'Update Settings' : 'Configure LLM'}
              </button>
            </div>
          </div>

          {/* Invite User */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Plus className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Invite New User</h2>
            </div>
            
            <form onSubmit={handleInviteUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                required
              />
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                required
              />
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-slate-900">Users</h2>
              </div>

              {/* Actions Legend */}
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Actions:</span>
                <div className="flex items-center space-x-3 ml-2">
                  <span className="flex items-center space-x-1">
                    <FileUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>Import</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Download className="w-3.5 h-3.5 text-green-600" />
                    <span>Export</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                    <span>View As</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                    <span>Reset Onboarding</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete</span>
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Onboarding</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Data</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      // Use company_count from API (counts actual companies in JSON)
                      const companyCount = user.company_count || 0
                      const hasData = companyCount > 0
                      const onboardingStatus = getOnboardingStatus(user.profile_status, hasData)

                      return (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-white/40">
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">{user.full_name || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${onboardingStatus.bgColor} ${onboardingStatus.color}`}
                                title={onboardingStatus.tooltip}
                              >
                                {onboardingStatus.label}
                              </span>
                              {onboardingStatus.willOnboard && (
                                <span className="text-xs text-orange-600" title="Will see onboarding on next login">
                                  → Onboard
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {hasData ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                {companyCount} {companyCount === 1 ? 'company' : 'companies'}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                                No data
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.role !== 'admin' && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleImportData(user.id, user.email)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Import companies from JSON file"
                                >
                                  <FileUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleExportData(user.id, user.email)}
                                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                  title="Export user's companies to JSON"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleViewAsUser(user.id)}
                                  className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                                  title="View the app as this user (opens in new tab)"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResetOnboarding(user.id, user.email)}
                                  className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                                  title="Reset onboarding - clears all data and shows onboarding on next login"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Permanently delete this user and all their data"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="text-center py-8 text-slate-600">
                    No users found. Start by inviting your first user!
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* LLM Settings Modal */}
        {showLLMSettings && (
          <LLMSettingsModal
            isOpen={showLLMSettings}
            onClose={() => setShowLLMSettings(false)}
            onSettingsUpdated={() => {
              setLLMConfigured(llmService.isConfigured())
              setMessage('LLM settings updated successfully')
              setMessageType('success')
            }}
          />
        )}

        {/* Import Data Modal */}
        {showImportModal && selectedUser && (
          <ImportDataModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false)
              setSelectedUser(null)
            }}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            onImportSuccess={() => {
              setMessage('Data imported successfully!')
              setMessageType('success')
              fetchUsers()
            }}
          />
        )}

        {/* Delete User Confirmation Modal */}
        {userToDelete && (
          <DeleteUserConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false)
              setUserToDelete(null)
            }}
            onConfirm={confirmDeleteUser}
            userEmail={userToDelete.email}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </AuthWrapper>
  )
}