import { Settings } from 'lucide-react'
import { Link, Outlet, ScrollRestoration } from 'react-router'
import TabBar from './components/TabBar.tsx'
import { strings } from './strings.ts'

// Keeps content clear of the notch when the phone is sideways.
const sidePadding = 'pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]'

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      {/* The iOS status bar is translucent: this stops scrolled content sliding under the clock. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-20 h-[env(safe-area-inset-top)] bg-bg" />
      <header className={`flex items-center justify-between pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 ${sidePadding}`}>
        <Link to="/" className="inline-flex min-h-11 items-center font-display text-xl font-semibold text-gold">
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
      <main className={`flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] ${sidePadding}`}>
        <Outlet />
      </main>
      <TabBar />
      <ScrollRestoration />
    </div>
  )
}
