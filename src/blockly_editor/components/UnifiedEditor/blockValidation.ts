import * as Blockly from "blockly";

// Block types that must live under an event
export const GATED_BLOCK_TYPES = new Set<string>([
  // LED
  "plot_led",
  "unplot_led",
  "toggle_led",
  "plot_led_brightness",
  "show_leds",
  "clear_screen",
  // BASIC
  "show_string",
  "show_number",
  "basic_show_leds",
  "pause",
  "show_icon",
  // MATH
  "math_random_int",
  // MUSIC
  "music_play_tone",
  "music_ring_tone",
  "music_rest",
  "music_record_and_play",
  // LOGIC
  "controls_if",
]);

export const EVENT_CONTAINER_BLOCKS = new Set<string>([
  "forever",
  "on_start",
  "on_button_pressed",
]);

const disabledTooltip =
  "This block is disabled and will not run. Attach this block to an event to enable it.";

const defaultTooltips: Record<string, string> = {
  plot_led: "Turn on LED at (x, y)",
  unplot_led: "Turn off LED at (x, y)",
  toggle_led: "Toggle LED at (x, y)",
  plot_led_brightness: "Plot an LED at (x,y) with brightness 0-255",
  show_leds: "Display pattern on LEDs",
  clear_screen: "Clear all LEDs on the micro:bit display",
  show_string: "Show a string on the display",
  show_number: "Show a number on the display",
  basic_show_leds: "Draw a 5×5 image and show it on the LED screen",
  pause: "Pause execution",
  show_icon: "Show a predefined icon on the LED matrix",
  math_random_int: "Return a random integer between two values",
  controls_if: "If / else if / else",
  music_play_tone: "Play a tone with given pitch and duration",
  music_ring_tone: "Ring a tone continuously",
  music_rest: "Pause sound for a specified duration",
  music_record_and_play: "Record a sequence of notes and play them back",
};

/**
 * Update block's enabled state based on whether it's attached to an event
 */
export function updateLedBlockRunState(blk: Blockly.Block | null | undefined) {
  if (!blk) return;
  if (!GATED_BLOCK_TYPES.has(blk.type)) return;
  const root = blk.getRootBlock();
  const enabled = !!root && EVENT_CONTAINER_BLOCKS.has(root.type);
  try {
    const anyBlk: any = blk as any;
    if (typeof anyBlk.setEnabled === "function") {
      anyBlk.setEnabled(enabled);
    } else if (typeof anyBlk.setDisabled === "function") {
      anyBlk.setDisabled(!enabled);
    }
    if (typeof anyBlk.updateDisabled === "function") {
      anyBlk.updateDisabled();
    }
    if (typeof anyBlk.render === "function") {
      anyBlk.render();
    }
    if (typeof anyBlk.getSvgRoot === "function") {
      const svg = anyBlk.getSvgRoot();
      if (svg && svg.classList) {
        svg.classList.toggle("blocklyDisabled", !enabled);
      }
    }
  } catch (_) {}
  try {
    if (!enabled) {
      blk.setTooltip(disabledTooltip);
    } else {
      blk.setTooltip(defaultTooltips[blk.type] || "");
    }
  } catch (_) {}
}

/**
 * Update all blocks' enabled state
 */
export function updateAllLedBlockStates(workspace: Blockly.Workspace | null) {
  try {
    const all = workspace?.getAllBlocks(false) || [];
    (all as any[]).forEach((b) => updateLedBlockRunState(b as any));
  } catch (_) {}
}

/**
 * Ensure only one forever block exists on the workspace
 */
export function updateForeverBlockStates(workspace: Blockly.Workspace | null) {
  try {
    if (!workspace) return;

    const allBlocks = workspace.getAllBlocks(false);
    const foreverBlocks = allBlocks.filter((block: Blockly.Block) => {
      if (block.type !== "forever") return false;
      const isInFlyout = (block as any).isInFlyout || false;
      const workspace = block.workspace;
      const isFlyout = workspace && (workspace as any).isFlyout;
      return !isInFlyout && !isFlyout;
    });

    if (foreverBlocks.length <= 1) return;

    foreverBlocks.forEach((block: Blockly.Block, index: number) => {
      if (index > 0) {
        block.dispose(false);
      }
    });
  } catch (_) {}
}

/**
 * Ensure only one on_start block exists on the workspace
 */
export function updateOnStartBlockStates(workspace: Blockly.Workspace | null) {
  try {
    if (!workspace) return;

    const allBlocks = workspace.getAllBlocks(false);
    const onStartBlocks = allBlocks.filter((block: Blockly.Block) => {
      if (block.type !== "on_start") return false;
      const isInFlyout = (block as any).isInFlyout || false;
      const workspace = block.workspace;
      const isFlyout = workspace && (workspace as any).isFlyout;
      return !isInFlyout && !isFlyout;
    });

    onStartBlocks.forEach((block: Blockly.Block, index: number) => {
      if (index > 0) {
        block.dispose(false);
      }
    });
  } catch (_) {}
}

/**
 * Ensure variable blocks have number shadow inputs
 */
export function ensureVariableShadowsOnBlock(blk: Blockly.Block | null | undefined) {
  if (!blk) return;
  try {
    if (blk.type === "variables_set") {
      const input = blk.getInput("VALUE");
      const conn = input?.connection || null;
      if (conn && !conn.targetConnection) {
        const num = blk.workspace.newBlock("math_number");
        (num as any).setShadow(true);
        (num as any).setFieldValue("0", "NUM");
        (num as any).initSvg?.();
        (num as any).render?.();
        (num as any).outputConnection?.connect(conn);
      }
    } else if (blk.type === "math_change") {
      const input = blk.getInput("DELTA");
      const conn = input?.connection || null;
      if (conn && !conn.targetConnection) {
        const num = blk.workspace.newBlock("math_number");
        (num as any).setShadow(true);
        (num as any).setFieldValue("1", "NUM");
        (num as any).initSvg?.();
        (num as any).render?.();
        (num as any).outputConnection?.connect(conn);
      }
    }
  } catch (_) {}
}
