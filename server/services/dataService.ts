import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { isMongoConnected } from '../config/db.ts';
import { UserModel } from '../models/User.ts';
import { VehicleModel } from '../models/Vehicle.ts';
import { JourneyModel } from '../models/Journey.ts';
import { TimelineEventModel } from '../models/TimelineEvent.ts';
import { ChargingDetailModel } from '../models/ChargingDetail.ts';
import {
  CommentLikeModel,
  FollowModel,
  JourneyCommentModel,
  JourneyLikeModel,
  JourneySaveModel,
} from '../models/Social.ts';

export interface PlainUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  bio: string;
  city: string;
  country: string;
  coverScene: 'sunset' | 'coast' | 'forest';
  theme: 'dark' | 'light' | 'system';
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface PlainVehicle {
  _id: string;
  userId: string;
  brand: string;
  model: string;
  variant: string;
  batteryCapacity: number;
  colour: string;
  nickname: string;
  photo: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PlainJourney {
  _id: string;
  userId: string;
  vehicleId: string;
  title: string;
  description: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  durationMinutes: number;
  startSOC: number;
  endSOC: number;
  visibility: 'Private' | 'Followers' | 'Public';
  status: 'Draft' | 'Published';
  createdAt: string;
}

export interface PlainTimelineEvent {
  _id: string;
  journeyId: string;
  type:
    | 'Starting point'
    | 'Charging stop'
    | 'Food stop'
    | 'Hotel'
    | 'Scenic location'
    | 'Coffee stop'
    | 'Photograph'
    | 'Custom event'
    | 'Destination';
  title: string;
  timestamp: string;
  location: string;
  coordinates: { lat: number; lng: number };
  note: string;
  photos: string[];
  sequenceIndex: number;
}

export interface PlainChargingDetail {
  _id: string;
  eventId: string;
  chargerName: string;
  network: string;
  connectorType: 'CCS2' | 'AC Type 2' | 'CHAdeMO' | 'AC Type 1' | 'Tesla' | 'Other';
  chargingType: 'AC' | 'DC';
  startSOC: number;
  endSOC: number;
  energyKwh: number;
  durationMinutes: number;
  cost: number;
  rating: number;
  review: string;
}

export interface PlainFollow {
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface PlainJourneyLike {
  _id: string;
  journeyId: string;
  userId: string;
  createdAt: string;
}

export interface PlainJourneySave {
  _id: string;
  journeyId: string;
  userId: string;
  createdAt: string;
}

export interface PlainJourneyComment {
  _id: string;
  journeyId: string;
  userId: string;
  parentId?: string | null;
  text: string;
  createdAt: string;
}

export interface PlainCommentLike {
  _id: string;
  commentId: string;
  userId: string;
  createdAt: string;
}

interface LocalDatabaseSchema {
  users: PlainUser[];
  vehicles: PlainVehicle[];
  journeys: PlainJourney[];
  events: PlainTimelineEvent[];
  chargingDetails: PlainChargingDetail[];
  follows: PlainFollow[];
  journeyLikes: PlainJourneyLike[];
  journeySaves: PlainJourneySave[];
  journeyComments: PlainJourneyComment[];
  commentLikes: PlainCommentLike[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'ev-journey-db.json');

function genId(): string {
  return new mongoose.Types.ObjectId().toString();
}

function readLocalDB(): LocalDatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const empty: LocalDatabaseSchema = {
    users: [],
    vehicles: [],
    journeys: [],
    events: [],
    chargingDetails: [],
    follows: [],
    journeyLikes: [],
    journeySaves: [],
    journeyComments: [],
    commentLikes: [],
  };
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return {
      ...empty,
      ...parsed,
    };
  } catch {
    return empty;
  }
}

function writeLocalDB(db: LocalDatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function toPlain<T>(doc: any): T {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  if (obj.userId) obj.userId = obj.userId.toString();
  if (obj.vehicleId) obj.vehicleId = obj.vehicleId.toString();
  if (obj.journeyId) obj.journeyId = obj.journeyId.toString();
  if (obj.eventId) obj.eventId = obj.eventId.toString();
  if (obj.followerId) obj.followerId = obj.followerId.toString();
  if (obj.followingId) obj.followingId = obj.followingId.toString();
  if (obj.parentId) obj.parentId = obj.parentId.toString();
  if (obj.commentId) obj.commentId = obj.commentId.toString();
  return obj as T;
}

export async function ensureDemoDataSeeded(): Promise<void> {
  const passwordHash = await bcrypt.hash('Electric2026!', 10);

  let demoUser = await findUserByEmail('demo@evjourney.app');
  if (!demoUser) {
    demoUser = await createUser({
      name: 'Aarav Kulkarni',
      username: 'aarav_ev',
      email: 'demo@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'Long-distance electric tourer exploring mountain passes, coastal highways, and fast-charging corridors across Western India.',
      city: 'Mumbai',
      country: 'India',
      coverScene: 'sunset',
      theme: 'dark',
      onboardingCompleted: true,
    });

    const suv = await createVehicle({
      userId: demoUser._id,
      brand: 'Audi',
      model: 'Q8 e-tron',
      variant: '55 Quattro',
      batteryCapacity: 114,
      colour: 'Chronos Matte Charcoal',
      nickname: 'Nightrunner',
      photo: '/src/assets/images/ev_suv_garage_1794937948402.jpg',
      isDefault: true,
    });

    const sedan = await createVehicle({
      userId: demoUser._id,
      brand: 'Hyundai',
      model: 'IONIQ 6',
      variant: 'Long Range AWD',
      batteryCapacity: 77.4,
      colour: 'Nocturne Silver',
      nickname: 'Aero Stream',
      photo: '/src/assets/images/ev_sedan_garage_1794937949633.jpg',
      isDefault: false,
    });

    const j1 = await createJourney({
      userId: demoUser._id,
      vehicleId: suv._id,
      title: 'Sahyadri Monsoon Ridge Crossing',
      description:
        'An early-morning climb from Mumbai across the Western Ghats through Lonavala and Panchgani to Mahabaleshwar, testing regenerative braking on mist-covered switchbacks.',
      coverImage: '/src/assets/images/journey_mountain_pass_1794937948869.jpg',
      startDate: '2026-09-12T05:45:00.000Z',
      endDate: '2026-09-13T18:30:00.000Z',
      startLocation: 'Bandra Kurla Complex, Mumbai',
      endLocation: 'Arthur Seat Point, Mahabaleshwar',
      distanceKm: 274,
      durationMinutes: 390,
      startSOC: 94,
      endSOC: 58,
      visibility: 'Public',
      status: 'Published',
    });

    const j1Events = [
      {
        journeyId: j1._id,
        type: 'Starting point' as const,
        title: 'Pre-Dawn Departure from BKC',
        timestamp: '2026-09-12T05:45:00.000Z',
        location: 'Bandra Kurla Complex, Mumbai',
        coordinates: { lat: 19.0653, lng: 72.8681 },
        note: 'Cabin pre-conditioned while plugged into home 11 kW AC wallbox. Zero traffic onto the Eastern Freeway.',
        photos: ['/src/assets/images/ev_suv_garage_1794937948402.jpg'],
        sequenceIndex: 0,
      },
      {
        journeyId: j1._id,
        type: 'Coffee stop' as const,
        title: 'Khandala Ghat Espresso Break',
        timestamp: '2026-09-12T07:30:00.000Z',
        location: 'Lonavala Expressway Plaza',
        coordinates: { lat: 18.7557, lng: 73.4091 },
        note: 'Light drizzle over the valley. Regenerative braking recovered 3% battery descending toward the food plaza.',
        photos: [],
        sequenceIndex: 1,
      },
      {
        journeyId: j1._id,
        type: 'Charging stop' as const,
        title: 'Pune Ring Hypercharger Top-Up',
        timestamp: '2026-09-12T09:15:00.000Z',
        location: 'Wakad Highway Hub, Pune',
        coordinates: { lat: 18.5987, lng: 73.7688 },
        note: 'Effortless 120 kW CCS2 plug-and-charge session while grabbing breakfast.',
        photos: [],
        sequenceIndex: 2,
      },
      {
        journeyId: j1._id,
        type: 'Scenic location' as const,
        title: 'Panchgani Tableland Mist Overlook',
        timestamp: '2026-09-12T12:10:00.000Z',
        location: 'Tableland Plateau, Panchgani',
        coordinates: { lat: 17.9237, lng: 73.8007 },
        note: 'Dense fog rolling across the basalt ridge. Silent electric torque made the steep 14% gradient effortless.',
        photos: ['/src/assets/images/journey_mountain_pass_1794937948869.jpg'],
        sequenceIndex: 3,
      },
      {
        journeyId: j1._id,
        type: 'Destination' as const,
        title: 'Arrival at Arthur Seat Cliffside',
        timestamp: '2026-09-12T13:30:00.000Z',
        location: 'Arthur Seat Point, Mahabaleshwar',
        coordinates: { lat: 17.9598, lng: 73.6335 },
        note: 'Arrived with 58% SOC remaining and plenty of reserve for Sunday exploration.',
        photos: [],
        sequenceIndex: 4,
      },
    ];

    for (const ev of j1Events) {
      const created = await createTimelineEvent(ev);
      if (ev.type === 'Charging stop') {
        await upsertChargingDetail(created._id, {
          chargerName: 'Statiq 120 kW Highway Hub',
          network: 'Statiq',
          connectorType: 'CCS2',
          chargingType: 'DC',
          startSOC: 44,
          endSOC: 84,
          energyKwh: 45.6,
          durationMinutes: 28,
          cost: 980,
          rating: 5,
          review: 'Clean bay, zero queue, sustained 112 kW peak curve up to 75% SOC.',
        });
      }
    }

    const j2 = await createJourney({
      userId: demoUser._id,
      vehicleId: sedan._id,
      title: 'Konkan Coastal Highway Run',
      description:
        'Two-day grand touring loop hugging the Arabian Sea cliff roads from Alibaug down to Ratnagiri with two ultra-rapid DC stops.',
      coverImage: '/src/assets/images/journey_coastal_overlook_1794937948348.jpg',
      startDate: '2026-10-04T06:15:00.000Z',
      endDate: '2026-10-05T19:45:00.000Z',
      startLocation: 'Mandwa Jetty Road, Alibaug',
      endLocation: 'Ratnadurg Fort Overlook, Ratnagiri',
      distanceKm: 342,
      durationMinutes: 465,
      startSOC: 98,
      endSOC: 41,
      visibility: 'Public',
      status: 'Published',
    });

    const j2Events = [
      {
        journeyId: j2._id,
        type: 'Starting point' as const,
        title: 'Coastal Dawn Rollout',
        timestamp: '2026-10-04T06:15:00.000Z',
        location: 'Alibaug Seafront',
        coordinates: { lat: 18.6414, lng: 72.8722 },
        note: 'Started at 98% SOC with 515 km predicted range on the dash.',
        photos: ['/src/assets/images/ev_sedan_garage_1794937949633.jpg'],
        sequenceIndex: 0,
      },
      {
        journeyId: j2._id,
        type: 'Charging stop' as const,
        title: 'Chiplun NH-66 Fast Charge',
        timestamp: '2026-10-04T11:20:00.000Z',
        location: 'Chiplun Highway Oasis',
        coordinates: { lat: 17.5323, lng: 73.5177 },
        note: '800V architecture pulled 175 kW peak on the dual-gun DC dispenser.',
        photos: [],
        sequenceIndex: 1,
      },
      {
        journeyId: j2._id,
        type: 'Hotel' as const,
        title: 'Cliffside Retreat Overnight',
        timestamp: '2026-10-04T17:40:00.000Z',
        location: 'Ganpatipule Beachfront',
        coordinates: { lat: 17.1449, lng: 73.2665 },
        note: 'Slow Type-2 AC destination charging overnight while watching the tide.',
        photos: ['/src/assets/images/journey_coastal_overlook_1794937948348.jpg'],
        sequenceIndex: 2,
      },
      {
        journeyId: j2._id,
        type: 'Destination' as const,
        title: 'Ratnadurg Sunset Horizon',
        timestamp: '2026-10-05T17:50:00.000Z',
        location: 'Ratnadurg Fort, Ratnagiri',
        coordinates: { lat: 16.9902, lng: 73.2756 },
        note: 'Average trip efficiency settled at 14.1 kWh/100 km along the sea breeze.',
        photos: ['/src/assets/images/hero_ev_roadtrip_1794937947563.jpg'],
        sequenceIndex: 3,
      },
    ];

    for (const ev of j2Events) {
      const created = await createTimelineEvent(ev);
      if (ev.type === 'Charging stop') {
        await upsertChargingDetail(created._id, {
          chargerName: 'Tata Power EZ Charge 180 kW',
          network: 'Tata Power',
          connectorType: 'CCS2',
          chargingType: 'DC',
          startSOC: 21,
          endSOC: 80,
          energyKwh: 45.7,
          durationMinutes: 21,
          cost: 915,
          rating: 4.8,
          review: 'Rapid 800V session, cafe right beside the charging bay.',
        });
      }
    }
  }

  // Phase 2 Community Creators & Feed Seed (EVJ-02 Appendix A)
  const existingAanya = await findUserByUsername('aanya');
  if (!existingAanya) {
    const aanya = await createUser({
      name: 'Aanya Verma',
      username: 'aanya',
      email: 'aanya@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'Reviewer at @evhustle · weekend mountain wanderer · driving an MG ZS EV.',
      city: 'Bangalore',
      country: 'India',
      coverScene: 'sunset',
      theme: 'dark',
      onboardingCompleted: true,
    });
    const ravi = await createUser({
      name: 'Ravi Mishra',
      username: 'ravi_evlog',
      email: 'ravi@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'EV YouTuber documenting western ghats charging corridors · Pune.',
      city: 'Pune',
      country: 'India',
      coverScene: 'coast',
      theme: 'dark',
      onboardingCompleted: true,
    });
    const priya = await createUser({
      name: 'Priya Nair',
      username: 'priyaonroad',
      email: 'priya@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'Weekend driver · Coorg & Western Ghats coffee estate trails.',
      city: 'Bangalore',
      country: 'India',
      coverScene: 'forest',
      theme: 'dark',
      onboardingCompleted: true,
    });
    const karthik = await createUser({
      name: 'Karthik S',
      username: 'kart_ev',
      email: 'karthik@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'Tesla Model 3 · Coastal highway dawn drives from Chennai.',
      city: 'Chennai',
      country: 'India',
      coverScene: 'coast',
      theme: 'dark',
      onboardingCompleted: true,
    });
    const sanjay = await createUser({
      name: 'Sanjay Iyer',
      username: 'sanjayev',
      email: 'sanjay@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'Long-distance grand touring · Hyderabad.',
      city: 'Hyderabad',
      country: 'India',
      coverScene: 'sunset',
      theme: 'dark',
      onboardingCompleted: true,
    });
    const meera = await createUser({
      name: 'Meera Joshi',
      username: 'meeraj',
      email: 'meera@evjourney.app',
      password: passwordHash,
      avatar: '',
      bio: 'Coastal trips · Mumbai.',
      city: 'Mumbai',
      country: 'India',
      coverScene: 'coast',
      theme: 'dark',
      onboardingCompleted: true,
    });

    const aanyaCar = await createVehicle({
      userId: aanya._id,
      brand: 'MG',
      model: 'ZS EV',
      variant: 'Exclusive Pro',
      batteryCapacity: 50.3,
      colour: 'Glaze Red',
      nickname: 'Highlander',
      photo: '/src/assets/images/ev_suv_garage_1794937948402.jpg',
      isDefault: true,
    });
    const raviCar = await createVehicle({
      userId: ravi._id,
      brand: 'Tata',
      model: 'Nexon.ev',
      variant: '45 kWh Empowered+',
      batteryCapacity: 45,
      colour: 'Daytona Grey',
      nickname: 'Sahyadri',
      photo: '/src/assets/images/ev_suv_garage_1794937948402.jpg',
      isDefault: true,
    });
    const priyaCar = await createVehicle({
      userId: priya._id,
      brand: 'Hyundai',
      model: 'IONIQ 5',
      variant: 'RWD Long Range',
      batteryCapacity: 72.6,
      colour: 'Gravity Gold',
      nickname: 'Estate Runner',
      photo: '/src/assets/images/ev_sedan_garage_1794937949633.jpg',
      isDefault: true,
    });
    const karthikCar = await createVehicle({
      userId: karthik._id,
      brand: 'Tesla',
      model: 'Model 3',
      variant: 'Long Range AWD',
      batteryCapacity: 75,
      colour: 'Stealth Grey',
      nickname: 'Dawnbreaker',
      photo: '/src/assets/images/ev_sedan_garage_1794937949633.jpg',
      isDefault: true,
    });

    const spiti = await createJourney({
      userId: aanya._id,
      vehicleId: aanyaCar._id,
      title: 'Spiti in a hatchback',
      description:
        'Crossing Kunzum La and Key Monastery in cold mountain air with careful regeneration planning across four high-altitude stops.',
      coverImage: '/src/assets/images/journey_mountain_pass_1794937948869.jpg',
      startDate: '2026-11-16T05:30:00.000Z',
      endDate: '2026-11-17T16:10:00.000Z',
      startLocation: 'Manali',
      endLocation: 'Kaza',
      distanceKm: 412,
      durationMinutes: 540,
      startSOC: 96,
      endSOC: 28,
      visibility: 'Public',
      status: 'Published',
    });

    const spitiStart = await createTimelineEvent({
      journeyId: spiti._id,
      type: 'Starting point',
      title: 'Manali Mall Road Rollout',
      timestamp: '2026-11-16T05:30:00.000Z',
      location: 'Manali, Himachal Pradesh',
      coordinates: { lat: 32.2432, lng: 77.1892 },
      note: 'Pre-heated cabin while plugged in. Clear skies ahead of Atal Tunnel.',
      photos: [],
      sequenceIndex: 0,
    });
    const spitiCharge = await createTimelineEvent({
      journeyId: spiti._id,
      type: 'Charging stop',
      title: 'Keylong AC Destination Top-Up',
      timestamp: '2026-11-16T09:15:00.000Z',
      location: 'Keylong, Lahaul',
      coordinates: { lat: 32.5712, lng: 77.032 },
      note: 'That charger had a 5-minute queue — worth the chai stop overlooking the valley.',
      photos: [],
      sequenceIndex: 1,
    });
    await upsertChargingDetail(spitiCharge._id, {
      chargerName: 'Statiq Lahaul Hub',
      network: 'Statiq',
      connectorType: 'CCS2',
      chargingType: 'DC',
      startSOC: 34,
      endSOC: 88,
      energyKwh: 27.2,
      durationMinutes: 42,
      cost: 680,
      rating: 4.5,
      review: 'Steady 35 kW delivery even at 3,000m elevation.',
    });
    await createTimelineEvent({
      journeyId: spiti._id,
      type: 'Scenic location',
      title: 'Kunzum Pass Ridge',
      timestamp: '2026-11-16T14:20:00.000Z',
      location: 'Kunzum La, Spiti',
      coordinates: { lat: 32.3991, lng: 77.6382 },
      note: 'Regen recovered 11% SOC descending toward Losar.',
      photos: ['/src/assets/images/journey_mountain_pass_1794937948869.jpg'],
      sequenceIndex: 2,
    });
    await createTimelineEvent({
      journeyId: spiti._id,
      type: 'Destination',
      title: 'Arrival in Kaza',
      timestamp: '2026-11-16T17:10:00.000Z',
      location: 'Kaza Town, Spiti',
      coordinates: { lat: 32.2276, lng: 78.0717 },
      note: 'Zero range anxiety thanks to downhill regen.',
      photos: [],
      sequenceIndex: 3,
    });
    void spitiStart;

    const konkanRavi = await createJourney({
      userId: ravi._id,
      vehicleId: raviCar._id,
      title: 'Konkan in the monsoon',
      description:
        'Rain-slicked ghats from Pune through Tamhini down to Ganpatipule with dependable Tata Power stops.',
      coverImage: '/src/assets/images/journey_coastal_overlook_1794937948348.jpg',
      startDate: '2026-11-15T06:00:00.000Z',
      endDate: '2026-11-15T15:40:00.000Z',
      startLocation: 'Pune',
      endLocation: 'Ganpatipule',
      distanceKm: 248,
      durationMinutes: 355,
      startSOC: 95,
      endSOC: 38,
      visibility: 'Public',
      status: 'Published',
    });

    const coorg = await createJourney({
      userId: priya._id,
      vehicleId: priyaCar._id,
      title: 'Coorg coffee crawl',
      description:
        'Shaded estate roads from Bangalore to Madikeri with two espresso stops and an effortless DC top-up at Mysore.',
      coverImage: '/src/assets/images/hero_ev_roadtrip_1794937947563.jpg',
      startDate: '2026-11-14T06:30:00.000Z',
      endDate: '2026-11-14T16:00:00.000Z',
      startLocation: 'Bangalore',
      endLocation: 'Madikeri',
      distanceKm: 268,
      durationMinutes: 310,
      startSOC: 92,
      endSOC: 44,
      visibility: 'Public',
      status: 'Published',
    });

    const ooty = await createJourney({
      userId: karthik._id,
      vehicleId: karthikCar._id,
      title: 'Ooty ridge at dawn',
      description:
        '565 km grand tour from Chennai sea level up 36 hairpin bends into the Nilgiris.',
      coverImage: '/src/assets/images/journey_mountain_pass_1794937948869.jpg',
      startDate: '2026-11-13T04:15:00.000Z',
      endDate: '2026-11-13T18:20:00.000Z',
      startLocation: 'Chennai',
      endLocation: 'Ooty',
      distanceKm: 565,
      durationMinutes: 610,
      startSOC: 99,
      endSOC: 31,
      visibility: 'Public',
      status: 'Published',
    });

    // Follows & Likes & Comments
    await createFollowDirect(demoUser._id, aanya._id);
    await createFollowDirect(demoUser._id, ravi._id);
    await createFollowDirect(aanya._id, demoUser._id);
    await createFollowDirect(priya._id, demoUser._id);
    await createFollowDirect(karthik._id, aanya._id);
    await createFollowDirect(sanjay._id, aanya._id);
    await createFollowDirect(meera._id, aanya._id);
    await createFollowDirect(ravi._id, aanya._id);

    for (const u of [demoUser, ravi, priya, karthik, sanjay, meera]) {
      await toggleJourneyLike(spiti._id, u._id, true);
    }
    for (const u of [demoUser, aanya, priya]) {
      await toggleJourneyLike(konkanRavi._id, u._id, true);
      await toggleJourneyLike(coorg._id, u._id, true);
      await toggleJourneyLike(ooty._id, u._id, true);
    }

    const c1 = await addJourneyComment(
      spiti._id,
      ravi._id,
      'That charger had a 5-minute queue when I went too — worth the chai stop.'
    );
    await addJourneyComment(
      spiti._id,
      aanya._id,
      'Expressway up, old road back. Worth the slow way home.',
      c1._id
    );
    await addJourneyComment(
      spiti._id,
      priya._id,
      'How was the AC on the incline? My ZS EV drops range pretty fast on those climbs.'
    );
  }
}

// ---------- USERS ----------
export async function findUserByEmail(email: string): Promise<PlainUser | null> {
  const normalized = email.trim().toLowerCase();
  if (isMongoConnected()) {
    const doc = await UserModel.findOne({ email: normalized });
    return doc ? toPlain<PlainUser>(doc) : null;
  }
  const db = readLocalDB();
  return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function findUserByUsername(username: string): Promise<PlainUser | null> {
  const normalized = username.trim().toLowerCase();
  if (isMongoConnected()) {
    const doc = await UserModel.findOne({ username: normalized });
    return doc ? toPlain<PlainUser>(doc) : null;
  }
  const db = readLocalDB();
  return db.users.find((u) => u.username.toLowerCase() === normalized) || null;
}

export async function findUserById(id: string): Promise<PlainUser | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id);
    return doc ? toPlain<PlainUser>(doc) : null;
  }
  const db = readLocalDB();
  return db.users.find((u) => u._id === id) || null;
}

