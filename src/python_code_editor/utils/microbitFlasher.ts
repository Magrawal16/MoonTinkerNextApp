/**
 * MicrobitFlasher - WebUSB-based flasher for micro:bit using official @microbit/microbit-connection library
 * 
 * This service provides multiple methods to flash code to a physical micro:bit:
 * 1. WebUSB with DAPLink (direct flashing, like MakeCode and the official Python Editor)
 * 2. File download (drag and drop to MICROBIT drive)
 * 3. File System Access API (direct write to MICROBIT drive)
 * 
 * Uses the official Micro:bit Educational Foundation connection library for reliable flashing.
 */

import { 
  createWebUSBConnection, 
  createUniversalHexFlashDataSource,
  ConnectionStatus,
  type MicrobitWebUSBConnection 
} from '@microbit/microbit-connection';
import { microbitHexService } from './microbitHexService';

// USB vendor/product IDs for micro:bit (for fallback detection)
const MICROBIT_VENDOR_ID = 0x0d28;
const MICROBIT_PRODUCT_ID = 0x0204;

// Extend Navigator interface for WebUSB support
declare global {
  interface Navigator {
    usb?: USB;
  }
  
  interface USB {
    requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number }> }): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
  }
  
  interface USBDevice {
    vendorId: number;
    productId: number;
    productName?: string;
    serialNumber?: string;
    opened: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
  }
}

export interface FlashProgress {
  stage: 'connecting' | 'preparing' | 'erasing' | 'flashing' | 'verifying' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export type FlashProgressCallback = (progress: FlashProgress) => void;

export type ConnectionStatusType = 'connected' | 'disconnected' | 'not-supported';
export type ConnectionStatusCallback = (status: ConnectionStatusType, deviceInfo?: DeviceInfo) => void;

export interface DeviceInfo {
  serialNumber?: string;
  boardVersion?: string;  // "V1" or "V2"
  shortId: string;        // Last 4-5 chars of serial for easy identification
}

export class MicrobitFlasher {
  private connection: MicrobitWebUSBConnection | null = null;
  private statusCallback: ConnectionStatusCallback | null = null;
  private currentStatus: ConnectionStatusType = 'disconnected';
  private currentDeviceInfo: DeviceInfo | undefined = undefined;
  
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
   * Set a callback to be notified when connection status changes
   */
  onStatusChange(callback: ConnectionStatusCallback): void {
    this.statusCallback = callback;
    // Immediately notify of current status
    callback(this.currentStatus, this.currentDeviceInfo);
  }
  
  /**
   * Get the current connection status
   */
  getConnectionStatus(): ConnectionStatusType {
    if (!MicrobitFlasher.isWebUSBSupported()) {
      return 'not-supported';
    }
    return this.currentStatus;
  }
  
  /**
   * Get the current device info (if connected)
   */
  getDeviceInfo(): DeviceInfo | undefined {
    return this.currentDeviceInfo;
  }
  
  /**
   * Update device info from the current connection
   */
  private updateDeviceInfo(): void {
    if (!this.connection || this.connection.status !== ConnectionStatus.CONNECTED) {
      this.currentDeviceInfo = undefined;
      return;
    }
    
    try {
      const device = this.connection.getDevice?.();
      const boardVersion = this.connection.getBoardVersion?.();
      const serialNumber = device?.serialNumber;
      
      // Create a short ID from the serial number (last 4-5 chars)
      const shortId = serialNumber 
        ? serialNumber.slice(-5).toUpperCase()
        : boardVersion || 'Unknown';
      
      this.currentDeviceInfo = {
        serialNumber,
        boardVersion,
        shortId,
      };
      
      console.log('Device info updated:', this.currentDeviceInfo);
    } catch (e) {
      console.warn('Could not get device info:', e);
      this.currentDeviceInfo = undefined;
    }
  }
  
  /**
   * Update and notify connection status
   */
  private updateStatus(status: ConnectionStatusType): void {
    const statusChanged = this.currentStatus !== status;
    this.currentStatus = status;
    
    // Update device info when status changes
    if (status === 'connected') {
      this.updateDeviceInfo();
    } else {
      this.currentDeviceInfo = undefined;
    }
    
    if (statusChanged || status === 'connected') {
      this.statusCallback?.(status, this.currentDeviceInfo);
    }
  }
  
  /**
   * Initialize the connection (should be called on app startup)
   */
  async initialize(): Promise<void> {
    if (!MicrobitFlasher.isWebUSBSupported()) {
      console.log('WebUSB not supported');
      this.updateStatus('not-supported');
      return;
    }
    
    if (!this.connection) {
      this.connection = createWebUSBConnection();
      await this.connection.initialize();
      
      // Listen for status changes from the connection
      this.connection.addEventListener('status', () => {
        const isConnected = this.connection?.status === ConnectionStatus.CONNECTED;
        this.updateStatus(isConnected ? 'connected' : 'disconnected');
      });
      
      // Check if there's already a paired device
      const devices = await MicrobitFlasher.getConnectedDevices();
      if (devices.length > 0) {
        console.log('Found previously paired micro:bit device(s)');
      }
    }
  }
  
