import axios from 'axios';
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

// Cache for storing all fetched products
interface ProductsCache {
  data: Product[];
  timestamp: number;
  search: string;
}

// Cache validity: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// API client for products with frontend pagination
export class ProductsApi {
  private baseUrl: string;
  private apiClient: any;
  private cache: ProductsCache | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;

    // Create axios instance with default config - use Next.js API routes for proper cookie handling
    this.apiClient = axios.create({
      baseURL: '/api', // Use Next.js API routes
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Include session cookies
    });
  }

  /**
   * Get list of products with frontend pagination
   * Fetches 40 products from backend and paginates on frontend
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<ProductListResponse>
   */
  async getProducts(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<ProductListResponse> {
    const searchQuery = search || '';
    const now = Date.now();

    // Check if cache is valid
    if (this.cache &&
        this.cache.search === searchQuery &&
        (now - this.cache.timestamp) < CACHE_DURATION) {
      // Use cached data
      const allProducts = this.cache.data;
      const total = allProducts.length;

      // Calculate start and end indices for frontend pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = allProducts.slice(startIndex, endIndex);
      const totalPages = Math.ceil(total / limit);

      return {
        data: paginatedData,
        total,
        page,
        limit,
        totalPages
      };
    }

    // Fetch 40 products from backend
    const params = new URLSearchParams();
    params.append('limit', '40'); // Fetch 40 products
    if (searchQuery) {
      params.append('search_string', searchQuery);
    }

    // Call Next.js API route which forwards to backend with proper cookie handling
    const response = await this.apiClient.get(`/products?${params.toString()}`);

    const allProducts = response.data;
    
    console.log('Backend response:', allProducts);
    console.log('Total products fetched:', allProducts.length);

    // Update cache
    this.cache = {
      data: allProducts,
      timestamp: now,
      search: searchQuery
    };

    const total = allProducts.length;
    
    // Calculate start and end indices for frontend pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allProducts.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Clear the products cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Create a new product
   * @param product Product data to create
   * @returns Promise<Product>
   */
  async createProduct(product: ProductCreateRequest): Promise<Product> {
    // Call Next.js API route which forwards to backend with proper cookie handling
    const response = await this.apiClient.post('/products?action=create', product);
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