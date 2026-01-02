import * as Blockly from "blockly";
import { Order } from "blockly/python";
import "./fields/PianoField";
import "./fields/MusicRecorderField";
import "./fields/SliderField";
import { registerIconField } from "./fields/IconField";
import { registerLedMatrixField } from "./fields/LedMatrixField";
import { initializeDuplicateOnDrag, installDuplicateOnDragListener } from "../plugins/duplicateOnDrag";

export interface SharedBlockDefinition {
  type: string;
  category?: CategoryName;
  blockDefinition: any;
  pythonPattern: RegExp;
  pythonGenerator: (block: any, generator?: any) => string | [string, number];
  pythonExtractor: (match: RegExpMatchArray) => Record<string, any>;
  blockCreator: (
    workspace: Blockly.Workspace,
    values: Record<string, any>
  ) => Blockly.Block;
}
export interface BlockCategory {
  name: string;
  color: string | number;
}

type CategoryName = (typeof BLOCK_CATEGORIES)[number]["name"];

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { name: "Basic", color: "#0078D7" },
  { name: "Input", color: "#C724B1" },
  { name: "Loops", color: "#00aa00" }, 
  { name: "Led", color: "#6A1B9A" },
  { name: "Logic", color: "#00BCD4" },
  { name: "Variables", color: "#DC3545" },
  { name: "Text", color: "#F06292" },
  { name: "Maths", color: "#7B2D8F" },
  { name: "Music", color: "#EB4437" },
  { name: "Pins", color: "#b45309" },
];

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  BLOCK_CATEGORIES.map(({ name, color }) => [name, color.toString()])
);

export function getCategoryMeta(categoryName: string): { color: string; icon: string } {
  return {
    color: CATEGORY_COLORS[categoryName] || "#cccccc",
    icon: CATEGORY_ICONS[categoryName] || "📦",
  };
}

export const CATEGORY_ICONS: Record<string, string> = {
  Basic: "🧩",
  Input: "🎮",
  Loops: "🔁",
  Led: "💡",
  Logic: "🔀",
  Variables: "🗃️",
  Text: "🔤",
  Maths: "➗",
  Music: "🎵",
  Pins: "🔌",
};

const IF_ELSE_ADD_ICON =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="4" ry="4" fill="%2300bcd4"/><path d="M11 5h2v14h-2z" fill="white"/><path d="M5 11h14v2H5z" fill="white"/></svg>';

const IF_ELSE_REMOVE_ICON =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="4" ry="4" fill="%23f44336"/><path d="M5 11h14v2H5z" fill="white"/></svg>';
import { LOGIC_BLOCKS } from "./sharedBlockDefinitions/logic";
import { MUSIC_BLOCKS } from "./sharedBlockDefinitions/music";
import { MATHS_BLOCKS } from "./sharedBlockDefinitions/maths";
import { BASIC_BLOCKS } from "./sharedBlockDefinitions/basic";
import { LED_BLOCKS } from "./sharedBlockDefinitions/led";
import { INPUT_BLOCKS } from "./sharedBlockDefinitions/input";
import {LOOPS_BLOCKS } from "./sharedBlockDefinitions/loops";
import { PINS_BLOCKS } from "./sharedBlockDefinitions/pins";

