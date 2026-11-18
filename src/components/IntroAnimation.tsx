import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
  durationMs?: number;
  forceFull?: boolean;
}

interface ParticleSpec {
  id: number;
  left: string;
  top: string;
  size: number;
  dur: string;
  delay: string;
}

const PARTICLES: ParticleSpec[] = [
  { id: 1, left: '12%', top: '24%', size: 3, dur: '3.8s', delay: '0.1s' },
  { id: 2, left: '22%', top: '68%', size: 2, dur: '4.2s', delay: '0.4s' },
  { id: 3, left: '34%', top: '18%', size: 3, dur: '3.4s', delay: '0.2s' },
  { id: 4, left: '44%', top: '76%', size: 2.5, dur: '4.0s', delay: '0.7s' },
  { id: 5, left: '58%', top: '22%', size: 3, dur: '3.5s', delay: '0.3s' },
  { id: 6, left: '68%', top: '64%', size: 2, dur: '4.3s', delay: '0.6s' },
  { id: 7, left: '78%', top: '32%', size: 3, dur: '3.7s', delay: '0.2s' },
  { id: 8, left: '86%', top: '72%', size: 2.5, dur: '4.1s', delay: '0.5s' },
  { id: 9, left: '18%', top: '46%', size: 2, dur: '3.9s', delay: '0.8s' },
  { id: 10, left: '82%', top: '50%', size: 2, dur: '3.6s', delay: '0.4s' },
  { id: 11, left: '49%', top: '14%', size: 2.5, dur: '4.0s', delay: '0.15s' },
  { id: 12, left: '52%', top: '84%', size: 3, dur: '3.8s', delay: '0.55s' },
];

const ENERGY_LINES = [
  { id: 'l1', top: '28%', dur: '2.3s', delay: '0.05s', width: '42%' },
  { id: 'l2', top: '48%', dur: '2.7s', delay: '0.35s', width: '55%' },
  { id: 'l3', top: '72%', dur: '2.5s', delay: '0.2s', width: '38%' },
];

function startAmbientSound(): { stop: () => void } | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.9);
    master.gain.setValueAtTime(0.08, now + 3.6);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 4.9);
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 2.4);
    filter.frequency.exponentialRampToValueAtTime(620, now + 4.8);
    filter.connect(master);

    // Warm electric vehicle harmonic pad (D2 + A2 + F#3 shimmer)
    const freqs = [73.42, 110.0, 146.83, 220.0];
    const oscs = freqs.map((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * 0.98, now);
      osc.frequency.exponentialRampToValueAtTime(f, now + 1.8);
      g.gain.setValueAtTime(idx === 0 ? 0.45 : 0.16 / idx, now);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + 5.0);
      return osc;
    });

    // Subtle crystalline chime on Logo Reveal (2.1s)
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(587.33, now + 2.05);
    chimeOsc.frequency.exponentialRampToValueAtTime(880, now + 2.55);
    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.setValueAtTime(0.0001, now + 2.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.06, now + 2.2);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
    chimeOsc.connect(chimeGain);
    chimeGain.connect(master);
    chimeOsc.start(now + 2.05);
    chimeOsc.stop(now + 3.5);

    return {
      stop: () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
          setTimeout(() => {
            oscs.forEach((o) => {
              try {
                o.stop();
              } catch {
                // ignore already stopped
              }
            });
            ctx.close().catch(() => {});
          }, 160);
        } catch {
          // ignore cleanup failure
        }
      },
    };
  } catch {
    return null;
  }
}

