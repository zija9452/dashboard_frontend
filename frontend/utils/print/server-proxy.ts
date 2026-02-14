/**
 * Server Proxy for ZPL printing
 * Handles printing via server-side API when WebUSB is not available
 */

export interface PrintJob {
  id: string;
  zplData: string;
  printerName?: string;
  createdAt: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  errorMessage?: string;
}

export class ServerProxy {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_PRINT_SERVER_URL || 'http://localhost:3001/print') {
    this.baseUrl = baseUrl;
  }

  /**
   * Send ZPL data to server for printing
   */
  async printZPL(zplData: string, printerName?: string): Promise<PrintJob> {
    try {
      const response = await fetch(`${this.baseUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zplData,
          printerName: printerName || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send print job: ${response.status} - ${errorText}`);
      }

      const job: PrintJob = await response.json();
      return job;
    } catch (error) {
      console.error('Error sending print job to server:', error);
      throw new Error(`Server print failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get status of a print job
   */
  async getJobStatus(jobId: string): Promise<PrintJob> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.status}`);
      }

      const job: PrintJob = await response.json();
      return job;
    } catch (error) {
      console.error('Error getting job status:', error);
      throw new Error(`Failed to get job status: ${(error as Error).message}`);
    }
  }

  /**
   * Get list of recent print jobs
   */
  async getRecentJobs(limit: number = 10): Promise<PrintJob[]> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get recent jobs: ${response.status}`);
      }

      const jobs: PrintJob[] = await response.json();
      return jobs;
    } catch (error) {
      console.error('Error getting recent jobs:', error);
      throw new Error(`Failed to get recent jobs: ${(error as Error).message}`);
    }
  }

  /**
   * Test connection to print server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing print server connection:', error);
      return false;
    }
  }

  /**
   * Validate ZPL data format
   */
  validateZPL(zplData: string): boolean {
    // Basic validation: check if ZPL has start (^XA) and end (^XZ) commands
    return zplData.includes('^XA') && zplData.includes('^XZ');
  }

  /**
   * Format ZPL data with standard headers if missing
   */
  formatZPL(zplData: string): string {
    let formattedZPL = zplData.trim();

    // Add standard start and end if missing
    if (!formattedZPL.startsWith('^XA')) {
      formattedZPL = '^XA' + formattedZPL;
    }

    if (!formattedZPL.endsWith('^XZ')) {
      formattedZPL += '^XZ';
    }

    return formattedZPL;
  }
}

// Export singleton instance
export const serverProxy = new ServerProxy();