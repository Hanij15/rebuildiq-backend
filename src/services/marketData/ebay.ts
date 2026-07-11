import type { MarketDataProvider, SearchParams, ProviderResult, ComparableListing } from './types.js';

/**
 * eBay Sold Listings Provider
 * 
 * Uses eBay Finding API to search for sold vehicle listings.
 * Provides REAL sold prices — not asking prices.
 * 
 * To use: Get a free eBay Developer account at developer.ebay.com
 * Set EBAY_APP_ID environment variable.
 * 
 * Free tier: 5,000 API calls/day
 */
export class EbayProvider implements MarketDataProvider {
  name = 'ebay';
  displayName = 'eBay Sold Listings';

  private appId: string;
  private apiUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';

  constructor() {
    this.appId = process.env.EBAY_APP_ID || '';
  }

  isConfigured(): boolean {
    return !!this.appId;
  }

  async search(params: SearchParams): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        status: 'not_configured',
        comparables: [],
        message: 'eBay not configured. Get free API key at developer.ebay.com and set EBAY_APP_ID.',
      };
    }

    try {
      const keywords = `${params.year} ${params.make} ${params.model} ${params.trim}`.trim();
      
      const url = new URL(this.apiUrl);
      url.searchParams.set('OPERATION-NAME', 'findCompletedItems');
      url.searchParams.set('SERVICE-VERSION', '1.13.0');
      url.searchParams.set('SECURITY-APPNAME', this.appId);
      url.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON');
      url.searchParams.set('REST-PAYLOAD', 'true');
      url.searchParams.set('keywords', keywords);
      url.searchParams.set('categoryId', '6001');
      url.searchParams.set('itemFilter(0).name', 'SoldItemsOnly');
      url.searchParams.set('itemFilter(0).value', 'true');
      url.searchParams.set('itemFilter(1).name', 'MinPrice');
      url.searchParams.set('itemFilter(1).value', '500');
      url.searchParams.set('sortOrder', 'EndTimeSoonest');
      url.searchParams.set('paginationInput.entriesPerPage', '25');

      const res = await fetch(url.toString());
      if (!res.ok) {
        return {
          provider: this.name,
          status: 'error',
          comparables: [],
          error: `eBay API HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const results = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

      if (!results.length) {
        return {
          provider: this.name,
          status: 'no_data',
          comparables: [],
          message: `No sold eBay listings found for ${params.year} ${params.make} ${params.model}`,
        };
      }

      const comparables: ComparableListing[] = results.map((item: any, idx: number) => {
        const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0');
        const title = item.title?.[0] || '';
        const mileage = this.extractMileage(title);
        return {
          id: `ebay-${idx}-${item.itemId?.[0] || idx}`,
          source: 'eBay',
          title,
          year: params.year,
          make: params.make,
          model: params.model,
          trim: params.trim,
          mileage,
          price,
          condition: this.extractCondition(title),
          url: item.viewItemURL?.[0] || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}`,
          imageUrl: item.galleryURL?.[0],
          location: item.location?.[0] || '',
          listingDate: item.listingInfo?.[0]?.endTime?.[0] || '',
          sellerType: 'unknown',
        };
      }).filter((c: ComparableListing) => c.price > 0);

      return {
        provider: this.name,
        status: comparables.length > 0 ? 'success' : 'no_data',
        comparables,
        message: comparables.length > 0 
          ? `Found ${comparables.length} sold eBay listings` 
          : 'No valid sold listings found',
      };
    } catch (err: any) {
      return {
        provider: this.name,
        status: 'error',
        comparables: [],
        error: err.message || 'eBay API request failed',
      };
    }
  }

  private extractMileage(title: string): number {
    const match = title.match(/(\d{1,3}(,\d{3})*)\s*(miles?|mi)/i);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  }

  private extractCondition(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('salvage')) return 'salvage';
    if (lower.includes('rebuilt')) return 'rebuilt';
    if (lower.includes('clean')) return 'clean';
    if (lower.includes('parts')) return 'parts-only';
    return 'unknown';
  }
}
