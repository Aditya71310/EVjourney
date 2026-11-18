import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  createTimelineEvent,
  deleteTimelineEvent,
  findEventById,
  findEventsByJourney,
  findJourneyById,
  findVehicleById,
  updateTimelineEvent,
  upsertChargingDetail,
} from '../services/dataService.ts';

const router = Router();

function calculateEnergyKwh(
  batteryCapacity: number,
  startSOC: number,
  endSOC: number,
  providedEnergy?: number
): number {
  if (providedEnergy !== undefined && Number(providedEnergy) > 0) {
    return Number(Number(providedEnergy).toFixed(2));
  }
  const delta = Math.max(0, endSOC - startSOC);
  return Number(((batteryCapacity * delta) / 100).toFixed(2));
}

router.get('/journeys/:id/events', requireAuth, async (req: AuthRequest, res) => {
  try {
    const journey = await findJourneyById(req.params.id);
    if (!journey || journey.userId !== req.userId) {
      return res.status(404).json({ message: 'Journey not found.' });
    }
    const events = await findEventsByJourney(journey._id);
    return res.json({ events });
  } catch (err) {
    console.error('[Events List]', err);
    return res.status(500).json({ message: 'Failed to load timeline events.' });
  }
});

router.post('/journeys/:id/events', requireAuth, async (req: AuthRequest, res) => {
  try {
    const journey = await findJourneyById(req.params.id);
    if (!journey || journey.userId !== req.userId) {
      return res.status(404).json({ message: 'Journey not found.' });
    }

    const {
      type,
      title,
      timestamp,
      location,
      coordinates,
      note,
      photos,
      sequenceIndex,
      chargingDetail,
    } = req.body || {};

    if (!type || !title || !location) {
      return res
        .status(400)
        .json({ message: 'Event type, title, and location are required.' });
    }

    const existingEvents = await findEventsByJourney(journey._id);
    const nextIndex =
      sequenceIndex !== undefined ? Number(sequenceIndex) : existingEvents.length;

    const lat = Number(coordinates?.lat ?? 18.92);
    const lng = Number(coordinates?.lng ?? 72.83);

    const event = await createTimelineEvent({
      journeyId: journey._id,
      type,
      title: String(title).trim(),
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      location: String(location).trim(),
      coordinates: { lat, lng },
      note: note ? String(note).trim() : '',
      photos: Array.isArray(photos) ? photos : [],
      sequenceIndex: nextIndex,
    });

    let savedCharging = null;
    if (type === 'Charging stop' && chargingDetail) {
      const vehicle = await findVehicleById(journey.vehicleId);
      const batteryCapacity = vehicle?.batteryCapacity || 60;
      const sSOC = Number(chargingDetail.startSOC ?? 20);
      const eSOC = Number(chargingDetail.endSOC ?? 80);
      const energyKwh = calculateEnergyKwh(
        batteryCapacity,
        sSOC,
        eSOC,
        chargingDetail.energyKwh
      );

      savedCharging = await upsertChargingDetail(event._id, {
        chargerName: String(chargingDetail.chargerName || title).trim(),
        network: String(chargingDetail.network || 'Independent').trim(),
        connectorType: chargingDetail.connectorType || 'CCS2',
        chargingType: chargingDetail.chargingType === 'AC' ? 'AC' : 'DC',
        startSOC: sSOC,
        endSOC: eSOC,
        energyKwh,
        durationMinutes: Number(chargingDetail.durationMinutes ?? 30),
        cost: Number(chargingDetail.cost ?? 0),
        rating: Number(chargingDetail.rating ?? 5),
        review: String(chargingDetail.review || '').trim(),
      });
    }

    return res.status(201).json({
      event: { ...event, chargingDetail: savedCharging },
    });
  } catch (err) {
    console.error('[Events Create]', err);
    return res.status(500).json({ message: 'Failed to add timeline event.' });
  }
});

router.put('/journeys/:id/events/reorder', requireAuth, async (req: AuthRequest, res) => {
  try {
    const journey = await findJourneyById(req.params.id);
    if (!journey || journey.userId !== req.userId) {
      return res.status(404).json({ message: 'Journey not found.' });
    }
    const { orderedIds } = req.body || {};
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds array is required.' });
    }

    await Promise.all(
      orderedIds.map((eventId: string, index: number) =>
        updateTimelineEvent(eventId, { sequenceIndex: index })
      )
    );

    const events = await findEventsByJourney(journey._id);
    return res.json({ events });
  } catch (err) {
    console.error('[Events Reorder]', err);
    return res.status(500).json({ message: 'Failed to reorder timeline events.' });
  }
});

