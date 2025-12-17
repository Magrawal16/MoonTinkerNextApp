import * as Blockly from "blockly";
import { SharedBlockRegistry } from "../src/blockly_editor/utils/sharedBlockDefinitions";

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  // Initialize shared blocks + custom fields
  SharedBlockRegistry.registerBlocks();

  // Create a headless workspace
  const ws = new Blockly.Workspace();

  // Try creating the blocks that previously failed on first load
  const leds = ws.newBlock("basic_show_leds");
  const icon = ws.newBlock("show_icon");

  // Validate fields are present and have default values
  const ledsVal = leds.getFieldValue("MATRIX");
  const iconVal = icon.getFieldValue("ICON");

  assert(typeof ledsVal === "string" && ledsVal.split("\n").length === 5, "Led matrix field did not initialize to 5x5 pattern");
  assert(typeof iconVal === "string" && iconVal.length > 0, "Icon field did not initialize to default icon value");

  console.log("✅ Blockly field smoke test passed: custom fields initialized correctly on first load.");

  // Cleanup
  ws.dispose();
}

main().catch((err) => {
  console.error("❌ Blockly field smoke test failed:", err);
  process.exit(1);
});