export async function createUser(
  data: Omit<PlainUser, '_id' | 'createdAt' | 'coverScene'> & {
    coverScene?: 'sunset' | 'coast' | 'forest';
  }
): Promise<PlainUser> {
  const payload = { coverScene: 'sunset' as const, ...data };
  if (isMongoConnected()) {
    const doc = await UserModel.create(payload);
    return toPlain<PlainUser>(doc);
  }
  const db = readLocalDB();
  const user: PlainUser = {
    ...payload,
    _id: genId(),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  writeLocalDB(db);
  return user;
}

export async function updateUser(
  id: string,
  updates: Partial<PlainUser>
): Promise<PlainUser | null> {
  if (isMongoConnected()) {
    const doc = await UserModel.findByIdAndUpdate(id, updates, { new: true });
    return doc ? toPlain<PlainUser>(doc) : null;
  }
  const db = readLocalDB();
  const idx = db.users.findIndex((u) => u._id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeLocalDB(db);
  return db.users[idx];
}

export async function deleteUserAndData(userId: string): Promise<void> {
  const journeys = await findJourneysByUser(userId);
  for (const j of journeys) {
    await deleteJourney(j._id, userId);
  }
  if (isMongoConnected()) {
    await VehicleModel.deleteMany({ userId });
    await FollowModel.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] });
    await JourneyLikeModel.deleteMany({ userId });
    await JourneySaveModel.deleteMany({ userId });
    await JourneyCommentModel.deleteMany({ userId });
    await UserModel.deleteOne({ _id: userId });
    return;
  }
  const db = readLocalDB();
  db.vehicles = db.vehicles.filter((v) => v.userId !== userId);
  db.follows = db.follows.filter((f) => f.followerId !== userId && f.followingId !== userId);
  db.journeyLikes = db.journeyLikes.filter((l) => l.userId !== userId);
  db.journeySaves = db.journeySaves.filter((s) => s.userId !== userId);
  db.journeyComments = db.journeyComments.filter((c) => c.userId !== userId);
  db.users = db.users.filter((u) => u._id !== userId);
  writeLocalDB(db);
}