export function IntroAnimation({
  onComplete,
  durationMs = 5000,
  forceFull = false,
}: IntroAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<{ stop: () => void } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const prefersReduced =
    !forceFull &&
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    audioRef.current?.stop();
    audioRef.current = null;
    setVisible(false);
    setTimeout(() => {
      onCompleteRef.current();
    }, 450);
  }, []);

  useEffect(() => {
    try {
      svgRef.current?.setCurrentTime?.(0);
    } catch {
      // ignore if SMIL timeline reset is unsupported
    }

    if (prefersReduced) {
      const quick = setTimeout(finish, 2200);
      return () => clearTimeout(quick);
    }

    audioRef.current = startAmbientSound();
    const timer = setTimeout(finish, durationMs);

    return () => {
      clearTimeout(timer);
      audioRef.current?.stop();
      audioRef.current = null;
    };
  }, [durationMs, finish, prefersReduced]);

  const toggleSound = () => {
    if (soundEnabled) {
      audioRef.current?.stop();
      audioRef.current = null;
      setSoundEnabled(false);
    } else {
      audioRef.current = startAmbientSound();
      setSoundEnabled(true);
    }
  };

  // Curving road path across screen that morphs into an electric lightning bolt silhouette
  const roadBoltPath =
    'M 30 270 C 180 265, 290 230, 390 165 C 445 128, 495 85, 535 58 L 478 162 L 605 150 L 502 278 C 565 232, 695 210, 930 205';

  const dScale = prefersReduced ? 0 : 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="EV Journey Startup Intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#080D12] text-white select-none"
        >
          {/* Scene 1: Central Radial Teal Atmospheric Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReduced ? 0.2 : 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="evj-glow-pulse h-[380px] w-[380px] sm:h-[540px] sm:w-[540px] rounded-full bg-[radial-gradient(circle,rgba(0,229,195,0.22)_0%,rgba(0,184,217,0.08)_42%,rgba(8,13,18,0)_72%)] blur-2xl" />
          </motion.div>

          {/* Faint Ambient Particles & Digital Energy Lines */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {PARTICLES.map((p) => (
              <span
                key={p.id}
                style={
                  {
                    left: p.left,
                    top: p.top,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    '--dur': p.dur,
                    '--delay': p.delay,
                  } as React.CSSProperties
                }
                className="evj-particle absolute rounded-full bg-[#00E5C3] shadow-[0_0_8px_#00E5C3]"
              />
            ))}

            {ENERGY_LINES.map((line) => (
              <div
                key={line.id}
                style={
                  {
                    top: line.top,
                    width: line.width,
                    '--dur': line.dur,
                    '--delay': line.delay,
                  } as React.CSSProperties
                }
                className="evj-energy-line absolute left-0 h-px bg-gradient-to-r from-transparent via-[#00E5C3]/40 to-transparent"
              />
            ))}
          </div>

          {/* Top-Right Controls: Subtle Audio Toggle + Skip Intro */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 * dScale, duration: 0.4 }}
            className="absolute right-4 top-4 sm:right-7 sm:top-6 z-20 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white/70 hover:text-[#00E5C3] hover:border-[#00E5C3]/40 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={finish}
              className="rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-4 py-2 text-xs font-medium tracking-wide text-white/85 hover:border-[#00E5C3]/50 hover:text-[#00E5C3] transition-colors whitespace-nowrap"
            >
              Skip Intro
            </button>
          </motion.div>

          {/* Scene 2: Glowing Teal Road Morphing into Lightning Bolt Across Screen */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            <motion.svg
              ref={svgRef}
              viewBox="0 0 960 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full max-w-5xl opacity-95"
              initial={{ opacity: 0 }}
              animate={
                prefersReduced
                  ? { opacity: 0.35 }
                  : { opacity: [0, 1, 0.9, 0.28] }
              }
              transition={{
                duration: prefersReduced ? 0.3 : 3.4,
                times: prefersReduced ? undefined : [0, 0.3, 0.65, 1],
                ease: 'easeInOut',
              }}
            >
              <defs>
                <linearGradient id="evj-road-grad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#00B8D9" stopOpacity="0.15" />
                  <stop offset="40%" stopColor="#00E5C3" stopOpacity="1" />
                  <stop offset="65%" stopColor="#00B8D9" stopOpacity="1" />
                  <stop offset="100%" stopColor="#00E5C3" stopOpacity="0.15" />
                </linearGradient>
                <filter id="evj-road-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Soft outer glow trail */}
              <motion.path
                d={roadBoltPath}
                stroke="#00E5C3"
                strokeOpacity="0.24"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: prefersReduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: 0.9 * dScale,
                  duration: prefersReduced ? 0.2 : 1.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />

              {/* Crisp luminous road-bolt core */}
              <motion.path
                d={roadBoltPath}
                stroke="url(#evj-road-grad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#evj-road-glow)"
                initial={{ pathLength: prefersReduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: 0.9 * dScale,
                  duration: prefersReduced ? 0.2 : 1.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />

              {/* Flowing energy particles moving along the road */}
              {[0, 0.45, 0.9].map((offsetDelay, i) => (
                <circle key={i} r={i === 0 ? 4 : 3} fill="#00E5C3" filter="url(#evj-road-glow)">
                  <animateMotion
                    dur="1.6s"
                    begin={`${0.95 * dScale + offsetDelay}s`}
                    repeatCount="indefinite"
                    path={roadBoltPath}
                  />
                </circle>
              ))}
            </motion.svg>
          </div>

          {/* Center Stage: Scenes 3, 4 & 5 */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl w-full">
            {/* Scene 3: Combined Emblem Logo (Winding Road + Lightning Bolt + Navigation Pin) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 2.0 * dScale,
                duration: prefersReduced ? 0.25 : 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mb-6 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl border border-[#00E5C3]/30 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_50px_rgba(0,229,195,0.22)]"
            >
              <div className="pointer-events-none absolute -inset-3 rounded-[30px] bg-[radial-gradient(circle,rgba(0,229,195,0.25),transparent_70%)] blur-xl" />
              <svg
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative h-14 w-14 sm:h-16 sm:w-16"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="evj-logo-grad" x1="12" y1="8" x2="68" y2="72" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00E5C3" />
                    <stop offset="100%" stopColor="#00B8D9" />
                  </linearGradient>
                </defs>
                {/* Navigation pin outer silhouette */}
                <path
                  d="M40 8 C24.5 8 12 20.4 12 35.8 C12 52.8 31.2 68.5 38.1 73.6 C39.2 74.4 40.8 74.4 41.9 73.6 C48.8 68.5 68 52.8 68 35.8 C68 20.4 55.5 8 40 8 Z"
                  stroke="url(#evj-logo-grad)"
                  strokeWidth="2.5"
                  fill="rgba(0, 229, 195, 0.06)"
                />
                {/* Winding road S-curve ascending through base */}
                <path
                  d="M25 56 C30 48, 36 48, 40 43"
                  stroke="url(#evj-logo-grad)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeOpacity="0.6"
                />
                {/* Electric lightning bolt core */}
                <path
                  d="M43 20 L31 38 H40.5 L37 54 L50 35 H40.5 L43 20 Z"
                  fill="url(#evj-logo-grad)"
                />
              </svg>
            </motion.div>

            {/* Scene 4: Brand Reveal */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 3.0 * dScale,
                duration: prefersReduced ? 0.25 : 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="space-y-3"
            >
              <h1 className="font-intro-sans text-4xl sm:text-6xl font-extrabold tracking-[0.14em] leading-none">
                <span className="bg-gradient-to-r from-[#00E5C3] to-[#00B8D9] bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(0,229,195,0.35)]">
                  EV
                </span>{' '}
                <span className="text-white">JOURNEY</span>
              </h1>

              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.18em' }}
                animate={{ opacity: 1, letterSpacing: '0.32em' }}
                transition={{
                  delay: 3.35 * dScale,
                  duration: prefersReduced ? 0.2 : 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="font-intro-sans text-[11px] sm:text-xs font-semibold uppercase text-[#00E5C3]/90"
              >
                PLAN. TRACK. ANALYZE. SHARE.
              </motion.p>
            </motion.div>

            {/* Scene 5: Tagline & Glowing Teal Road-Line Loader */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 4.0 * dScale,
                duration: prefersReduced ? 0.2 : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-7 w-full max-w-xs sm:max-w-sm space-y-4"
            >
              <p className="font-intro-sans text-sm sm:text-base font-medium text-white/80 tracking-wide">
                Every Mile. Every Charge. Every Story.
              </p>

              {/* Glowing Teal Road-Line Progress Indicator */}
              <div className="relative mx-auto h-[3px] w-52 sm:w-64 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    delay: 4.0 * dScale,
                    duration: prefersReduced ? 0.4 : 0.95,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: 'left center' }}
                  className="h-full w-full rounded-full bg-gradient-to-r from-[#00B8D9] via-[#00E5C3] to-white shadow-[0_0_12px_#00E5C3]"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
