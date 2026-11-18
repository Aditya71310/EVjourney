import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import type { Vehicle } from '../types';
import { ThreeEvStudioScene } from '../three/ThreeEvStudioScene';

export function Studio3DPage() {
  const [searchParams] = useSearchParams();
  const initialVehicleId = searchParams.get('vehicleId') || undefined;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<{ vehicles: Vehicle[] }>('/vehicles')
      .then((res) => setVehicles(res.data.vehicles || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080D12]">
      {/* Back Exit Control (Top-Right, Solid RGBA, Zero Backdrop Blur) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <Link
          to="/garage"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-white hover:border-[#00E5C3] hover:text-[#00E5C3] transition-colors whitespace-nowrap"
          style={{ backgroundColor: 'rgba(8, 13, 18, 0.88)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Garage</span>
        </Link>
      </div>

      {loaded ? (
        <ThreeEvStudioScene vehicles={vehicles} initialVehicleId={initialVehicleId} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#080D12] text-xs font-mono text-zinc-400">
          Initializing 3D EV Studio...
        </div>
      )}
    </div>
  );
}
