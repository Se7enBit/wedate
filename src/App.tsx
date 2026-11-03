import { Settings } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import TabBar from './components/TabBar.tsx'
import { strings } from './strings.ts'

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        <Link to="/" className="font-display text-xl font-semibold text-gold">
          {strings.appName}
        </Link>
        <Link
          to="/settings"
          aria-label={strings.settings.open}
          className="flex size-11 items-center justify-center rounded-full text-text-muted transition-colors duration-200 hover:text-text"
        >
          <Settings size={22} aria-hidden />
        </Link>
      </header>
      <main className="flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
