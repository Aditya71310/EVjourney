import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BatteryCharging,
  BedDouble,
  Camera,
  Coffee,
  Edit3,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Mountain,
  Navigation,
  Plus,
  Share2,
  Star,
  Trash2,
  Upload,
  Utensils,
  X,
} from 'lucide-react';
import api, { extractErrorMessage, uploadImageFile } from '../services/api';
import type {
  ConnectorType,
  Journey,
  JourneyVisibility,
  TimelineEvent,
  TimelineEventType,
  Vehicle,
} from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { JourneyMap } from '../components/JourneyMap';
import { JourneyRoute3DScene } from '../three/JourneyRoute3DScene';
import { BatteryIndicator } from '../components/BatteryIndicator';
import { SocArc } from '../components/SocArc';
import { SocCurveChart } from '../components/SocCurveChart';
import { LocationPicker } from '../components/LocationPicker';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { VisibilitySheet } from '../components/VisibilitySheet';
import { CommentsSheet } from '../components/CommentsSheet';
import { ShareCardModal } from '../components/ShareCardModal';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  calculateEnergyAdded,
  formatDateShort,
  formatDateTime,
  formatDuration,
  formatINR,
  toDatetimeLocalValue,
} from '../utils/formatters';

interface JourneyDetailPayload {
  journey: Journey;
  vehicle: Vehicle | null;
  author: {
    _id: string;
    name: string;
    username: string;
    city?: string;
    country?: string;
  } | null;
  events: TimelineEvent[];
  stats: {
    chargingStopsCount: number;
    totalEnergyKwh: number;
    totalChargingCost: number;
    averageChargerRating: number;
  };
  isOwner: boolean;
}

const EVENT_TYPES: TimelineEventType[] = [
  'Starting point',
  'Charging stop',
  'Food stop',
  'Hotel',
  'Scenic location',
  'Coffee stop',
  'Photograph',
  'Custom event',
  'Destination',
];

const CONNECTORS: ConnectorType[] = [
  'CCS2',
  'AC Type 2',
  'CHAdeMO',
  'AC Type 1',
  'Tesla',
  'Other',
];

const CHARGING_NETWORKS = [
  'Tata Power',
  'Statiq',
  'Zeon',
  'Jio-bp pulse',
  'ChargeZone',
  'Ather Grid',
  'Tesla',
  'Shell Recharge',
];

function getEventIcon(type: TimelineEventType) {
  switch (type) {
    case 'Starting point':
      return Navigation;
    case 'Charging stop':
      return BatteryCharging;
    case 'Food stop':
      return Utensils;
    case 'Hotel':
      return BedDouble;
    case 'Scenic location':
      return Mountain;
    case 'Coffee stop':
      return Coffee;
    case 'Photograph':
      return Camera;
    case 'Destination':
      return Flag;
    default:
      return MapPin;
  }
}

function JourneyHeroCover({
  journey,
  vehicle,
  author,
}: {
  journey: Journey;
  vehicle: Vehicle | null;
  author: JourneyDetailPayload['author'];
}) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const coverY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="aspect-[16/10] sm:aspect-[16/8] max-h-[480px] w-full overflow-hidden relative">
        <motion.div style={{ y: coverY }} className="h-[115%] w-full -mt-[4%]">
          <ResilientImage
            src={journey.coverImage}
            alt={journey.title}
            fallbackType="journey"
            className="h-full w-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
      </div>

      <div className="absolute inset-x-0 bottom-10 sm:bottom-14 px-6 sm:px-10 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/80 tabular-nums">
          <span>
            {formatDateShort(journey.startDate)} — {formatDateShort(journey.endDate)}
          </span>
          {vehicle && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-sans normal-case tracking-normal text-[var(--primary)] font-medium">
                {vehicle.brand} {vehicle.model} ({vehicle.batteryCapacity} kWh)
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-sans normal-case tracking-normal">
            {journey.visibility}
          </span>
        </div>

        <h1 className="font-serif-display italic text-3xl sm:text-5xl text-white leading-[1.08] max-w-3xl">
          {journey.title}
        </h1>

        <p className="text-sm text-white/80 flex flex-wrap items-center gap-2">
          <span>
            {journey.startLocation} → {journey.endLocation}
          </span>
          {author && (
            <Link
              to={`/u/${author.username}`}
              className="text-white/70 hover:text-[var(--primary)] underline-offset-2 hover:underline"
            >
              · @{author.username}
            </Link>
          )}
        </p>
      </div>
    </section>
  );
}

