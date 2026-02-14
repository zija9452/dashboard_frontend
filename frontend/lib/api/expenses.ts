import { pageToQueryParams } from './pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define TypeScript interfaces for Expense entity
export interface Expense {
  id: string;
  expense_category: string;
  expense_date: string;
  amount: number;
  expense_details: string;
  expense_by: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API client for expenses with pagination support
export class ExpensesApi {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of expenses with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 8)
   * @param search Optional search string
   * @returns Promise<ExpenseListResponse>
   */
  async getExpenses(page: number = 1, limit: number = DEFAULT_PAGE_SIZE, search?: string): Promise<ExpenseListResponse> {
    const { skip } = pageToQueryParams(page, limit);

    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    if (search) {
      params.append('search_string', search);
    }

    const response = await fetch(`${this.baseUrl}/expenseapi/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
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
   * Get a specific expense by ID
   * @param id Expense ID
   * @returns Promise<Expense>
   */
  async getExpenseById(id: string): Promise<Expense> {
    const response = await fetch(`${this.baseUrl}/expenseapi/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch expense: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new expense
   * @param expense Expense data to create
   * @returns Promise<Expense>
   */
  async createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    const response = await fetch(`${this.baseUrl}/expenseapi/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(expense),
    });

    if (!response.ok) {
      throw new Error(`Failed to create expense: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing expense
   * @param id Expense ID to update
   * @param expense Partial expense data to update
   * @returns Promise<Expense>
   */
  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<Expense> {
    const response = await fetch(`${this.baseUrl}/expenseapi/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(expense),
    });

    if (!response.ok) {
      throw new Error(`Failed to update expense: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete an expense by ID
   * @param id Expense ID to delete
   * @returns Promise<void>
   */
  async deleteExpense(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/expenseapi/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to delete expense: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const expensesApi = new ExpensesApi();