function indentBodyIfNeeded(code: string, IND: string): string {
  if (!code || code.trim().length === 0) return `${IND}pass\n`;
  const normalized = code.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const firstContent = lines.find((l) => l.trim().length > 0) ?? "";
  const startsIndented = /^\s+/.test(firstContent);
  const processed = startsIndented ? lines : lines.map((l) => (l.trim().length === 0 ? l : IND + l));
  let out = processed.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

function createAndInitializeBlock(
  workspace: Blockly.Workspace,
  blockType: string,
  fieldUpdates?: Record<string, any>
): Blockly.Block {
  const block = workspace.newBlock(blockType);
  if (fieldUpdates) {
    for (const [fieldName, value] of Object.entries(fieldUpdates)) {
      block.setFieldValue(value, fieldName);
    }
  }
  if (workspace.rendered && (block as any).initSvg) {
    try {
      (block as any).initSvg();
      (block as any).render();
    } catch (error) {
      console.warn("Could not initialize SVG for block:", error);
    }
  }
  return block;
}

function attachNumberShadow(
  workspace: Blockly.Workspace,
  hostBlock: Blockly.Block,
  inputName: string,
  defaultValue: number
): void {
  try {
    const num = workspace.newBlock("math_number");
    (num as any).setShadow(true);
    (num as any).setFieldValue(String(Number.isFinite(defaultValue) ? defaultValue : 0), "NUM");
    if ((num as any).initSvg) (num as any).initSvg();
    if ((num as any).render) (num as any).render();
    const input = hostBlock.getInput(inputName);
    input?.connection?.connect((num as any).outputConnection);
  } catch (_) {}
}

function attachBooleanShadow(
  workspace: Blockly.Workspace,
  hostBlock: Blockly.Block,
  inputName: string,
  defaultValue: boolean
): void {
  try {
    const bool = workspace.newBlock("logic_boolean");
    (bool as any).setShadow(true);
    (bool as any).setFieldValue(defaultValue ? "TRUE" : "FALSE", "BOOL");
    if ((bool as any).initSvg) (bool as any).initSvg();
    if ((bool as any).render) (bool as any).render();
    const input = hostBlock.getInput(inputName);
    input?.connection?.connect((bool as any).outputConnection);
  } catch (_) {}
}

function registerInlineIfElseBlock(): void {
  const logicColor = CATEGORY_COLORS["Logic"] || "#00BCD4";

  const IF_ELSE_MIXIN = {
    elseifCount_: 0,
    elseCount_: 0,
    valueConnections_: [] as (Blockly.Connection | null)[],
    statementConnections_: [] as (Blockly.Connection | null)[],
    elseStatementConnection_: null as Blockly.Connection | null,
    mutationToDom(this: any) {
      if (!this.elseifCount_ && !this.elseCount_) return null;
      const container = Blockly.utils.xml.createElement("mutation");
      if (this.elseifCount_) container.setAttribute("elseif", String(this.elseifCount_));
      if (this.elseCount_) container.setAttribute("else", "1");
      return container;
    },
    domToMutation(this: any, xmlElement: Element) {
      if (!xmlElement) return;
      this.elseifCount_ = parseInt(xmlElement.getAttribute("elseif") || "0", 10) || 0;
      this.elseCount_ = parseInt(xmlElement.getAttribute("else") || "0", 10) || 0;
      this.rebuildShape_();
    },
    storeConnections_(this: any, skipIndex?: number) {
      this.valueConnections_ = [null];
      this.statementConnections_ = [null];
      this.elseStatementConnection_ = null;
      for (let i = 1; i <= this.elseifCount_; i++) {
        if (skipIndex && skipIndex === i) continue;
        this.valueConnections_.push(this.getInput("IF" + i)?.connection?.targetConnection || null);
        this.statementConnections_.push(this.getInput("DO" + i)?.connection?.targetConnection || null);
      }
      if (this.getInput("ELSE")) {
        this.elseStatementConnection_ = this.getInput("ELSE")?.connection?.targetConnection || null;
      }
    },
    restoreConnections_(this: any) {
      for (let i = 1; i <= this.elseifCount_; i++) {
        this.reconnectValueConnection_(i, this.valueConnections_);
        this.statementConnections_[i]?.reconnect(this, "DO" + i);
      }
      if (this.getInput("ELSE")) {
        this.elseStatementConnection_?.reconnect(this, "ELSE");
      }
    },
    addElse_(this: any) {
      this.update_(() => {
        this.elseCount_ = 1;
      });
    },
    removeElse_(this: any) {
      this.update_(() => {
        this.elseCount_ = 0;
      });
    },
    addElseIf_(this: any) {
      this.update_(() => {
        this.elseifCount_++;
      });
    },
    removeElseIf_(this: any, index: number) {
      this.update_(() => {
        this.elseifCount_ = Math.max(0, this.elseifCount_ - 1);
      }, index);
    },
    update_(this: any, updater: () => void, skipIndex?: number) {
      Blockly.Events.setGroup(true);
      this.storeConnections_(skipIndex);
      const block = this as Blockly.Block;
      const oldMutationDom = block.mutationToDom?.();
      const oldMutation = oldMutationDom ? Blockly.Xml.domToText(oldMutationDom) : "";
      updater?.();
      this.updateShape_();
      if ((block as any).initSvg) (block as any).initSvg();
      if ((block as any).render) (block as any).render();
      const newMutationDom = block.mutationToDom?.();
      const newMutation = newMutationDom ? Blockly.Xml.domToText(newMutationDom) : "";
      if (oldMutation !== newMutation) {
        const changeEvent = new Blockly.Events.BlockChange(block, "mutation", null, oldMutation, newMutation);
        Blockly.Events.fire(changeEvent);
        const group = Blockly.Events.getGroup();
        setTimeout(() => {
          Blockly.Events.setGroup(group);
          (block as any).bumpNeighbours?.();
          Blockly.Events.setGroup(false);
        }, (Blockly as any).config?.bumpDelay ?? 0);
      }
      this.restoreConnections_();
      Blockly.Events.setGroup(false);
    },
    updateShape_(this: any) {
      const _b = Blockly as any;
      const _inputsKey = "inp" + "uts";
      const _alignKey = "Al" + "ign";
      const _horizKey = "Horiz" + "ontal" + "Alignment";
      const _rightKey = "RIGH" + "T";
      const rightAlign = _b[_inputsKey]?.[_alignKey]?.[_rightKey] ?? _b[_alignKey]?.[_rightKey] ?? _b[_horizKey]?.[_rightKey] ?? 0;
      if (this.getInput("ELSE")) {
        this.removeInput("ELSEBUTTONS");
        this.removeInput("ELSETITLE");
        this.removeInput("ELSE");
      }
      let i = 1;
      while (this.getInput("IF" + i)) {
        this.removeInput("IF" + i);
        this.removeInput("IFTITLE" + i);
        this.removeInput("IFBUTTONS" + i);
        this.removeInput("DO" + i);
        i++;
      }
      for (let idx = 1; idx <= this.elseifCount_; idx++) {
        const removeElseIf = () => this.removeElseIf_(idx);
        this.appendValueInput("IF" + idx)
          .setCheck("Boolean")
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF || "else if");
        this.appendDummyInput("IFTITLE" + idx)
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN || "then");
        this.appendDummyInput("IFBUTTONS" + idx)
          .setAlign(rightAlign)
          .appendField(new Blockly.FieldImage(IF_ELSE_REMOVE_ICON, 18, 18, "-", removeElseIf, false));
        this.appendStatementInput("DO" + idx);
        
        // Attach default false boolean to else-if conditions if no connection exists
        if (this.workspace && !this.getInput("IF" + idx)?.connection?.targetConnection) {
          attachBooleanShadow(this.workspace, this, "IF" + idx, false);
        }
      }
      if (this.elseCount_) {
        this.appendDummyInput("ELSETITLE")
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE || "else");
        this.appendDummyInput("ELSEBUTTONS")
          .setAlign(rightAlign)
          .appendField(new Blockly.FieldImage(IF_ELSE_REMOVE_ICON, 18, 18, "-", this.removeElse_.bind(this), false));
        this.appendStatementInput("ELSE");
      }
      if (this.getInput("ADDBUTTON")) this.removeInput("ADDBUTTON");
      const addElseOrElseIf = () => {
        if (!this.elseCount_) {
          this.addElse_();
        } else {
          this.addElseIf_();
        }
      };
      this.appendDummyInput("ADDBUTTON")
        .setAlign(rightAlign)
        .appendField(new Blockly.FieldImage(IF_ELSE_ADD_ICON, 18, 18, "+", addElseOrElseIf, false));
    },
    rebuildShape_(this: any) {
      const valueConnections: (Blockly.Connection | null)[] = [null];
      const statementConnections: (Blockly.Connection | null)[] = [null];
      let elseConnection: Blockly.Connection | null = null;
      if (this.getInput("ELSE")) {
        elseConnection = this.getInput("ELSE")?.connection?.targetConnection || null;
      }
      let idx = 1;
      while (this.getInput("IF" + idx)) {
        valueConnections[idx] = this.getInput("IF" + idx)?.connection?.targetConnection || null;
        statementConnections[idx] = this.getInput("DO" + idx)?.connection?.targetConnection || null;
        idx++;
      }
      this.updateShape_();
      this.reconnectChildBlocks_(valueConnections, statementConnections, elseConnection);
    },
    reconnectChildBlocks_(
      this: any,
      valueConnections: (Blockly.Connection | null)[],
      statementConnections: (Blockly.Connection | null)[],
      elseConnection: Blockly.Connection | null
    ) {
      for (let i = 1; i <= this.elseifCount_; i++) {
        this.reconnectValueConnection_(i, valueConnections);
        statementConnections[i]?.reconnect(this, "DO" + i);
      }
      elseConnection?.reconnect(this, "ELSE");
    },
    reconnectValueConnection_(this: any, index: number, valueConnections: (Blockly.Connection | null)[]) {
      const shadow = this.getInput("IF" + index)?.connection?.targetBlock();
      if (valueConnections[index]) {
        valueConnections[index]?.reconnect(this, "IF" + index);
        if (shadow && typeof (shadow as any).getParent === "function" && !(shadow as any).getParent()) {
          shadow.dispose();
        }
      }
    },
  };

  Blockly.Blocks["controls_if"] = {
    ...IF_ELSE_MIXIN,
    init(this: any) {
      this.elseifCount_ = 0;
      this.elseCount_ = 0;
      this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
      this.appendValueInput("IF0")
        .setCheck("Boolean")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF || "if");
      this.appendDummyInput("THEN0")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN || "then");
      this.appendStatementInput("DO0");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(logicColor);
      this.updateShape_();
      this.setTooltip(() => {
        if (!this.elseifCount_ && !this.elseCount_) return Blockly.Msg.CONTROLS_IF_TOOLTIP_1 || "If true, do something.";
        if (!this.elseifCount_ && this.elseCount_) return Blockly.Msg.CONTROLS_IF_TOOLTIP_2 || "If true, do first block; else do second block.";
        if (this.elseifCount_ && !this.elseCount_) return Blockly.Msg.CONTROLS_IF_TOOLTIP_3 || "If first condition false, test the next.";
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_4 || "Multiple conditions and an else block.";
      });
      
      // Attach default true boolean to the first IF condition
      if (this.workspace) {
        attachBooleanShadow(this.workspace, this, "IF0", true);
      }
    },
  } as any;
}
export const SHARED_MICROBIT_BLOCKS: SharedBlockDefinition[] = [
  ...BASIC_BLOCKS,
  ...LED_BLOCKS,
  ...LOOPS_BLOCKS,
  ...LOGIC_BLOCKS,
  ...INPUT_BLOCKS,
  ...MUSIC_BLOCKS,
  ...PINS_BLOCKS,
  ...MATHS_BLOCKS,
];

