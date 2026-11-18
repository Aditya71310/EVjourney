import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BatteryCharging, Compass, MapPin, Play, Zap } from 'lucide-react';
import api from '../services/api';
import type { Journey } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { formatDateShort } from '../utils/formatters';
import { useAuthStore } from '../store/authStore';
import { useIntroStore } from '../store/introStore';

export function LandingPage() {
  const { user } = useAuthStore();
  const replayIntro = useIntroStore((s) => s.replayIntro);
  const [publicJourneys, setPublicJourneys] = useState<Journey[]>([]);

  useEffect(() => {
    api
      .get<{ journeys: Journey[] }>('/journeys/public')
      .then((res) => setPublicJourneys(res.data.journeys || []))
      .catch(() => setPublicJourneys([]));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#2E2E33] bg-[#0A0A0A]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="font-serif-display italic text-2xl tracking-tight text-[#FAFAFA] whitespace-nowrap shrink-0"
          >
            EV Journey
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A1A1AA]">
            <a
              href="#features"
              className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <Link
              to="/discover"
              className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
            >
              Discover
            </Link>
            <Link
              to={user ? '/dashboard' : '/login'}
              className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Dashboard' : 'Sign In'}
            </Link>
          </nav>

          <Link
            to={user ? '/journeys/new' : '/signup'}
            className="rounded-lg bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#0A0A0A] hover:bg-[#2DD4BF]/90 transition-colors whitespace-nowrap shrink-0"
          >
            {user ? 'Log a Journey' : 'Start Your Journey'}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-[1280px] px-6 pt-12 pb-20 lg:pt-16">
        <div className="relative overflow-hidden rounded-2xl border border-[#2E2E33] bg-[#141417]">
          <div className="aspect-[16/9] max-h-[620px] w-full relative">
            <ResilientImage
              src="/src/assets/images/hero_ev_roadtrip_1794937947563.jpg"
              alt="Electric SUV parked along a misty coastal mountain road at twilight"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/55 to-[#0A0A0A]/20" />
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl space-y-5"
            >
              <p className="font-mono text-xs tracking-wider uppercase text-[#2DD4BF]">
                Every drive. Every charge. Every memory.
              </p>
              <h1
                className="font-serif-display italic tracking-tight text-[#FAFAFA] leading-[1.04]"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4.25rem)', textWrap: 'balance' }}
              >
                Every Journey Has a Story.
              </h1>
              <p className="text-base sm:text-lg text-[#D4D4D8] leading-relaxed max-w-xl">
                Your electric road trips, beautifully documented. Capture every destination,
                charging stop and unforgettable moment.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to={user ? '/dashboard' : '/signup'}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-5 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#2DD4BF]/90 transition-colors whitespace-nowrap"
                >
                  <span>Start Your Journey</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2E2E33] bg-[#141417]/80 px-5 py-3 text-sm font-medium text-[#FAFAFA] hover:bg-[#1E1E22] transition-colors whitespace-nowrap"
                >
                  <span>Explore Discover Feed</span>
                </Link>
                <button
                  type="button"
                  onClick={replayIntro}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2DD4BF]/30 bg-[#080D12]/80 px-4 py-3 text-sm font-medium text-[#00E5C3] hover:border-[#00E5C3] transition-colors whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Watch Intro</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="mx-auto max-w-[1280px] px-6 py-20 border-t border-[#2E2E33]">
        <div className="max-w-xl space-y-3 mb-12">
          <h2 className="font-serif-display italic text-3xl sm:text-4xl text-[#FAFAFA]">
            Built for electric touring from mile zero
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
            Every charging curve, state-of-charge delta, and mountain overlook lives inside one
            chronological road-trip artifact.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-[#2E2E33] bg-[#141417] overflow-hidden flex flex-col justify-between">
            <div className="p-7 space-y-3">
              <div className="flex items-center gap-2.5 text-[#2DD4BF] text-sm font-medium">
                <BatteryCharging className="h-4 w-4" />
                <span>Charging Telemetry & Cost Ledger</span>
              </div>
              <h3 className="text-xl font-semibold text-[#FAFAFA]">
                Automatic kWh math paired with real station reviews
              </h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xl">
                Record connector type (CCS2, Type 2, CHAdeMO, Tesla), AC/DC power delivery, INR
                cost, and start-to-end SOC with an animated SOC arc.
              </p>
            </div>
            <div className="border-t border-[#2E2E33] bg-[#0A0A0A]/50 px-7 py-5 grid grid-cols-3 gap-4 font-mono tabular-nums text-xs">
              <div>
                <div className="text-[#A1A1AA]">Session Delta</div>
                <div className="mt-1 text-base font-semibold text-[#2DD4BF]">20% → 80%</div>
              </div>
              <div>
                <div className="text-[#A1A1AA]">Energy Added</div>
                <div className="mt-1 text-base font-semibold text-[#FAFAFA]">46.4 kWh</div>
              </div>
              <div>
                <div className="text-[#A1A1AA]">Expenditure</div>
                <div className="mt-1 text-base font-semibold text-[#FAFAFA]">₹980</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2E2E33] bg-[#141417] p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-[#FBBF24] text-sm font-medium">
                <MapPin className="h-4 w-4" />
                <span>Interactive Route Maps</span>
              </div>
              <h3 className="text-xl font-semibold text-[#FAFAFA]">
                Every waypoint plotted cleanly
              </h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                MapLibre vector routing connects your departure point, fast chargers, coffee stops,
                and scenic overlooks with clickable GPS pins.
              </p>
            </div>
            <div className="rounded-lg border border-[#2E2E33] overflow-hidden aspect-[16/10]">
              <ResilientImage
                src="/src/assets/images/journey_mountain_pass_1794937948869.jpg"
                alt="Mountain pass road trip view"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#2E2E33] bg-[#141417] p-7 space-y-3">
            <div className="flex items-center gap-2.5 text-[#2DD4BF] text-sm font-medium">
              <Compass className="h-4 w-4" />
              <span>Shareable Story Cards & Community</span>
            </div>
            <h3 className="text-xl font-semibold text-[#FAFAFA]">
              Export 1080×1920 PNG cards or publish to Discover
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Keep trips private, share with followers, or publish publicly with comments, likes,
              and a generated story card ready for WhatsApp or Instagram.
            </p>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-[#2E2E33] bg-[#141417] p-7 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5 text-[#2DD4BF] text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>40+ Seeded EVs in Your Garage</span>
              </div>
              <h3 className="text-xl font-semibold text-[#FAFAFA]">
                Spec-aware records for every EV you drive
              </h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Pick from Tata Nexon.ev, MG ZS EV, Mahindra XUV400, Hyundai IONIQ 5/6, BYD Atto 3,
                Tesla Model 3, or add custom specs for your EV.
              </p>
            </div>
            <div className="w-full sm:w-56 shrink-0 rounded-lg overflow-hidden border border-[#2E2E33] aspect-[4/3]">
              <ResilientImage
                src="/src/assets/images/ev_suv_garage_1794937948402.jpg"
                alt="Electric SUV inside dark garage"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-[1280px] px-6 py-20 border-t border-[#2E2E33]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4 space-y-3">
            <h2 className="font-serif-display italic text-3xl sm:text-4xl text-[#FAFAFA]">
              Three steps from ignition to archive
            </h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Designed to stay calm and out of your way while you enjoy the quiet highway miles.
            </p>
          </div>

          <div className="lg:col-span-8 divide-y divide-[#2E2E33] border-y border-[#2E2E33]">
            {[
              {
                step: '01. Add Your Electric Vehicle',
                desc: 'Register your EV brand, model, variant, and exact usable battery capacity in kWh inside your garage.',
              },
              {
                step: '02. Document Stops & Charging Sessions',
                desc: 'Create a journey and append timeline stops—fast chargers, espresso stops, hotels, and scenic vistas—with GPS coordinates and photographs.',
              },
              {
                step: '03. Share Your Card or Explore Discover',
                desc: 'Export a 1080×1920 PNG story card, adjust visibility between Private, Followers, or Public, and connect with EV drivers.',
              },
            ].map((item) => (
              <div key={item.step} className="py-6 space-y-2">
                <h3 className="text-lg font-semibold text-[#FAFAFA]">{item.step}</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public Field Logs */}
      {publicJourneys.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-6 py-20 border-t border-[#2E2E33]">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div className="space-y-2">
              <h2 className="font-serif-display italic text-3xl sm:text-4xl text-[#FAFAFA]">
                Published Road Logs
              </h2>
              <p className="text-sm text-[#A1A1AA]">
                Open any public expedition below to inspect its interactive map, charging stats,
                and timeline.
              </p>
            </div>
            <Link
              to="/discover"
              className="text-sm font-medium text-[#2DD4BF] hover:underline whitespace-nowrap"
            >
              Open Discover feed →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publicJourneys.slice(0, 4).map((j) => (
              <Link
                key={j._id}
                to={`/journeys/${j._id}`}
                className="group rounded-xl border border-[#2E2E33] bg-[#141417] overflow-hidden hover:border-[#2DD4BF]/50 transition-colors"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <ResilientImage
                    src={j.coverImage}
                    alt={j.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#A1A1AA] font-mono tabular-nums">
                    <span>{j.distanceKm} km</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateShort(j.startDate)}</span>
                    {j.author && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans">@{j.author.username}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-serif-display italic text-2xl text-[#FAFAFA]">
                    {j.title}
                  </h3>
                  <p className="text-sm text-[#A1A1AA] line-clamp-2">{j.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[#2E2E33] bg-[#0A0A0A]">
        <div className="mx-auto flex max-w-[1280px] flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-6 py-10">
          <div className="space-y-1">
            <span className="font-serif-display italic text-xl text-[#FAFAFA]">
              EV Journey
            </span>
            <p className="text-xs text-[#A1A1AA]">
              Every drive. Every charge. Every memory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#A1A1AA]">
            <a href="#features" className="hover:text-[#FAFAFA] transition-colors">
              Features
            </a>
            <Link to="/discover" className="hover:text-[#FAFAFA] transition-colors">
              Discover
            </Link>
            <Link to="/login" className="hover:text-[#FAFAFA] transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-[#FAFAFA] transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
