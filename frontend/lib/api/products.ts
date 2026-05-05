import axios from 'axios';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

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
  is_warehouse_product?: boolean;
  article_no?: string;
  warehouse_stock?: number;
  warehouse_cost?: number;
  warehouse_limited_qty?: number;
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
  is_warehouse_product?: boolean;
  article_no?: string;
  warehouse_stock?: number;
  warehouse_cost?: number;
  warehouse_limited_qty?: number;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
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
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Get list of products with backend pagination
   * Returns total count for proper frontend pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<ProductListResponse>
   */
  async getProducts(page: number = 1, limit: number = 8, search?: string): Promise<ProductListResponse> {
    const searchQuery = search || '';

    // Build query params for backend pagination
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (searchQuery) {
      params.append('search_string', searchQuery);
    }

    // Call Next.js API route which forwards to backend with proper cookie handling
    const response = await this.apiClient.get(`/products?${params.toString()}`, {
      timeout: 120000, // 2 minute timeout
    });

    const result = response.data;

    // Check for error responses from backend
    if (result.error) {
      throw new Error(result.error);
    }

    // Optimize Cloudinary image URLs for all products
    const optimizedData = (result.data || []).map((product: Product) => ({
      ...product,
      pro_image: product.pro_image ? optimizeCloudinaryUrl(product.pro_image) : product.pro_image
    }));

    return {
      data: optimizedData,
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.total_pages || 0,
      hasMore: result.has_more || false
    };
  }

  /**
   * Clear the products cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Upload product image to Cloudinary
   * @param file Image file to upload
   * @returns Promise with image URL
   */
  async uploadImage(file: File): Promise<{ url: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.apiClient.post('/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minute timeout
    });

    return {
      url: response.data.url,
      size: response.data.size
    };
  }

  /**
   * Get a single product by ID (with image data)
   * @param id Product ID
   * @returns Promise<Product>
   */
  async getProductById(id: string): Promise<Product> {
    const response = await this.apiClient.get(`/products/${id}`, {
      timeout: 60000,
    });
    const product = response.data;
    
    // Optimize Cloudinary image URL if present
    if (product?.pro_image) {
      product.pro_image = optimizeCloudinaryUrl(product.pro_image);
    }
    
    return product;
  }

  /**
   * Create a new product
   * @param product Product data to create
   * @returns Promise<Product>
   */
  async createProduct(product: ProductCreateRequest): Promise<Product> {
    try {
      // Call Next.js API route which forwards to backend with proper cookie handling
      const response = await this.apiClient.post('/products?action=create', product);
      // Clear cache after creating product
      this.clearCache();
      return response.data;
    } catch (error: any) {
      // Re-throw with proper error structure
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to create product' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  /**
   * Update an existing product
   * @param id Product ID to update
   * @param product Partial product data to update
   * @returns Promise<Product>
   */
  async updateProduct(id: string, product: Partial<ProductCreateRequest>): Promise<Product> {
    try {
      const response = await this.apiClient.put(`/products/${id}`, product, {
        timeout: 120000, // 2 minute timeout
      });
      // Clear cache after updating product
      this.clearCache();
      return response.data;
    } catch (error: any) {
      // Re-throw with proper error structure
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to update product' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  /**
   * Delete a product by ID
   * @param id Product ID to delete
   * @returns Promise<void>
   */
  async deleteProduct(id: string): Promise<void> {
    const result = await this.apiClient.post(`/products/deleteproduct/${id}`);
    // Clear cache after deleting product
    this.clearCache();
    return result;
  }

  /**
   * Delete product image from Cloudinary
   * @param imageUrl Cloudinary image URL to delete
   * @param productId Optional product ID to also clear the image field
   * @returns Promise<void>
   */
  async deleteImage(imageUrl: string, productId?: string): Promise<void> {
    if (!imageUrl) return;
    
    // Call backend to delete from Cloudinary
    // Backend will extract public_id from the URL
    const payload: { image_url: string; product_id?: string } = {
      image_url: imageUrl
    };
    
    if (productId) {
      payload.product_id = productId;
    }
    
    await this.apiClient.post('/products/delete-image', payload);
  }

  /**
   * Extract public ID from Cloudinary URL (client-side utility if needed)
   * @param url Cloudinary image URL
   * @returns Public ID or null
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{version}/{folder}/{public_id}.{ext}
      const match = url.match(/\/upload\/(?:[^/]+\/)*([^\/]+)\/([^\/]+)\.[^\.]+$/);
      if (match) {
        // Return folder/public_id format
        return `${match[1]}/${match[2]}`;
      }
      return null;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const productsApi = new ProductsApi();