import { Router } from 'express';
import {
  searchVendors,
  getEventVendors,
  addOrUpdateEventVendor,
  updateVendorStatus
} from '../controllers/vendor.controller.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { EventVendorSchema } from '../../shared/schemas/zod-schemas.js';
import { VendorSearchSchema, VendorUpdateSchema, VendorIdParamSchema, EventIdParamSchema } from '../validation/request-schemas.js';
import { requireEventAccess, requireEventRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/search', validateQuery(VendorSearchSchema), searchVendors);
router.get('/:id/vendors', validateParams(EventIdParamSchema), requireEventAccess(), getEventVendors);
router.post(
  '/:id/vendors',
  validateParams(EventIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(EventVendorSchema.omit({ id: true })),
  addOrUpdateEventVendor
);
router.patch(
  '/:id/vendors/:vendorId/status',
  validateParams(VendorIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(VendorUpdateSchema),
  updateVendorStatus
);

export default router;
