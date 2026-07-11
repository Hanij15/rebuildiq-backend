import type {
  MarketDataProvider,
  SearchParams,
  AggregatedValuation,
  ComparableListing,
} from './types.js';
import { EbayProvider } from './ebay.js';
import { MarketCheckProvider } from './marketcheck.js';
import { InternalProvider } from './internal.js';

/**
 * Market Data Aggregation Engine
 * 
 * Queries multiple market data providers and aggregates results.
 * Add new providers by implementing MarketDataProvider and registering below.
 */
export class MarketDataEngine {
  private providers: MarketDataProvider[];

  constructor() {
    this.providers = [
      new EbayProvider(),
      new MarketCheckProvider(),
      new InternalProvider(),
    ];
  }

  async getValuation(params: SearchParams): Promise<AggregatedValuation> {
    const results = await Promise.all(
      this.providers.map(p => p.search(params))
    );

    const allComparables: ComparableListing[] = [];
    const providersUsed: string[] = [];
    const providersFailed: string[] = [];
    const providersNotConfigured: string[] = [];

    for (const result of results) {
      if (result.status === 'success' && result.comparables.length > 0) {
        providersUsed.push(result.provider);
        allComparables.push(...result.comparables);
      } else if (result.status === 'error') {
        providersFailed.push(result.provider);
      } else if (result.status === 'not_configured') {
        providersNotConfigured.push(result.provider);
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    const uniqueComparables = allComparables.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    const valuation = this.calculateValuation(uniqueComparables, params, providersUsed);

    return {
      ...valuation,
      comparablesUsed: uniqueComparables.length,
      providersUsed,
      providersFailed,
      providersNotConfigured,
      comparables: uniqueComparables.slice(0, 50),
    };
  }

  getProviderStatuses(): { name: string; displayName: string; configured: boolean; setupUrl: string; description: string }[] {
    return [
      {
        name: 'ebay',
        displayName: 'eBay Sold Listings',
        configured: !!process.env.EBAY_APP_ID,
        setupUrl: 'https://developer.ebay.com',
        description: 'Real sold prices from eBay Motors. Free developer account. 5,000 calls/day.',
      },
      {
        name: 'marketcheck',
        displayName: 'MarketCheck',
        configured: !!process.env.MARKETCHECK_API_KEY,
        setupUrl: 'https://www.marketcheck.com/vehicle-market-data-api',
        description: 'Active dealer and private listings. Free tier: 500 calls/month.',
      },
      {
        name: 'internal',
        displayName: 'Internal Depreciation Model',
        configured: true,
        setupUrl: '',
        description: 'Always-available estimate based on MSRP, age, and mileage.',
      },
    ];
  }

  private calculateValuation(
    comparables: ComparableListing[],
    params: SearchParams,
    providersUsed: string[]
  ): Omit<AggregatedValuation, 'comparablesUsed' | 'providersUsed' | 'providersFailed' | 'providersNotConfigured' | 'comparables'> {
    const yearMatch = comparables.filter(c => Math.abs(c.year - params.year) <= 2);
    const makeModelMatch = yearMatch.filter(
      c => c.make.toLowerCase() === params.make.toLowerCase() &&
           c.model.toLowerCase() === params.model.toLowerCase()
    );

    const sourceMap = new Map<string, number[]>();
    for (const c of makeModelMatch) {
      const prices = sourceMap.get(c.source) || [];
      prices.push(c.price);
      sourceMap.set(c.source, prices);
    }

    const sourcesBreakdown = Array.from(sourceMap.entries()).map(([source, prices]) => ({
      source,
      count: prices.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    }));

    let comparablesForAvg = makeModelMatch;
    if (makeModelMatch.length < 3 && yearMatch.length >= 3) {
      comparablesForAvg = yearMatch;
    }

    let avgCleanPrice = 0;
    if (comparablesForAvg.length > 0) {
      const prices = comparablesForAvg.map(c => c.price).sort((a, b) => a - b);
      const q1 = prices[Math.floor(prices.length * 0.25)];
      const q3 = prices[Math.floor(prices.length * 0.75)];
      const iqr = q3 - q1;
      const minPrice = Math.max(0, q1 - 1.5 * iqr);
      const maxPrice = q3 + 1.5 * iqr;
      const filteredPrices = prices.filter(p => p >= minPrice && p <= maxPrice);
      avgCleanPrice = Math.round(filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length);
    }

    const externalProviders = providersUsed.filter(p => p !== 'internal');
    const externalCount = makeModelMatch.filter(c => c.source !== 'Internal Model').length;

    let confidenceScore = 0;
    let confidence: 'High' | 'Medium' | 'Low' | 'Very Low' = 'Very Low';
    let confidenceReason = '';
    let valuationMethod = '';

    if (externalProviders.length >= 2 && externalCount >= 10) {
      confidenceScore = 85 + Math.min(externalCount, 15);
      confidence = 'High';
      confidenceReason = `${externalCount} comparable vehicles found from ${externalProviders.join(' and ')}`;
      valuationMethod = `Weighted average of ${externalCount} sold/active listings`;
    } else if (externalProviders.length >= 1 && externalCount >= 5) {
      confidenceScore = 60 + Math.min(externalCount * 2, 20);
      confidence = 'Medium';
      confidenceReason = `${externalCount} comparable vehicles from ${externalProviders.join(', ')}`;
      valuationMethod = `Average of ${externalCount} listings from ${externalProviders.join(', ')}`;
    } else if (externalProviders.length >= 1 && externalCount >= 1) {
      confidenceScore = 35 + externalCount * 3;
      confidence = 'Low';
      confidenceReason = `Only ${externalCount} external comparable(s) found. Add manual comparables or configure more providers.`;
      valuationMethod = `Limited data: ${externalCount} external listing(s) + internal model`;
    } else {
      confidenceScore = 25;
      confidence = 'Very Low';
      confidenceReason = 'No external market data. Configure eBay or MarketCheck for better accuracy.';
      valuationMethod = 'Internal depreciation model only';
    }

    if (avgCleanPrice === 0) {
      const internalComp = comparables.find(c => c.source === 'Internal Model');
      avgCleanPrice = internalComp?.price || 0;
    }

    const avgCompMileage = comparablesForAvg.length > 0
      ? comparablesForAvg.reduce((s, c) => s + c.mileage, 0) / comparablesForAvg.length
      : params.mileage;
    const mileageDiff = params.mileage - avgCompMileage;
    const mileageAdjustment = mileageDiff > 0
      ? Math.max(0.7, 1 - (mileageDiff / 100000) * 0.3)
      : Math.min(1.15, 1 + (Math.abs(mileageDiff) / 100000) * 0.15);
    const adjustedCleanPrice = Math.round(avgCleanPrice * mileageAdjustment);

    const luxury = ['Cadillac','Lincoln','Mercedes','BMW','Audi','Lexus','Acura',
      'Infiniti','Genesis','Volvo','Porsche','Jaguar','Land Rover','Range Rover',
      'Tesla','Bentley','Rolls-Royce','Maserati'].some(l => 
        params.make.toLowerCase().includes(l.toLowerCase()));
    const rebuiltPrice = Math.round(adjustedCleanPrice * (luxury ? 0.58 : 0.68));
    const estSalePrice = Math.round(adjustedCleanPrice * 0.82);

    return {
      cleanTitleValue: adjustedCleanPrice,
      rebuiltTitleValue: rebuiltPrice,
      estimatedSalePrice: estSalePrice,
      confidence,
      confidenceScore: Math.min(100, Math.round(confidenceScore)),
      confidenceReason,
      sourcesBreakdown,
      valuationMethod,
    };
  }
}