// Utility functions for working with shared block definitions
export class SharedBlockRegistry {
  // Register all shared block definitions with Blockly
  static registerBlocks(): void {
    // Ensure custom fields are available before defining blocks
    try { registerIconField(); } catch (_) {}
    try { registerLedMatrixField(); } catch (_) {}

    // Set block color to match category color before registering
    Blockly.utils.colour.setHsvSaturation(1);
    Blockly.utils.colour.setHsvValue(0.8314);
    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      const category = block.category ?? "Basic";
      const categoryObj = BLOCK_CATEGORIES.find((c) => c.name === category);
      if (categoryObj) {
        block.blockDefinition.colour = categoryObj.color;
      }
    });
    const blockDefinitions = SHARED_MICROBIT_BLOCKS
      .filter((block) => block.type !== "controls_if")
      .map((block) => block.blockDefinition);
    Blockly.defineBlocksWithJsonArray(blockDefinitions);
    registerInlineIfElseBlock();

    // Disable copying and duplication for forever and on_start blocks
    const disableCopyForBlock = (blockType: string) => {
      if (Blockly.Blocks[blockType]) {
        // Store original customContextMenu if it exists
        const originalCustomContextMenu = Blockly.Blocks[blockType].customContextMenu;
        // Override customContextMenu to filter out copy/duplicate options
        Blockly.Blocks[blockType].customContextMenu = function(this: Blockly.Block, options: any[]) {
          if (originalCustomContextMenu) {
            originalCustomContextMenu.call(this, options);
          }
          const filteredOptions = options.filter(option => {
            if (!option || !option.text) return true;
            const text = option.text.toLowerCase();
            return !text.includes('duplicate') && !text.includes('copy');
          });
          options.length = 0;
          filteredOptions.forEach(opt => options.push(opt));
        };
        Blockly.Blocks[blockType].isDuplicatable = function(this: Blockly.Block) {
          return false;
        };
      }
    };
    disableCopyForBlock('forever');
    disableCopyForBlock('on_start');

    // Add custom duplicate for all other blocks
    Object.keys(Blockly.Blocks).forEach((blockType) => {
      if (blockType === 'forever' || blockType === 'on_start') return;
      if (blockType.startsWith('variables_') || blockType.startsWith('procedures_')) return;
      
      const blockDef = Blockly.Blocks[blockType];
      if (!blockDef) return;
      
      if (blockDef.customContextMenu) return;
      
      const originalCustomContextMenu = blockDef.customContextMenu;
      blockDef.customContextMenu = function(this: Blockly.Block, options: any[]) {
        if (originalCustomContextMenu) {
          originalCustomContextMenu.call(this, options);
        }
        // Remove default duplicate option if present
        const filteredOptions = options.filter(option => {
          if (!option || !option.text) return true;
          const text = option.text.toLowerCase();
          return !text.includes('duplicate');
        });
        options.length = 0;
        filteredOptions.forEach(opt => options.push(opt));
        // Add our custom duplicate option
        options.push({
          text: 'Duplicate',
          enabled: true,
          callback: () => {
            const workspace = this.workspace;
            if (!workspace) return;
            // Serialize this block and all its children to XML
            const xml = Blockly.Xml.blockToDomWithXY(this, true);
            // Only proceed if xml is an Element (not DocumentFragment)
            if (xml && (xml as Element).setAttribute) {
              const el = xml as Element;
              // Center the new block in the workspace
              // Get workspace metrics after rendering to ensure correct centering
              setTimeout(() => {
                const newBlock = Blockly.Xml.domToBlock(el, workspace);
                // Center the pasted block stack
                if (newBlock) {
                  // Get workspace metrics
                  // getMetrics is only available on WorkspaceSvg
                  const wsSvg = workspace as Blockly.WorkspaceSvg;
                  const metrics = wsSvg.getMetrics ? wsSvg.getMetrics() : undefined;
                  const centerX = metrics ? metrics.viewLeft + metrics.viewWidth / 2 : 50;
                  const centerY = metrics ? metrics.viewTop + metrics.viewHeight / 2 : 50;
                  // Get current position of the top block
                  const curXY = newBlock.getRelativeToSurfaceXY();
                  // Move the top block so its position is centered
                  newBlock.moveBy(centerX - curXY.x, centerY - curXY.y);
                  // Add a CSS class to make the copied block and its children darker but readable
                  function darkenBlockAndChildren(block: Blockly.Block) {
                    try {
                      const svgRoot = (block as any).getSvgRoot?.();
                      if (svgRoot) {
                        svgRoot.classList.add('blocklyCopied');
                      }
                      if ((block as any).getChildren) {
                        ((block as any).getChildren() as Blockly.Block[]).forEach(darkenBlockAndChildren);
                      }
                    } catch (e) {}
                  }
                  darkenBlockAndChildren(newBlock);
                  // Optionally select the new block for user feedback
                  (newBlock as any).select?.();
                  (workspace as any).resize?.();
                }
              }, 0);
            }
          }
        });
      };
    });

    // Initialize duplicate-on-drag functionality for loop blocks
    initializeDuplicateOnDrag();
  }

  /**
   * Setup duplicate-on-drag listener on workspace
   * Call this after workspace is created
   */
  static setupDuplicateOnDragListener(workspace: Blockly.WorkspaceSvg): void {
    installDuplicateOnDragListener(workspace);
  }

  // Register Python code generators for all block types
  static registerPythonGenerators(pythonGenerator: any): void {
    const GATED_BLOCKS = new Set<string>([
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
      // MUSIC 🎵
      "music_play_tone",
      "music_ring_tone",
      "music_rest",
      "music_record_and_play",
      // LOGIC
      "controls_if",
    ]);
    const EVENT_CONTAINER_BLOCKS = new Set<string>([
      "forever",
      "on_start",
      "on_button_pressed",
      "on_gesture",
      "on_logo_pressed",
      "on_logo_released",
      "loops_every_interval",
    ]);

    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      const originalGen = block.pythonGenerator;
      // Wrap generators so disabled LED statement blocks emit no code
      pythonGenerator.forBlock[block.type] = (blk: any, gen: any) => {
        try {
          if (GATED_BLOCKS.has(blk?.type)) {
            // Check 1: Is the block disabled? Use standard Blockly API
            const anyBlock = blk as any;
            const isBlockDisabled = anyBlock.disabled === true || (anyBlock.isDisabled && anyBlock.isDisabled());
            if (isBlockDisabled) {
              return "";
            }

            // Check 2: Must be under an event container
            const root = blk.getRootBlock ? blk.getRootBlock() : null;
            const rootType = root?.type;
            
            if (!rootType || !EVENT_CONTAINER_BLOCKS.has(rootType)) {
              return "";
            }
          }
        } catch (err) {
          // Fall through to generation on any unexpected error
          console.warn(`Error checking gated block ${blk?.type}:`, err);
        }
        return originalGen(blk, gen);
      };
    });

    // Built-in Variables blocks (not part of SHARED_MICROBIT_BLOCKS)
    const resolveVarName = (workspace: any, varIdOrName: string): string => {
      try {
        const model = typeof workspace?.getVariableById === "function"
          ? workspace.getVariableById(varIdOrName)
          : null;
        if (model && model.name) return model.name;
      } catch (_) {}
      // If varIdOrName already looks like a readable name, use it; else default
      if (varIdOrName && !/^[a-f0-9-]{8,}$/i.test(varIdOrName)) return varIdOrName;
      return "x";
    };

    // variables_set: name = value
    pythonGenerator.forBlock["variables_set"] = (block: any, generator: any) => {
      const varId = block.getFieldValue("VAR");
      const name = resolveVarName(block.workspace, varId);
      const rhs = generator.valueToCode(block, "VALUE", generator.ORDER_NONE) || "0";
      return `${name} = ${rhs}\n`;
    };

    // math_change: name += delta
    pythonGenerator.forBlock["math_change"] = (block: any, generator: any) => {
      const varId = block.getFieldValue("VAR");
      const name = resolveVarName(block.workspace, varId);
      const delta = generator.valueToCode(block, "DELTA", generator.ORDER_NONE) || "1";
      return `${name} += ${delta}\n`;
    };

    // variables_get: expression use
    pythonGenerator.forBlock["variables_get"] = (block: any, generator: any) => {
      const varId = block.getFieldValue("VAR");
      const name = resolveVarName(block.workspace, varId);
      return [name, generator.ORDER_ATOMIC || 0];
    };
  }

  // Find a block definition by its type name
  static getBlockDefinition(type: string): SharedBlockDefinition | undefined {
    return SHARED_MICROBIT_BLOCKS.find((block) => block.type === type);
  }

  // Get all registered block type names
  static getBlockTypes(): string[] {
    return SHARED_MICROBIT_BLOCKS.map((block) => block.type);
  }

  // Find all block definitions that match the given Python code
  static matchesPythonPattern(code: string): SharedBlockDefinition[] {
    const matches: SharedBlockDefinition[] = [];

    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      // Reset regex state before testing
      block.pythonPattern.lastIndex = 0;
      if (block.pythonPattern.test(code)) {
        matches.push(block);
      }
    });

    return matches;
  }

  // Create a block from Python code using the appropriate block definition
  static createBlockFromPython(
    workspace: Blockly.Workspace,
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    const blockDef = this.getBlockDefinition(blockType);
    if (!blockDef) {
      return null;
    }

    // Reset regex state and try to match the Python code
    blockDef.pythonPattern.lastIndex = 0;
    const match = blockDef.pythonPattern.exec(pythonCode);
    if (!match) {
      return null;
    }

    // Extract values from the matched Python code and create the block
    const values = blockDef.pythonExtractor(match);
    return blockDef.blockCreator(workspace, values);
  }
}

