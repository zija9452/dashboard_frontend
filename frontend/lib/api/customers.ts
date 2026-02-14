import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Customer entity
export interface Customer {
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

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API client for customers with pagination support
export class CustomersApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of customers with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<CustomerListResponse>
   */
  async getCustomers(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<CustomerListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/customer/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customers: ${response.status} ${response.statusText}`);
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
   * Get a specific customer by ID
   * @param id Customer ID
   * @returns Promise<Customer>
   */
  async getCustomerById(id: string): Promise<Customer> {
    const response = await fetch(`${this.baseUrl}/customer/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customer: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new customer
   * @param customer Customer data to create
   * @returns Promise<Customer>
   */
  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'closing_balance' | 'credit_balance'>): Promise<Customer> {
    const response = await fetch(`${this.baseUrl}/customer/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      throw new Error(`Failed to create customer: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing customer
   * @param id Customer ID to update
   * @param customer Partial customer data to update
   * @returns Promise<Customer>
   */
  async updateCustomer(id: string, customer: Partial<Omit<Customer, 'id'>>): Promise<Customer> {
    const response = await fetch(`${this.baseUrl}/customer/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      throw new Error(`Failed to update customer: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a customer by ID
   * @param id Customer ID to delete
   * @returns Promise<void>
   */
  async deleteCustomer(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/customer/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete customer: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const customersApi = new CustomersApi();