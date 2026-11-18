import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  createVehicle,
  deleteVehicle,
  findVehicleById,
  findVehiclesByUser,
  updateVehicle,
} from '../services/dataService.ts';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const vehicles = await findVehiclesByUser(req.userId!);
    return res.json({ vehicles });
  } catch (err) {
    console.error('[Vehicles List]', err);
    return res.status(500).json({ message: 'Failed to load vehicles.' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      brand,
      model,
      variant,
      batteryCapacity,
      colour,
      nickname,
      photo,
      isDefault,
    } = req.body || {};

    if (!brand || !model || !batteryCapacity) {
      return res.status(400).json({
        message: 'Brand, model, and battery capacity (kWh) are required.',
      });
    }

    const capacity = Number(batteryCapacity);
    if (Number.isNaN(capacity) || capacity < 5 || capacity > 300) {
      return res
        .status(400)
        .json({ message: 'Battery capacity must be between 5 and 300 kWh.' });
    }

    const vehicle = await createVehicle({
      userId: req.userId!,
      brand: String(brand).trim(),
      model: String(model).trim(),
      variant: variant ? String(variant).trim() : '',
      batteryCapacity: capacity,
      colour: colour ? String(colour).trim() : 'Obsidian Black',
      nickname: nickname ? String(nickname).trim() : '',
      photo: photo ? String(photo).trim() : '',
      isDefault: Boolean(isDefault),
    });

    return res.status(201).json({ vehicle });
  } catch (err) {
    console.error('[Vehicles Create]', err);
    return res.status(500).json({ message: 'Failed to add vehicle.' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const vehicle = await findVehicleById(req.params.id);
    if (!vehicle || vehicle.userId !== req.userId) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    return res.json({ vehicle });
  } catch (err) {
    console.error('[Vehicles Get]', err);
    return res.status(500).json({ message: 'Failed to load vehicle.' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await findVehicleById(req.params.id);
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    const updates: Record<string, unknown> = {};
    const fields = [
      'brand',
      'model',
      'variant',
      'batteryCapacity',
      'colour',
      'nickname',
      'photo',
      'isDefault',
    ];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === 'batteryCapacity'
            ? Number(req.body[field])
            : field === 'isDefault'
              ? Boolean(req.body[field])
              : String(req.body[field]).trim();
      }
    }

    const vehicle = await updateVehicle(req.params.id, req.userId!, updates);
    return res.json({ vehicle });
  } catch (err) {
    console.error('[Vehicles Update]', err);
    return res.status(500).json({ message: 'Failed to update vehicle.' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const deleted = await deleteVehicle(req.params.id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    return res.json({ message: 'Vehicle removed from garage.' });
  } catch (err) {
    console.error('[Vehicles Delete]', err);
    return res.status(500).json({ message: 'Failed to remove vehicle.' });
  }
});

export default router;
