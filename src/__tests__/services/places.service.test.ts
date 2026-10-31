import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlacesService } from '../../server/services/places/places.service.js';

// Mock environment variables
vi.mock('../../server/config/env.js', () => ({
  env: {
    GOOGLE_MAPS_API_KEY: 'test-api-key',
  },
}));

// Mock vendor repository
vi.mock('../../server/repositories/index.js', () => ({
  vendorRepository: {
    searchVendors: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../server/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Get the mocked function after mocking
const { vendorRepository } = await import('../../server/repositories/index.js');
const { env } = await import('../../server/config/env.js');
const mockSearchVendors = vendorRepository.searchVendors as ReturnType<typeof vi.fn>;

describe('Places Service - Google Places API Integration', () => {
  let placesService: PlacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    placesService = new PlacesService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should search vendors using Google Places API', async () => {
    const mockApiResponse = {
      places: [
        {
          id: 'place-123',
          displayName: { text: 'Royal Palace Banquet' },
          formattedAddress: 'SG Highway, Ahmedabad, Gujarat, India',
          rating: 4.7,
          userRatingCount: 150,
          priceLevel: 'PRICE_LEVEL_EXPENSIVE',
          internationalPhoneNumber: '+91 79 2650 1234',
          websiteUri: 'https://royalpalace.com',
        },
        {
          id: 'place-456',
          displayName: { text: 'Grand Catering Services' },
          formattedAddress: 'Navrangpura, Ahmedabad, Gujarat, India',
          rating: 4.5,
          userRatingCount: 98,
          priceLevel: 'PRICE_LEVEL_MODERATE',
          internationalPhoneNumber: '+91 79 2640 5678',
          websiteUri: 'https://grandcatering.com',
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Catering',
      city: 'Ahmedabad',
      maxResults: 10,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Royal Palace Banquet');
    expect(result[0].rating).toBe(4.7);
    expect(result[0].city).toBe('Ahmedabad');
    expect(result[1].name).toBe('Grand Catering Services');

    // Verify API was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:searchText',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'test-api-key',
        }),
      })
    );
  });

  it('should map price levels correctly', async () => {
    const mockApiResponse = {
      places: [
        { displayName: { text: 'Budget Venue' }, priceLevel: 'PRICE_LEVEL_INEXPENSIVE' },
        { displayName: { text: 'Mid-Range Venue' }, priceLevel: 'PRICE_LEVEL_MODERATE' },
        { displayName: { text: 'Luxury Venue' }, priceLevel: 'PRICE_LEVEL_EXPENSIVE' },
        { displayName: { text: 'Ultra Premium' }, priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE' },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Mumbai',
    });

    expect(result[0].price_level).toBe(1);
    expect(result[0].approx_cost).toBe(50000);

    expect(result[1].price_level).toBe(2);
    expect(result[1].approx_cost).toBe(150000);

    expect(result[2].price_level).toBe(3);
    expect(result[2].approx_cost).toBe(300000);

    expect(result[3].price_level).toBe(4);
    expect(result[3].approx_cost).toBe(600000);
  });

  it('should handle missing optional fields in API response', async () => {
    const mockApiResponse = {
      places: [
        {
          id: 'place-minimal',
          displayName: { text: 'Basic Vendor' },
          // Missing many optional fields
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Decor',
      city: 'Delhi',
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Basic Vendor');
    expect(result[0].rating).toBe(4.5); // Default
    expect(result[0].price_level).toBe(2); // Default
  });

  it('should construct search query from all parameters', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    await placesService.searchVendors({
      category: 'Photography',
      city: 'Bangalore',
      query: 'candid wedding',
      maxResults: 5,
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    // Should combine all search terms
    expect(requestBody.textQuery).toContain('candid wedding');
    expect(requestBody.textQuery).toContain('Photography');
    expect(requestBody.textQuery).toContain('Bangalore');
    expect(requestBody.pageSize).toBe(5);
  });

  it('should respect maxResults parameter', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    await placesService.searchVendors({
      category: 'Music',
      city: 'Pune',
      maxResults: 20,
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.pageSize).toBe(20);
  });

  it('should include required field mask header', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Chennai',
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const headers = fetchCall[1].headers;

    expect(headers['X-Goog-FieldMask']).toContain('places.displayName');
    expect(headers['X-Goog-FieldMask']).toContain('places.rating');
    expect(headers['X-Goog-FieldMask']).toContain('places.formattedAddress');
  });
});

describe('Places Service - Fallback to Local Repository', () => {
  let placesService: PlacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    env.GOOGLE_MAPS_API_KEY = 'test-api-key';
    placesService = new PlacesService();
  });

  it('should fall back to local repository when API key missing', async () => {
    // Mock missing API key
    env.GOOGLE_MAPS_API_KEY = '';

    const mockLocalVendors = [
      {
        id: 'local-1',
        name: 'Curated Venue',
        category: 'Venue & Facilities',
        city: 'Ahmedabad',
        rating: 4.8,
      },
    ];

    mockSearchVendors.mockResolvedValue(mockLocalVendors);

    const result = await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Ahmedabad',
    });

    expect(result).toEqual(mockLocalVendors);
    expect(mockSearchVendors).toHaveBeenCalledWith({
      category: 'Venue & Facilities',
      city: 'Ahmedabad',
      query: undefined,
      limit: 10,
    });

    // API should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fall back to local repository when API returns error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
    });

    const mockLocalVendors = [
      {
        id: 'local-1',
        name: 'Fallback Vendor',
        category: 'Catering',
        city: 'Mumbai',
      },
    ];

    mockSearchVendors.mockResolvedValue(mockLocalVendors);

    const result = await placesService.searchVendors({
      category: 'Catering',
      city: 'Mumbai',
    });

    expect(result).toEqual(mockLocalVendors);
    expect(mockSearchVendors).toHaveBeenCalled();
  });

  it('should fall back when API returns empty results', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    const mockLocalVendors = [
      {
        id: 'local-1',
        name: 'Local Decor',
        category: 'Decor',
        city: 'Jaipur',
      },
    ];

    mockSearchVendors.mockResolvedValue(mockLocalVendors);

    const result = await placesService.searchVendors({
      category: 'Decor',
      city: 'Jaipur',
    });

    expect(result).toEqual(mockLocalVendors);
    expect(mockSearchVendors).toHaveBeenCalled();
  });

  it('should fall back when API throws network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network failure'));

    const mockLocalVendors = [
      {
        id: 'local-1',
        name: 'Offline Vendor',
        category: 'Photography',
        city: 'Delhi',
      },
    ];

    mockSearchVendors.mockResolvedValue(mockLocalVendors);

    const result = await placesService.searchVendors({
      category: 'Photography',
      city: 'Delhi',
    });

    expect(result).toEqual(mockLocalVendors);
    expect(mockSearchVendors).toHaveBeenCalled();
  });

  it('should fall back when API response is malformed', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const mockLocalVendors = [
      {
        id: 'local-1',
        name: 'Safe Fallback',
        category: 'Music',
        city: 'Kolkata',
      },
    ];

    mockSearchVendors.mockResolvedValue(mockLocalVendors);

    const result = await placesService.searchVendors({
      category: 'Music',
      city: 'Kolkata',
    });

    expect(result).toEqual(mockLocalVendors);
  });
});

