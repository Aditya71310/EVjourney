import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { Journey, Vehicle } from '../types';
import { formatDateShort, formatDuration, formatINR } from '../utils/formatters';

interface ShareCardModalProps {
  open: boolean;
  journey: Journey;
  vehicle: Vehicle | null;
  stats: {
    chargingStopsCount: number;
    totalEnergyKwh: number;
    totalChargingCost: number;
  };
  onClose: () => void;
}

export function ShareCardModal({
  open,
  journey,
  vehicle,
  stats,
  onClose,
}: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    const drawCard = (img?: HTMLImageElement) => {
      // Background
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, W, H);

      // Cover image area (top 1120px)
      if (img) {
        const scale = Math.max(W / img.width, 1140 / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (W - dw) / 2, 0, dw, dh);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, 1140);
        g.addColorStop(0, '#0D2E2A');
        g.addColorStop(1, '#0A0A0A');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, 1140);
      }

      // Contrast scrim
      const scrim = ctx.createLinearGradient(0, 320, 0, 1160);
      scrim.addColorStop(0, 'rgba(10,10,10,0.15)');
      scrim.addColorStop(0.65, 'rgba(10,10,10,0.75)');
      scrim.addColorStop(1, '#0A0A0A');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, W, 1160);

      // Top brand lockup
      ctx.fillStyle = '#2DD4BF';
      ctx.font = '600 28px "Inter Tight", sans-serif';
      ctx.fillText('EV JOURNEY', 80, 110);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '500 26px "JetBrains Mono", monospace';
      ctx.fillText(formatDateShort(journey.startDate).toUpperCase(), 80, 160);

      // Title
      ctx.fillStyle = '#FAFAFA';
      ctx.font = 'italic 84px "Instrument Serif", Georgia, serif';
      const words = journey.title.split(' ');
      let line = '';
      let y = 940;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > W - 160) {
          ctx.fillText(line, 80, y);
          line = word;
          y += 96;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, 80, y);

      // Route subtitle
      ctx.fillStyle = '#D4D4D8';
      ctx.font = '500 32px "Inter Tight", sans-serif';
      ctx.fillText(`${journey.startLocation}  →  ${journey.endLocation}`, 80, y + 66);

      // Stats card box
      ctx.fillStyle = '#141417';
      ctx.strokeStyle = '#2E2E33';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(72, 1190, W - 144, 480, 28);
      ctx.fill();
      ctx.stroke();

      const items = [
        { label: 'DISTANCE', val: `${journey.distanceKm} km` },
        { label: 'DURATION', val: formatDuration(journey.durationMinutes) },
        { label: 'TRIP SOC', val: `${journey.startSOC}% → ${journey.endSOC}%` },
        { label: 'ENERGY ADDED', val: `${stats.totalEnergyKwh} kWh` },
        { label: 'CHARGING COST', val: formatINR(stats.totalChargingCost) },
        { label: 'CHARGING STOPS', val: `${stats.chargingStopsCount}` },
      ];

      items.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 128 + col * 450;
        const iy = 1278 + row * 145;
        ctx.fillStyle = '#A1A1AA';
        ctx.font = '500 22px "JetBrains Mono", monospace';
        ctx.fillText(item.label, x, iy);
        ctx.fillStyle = idx === 3 ? '#2DD4BF' : '#FAFAFA';
        ctx.font = '600 44px "JetBrains Mono", monospace';
        ctx.fillText(item.val, x, iy + 54);
      });

      // Footer
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '500 28px "Inter Tight", sans-serif';
      const vehicleLabel = vehicle
        ? `${vehicle.brand} ${vehicle.model} (${vehicle.batteryCapacity} kWh)`
        : 'Electric Touring Log';
      ctx.fillText(vehicleLabel, 80, 1775);

      ctx.fillStyle = '#2DD4BF';
      ctx.font = 'italic 34px "Instrument Serif", Georgia, serif';
      ctx.fillText('made with EV Journey', 80, 1828);

      setDataUrl(canvas.toDataURL('image/png'));
    };

    if (journey.coverImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => drawCard(img);
      img.onerror = () => drawCard();
      img.src = journey.coverImage;
    } else {
      drawCard();
    }
  }, [open, journey, vehicle, stats]);

  if (!open) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `ev-journey-${journey.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            Share Story Card
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="mx-auto w-64 aspect-[9/16] overflow-hidden rounded-xl border border-[var(--border)] bg-[#0A0A0A]">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Shareable 1080x1920 journey story card"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-[var(--surface-2)]" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-medium text-[var(--text)]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[var(--primary)]" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--primary-fg)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
