import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, LogOut, Moon, Play, Sun, Trash2, Upload } from 'lucide-react';
import api, { extractErrorMessage, uploadImageFile } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useIntroStore } from '../store/introStore';
import type { CoverScene, User } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { getSceneGradient } from '../utils/formatters';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, theme, setTheme, setUser, logout } = useAuthStore();
  const replayIntro = useIntroStore((s) => s.replayIntro);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [coverScene, setCoverScene] = useState<CoverScene>(
    user?.coverScene || 'sunset'
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImageFile(file);
      setAvatar(url);
    } catch (err) {
      setError(extractErrorMessage(err, 'Avatar upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      const res = await api.put<{ user: User }>('/users/profile', {
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
        city: city.trim(),
        country: country.trim(),
        avatar,
        coverScene,
      });
      setUser(res.data.user);
      setMessage('Profile settings updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save profile settings.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleThemeSwitch = async (nextTheme: 'dark' | 'light' | 'system') => {
    setTheme(nextTheme);
    try {
      const res = await api.put<{ user: User }>('/users/profile', { theme: nextTheme });
      setUser(res.data.user);
    } catch {
      // Theme still applies locally
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!currentPassword || newPassword.length < 6) {
      setError('Enter your current password and a new password of at least 6 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/profile', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password updated successfully.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setError('');
    try {
      await api.delete('/users/account');
      logout();
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete account.'));
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your profile identity, appearance, and account security.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-[var(--primary)]/40 bg-[var(--primary-bg)]/40 px-4 py-3 text-xs text-[var(--primary)]">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Edit Profile & Cover Scene */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5"
      >
        <h2 className="text-base font-semibold text-[var(--text)]">Profile Identity</h2>

        <div className="flex items-center gap-4">
          <ResilientImage
            src={avatar}
            alt={name}
            fallbackType="avatar"
            className="h-16 w-16 rounded-full object-cover border border-[var(--border)]"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-medium hover:border-[var(--primary)]">
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? 'Uploading...' : 'Change Avatar'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="sr-only"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-[var(--text-muted)]">
            Public Profile Cover Scene
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['sunset', 'coast', 'forest'] as const).map((scene) => (
              <button
                key={scene}
                type="button"
                onClick={() => setCoverScene(scene)}
                className={`rounded-xl border p-2 text-left transition-all ${
                  coverScene === scene
                    ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/25'
                    : 'border-[var(--border)] opacity-80 hover:opacity-100'
                }`}
              >
                <div
                  className={`h-10 rounded-lg bg-gradient-to-br ${getSceneGradient(
                    scene
                  )}`}
                />
                <div className="mt-1.5 text-xs font-medium capitalize text-[var(--text)]">
                  {scene}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Appearance (Light / Dark / Auto) */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Appearance</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Switch seamlessly between Light, Dark, or Auto system theme.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1 w-fit">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'Auto', icon: Laptop },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleThemeSwitch(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  theme === id
                    ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={replayIntro}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            <Play className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Replay Startup Intro</span>
          </button>
        </div>
      </section>

      {/* Account Password, Logout & Delete */}
      <form
        onSubmit={handleUpdatePassword}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5"
      >
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Account Security</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Signed in as {user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              New Password
            </label>
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--danger)]/40 px-4 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete account</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-xl bg-[var(--text)] px-5 py-2 text-xs font-semibold text-[var(--bg)] disabled:opacity-50"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>

        {deleteConfirmOpen && (
          <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 space-y-3">
            <p className="text-xs text-[var(--danger)] font-medium">
              Are you sure? Deleting your account removes all vehicles, journeys, timeline
              events, and charging records permanently.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="rounded-lg bg-[var(--danger)] px-4 py-1.5 text-xs font-semibold text-white"
              >
                {deletingAccount ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>

      <p className="text-center font-serif-display italic text-xl text-[var(--text-muted)] pt-2">
        Made with care.
      </p>
    </div>
  );
}
