import { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useIntroStore } from './store/introStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { IntroAnimation } from './components/IntroAnimation';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/SignUpPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MyJourneysPage } from './pages/MyJourneysPage';
import { JourneyFormPage } from './pages/JourneyFormPage';
import { JourneyDetailsPage } from './pages/JourneyDetailsPage';
import { GaragePage } from './pages/GaragePage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { SearchPage } from './pages/SearchPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { Studio3DPage } from './pages/Studio3DPage';

function PublicOrAppShell() {
  const { user, initializing } = useAuthStore();

  if (initializing) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="h-3 w-36 rounded bg-[var(--surface-2)] animate-pulse" />
      </div>
    );
  }

  if (user) {
    return <AppLayout />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-serif-display italic text-2xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
              <Zap className="h-4 w-4" />
            </span>
            <span>EV Journey</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/discover" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
              Discover
            </Link>
            <Link to="/search" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
              Search
            </Link>
            <Link to="/login" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-fg)]"
            >
              Start Your Journey
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 sm:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const { showIntro, playId, forceFull, completeIntro } = useIntroStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <>
      {showIntro && (
        <IntroAnimation
          key={playId}
          onComplete={completeIntro}
          forceFull={forceFull}
        />
      )}
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Routes accessible both signed-in (AppLayout) and public */}
        <Route element={<PublicOrAppShell />}>
          <Route path="/journeys/:id" element={<JourneyDetailsPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/u/:handle" element={<PublicProfilePage />} />
          <Route path="/u/:handle/connections" element={<ConnectionsPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/studio-3d" element={<Studio3DPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/journeys" element={<MyJourneysPage />} />
            <Route path="/journeys/new" element={<JourneyFormPage />} />
            <Route path="/journeys/:id/edit" element={<JourneyFormPage />} />
            <Route path="/garage" element={<GaragePage />} />
            <Route path="/garage/new" element={<VehicleFormPage />} />
            <Route path="/garage/:id/edit" element={<VehicleFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}
