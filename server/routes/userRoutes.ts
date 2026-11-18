import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  deleteUserAndData,
  findEventsByJourney,
  findJourneysByUser,
  findUserById,
  findUserByUsername,
  findVehiclesByUser,
  getAllUserChargingDetails,
  updateUser,
} from '../services/dataService.ts';
import { getLocalUploadPath, uploadImageBuffer } from '../services/uploadService.ts';
import { isMongoConnected } from '../config/db.ts';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get('/uploads/:filename', (req, res) => {
  const filePath = getLocalUploadPath(req.params.filename);
  if (!filePath) {
    return res.status(404).json({ message: 'File not found.' });
  }
  return res.sendFile(filePath);
});

router.post(
  '/upload',
  requireAuth,
  upload.single('image'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Please select an image file to upload.' });
      }
      const result = await uploadImageBuffer(req.file.buffer, req.file.mimetype);
      return res.json(result);
    } catch (err) {
      console.error('[Upload]', err);
      return res.status(500).json({ message: 'Image upload failed.' });
    }
  }
);

router.get('/users/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const [journeys, vehicles, chargingDetails] = await Promise.all([
      findJourneysByUser(user._id),
      findVehiclesByUser(user._id),
      getAllUserChargingDetails(user._id),
    ]);

    const totalDistanceKm = journeys.reduce((sum, j) => sum + (j.distanceKm || 0), 0);
    const totalEnergyKwh = chargingDetails.reduce(
      (sum, c) => sum + (c.energyKwh || 0),
      0
    );

    const { password: _pw, ...safeUser } = user;
    return res.json({
      user: safeUser,
      stats: {
        totalJourneys: journeys.length,
        totalDistanceKm: Math.round(totalDistanceKm),
        totalChargingStops: chargingDetails.length,
        totalEnergyKwh: Number(totalEnergyKwh.toFixed(1)),
      },
      vehicles,
    });
  } catch (err) {
    console.error('[User Profile]', err);
    return res.status(500).json({ message: 'Failed to load profile.' });
  }
});

router.put('/users/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      username,
      bio,
      city,
      country,
      avatar,
      coverScene,
      theme,
      onboardingCompleted,
      currentPassword,
      newPassword,
    } = req.body || {};

    const existing = await findUserById(req.userId!);
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (username !== undefined) {
      const clean = String(username)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (clean.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters.' });
      }
      const other = await findUserByUsername(clean);
      if (other && other._id !== existing._id) {
        return res.status(409).json({ message: 'Username is already in use.' });
      }
      updates.username = clean;
    }
    if (bio !== undefined) updates.bio = String(bio).trim();
    if (city !== undefined) updates.city = String(city).trim();
    if (country !== undefined) updates.country = String(country).trim();
    if (avatar !== undefined) updates.avatar = String(avatar).trim();
    if (coverScene === 'sunset' || coverScene === 'coast' || coverScene === 'forest') {
      updates.coverScene = coverScene;
    }
    if (theme === 'dark' || theme === 'light' || theme === 'system') {
      updates.theme = theme;
    }
    if (onboardingCompleted !== undefined) {
      updates.onboardingCompleted = Boolean(onboardingCompleted);
    }

    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: 'Current password is required to set a new password.' });
      }
      const valid = await bcrypt.compare(String(currentPassword), existing.password);
      if (!valid) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      if (String(newPassword).length < 6) {
        return res
          .status(400)
          .json({ message: 'New password must be at least 6 characters.' });
      }
      updates.password = await bcrypt.hash(String(newPassword), 10);
    }

    const updated = await updateUser(existing._id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const { password: _pw, ...safeUser } = updated;
    return res.json({ user: safeUser });
  } catch (err) {
    console.error('[Profile Update]', err);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
});

router.delete('/users/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteUserAndData(req.userId!);
    return res.json({ message: 'Account and associated records deleted.' });
  } catch (err) {
    console.error('[Account Delete]', err);
    return res.status(500).json({ message: 'Failed to delete account.' });
  }
});

interface AnalyticsBuildOptions {
  vehicleId?: string;
  range?: string;
}

