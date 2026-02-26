import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Customer Invoice entity
export interface CustomerInvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export interface CustomerInvoice {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  items: CustomerInvoiceItem[];
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

export interface CustomerInvoiceListResponse {
  data: CustomerInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerInvoiceCreateRequest {
  customer_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  discount?: number;
  payment_method?: string;
}

// API client for customer invoices
export class CustomerInvoiceApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of customer invoices with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<CustomerInvoiceListResponse>
   */
  async getCustomerInvoices(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<CustomerInvoiceListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('searchString', search);
    }

    const response = await fetch(`${this.baseUrl}/customerinvoice/viewcustomerorder?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Failed to fetch customer invoices: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle both array and object response formats
    const data = Array.isArray(result) ? result : (result.data || []);
    const total = result.total || data.length;

    // Calculate total pages
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
   * Get a specific customer invoice by ID
   * @param id Invoice ID
   * @returns Promise<CustomerInvoice>
   */
  async getCustomerInvoiceById(id: string): Promise<CustomerInvoice> {
    const response = await fetch(`${this.baseUrl}/customerinvoice/viewcustomerorder/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Failed to fetch customer invoice: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new customer invoice
   * @param invoice Customer invoice data to create
   * @returns Promise<CustomerInvoice>
   */
  async createCustomerInvoice(invoice: CustomerInvoiceCreateRequest): Promise<CustomerInvoice> {
    const response = await fetch(`${this.baseUrl}/customerinvoice/SaveCustomerOrders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Failed to create customer invoice: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Process payment for a customer invoice
   * @param orderId Order ID to process payment for
   * @param paymentData Payment information
   * @returns Promise<CustomerInvoice>
   */
  async processPayment(orderId: string, paymentData: { amount: number; method: string }): Promise<CustomerInvoice> {
    const response = await fetch(`${this.baseUrl}/customerinvoice/process-payment/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Failed to process payment: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing customer invoice
   * @param id Invoice ID to update
   * @param invoice Partial invoice data to update
   * @returns Promise<CustomerInvoice>
   */
  async updateCustomerInvoice(id: string, invoice: Partial<CustomerInvoice>): Promise<CustomerInvoice> {
    const response = await fetch(`${this.baseUrl}/customerinvoice/viewcustomerorder/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Failed to update customer invoice: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a customer invoice by ID
   * @param id Invoice ID to delete
   * @returns Promise<void>
   */
  async deleteCustomerInvoice(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/customerinvoice/viewcustomerorder/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Failed to delete customer invoice: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const customerInvoiceApi = new CustomerInvoiceApi();