describe('Places Service - Cache Behavior', () => {
  let placesService: PlacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    placesService = new PlacesService();
  });

  it('should use cache to avoid redundant API calls', async () => {
    const mockApiResponse = {
      places: [
        {
          id: 'place-1',
          displayName: { text: 'Vendor 1' },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Ahmedabad',
    });

    await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Ahmedabad',
    });

    // Should call API once due to caching
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should make fresh API call for different search parameters', async () => {
    const mockApiResponse = {
      places: [
        {
          id: 'place-1',
          displayName: { text: 'Vendor 1' },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Ahmedabad',
    });

    await placesService.searchVendors({
      category: 'Catering',
      city: 'Mumbai',
    });

    // Should call API twice for different searches
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('Places Service - Error Handling', () => {
  let placesService: PlacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    placesService = new PlacesService();
  });

  it('should handle 401 Unauthorized', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
    });

    mockSearchVendors.mockResolvedValue([{ id: 'local-1', name: 'Fallback' }]);

    const result = await placesService.searchVendors({
      category: 'Catering',
      city: 'Mumbai',
    });

    expect(result).toHaveLength(1);
    expect(mockSearchVendors).toHaveBeenCalled();
  });

  it('should handle 429 Rate Limit', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
    });

    mockSearchVendors.mockResolvedValue([{ id: 'local-1', name: 'Fallback' }]);

    const result = await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Delhi',
    });

    expect(result).toHaveLength(1);
    expect(mockSearchVendors).toHaveBeenCalled();
  });

  it('should handle 500 Server Error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    mockSearchVendors.mockResolvedValue([{ id: 'local-1', name: 'Fallback' }]);

    const result = await placesService.searchVendors({
      category: 'Decor',
      city: 'Bangalore',
    });

    expect(result).toHaveLength(1);
  });

  it('should handle timeout gracefully', async () => {
    (global.fetch as any).mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
    );

    mockSearchVendors.mockResolvedValue([{ id: 'local-1', name: 'Timeout Fallback' }]);

    const result = await placesService.searchVendors({
      category: 'Photography',
      city: 'Pune',
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Timeout Fallback');
  });
});

