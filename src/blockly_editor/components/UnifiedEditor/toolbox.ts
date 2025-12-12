import { createToolboxXmlFromBlocks } from "../../utils/sharedBlockDefinitions";

// Simple wrapper for toolbox generation kept separate for modularity
export function createSimpleToolbox(): string {
  return createToolboxXmlFromBlocks();
}