// Enhanced converter that uses shared block definitions for consistent bidirectional conversion
export class EnhancedPythonToBlocklyConverter {
  private workspace: Blockly.Workspace;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
  }

  // Convert Python code to Blockly blocks using shared definitions
  convertPythonToBlocks(pythonCode: string): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];
    const lines = pythonCode.split("\n");
    let currentLine = 0;

    // Process each line of Python code
    while (currentLine < lines.length) {
      const line = lines[currentLine].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) {
        currentLine++;
        continue;
      }

      // Find block patterns that match this line
      const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(line);

      if (matchingBlocks.length > 0) {
        // Use the first matching block type (most specific match)
        const blockDef = matchingBlocks[0];
        const block = SharedBlockRegistry.createBlockFromPython(
          this.workspace,
          line,
          blockDef.type
        );

        if (block) {
          blocks.push(block);
        }
      }

      currentLine++;
    }

    // Connect blocks that should be in sequence (e.g., statements in a program)
    this.connectSequentialBlocks(blocks);

    return blocks;
  }

  // Connect blocks that should be in sequence (statements that execute one after another)
  private connectSequentialBlocks(blocks: Blockly.Block[]): void {
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlock = blocks[i];
      const nextBlock = blocks[i + 1];

      // Only connect if both blocks have the right connection types
      if (currentBlock.nextConnection && nextBlock.previousConnection) {
        try {
          currentBlock.nextConnection.connect(nextBlock.previousConnection);
        } catch (error) {
          // Connection failed - blocks might already be connected or incompatible
          console.warn("Failed to connect blocks:", error);
        }
      }
    }
  }

  // Convert Python code to a specific block type (for targeted conversion)
  convertToSpecificBlock(
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    return SharedBlockRegistry.createBlockFromPython(
      this.workspace,
      pythonCode,
      blockType
    );
  }
}

