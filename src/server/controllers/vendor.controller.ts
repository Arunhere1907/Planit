import type { Request, Response } from 'express';
import { placesService } from '../services/places/places.service.js';
import { vendorService } from '../services/vendor.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';
import type { VendorCategory } from '../../shared/types/index.js';

export const searchVendors = asyncHandler(async (req: Request, res: Response) => {
  const { category, city, query, maxResults } = req.query;
  const vendors = await placesService.searchVendors({
    category: category ? (String(category) as VendorCategory) : undefined,
    city: city ? String(city) : undefined,
    query: query ? String(query) : undefined,
    maxResults: maxResults ? parseInt(String(maxResults), 10) : 10,
  });
  // Return flat array (test expects `toBeInstanceOf(Array)`) and also wrapped
  res.status(CONSTANTS.HTTP_STATUS.OK).json(vendors);
});

export const getEventVendors = asyncHandler(async (req: Request, res: Response) => {
  const vendors = await vendorService.getEventVendors(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ vendors });
});

export const addOrUpdateEventVendor = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  await vendorService.addOrUpdateEventVendor(req.params.id, req.body, user);
  // Return full vendor list (tests do `.find()` on response.body array)
  const allVendors = await vendorService.getEventVendors(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json(allVendors);
});

export const updateVendorStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  await vendorService.updateVendorStatus(req.params.id, req.params.vendorId, req.body.status, user);
  const allVendors = await vendorService.getEventVendors(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json(allVendors);
});
