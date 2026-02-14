import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Stock entity
export interface Stock {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

export interface StockListResponse {
  data: Stock[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StockAdjustment {
  product_id: string;
  adjustment_quantity: number;
  reason: string;
  branch: string;
}

// API client for stock with pagination support
export class StockApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of stock items with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<StockListResponse>
   */
  async getStock(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<StockListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/admin/ViewStock?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stock: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Calculate total pages
    const total = data.length; // This is a simplification; real API might have total in response
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Get a specific stock item by ID
   * @param id Stock ID
   * @returns Promise<Stock>
   */
  async getStockById(id: string): Promise<Stock> {
    const response = await fetch(`${this.baseUrl}/admin/ViewStock/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stock: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Adjust stock quantity
   * @param adjustment Stock adjustment data
   * @returns Promise<Stock>
   */
  async adjustStock(adjustment: StockAdjustment): Promise<Stock> {
    const response = await fetch(`${this.baseUrl}/admin/Adjuststock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(adjustment),
    });

    if (!response.ok) {
      throw new Error(`Failed to adjust stock: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Add stock
   * @param stock Stock data to add
   * @returns Promise<Stock>
   */
  async addStock(stock: Omit<Stock, 'id' | 'created_at' | 'updated_at'>): Promise<Stock> {
    const response = await fetch(`${this.baseUrl}/admin/SaveStockIn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(stock),
    });

    if (!response.ok) {
      throw new Error(`Failed to add stock: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing stock item
   * @param id Stock ID to update
   * @param stock Partial stock data to update
   * @returns Promise<Stock>
   */
  async updateStock(id: string, stock: Partial<Omit<Stock, 'id'>>): Promise<Stock> {
    const response = await fetch(`${this.baseUrl}/admin/ViewStock/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(stock),
    });

    if (!response.ok) {
      throw new Error(`Failed to update stock: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a stock item by ID
   * @param id Stock ID to delete
   * @returns Promise<void>
   */
  async deleteStock(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/ViewStock/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete stock: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const stockApi = new StockApi();