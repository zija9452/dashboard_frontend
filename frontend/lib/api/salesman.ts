import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Salesman entity
export interface Salesman {
  id: string;
  name: string;
  phone: string;
  address?: string;
  branch?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesmanListResponse {
  data: Salesman[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API client for salesman with pagination support
export class SalesmanApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of salesman with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<SalesmanListResponse>
   */
  async getSalesmen(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<SalesmanListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/salesman/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch salesman: ${response.status} ${response.statusText}`);
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
   * Get a specific salesman by ID
   * @param id Salesman ID
   * @returns Promise<Salesman>
   */
  async getSalesmanById(id: string): Promise<Salesman> {
    const response = await fetch(`${this.baseUrl}/salesman/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch salesman: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new salesman
   * @param salesman Salesman data to create
   * @returns Promise<Salesman>
   */
  async createSalesman(salesman: Omit<Salesman, 'id' | 'created_at' | 'updated_at'>): Promise<Salesman> {
    const response = await fetch(`${this.baseUrl}/salesman/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(salesman),
    });

    if (!response.ok) {
      throw new Error(`Failed to create salesman: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing salesman
   * @param id Salesman ID to update
   * @param salesman Partial salesman data to update
   * @returns Promise<Salesman>
   */
  async updateSalesman(id: string, salesman: Partial<Omit<Salesman, 'id'>>): Promise<Salesman> {
    const response = await fetch(`${this.baseUrl}/salesman/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(salesman),
    });

    if (!response.ok) {
      throw new Error(`Failed to update salesman: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a salesman by ID
   * @param id Salesman ID to delete
   * @returns Promise<void>
   */
  async deleteSalesman(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/salesman/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete salesman: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const salesmanApi = new SalesmanApi();