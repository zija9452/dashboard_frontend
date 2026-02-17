import axios from 'axios';
import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Product entity (matching backend request format)
export interface Product {
  pro_id: string;
  pro_name: string;
  pro_price: number;
  pro_cost: number;
  pro_barcode: string;
  pro_dis: number;
  cat_id_fk: string;
  limitedquan: number;
  branch: string;
  brand: string;
  pro_image: string;
  stock: number;
}

// Backend request format
export interface ProductCreateRequest {
  sku: string;
  name: string;
  desc?: string;
  unit_price: number;
  cost_price: number;
  tax_rate?: number;
  vendor_id?: string | null;
  stock_level: number;
  attributes?: string;
  barcode?: string;
  discount?: number;
  category?: string;
  branch?: string;
  limited_qty: number;
  brand_action?: string;
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
  private apiClient: any;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    
    // Create axios instance with default config - call backend directly
    this.apiClient = axios.create({
      baseURL: baseUrl, // Backend server
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Include session cookies
    });
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
    // Fetch one extra to check if more items exist
    params.append('limit', (limit + 1).toString());

    if (search) {
      params.append('search_string', search);
    }

    // Call backend directly
    const response = await this.apiClient.get(`/products/view-product?${params.toString()}`);

    // Check if we got an extra item
    let data = response.data;
    let hasMore = data.length > limit;
    
    // Remove the extra item if present
    if (hasMore) {
      data = data.slice(0, limit);
    }
    
    // Calculate total: if we're on page 1 and got full page, assume there are more
    // This is a simplification - ideally backend should return total count
    const total = hasMore ? skip + limit + 1 : skip + data.length;
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
   * Create a new product
   * @param product Product data to create
   * @returns Promise<Product>
   */
  async createProduct(product: ProductCreateRequest): Promise<Product> {
    // Call backend directly, not through frontend API route
    const response = await this.apiClient.post('/products/', product);
    return response.data;
  }

  /**
   * Update an existing product
   * @param id Product ID to update
   * @param product Partial product data to update
   * @returns Promise<Product>
   */
  async updateProduct(id: string, product: Partial<ProductCreateRequest>): Promise<Product> {
    const response = await this.apiClient.put(`/products/${id}`, product);
    return response.data;
  }

  /**
   * Delete a product by ID
   * @param id Product ID to delete
   * @returns Promise<void>
   */
  async deleteProduct(id: string): Promise<void> {
    await this.apiClient.post(`/products/delete-product/${id}`);
  }
}

// Export singleton instance
export const productsApi = new ProductsApi();