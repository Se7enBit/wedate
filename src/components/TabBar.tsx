import { Clock, Compass, Heart, Sparkles, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { strings } from '../strings.ts'

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: strings.tabs.discover, icon: Compass },
  { to: '/now', label: strings.tabs.now, icon: Clock },
  { to: '/create', label: strings.tabs.create, icon: Sparkles },
  { to: '/saved', label: strings.tabs.saved, icon: Heart },
]

export default function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-gold' : 'text-text-muted hover:text-text'
                }`
              }
            >
              <Icon size={22} aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