// Utility function to update existing BlocklyEditor to use shared definitions
export function createUpdatedBlocklyEditor() {
  return {
    initializeSharedBlocks: () => {
      SharedBlockRegistry.registerBlocks();
    },

    setupPythonGenerators: (pythonGenerator: any) => {
      SharedBlockRegistry.registerPythonGenerators(pythonGenerator);
    },

    createConverter: (workspace: Blockly.Workspace) => {
      return new EnhancedPythonToBlocklyConverter(workspace);
    },
  };
}

export function createToolboxXmlFromBlocks(): string {
  // Default category name and color if not specified
  const DEFAULT_CATEGORY = "Basic";
  const DEFAULT_COLOR = "#999999ff";

  // Helper: map category name -> color
  const categoryColorMap: Record<string, string> = {};
  BLOCK_CATEGORIES.forEach(({ name, color }) => {
    categoryColorMap[name] = color.toString();
  });

  // Group blocks by category name
  const blocksByCategory: Record<string, SharedBlockDefinition[]> = {};
  for (const block of SHARED_MICROBIT_BLOCKS) {
    const category = block.category ?? DEFAULT_CATEGORY;
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  }

  // Helper: generate block XML string with default field values
  function generateBlockXml(block: SharedBlockDefinition): string {
    const args = block.blockDefinition.args0 || [];
    let fieldsXml = "";
    let valuesXml = "";
    for (const arg of args) {
      if ("name" in arg) {
        if (
          arg.type === "field_input" ||
          arg.type === "field_number" ||
          arg.type === "field_dropdown" ||
          arg.type === "field_multilinetext"
        ) {
          let defaultValue = "";
          if ("text" in arg) defaultValue = arg.text;
          else if ("value" in arg) defaultValue = arg.value;
          else if (
            "options" in arg &&
            Array.isArray(arg.options) &&
            arg.options.length > 0
          ) {
            defaultValue = arg.options[0][1];
          }
          fieldsXml += `\n      <field name="${arg.name}">${defaultValue}</field>`;
        } else if (arg.type === "input_value") {
          const wantsNumberShadow =
            (block.type === "show_number" && arg.name === "NUM") ||
            (arg.check && (Array.isArray(arg.check) ? arg.check.includes("Number") : arg.check === "Number"));
          const wantsTextShadow =
            (block.type === "show_string" && arg.name === "TEXT") ||
            (arg.check && (Array.isArray(arg.check) ? arg.check.includes("String") : arg.check === "String"));
          const wantsVariableShadow =
            arg.check && (Array.isArray(arg.check) ? arg.check.includes("Variable") : arg.check === "Variable");
          
          if (wantsNumberShadow) {
            const defaultNumberValue =
              block.type === "pins_analog_write_pin" && arg.name === "VALUE" ? 1023 : 0;
            valuesXml += `\n      <value name="${arg.name}">\n        <shadow type="math_number">\n          <field name="NUM">${defaultNumberValue}</field>\n        </shadow>\n      </value>`;
          } else if (wantsTextShadow) {
            valuesXml += `\n      <value name="${arg.name}">\n        <shadow type="text">\n          <field name="TEXT">Hello!</field>\n        </shadow>\n      </value>`;
          } else if (wantsVariableShadow) {
            // Determine default variable name based on block type and input name
            let varName = "item";
            if (block.type === "loops_for_range" && arg.name === "VAR") {
              varName = "index";
            } else if (block.type === "loops_for_of" && arg.name === "VAR") {
              varName = "value";
            } else if (block.type === "loops_for_of" && arg.name === "LIST") {
              varName = "list";
            }
            // Use regular block instead of shadow for draggability
            valuesXml += `\n      <value name="${arg.name}">\n        <block type="variables_get">\n          <field name="VAR">${varName}</field>\n        </block>\n      </value>`;
          }
        }
      }
    }
    return `<block type="${block.type}">${fieldsXml}${valuesXml}\n    </block>`;
  }

  // Get category icon
  function getCategoryIcon(categoryName: string): string {
    return CATEGORY_ICONS[categoryName] || "📋";
  }

  // Create category-based toolbox with modern styling
  let xml = `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox-categories" style="display: none">\n`;

  const emitted: Set<string> = new Set();
  const categoriesToEmit = BLOCK_CATEGORIES.filter(({ name }) => name !== "Text");

  categoriesToEmit.forEach(({ name: categoryName }, idx) => {
    const color = categoryColorMap[categoryName] ?? DEFAULT_COLOR;
    const icon = getCategoryIcon(categoryName);

    if (categoryName === "Variables") {
      // Match expected custom callback key registered in workspace initialization
      xml += `  <category name="${icon} ${categoryName}" colour="${color}" custom="VARIABLE_CUSTOM">\n  </category>\n`;
      emitted.add(categoryName);
      emitted.add("Text");
    } else {
      const blocks = blocksByCategory[categoryName];
      if (blocks && blocks.length > 0) {
        xml += `  <category name="${icon} ${categoryName}" colour="${color}">\n`;
        for (const block of blocks) {
          xml += `    ${generateBlockXml(block)}\n`;
        }
        if (categoryName === "Logic") {
          xml += `    <block type="logic_compare">\n`;
          xml += `      <field name="OP">EQ</field>\n`;
          xml += `      <value name="A">\n`;
          xml += `        <shadow type="math_number">\n`;
          xml += `          <field name="NUM">0</field>\n`;
          xml += `        </shadow>\n`;
          xml += `      </value>\n`;
          xml += `      <value name="B">\n`;
          xml += `        <shadow type="math_number">\n`;
          xml += `          <field name="NUM">0</field>\n`;
          xml += `        </shadow>\n`;
          xml += `      </value>\n`;
          xml += `    </block>\n`;
        }
        xml += `  </category>\n`;
        emitted.add(categoryName);
      }
    }
    if (idx < categoriesToEmit.length - 1) {
      xml += `  <sep gap="8"/>\n`;
    }
  });

  xml += `</xml>`;
  return xml;
}

