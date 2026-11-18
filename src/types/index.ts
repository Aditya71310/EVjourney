export type CoverScene = 'sunset' | 'coast' | 'forest';

export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  city: string;
  country: string;
  coverScene?: CoverScene;
  theme: 'dark' | 'light' | 'system';
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Vehicle {
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

export type JourneyVisibility = 'Private' | 'Followers' | 'Public';
export type JourneyStatus = 'Draft' | 'Published';

export interface Journey {
  _id: string;
  userId: string;
  vehicleId: string;
  vehicle?: Vehicle | null;
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
  visibility: JourneyVisibility;
  status: JourneyStatus;
  createdAt: string;
  eventCount?: number;
  chargingStopsCount?: number;
  totalEnergyKwh?: number;
  totalChargingCost?: number;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  author?: {
    _id?: string;
    name: string;
    username: string;
    city?: string;
    country?: string;
    avatar?: string;
    coverScene?: CoverScene;
  } | null;
}

export type TimelineEventType =
  | 'Starting point'
  | 'Charging stop'
  | 'Food stop'
  | 'Hotel'
  | 'Scenic location'
  | 'Coffee stop'
  | 'Photograph'
  | 'Custom event'
  | 'Destination';

export type ConnectorType =
  | 'CCS2'
  | 'AC Type 2'
  | 'CHAdeMO'
  | 'AC Type 1'
  | 'Tesla'
  | 'Other';

export interface ChargingDetail {
  _id?: string;
  eventId?: string;
  chargerName: string;
  network: string;
  connectorType: ConnectorType;
  chargingType: 'AC' | 'DC';
  startSOC: number;
  endSOC: number;
  energyKwh: number;
  durationMinutes: number;
  cost: number;
  rating: number;
  review: string;
}

export interface TimelineEvent {
  _id: string;
  journeyId: string;
  type: TimelineEventType;
  title: string;
  timestamp: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  note: string;
  photos: string[];
  sequenceIndex: number;
  chargingDetail?: ChargingDetail | null;
}

export interface DashboardMetrics {
  totalJourneys: number;
  totalDistanceKm: number;
  totalChargingStops: number;
  totalEnergyKwh: number;
  totalChargingCost: number;
  avgEfficiencyKmPerKwh?: number;
  avgDurationMinutes?: number;
  totalEstimatedConsumedKwh?: number;
}

export interface AnalyticsSummary {
  totalJourneys: number;
  totalDistanceKm: number;
  totalChargingStops: number;
  totalEnergyKwh: number;
  totalEstimatedConsumedKwh: number;
  totalChargingCost: number;
  avgEfficiencyKmPerKwh: number;
  avgDurationMinutes: number;
  totalDurationMinutes: number;
  avgDistanceKm: number;
  costPerKm: number;
  acCount: number;
  dcCount: number;
  acEnergyKwh: number;
  dcEnergyKwh: number;
  acCost: number;
  dcCost: number;
}

export interface MonthlyTravelPoint {
  monthKey: string;
  label: string;
  trips: number;
  distanceKm: number;
  energyKwh: number;
  estimatedConsumedKwh: number;
  chargingCost: number;
  durationMinutes: number;
  efficiencyKmPerKwh: number;
}

export interface JourneyAnalyticsPoint {
  _id: string;
  title: string;
  startDate: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  durationMinutes: number;
  energyKwh: number;
  estimatedConsumedKwh: number;
  chargingCost: number;
  chargingStopsCount: number;
  efficiencyKmPerKwh: number;
  vehicleName: string;
}

export interface NetworkBreakdownPoint {
  network: string;
  sessions: number;
  energyKwh: number;
  cost: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  monthlyPatterns: MonthlyTravelPoint[];
  journeySeries: JourneyAnalyticsPoint[];
  networkBreakdown: NetworkBreakdownPoint[];
  vehicles?: Vehicle[];
}

export interface JourneyComment {
  _id: string;
  journeyId: string;
  userId: string;
  parentId?: string | null;
  text: string;
  createdAt: string;
  author: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  likesCount: number;
  isLiked: boolean;
  replies?: JourneyComment[];
}

export interface ConnectionUser {
  _id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  city?: string;
  country?: string;
  isFollowing: boolean;
  followsYou: boolean;
}
