'use client'
import { useRouter } from 'next/navigation'
import Sidebar, { SidebarPage, Role } from './Sidebar'

interface DashboardLayoutProps {
  activePage: SidebarPage
  onNavigate: (page: SidebarPage) => void
  role: Role
  children: React.ReactNode
}

export default function DashboardLayout({ activePage, onNavigate, role, children }: DashboardLayoutProps) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        role={role}
        onLogout={logout}
      />
      <div className="app-main">
        {children}
      </div>
    </div>
  )
}
