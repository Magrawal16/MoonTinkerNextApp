// utils/microbitCompiler.ts
// @deprecated Use microbitHexService and microbitFlasher instead

import { microbitHexService } from './microbitHexService';

/**
 * @deprecated This class is kept for backward compatibility.
 * Use the new microbitHexService and microbitFlasher modules instead.
 */
export class MicrobitCompiler {
  async compilePythonToHex(pythonCode: string): Promise<Uint8Array> {
    // Now uses the proper hex service
    const hexContent = await microbitHexService.generateHex(pythonCode);
    return new TextEncoder().encode(hexContent);
  }
}