// ---------- VEHICLES ----------
export async function findVehiclesByUser(userId: string): Promise<PlainVehicle[]> {
  if (isMongoConnected()) {
    const docs = await VehicleModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
    return docs.map((d) => toPlain<PlainVehicle>(d));
  }
  const db = readLocalDB();
  return db.vehicles
    .filter((v) => v.userId === userId)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function findVehicleById(id: string): Promise<PlainVehicle | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await VehicleModel.findById(id);
    return doc ? toPlain<PlainVehicle>(doc) : null;
  }
  const db = readLocalDB();
  return db.vehicles.find((v) => v._id === id) || null;
}

export async function createVehicle(
  data: Omit<PlainVehicle, '_id' | 'createdAt'>
): Promise<PlainVehicle> {
  const existing = await findVehiclesByUser(data.userId);
  const shouldBeDefault = data.isDefault || existing.length === 0;

  if (isMongoConnected()) {
    if (shouldBeDefault) {
      await VehicleModel.updateMany({ userId: data.userId }, { isDefault: false });
    }
    const doc = await VehicleModel.create({ ...data, isDefault: shouldBeDefault });
    return toPlain<PlainVehicle>(doc);
  }
  const db = readLocalDB();
  if (shouldBeDefault) {
    db.vehicles = db.vehicles.map((v) =>
      v.userId === data.userId ? { ...v, isDefault: false } : v
    );
  }
  const vehicle: PlainVehicle = {
    ...data,
    isDefault: shouldBeDefault,
    _id: genId(),
    createdAt: new Date().toISOString(),
  };
  db.vehicles.push(vehicle);
  writeLocalDB(db);
  return vehicle;
}