async function buildUserAnalytics(userId: string, options: AnalyticsBuildOptions = {}) {
  const [allJourneys, vehicles] = await Promise.all([
    findJourneysByUser(userId),
    findVehiclesByUser(userId),
  ]);

  const vehicleMap = new Map(vehicles.map((v) => [v._id, v]));

  // Filter by vehicleId if specified
  let filteredJourneys =
    options.vehicleId && options.vehicleId !== 'all'
      ? allJourneys.filter((j) => j.vehicleId === options.vehicleId)
      : [...allJourneys];

  // Filter by time range if specified
  const now = new Date();
  if (options.range === '6m' || options.range === '12m') {
    const monthsBack = options.range === '6m' ? 6 : 12;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    filteredJourneys = filteredJourneys.filter((j) => {
      const dt = new Date(j.startDate || j.createdAt);
      return !Number.isNaN(dt.getTime()) && dt >= cutoff;
    });
  }

  // Sort chronologically for trend charts
  const chronological = [...filteredJourneys].sort(
    (a, b) =>
      new Date(a.startDate || a.createdAt).getTime() -
      new Date(b.startDate || b.createdAt).getTime()
  );

  let totalChargingStops = 0;
  let totalChargedEnergyKwh = 0;
  let totalEstimatedConsumedKwh = 0;
  let totalChargingCost = 0;
  let acCount = 0;
  let dcCount = 0;
  let acEnergyKwh = 0;
  let dcEnergyKwh = 0;
  let acCost = 0;
  let dcCost = 0;

  const networkMap = new Map<
    string,
    { network: string; sessions: number; energyKwh: number; cost: number }
  >();

  const journeySeries = await Promise.all(
    chronological.map(async (j) => {
      const events = await findEventsByJourney(j._id);
      const chargingStops = events.filter((e) => e.type === 'Charging stop');
      const vehicle = vehicleMap.get(j.vehicleId) || null;

      let tripChargedKwh = 0;
      let tripCost = 0;

      for (const stop of chargingStops) {
        const d = stop.chargingDetail;
        if (!d) continue;
        totalChargingStops += 1;
        const kwh = Number(d.energyKwh) || 0;
        const cost = Number(d.cost) || 0;
        tripChargedKwh += kwh;
        tripCost += cost;

        if (d.chargingType === 'AC') {
          acCount += 1;
          acEnergyKwh += kwh;
          acCost += cost;
        } else {
          dcCount += 1;
          dcEnergyKwh += kwh;
          dcCost += cost;
        }

        const netKey = (d.network || 'Other').trim() || 'Other';
        const prev = networkMap.get(netKey) || {
          network: netKey,
          sessions: 0,
          energyKwh: 0,
          cost: 0,
        };
        prev.sessions += 1;
        prev.energyKwh += kwh;
        prev.cost += cost;
        networkMap.set(netKey, prev);
      }

      // Estimate real electricity consumed on the drive:
      // Battery capacity * net SOC drop + energy added mid-trip, falling back to charged kWh or ~0.16 kWh/km
      const batteryCap = vehicle?.batteryCapacity || 60;
      const socNetDrop = Math.max(0, (j.startSOC || 0) - (j.endSOC || 0));
      const socDropKwh = (batteryCap * socNetDrop) / 100;
      const rawConsumed = socDropKwh + tripChargedKwh;
      const estimatedConsumedKwh =
        rawConsumed > 0
          ? Number(rawConsumed.toFixed(1))
          : Number(((j.distanceKm || 0) * 0.16).toFixed(1));

      totalChargedEnergyKwh += tripChargedKwh;
      totalEstimatedConsumedKwh += estimatedConsumedKwh;
      totalChargingCost += tripCost;

      const efficiencyKmPerKwh =
        estimatedConsumedKwh > 0 && j.distanceKm > 0
          ? Number((j.distanceKm / estimatedConsumedKwh).toFixed(2))
          : 0;

      return {
        _id: j._id,
        title: j.title,
        startDate: j.startDate,
        startLocation: j.startLocation,
        endLocation: j.endLocation,
        distanceKm: Math.round(j.distanceKm || 0),
        durationMinutes: Math.round(j.durationMinutes || 0),
        energyKwh: Number(tripChargedKwh.toFixed(1)),
        estimatedConsumedKwh,
        chargingCost: Math.round(tripCost),
        chargingStopsCount: chargingStops.length,
        efficiencyKmPerKwh,
        vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'EV',
      };
    })
  );

  const totalDistanceKm = journeySeries.reduce((sum, j) => sum + j.distanceKm, 0);
  const totalDurationMinutes = journeySeries.reduce((sum, j) => sum + j.durationMinutes, 0);
  const totalJourneys = journeySeries.length;

  const avgEfficiencyKmPerKwh =
    totalEstimatedConsumedKwh > 0 && totalDistanceKm > 0
      ? Number((totalDistanceKm / totalEstimatedConsumedKwh).toFixed(2))
      : 0;

  const avgDurationMinutes =
    totalJourneys > 0 ? Math.round(totalDurationMinutes / totalJourneys) : 0;

  const avgDistanceKm = totalJourneys > 0 ? Math.round(totalDistanceKm / totalJourneys) : 0;
  const costPerKm =
    totalDistanceKm > 0 ? Number((totalChargingCost / totalDistanceKm).toFixed(2)) : 0;

  // Build monthly travel patterns across trailing N months (or covering earliest journey)
  const monthWindow = options.range === '12m' ? 12 : 6;
  const monthAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthMap = new Map<
    string,
    {
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
  >();

  for (let i = monthWindow - 1; i >= 0; i -= 1) {
    const d = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthMap.set(key, {
      monthKey: key,
      label,
      trips: 0,
      distanceKm: 0,
      energyKwh: 0,
      estimatedConsumedKwh: 0,
      chargingCost: 0,
      durationMinutes: 0,
      efficiencyKmPerKwh: 0,
    });
  }

  for (const item of journeySeries) {
    const dt = new Date(item.startDate);
    if (Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      if (options.range === '6m' || options.range === '12m') continue;
      const label = dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthMap.set(key, {
        monthKey: key,
        label,
        trips: 0,
        distanceKm: 0,
        energyKwh: 0,
        estimatedConsumedKwh: 0,
        chargingCost: 0,
        durationMinutes: 0,
        efficiencyKmPerKwh: 0,
      });
    }
    const bucket = monthMap.get(key)!;
    bucket.trips += 1;
    bucket.distanceKm += item.distanceKm;
    bucket.energyKwh = Number((bucket.energyKwh + item.energyKwh).toFixed(1));
    bucket.estimatedConsumedKwh = Number(
      (bucket.estimatedConsumedKwh + item.estimatedConsumedKwh).toFixed(1)
    );
    bucket.chargingCost += item.chargingCost;
    bucket.durationMinutes += item.durationMinutes;
  }

  const monthlyPatterns = Array.from(monthMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((m) => ({
      ...m,
      efficiencyKmPerKwh:
        m.estimatedConsumedKwh > 0 && m.distanceKm > 0
          ? Number((m.distanceKm / m.estimatedConsumedKwh).toFixed(2))
          : 0,
    }));

  const networkBreakdown = Array.from(networkMap.values())
    .map((n) => ({
      ...n,
      energyKwh: Number(n.energyKwh.toFixed(1)),
      cost: Math.round(n.cost),
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    summary: {
      totalJourneys,
      totalDistanceKm: Math.round(totalDistanceKm),
      totalChargingStops,
      totalEnergyKwh: Number(totalChargedEnergyKwh.toFixed(1)),
      totalEstimatedConsumedKwh: Number(totalEstimatedConsumedKwh.toFixed(1)),
      totalChargingCost: Math.round(totalChargingCost),
      avgEfficiencyKmPerKwh,
      avgDurationMinutes,
      totalDurationMinutes,
      avgDistanceKm,
      costPerKm,
      acCount,
      dcCount,
      acEnergyKwh: Number(acEnergyKwh.toFixed(1)),
      dcEnergyKwh: Number(dcEnergyKwh.toFixed(1)),
      acCost: Math.round(acCost),
      dcCost: Math.round(dcCost),
    },
    monthlyPatterns,
    journeySeries,
    networkBreakdown,
    vehicles,
  };
}

router.get('/users/analytics', requireAuth, async (req: AuthRequest, res) => {
  try {
    const vehicleId = typeof req.query.vehicleId === 'string' ? req.query.vehicleId : 'all';
    const range = typeof req.query.range === 'string' ? req.query.range : 'all';
    const analytics = await buildUserAnalytics(req.userId!, { vehicleId, range });
    return res.json(analytics);
  } catch (err) {
    console.error('[Analytics]', err);
    return res.status(500).json({ message: 'Failed to load EV analytics.' });
  }
});

router.get('/users/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user, journeys, vehicles, chargingDetails, analytics] = await Promise.all([
      findUserById(req.userId!),
      findJourneysByUser(req.userId!),
      findVehiclesByUser(req.userId!),
      getAllUserChargingDetails(req.userId!),
      buildUserAnalytics(req.userId!),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const vehicleMap = new Map(vehicles.map((v) => [v._id, v]));
    const recentJourneys = await Promise.all(
      journeys.slice(0, 4).map(async (j) => {
        const events = await findEventsByJourney(j._id);
        const chargingStops = events.filter((e) => e.type === 'Charging stop');
        const energyKwh = chargingStops.reduce(
          (sum, e) => sum + (e.chargingDetail?.energyKwh || 0),
          0
        );
        return {
          ...j,
          vehicle: vehicleMap.get(j.vehicleId) || null,
          chargingStopsCount: chargingStops.length,
          totalEnergyKwh: Number(energyKwh.toFixed(1)),
        };
      })
    );

    const totalDistanceKm = journeys.reduce((sum, j) => sum + (j.distanceKm || 0), 0);
    const totalEnergyKwh = chargingDetails.reduce(
      (sum, c) => sum + (c.energyKwh || 0),
      0
    );
    const totalChargingCost = chargingDetails.reduce((sum, c) => sum + (c.cost || 0), 0);

    const { password: _pw, ...safeUser } = user;
    return res.json({
      user: safeUser,
      metrics: {
        totalJourneys: journeys.length,
        totalDistanceKm: Math.round(totalDistanceKm),
        totalChargingStops: chargingDetails.length,
        totalEnergyKwh: Number(totalEnergyKwh.toFixed(1)),
        totalChargingCost: Math.round(totalChargingCost),
        avgEfficiencyKmPerKwh: analytics.summary.avgEfficiencyKmPerKwh,
        avgDurationMinutes: analytics.summary.avgDurationMinutes,
        totalEstimatedConsumedKwh: analytics.summary.totalEstimatedConsumedKwh,
      },
      analytics,
      recentJourneys,
      vehicles,
      databaseMode: isMongoConnected() ? 'mongodb-atlas' : 'local-persistent',
    });
  } catch (err) {
    console.error('[Dashboard]', err);
    return res.status(500).json({ message: 'Failed to load dashboard.' });
  }
});

export default router;
