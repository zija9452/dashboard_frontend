/**
 * Main Print Utility
 * Orchestrates printing using WebUSB first, falling back to server proxy
 */

import { zplRenderer } from './zpl-renderer';
import { webUSBHandler } from './webusb-handler';
import { serverProxy } from './server-proxy';

export interface PrintResult {
  success: boolean;
  method: 'webusb' | 'server' | 'preview';
  message: string;
  jobId?: string;
  error?: string;
}

export interface PrintOptions {
  useWebUSB?: boolean;
  useServerFallback?: boolean;
  printerName?: string;
  validate?: boolean;
}

export class PrintManager {
  /**
   * Print ZPL using WebUSB if available, otherwise fall back to server
   */
  async printZPL(zplData: string, options: PrintOptions = {}): Promise<PrintResult> {
    const { useWebUSB = true, useServerFallback = true, printerName, validate = true } = options;

    // Validate ZPL if requested
    if (validate) {
      const validationResult = zplRenderer.validateZPL(zplData);
      if (!validationResult.isValid) {
        return {
          success: false,
          method: 'validation',
          message: 'ZPL validation failed',
          error: validationResult.errors.join('; ')
        };
      }
    }

    // Try WebUSB first if enabled
    if (useWebUSB && webUSBHandler.isSupported()) {
      try {
        console.log('Attempting to print via WebUSB...');

        // Request permission to access USB device
        const devices = await webUSBHandler.requestPermission();
        if (devices.length === 0) {
          throw new Error('No USB devices selected');
        }

        // Print using the first available device
        await webUSBHandler.printWithConnection(zplData, devices[0].deviceId);

        return {
          success: true,
          method: 'webusb',
          message: 'Successfully printed via WebUSB'
        };
      } catch (webusbError) {
        console.warn('WebUSB printing failed:', webusbError);

        // If WebUSB failed but server fallback is enabled, try server
        if (useServerFallback) {
          console.log('Falling back to server printing...');
        } else {
          return {
            success: false,
            method: 'webusb',
            message: 'WebUSB printing failed',
            error: (webusbError as Error).message
          };
        }
      }
    }

    // If WebUSB is not supported or failed with fallback enabled, try server
    if (useServerFallback) {
      try {
        const job = await serverProxy.printZPL(zplData, printerName);

        return {
          success: true,
          method: 'server',
          message: 'Successfully sent to print server',
          jobId: job.id
        };
      } catch (serverError) {
        return {
          success: false,
          method: 'server',
          message: 'Server printing failed',
          error: (serverError as Error).message
        };
      }
    }

    // If neither method worked and no fallback was available
    return {
      success: false,
      method: 'none',
      message: 'No printing method available'
    };
  }

  /**
   * Generate preview of ZPL
   */
  async generatePreview(zplData: string): Promise<string> {
    return await zplRenderer.generatePreview(zplData);
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(): Promise<{
    webusb: { supported: boolean; available: boolean; message: string };
    server: { connected: boolean; message: string };
  }> {
    const webusbStatus = webUSBHandler.getStatus();

    let serverConnected = false;
    let serverMessage = 'Not tested';

    try {
      serverConnected = await serverProxy.testConnection();
      serverMessage = serverConnected ? 'Connected' : 'Disconnected';
    } catch (error) {
      serverMessage = `Error: ${(error as Error).message}`;
    }

    return {
      webusb: webusbStatus,
      server: {
        connected: serverConnected,
        message: serverMessage
      }
    };
  }

  /**
   * Format ZPL data with standard headers
   */
  formatZPL(zplData: string): string {
    return serverProxy.formatZPL(zplData);
  }

  /**
   * Validate ZPL syntax
   */
  validateZPL(zplData: string): { isValid: boolean; errors: string[] } {
    return zplRenderer.validateZPL(zplData);
  }
}

// Export singleton instance
export const printManager = new PrintManager();

// Export individual utilities for direct use if needed
export { zplRenderer, webUSBHandler, serverProxy };