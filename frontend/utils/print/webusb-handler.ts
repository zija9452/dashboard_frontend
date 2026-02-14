/**
 * WebUSB Handler for ZPL printing
 * Handles direct printing to Zebra printers via WebUSB
 */

export interface PrinterDevice {
  device: USBDevice;
  name: string;
  productId: number;
  vendorId: number;
}

export class WebUSBHandler {
  private connectedDevices: Map<string, USBDevice> = new Map();

  /**
   * Check if WebUSB is supported in the browser
   */
  isSupported(): boolean {
    return !!(navigator.usb);
  }

  /**
   * Request permission to access USB devices
   */
  async requestPermission(filters: USBDeviceFilter[] = []): Promise<USBDevice[]> {
    if (!this.isSupported()) {
      throw new Error('WebUSB is not supported in this browser');
    }

    try {
      const devices = await navigator.usb.requestDevice({
        filters: filters.length > 0 ? filters : [
          { vendorId: 0x0a5f }, // Zebra Technologies
          { vendorId: 0x0b64 }, // Zebra GK/GC Series
          { vendorId: 0x2508 }, // Zebra ZT Series
        ]
      });

      return [devices]; // Return as array for consistency
    } catch (error) {
      console.error('Error requesting USB device:', error);
      throw new Error('Failed to access USB device. User may have denied permission or device is not connected.');
    }
  }

  /**
   * Get a list of connected compatible printers
   */
  async getConnectedDevices(): Promise<PrinterDevice[]> {
    if (!this.isSupported()) {
      throw new Error('WebUSB is not supported in this browser');
    }

    try {
      const devices = await navigator.usb.getDevices();
      const compatibleDevices: PrinterDevice[] = [];

      for (const device of devices) {
        if (this.isCompatiblePrinter(device)) {
          compatibleDevices.push({
            device,
            name: device.productName || `USB Device ${device.productId}`,
            productId: device.productId,
            vendorId: device.vendorId
          });
        }
      }

      return compatibleDevices;
    } catch (error) {
      console.error('Error getting connected devices:', error);
      throw new Error('Failed to enumerate connected USB devices');
    }
  }

  /**
   * Check if a device is a compatible printer
   */
  private isCompatiblePrinter(device: USBDevice): boolean {
    // Zebra printer vendor IDs
    const compatibleVendors = [0x0a5f, 0x0b64, 0x2508, 0x05fe];

    return compatibleVendors.includes(device.vendorId);
  }

  /**
   * Connect to a USB printer
   */
  async connectToDevice(device: USBDevice): Promise<void> {
    try {
      await device.open();

      // Select the first configuration (usually 1)
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim the first available interface (usually 0)
      const interfaceNumber = device.configuration?.interfaces[0]?.interfaceNumber || 0;
      await device.claimInterface(interfaceNumber);

      // Store device reference
      this.connectedDevices.set(device.deviceId, device);
    } catch (error) {
      console.error('Error connecting to device:', error);
      throw new Error(`Failed to connect to printer: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from a USB printer
   */
  async disconnectFromDevice(device: USBDevice): Promise<void> {
    try {
      const interfaceNumber = device.configuration?.interfaces[0]?.interfaceNumber || 0;

      // Release the interface
      await device.releaseInterface(interfaceNumber);

      // Close the device
      await device.close();

      // Remove from connected devices
      this.connectedDevices.delete(device.deviceId);
    } catch (error) {
      console.error('Error disconnecting from device:', error);
      throw new Error(`Failed to disconnect from printer: ${(error as Error).message}`);
    }
  }

  /**
   * Send ZPL data to printer
   */
  async printZPL(device: USBDevice, zplData: string): Promise<void> {
    if (!this.connectedDevices.has(device.deviceId)) {
      throw new Error('Device is not connected. Please connect first.');
    }

    try {
      // Find the first OUT endpoint
      const interfaceNumber = device.configuration?.interfaces[0]?.interfaceNumber || 0;
      const endpoints = device.configuration?.interfaces[0]?.alternates[0]?.endpoints || [];

      const outEndpoint = endpoints.find(ep => ep.direction === 'out');
      if (!outEndpoint) {
        throw new Error('No OUT endpoint found on the device');
      }

      // Convert ZPL string to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(zplData);

      // Send data to printer
      await device.transferOut(outEndpoint.endpointNumber, data);

      console.log('Successfully sent ZPL data to printer');
    } catch (error) {
      console.error('Error sending ZPL data:', error);
      throw new Error(`Failed to print ZPL: ${(error as Error).message}`);
    }
  }

  /**
   * Print ZPL with connection management
   */
  async printWithConnection(zplData: string, deviceId?: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('WebUSB is not supported in this browser');
    }

    let device: USBDevice | undefined;

    try {
      // Get connected devices
      const devices = await this.getConnectedDevices();

      if (devices.length === 0) {
        throw new Error('No compatible USB printers found. Please connect a Zebra printer.');
      }

      // Use specified device or pick the first one
      if (deviceId) {
        device = devices.find(d => d.device.deviceId === deviceId)?.device;
      } else {
        device = devices[0].device;
      }

      if (!device) {
        throw new Error('Specified device not found');
      }

      // Connect to device if not already connected
      if (!this.connectedDevices.has(device.deviceId)) {
        await this.connectToDevice(device);
      }

      // Print the ZPL data
      await this.printZPL(device, zplData);
    } catch (error) {
      console.error('Error in printWithConnection:', error);
      throw error;
    } finally {
      // Disconnect from device if it was opened by this method
      if (device && !this.connectedDevices.has(device.deviceId)) {
        try {
          await this.disconnectFromDevice(device);
        } catch (disconnectError) {
          console.error('Error disconnecting from device:', disconnectError);
        }
      }
    }
  }

  /**
   * Get human-readable status of WebUSB availability
   */
  getStatus(): { supported: boolean; available: boolean; message: string } {
    const supported = this.isSupported();
    let available = false;
    let message = '';

    if (supported) {
      // Browser supports WebUSB
      message = 'WebUSB is supported';
      available = true;
    } else {
      message = 'WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.';
      available = false;
    }

    return { supported, available, message };
  }
}

// Export singleton instance
export const webUSBHandler = new WebUSBHandler();