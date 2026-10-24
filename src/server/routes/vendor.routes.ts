import { Router } from 'express';
import {
  searchVendors,
  getEventVendors,
  addOrUpdateEventVendor,
  updateVendorStatus
} from '../controllers/vendor.controller.js';
import { validateBody } from '../middleware/validate.js';
import { EventVendorSchema } from '../../shared/schemas/zod-schemas.js';
import { requireRole } from '../middleware/demo-user.js';
import { z } from 'zod';

const router = Router();

const UpdateStatusSchema = z.object({
  status: z.enum(['not_started', 'contacted', 'quote_received', 'booked', 'paid'])
});

router.get('/search', searchVendors);
router.get('/:id/vendors', getEventVendors);
router.post(
  '/:id/vendors',
  requireRole('owner', 'editor'),
  validateBody(EventVendorSchema.omit({ id: true })),
  addOrUpdateEventVendor
);
router.patch(
  '/:id/vendors/:vendorId/status',
  requireRole('owner', 'editor'),
  validateBody(UpdateStatusSchema),
  updateVendorStatus
);

export default router;
