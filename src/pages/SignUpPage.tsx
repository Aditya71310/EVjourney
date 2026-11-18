import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function SignUpPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please complete all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
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
            Create your driver account
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Start documenting your electric road trips, charging stops, and vehicles.
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
            <label htmlFor="name" className="block text-xs font-medium text-[#A1A1AA]">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rohan Deshmukh"
              className="w-full rounded-lg border border-[#2E2E33] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#2DD4BF] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-xs font-medium text-[#A1A1AA]">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="rohan_drives"
              className="w-full rounded-lg border border-[#2E2E33] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#2DD4BF] focus:outline-none"
            />
          </div>

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
              placeholder="rohan@example.com"
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-[#2E2E33] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#2DD4BF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-[#A1A1AA]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#2DD4BF] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
