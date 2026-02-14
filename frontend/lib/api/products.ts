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

    const response = await fetch(`${this.baseUrl}/products/view-product?${params.toString()}`, {
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
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    // Map the frontend-compatible response to our Product interface
    const mappedData: Product[] = responseData.map((item: any) => ({
      id: item.pro_id,
      sku: item.pro_barcode || '', // Using barcode as SKU
      name: item.pro_name,
      desc: '', // Not provided in frontend format
      unit_price: item.pro_price,
      cost_price: item.pro_cost,
      tax_rate: 0, // Not provided in frontend format
      vendor_id: '', // Not provided in frontend format
      stock_level: 0, // Not provided in frontend format
      attributes: item.pro_image || '',
      barcode: item.pro_barcode,
      discount: item.pro_dis,
      category: item.cat_id_fk,
      branch: item.branch,
      limited_qty: item.limitedquan,
      brand_action: item.brand,
      created_at: new Date().toISOString(), // Not provided in frontend format
      updated_at: new Date().toISOString() // Not provided in frontend format
    }));

    // Calculate total pages
    const total = mappedData.length; // This is a simplification; real API might have total in response
    const totalPages = Math.ceil(total / limit);

    return {
      data: mappedData,
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
    const response = await fetch(`${this.baseUrl}/products/get-products/${id}`, {
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
      throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
    }

    const item = await response.json();

    // Map the frontend-compatible response to our Product interface
    return {
      id: item.pro_id,
      sku: item.pro_barcode || '', // Using barcode as SKU
      name: item.pro_name,
      desc: '', // Not provided in frontend format
      unit_price: item.pro_price,
      cost_price: item.pro_cost,
      tax_rate: 0, // Not provided in frontend format
      vendor_id: '', // Not provided in frontend format
      stock_level: 0, // Not provided in frontend format
      attributes: item.pro_image || '',
      barcode: item.pro_barcode,
      discount: item.pro_dis,
      category: item.cat_id_fk,
      branch: item.branch,
      limited_qty: item.limitedquan,
      brand_action: item.brand,
      created_at: new Date().toISOString(), // Not provided in frontend format
      updated_at: new Date().toISOString() // Not provided in frontend format
    };
  }

  /**
   * Create a new product
   * @param product Product data to create
   * @returns Promise<Product>
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    // Prepare the payload in the expected format for the backend
    const payload = {
      sku: product.sku,
      name: product.name,
      desc: product.desc,
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      tax_rate: product.tax_rate,
      vendor_id: product.vendor_id,
      stock_level: product.stock_level,
      attributes: product.attributes,
      barcode: product.barcode,
      discount: product.discount,
      category: product.category,
      branch: product.branch,
      limited_qty: product.limited_qty,
      brand_action: product.brand_action
    };

    const response = await fetch(`${this.baseUrl}/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
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
    // Prepare the payload in the expected format for the backend
    const payload = {
      ...(product.sku !== undefined && { sku: product.sku }),
      ...(product.name !== undefined && { name: product.name }),
      ...(product.desc !== undefined && { desc: product.desc }),
      ...(product.unit_price !== undefined && { unit_price: product.unit_price }),
      ...(product.cost_price !== undefined && { cost_price: product.cost_price }),
      ...(product.tax_rate !== undefined && { tax_rate: product.tax_rate }),
      ...(product.vendor_id !== undefined && { vendor_id: product.vendor_id }),
      ...(product.stock_level !== undefined && { stock_level: product.stock_level }),
      ...(product.attributes !== undefined && { attributes: product.attributes }),
      ...(product.barcode !== undefined && { barcode: product.barcode }),
      ...(product.discount !== undefined && { discount: product.discount }),
      ...(product.category !== undefined && { category: product.category }),
      ...(product.branch !== undefined && { branch: product.branch }),
      ...(product.limited_qty !== undefined && { limited_qty: product.limited_qty }),
      ...(product.brand_action !== undefined && { brand_action: product.brand_action })
    };

    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
        throw new Error(`Unauthorized: ${response.status} ${response.statusText}`);
      }
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
    const response = await fetch(`${this.baseUrl}/products/delete-product/${id}`, {
      method: 'POST', // Using POST as per the API doc for frontend-compatible endpoint
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
      throw new Error(`Failed to delete product: ${response.status} ${response.statusText}`);
    }
    
    // The response might be JSON, so we parse it but don't necessarily return anything
    await response.json();
  }
}

// Export singleton instance
export const productsApi = new ProductsApi();