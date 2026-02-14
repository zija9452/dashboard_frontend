import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Vendor entity
export interface Vendor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  gst_no?: string;
  opening_balance: number;
  closing_balance: number;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface VendorListResponse {
  data: Vendor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API client for vendors with pagination support
export class VendorsApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of vendors with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<VendorListResponse>
   */
  async getVendors(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<VendorListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/vendor/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendors: ${response.status} ${response.statusText}`);
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
   * Get a specific vendor by ID
   * @param id Vendor ID
   * @returns Promise<Vendor>
   */
  async getVendorById(id: string): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}/vendor/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new vendor
   * @param vendor Vendor data to create
   * @returns Promise<Vendor>
   */
  async createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at' | 'closing_balance' | 'credit_balance'>): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}/vendor/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(vendor),
    });

    if (!response.ok) {
      throw new Error(`Failed to create vendor: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing vendor
   * @param id Vendor ID to update
   * @param vendor Partial vendor data to update
   * @returns Promise<Vendor>
   */
  async updateVendor(id: string, vendor: Partial<Omit<Vendor, 'id'>>): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}/vendor/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(vendor),
    });

    if (!response.ok) {
      throw new Error(`Failed to update vendor: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a vendor by ID
   * @param id Vendor ID to delete
   * @returns Promise<void>
   */
  async deleteVendor(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/vendor/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete vendor: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const vendorsApi = new VendorsApi();