import { Router } from 'express';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  createJourney,
  createTimelineEvent,
  deleteJourney,
  findEventsByJourney,
  findJourneyById,
  findJourneysByUser,
  findPublicJourneys,
  findUserById,
  findVehicleById,
  findVehiclesByUser,
  getJourneySocialStats,
  isFollowingUser,
  updateJourney,
} from '../services/dataService.ts';

const router = Router();

router.get('/public', async (_req, res) => {
  try {
    const journeys = await findPublicJourneys();
    const enriched = await Promise.all(
      journeys.map(async (j) => {
        const [vehicle, author, events, social] = await Promise.all([
          findVehicleById(j.vehicleId),
          findUserById(j.userId),
          findEventsByJourney(j._id),
          getJourneySocialStats(j._id),
        ]);
        const chargingStops = events.filter((e) => e.type === 'Charging stop');
        const totalEnergyKwh = chargingStops.reduce(
          (acc, e) => acc + (e.chargingDetail?.energyKwh || 0),
          0
        );
        return {
          ...j,
          vehicle,
          author: author ? { name: author.name, username: author.username } : null,
          chargingCount: chargingStops.length,
          totalEnergyKwh: Number(totalEnergyKwh.toFixed(1)),
          ...social,
        };
      })
    );
    return res.json({ journeys: enriched });
  } catch (err) {
    console.error('[Public Journeys]', err);
    return res.status(500).json({ message: 'Failed to fetch public journeys.' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [journeys, vehicles] = await Promise.all([
      findJourneysByUser(req.userId!),
      findVehiclesByUser(req.userId!),
    ]);
    const vehicleMap = new Map(vehicles.map((v) => [v._id, v]));

    const enriched = await Promise.all(
      journeys.map(async (j) => {
        const [events, social] = await Promise.all([
          findEventsByJourney(j._id),
          getJourneySocialStats(j._id, req.userId),
        ]);
        const chargingEvents = events.filter((e) => e.type === 'Charging stop');
        const totalEnergyKwh = chargingEvents.reduce(
          (sum, e) => sum + (e.chargingDetail?.energyKwh || 0),
          0
        );
        const totalChargingCost = chargingEvents.reduce(
          (sum, e) => sum + (e.chargingDetail?.cost || 0),
          0
        );
        return {
          ...j,
          vehicle: vehicleMap.get(j.vehicleId) || null,
          eventCount: events.length,
          chargingStopsCount: chargingEvents.length,
          totalEnergyKwh: Number(totalEnergyKwh.toFixed(1)),
          totalChargingCost: Math.round(totalChargingCost),
          ...social,
        };
      })
    );

    return res.json({ journeys: enriched });
  } catch (err) {
    console.error('[Journeys List]', err);
    return res.status(500).json({ message: 'Failed to fetch journeys.' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      vehicleId,
      coverImage,
      startDate,
      endDate,
      startLocation,
      endLocation,
      distanceKm,
      durationMinutes,
      startSOC,
      endSOC,
      visibility,
      status,
      startCoordinates,
      endCoordinates,
    } = req.body || {};

    if (!title || !vehicleId || !startDate || !endDate || !startLocation || !endLocation) {
      return res.status(400).json({
        message:
          'Title, vehicle, start/end dates, starting location, and destination are required.',
      });
    }

    const vehicle = await findVehicleById(String(vehicleId));
    if (!vehicle || vehicle.userId !== req.userId) {
      return res.status(400).json({ message: 'Selected EV does not belong to your garage.' });
    }

    const startDt = new Date(startDate);
    const endDt = new Date(endDate);
    const computedDuration =
      durationMinutes !== undefined && Number(durationMinutes) > 0
        ? Number(durationMinutes)
        : Math.max(30, Math.round((endDt.getTime() - startDt.getTime()) / 60000));

    const resolvedVisibility =
      visibility === 'Public' || visibility === 'Followers' ? visibility : 'Private';

    const journey = await createJourney({
      userId: req.userId!,
      vehicleId: vehicle._id,
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      coverImage: coverImage ? String(coverImage).trim() : '',
      startDate: startDt.toISOString(),
      endDate: endDt.toISOString(),
      startLocation: String(startLocation).trim(),
      endLocation: String(endLocation).trim(),
      distanceKm: Number(distanceKm) || 0,
      durationMinutes: computedDuration,
      startSOC: startSOC !== undefined ? Number(startSOC) : 90,
      endSOC: endSOC !== undefined ? Number(endSOC) : 35,
      visibility: resolvedVisibility,
      status: status === 'Draft' ? 'Draft' : 'Published',
    });

    // Seed initial Starting point & Destination events if coordinates were provided or defaults
    const startCoords =
      startCoordinates && startCoordinates.lat && startCoordinates.lng
        ? { lat: Number(startCoordinates.lat), lng: Number(startCoordinates.lng) }
        : { lat: 19.076, lng: 72.8777 };

    const endCoords =
      endCoordinates && endCoordinates.lat && endCoordinates.lng
        ? { lat: Number(endCoordinates.lat), lng: Number(endCoordinates.lng) }
        : { lat: 18.5204, lng: 73.8567 };

    await createTimelineEvent({
      journeyId: journey._id,
      type: 'Starting point',
      title: `Departure from ${journey.startLocation}`,
      timestamp: journey.startDate,
      location: journey.startLocation,
      coordinates: startCoords,
      note: `Departed with ${journey.startSOC}% battery state of charge.`,
      photos: [],
      sequenceIndex: 0,
    });

    await createTimelineEvent({
      journeyId: journey._id,
      type: 'Destination',
      title: `Arrival at ${journey.endLocation}`,
      timestamp: journey.endDate,
      location: journey.endLocation,
      coordinates: endCoords,
      note: `Reached destination with ${journey.endSOC}% SOC.`,
      photos: [],
      sequenceIndex: 1,
    });

    return res.status(201).json({ journey });
  } catch (err) {
    console.error('[Journeys Create]', err);
    return res.status(500).json({ message: 'Failed to create journey.' });
  }
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const journey = await findJourneyById(req.params.id);
    if (!journey) {
      return res.status(404).json({ message: 'Journey not found.' });
    }

    const isOwner = Boolean(req.userId && journey.userId === req.userId);
    const isPublic = journey.visibility === 'Public' && journey.status === 'Published';
    const isFollowersAllowed =
      journey.visibility === 'Followers' &&
      journey.status === 'Published' &&
      Boolean(req.userId && (await isFollowingUser(req.userId, journey.userId)));

    if (!isOwner && !isPublic && !isFollowersAllowed) {
      return res.status(403).json({ message: 'This journey is private.' });
    }

    const [vehicle, author, events, social] = await Promise.all([
      findVehicleById(journey.vehicleId),
      findUserById(journey.userId),
      findEventsByJourney(journey._id),
      getJourneySocialStats(journey._id, req.userId),
    ]);

    const chargingStops = events.filter((e) => e.type === 'Charging stop');
    const chargingStats = chargingStops.reduce(
      (acc, stop) => {
        const d = stop.chargingDetail;
        if (d) {
          acc.totalEnergyKwh += d.energyKwh || 0;
          acc.totalCost += d.cost || 0;
          acc.ratingSum += d.rating || 0;
          acc.ratedCount += 1;
        }
        return acc;
      },
      { totalEnergyKwh: 0, totalCost: 0, ratingSum: 0, ratedCount: 0 }
    );

    return res.json({
      journey: { ...journey, ...social },
      vehicle,
      author: author
        ? {
            _id: author._id,
            name: author.name,
            username: author.username,
            city: author.city,
            country: author.country,
            avatar: author.avatar,
          }
        : null,
      events,
      stats: {
        chargingStopsCount: chargingStops.length,
        totalEnergyKwh: Number(chargingStats.totalEnergyKwh.toFixed(1)),
        totalChargingCost: Math.round(chargingStats.totalCost),
        averageChargerRating:
          chargingStats.ratedCount > 0
            ? Number((chargingStats.ratingSum / chargingStats.ratedCount).toFixed(1))
            : 0,
      },
      isOwner,
    });
  } catch (err) {
    console.error('[Journeys Detail]', err);
    return res.status(500).json({ message: 'Failed to load journey details.' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const existing = await findJourneyById(req.params.id);
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ message: 'Journey not found.' });
    }

    const updates: Record<string, unknown> = {};
    const fields = [
      'title',
      'description',
      'vehicleId',
      'coverImage',
      'startDate',
      'endDate',
      'startLocation',
      'endLocation',
      'distanceKm',
      'durationMinutes',
      'startSOC',
      'endSOC',
      'visibility',
      'status',
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (['distanceKm', 'durationMinutes', 'startSOC', 'endSOC'].includes(f)) {
          updates[f] = Number(req.body[f]);
        } else if (f === 'startDate' || f === 'endDate') {
          updates[f] = new Date(req.body[f]).toISOString();
        } else {
          updates[f] = String(req.body[f]).trim();
        }
      }
    }

    const journey = await updateJourney(req.params.id, req.userId!, updates);
    return res.json({ journey });
  } catch (err) {
    console.error('[Journeys Update]', err);
    return res.status(500).json({ message: 'Failed to update journey.' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const deleted = await deleteJourney(req.params.id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ message: 'Journey not found.' });
    }
    return res.json({ message: 'Journey deleted.' });
  } catch (err) {
    console.error('[Journeys Delete]', err);
    return res.status(500).json({ message: 'Failed to delete journey.' });
  }
});

export default router;
