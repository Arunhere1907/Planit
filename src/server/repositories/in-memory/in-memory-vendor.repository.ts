import { IVendorRepository } from "../interfaces/vendor.repository.interface.js";
import { VendorPlace } from "../../../shared/types/index.js";
import { InMemoryStore } from "./store.js";

export class InMemoryVendorRepository implements IVendorRepository {
  private store = new InMemoryStore<VendorPlace>();

  public async findPlaces(category?: string, city?: string, minRating: number = 0): Promise<VendorPlace[]> {
    const all = this.store.getAll();
    const cleanCity = city ? city.trim().toLowerCase() : "";
    const cleanCat = category ? category.trim().toLowerCase() : "";

    return all.filter((v) => {
      const matchCity = !cleanCity || v.city.toLowerCase().includes(cleanCity);
      const matchCat =
        !cleanCat ||
        v.category.toLowerCase().includes(cleanCat) ||
        cleanCat.includes(v.category.toLowerCase());
      const matchRating = (v.rating || 0) >= minRating;
      return matchCity && matchCat && matchRating;
    });
  }

  public async searchVendors(params: {
    category?: string;
    city?: string;
    query?: string;
    limit?: number;
  }): Promise<VendorPlace[]> {
    const { category, city, query, limit = 10 } = params;
    const all = this.store.getAll();
    const cleanCity = city ? city.trim().toLowerCase() : "";
    const cleanCat = category ? category.trim().toLowerCase() : "";
    const cleanQuery = query ? query.trim().toLowerCase() : "";

    const filtered = all.filter((v) => {
      const matchCity = !cleanCity || v.city.toLowerCase().includes(cleanCity);
      const matchCat =
        !cleanCat ||
        v.category.toLowerCase().includes(cleanCat) ||
        cleanCat.includes(v.category.toLowerCase());
      const matchQuery =
        !cleanQuery ||
        v.name.toLowerCase().includes(cleanQuery) ||
        v.address.toLowerCase().includes(cleanQuery) ||
        v.area.toLowerCase().includes(cleanQuery);
      return matchCity && matchCat && matchQuery;
    });

    return filtered.slice(0, limit);
  }

  public async findById(id: string): Promise<VendorPlace | null> {
    return this.store.getById(id);
  }

  public async resetToSeed(seedVendors: VendorPlace[]): Promise<void> {
    this.store.populate(seedVendors);
  }
}

export const vendorRepository = new InMemoryVendorRepository();