router.put('/events/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const event = await findEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Timeline event not found.' });
    }
    const journey = await findJourneyById(event.journeyId);
    if (!journey || journey.userId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this event.' });
    }

    const updates: Record<string, unknown> = {};
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.timestamp !== undefined)
      updates.timestamp = new Date(req.body.timestamp).toISOString();
    if (req.body.location !== undefined)
      updates.location = String(req.body.location).trim();
    if (req.body.coordinates !== undefined) {
      updates.coordinates = {
        lat: Number(req.body.coordinates.lat),
        lng: Number(req.body.coordinates.lng),
      };
    }
    if (req.body.note !== undefined) updates.note = String(req.body.note).trim();
    if (req.body.photos !== undefined && Array.isArray(req.body.photos)) {
      updates.photos = req.body.photos;
    }
    if (req.body.sequenceIndex !== undefined) {
      updates.sequenceIndex = Number(req.body.sequenceIndex);
    }

    const updated = await updateTimelineEvent(event._id, updates);

    let savedCharging = null;
    if ((req.body.type || event.type) === 'Charging stop' && req.body.chargingDetail) {
      const vehicle = await findVehicleById(journey.vehicleId);
      const batteryCapacity = vehicle?.batteryCapacity || 60;
      const d = req.body.chargingDetail;
      const sSOC = Number(d.startSOC ?? 20);
      const eSOC = Number(d.endSOC ?? 80);
      const energyKwh = calculateEnergyKwh(batteryCapacity, sSOC, eSOC, d.energyKwh);

      savedCharging = await upsertChargingDetail(event._id, {
        chargerName: String(d.chargerName || updated?.title || '').trim(),
        network: String(d.network || 'Independent').trim(),
        connectorType: d.connectorType || 'CCS2',
        chargingType: d.chargingType === 'AC' ? 'AC' : 'DC',
        startSOC: sSOC,
        endSOC: eSOC,
        energyKwh,
        durationMinutes: Number(d.durationMinutes ?? 30),
        cost: Number(d.cost ?? 0),
        rating: Number(d.rating ?? 5),
        review: String(d.review || '').trim(),
      });
    }

    return res.json({ event: { ...updated, chargingDetail: savedCharging } });
  } catch (err) {
    console.error('[Events Update]', err);
    return res.status(500).json({ message: 'Failed to update event.' });
  }
});

router.delete('/events/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const event = await findEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Timeline event not found.' });
    }
    const journey = await findJourneyById(event.journeyId);
    if (!journey || journey.userId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this event.' });
    }

    await deleteTimelineEvent(event._id);
    return res.json({ message: 'Timeline event removed.' });
  } catch (err) {
    console.error('[Events Delete]', err);
    return res.status(500).json({ message: 'Failed to delete event.' });
  }
});

const handleChargingUpsert = async (req: AuthRequest, res: any) => {
  try {
    const event = await findEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Timeline event not found.' });
    }
    const journey = await findJourneyById(event.journeyId);
    if (!journey || journey.userId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    const vehicle = await findVehicleById(journey.vehicleId);
    const batteryCapacity = vehicle?.batteryCapacity || 60;

    const {
      chargerName,
      network,
      connectorType,
      chargingType,
      startSOC,
      endSOC,
      energyKwh,
      durationMinutes,
      cost,
      rating,
      review,
    } = req.body || {};

    const sSOC = Number(startSOC ?? 20);
    const eSOC = Number(endSOC ?? 80);
    const computedEnergy = calculateEnergyKwh(batteryCapacity, sSOC, eSOC, energyKwh);

    const detail = await upsertChargingDetail(event._id, {
      chargerName: String(chargerName || event.title).trim(),
      network: String(network || 'Independent').trim(),
      connectorType: connectorType || 'CCS2',
      chargingType: chargingType === 'AC' ? 'AC' : 'DC',
      startSOC: sSOC,
      endSOC: eSOC,
      energyKwh: computedEnergy,
      durationMinutes: Number(durationMinutes ?? 30),
      cost: Number(cost ?? 0),
      rating: Number(rating ?? 5),
      review: String(review || '').trim(),
    });

    return res.json({ chargingDetail: detail });
  } catch (err) {
    console.error('[Charging Upsert]', err);
    return res.status(500).json({ message: 'Failed to save charging details.' });
  }
};

router.post('/events/:id/charging', requireAuth, handleChargingUpsert);
router.put('/events/:id/charging', requireAuth, handleChargingUpsert);

export default router;
