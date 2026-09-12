'use client'
import Image from 'next/image'

export type SidebarPage =
  | 'keys'
  | 'license'
  | 'analytics'
  | 'activity'
  | 'revenue'
  | 'settings'
  | 'admin'

export type Role = 'admin' | 'owner' | 'seller' | null

interface SidebarProps {
  activePage: SidebarPage
  onNavigate: (page: SidebarPage) => void
  role: Role
  onLogout: () => void
}

const Icons: Record<string, JSX.Element> = {
  keys: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  ),
  license: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 8h10M7 12h10M7 16h6"/>
    </svg>
  ),
  analytics: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-4 4 4 4-8"/>
    </svg>
  ),
  activity: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  revenue: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  admin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

interface MenuItem {
  id: SidebarPage
  label: string
  iconKey: string
  ownerOnly?: boolean      // hanya owner
  adminHidden?: boolean    // disembunyikan dari admin
  sellerHidden?: boolean   // disembunyikan dari seller
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'keys',      label: 'Keys',         iconKey: 'keys'                                              },
  { id: 'license',   label: 'License',      iconKey: 'license'                                           },
  { id: 'revenue',   label: 'Revenue',      iconKey: 'revenue',   sellerHidden: true                     },
  { id: 'analytics', label: 'Analytics',    iconKey: 'analytics', sellerHidden: true                     },
  { id: 'activity',  label: 'Activity Log', iconKey: 'activity',  sellerHidden: true                     },
  { id: 'settings',  label: 'Settings',     iconKey: 'settings',  sellerHidden: true, adminHidden: true   },
  { id: 'admin',     label: 'Owner Panel',  iconKey: 'admin',     ownerOnly: true                        },
]

function roleBadgeClass(role: Role) {
  if (role === 'owner')  return 'badge-white'
  if (role === 'seller') return 'badge-green'
  return 'badge-gray'
}

export default function Sidebar({ activePage, onNavigate, role, onLogout }: SidebarProps) {
  const visibleItems = MENU_ITEMS.filter(item => {
    if (item.ownerOnly && role !== 'owner') return false
    if (item.adminHidden && role === 'admin') return false
    if (item.sellerHidden && role === 'seller') return false
    return true
  })

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-img">
          <Image src="/logo.png" alt="REGS XD" width={36} height={36} style={{ objectFit: 'cover' }} />
        </div>
        <div>
          <div className="sidebar-logo-title">REGS XD</div>
          <div className="sidebar-logo-sub">{role === 'seller' ? 'Seller Panel' : 'DATABASE IOS'}</div>
        </div>
      </div>

      {/* Role badge */}
      {role && (
        <div className="sidebar-role-wrap">
          <span className={`badge ${roleBadgeClass(role)}`}
            style={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>
            {role}
          </span>
        </div>
      )}

      <div className="sidebar-divider" />

      {/* Nav items */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>
        {visibleItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-item${activePage === item.id ? ' sidebar-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-item-icon">{Icons[item.iconKey]}</span>
            <span className="sidebar-item-label">{item.label}</span>
            {activePage === item.id && <span className="sidebar-item-dot" />}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1 }} />
      <div className="sidebar-divider" />

      {/* Logout */}
      <div style={{ padding: '12px 10px' }}>
        <button className="sidebar-item sidebar-item--logout" onClick={onLogout}>
          <span className="sidebar-item-icon">{Icons.logout}</span>
          <span className="sidebar-item-label">Logout</span>
        </button>
      </div>
    </aside>
  )
}