export async function updateVehicle(
  id: string,
  userId: string,
  updates: Partial<PlainVehicle>
): Promise<PlainVehicle | null> {
  if (isMongoConnected()) {
    if (updates.isDefault) {
      await VehicleModel.updateMany({ userId }, { isDefault: false });
    }
    const doc = await VehicleModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    );
    return doc ? toPlain<PlainVehicle>(doc) : null;
  }
  const db = readLocalDB();
  const idx = db.vehicles.findIndex((v) => v._id === id && v.userId === userId);
  if (idx === -1) return null;
  if (updates.isDefault) {
    db.vehicles = db.vehicles.map((v) =>
      v.userId === userId ? { ...v, isDefault: false } : v
    );
  }
  db.vehicles[idx] = { ...db.vehicles[idx], ...updates };
  writeLocalDB(db);
  return db.vehicles[idx];
}

export async function deleteVehicle(id: string, userId: string): Promise<boolean> {
  if (isMongoConnected()) {
    const res = await VehicleModel.deleteOne({ _id: id, userId });
    return res.deletedCount > 0;
  }
  const db = readLocalDB();
  const initial = db.vehicles.length;
  db.vehicles = db.vehicles.filter((v) => !(v._id === id && v.userId === userId));
  writeLocalDB(db);
  return db.vehicles.length < initial;
}

