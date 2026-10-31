import type { VendorPlace } from '../../../shared/types/index.js';

export interface IVendorRepository {
  findPlaces(category?: string, city?: string, minRating?: number): Promise<VendorPlace[]>;
  searchVendors(params: {
    category?: string;
    city?: string;
    query?: string;
    limit?: number;
  }): Promise<VendorPlace[]>;
  findById(id: string): Promise<VendorPlace | null>;
  resetToSeed(seedVendors: VendorPlace[]): Promise<void>;
}
