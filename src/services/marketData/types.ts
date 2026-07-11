export interface ComparableListing {
  id: string;
  source: string;
  title: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  price: number;
  condition: string;
  url: string;
  imageUrl?: string;
  location: string;
  listingDate: string;
  sellerType: 'dealer' | 'private' | 'auction' | 'unknown';
}

export interface ProviderResult {
  provider: string;
  status: 'success' | 'error' | 'no_data' | 'not_configured';
  comparables: ComparableListing[];
  message?: string;
  error?: string;
}

export interface AggregatedValuation {
  cleanTitleValue: number;
  rebuiltTitleValue: number;
  estimatedSalePrice: number;
  confidence: 'High' | 'Medium' | 'Low' | 'Very Low';
  confidenceScore: number;
  confidenceReason: string;
  comparablesUsed: number;
  providersUsed: string[];
  providersFailed: string[];
  providersNotConfigured: string[];
  comparables: ComparableListing[];
  sourcesBreakdown: {
    source: string;
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  }[];
  valuationMethod: string;
}

export interface MarketDataProvider {
  name: string;
  displayName: string;
  isConfigured(): boolean;
  search(params: SearchParams): Promise<ProviderResult>;
}

export interface SearchParams {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  titleStatus?: string;
}