// ---------- JOURNEYS ----------
export async function findJourneysByUser(userId: string): Promise<PlainJourney[]> {
  if (isMongoConnected()) {
    const docs = await JourneyModel.find({ userId }).sort({ startDate: -1, createdAt: -1 });
    return docs.map((d) => toPlain<PlainJourney>(d));
  }
  const db = readLocalDB();
  return db.journeys
    .filter((j) => j.userId === userId)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export async function findPublicJourneys(): Promise<PlainJourney[]> {
  if (isMongoConnected()) {
    const docs = await JourneyModel.find({ visibility: 'Public', status: 'Published' })
      .sort({ startDate: -1 })
      .limit(30);
    return docs.map((d) => toPlain<PlainJourney>(d));
  }
  const db = readLocalDB();
  return db.journeys
    .filter((j) => j.visibility === 'Public' && j.status === 'Published')
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 30);
}

export async function findDiscoverJourneys(
  viewerUserId: string | undefined,
  tab: 'trending' | 'latest' | 'following'
): Promise<PlainJourney[]> {
  let pool: PlainJourney[] = [];
  if (tab === 'following') {
    if (!viewerUserId) return [];
    const followingIds = await getFollowingIds(viewerUserId);
    if (followingIds.length === 0) return [];
    if (isMongoConnected()) {
      const docs = await JourneyModel.find({
        userId: { $in: followingIds },
        status: 'Published',
        visibility: { $in: ['Public', 'Followers'] },
      })
        .sort({ startDate: -1 })
        .limit(30);
      pool = docs.map((d) => toPlain<PlainJourney>(d));
    } else {
      const db = readLocalDB();
      pool = db.journeys
        .filter(
          (j) =>
            followingIds.includes(j.userId) &&
            j.status === 'Published' &&
            (j.visibility === 'Public' || j.visibility === 'Followers')
        )
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }
  } else {
    pool = await findPublicJourneys();
  }

  if (tab === 'trending') {
    const enriched = await Promise.all(
      pool.map(async (j) => {
        const stats = await getJourneySocialStats(j._id, viewerUserId);
        return { journey: j, score: stats.likesCount * 2 + stats.commentsCount };
      })
    );
    enriched.sort((a, b) => b.score - a.score);
    return enriched.map((e) => e.journey);
  }
  return pool;
}