describe('Places Service - Data Mapping', () => {
  let placesService: PlacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    placesService = new PlacesService();
  });

  it('should map all fields correctly', async () => {
    const mockApiResponse = {
      places: [
        {
          id: 'place-full',
          displayName: { text: 'Complete Vendor Details' },
          formattedAddress: '123 Main St, Ahmedabad, Gujarat 380001, India',
          rating: 4.9,
          userRatingCount: 256,
          priceLevel: 'PRICE_LEVEL_EXPENSIVE',
          internationalPhoneNumber: '+91 79 2650 9999',
          websiteUri: 'https://example-vendor.com',
          photos: [{ name: 'photo-1' }],
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Venue & Facilities',
      city: 'Ahmedabad',
    });

    const vendor = result[0];
    expect(vendor.id).toBe('place-full');
    expect(vendor.name).toBe('Complete Vendor Details');
    expect(vendor.address).toBe('123 Main St, Ahmedabad, Gujarat 380001, India');
    expect(vendor.rating).toBe(4.9);
    expect(vendor.user_ratings_total).toBe(256);
    expect(vendor.price_level).toBe(3);
    expect(vendor.phone).toBe('+91 79 2650 9999');
    expect(vendor.website).toBe('https://example-vendor.com');
    expect(vendor.category).toBe('Venue & Facilities');
    expect(vendor.city).toBe('Ahmedabad');
  });

  it('should generate unique IDs when API id missing', async () => {
    const mockApiResponse = {
      places: [{ displayName: { text: 'Vendor 1' } }, { displayName: { text: 'Vendor 2' } }],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Music',
      city: 'Chennai',
    });

    expect(result[0].id).toMatch(/^gplace_0_/);
    expect(result[1].id).toMatch(/^gplace_1_/);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('should add default highlights and reviews', async () => {
    const mockApiResponse = {
      places: [
        {
          displayName: { text: 'New Vendor' },
          rating: 4.6,
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Catering',
      city: 'Hyderabad',
    });

    expect(result[0].highlights).toContain('Verified Listing');
    expect(result[0].highlights).toContain('Professional Team');
    expect(result[0].reviews).toHaveLength(1);
    expect(result[0].reviews[0].author).toBe('Verified Client');
    expect(result[0].red_flags).toEqual([]);
  });

  it('should handle undefined displayName', async () => {
    const mockApiResponse = {
      places: [
        {
          id: 'place-no-name',
          // Missing displayName
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await placesService.searchVendors({
      category: 'Decor',
      city: 'Surat',
    });

    expect(result[0].name).toBe('Event Vendor'); // Default name
  });
});

describe('Places Service - Search Parameters', () => {
  let placesService: PlacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    placesService = new PlacesService();
  });

  it('should handle search without optional parameters', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    mockSearchVendors.mockResolvedValue([]);

    await placesService.searchVendors({});

    expect(mockSearchVendors).toHaveBeenCalledWith({
      category: undefined,
      city: undefined,
      query: undefined,
      limit: 10,
    });
  });

  it('should pass all parameters to local repository', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    mockSearchVendors.mockResolvedValue([]);

    await placesService.searchVendors({
      category: 'Photography',
      city: 'Jaipur',
      query: 'candid photographer',
      maxResults: 15,
    });

    expect(mockSearchVendors).toHaveBeenCalledWith({
      category: 'Photography',
      city: 'Jaipur',
      query: 'candid photographer',
      limit: 15,
    });
  });

  it('should use default maxResults of 10', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    await placesService.searchVendors({
      category: 'Music',
      city: 'Kolkata',
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.pageSize).toBe(10);
  });
});
