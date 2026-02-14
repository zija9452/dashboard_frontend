import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Walk-in Invoice entity
export interface WalkInInvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export interface WalkInInvoice {
  id: string;
  order_id: string;
  customer_name: string;
  items: WalkInInvoiceItem[];
  total_amount: number;
  discount: number;
  tax_amount: number;
  net_amount: number;
  payment_status: 'paid' | 'partial' | 'pending';
  payment_method?: string;
  order_date: string;
  created_at: string;
  updated_at: string;
}

export interface WalkInInvoiceListResponse {
  data: WalkInInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalkInInvoiceCreateRequest {
  customer_name: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  discount?: number;
  payment_method?: string;
}

// API client for walk-in invoices
export class WalkInInvoiceApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of walk-in invoices with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<WalkInInvoiceListResponse>
   */
  async getWalkInInvoices(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<WalkInInvoiceListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/walkin-invoice/walkin-invoices?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch walk-in invoices: ${response.status} ${response.statusText}`);
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
   * Get a specific walk-in invoice by ID
   * @param id Invoice ID
   * @returns Promise<WalkInInvoice>
   */
  async getWalkInInvoiceById(id: string): Promise<WalkInInvoice> {
    const response = await fetch(`${this.baseUrl}/walkin-invoice/walkin-invoices/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch walk-in invoice: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new walk-in invoice
   * @param invoice Walk-in invoice data to create
   * @returns Promise<WalkInInvoice>
   */
  async createWalkInInvoice(invoice: WalkInInvoiceCreateRequest): Promise<WalkInInvoice> {
    const response = await fetch(`${this.baseUrl}/walkin-invoice/walkin-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      throw new Error(`Failed to create walk-in invoice: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing walk-in invoice
   * @param id Invoice ID to update
   * @param invoice Partial invoice data to update
   * @returns Promise<WalkInInvoice>
   */
  async updateWalkInInvoice(id: string, invoice: Partial<WalkInInvoice>): Promise<WalkInInvoice> {
    const response = await fetch(`${this.baseUrl}/walkin-invoice/walkin-invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      throw new Error(`Failed to update walk-in invoice: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a walk-in invoice by ID
   * @param id Invoice ID to delete
   * @returns Promise<void>
   */
  async deleteWalkInInvoice(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/walkin-invoice/walkin-invoices/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete walk-in invoice: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const walkInInvoiceApi = new WalkInInvoiceApi();