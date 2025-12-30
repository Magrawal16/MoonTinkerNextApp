import { SharedBlockDefinition } from "../sharedBlockDefinitions";
// Side-effect import to register the custom pause time field with Blockly
import "../fields/PauseTimeField";

export const BASIC_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "clear_screen",
    category: "Basic",
    blockDefinition: { type: "clear_screen", message0: "clear screen", previousStatement: null, nextStatement: null, tooltip: "Clear all LEDs on the micro:bit display" },
    pythonPattern: /(?:^|\s)(?:await\s+)?display\.clear\s*\(\s*\)/g,
    pythonGenerator: () => "display.clear()\n",
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("clear_screen"),
  },
  {
    type: "show_string",
    category: "Basic",
    blockDefinition: { type: "show_string", message0: "show string %1", args0: [{ type: "input_value", name: "TEXT", check: "String" }], previousStatement: null, nextStatement: null, tooltip: "Show a string on the display" },
    pythonPattern: /(?:^|\s)(?:await\s+)?basic\.show_string\(\s*(['"])(.*?)\1(?:\s*,\s*[^)]*)?\s*\)/g,
    pythonGenerator: (block, generator) => {
      const text = generator.valueToCode(block, "TEXT", (generator as any).ORDER_NONE) || '""';
      return `basic.show_string(${text})\n`;
    },
    pythonExtractor: (match) => ({ TEXT: match[2] }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_string");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      try {
        const num = workspace.newBlock("text");
      } catch {}
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "show_number",
    category: "Basic",
    blockDefinition: { type: "show_number", message0: "show number %1", args0: [{ type: "input_value", name: "NUM", check: "Number" }], previousStatement: null, nextStatement: null, tooltip: "Show a number on the display" },
    pythonPattern: /(?:^|\s)(?:await\s+)?basic\.show_number\((-?\d+(?:\.\d+)?)\)/g,
    pythonGenerator: (block, generator?: any) => {
      const gen = generator || ({} as any);
      const numCode = gen.valueToCode ? gen.valueToCode(block, "NUM", gen.ORDER_NONE) || "0" : "0";
      return `basic.show_number(${numCode})\n`;
    },
    pythonExtractor: (match) => ({ NUM: parseFloat(match[1]) }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_number");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "basic_show_leds",
    category: "Basic",
    blockDefinition: { type: "basic_show_leds", message0: "show leds %1", args0: [{ type: "field_led_matrix", name: "MATRIX", value: ".....\n.....\n.....\n.....\n....." }], previousStatement: null, nextStatement: null, tooltip: "Draw a 5×5 image and show it on the LED screen" },
    pythonPattern: /(?:^|\s)(?:await\s+)?basic\.show_leds\(\s*(["']){3}([\s\S]*?)\1{3}\s*\)/g,
    pythonGenerator: (block) => {
      const raw = (block.getFieldValue("MATRIX") || "") as string;
      const rows = raw.toString().replace(/\r/g, "").split("\n").slice(0, 5).map((line: string) => {
        const markers = (line.match(/[#.]/g) || []).slice(0, 5);
        while (markers.length < 5) markers.push(".");
        return markers.join(" ");
      });
      while (rows.length < 5) rows.push(". . . . .");
      const body = rows.join("\n");
      return `basic.show_leds("""\n${body}\n""")\n`;
    },
    pythonExtractor: (match) => {
      const inner = match[2] || "";
      const onlyMarkers = inner.replace(/\r/g, "").split("\n");
      const rows: string[] = [];
      for (let y = 0; y < 5; y++) {
        const line = onlyMarkers[y] ?? "";
        const markers = (line.match(/[#.]/g) || []).slice(0, 5);
        while (markers.length < 5) markers.push(".");
        rows.push(markers.join(""));
      }
      return { MATRIX: rows.join("\n") };
    },
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("basic_show_leds");
      block.setFieldValue(values.MATRIX || ".....\n.....\n.....\n.....\n.....", "MATRIX");
      return block;
    },
  },
  {
    type: "pause",
    category: "Basic",
    blockDefinition: { 
      type: "pause", 
      message0: "pause (ms) %1", 
      args0: [{ 
        type: "field_pause_time", 
        name: "TIME", 
        value: 5000
      }], 
      previousStatement: null, 
      nextStatement: null, 
      tooltip: "Pause execution" 
    },
    pythonPattern: /(?:^|\s)(?:await\s+)?basic\.pause\((\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const time = block.getFieldValue("TIME") || "100";
      return `basic.pause(${time})\n`;
    },
    pythonExtractor: (match) => {
      return { TIME: parseInt(match[1]) };
    },
    blockCreator: (workspace, values) => workspace.newBlock("pause"),
  },
  {
    type: "show_icon",
    category: "Basic",
    blockDefinition: { type: "show_icon", message0: "show icon %1", args0: [{ type: "field_icon", name: "ICON", value: "HEART" }], previousStatement: null, nextStatement: null, tooltip: "Show a predefined icon on the LED matrix" },
    pythonPattern: /display\.show\(Image\.([A-Z_]+)\)/g,
    pythonGenerator: (block) => {
      const icon = (block.getFieldValue("ICON") || "HEART").toUpperCase();
      return `display.show(Image.${icon})\n`;
    },
    pythonExtractor: (match) => ({ ICON: match[1]?.toUpperCase() }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_icon");
      const valid = new Set(["HEART","SMALL_HEART","HAPPY","SAD","YES","NO"]);
      const picked = valid.has(values.ICON) ? values.ICON : "HEART";
      block.setFieldValue(picked, "ICON");
      return block;
    },
  },
  {
    type: "forever",
    category: "Basic",
    blockDefinition: { type: "forever", message0: "forever %1 %2", args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }], tooltip: "Runs code forever" },
    pythonPattern: /((?:async\s+)?def\s+on_forever\(\s*\)\s*:|basic\.forever\(\s*on_forever\s*\)|while\s+True\s*:)/g,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      let needsAsync = false;
      try {
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) {
            if (d && d.type === "music_record_and_play") { needsAsync = true; break; }
          }
        }
      } catch {}
      const body = statements && statements.trim().length ? statements : `${IND}pass\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def on_forever():\n${body}basic.forever(on_forever)\n`;
    },
    pythonExtractor: (_match) => ({ STATEMENTS: "" }),
    blockCreator: (workspace) => workspace.newBlock("forever"),
  },
  {
    type: "on_start",
    category: "Basic",
    blockDefinition: { type: "on_start", message0: "on start %1 %2", args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }], tooltip: "Runs once at the start" },
    pythonPattern: /(?:async\s+)?def\s+on_start\(\s*\)\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      let needsAsync = false;
      try {
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) { if (d && d.type === "music_record_and_play") { needsAsync = true; break; } }
        }
      } catch {}
      const bodyIndented = statements && statements.trim().length ? statements : `${IND}pass\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def on_start():\n${bodyIndented}\n${needsAsync ? "await " : ""}on_start()\n`;
    },
    pythonExtractor: (match) => ({ STATEMENTS: match[1].trim() }),
    blockCreator: (workspace) => workspace.newBlock("on_start"),
  },
];