export async function findJourneyById(id: string): Promise<PlainJourney | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await JourneyModel.findById(id);
    return doc ? toPlain<PlainJourney>(doc) : null;
  }
  const db = readLocalDB();
  return db.journeys.find((j) => j._id === id) || null;
}

export async function createJourney(
  data: Omit<PlainJourney, '_id' | 'createdAt'>
): Promise<PlainJourney> {
  if (isMongoConnected()) {
    const doc = await JourneyModel.create(data);
    return toPlain<PlainJourney>(doc);
  }
  const db = readLocalDB();
  const journey: PlainJourney = {
    ...data,
    _id: genId(),
    createdAt: new Date().toISOString(),
  };
  db.journeys.push(journey);
  writeLocalDB(db);
  return journey;
}

export async function updateJourney(
  id: string,
  userId: string,
  updates: Partial<PlainJourney>
): Promise<PlainJourney | null> {
  if (isMongoConnected()) {
    const doc = await JourneyModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    );
    return doc ? toPlain<PlainJourney>(doc) : null;
  }
  const db = readLocalDB();
  const idx = db.journeys.findIndex((j) => j._id === id && j.userId === userId);
  if (idx === -1) return null;
  db.journeys[idx] = { ...db.journeys[idx], ...updates };
  writeLocalDB(db);
  return db.journeys[idx];
}

export async function deleteJourney(id: string, userId: string): Promise<boolean> {
  const events = await findEventsByJourney(id);
  const eventIds = events.map((e) => e._id);

  if (isMongoConnected()) {
    const res = await JourneyModel.deleteOne({ _id: id, userId });
    if (res.deletedCount > 0) {
      await TimelineEventModel.deleteMany({ journeyId: id });
      await JourneyLikeModel.deleteMany({ journeyId: id });
      await JourneySaveModel.deleteMany({ journeyId: id });
      await JourneyCommentModel.deleteMany({ journeyId: id });
      if (eventIds.length > 0) {
        await ChargingDetailModel.deleteMany({ eventId: { $in: eventIds } });
      }
      return true;
    }
    return false;
  }
  const db = readLocalDB();
  const initial = db.journeys.length;
  db.journeys = db.journeys.filter((j) => !(j._id === id && j.userId === userId));
  if (db.journeys.length < initial) {
    db.events = db.events.filter((e) => e.journeyId !== id);
    db.chargingDetails = db.chargingDetails.filter((c) => !eventIds.includes(c.eventId));
    db.journeyLikes = db.journeyLikes.filter((l) => l.journeyId !== id);
    db.journeySaves = db.journeySaves.filter((s) => s.journeyId !== id);
    db.journeyComments = db.journeyComments.filter((c) => c.journeyId !== id);
    writeLocalDB(db);
    return true;
  }
  return false;
}

// ---------- TIMELINE EVENTS & CHARGING DETAILS ----------
export async function findEventsByJourney(
  journeyId: string
): Promise<(PlainTimelineEvent & { chargingDetail?: PlainChargingDetail | null })[]> {
  let events: PlainTimelineEvent[] = [];
  if (isMongoConnected()) {
    const docs = await TimelineEventModel.find({ journeyId }).sort({
      sequenceIndex: 1,
      timestamp: 1,
    });
    events = docs.map((d) => toPlain<PlainTimelineEvent>(d));
    const eventIds = events.map((e) => e._id);
    const details = await ChargingDetailModel.find({ eventId: { $in: eventIds } });
    const detailMap = new Map(
      details.map((d) => {
        const plain = toPlain<PlainChargingDetail>(d);
        return [plain.eventId, plain];
      })
    );
    return events.map((ev) => ({
      ...ev,
      chargingDetail: detailMap.get(ev._id) || null,
    }));
  }

  const db = readLocalDB();
  events = db.events
    .filter((e) => e.journeyId === journeyId)
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  return events.map((ev) => ({
    ...ev,
    chargingDetail: db.chargingDetails.find((c) => c.eventId === ev._id) || null,
  }));
}

export async function findEventById(id: string): Promise<PlainTimelineEvent | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await TimelineEventModel.findById(id);
    return doc ? toPlain<PlainTimelineEvent>(doc) : null;
  }
  const db = readLocalDB();
  return db.events.find((e) => e._id === id) || null;
}

export async function createTimelineEvent(
  data: Omit<PlainTimelineEvent, '_id'>
): Promise<PlainTimelineEvent> {
  if (isMongoConnected()) {
    const doc = await TimelineEventModel.create(data);
    return toPlain<PlainTimelineEvent>(doc);
  }
  const db = readLocalDB();
  const ev: PlainTimelineEvent = {
    ...data,
    _id: genId(),
  };
  db.events.push(ev);
  writeLocalDB(db);
  return ev;
}

export async function updateTimelineEvent(
  id: string,
  updates: Partial<PlainTimelineEvent>
): Promise<PlainTimelineEvent | null> {
  if (isMongoConnected()) {
    const doc = await TimelineEventModel.findByIdAndUpdate(id, updates, { new: true });
    return doc ? toPlain<PlainTimelineEvent>(doc) : null;
  }
  const db = readLocalDB();
  const idx = db.events.findIndex((e) => e._id === id);
  if (idx === -1) return null;
  db.events[idx] = { ...db.events[idx], ...updates };
  writeLocalDB(db);
  return db.events[idx];
}

export async function deleteTimelineEvent(id: string): Promise<boolean> {
  if (isMongoConnected()) {
    const res = await TimelineEventModel.deleteOne({ _id: id });
    if (res.deletedCount > 0) {
      await ChargingDetailModel.deleteOne({ eventId: id });
      return true;
    }
    return false;
  }
  const db = readLocalDB();
  const initial = db.events.length;
  db.events = db.events.filter((e) => e._id !== id);
  db.chargingDetails = db.chargingDetails.filter((c) => c.eventId !== id);
  writeLocalDB(db);
  return db.events.length < initial;
}

