/**
 * MicrobitFlasher - WebUSB-based flasher for micro:bit using DAPLink protocol
 * 
 * This service provides multiple methods to flash code to a physical micro:bit:
 * 1. WebUSB with DAPLink (direct flashing, like MakeCode)
 * 2. File download (drag and drop to MICROBIT drive)
 * 3. File System Access API (direct write to MICROBIT drive)
 */

import { DAPLink, WebUSB } from 'dapjs';
import { microbitHexService } from './microbitHexService';

// USB vendor/product IDs for micro:bit
const MICROBIT_VENDOR_ID = 0x0d28;
const MICROBIT_PRODUCT_ID = 0x0204;

// Flash page sizes for DAPLink
const DAPLINK_PAGE_SIZE = 62;

// Flash parameters
const MICROBIT_V1_FLASH_SIZE = 256 * 1024; // 256KB
const MICROBIT_V2_FLASH_SIZE = 512 * 1024; // 512KB
const MICROBIT_V1_PAGE_SIZE = 1024; // 1KB pages
const MICROBIT_V2_PAGE_SIZE = 4096; // 4KB pages

export interface FlashProgress {
  stage: 'connecting' | 'preparing' | 'erasing' | 'flashing' | 'verifying' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export type FlashProgressCallback = (progress: FlashProgress) => void;

/**
 * Parse Intel HEX format to binary data
 */
function parseIntelHex(hexContent: string): Uint8Array {
  const lines = hexContent.split(/\r?\n/).filter(line => line.startsWith(':'));
  
  let extendedAddress = 0;
  const dataBlocks: Array<{ address: number; data: number[] }> = [];
  let maxAddress = 0;
  
  for (const line of lines) {
    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);
    
    switch (recordType) {
      case 0x00: // Data record
        const fullAddress = extendedAddress + address;
        const data: number[] = [];
        for (let i = 0; i < byteCount; i++) {
          data.push(parseInt(line.substring(9 + i * 2, 11 + i * 2), 16));
        }
        dataBlocks.push({ address: fullAddress, data });
        maxAddress = Math.max(maxAddress, fullAddress + byteCount);
        break;
        
      case 0x02: // Extended segment address
        extendedAddress = parseInt(line.substring(9, 13), 16) << 4;
        break;
        
      case 0x04: // Extended linear address
        extendedAddress = parseInt(line.substring(9, 13), 16) << 16;
        break;
        
      case 0x01: // End of file
        break;
    }
  }
  
  // Create binary buffer - use regular ArrayBuffer for compatibility
  const arrayBuffer = new ArrayBuffer(maxAddress);
  const buffer = new Uint8Array(arrayBuffer);
  buffer.fill(0xFF); // Fill with 0xFF (erased flash state)
  
  for (const block of dataBlocks) {
    for (let i = 0; i < block.data.length; i++) {
      if (block.address + i < buffer.length) {
        buffer[block.address + i] = block.data[i];
      }
    }
  }
  
  return buffer;
}

/**
 * Detect micro:bit version from device info
 */
async function detectMicrobitVersion(device: USBDevice): Promise<'v1' | 'v2'> {
  // micro:bit V2 has different interface descriptors
  // V1: Nordic nRF51822
  // V2: Nordic nRF52833
  const productName = device.productName?.toLowerCase() || '';
  
  if (productName.includes('v2') || productName.includes('nrf52')) {
    return 'v2';
  }
  
  // Default to V1 for compatibility
  return 'v1';
}

export class MicrobitFlasher {
  private transport: WebUSB | null = null;
  private daplink: DAPLink | null = null;
  private connectedDevice: USBDevice | null = null;
  
