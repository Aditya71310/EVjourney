import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.onboardingCompleted ? from : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo@evjourney.app', 'Electric2026!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign into demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#FAFAFA]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF]">
              <Zap className="h-4 w-4" />
            </span>
            <span className="font-display text-lg">EV Journey</span>
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight pt-2">
            Welcome back
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Sign in to access your road trips, EV garage, and charging logs.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#2E2E33] bg-[#141417] p-6 sm:p-7 space-y-5"
        >
          {error && (
            <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-3 text-xs text-[#F87171]">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-[#A1A1AA]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@evjourney.app"
              className="w-full rounded-lg border border-[#2E2E33] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#2DD4BF] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-[#A1A1AA]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-[#2E2E33] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#2DD4BF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2E2E33]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#141417] px-3 text-[#A1A1AA]">or explore instantly</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleDemoSignIn}
            className="w-full rounded-lg border border-[#2E2E33] bg-[#1E1E22] px-4 py-2.5 text-sm font-medium text-[#FAFAFA] hover:border-[#2DD4BF]/50 transition-colors"
          >
            Sign in with Demo Driver Account
          </button>
        </form>

        <p className="text-center text-xs text-[#A1A1AA]">
          New to EV Journey?{' '}
          <Link to="/signup" className="font-medium text-[#2DD4BF] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
