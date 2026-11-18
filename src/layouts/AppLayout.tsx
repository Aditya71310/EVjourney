import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Box,
  CarFront,
  Compass,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  Settings,
  Smartphone,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useIntroStore } from '../store/introStore';
import { ResilientImage } from '../components/ResilientImage';
import { InstallPwaModal } from '../components/InstallPwaModal';
import { ToastBanner } from '../components/ToastBanner';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics & Cost', icon: BarChart3 },
  { to: '/journeys', label: 'My Journeys', icon: Compass },
  { to: '/discover', label: 'Discover', icon: Globe },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/garage', label: 'EV Garage', icon: CarFront },
  { to: '/studio-3d', label: '3D EV Studio', icon: Box },
  { to: '/profile', label: 'Profile', icon: UserIcon },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const replayIntro = useIntroStore((s) => s.replayIntro);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/dashboard')) return 'Dashboard';
    if (p.startsWith('/analytics')) return 'EV Analytics & Cost Lab';
    if (p.startsWith('/discover')) return 'Discover';
    if (p.startsWith('/search')) return 'Search';
    if (p.startsWith('/u/')) return 'Driver Profile';
    if (p === '/journeys/new') return 'New Journey';
    if (p.includes('/journeys/') && p.endsWith('/edit')) return 'Edit Journey';
    if (p.startsWith('/journeys/')) return 'Journey Detail';
    if (p.startsWith('/journeys')) return 'My Journeys';
    if (p === '/garage/new') return 'Add Vehicle';
    if (p.includes('/garage/') && p.endsWith('/edit')) return 'Edit Vehicle';
    if (p.startsWith('/garage')) return 'EV Garage';
    if (p.startsWith('/profile')) return 'Profile';
    if (p.startsWith('/settings')) return 'Settings';
    return 'EV Journey';
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="space-y-8">
        <Link
          to="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 text-[var(--text)] whitespace-nowrap shrink-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
            <Zap className="h-4 w-4" />
          </span>
          <span className="font-serif-display italic text-2xl tracking-tight">
            EV Journey
          </span>
        </Link>

        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--primary-bg)] text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            replayIntro();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
        >
          <Play className="h-4 w-4 text-[var(--primary)]" />
          <span>Replay Intro</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            setInstallOpen(true);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
        >
          <Smartphone className="h-4 w-4 text-[var(--primary)]" />
          <span>Install App (PWA)</span>
        </button>

        {user && (
          <>
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-colors"
            >
              <ResilientImage
                src={user.avatar}
                alt={user.name}
                fallbackType="avatar"
                className="h-9 w-9 rounded-full object-cover border border-[var(--border)] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {user.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  @{user.username}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex pb-16 lg:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-[var(--surface)] border-r border-[var(--border)] h-full">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 p-2 text-[var(--text-muted)]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md px-5 sm:px-8 h-14 sm:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] truncate">
              <span className="hidden sm:inline">EV Journey</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-[var(--text)] truncate">
                {getPageTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={replayIntro}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors"
            >
              <Play className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span>Replay Intro</span>
            </button>
            <button
              type="button"
              onClick={() => setInstallOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span>Install</span>
            </button>
            <Link
              to="/journeys/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Journey</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-[1280px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile 5-Tab Bottom Navigation Bar */}
      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex lg:hidden items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md h-14 px-2"
      >
        <NavLink
          to="/journeys"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Compass className="h-4 w-4" />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/discover"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Globe className="h-4 w-4" />
          <span>Discover</span>
        </NavLink>
        <Link
          to="/journeys/new"
          aria-label="Create new journey"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] shadow-md"
        >
          <Plus className="h-5 w-5" />
        </Link>
        <NavLink
          to="/search"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <UserIcon className="h-4 w-4" />
          <span>Profile</span>
        </NavLink>
      </nav>

      <InstallPwaModal open={installOpen} onClose={() => setInstallOpen(false)} />
      <ToastBanner />
    </div>
  );
}
