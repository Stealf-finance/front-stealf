/**
 * Service to fetch real-time cryptocurrency prices
 */

interface PriceData {
  usd: number;
  usd_24h_change: number;
}

interface CoinGeckoResponse {
  solana: PriceData;
  [key: string]: PriceData;
}

const PRICE_CACHE_DURATION = 60 * 1000; // 1 minute cache
let priceCache: { [symbol: string]: { price: number; timestamp: number } } = {};

export class PriceService {
  private baseURL = 'https://api.coingecko.com/api/v3';

  /**
   * Get current price for SOL in USD
   */
  async getSOLPrice(): Promise<number> {
    return this.getPrice('solana');
  }

  /**
   * Get price for any token by CoinGecko ID
   */
  async getPrice(coinId: string): Promise<number> {
    try {
      // Check cache first
      const cached = priceCache[coinId];
      if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
        console.log(`💾 Using cached price for ${coinId}: $${cached.price}`);
        return cached.price;
      }

      // Fetch fresh price
      const response = await fetch(
        `${this.baseURL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.status}`);
      }

      const data: CoinGeckoResponse = await response.json();
      const price = data[coinId]?.usd;

      if (!price) {
        throw new Error(`Price not found for ${coinId}`);
      }

      // Cache the price
      priceCache[coinId] = {
        price,
        timestamp: Date.now(),
      };

      console.log(`💰 Fetched ${coinId} price: $${price}`);
      return price;
    } catch (error) {
      console.error(`Error fetching price for ${coinId}:`, error);
      // Fallback to cached price if available, even if expired
      if (priceCache[coinId]) {
        console.warn(`Using expired cache for ${coinId}`);
        return priceCache[coinId].price;
      }
      // Last resort: return a default value
      return coinId === 'solana' ? 100 : 0; // Default SOL price fallback
    }
  }

  /**
   * Get prices for multiple tokens at once
   */
  async getPrices(coinIds: string[]): Promise<{ [coinId: string]: number }> {
    try {
      const ids = coinIds.join(',');
      const response = await fetch(
        `${this.baseURL}/simple/price?ids=${ids}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }

      const data: CoinGeckoResponse = await response.json();
      const prices: { [coinId: string]: number } = {};

      for (const coinId of coinIds) {
        if (data[coinId]?.usd) {
          prices[coinId] = data[coinId].usd;
          // Cache individual prices
          priceCache[coinId] = {
            price: data[coinId].usd,
            timestamp: Date.now(),
          };
        }
      }

      return prices;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      return {};
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    priceCache = {};
  }
}

export const priceService = new PriceService();
