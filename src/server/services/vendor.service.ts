import { eventRepository } from '../repositories/index.js';
import { VendorItem, VendorStatus, ActivityLogItem } from '../../shared/types/index.js';
import { NotFoundError } from '../errors/app-error.js';

export class VendorService {
  public async getEventVendors(eventId: string): Promise<VendorItem[]> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return event.vendors;
  }

  public async addOrUpdateEventVendor(
    eventId: string,
    vendorData: Omit<VendorItem, 'id'>,
    user: { id: string; name: string }
  ): Promise<VendorItem> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const existingIndex = event.vendors.findIndex(
      (v: VendorItem) => v.name.toLowerCase() === vendorData.name.toLowerCase()
    );
    let result: VendorItem;

    if (existingIndex !== -1) {
      event.vendors[existingIndex] = {
        ...event.vendors[existingIndex],
        ...vendorData,
        edited_at: new Date().toISOString(),
      };
      result = event.vendors[existingIndex];
    } else {
      result = {
        ...vendorData,
        id: `ev_vendor_${Date.now()}`,
        edited_at: new Date().toISOString(),
      };
      event.vendors.push(result);
    }

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: user.name,
      action: 'updated_vendor',
      detail: `Updated vendor "${vendorData.name}" status to "${vendorData.status}" (Quote: ₹${vendorData.quote.toLocaleString()})`,
      timestamp: new Date().toISOString(),
    };

    await eventRepository.update(eventId, {
      vendors: event.vendors,
      activity_log: [activity, ...event.activity_log],
    });

    return result;
  }

  public async updateVendorStatus(
    eventId: string,
    eventVendorId: string,
    status: VendorStatus,
    user: { id: string; name: string }
  ): Promise<VendorItem> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const vendor = event.vendors.find((v: VendorItem) => v.id === eventVendorId);
    if (!vendor) throw new NotFoundError('Event vendor not found');

    vendor.status = status;
    vendor.edited_at = new Date().toISOString();

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: user.name,
      action: 'updated_vendor',
      detail: `Changed vendor "${vendor.name}" status to "${status}"`,
      timestamp: new Date().toISOString(),
    };

    await eventRepository.update(eventId, {
      vendors: event.vendors,
      activity_log: [activity, ...event.activity_log],
    });

    return vendor;
  }
}

export const vendorService = new VendorService();
