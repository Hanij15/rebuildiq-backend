import type { MarketDataProvider, SearchParams, ProviderResult, ComparableListing } from './types.js';
import { calculateValue } from '../valuation.js';

/**
 * Internal Depreciation Provider
 * 
 * Uses make-specific MSRP database with age/mileage depreciation.
 * Always available as fallback when external providers fail or aren't configured.
 */
export class InternalProvider implements MarketDataProvider {
  name = 'internal';
  displayName = 'Internal Depreciation Model';

  isConfigured(): boolean {
    return true; // Always available
  }

  async search(params: SearchParams): Promise<ProviderResult> {
    try {
      const vals = calculateValue(params.make, params.year, params.mileage, params.trim);
      
      const comparable: ComparableListing = {
        id: 'internal-estimate',
        source: 'Internal Model',
        title: `${params.year} ${params.make} ${params.model} ${params.trim} (Estimated)`.trim(),
        year: params.year,
        make: params.make,
        model: params.model,
        trim: params.trim,
        mileage: params.mileage,
        price: vals.clean,
        condition: 'clean',
        url: '',
        location: '',
        listingDate: new Date().toISOString(),
        sellerType: 'unknown',
      };

      return {
        provider: this.name,
        status: 'success',
        comparables: [comparable],
        message: `Estimate based on ${params.year} ${params.make} ${params.model} MSRP with ${new Date().getFullYear() - params.year}yr depreciation and ${params.mileage.toLocaleString()} miles`,
      };
    } catch (err: any) {
      return {
        provider: this.name,
        status: 'error',
        comparables: [],
        error: err.message || 'Internal valuation failed',
      };
    }
  }
}
