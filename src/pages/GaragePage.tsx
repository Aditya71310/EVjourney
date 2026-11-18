import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, CarFront, Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { VehicleSilhouette } from '../components/VehicleSilhouette';
import { useToastStore } from '../store/toastStore';

export function GaragePage() {
  const pushToast = useToastStore((s) => s.push);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ vehicles: Vehicle[] }>('/vehicles');
      setVehicles(res.data.vehicles || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load EV garage.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSetDefault = async (id: string, label: string) => {
    try {
      await api.put(`/vehicles/${id}`, { isDefault: true });
      await loadVehicles();
      pushToast(`${label} set as primary EV`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to update default vehicle.'));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/vehicles/${pendingDelete._id}`);
      setVehicles((prev) => prev.filter((v) => v._id !== pendingDelete._id));
      if (selectedVehicle?._id === pendingDelete._id) setSelectedVehicle(null);
      pushToast(`${pendingDelete.brand} ${pendingDelete.model} removed from garage`, 'info');
      setPendingDelete(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to delete vehicle.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)] tracking-tight">
            EV Garage
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage your electric vehicles, battery capacities, and default touring car.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start">
          <Link
            to="/studio-3d"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors whitespace-nowrap"
          >
            <Box className="h-4 w-4 text-[var(--primary)]" />
            <span>Open 3D Studio</span>
          </Link>
          <Link
            to="/garage/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vehicle</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-3">
          <CarFront className="h-8 w-8 text-[var(--primary)] mx-auto opacity-80" />
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            Your EV garage is empty
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Register your electric vehicle so every journey and charging session automatically
            tracks exact battery kWh capacity.
          </p>
          <div className="pt-2">
            <Link
              to="/garage/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)]"
            >
              Add First Electric Vehicle
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div
              key={v._id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col justify-between"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(v)}
                  className="block w-full text-left"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <ResilientImage
                      src={v.photo}
                      alt={`${v.brand} ${v.model}`}
                      fallbackType="vehicle"
                      fallbackLabel={`${v.brand} ${v.model}`}
                      className="h-full w-full object-cover hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                </button>
                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-mono tabular-nums">
                        {v.batteryCapacity} kWh · {v.colour}
                      </span>
                      {v.isDefault && (
                        <span className="text-[var(--primary)] font-medium">Default</span>
                      )}
                    </div>
                    <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
                      {v.brand} {v.model}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {v.variant || 'Standard'}
                      {v.nickname ? ` · "${v.nickname}"` : ''}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <VehicleSilhouette
                      model={v.model}
                      colour={v.colour}
                      batteryCapacity={v.batteryCapacity}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs">
                {!v.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(v._id, `${v.brand} ${v.model}`)}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    Set as default
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[var(--primary)] font-medium">
                    <Check className="h-3.5 w-3.5" />
                    <span>Primary EV</span>
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <Link
                    to={`/studio-3d?vehicleId=${v._id}`}
                    className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                  >
                    <Box className="h-3.5 w-3.5" />
                    <span>3D</span>
                  </Link>
                  <Link
                    to={`/garage/${v._id}/edit`}
                    className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(v)}
                    className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle Specification Modal */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/10] w-full">
              <ResilientImage
                src={selectedVehicle.photo}
                alt={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                fallbackType="vehicle"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-serif-display italic text-3xl text-[var(--text)]">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedVehicle.variant}
                  {selectedVehicle.nickname ? ` · "${selectedVehicle.nickname}"` : ''}
                </p>
              </div>
              <div className="py-2">
                <VehicleSilhouette
                  model={selectedVehicle.model}
                  colour={selectedVehicle.colour}
                  batteryCapacity={selectedVehicle.batteryCapacity}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 border-y border-[var(--border)] py-4 text-xs">
                <div>
                  <div className="text-[var(--text-muted)]">Usable Battery</div>
                  <div className="font-mono text-base font-semibold mt-0.5 tabular-nums text-[var(--text)]">
                    {selectedVehicle.batteryCapacity} kWh
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Exterior Colour</div>
                  <div className="text-base font-medium mt-0.5 text-[var(--text)]">
                    {selectedVehicle.colour}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)]"
                >
                  Close
                </button>
                <Link
                  to={`/garage/${selectedVehicle._id}/edit`}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)]"
                >
                  Edit Vehicle
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display italic text-xl text-[var(--text)]">
                Remove vehicle?
              </h3>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Remove{' '}
              <strong className="text-[var(--text)]">
                {pendingDelete.brand} {pendingDelete.model}
              </strong>{' '}
              from your EV garage? If any existing journeys reference this EV, reassign them
              first.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-xl bg-[var(--danger)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
