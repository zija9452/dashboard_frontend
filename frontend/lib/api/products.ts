import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Product entity
export interface Product {
  id: string;
  sku: string;
  name: string;
  desc?: string;
  unit_price: number;
  cost_price: number;
  tax_rate?: number;
  vendor_id: string;
  stock_level: number;
  attributes?: string;
  barcode?: string;
  discount?: number;
  category?: string;
  branch?: string;
  limited_qty?: boolean;
  brand_action?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API client for products with pagination support
export class ProductsApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of products with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<ProductListResponse>
   */
  async getProducts(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<ProductListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/products/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
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
   * Get a specific product by ID
   * @param id Product ID
   * @returns Promise<Product>
   */
  async getProductById(id: string): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new product
   * @param product Product data to create
   * @returns Promise<Product>
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error(`Failed to create product: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing product
   * @param id Product ID to update
   * @param product Partial product data to update
   * @returns Promise<Product>
   */
  async updateProduct(id: string, product: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error(`Failed to update product: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a product by ID
   * @param id Product ID to delete
   * @returns Promise<void>
   */
  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const productsApi = new ProductsApi();