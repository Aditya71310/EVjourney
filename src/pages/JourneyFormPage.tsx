import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Route, Upload } from 'lucide-react';
import api, { extractErrorMessage, uploadImageFile } from '../services/api';
import type { Journey, JourneyStatus, JourneyVisibility, Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { LocationPicker, haversineKm } from '../components/LocationPicker';
import { SocArc } from '../components/SocArc';
import { toDatetimeLocalValue } from '../utils/formatters';
import { useToastStore } from '../store/toastStore';

const COVER_PRESETS = [
  '/src/assets/images/journey_mountain_pass_1794937948869.jpg',
  '/src/assets/images/journey_coastal_overlook_1794937948348.jpg',
  '/src/assets/images/hero_ev_roadtrip_1794937947563.jpg',
];

const DRAFT_STORAGE_KEY = 'evj_new_journey_draft';

export function JourneyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState(toDatetimeLocalValue());
  const [endDate, setEndDate] = useState(
    toDatetimeLocalValue(new Date(Date.now() + 6 * 3600 * 1000).toISOString())
  );
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [distanceKm, setDistanceKm] = useState('180');
  const [startSOC, setStartSOC] = useState('90');
  const [endSOC, setEndSOC] = useState('35');
  const [coverImage, setCoverImage] = useState(COVER_PRESETS[0]);
  const [visibility, setVisibility] = useState<JourneyVisibility>('Private');
  const [status, setStatus] = useState<JourneyStatus>('Published');
  const [startLat, setStartLat] = useState('19.0653');
  const [startLng, setStartLng] = useState('72.8681');
  const [endLat, setEndLat] = useState('18.5987');
  const [endLng, setEndLng] = useState('73.7688');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const vRes = await api.get<{ vehicles: Vehicle[] }>('/vehicles');
        const list = vRes.data.vehicles || [];
        setVehicles(list);
        const defaultVehicle = list.find((v) => v.isDefault) || list[0];
        if (defaultVehicle && !isEditing) {
          setVehicleId(defaultVehicle._id);
        }

        if (isEditing && id) {
          const jRes = await api.get<{ journey: Journey }>(`/journeys/${id}`);
          const j = jRes.data.journey;
          setTitle(j.title);
          setDescription(j.description || '');
          setVehicleId(j.vehicleId);
          setStartDate(toDatetimeLocalValue(j.startDate));
          setEndDate(toDatetimeLocalValue(j.endDate));
          setStartLocation(j.startLocation);
          setEndLocation(j.endLocation);
          setDistanceKm(String(j.distanceKm || 0));
          setStartSOC(String(j.startSOC ?? 90));
          setEndSOC(String(j.endSOC ?? 35));
          setCoverImage(j.coverImage || COVER_PRESETS[0]);
          setVisibility(j.visibility);
          setStatus(j.status);
          setDistanceTouched(true);
        } else {
          // Restore saved offline draft if present
          try {
            const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (raw) {
              const d = JSON.parse(raw);
              if (d.title || d.startLocation || d.endLocation) {
                if (d.title) setTitle(d.title);
                if (d.description) setDescription(d.description);
                if (d.startLocation) setStartLocation(d.startLocation);
                if (d.endLocation) setEndLocation(d.endLocation);
                if (d.startLat) setStartLat(d.startLat);
                if (d.startLng) setStartLng(d.startLng);
                if (d.endLat) setEndLat(d.endLat);
                if (d.endLng) setEndLng(d.endLng);
                if (d.distanceKm) setDistanceKm(d.distanceKm);
                if (d.startSOC) setStartSOC(d.startSOC);
                if (d.endSOC) setEndSOC(d.endSOC);
                if (d.coverImage) setCoverImage(d.coverImage);
                setDraftRestored(true);
              }
            }
          } catch {
            // ignore corrupt draft
          }
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load journey form.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEditing]);

  // Persist local draft automatically on new journey creation
  useEffect(() => {
    if (isEditing || loading) return;
    if (!title && !startLocation && !endLocation) return;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          title,
          description,
          startLocation,
          endLocation,
          startLat,
          startLng,
          endLat,
          endLng,
          distanceKm,
          startSOC,
          endSOC,
          coverImage,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
    isEditing,
    loading,
    title,
    description,
    startLocation,
    endLocation,
    startLat,
    startLng,
    endLat,
    endLng,
    distanceKm,
    startSOC,
    endSOC,
    coverImage,
  ]);

  const estimatedKm = haversineKm(
    Number(startLat) || 0,
    Number(startLng) || 0,
    Number(endLat) || 0,
    Number(endLng) || 0
  );

  // Auto-update distance if user hasn't manually overridden it
  useEffect(() => {
    if (!isEditing && !distanceTouched && estimatedKm > 5) {
      setDistanceKm(String(estimatedKm));
    }
  }, [estimatedKm, distanceTouched, isEditing]);

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImageFile(file);
      setCoverImage(url);
      pushToast('Cover photograph uploaded');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to upload cover image.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftRestored(false);
    setTitle('');
    setDescription('');
    setStartLocation('');
    setEndLocation('');
    setDistanceTouched(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vehicleId) {
      setError('Please add an electric vehicle to your garage before creating a journey.');
      return;
    }
    if (!title.trim() || !startLocation.trim() || !endLocation.trim()) {
      setError('Title, starting location, and destination are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        vehicleId,
        coverImage,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        startLocation: startLocation.trim(),
        endLocation: endLocation.trim(),
        distanceKm: Number(distanceKm) || 0,
        startSOC: Number(startSOC),
        endSOC: Number(endSOC),
        visibility,
        status,
        startCoordinates: { lat: Number(startLat), lng: Number(startLng) },
        endCoordinates: { lat: Number(endLat), lng: Number(endLng) },
      };

      if (isEditing && id) {
        await api.put(`/journeys/${id}`, payload);
        pushToast('Journey changes saved');
        navigate(`/journeys/${id}`);
      } else {
        const res = await api.post<{ journey: Journey }>('/journeys', payload);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        pushToast('Journey created — now add stops & charges');
        navigate(`/journeys/${res.data.journey._id}`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save journey.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-2xl bg-[var(--surface)] animate-pulse" />;
  }

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <Link
          to={isEditing && id ? `/journeys/${id}` : '/journeys'}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)] tracking-tight">
          {isEditing ? 'Edit Journey' : 'Create New Journey'}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Pick your route hubs, battery curve, and cover photo — we automatically pin the GPS
          corridor.
        </p>
      </div>

      {draftRestored && !isEditing && (
        <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-bg)] px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--text)]">
            Restored your unfinished local draft automatically.
          </span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            Clear draft
          </button>
        </div>
      )}

      {vehicles.length === 0 && (
        <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--accent)]">
            You need at least one EV in your garage to link this journey.
          </p>
          <Link
            to="/garage/new"
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-fg)]"
          >
            Add Vehicle First
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-6"
      >
        {/* Cover Image */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-[var(--text-muted)]">
            Cover Photograph
          </label>
          <div className="relative aspect-[16/9] max-h-64 w-full overflow-hidden rounded-xl border border-[var(--border)]">
            <ResilientImage
              src={coverImage}
              alt="Journey cover preview"
              fallbackType="journey"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {COVER_PRESETS.map((preset, idx) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCoverImage(preset)}
                  className={`h-10 w-16 overflow-hidden rounded-lg border transition-colors ${
                    coverImage === preset
                      ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30'
                      : 'border-[var(--border)] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset}
                    alt={`Cover preset ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)]">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Journey Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mumbai to Goa Monsoon Grand Tour"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Story / Overview
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes on route conditions, elevation gain, efficiency, and highlights..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Selected Electric Vehicle *
            </label>
            <select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Select EV</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.brand} {v.model} ({v.batteryCapacity} kWh)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--text-muted)]">
                Total Distance (km)
              </label>
              {!isEditing && estimatedKm > 5 && (
                <button
                  type="button"
                  onClick={() => {
                    setDistanceKm(String(estimatedKm));
                    setDistanceTouched(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--primary)] hover:underline"
                >
                  <Route className="h-3 w-3" />
                  <span>Est. ~{estimatedKm} km</span>
                </button>
              )}
            </div>
            <input
              type="number"
              min={0}
              value={distanceKm}
              onChange={(e) => {
                setDistanceKm(e.target.value);
                setDistanceTouched(true);
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* User-friendly Searchable LocationPickers */}
          <LocationPicker
            label="Starting Hub / City *"
            required
            value={startLocation}
            lat={startLat}
            lng={startLng}
            placeholder="e.g. Bandra Kurla Complex, Mumbai"
            onChange={(next) => {
              setStartLocation(next.location);
              setStartLat(next.lat);
              setStartLng(next.lng);
            }}
          />

          <LocationPicker
            label="Destination Hub / City *"
            required
            value={endLocation}
            lat={endLat}
            lng={endLng}
            placeholder="e.g. Panjim Waterfront, Goa"
            onChange={(next) => {
              setEndLocation(next.location);
              setEndLat(next.lat);
              setEndLng(next.lng);
            }}
          />

          {/* Interactive Battery SOC Preview & Sliders */}
          <div className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-4 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex justify-center">
              <SocArc
                startSOC={Number(startSOC)}
                endSOC={Number(endSOC)}
                size={92}
              />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Starting Battery</span>
                  <span className="font-mono font-semibold text-[var(--text)]">
                    {startSOC}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={startSOC}
                  onChange={(e) => setStartSOC(e.target.value)}
                  className="w-full accent-[var(--primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Ending Battery</span>
                  <span className="font-mono font-semibold text-[var(--primary)]">
                    {endSOC}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={endSOC}
                  onChange={(e) => setEndSOC(e.target.value)}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as JourneyVisibility)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="Private">Private (Just you)</option>
              <option value="Followers">Followers (People who follow you)</option>
              <option value="Public">Public (Anyone in EV Journey)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as JourneyStatus)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Link
            to={isEditing && id ? `/journeys/${id}` : '/journeys'}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || vehicles.length === 0}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving
              ? 'Saving...'
              : isEditing
                ? 'Save Journey Changes'
                : 'Create Journey'}
          </button>
        </div>
      </form>
    </div>
  );
}