  /**
   * Flash Python code to the micro:bit using WebUSB
   * Uses the official @microbit/microbit-connection library with partial flashing support
   */
  async flash(pythonCode: string, onProgress?: FlashProgressCallback): Promise<boolean> {
    try {
      // Initialize connection if needed
      if (!this.connection) {
        await this.initialize();
      }
      
      if (!this.connection) {
        throw new Error('WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.');
      }
      
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Generating hex file...'
      });
      
      // Generate Universal Hex file (works on both V1 and V2)
      let hexContent: string;
      try {
        hexContent = await microbitHexService.generateUniversalHex(pythonCode);
      } catch (hexError) {
        console.error('Failed to generate hex:', hexError);
        throw new Error('Failed to generate hex file. Please check your internet connection and try again, or download the HEX file manually.');
      }
      
      // Validate the hex content
      if (!hexContent || !hexContent.startsWith(':') || hexContent.length < 100) {
        throw new Error('Generated hex file appears to be invalid. Please try downloading the HEX file manually.');
      }
      
      console.log(`Generated Universal Hex: ${hexContent.length} bytes`);
      
      onProgress?.({
        stage: 'connecting',
        progress: 10,
        message: 'Connecting to micro:bit...'
      });
      
      // Connect if not already connected
      if (this.connection.status !== ConnectionStatus.CONNECTED) {
        const status = await this.connection.connect();
        
        if (status !== ConnectionStatus.CONNECTED) {
          this.updateStatus('disconnected');
          throw new Error('Failed to connect to micro:bit. Please make sure it is connected via USB.');
        }
        this.updateStatus('connected');
      }
      
      const boardVersion = this.connection.getBoardVersion();
      console.log(`Connected to micro:bit ${boardVersion || 'unknown version'}`);
      
      onProgress?.({
        stage: 'flashing',
        progress: 0,
        message: 'Starting flash operation...'
      });
      
      // Create flash data source from Universal Hex
      const flashDataSource = createUniversalHexFlashDataSource(hexContent);
      
      // Flash using the official library with partial flashing support
      await this.connection.flash(flashDataSource, {
        partial: true, // Enable partial flashing for faster subsequent flashes
        progress: (percentage: number | undefined) => {
          if (percentage !== undefined) {
            const progressPercent = Math.round(percentage * 100);
            onProgress?.({
              stage: 'flashing',
              progress: progressPercent,
              message: `Flashing... ${progressPercent}%`
            });
          }
        }
      });
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Flash complete! Your code is now running on the micro:bit.'
      });
      
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
        
        // Check for specific error types
        if (error.name === 'NotAllowedError' || error.message.includes('cancelled') || error.message.includes('no-device-selected')) {
          isCancelled = true;
          errorMessage = 'Device selection was cancelled.';
        } else if (error.message.includes('No micro:bit found') || error.name === 'NotFoundError') {
          errorMessage = 'No micro:bit found. Please connect your micro:bit via USB and try again.';
        } else if (error.message.includes('update-req') || error.message.includes('firmware')) {
          errorMessage = 'The micro:bit firmware needs to be updated. Please visit https://microbit.org/firmware/ to update your micro:bit.';
        } else if (error.message.includes('device-disconnected')) {
          errorMessage = 'The micro:bit was disconnected during flashing. Please reconnect and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Flash operation timed out. Please try again or download the HEX file instead.';
        } else if (error.message.includes('internet') || error.message.includes('fetch')) {
          errorMessage = 'Could not fetch MicroPython runtime. Please check your internet connection.';
        } else if (error.message.includes('Permission denied') || error.name === 'SecurityError') {
          errorMessage = 'Permission denied. Please grant permission to access the micro:bit.';
        } else if (error.name === 'NetworkError' || error.message.includes('clear-connect')) {
          errorMessage = 'USB communication error. Please unplug and replug your micro:bit, then try again. If this persists, use "Download HEX" instead.';
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
      if (onProgress) {
        return false;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Connect to a micro:bit (always shows device picker for selection)
   * Returns true if connected successfully, false otherwise
   */
  async connect(): Promise<boolean> {
    try {
      if (!MicrobitFlasher.isWebUSBSupported()) {
        console.warn('WebUSB is not supported');
        return false;
      }
      
      // Always create a fresh connection to force device picker to show
      // This ensures user can choose which micro:bit to connect to
      if (this.connection) {
        try {
          await this.connection.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      
      // Create a new connection - this will force the device picker to appear
      this.connection = createWebUSBConnection();
      await this.connection.initialize();
      
      // Listen for status changes from the connection
      this.connection.addEventListener('status', () => {
        const isConnected = this.connection?.status === ConnectionStatus.CONNECTED;
        this.updateStatus(isConnected ? 'connected' : 'disconnected');
      });
      
      // Trigger connection (will show device picker)
      const status = await this.connection.connect();
      const isConnected = status === ConnectionStatus.CONNECTED;
      this.updateStatus(isConnected ? 'connected' : 'disconnected');
      return isConnected;
    } catch (error) {
      console.warn('Failed to connect to micro:bit:', error);
      this.updateStatus('disconnected');
      return false;
    }
  }
  
  /**
   * Disconnect from the micro:bit and clear the connection
   * This ensures the next connect() will show the device picker
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.disconnect();
        // Clear the connection so next connect() creates a fresh one
        this.connection = null;
        this.updateStatus('disconnected');
      }
    } catch (e) {
      console.warn('Error during disconnect:', e);
      // Still clear the connection even if disconnect failed
      this.connection = null;
      this.updateStatus('disconnected');
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
