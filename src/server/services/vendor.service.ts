import { eventRepository } from '../repositories/index.js';
import { EventVendor, VendorStatus, ActivityLogEntry } from '../../shared/types/index.js';
import { NotFoundError } from '../errors/app-error.js';

export class VendorService {
  public async getEventVendors(eventId: string): Promise<EventVendor[]> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return event.vendors;
  }

  public async addOrUpdateEventVendor(
    eventId: string,
    vendorData: Omit<EventVendor, 'id'>,
    user: { id: string; name: string }
  ): Promise<EventVendor> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const existingIndex = event.vendors.findIndex(v => v.vendorId === vendorData.vendorId);
    let result: EventVendor;

    if (existingIndex !== -1) {
      event.vendors[existingIndex] = {
        ...event.vendors[existingIndex],
        ...vendorData
      };
      result = event.vendors[existingIndex];
    } else {
      result = {
        ...vendorData,
        id: `ev_vendor_${Date.now()}`
      };
      event.vendors.push(result);
    }

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'updated_vendor',
      details: `Updated vendor status to "${vendorData.status}" (Quote: ${vendorData.quotedPrice || 'N/A'})`,
      timestamp: new Date().toISOString()
    };

    await eventRepository.update(eventId, {
      vendors: event.vendors,
      activityLog: [activity, ...event.activityLog]
    });

    return result;
  }

  public async updateVendorStatus(
    eventId: string,
    eventVendorId: string,
    status: VendorStatus,
    user: { id: string; name: string }
  ): Promise<EventVendor> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const vendor = event.vendors.find(v => v.id === eventVendorId);
    if (!vendor) throw new NotFoundError('Event vendor not found');

    vendor.status = status;

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'updated_vendor',
      details: `Changed vendor status to "${status}"`,
      timestamp: new Date().toISOString()
    };

    await eventRepository.update(eventId, {
      vendors: event.vendors,
      activityLog: [activity, ...event.activityLog]
    });

    return vendor;
  }
}

export const vendorService = new VendorService();
