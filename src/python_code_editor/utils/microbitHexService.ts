/**
 * MicrobitHexService - Generates proper hex files for micro:bit v1 and v2
 * 
 * This service creates Intel HEX files that can be flashed to a physical micro:bit.
 * It uses the official @microbit/microbit-fs library to properly embed Python code
 * into the MicroPython runtime.
 * 
 * The approach mirrors what the official Python Editor uses:
 * 1. Fetch the MicroPython firmware (universal hex for V1 and V2)
 * 2. Convert MakeCode Python to standard MicroPython if needed
 * 3. Add Python source code as main.py to the filesystem
 * 4. Generate a valid Universal HEX file
 */

import { MicropythonFsHex, microbitBoardId } from '@microbit/microbit-fs';
import { ensureMicroPythonFormat } from './makeCodeConverter';

// Cache for MicroPython firmware hex files
let micropythonV1Hex: string | null = null;
let micropythonV2Hex: string | null = null;

/**
 * Fetch MicroPython firmware from local public folder
 * These files are bundled with the app for reliability
 */
async function fetchLocalFirmware(version: 'v1' | 'v2'): Promise<string> {
  const response = await fetch(`/firmware/micropython-${version}.hex`);
  
  if (!response.ok) {
    throw new Error(`Failed to load ${version} firmware: ${response.status}`);
  }
  
  const hex = await response.text();
  
  if (!hex.startsWith(':') || hex.length < 10000) {
    throw new Error(`Invalid ${version} firmware file`);
  }
  
  console.log(`Loaded MicroPython ${version} firmware: ${hex.length} bytes`);
  return hex;
}

/**
 * Fetch MicroPython V1 firmware
 */
async function fetchMicropythonV1(): Promise<string> {
  if (micropythonV1Hex) return micropythonV1Hex;
  micropythonV1Hex = await fetchLocalFirmware('v1');
  return micropythonV1Hex;
}

/**
 * Fetch MicroPython V2 firmware
 */
async function fetchMicropythonV2(): Promise<string> {
  if (micropythonV2Hex) return micropythonV2Hex;
  micropythonV2Hex = await fetchLocalFirmware('v2');
  return micropythonV2Hex;
}

/**
 * MicrobitHexService class - Main service for hex generation and management
 */
export class MicrobitHexService {
  private v1HexCache: string | null = null;
  private v2HexCache: string | null = null;
  
  /**
   * Fetch both MicroPython V1 and V2 firmware
   * Call this early to cache the firmware
   */
  async prefetchFirmware(): Promise<void> {
    try {
      await Promise.all([
        fetchMicropythonV1(),
        fetchMicropythonV2()
      ]);
    } catch (e) {
      console.warn('Failed to prefetch MicroPython firmware:', e);
    }
  }
  
  /**
   * Generate a Universal Hex file with Python code embedded
   * Works on both micro:bit V1 and V2
   */
  async generateUniversalHex(pythonCode: string): Promise<string> {
    // Convert MakeCode Python to MicroPython if needed
    const microPythonCode = ensureMicroPythonFormat(pythonCode);
    console.log('Converted code for micro:bit:\n', microPythonCode);
    
    // Fetch both firmware versions
    const [v1Hex, v2Hex] = await Promise.all([
      fetchMicropythonV1(),
      fetchMicropythonV2()
    ]);
    
    // Create filesystem with both V1 and V2 firmware
    const micropythonFs = new MicropythonFsHex([
      { hex: v1Hex, boardId: microbitBoardId.V1 },
      { hex: v2Hex, boardId: microbitBoardId.V2 },
    ]);
    
    // Write the Python code as main.py (this is what runs on startup)
    micropythonFs.write('main.py', microPythonCode);
    
    // Generate Universal Hex (works on both V1 and V2)
    const universalHex = micropythonFs.getUniversalHex();
    
    console.log(`Generated Universal Hex: ${universalHex.length} bytes`);
    return universalHex;
  }
  
