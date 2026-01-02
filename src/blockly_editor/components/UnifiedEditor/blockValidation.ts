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
  // INPUT (boolean reporters that should only be meaningful under an event)
  "is_gesture",
  // INPUT (sensor reporters)
  "light_level",
  "temperature",
]);

export const EVENT_CONTAINER_BLOCKS = new Set<string>([
  "forever",
  "on_start",
  "on_button_pressed",
  "on_gesture",
  "on_logo_pressed",
  "on_logo_released",
  "loops_every_interval",
]);

const GATED_BLOCK_DISABLED_REASON = "GATED_BLOCK";

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
  is_gesture: "Check whether the selected gesture is currently active",
  light_level: "Get the current ambient light level (0–255)",
  temperature: "Get the temperature in degrees Celsius",
  music_play_tone: "Play a tone with given pitch and duration",
  music_ring_tone: "Ring a tone continuously",
  music_rest: "Pause sound for a specified duration",
  music_record_and_play: "Record a sequence of notes and play them back",
};

/**
 * Update block's enabled state based on whether it's attached to an event
 * Uses standard Blockly API: disabled property
 */
export function updateLedBlockRunState(blk: Blockly.Block | null | undefined) {
  if (!blk) return;
  if (!GATED_BLOCK_TYPES.has(blk.type)) return;
  
  try {
    const root = blk.getRootBlock();
    const enabled = !!root && EVENT_CONTAINER_BLOCKS.has(root.type);
    
    // Determine disabled state
    const shouldBeDisabled = !enabled;
    const anyBlock = blk as any;
    const currentlyDisabled = !!anyBlock.disabled;
    
    // Only update if state changed
    if (shouldBeDisabled !== currentlyDisabled) {
      // Set disabled property directly
      anyBlock.disabled = shouldBeDisabled;
      
      // Update tooltip
      if (shouldBeDisabled) {
        blk.setTooltip(disabledTooltip);
      } else {
        blk.setTooltip(defaultTooltips[blk.type] || "");
      }
      
      // Force visual update - render will apply CSS classes
      if (blk.rendered) {
        // Get the SVG element and apply CSS classes manually
        const svgRoot = anyBlock.getSvgRoot?.() || anyBlock.svgGroup_;
        if (svgRoot && svgRoot.classList) {
          if (shouldBeDisabled) {
            svgRoot.classList.add('blocklyDisabled', 'blocklyDisabledPattern');
          } else {
            svgRoot.classList.remove('blocklyDisabled', 'blocklyDisabledPattern');
          }
        }
        
        // Render the block to apply Blockly's internal disabled styling
        try {
          blk.render();
        } catch (_) {}
      }
    }
    
    // Recursively update all descendants
    const descendants = blk.getDescendants(false); // false = don't include self
    descendants.forEach(child => {
      if (GATED_BLOCK_TYPES.has(child.type)) {
        updateLedBlockRunState(child);
      }
    });
    
  } catch (err) {
    console.warn("Error updating gated block state:", err);
  }
}

/**
 * Update all blocks' enabled state (debounced)
 */
let updateAllTimeout: ReturnType<typeof setTimeout> | null = null;
export function updateAllLedBlockStates(workspace: Blockly.Workspace | null) {
  if (!workspace) return;
  
  // Debounce to avoid excessive updates
  if (updateAllTimeout) {
    clearTimeout(updateAllTimeout);
  }
  
  updateAllTimeout = setTimeout(() => {
    try {
      const all = workspace.getAllBlocks(false) || [];
      all.forEach((b) => {
        if (GATED_BLOCK_TYPES.has(b.type)) {
          updateLedBlockRunState(b);
        }
      });
    } catch (err) {
      console.warn("Error updating all gated block states:", err);
    }
    updateAllTimeout = null;
  }, 50); // 50ms debounce
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
      const ws = block.workspace;
      const isFlyout = ws && (ws as any).isFlyout;
      return !isInFlyout && !isFlyout;
    });

    if (foreverBlocks.length <= 1) return;

    // Sort by Y position (keep top-most)
    foreverBlocks.sort((a, b) => {
      const posA = a.getRelativeToSurfaceXY ? a.getRelativeToSurfaceXY() : { y: 0 };
      const posB = b.getRelativeToSurfaceXY ? b.getRelativeToSurfaceXY() : { y: 0 };
      return posA.y - posB.y;
    });

    // Delete all except first
    foreverBlocks.forEach((block: Blockly.Block, index: number) => {
      if (index > 0) {
        block.dispose(false);
      }
    });
  } catch (err) {
    console.warn("Error updating forever blocks:", err);
  }
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
      const ws = block.workspace;
      const isFlyout = ws && (ws as any).isFlyout;
      return !isInFlyout && !isFlyout;
    });

    if (onStartBlocks.length <= 1) return;

    // Sort by Y position (keep top-most)
    onStartBlocks.sort((a, b) => {
      const posA = a.getRelativeToSurfaceXY ? a.getRelativeToSurfaceXY() : { y: 0 };
      const posB = b.getRelativeToSurfaceXY ? b.getRelativeToSurfaceXY() : { y: 0 };
      return posA.y - posB.y;
    });

    // Delete all except first
    onStartBlocks.forEach((block: Blockly.Block, index: number) => {
      if (index > 0) {
        block.dispose(false);
      }
    });
  } catch (err) {
    console.warn("Error updating on_start blocks:", err);
  }
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
  } catch (err) {
    console.warn("Error ensuring variable shadows:", err);
  }
}