/**
 * Enforce uniqueness for event handler blocks (e.g., on_button_pressed).
 * Only one handler per button (A, B, AB) can be enabled; others are auto-disabled.
 * Call this function and add the returned listener to your workspace.
 */
export function enforceButtonHandlerUniqueness(workspace: Blockly.Workspace) {
  const checkDuplicates = () => {
    try {
      if (!workspace || (workspace as any).isFlyout) return;
      
      const all = (workspace.getAllBlocks ? workspace.getAllBlocks(false) : []) as Blockly.Block[];
      const groups: Record<string, Blockly.Block[]> = { A: [], B: [], AB: [] };
      
      for (const b of all) {
        if (!b || b.type !== "on_button_pressed") continue;
        if (typeof (b as any).isInFlyout === 'function' && (b as any).isInFlyout()) continue;
        
        const key = (b.getFieldValue && b.getFieldValue("BUTTON")) || "A";
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      }

      // For each button, keep the top-most block enabled and disable others
      Object.keys(groups).forEach((k) => {
        const list = groups[k];
        if (!list || list.length <= 1) {
          // Re-enable single blocks that might have been disabled
          if (list && list.length === 1) {
            const block = list[0];
            const anyBlock: any = block as any;
            const isDisabled = anyBlock.disabled === true;
            
            if (isDisabled) {
              anyBlock.disabled = false;
              
              // Restore original tooltip
              if (anyBlock._originalTooltip) {
                block.setTooltip(anyBlock._originalTooltip);
                delete anyBlock._originalTooltip;
              }
              
              // Force render
              if (block.rendered) {
                try {
                  // Remove CSS classes
                  const svgRoot = anyBlock.getSvgRoot?.() || anyBlock.svgGroup_;
                  if (svgRoot && svgRoot.classList) {
                    svgRoot.classList.remove('blocklyDisabled', 'blocklyDisabledPattern');
                  }
                  (block as any).render();
                } catch (_) {}
              }
            }
          }
          return;
        }
        
        // Sort by Y position (top-most first)
        list.sort((b1, b2) => {
          const pos1 = b1.getRelativeToSurfaceXY ? b1.getRelativeToSurfaceXY() : { y: 0 };
          const pos2 = b2.getRelativeToSurfaceXY ? b2.getRelativeToSurfaceXY() : { y: 0 };
          return pos1.y - pos2.y;
        });
        
        list.forEach((b, idx) => {
          const shouldEnable = idx === 0;
          const anyB: any = b as any;
          const isDisabled = anyB.disabled === true;
          
          if (shouldEnable && isDisabled) {
            // Enable the block
            anyB.disabled = false;
            
            if (anyB._originalTooltip) {
              b.setTooltip(anyB._originalTooltip);
              delete anyB._originalTooltip;
            }
            
            // Force render
            if (b.rendered) {
              try {
                const svgRoot = anyB.getSvgRoot?.() || anyB.svgGroup_;
                if (svgRoot && svgRoot.classList) {
                  svgRoot.classList.remove('blocklyDisabled', 'blocklyDisabledPattern');
                }
                (b as any).render();
              } catch (_) {}
            }
            
          } else if (!shouldEnable && !isDisabled) {
            // Disable the block
            const currentTooltip = b.tooltip || "Run when a button is pressed";
            if (!anyB._originalTooltip) {
              anyB._originalTooltip = currentTooltip;
            }
            
            anyB.disabled = true;
            b.setTooltip(
              "This block is disabled because another 'on button pressed' block with the same button already exists. " +
              "Change the button or remove the duplicate to enable this block."
            );
            
            // Force render
            if (b.rendered) {
              try {
                // Apply CSS classes
                const svgRoot = anyB.getSvgRoot?.() || anyB.svgGroup_;
                if (svgRoot && svgRoot.classList) {
                  svgRoot.classList.add('blocklyDisabled', 'blocklyDisabledPattern');
                }
                (b as any).render();
              } catch (_) {}
            }
          }
        });
      });
    } catch (e) {
      console.warn("Error checking button handler duplicates:", e);
    }
  };

  const listener = (event: any) => {
    if (!event) return;
    const relevantTypes = [
      Blockly.Events.BLOCK_CREATE,
      Blockly.Events.BLOCK_DELETE,
      Blockly.Events.BLOCK_CHANGE,
      Blockly.Events.BLOCK_MOVE,
    ];
    
    // Also check if it's a field change on an on_button_pressed block
    const isButtonFieldChange = 
      event.type === Blockly.Events.BLOCK_CHANGE &&
      event.name === 'BUTTON' &&
      event.blockId;
    
    if (relevantTypes.includes(event.type) || isButtonFieldChange) {
      // Use requestAnimationFrame to batch multiple rapid changes
      requestAnimationFrame(checkDuplicates);
    }
  };

  workspace.addChangeListener(listener);
  
  // Initial check
  setTimeout(checkDuplicates, 100);
  
  return listener;
}