  /**
   * Check if WebUSB is supported in this browser
   */
  static isWebUSBSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.usb;
  }
  
  /**
   * Check if File System Access API is supported (for direct file writing)
   */
  static isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }
  
  /**
   * Request permission and connect to a micro:bit device
   */
  async connect(onProgress?: FlashProgressCallback): Promise<boolean> {
    if (!MicrobitFlasher.isWebUSBSupported()) {
      throw new Error('WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
    
    onProgress?.({
      stage: 'connecting',
      progress: 0,
      message: 'Requesting device access...'
    });
    
    try {
      // Request a micro:bit device
      const device = await navigator.usb!.requestDevice({
        filters: [{ vendorId: MICROBIT_VENDOR_ID, productId: MICROBIT_PRODUCT_ID }]
      });
      
      if (!device) {
        throw new Error('No micro:bit device selected.');
      }
      
      this.connectedDevice = device;
      
      onProgress?.({
        stage: 'connecting',
        progress: 20,
        message: 'Opening USB device...'
      });
      
      // Try to open the device first to check if it's accessible
      try {
        if (!device.opened) {
          await device.open();
        }
      } catch (openError) {
        console.error('Failed to open USB device:', openError);
        throw new Error(
          'Cannot access micro:bit USB interface. Please:\n' +
          '1. Close any other programs using the micro:bit (MakeCode, other browser tabs)\n' +
          '2. Unplug and replug the micro:bit\n' +
          '3. Try again\n\n' +
          'Or use "Download HEX" to flash manually.'
        );
      }
      
      onProgress?.({
        stage: 'connecting',
        progress: 40,
        message: 'Connecting to CMSIS-DAP interface...'
      });
      
      // Create WebUSB transport
      this.transport = new WebUSB(device);
      
      // Create DAPLink instance for flashing
      this.daplink = new DAPLink(this.transport);
      
      // Connect with retry logic
      let connectAttempts = 0;
      const maxAttempts = 2;
      
      while (connectAttempts < maxAttempts) {
        try {
          await this.daplink.connect();
          break; // Success!
        } catch (connectError) {
          connectAttempts++;
          console.warn(`DAPLink connect attempt ${connectAttempts} failed:`, connectError);
          
          if (connectAttempts >= maxAttempts) {
            // Close the device before throwing
            try {
              await device.close();
            } catch (e) {
              // Ignore close errors
            }
            throw connectError;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      onProgress?.({
        stage: 'connecting',
        progress: 100,
        message: 'Connected!'
      });
      
      return true;
    } catch (error) {
      // Clean up on error
      this.transport = null;
      this.daplink = null;
      this.connectedDevice = null;
      
      this.handleConnectionError(error);
      throw error;
    }
  }
  
  /**
   * Disconnect from the micro:bit
   */
  async disconnect(): Promise<void> {
    try {
      if (this.daplink) {
        await this.daplink.disconnect();
        this.daplink = null;
      }
      this.transport = null;
      this.connectedDevice = null;
    } catch (e) {
      console.warn('Error during disconnect:', e);
    }
  }
  
  /**
   * Flash Python code to the micro:bit using WebUSB and DAPLink
   * 
   * Note: DAPLink flash() expects the hex content as a BufferSource.
   * For WebUSB flashing, we use version-specific hex files (not Universal Hex)
   * as the DAPLink protocol works better with single-version firmware.
   */
  async flash(pythonCode: string, onProgress?: FlashProgressCallback): Promise<boolean> {
    let shouldDisconnect = false;
    
    try {
      // Connect if not already connected
      if (!this.daplink) {
        await this.connect(onProgress);
        shouldDisconnect = true;
      }
      
      if (!this.daplink || !this.connectedDevice) {
        throw new Error('Failed to establish connection to micro:bit.');
      }
      
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Detecting micro:bit version...'
      });
      
      // Detect micro:bit version for version-specific hex
      const microbitVersion = await detectMicrobitVersion(this.connectedDevice);
      console.log(`Detected micro:bit version: ${microbitVersion}`);
      
      onProgress?.({
        stage: 'preparing',
        progress: 20,
        message: `Fetching MicroPython ${microbitVersion.toUpperCase()} runtime...`
      });
      
      // Generate version-specific hex file (more reliable for WebUSB flashing)
      let hexContent: string;
      try {
        hexContent = await microbitHexService.generateHexForVersion(pythonCode, microbitVersion);
      } catch (hexError) {
        console.error('Failed to generate hex:', hexError);
        throw new Error('Failed to generate hex file. Please check your internet connection and try again, or download the HEX file manually.');
      }
      
      // Validate the hex content
      if (!hexContent || !hexContent.startsWith(':') || hexContent.length < 100) {
        throw new Error('Generated hex file appears to be invalid. Please try downloading the HEX file manually.');
      }
      
      console.log(`Generated ${microbitVersion} hex file: ${hexContent.length} bytes`);
      
      onProgress?.({
        stage: 'preparing',
        progress: 50,
        message: 'Preparing firmware...'
      });
      
      // DAPLink's flash() method expects the hex file content as bytes
      // Convert the hex string to a Uint8Array
      const encoder = new TextEncoder();
      const hexBytes = encoder.encode(hexContent);
      
      // Create a proper ArrayBuffer (not SharedArrayBuffer)
      const buffer = new ArrayBuffer(hexBytes.byteLength);
      new Uint8Array(buffer).set(hexBytes);
      
      console.log(`Flashing hex file: ${hexBytes.byteLength} bytes`);
      
      onProgress?.({
        stage: 'flashing',
        progress: 0,
        message: 'Starting flash operation...'
      });
      
      // Set up progress tracking
      this.daplink.on(DAPLink.EVENT_PROGRESS, (progress: number) => {
        onProgress?.({
          stage: 'flashing',
          progress: Math.round(progress * 100),
          message: `Flashing... ${Math.round(progress * 100)}%`
        });
      });
      
      // Flash using the hex content bytes with a page size
      await this.daplink.flash(buffer, DAPLINK_PAGE_SIZE);
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Flash complete! Resetting micro:bit...'
      });
      
      // Reset the device to run the new code
      await this.daplink.reset();
      
      return true;
    } catch (error) {
      // Provide more helpful error messages
      let errorMessage = 'Flash failed';
      let isCancelled = false;
      
      if (error instanceof Error) {
        console.error('Flash error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // Check if user cancelled the device selection
        if (error.name === 'NotAllowedError' || error.message.includes('cancelled')) {
          isCancelled = true;
          errorMessage = 'Device selection was cancelled.';
        } else if (error.message.includes('No micro:bit found') || error.name === 'NotFoundError') {
          errorMessage = 'No micro:bit found. Please connect your micro:bit via USB and try again.';
        } else if (error.message.includes('Flash error')) {
          errorMessage = 'The micro:bit rejected the firmware. This can happen if the DAPLink firmware is outdated. Please download the HEX file instead and drag it to the MICROBIT drive.';
        } else if (error.message.includes('Bad response') || error.message.includes('Bad status')) {
          errorMessage = 'USB communication error. The micro:bit may need to be reconnected or its DAPLink firmware updated. Try downloading the HEX file instead.';
        } else if (error.message.includes('LIBUSB') || error.message.includes('transfer')) {
          errorMessage = 'USB communication error. Please disconnect and reconnect your micro:bit, then try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Flash operation timed out. Please try again or download the HEX file instead.';
        } else if (error.message.includes('internet') || error.message.includes('fetch')) {
          errorMessage = 'Could not fetch MicroPython runtime. Please check your internet connection.';
        } else if (error.message.includes('Permission denied') || error.name === 'SecurityError') {
          errorMessage = 'Permission denied. Please grant permission to access the micro:bit.';
        } else if (error.name === 'NetworkError') {
          errorMessage = 'USB communication error. Please unplug and replug your micro:bit, then try again. If this persists, use "Download HEX" instead.';
        } else if (error.message.includes('No device opened') || error.message.includes('interface')) {
          errorMessage = 'Could not access the micro:bit USB interface. Please close any other programs using the micro:bit (like MakeCode) and try again.';
        } else {
          errorMessage = `Flash error: ${error.message}. Try downloading the HEX file instead.`;
        }
      }
      
      // If user cancelled, just close the modal silently
      if (isCancelled) {
        onProgress?.({
          stage: 'error',
          progress: 0,
          message: errorMessage
        });
        return false;
      }
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: errorMessage
      });
      
      // Return false instead of throwing when we have a progress callback
      // This prevents the error from bubbling up to Next.js error overlay
      if (onProgress) {
        return false;
      }
      
      throw new Error(errorMessage);
    } finally {
      if (shouldDisconnect) {
        await this.disconnect();
      }
    }
  }
  
  /**
   * Flash using hex content directly (for pre-generated hex files)
   */
  async flashHex(hexContent: string, onProgress?: FlashProgressCallback): Promise<boolean> {
    let shouldDisconnect = false;
    
    try {
      if (!this.daplink) {
        await this.connect(onProgress);
        shouldDisconnect = true;
      }
      
      if (!this.daplink) {
        throw new Error('Failed to establish connection to micro:bit.');
      }
      
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing hex file...'
      });
      
      // Convert hex string to bytes for DAPLink
      const encoder = new TextEncoder();
      const hexBytes = encoder.encode(hexContent);
      const buffer = new ArrayBuffer(hexBytes.byteLength);
      new Uint8Array(buffer).set(hexBytes);
      
      onProgress?.({
        stage: 'flashing',
        progress: 0,
        message: 'Starting flash operation...'
      });
      
      this.daplink.on(DAPLink.EVENT_PROGRESS, (progress: number) => {
        onProgress?.({
          stage: 'flashing',
          progress: Math.round(progress * 100),
          message: `Flashing... ${Math.round(progress * 100)}%`
        });
      });
      
      await this.daplink.flash(buffer, DAPLINK_PAGE_SIZE);
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Flash complete!'
      });
      
      await this.daplink.reset();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Flash failed';
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: errorMessage
      });
      
      // Return false instead of throwing when we have a progress callback
      if (onProgress) {
        return false;
      }
      throw error;
    } finally {
      if (shouldDisconnect) {
        await this.disconnect();
      }
    }
  }
  
  /**
   * Download hex file for manual flashing via drag and drop
   */
  async downloadHex(pythonCode: string, filename: string = 'microbit-program.hex'): Promise<void> {
    await microbitHexService.downloadHex(pythonCode, filename);
  }
  
  /**
   * Write hex file directly to MICROBIT drive using File System Access API
   * This is an alternative when WebUSB doesn't work
   */
  async writeToMicrobitDrive(pythonCode: string, onProgress?: FlashProgressCallback): Promise<boolean> {
    if (!MicrobitFlasher.isFileSystemAccessSupported()) {
      throw new Error('File System Access API is not supported in this browser.');
    }
    
    try {
      onProgress?.({
        stage: 'connecting',
        progress: 0,
        message: 'Please select the MICROBIT drive...'
      });
      
      // Ask user to select the MICROBIT directory
      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      });
      
      onProgress?.({
        stage: 'preparing',
        progress: 30,
        message: 'Generating hex file...'
      });
      
      // Generate hex file
      const hexContent = await microbitHexService.generateHex(pythonCode);
      
      onProgress?.({
        stage: 'flashing',
        progress: 60,
        message: 'Writing to micro:bit drive...'
      });
      
      // Create the file
      const fileHandle = await directoryHandle.getFileHandle('program.hex', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(hexContent);
      await writable.close();
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'File written! The micro:bit should flash automatically.'
      });
      
      return true;
    } catch (error) {
      let errorMessage = 'Failed to write to micro:bit drive.';
      
      if ((error as Error).name === 'AbortError') {
        errorMessage = 'User cancelled folder selection.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: errorMessage
      });
      
      // Return false instead of throwing when we have a progress callback
      if (onProgress) {
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Handle connection errors with user-friendly messages
   */
  private handleConnectionError(error: unknown): never {
    if (error instanceof Error) {
      // Log detailed error for debugging
      console.error('Connection error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // If the error message is already user-friendly, throw it as-is
      if (error.message.includes('Cannot access') || error.message.includes('Download HEX')) {
        throw error;
      }
      
      switch (error.name) {
        case 'NotFoundError':
          throw new Error('No micro:bit found. Please connect your micro:bit and try again.');
        case 'SecurityError':
          throw new Error('Permission denied. Please grant permission to access the micro:bit.');
        case 'NetworkError':
          throw new Error(
            'USB communication error. This can happen when:\n' +
            '• Another program is using the micro:bit (close MakeCode, other tabs)\n' +
            '• The micro:bit needs to be reconnected (unplug and replug)\n' +
            '• Windows drivers need time to initialize\n\n' +
            'Try "Download HEX" instead - it works reliably on all systems.'
          );
        case 'NotAllowedError':
          throw new Error('User cancelled device selection.');
        case 'InvalidStateError':
          throw new Error('micro:bit is in an invalid state. Please disconnect and reconnect it.');
        default:
          throw error;
      }
    }
    throw new Error('Unknown error occurred while connecting to micro:bit.');
  }
  
  /**
   * Get list of connected micro:bit devices (already paired)
   */
  static async getConnectedDevices(): Promise<USBDevice[]> {
    if (!this.isWebUSBSupported()) return [];
    
    try {
      const devices = await navigator.usb!.getDevices();
      return devices.filter(d => 
        d.vendorId === MICROBIT_VENDOR_ID && 
        d.productId === MICROBIT_PRODUCT_ID
      );
    } catch {
      return [];
    }
  }
}

// Singleton instance for convenience
export const microbitFlasher = new MicrobitFlasher();

export default MicrobitFlasher;