export function JourneyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const pushToast = useToastStore((s) => s.push);

  const [detail, setDetail] = useState<JourneyDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Phase 2 sheets & modals
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    photos: string[];
    index: number;
    caption: string;
  } | null>(null);
  const [confirmDeleteJourney, setConfirmDeleteJourney] = useState(false);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [routeViewMode, setRouteViewMode] = useState<'2d' | '3d'>('2d');

  // Event modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form fields
  const [evType, setEvType] = useState<TimelineEventType>('Charging stop');
  const [evTitle, setEvTitle] = useState('');
  const [evTimestamp, setEvTimestamp] = useState(toDatetimeLocalValue());
  const [evLocation, setEvLocation] = useState('');
  const [evLat, setEvLat] = useState('18.5987');
  const [evLng, setEvLng] = useState('73.7688');
  const [evNote, setEvNote] = useState('');
  const [evPhotos, setEvPhotos] = useState<string[]>([]);

  // Charging fields
  const [chargerName, setChargerName] = useState('');
  const [network, setNetwork] = useState('Statiq');
  const [connectorType, setConnectorType] = useState<ConnectorType>('CCS2');
  const [chargingType, setChargingType] = useState<'AC' | 'DC'>('DC');
  const [cStartSOC, setCStartSOC] = useState('20');
  const [cEndSOC, setCEndSOC] = useState('80');
  const [cEnergyKwh, setCEnergyKwh] = useState('');
  const [cDuration, setCDuration] = useState('32');
  const [cCost, setCCost] = useState('850');
  const [cRating, setCRating] = useState('5');
  const [cReview, setCReview] = useState('');

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<JourneyDetailPayload>(`/journeys/${id}`);
      setDetail(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load journey details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const openAddModal = () => {
    setEditingEvent(null);
    setEvType('Charging stop');
    setEvTitle('');
    setEvTimestamp(toDatetimeLocalValue());
    setEvLocation('');
    setEvLat('18.5987');
    setEvLng('73.7688');
    setEvNote('');
    setEvPhotos([]);
    setChargerName('');
    setNetwork('Tata Power');
    setConnectorType('CCS2');
    setChargingType('DC');
    setCStartSOC('20');
    setCEndSOC('80');
    setCEnergyKwh('');
    setCDuration('30');
    setCCost('750');
    setCRating('5');
    setCReview('');
    setModalOpen(true);
  };

  const openEditModal = (ev: TimelineEvent) => {
    setEditingEvent(ev);
    setEvType(ev.type);
    setEvTitle(ev.title);
    setEvTimestamp(toDatetimeLocalValue(ev.timestamp));
    setEvLocation(ev.location);
    setEvLat(String(ev.coordinates?.lat ?? 18.52));
    setEvLng(String(ev.coordinates?.lng ?? 73.85));
    setEvNote(ev.note || '');
    setEvPhotos(ev.photos || []);

    const cd = ev.chargingDetail;
    setChargerName(cd?.chargerName || '');
    setNetwork(cd?.network || 'Independent');
    setConnectorType(cd?.connectorType || 'CCS2');
    setChargingType(cd?.chargingType || 'DC');
    setCStartSOC(String(cd?.startSOC ?? 20));
    setCEndSOC(String(cd?.endSOC ?? 80));
    setCEnergyKwh(cd?.energyKwh ? String(cd.energyKwh) : '');
    setCDuration(String(cd?.durationMinutes ?? 30));
    setCCost(String(cd?.cost ?? 0));
    setCRating(String(cd?.rating ?? 5));
    setCReview(cd?.review || '');
    setModalOpen(true);
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImageFile(file);
        uploadedUrls.push(url);
      }
      setEvPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError(extractErrorMessage(err, 'Photo upload failed.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const batteryCapacity = detail?.vehicle?.batteryCapacity || 60;
  const computedPreviewEnergy =
    Number(cEnergyKwh) > 0
      ? Number(cEnergyKwh)
      : calculateEnergyAdded(batteryCapacity, Number(cStartSOC), Number(cEndSOC));

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !evTitle.trim() || !evLocation.trim()) return;
    setSavingEvent(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        type: evType,
        title: evTitle.trim(),
        timestamp: new Date(evTimestamp).toISOString(),
        location: evLocation.trim(),
        coordinates: { lat: Number(evLat), lng: Number(evLng) },
        note: evNote.trim(),
        photos: evPhotos,
      };

      if (evType === 'Charging stop') {
        payload.chargingDetail = {
          chargerName: chargerName.trim() || evTitle.trim(),
          network: network.trim(),
          connectorType,
          chargingType,
          startSOC: Number(cStartSOC),
          endSOC: Number(cEndSOC),
          energyKwh: Number(cEnergyKwh) > 0 ? Number(cEnergyKwh) : undefined,
          durationMinutes: Number(cDuration),
          cost: Number(cCost),
          rating: Number(cRating),
          review: cReview.trim(),
        };
      }

      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, payload);
      } else {
        await api.post(`/journeys/${id}/events`, payload);
      }

      setModalOpen(false);
      pushToast(editingEvent ? 'Timeline stop updated' : 'Stop added to timeline');
      await fetchDetail();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save timeline event.'));
    } finally {
      setSavingEvent(false);
    }
  };

  const executeDeleteEvent = async () => {
    if (!confirmDeleteEventId) return;
    try {
      await api.delete(`/events/${confirmDeleteEventId}`);
      setConfirmDeleteEventId(null);
      pushToast('Stop removed from timeline', 'info');
      await fetchDetail();
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to remove event.'));
    }
  };

  const handleReorder = async (index: number, direction: -1 | 1) => {
    if (!detail || !id) return;
    const target = index + direction;
    if (target < 0 || target >= detail.events.length) return;
    const copy = [...detail.events];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    const orderedIds = copy.map((e) => e._id);
    try {
      const res = await api.put<{ events: TimelineEvent[] }>(
        `/journeys/${id}/events/reorder`,
        { orderedIds }
      );
      setDetail({ ...detail, events: res.data.events });
      pushToast('Timeline order updated');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to reorder stops.'));
    }
  };

  const executeDeleteJourney = async () => {
    if (!id || !detail) return;
    try {
      await api.delete(`/journeys/${id}`);
      pushToast('Journey deleted', 'info');
      navigate('/journeys');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to delete journey.'));
    }
  };

  const handleVisibilitySave = async (nextVisibility: JourneyVisibility) => {
    if (!id || !detail) return;
    const res = await api.put<{ journey: Journey }>(`/journeys/${id}`, {
      visibility: nextVisibility,
      status: nextVisibility === 'Private' ? detail.journey.status : 'Published',
    });
    setDetail({
      ...detail,
      journey: { ...detail.journey, ...res.data.journey },
    });
    pushToast(`Visibility updated to ${nextVisibility}`);
  };

  const handleLikeJourney = async () => {
    if (!detail) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const res = await api.post<{ isLiked: boolean; likesCount: number }>(
      `/journeys/${detail.journey._id}/like`
    );
    setDetail({
      ...detail,
      journey: {
        ...detail.journey,
        isLiked: res.data.isLiked,
        likesCount: res.data.likesCount,
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-80 rounded-2xl bg-[var(--surface)] animate-pulse" />
        <div className="h-28 rounded-xl bg-[var(--surface)] animate-pulse" />
        <div className="h-96 rounded-xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/journeys"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Journeys</span>
        </Link>
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-6 text-sm text-[var(--danger)]">
          {error}
        </div>
      </div>
    );
  }

  if (!detail) return null;
  const { journey, vehicle, author, events, stats, isOwner } = detail;

  return (
    <div className="space-y-10 pb-14">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={isOwner ? '/journeys' : '/discover'}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isOwner ? 'Back' : 'Back to Discover'}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLikeJourney}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium transition-colors ${
              journey.isLiked
                ? 'text-[var(--danger)] border-[var(--danger)]/40'
                : 'text-[var(--text)] hover:border-[var(--primary)]'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${journey.isLiked ? 'fill-current' : ''}`} />
            <span className="font-mono tabular-nums">{journey.likesCount || 0}</span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums">{journey.commentsCount || 0}</span>
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 transition-opacity"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Card</span>
          </button>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => setVisibilityOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>{journey.visibility}</span>
              </button>
              <Link
                to={`/journeys/${journey._id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Link>
              <button
                type="button"
                onClick={() => setConfirmDeleteJourney(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                aria-label="Delete journey"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Screen 4 Hero with Parallax Cover + Hanging Glass Stats Card */}
      <div className="space-y-0">
        <JourneyHeroCover journey={journey} vehicle={vehicle} author={author} />

        {/* Hanging Glass 6-Stats Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 -mt-8 mx-3 sm:mx-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-xl p-5 sm:p-6 shadow-2xl"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">Distance</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)]">
                {journey.distanceKm} km
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">Duration</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)]">
                {formatDuration(journey.durationMinutes)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">Battery SOC</div>
              <div className="font-mono text-lg font-semibold tabular-nums text-[var(--text)]">
                {journey.startSOC}% →{' '}
                <span className="text-[var(--primary)]">{journey.endSOC}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">Energy Added</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--primary)]">
                {stats.totalEnergyKwh} kWh
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">Spent</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)]">
                {formatINR(stats.totalChargingCost)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">Stops</div>
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)]">
                {events.length} ({stats.chargingStopsCount}⚡)
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {journey.description && (
        <p className="text-sm sm:text-base text-[var(--text)]/90 leading-relaxed max-w-3xl">
          {journey.description}
        </p>
      )}

      {/* Interactive Route & Waypoints (2D MapLibre / 3D Three.js Terrain) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
              Route & Waypoints
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {routeViewMode === '2d'
                ? 'Click any pin to inspect coordinates, notes, and charging sessions.'
                : 'Drag to orbit the 3D topographic terrain, click beacons, or launch a 3D EV flythrough.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {stats.averageChargerRating > 0 && (
              <div className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
                Avg charger rating: {stats.averageChargerRating} / 5
              </div>
            )}
            <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              <button
                type="button"
                onClick={() => setRouteViewMode('2d')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  routeViewMode === '2d'
                    ? 'bg-[var(--primary-bg)] text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                2D Route Map
              </button>
              <button
                type="button"
                onClick={() => setRouteViewMode('3d')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  routeViewMode === '3d'
                    ? 'bg-[var(--primary-bg)] text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                3D Terrain View
              </button>
            </div>
          </div>
        </div>

        {routeViewMode === '2d' ? (
          <JourneyMap events={events} />
        ) : (
          <JourneyRoute3DScene
            events={events}
            vehicleModel={vehicle?.model}
            vehicleColour={vehicle?.colour}
          />
        )}

        <SocCurveChart
          startSOC={journey.startSOC}
          endSOC={journey.endSOC}
          events={events}
        />
      </section>

      {/* Vertical Chronological Timeline */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
              Timeline · {events.length} events
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Chronological log of departures, charging halts, meals, and overlooks.
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span>Add event</span>
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center space-y-3">
            <MapPin className="h-7 w-7 text-[var(--primary)] mx-auto opacity-80" />
            <p className="text-sm font-medium">No timeline stops recorded yet</p>
            {isOwner && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)]"
              >
                Add First Event
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-px before:bg-[var(--border)]">
            {events.map((ev, index) => {
              const Icon = getEventIcon(ev.type);
              const cd = ev.chargingDetail;
              return (
                <div key={ev._id} className="relative">
                  <span
                    className={`absolute -left-6 sm:-left-8 top-4 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border ${
                      ev.type === 'Charging stop'
                        ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]'
                        : ev.type === 'Starting point' || ev.type === 'Destination'
                          ? 'border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="font-medium text-[var(--text)]">
                            {ev.type}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatDateTime(ev.timestamp)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ev.location}</span>
                        </div>
                        <h3 className="font-serif-display italic text-2xl text-[var(--text)]">
                          {ev.title}
                        </h3>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleReorder(index, -1)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === events.length - 1}
                            onClick={() => handleReorder(index, 1)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
                            title="Edit event"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteEventId(ev._id)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)]"
                            title="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {ev.note && (
                      <p className="text-sm text-[var(--text)]/90 leading-relaxed">
                        {ev.note}
                      </p>
                    )}

                    {/* Charging Stop 3-Tile Mini Grid + Animated BatteryIndicator */}
                    {ev.type === 'Charging stop' && cd && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="font-medium text-[var(--text)]">
                            {cd.chargerName} · {cd.network}
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[var(--accent)]">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>{cd.rating}/5</span>
                          </div>
                        </div>

                        <BatteryIndicator
                          startSOC={cd.startSOC}
                          endSOC={cd.endSOC}
                          energyKwh={cd.energyKwh}
                        />

                        <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums pt-1">
                          <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2.5">
                            <div className="text-[var(--text-muted)] text-[10px]">
                              CONNECTOR
                            </div>
                            <div className="font-semibold mt-0.5 text-[var(--text)]">
                              {cd.chargingType} {cd.connectorType}
                            </div>
                          </div>
                          <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2.5">
                            <div className="text-[var(--text-muted)] text-[10px]">
                              ENERGY ADDED
                            </div>
                            <div className="font-semibold mt-0.5 text-[var(--primary)]">
                              {cd.energyKwh} kWh
                            </div>
                          </div>
                          <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2.5">
                            <div className="text-[var(--text-muted)] text-[10px]">
                              COST
                            </div>
                            <div className="font-semibold mt-0.5 text-[var(--text)]">
                              {formatINR(cd.cost)}
                            </div>
                          </div>
                        </div>

                        {cd.review && (
                          <p className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
                            {cd.review}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Photographs (tap for lightbox) */}
                    {ev.photos && ev.photos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {ev.photos.map((photoUrl, pIdx) => (
                          <button
                            key={`${ev._id}-p-${pIdx}`}
                            type="button"
                            onClick={() =>
                              setLightbox({
                                photos: ev.photos,
                                index: pIdx,
                                caption: ev.title,
                              })
                            }
                            className="group aspect-[16/10] overflow-hidden rounded-xl border border-[var(--border)] block w-full text-left"
                          >
                            <ResilientImage
                              src={photoUrl}
                              alt={`${ev.title} photo ${pIdx + 1}`}
                              fallbackType="photo"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Timeline Event Modal (with live SocArc) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
                {editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              {/* Kind Switcher */}
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEvType(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      evType === t
                        ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-muted)]">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="e.g., Lonavala Fast Charge & Chai"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-muted)]">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={evTimestamp}
                    onChange={(e) => setEvTimestamp(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <LocationPicker
                    label="Stop Location *"
                    required
                    value={evLocation}
                    lat={evLat}
                    lng={evLng}
                    placeholder="Search city, charger hub, or tap Use GPS..."
                    onChange={(next) => {
                      setEvLocation(next.location);
                      setEvLat(next.lat);
                      setEvLng(next.lng);
                    }}
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-muted)]">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={evNote}
                    onChange={(e) => setEvNote(e.target.value)}
                    placeholder="Road elevation, weather, or stop memory..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Charging Stop with Live SVG SocArc */}
              {evType === 'Charging stop' && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex justify-center">
                      <SocArc
                        startSOC={Number(cStartSOC)}
                        endSOC={Number(cEndSOC)}
                        size={96}
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-muted)]">Start SOC</span>
                          <span className="font-mono font-semibold">{cStartSOC}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={cStartSOC}
                          onChange={(e) => setCStartSOC(e.target.value)}
                          className="w-full accent-[var(--primary)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-muted)]">End SOC</span>
                          <span className="font-mono font-semibold text-[var(--primary)]">
                            {cEndSOC}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={cEndSOC}
                          onChange={(e) => setCEndSOC(e.target.value)}
                          className="w-full accent-[var(--primary)]"
                        />
                      </div>
                      <div className="text-xs font-mono text-[var(--text-muted)]">
                        Auto energy: <strong className="text-[var(--primary)]">{computedPreviewEnergy} kWh</strong> ({batteryCapacity} kWh pack)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Station Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={chargerName}
                        onChange={(e) => setChargerName(e.target.value)}
                        placeholder="Tata Power EZ Charge 60 kW"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Charging Network (tap preset or type custom)
                      </label>
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {CHARGING_NETWORKS.map((net) => (
                          <button
                            key={net}
                            type="button"
                            onClick={() => setNetwork(net)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              network === net
                                ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                            }`}
                          >
                            {net}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={network}
                        onChange={(e) => setNetwork(e.target.value)}
                        placeholder="Custom charging network..."
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Connector Type
                      </label>
                      <select
                        value={connectorType}
                        onChange={(e) =>
                          setConnectorType(e.target.value as ConnectorType)
                        }
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      >
                        {CONNECTORS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        AC / DC
                      </label>
                      <select
                        value={chargingType}
                        onChange={(e) =>
                          setChargingType(e.target.value as 'AC' | 'DC')
                        }
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      >
                        <option value="DC">DC Fast</option>
                        <option value="AC">AC Slow</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Energy Added (kWh, blank = auto)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={cEnergyKwh}
                        onChange={(e) => setCEnergyKwh(e.target.value)}
                        placeholder={String(computedPreviewEnergy)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Cost (INR ₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cCost}
                        onChange={(e) => setCCost(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={cDuration}
                        onChange={(e) => setCDuration(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Rating
                      </label>
                      <div className="flex items-center gap-1 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCRating(String(star))}
                            className="p-0.5"
                            aria-label={`Rate ${star} stars`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                Number(cRating) >= star
                                  ? 'text-[var(--accent)] fill-current'
                                  : 'text-[var(--border)]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[11px] text-[var(--text-muted)]">
                        Station Review
                      </label>
                      <input
                        type="text"
                        value={cReview}
                        onChange={(e) => setCReview(e.target.value)}
                        placeholder="Charger reliability, bay cleanliness, nearby tea/coffee..."
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Photo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Stop Photographs ({evPhotos.length})
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--primary)]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Add Photos'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {evPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {evPhotos.map((p, idx) => (
                      <div
                        key={`${p}-${idx}`}
                        className="relative h-16 w-24 overflow-hidden rounded-lg border border-[var(--border)]"
                      >
                        <img
                          src={p}
                          alt="Uploaded stop"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEvPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50"
                >
                  {savingEvent
                    ? 'Saving...'
                    : editingEvent
                      ? 'Save Event'
                      : 'Add to timeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visibility Selector Sheet (Screen 10) */}
      <VisibilitySheet
        open={visibilityOpen}
        current={journey.visibility}
        onClose={() => setVisibilityOpen(false)}
        onSave={handleVisibilitySave}
      />

      {/* Comments Sheet (Screen 12) */}
      <CommentsSheet
        journeyId={journey._id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={(_jid, count) =>
          setDetail({
            ...detail,
            journey: { ...detail.journey, commentsCount: count },
          })
        }
      />

      {/* Shareable 1080x1920 Story Card Modal (FR-8) */}
      <ShareCardModal
        open={shareOpen}
        journey={journey}
        vehicle={vehicle}
        stats={stats}
        onClose={() => setShareOpen(false)}
      />

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={lightbox?.photos || []}
        index={lightbox ? lightbox.index : null}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
        onNavigate={(nextIdx) =>
          setLightbox((prev) => (prev ? { ...prev, index: nextIdx } : null))
        }
      />

      {/* In-UI Confirm Delete Event */}
      {confirmDeleteEventId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setConfirmDeleteEventId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-display italic text-xl text-[var(--text)]">
              Remove timeline stop?
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              This removes the stop and any linked charging log from your journey timeline.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteEventId(null)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteEvent}
                className="rounded-xl bg-[var(--danger)] px-4 py-2 text-xs font-semibold text-white"
              >
                Remove Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-UI Confirm Delete Journey */}
      {confirmDeleteJourney && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setConfirmDeleteJourney(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-display italic text-xl text-[var(--text)]">
              Delete "{journey.title}"?
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              This permanently removes the journey, route waypoints, and charging logs.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteJourney(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteJourney}
                className="rounded-xl bg-[var(--danger)] px-4 py-2 text-xs font-semibold text-white"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
