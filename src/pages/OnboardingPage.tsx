import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarFront, Check, MapPin, Zap } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';
import evModels from '../data/ev-models.json';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || 'India');
  const [bio, setBio] = useState(user?.bio || '');

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('45');
  const [colour, setColour] = useState('Obsidian Black');
  const [nickname, setNickname] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSelectPreset = (idxStr: string) => {
    if (!idxStr) return;
    const item = evModels[Number(idxStr)];
    if (!item) return;
    setBrand(item.brand);
    setModel(item.model);
    setVariant(item.variant);
    setBatteryCapacity(String(item.batteryKwh));
  };

  const handleSaveProfileStep = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.put<{ user: User }>('/users/profile', {
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
      });
      setUser(res.data.user);
      setStep(2);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const finishOnboarding = async (skipVehicle = false) => {
    setError('');
    setSaving(true);
    try {
      if (!skipVehicle) {
        if (!brand.trim() || !model.trim() || !batteryCapacity) {
          setError('Please select or enter vehicle brand, model, and battery capacity.');
          setSaving(false);
          return;
        }
        await api.post('/vehicles', {
          brand: brand.trim(),
          model: model.trim(),
          variant: variant.trim(),
          batteryCapacity: Number(batteryCapacity),
          colour: colour.trim(),
          nickname: nickname.trim(),
          photo: '/src/assets/images/ev_suv_garage_1794937948402.jpg',
          isDefault: true,
        });
      }

      const res = await api.put<{ user: User }>('/users/profile', {
        onboardingCompleted: true,
      });
      setUser(res.data.user);
      navigate('/journeys', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
              <Zap className="h-4 w-4" />
            </span>
            <span className="font-serif-display italic text-2xl">EV Journey</span>
          </div>
          <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
            Step {step} of 2
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form
            onSubmit={handleSaveProfileStep}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 space-y-6"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--primary)]">
                <MapPin className="h-3.5 w-3.5" />
                <span>Driver Identity</span>
              </div>
              <h1 className="font-serif-display italic text-3xl sm:text-4xl">
                Every drive. A story worth keeping.
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Add your home city and bio for your EV Journey profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mumbai"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
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
                  placeholder="India"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-muted)]">
                Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Weekend mountain wanderer · coastal routes and espresso stops..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Continue to Garage'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--primary)]">
                <CarFront className="h-3.5 w-3.5" />
                <span>Your First EV</span>
              </div>
              <h1 className="font-serif-display italic text-3xl">
                Add your primary electric vehicle
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Pick from popular EVs or enter custom specs for accurate charging math.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-muted)]">
                Quick EV Model Picker
              </label>
              <select
                defaultValue=""
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
              >
                <option value="">Choose from 40 EV models (optional)...</option>
                {evModels.map((ev, i) => (
                  <option key={`${ev.brand}-${ev.model}-${ev.variant}`} value={i}>
                    {ev.brand} {ev.model} — {ev.variant} ({ev.batteryKwh} kWh)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Brand *
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Tata / MG / Hyundai"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Model *
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Nexon.ev / ZS EV"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Variant
                </label>
                <input
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder="Empowered+ LR"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Battery Capacity (kWh) *
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  step="0.1"
                  value={batteryCapacity}
                  onChange={(e) => setBatteryCapacity(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono tabular-nums focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Colour
                </label>
                <input
                  type="text"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Silent Horizon"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => finishOnboarding(true)}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Skip for now
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => finishOnboarding(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Vehicle & Start'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
