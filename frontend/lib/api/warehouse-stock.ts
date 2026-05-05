import axios from 'axios';

export interface StockInRequest {
  product_id: string;
  product_type: string; // "warehouse" or "shop"
  qty: number;
  cost_price?: number;
  vendor_id?: string;
  ref?: string;
}

export interface StockOutRequest {
  product_id: string;
  product_type: string; // "warehouse" or "shop"
  qty: number;
  ref?: string;
}

export interface StockAdjustRequest {
  product_id: string;
  product_type: string; // "warehouse" or "shop"
  qty: number;
  ref?: string;
}

export interface StockItem {
  id: string;
  vendor_name?: string;
  name: string;
  warehouse_stock: number;
  warehouse_cost: number;
  stock_level?: number; // For backward compatibility
  category: string;
  branch: string;
  product_type: string;
  article_no: string;
  warehouse_limited_qty: number;
  barcode: string;
  sku: string;
  unit_price: number;
  cost_price: number;
  is_warehouse_product: boolean;
}

export interface StockEntry {
  id: string;
  product_id: string;
  qty: number;
  type: 'IN' | 'OUT' | 'ADJUST';
  location: string;
  ref?: string;
  created_at: string;
}

export interface StockListResponse {
  data: StockItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// API client for warehouse stock
export class WarehouseStockApi {
  private apiClient: any;

  constructor() {
    this.apiClient = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
      timeout: 30000,
    });
  }

  async stockIn(request: StockInRequest): Promise<{ success: boolean; message: string; new_stock: number }> {
    try {
      const response = await this.apiClient.post('/warehouse-stock?action=in', request);
      return response.data;
    } catch (error: any) {
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to add stock' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  async stockOut(request: StockOutRequest): Promise<{ success: boolean; message: string; new_stock: number }> {
    try {
      const response = await this.apiClient.post('/warehouse-stock?action=out', request);
      return response.data;
    } catch (error: any) {
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to remove stock' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  async adjustStock(request: StockAdjustRequest): Promise<{ success: boolean; message: string; new_stock: number }> {
    try {
      const response = await this.apiClient.post('/warehouse-stock?action=adjust', request);
      return response.data;
    } catch (error: any) {
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to adjust stock' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  async updateStockEntry(entryId: string, request: StockAdjustRequest): Promise<{ success: boolean; message: string; new_stock: number }> {
    try {
      const response = await this.apiClient.put(`/warehouse-stock/update/${entryId}`, request);
      return response.data;
    } catch (error: any) {
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to update stock entry' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  async deleteStockEntry(entryId: string): Promise<{ success: boolean; message: string; new_stock: number }> {
    try {
      const response = await this.apiClient.delete(`/warehouse-stock/delete/${entryId}`);
      return response.data;
    } catch (error: any) {
      throw {
        response: {
          data: error?.response?.data || { error: 'Failed to delete stock entry' },
          status: error?.response?.status || 500
        }
      };
    }
  }

  async getStock(page: number = 1, limit: number = 10, search?: string): Promise<StockListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) {
      params.append('search', search);
    }

    const response = await this.apiClient.get(`/warehouse-stock?${params.toString()}`, {
      timeout: 120000,
    });

    const result = response.data;

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      data: result.data || [],
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.total_pages || 0,
      hasMore: result.has_more || false
    };
  }

  async getEntries(page: number = 1, limit: number = 10, productId?: string): Promise<{
    data: StockEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (productId) {
      params.append('product_id', productId);
    }

    const response = await this.apiClient.get(`/warehouse-stock/entries?${params.toString()}`, {
      timeout: 120000,
    });

    const result = response.data;

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      data: result.data || [],
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.total_pages || 0,
      hasMore: result.has_more || false
    };
  }
}

export const warehouseStockApi = new WarehouseStockApi();