  /**
   * Generate a V1-only Intel Hex file
   */
  async generateV1Hex(pythonCode: string): Promise<string> {
    // Convert MakeCode Python to MicroPython if needed
    const microPythonCode = ensureMicroPythonFormat(pythonCode);
    
    const v1Hex = await fetchMicropythonV1();
    
    const micropythonFs = new MicropythonFsHex(v1Hex);
    micropythonFs.write('main.py', microPythonCode);
    
    return micropythonFs.getIntelHex();
  }
  
  /**
   * Generate a V2-only Intel Hex file
   */
  async generateV2Hex(pythonCode: string): Promise<string> {
    // Convert MakeCode Python to MicroPython if needed
    const microPythonCode = ensureMicroPythonFormat(pythonCode);
    
    const v2Hex = await fetchMicropythonV2();
    
    const micropythonFs = new MicropythonFsHex(v2Hex);
    micropythonFs.write('main.py', microPythonCode);
    
    return micropythonFs.getIntelHex();
  }
  
  /**
   * Generate hex file - defaults to Universal Hex for maximum compatibility
   */
  async generateHex(pythonCode: string): Promise<string> {
    try {
      return await this.generateUniversalHex(pythonCode);
    } catch (e) {
      console.warn('Failed to generate Universal Hex, trying V2 only:', e);
      try {
        return await this.generateV2Hex(pythonCode);
      } catch (e2) {
        console.warn('Failed to generate V2 Hex, trying V1 only:', e2);
        return await this.generateV1Hex(pythonCode);
      }
    }
  }
  
  /**
   * Generate hex file as a Blob for downloading
   */
  async generateHexBlob(pythonCode: string): Promise<Blob> {
    const hex = await this.generateHex(pythonCode);
    return new Blob([hex], { type: 'application/octet-stream' });
  }
  
  /**
   * Generate hex file as ArrayBuffer for flashing
   */
  async generateHexBuffer(pythonCode: string): Promise<ArrayBuffer> {
    const hex = await this.generateHex(pythonCode);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(hex);
    // Create a proper ArrayBuffer
    const buffer = new ArrayBuffer(encoded.byteLength);
    new Uint8Array(buffer).set(encoded);
    return buffer;
  }
  
  /**
   * Generate hex file for a specific version (for WebUSB flashing)
   * WebUSB flashing works better with version-specific hex files
   * rather than Universal Hex format
   */
  async generateHexForVersion(pythonCode: string, version: 'v1' | 'v2'): Promise<string> {
    if (version === 'v1') {
      return await this.generateV1Hex(pythonCode);
    } else {
      return await this.generateV2Hex(pythonCode);
    }
  }
  
  /**
   * Generate hex file as ArrayBuffer for a specific version (for WebUSB flashing)
   */
  async generateHexBufferForVersion(pythonCode: string, version: 'v1' | 'v2'): Promise<ArrayBuffer> {
    const hex = await this.generateHexForVersion(pythonCode, version);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(hex);
    const buffer = new ArrayBuffer(encoded.byteLength);
    new Uint8Array(buffer).set(encoded);
    return buffer;
  }
  
  /**
   * Download the hex file
   */
  async downloadHex(pythonCode: string, filename: string = 'microbit-program.hex'): Promise<void> {
    const blob = await this.generateHexBlob(pythonCode);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    if (a.parentElement) a.parentElement.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Get information about the MicroPython firmware storage
   */
  async getStorageInfo(pythonCode: string): Promise<{
    totalSize: number;
    usedSize: number;
    remainingSize: number;
  }> {
    const v2Hex = await fetchMicropythonV2();
    const micropythonFs = new MicropythonFsHex(v2Hex);
    micropythonFs.write('main.py', pythonCode);
    
    return {
      totalSize: micropythonFs.getStorageSize(),
      usedSize: micropythonFs.getStorageUsed(),
      remainingSize: micropythonFs.getStorageRemaining()
    };
  }
}

// Singleton instance for convenience
export const microbitHexService = new MicrobitHexService();

export default MicrobitHexService;