export async function upsertChargingDetail(
  eventId: string,
  data: Omit<PlainChargingDetail, '_id' | 'eventId'>
): Promise<PlainChargingDetail> {
  if (isMongoConnected()) {
    const doc = await ChargingDetailModel.findOneAndUpdate(
      { eventId },
      { ...data, eventId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return toPlain<PlainChargingDetail>(doc);
  }
  const db = readLocalDB();
  const idx = db.chargingDetails.findIndex((c) => c.eventId === eventId);
  if (idx >= 0) {
    db.chargingDetails[idx] = {
      ...db.chargingDetails[idx],
      ...data,
      eventId,
    };
    writeLocalDB(db);
    return db.chargingDetails[idx];
  }
  const created: PlainChargingDetail = {
    _id: genId(),
    eventId,
    ...data,
  };
  db.chargingDetails.push(created);
  writeLocalDB(db);
  return created;
}

export async function getAllUserChargingDetails(
  userId: string
): Promise<PlainChargingDetail[]> {
  const journeys = await findJourneysByUser(userId);
  const journeyIds = journeys.map((j) => j._id);
  if (journeyIds.length === 0) return [];

  if (isMongoConnected()) {
    const events = await TimelineEventModel.find({
      journeyId: { $in: journeyIds },
      type: 'Charging stop',
    });
    const eventIds = events.map((e) => e._id);
    const details = await ChargingDetailModel.find({ eventId: { $in: eventIds } });
    return details.map((d) => toPlain<PlainChargingDetail>(d));
  }

  const db = readLocalDB();
  const eventIds = db.events
    .filter((e) => journeyIds.includes(e.journeyId))
    .map((e) => e._id);
  return db.chargingDetails.filter((c) => eventIds.includes(c.eventId));
}

// ---------- PHASE 2: SOCIAL OPERATIONS ----------
async function createFollowDirect(followerId: string, followingId: string) {
  if (followerId === followingId) return;
  if (isMongoConnected()) {
    await FollowModel.findOneAndUpdate(
      { followerId, followingId },
      { followerId, followingId },
      { upsert: true }
    );
    return;
  }
  const db = readLocalDB();
  const exists = db.follows.some(
    (f) => f.followerId === followerId && f.followingId === followingId
  );
  if (!exists) {
    db.follows.push({
      _id: genId(),
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    });
    writeLocalDB(db);
  }
}

export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<boolean> {
  if (followerId === followingId) return false;
  if (isMongoConnected()) {
    const existing = await FollowModel.findOne({ followerId, followingId });
    if (existing) {
      await FollowModel.deleteOne({ _id: existing._id });
      return false;
    }
    await FollowModel.create({ followerId, followingId });
    return true;
  }
  const db = readLocalDB();
  const idx = db.follows.findIndex(
    (f) => f.followerId === followerId && f.followingId === followingId
  );
  if (idx >= 0) {
    db.follows.splice(idx, 1);
    writeLocalDB(db);
    return false;
  }
  db.follows.push({
    _id: genId(),
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  });
  writeLocalDB(db);
  return true;
}

export async function isFollowingUser(
  followerId: string,
  followingId: string
): Promise<boolean> {
  if (isMongoConnected()) {
    const doc = await FollowModel.findOne({ followerId, followingId });
    return Boolean(doc);
  }
  const db = readLocalDB();
  return db.follows.some(
    (f) => f.followerId === followerId && f.followingId === followingId
  );
}

export async function getFollowerIds(userId: string): Promise<string[]> {
  if (isMongoConnected()) {
    const docs = await FollowModel.find({ followingId: userId });
    return docs.map((d) => d.followerId.toString());
  }
  const db = readLocalDB();
  return db.follows.filter((f) => f.followingId === userId).map((f) => f.followerId);
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  if (isMongoConnected()) {
    const docs = await FollowModel.find({ followerId: userId });
    return docs.map((d) => d.followingId.toString());
  }
  const db = readLocalDB();
  return db.follows.filter((f) => f.followerId === userId).map((f) => f.followingId);
}

export async function toggleJourneyLike(
  journeyId: string,
  userId: string,
  forceTrue = false
): Promise<{ isLiked: boolean; likesCount: number }> {
  if (isMongoConnected()) {
    const existing = await JourneyLikeModel.findOne({ journeyId, userId });
    let isLiked = true;
    if (existing && !forceTrue) {
      await JourneyLikeModel.deleteOne({ _id: existing._id });
      isLiked = false;
    } else if (!existing) {
      await JourneyLikeModel.create({ journeyId, userId });
    }
    const likesCount = await JourneyLikeModel.countDocuments({ journeyId });
    return { isLiked, likesCount };
  }
  const db = readLocalDB();
  const idx = db.journeyLikes.findIndex(
    (l) => l.journeyId === journeyId && l.userId === userId
  );
  let isLiked = true;
  if (idx >= 0 && !forceTrue) {
    db.journeyLikes.splice(idx, 1);
    isLiked = false;
  } else if (idx === -1) {
    db.journeyLikes.push({
      _id: genId(),
      journeyId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  writeLocalDB(db);
  const likesCount = db.journeyLikes.filter((l) => l.journeyId === journeyId).length;
  return { isLiked, likesCount };
}

export async function toggleJourneySave(
  journeyId: string,
  userId: string
): Promise<boolean> {
  if (isMongoConnected()) {
    const existing = await JourneySaveModel.findOne({ journeyId, userId });
    if (existing) {
      await JourneySaveModel.deleteOne({ _id: existing._id });
      return false;
    }
    await JourneySaveModel.create({ journeyId, userId });
    return true;
  }
  const db = readLocalDB();
  const idx = db.journeySaves.findIndex(
    (s) => s.journeyId === journeyId && s.userId === userId
  );
  if (idx >= 0) {
    db.journeySaves.splice(idx, 1);
    writeLocalDB(db);
    return false;
  }
  db.journeySaves.push({
    _id: genId(),
    journeyId,
    userId,
    createdAt: new Date().toISOString(),
  });
  writeLocalDB(db);
  return true;
}

export async function getSavedJourneysByUser(userId: string): Promise<PlainJourney[]> {
  let journeyIds: string[] = [];
  if (isMongoConnected()) {
    const saves = await JourneySaveModel.find({ userId }).sort({ createdAt: -1 });
    journeyIds = saves.map((s) => s.journeyId.toString());
  } else {
    const db = readLocalDB();
    journeyIds = db.journeySaves
      .filter((s) => s.userId === userId)
      .map((s) => s.journeyId);
  }
  const journeys = await Promise.all(journeyIds.map((id) => findJourneyById(id)));
  return journeys.filter((j): j is PlainJourney => Boolean(j));
}

export async function getJourneySocialStats(
  journeyId: string,
  viewerUserId?: string
): Promise<{
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}> {
  if (isMongoConnected()) {
    const [likesCount, commentsCount, likedDoc, savedDoc] = await Promise.all([
      JourneyLikeModel.countDocuments({ journeyId }),
      JourneyCommentModel.countDocuments({ journeyId }),
      viewerUserId ? JourneyLikeModel.findOne({ journeyId, userId: viewerUserId }) : null,
      viewerUserId ? JourneySaveModel.findOne({ journeyId, userId: viewerUserId }) : null,
    ]);
    return {
      likesCount,
      commentsCount,
      isLiked: Boolean(likedDoc),
      isSaved: Boolean(savedDoc),
    };
  }
  const db = readLocalDB();
  return {
    likesCount: db.journeyLikes.filter((l) => l.journeyId === journeyId).length,
    commentsCount: db.journeyComments.filter((c) => c.journeyId === journeyId).length,
    isLiked: viewerUserId
      ? db.journeyLikes.some((l) => l.journeyId === journeyId && l.userId === viewerUserId)
      : false,
    isSaved: viewerUserId
      ? db.journeySaves.some((s) => s.journeyId === journeyId && s.userId === viewerUserId)
      : false,
  };
}

export async function getJourneyComments(
  journeyId: string,
  viewerUserId?: string
) {
  let raw: PlainJourneyComment[] = [];
  let likes: PlainCommentLike[] = [];
  if (isMongoConnected()) {
    const docs = await JourneyCommentModel.find({ journeyId }).sort({ createdAt: 1 });
    raw = docs.map((d) => toPlain<PlainJourneyComment>(d));
    const ids = raw.map((r) => r._id);
    const likeDocs = await CommentLikeModel.find({ commentId: { $in: ids } });
    likes = likeDocs.map((d) => toPlain<PlainCommentLike>(d));
  } else {
    const db = readLocalDB();
    raw = db.journeyComments
      .filter((c) => c.journeyId === journeyId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    likes = db.commentLikes;
  }

  const userIds = Array.from(new Set(raw.map((c) => c.userId)));
  const users = await Promise.all(userIds.map((uid) => findUserById(uid)));
  const userMap = new Map(
    users
      .filter((u): u is PlainUser => Boolean(u))
      .map((u) => [
        u._id,
        { _id: u._id, name: u.name, username: u.username, avatar: u.avatar },
      ])
  );

  const enriched = raw.map((c) => {
    const cLikes = likes.filter((l) => l.commentId === c._id);
    return {
      ...c,
      author: userMap.get(c.userId) || {
        _id: c.userId,
        name: 'Driver',
        username: 'driver',
      },
      likesCount: cLikes.length,
      isLiked: viewerUserId ? cLikes.some((l) => l.userId === viewerUserId) : false,
      replies: [] as any[],
    };
  });

  const topLevel = enriched.filter((c) => !c.parentId);
  const byId = new Map(topLevel.map((c) => [c._id, c]));
  for (const c of enriched) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.replies.push(c);
    }
  }
  return topLevel;
}

export async function addJourneyComment(
  journeyId: string,
  userId: string,
  text: string,
  parentId?: string | null
): Promise<PlainJourneyComment> {
  if (isMongoConnected()) {
    const doc = await JourneyCommentModel.create({
      journeyId,
      userId,
      parentId: parentId || null,
      text: text.trim(),
    });
    return toPlain<PlainJourneyComment>(doc);
  }
  const db = readLocalDB();
  const created: PlainJourneyComment = {
    _id: genId(),
    journeyId,
    userId,
    parentId: parentId || null,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  db.journeyComments.push(created);
  writeLocalDB(db);
  return created;
}

export async function toggleCommentLike(
  commentId: string,
  userId: string
): Promise<{ isLiked: boolean; likesCount: number }> {
  if (isMongoConnected()) {
    const existing = await CommentLikeModel.findOne({ commentId, userId });
    let isLiked = true;
    if (existing) {
      await CommentLikeModel.deleteOne({ _id: existing._id });
      isLiked = false;
    } else {
      await CommentLikeModel.create({ commentId, userId });
    }
    const likesCount = await CommentLikeModel.countDocuments({ commentId });
    return { isLiked, likesCount };
  }
  const db = readLocalDB();
  const idx = db.commentLikes.findIndex(
    (l) => l.commentId === commentId && l.userId === userId
  );
  let isLiked = true;
  if (idx >= 0) {
    db.commentLikes.splice(idx, 1);
    isLiked = false;
  } else {
    db.commentLikes.push({
      _id: genId(),
      commentId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  writeLocalDB(db);
  const likesCount = db.commentLikes.filter((l) => l.commentId === commentId).length;
  return { isLiked, likesCount };
}

export async function searchAll(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { users: [], journeys: [], vehicles: [] };
  }

  let allUsers: PlainUser[] = [];
  let allJourneys: PlainJourney[] = [];
  let allVehicles: PlainVehicle[] = [];

  if (isMongoConnected()) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [uDocs, jDocs, vDocs] = await Promise.all([
      UserModel.find({ $or: [{ name: regex }, { username: regex }, { city: regex }] }).limit(
        15
      ),
      JourneyModel.find({
        visibility: 'Public',
        status: 'Published',
        $or: [
          { title: regex },
          { description: regex },
          { startLocation: regex },
          { endLocation: regex },
        ],
      }).limit(15),
      VehicleModel.find({ $or: [{ brand: regex }, { model: regex }] }).limit(15),
    ]);
    allUsers = uDocs.map((d) => toPlain<PlainUser>(d));
    allJourneys = jDocs.map((d) => toPlain<PlainJourney>(d));
    allVehicles = vDocs.map((d) => toPlain<PlainVehicle>(d));
  } else {
    const db = readLocalDB();
    allUsers = db.users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q)
      )
      .slice(0, 15);
    allJourneys = db.journeys
      .filter(
        (j) =>
          j.visibility === 'Public' &&
          j.status === 'Published' &&
          (j.title.toLowerCase().includes(q) ||
            j.description.toLowerCase().includes(q) ||
            j.startLocation.toLowerCase().includes(q) ||
            j.endLocation.toLowerCase().includes(q))
      )
      .slice(0, 15);
    allVehicles = db.vehicles
      .filter(
        (v) =>
          v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }

  return { users: allUsers, journeys: allJourneys, vehicles: allVehicles };
}
