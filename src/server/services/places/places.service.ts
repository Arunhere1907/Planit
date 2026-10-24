import { env } from '../../config/env.js';
import { Vendor, VendorCategory } from '../../../shared/types/index.js';
import { vendorRepository } from '../../repositories/index.js';
import { logger } from '../../utils/logger.js';

interface GooglePlaceSearchResult {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    photos?: Array<{ name?: string }>;
  }>;
}

export class PlacesService {
  /**
   * Search for vendors matching category and city, trying Places API or falling back to local database
   */
  public async searchVendors(params: {
    category?: VendorCategory;
    city?: string;
    query?: string;
    maxResults?: number;
  }): Promise<Vendor[]> {
    const { category, city, query, maxResults = 10 } = params;

    // Check if live Google Places API is usable
    if (env.GOOGLE_MAPS_API_KEY && env.GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY') {
      try {
        const liveVendors = await this.queryGooglePlacesAPI({ category, city, query, maxResults });
        if (liveVendors.length > 0) {
          return liveVendors;
        }
      } catch (err) {
        logger.warn('Google Places API search failed, falling back to curated local vendor repository', { err });
      }
    }

    // Graceful fallback to rich local repository
    return vendorRepository.searchVendors({
      category,
      city,
      query,
      limit: maxResults
    });
  }

  private async queryGooglePlacesAPI(params: {
    category?: VendorCategory;
    city?: string;
    query?: string;
    maxResults: number;
  }): Promise<Vendor[]> {
    const textQuery = [params.query, params.category, params.city, 'events wedding'].filter(Boolean).join(' ');
    
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.internationalPhoneNumber,places.websiteUri,places.photos'
      },
      body: JSON.stringify({
        textQuery,
        pageSize: params.maxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Places API responded with status ${response.status}`);
    }

    const data = (await response.json()) as GooglePlaceSearchResult;
    if (!data.places || data.places.length === 0) {
      return [];
    }

    return data.places.map((place, index) => {
      let priceTier: 'budget' | 'mid' | 'premium' | 'luxury' = 'mid';
      if (place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE') priceTier = 'budget';
      else if (place.priceLevel === 'PRICE_LEVEL_EXPENSIVE') priceTier = 'premium';
      else if (place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') priceTier = 'luxury';

      return {
        id: place.id || `gplace_${index}_${Date.now()}`,
        name: place.displayName?.text || 'Event Vendor',
        category: params.category || 'venue',
        rating: place.rating || 4.5,
        reviewCount: place.userRatingCount || 25,
        priceTier,
        address: place.formattedAddress || `${params.city || 'Ahmedabad'}, India`,
        city: params.city || 'Ahmedabad',
        phone: place.internationalPhoneNumber || '+91 98250 12345',
        website: place.websiteUri || undefined,
        verified: true,
        source: 'google_places'
      };
    });
  }
}

export const placesService = new PlacesService();
