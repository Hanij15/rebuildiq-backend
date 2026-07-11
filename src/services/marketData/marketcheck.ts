import type { MarketDataProvider, SearchParams, ProviderResult, ComparableListing } from './types.js';

/**
 * MarketCheck Provider
 * 
 * MarketCheck provides real vehicle market data including active listings.
 * Free tier: 500 calls/month
 * Sign up at: marketcheck.com/vehicle-market-data-api
 * Set MARKETCHECK_API_KEY environment variable.
 */
export class MarketCheckProvider implements MarketDataProvider {
  name = 'marketcheck';
  displayName = 'MarketCheck';

  private apiKey: string;
  private baseUrl = 'https://mc-api.marketcheck.com/v2';

  constructor() {
    this.apiKey = process.env.MARKETCHECK_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(params: SearchParams): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        status: 'not_configured',
        comparables: [],
        message: 'MarketCheck not configured. Get free API key at marketcheck.com and set MARKETCHECK_API_KEY.',
      };
    }

    try {
      const url = new URL(`${this.baseUrl}/search/car/active`);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('year', String(params.year));
      url.searchParams.set('make', params.make);
      url.searchParams.set('model', params.model);
      url.searchParams.set('rows', '25');
      url.searchParams.set('sort_by', 'price');
      url.searchParams.set('sort_order', 'asc');

      const res = await fetch(url.toString());
      if (!res.ok) {
        return {
          provider: this.name,
          status: 'error',
          comparables: [],
          error: `MarketCheck API HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const listings = data?.listings || [];

      if (!listings.length) {
        return {
          provider: this.name,
          status: 'no_data',
          comparables: [],
          message: `No MarketCheck listings found for ${params.year} ${params.make} ${params.model}`,
        };
      }

      const comparables: ComparableListing[] = listings
        .filter((l: any) => l.price && l.price > 0)
        .map((l: any, idx: number) => ({
          id: `mc-${idx}-${l.id || idx}`,
          source: 'MarketCheck',
          title: `${l.build?.year || params.year} ${l.build?.make || params.make} ${l.build?.model || params.model} ${l.build?.trim || ''}`,
          year: l.build?.year || params.year,
          make: l.build?.make || params.make,
          model: l.build?.model || params.model,
          trim: l.build?.trim || params.trim,
          mileage: l.miles || 0,
          price: l.price || 0,
          condition: l.inventory_type || 'used',
          url: l.vdp_url || '',
          imageUrl: l.media?.photo_links?.[0],
          location: `${l.dealer?.city || ''}, ${l.dealer?.state || ''}`,
          listingDate: l.last_seen_at || '',
          sellerType: l.dealer?.name ? 'dealer' : 'private',
        }));

      return {
        provider: this.name,
        status: comparables.length > 0 ? 'success' : 'no_data',
        comparables,
        message: comparables.length > 0
          ? `Found ${comparables.length} MarketCheck listings`
          : 'No valid listings found',
      };
    } catch (err: any) {
      return {
        provider: this.name,
        status: 'error',
        comparables: [],
        error: err.message || 'MarketCheck API request failed',
      };
    }
  }
}
