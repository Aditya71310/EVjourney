import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import api, { extractErrorMessage, uploadImageFile } from '../services/api';
import type { Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { VehicleSilhouette } from '../components/VehicleSilhouette';
import { useToastStore } from '../store/toastStore';
import evModels from '../data/ev-models.json';

const COLOUR_SWATCHES = [
  { name: 'Obsidian Black', hex: '#3F3F46' },
  { name: 'Pearl White', hex: '#E4E4E7' },
  { name: 'Stealth Grey', hex: '#94A3B8' },
  { name: 'Glaze Red', hex: '#DC2626' },
  { name: 'Ocean Blue', hex: '#3B82F6' },
  { name: 'Teal Mint', hex: '#2DD4BF' },
  { name: 'Gravity Gold', hex: '#F59E0B' },
];

const VEHICLE_PRESETS = [
  '/src/assets/images/ev_suv_garage_1794937948402.jpg',
  '/src/assets/images/ev_sedan_garage_1794937949633.jpg',
];

export function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('60');
  const [colour, setColour] = useState('Obsidian Black');
  const [nickname, setNickname] = useState('');
  const [photo, setPhoto] = useState(VEHICLE_PRESETS[0]);
  const [isDefault, setIsDefault] = useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing || !id) return;
    setLoading(true);
    api
      .get<{ vehicle: Vehicle }>(`/vehicles/${id}`)
      .then((res) => {
        const v = res.data.vehicle;
        setBrand(v.brand);
        setModel(v.model);
        setVariant(v.variant || '');
        setBatteryCapacity(String(v.batteryCapacity));
        setColour(v.colour || '');
        setNickname(v.nickname || '');
        setPhoto(v.photo || VEHICLE_PRESETS[0]);
        setIsDefault(v.isDefault);
      })
      .catch((err) => setError(extractErrorMessage(err, 'Unable to load vehicle.')))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  const handleSelectPreset = (idxStr: string) => {
    if (!idxStr) return;
    const item = evModels[Number(idxStr)];
    if (!item) return;
    setBrand(item.brand);
    setModel(item.model);
    setVariant(item.variant);
    setBatteryCapacity(String(item.batteryKwh));
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImageFile(file);
      setPhoto(url);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to upload vehicle photograph.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!brand.trim() || !model.trim() || !batteryCapacity) {
      setError('Brand, model, and battery capacity are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        brand: brand.trim(),
        model: model.trim(),
        variant: variant.trim(),
        batteryCapacity: Number(batteryCapacity),
        colour: colour.trim(),
        nickname: nickname.trim(),
        photo,
        isDefault,
      };
      if (isEditing && id) {
        await api.put(`/vehicles/${id}`, payload);
        pushToast(`${brand.trim()} ${model.trim()} updated`);
      } else {
        await api.post('/vehicles', payload);
        pushToast(`${brand.trim()} ${model.trim()} added to garage`);
      }
      navigate('/garage');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save vehicle.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-xl bg-[var(--surface)] animate-pulse" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/garage"
        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to EV Garage</span>
      </Link>

      <div className="space-y-1">
        <h1 className="font-serif-display italic text-3xl sm:text-4xl">
          {isEditing ? 'Edit Electric Vehicle' : 'Add Electric Vehicle'}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Pick from the EV directory or customize specs for accurate charging math.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-3">
          <label className="block text-xs font-medium text-[var(--text-muted)]">
            Vehicle Photograph
          </label>
          <div className="aspect-[4/3] max-h-60 w-full overflow-hidden rounded-xl border border-[var(--border)]">
            <ResilientImage
              src={photo}
              alt="Vehicle preview"
              fallbackType="vehicle"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {VEHICLE_PRESETS.map((preset, i) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPhoto(preset)}
                  className={`h-10 w-14 overflow-hidden rounded-md border ${
                    photo === preset
                      ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30'
                      : 'border-[var(--border)] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset}
                    alt={`EV preset ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-medium hover:border-[var(--primary)]">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Select from Seeded EV Models
            </label>
            <select
              defaultValue=""
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Choose an EV preset (optional)...</option>
              {evModels.map((ev, i) => (
                <option key={`${ev.brand}-${ev.model}-${ev.variant}`} value={i}>
                  {ev.brand} {ev.model} — {ev.variant} ({ev.batteryKwh} kWh)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Brand *
            </label>
            <input
              type="text"
              required
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Tata / BYD / Hyundai / Tesla"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Model *
            </label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Nexon.ev / Atto 3 / IONIQ 5"
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
              placeholder="Long Range AWD"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Battery Capacity (kWh) *
            </label>
            <input
              type="number"
              required
              min={5}
              max={300}
              step="0.1"
              value={batteryCapacity}
              onChange={(e) => setBatteryCapacity(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono tabular-nums focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Vehicle Colour
            </label>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {COLOUR_SWATCHES.map((sw) => (
                <button
                  key={sw.name}
                  type="button"
                  onClick={() => setColour(sw.name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                    colour.toLowerCase() === sw.name.toLowerCase()
                      ? 'border-[var(--primary)] bg-[var(--primary-bg)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span>{sw.name}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 p-4">
            <VehicleSilhouette
              model={model}
              colour={colour}
              batteryCapacity={Number(batteryCapacity) || undefined}
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
              placeholder="Nightrunner"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--primary)]"
          />
          <span>Set as default vehicle for new road trips</span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Link
            to="/garage"
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
}
