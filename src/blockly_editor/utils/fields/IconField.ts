import * as Blockly from "blockly";

// Minimal icon picker field that shows a grid of 5x5 previews in a dropdown.
// JSON usage: { type: 'field_icon', name: 'ICON', value: 'HEART' }

const ICON_PATTERNS: Record<string, string[]> = {
  HEART: ["01010", "11111", "11111", "01110", "00100"],
  SMALL_HEART: ["00000", "01010", "01110", "00100", "00000"],
  HAPPY: ["00000", "01010", "00000", "10001", "01110"],
  SAD: ["00000", "01010", "01110", "10001", "00000"],
  YES: ["00001", "00010", "00100", "01000", "10000"],
  NO: ["10001", "01010", "00100", "01010", "10001"],
  SMILE: ["00000", "00000", "00000", "10001", "01110"],
  ASLEEP: ["00100", "00000", "01110", "00000", "11111"],
  SURPRISED: ["00100", "00000", "01010", "00000", "00100"],
  CONFUSED: ["00100", "00000", "01010", "00000", "01010"],
  ANGRY: ["10001", "01010", "00100", "01010", "10001"],
  FABULOUS: ["10001", "01010", "11111", "01010", "10001"],
  MEH: ["00000", "01010", "00000", "01010", "00000"],
  SILLY: ["00000", "01010", "00000", "00010", "00100"],
  GIRAFFE: ["00100", "01110", "00100", "00100", "00100"],
  DUCK: ["01110", "01010", "11111", "01010", "01010"],
  RABBIT: ["01010", "01010", "11111", "10101", "10101"],
  COW: ["11111", "10101", "11111", "10101", "11111"],
  BUTTERFLY: ["10001", "01010", "00100", "01010", "10001"],
  HOUSE: ["00100", "01110", "11111", "10101", "10101"],
  STICKFIGURE: ["00100", "11111", "00100", "01010", "10001"],
  SNAKE: ["00100", "01010", "10001", "01010", "00100"],
};

const ICON_ORDER = [
  "HEART",
  "SMALL_HEART",
  "HAPPY",
  "SAD",
  "YES",
  "NO",
  "SMILE",
  "ASLEEP",
  "SURPRISED",
  "CONFUSED",
  "ANGRY",
  "FABULOUS",
  "MEH",
  "SILLY",
  "GIRAFFE",
  "DUCK",
  "RABBIT",
  "COW",
  "BUTTERFLY",
  "HOUSE",
  "STICKFIGURE",
  "SNAKE",
] as const;

export class IconField extends Blockly.Field {
  // Value is the icon key
  constructor(value = "HEART") {
    super(value);
  }

  static fromJson(options: any) {
    const value = String(options.value ?? options.text ?? "HEART").toUpperCase();
    return new IconField(value);
  }

  // Render text on the block as a human-friendly label
  getText(): string {
    const v = (this.getValue() || "").toString();
    const labelMap: Record<string, string> = {
      HEART: "Heart",
      SMALL_HEART: "Small Heart",
      HAPPY: "Happy",
      SAD: "Sad",
      YES: "Yes",
      NO: "No",
    };
    return labelMap[v] || v;
  }

  // Show a custom dropdown with 5x5 icon previews
  showEditor_() {
    const DropDownDiv = (Blockly as any).DropDownDiv as any;
    DropDownDiv.hideWithoutAnimation();

    const contentDiv = document.createElement("div");
    contentDiv.style.padding = "8px";
    contentDiv.style.maxWidth = "260px";
    contentDiv.style.maxHeight = "260px";
    contentDiv.style.overflow = "auto";
    contentDiv.style.display = "grid";
    contentDiv.style.gridTemplateColumns = "repeat(3, 1fr)";
    contentDiv.style.gap = "8px";

    const makeIconButton = (name: string, pattern: string[]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.border = "1px solid #999";
      btn.style.borderRadius = "6px";
      btn.style.padding = "6px";
      btn.style.background = "#f7f7f9";
      btn.style.cursor = "pointer";
      btn.style.display = "flex";
      btn.style.flexDirection = "column";
      btn.style.alignItems = "center";
      btn.style.gap = "4px";

      // 5x5 preview
      const preview = document.createElement("div");
      preview.style.display = "grid";
      preview.style.gridTemplateColumns = "repeat(5, 8px)";
      preview.style.gridTemplateRows = "repeat(5, 8px)";
      preview.style.gap = "2px";
      preview.style.marginBottom = "2px";

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const cell = document.createElement("div");
          const on = pattern[y].charAt(x) === "1";
          cell.style.width = "8px";
          cell.style.height = "8px";
          cell.style.borderRadius = "2px";
          cell.style.background = on ? "#ffd54f" : "#2f2f2f";
          cell.style.opacity = on ? "1" : "0.35";
          preview.appendChild(cell);
        }
      }

      const caption = document.createElement("div");
      const labelMap: Record<string, string> = {
        HEART: "Heart",
        SMALL_HEART: "Small Heart",
        HAPPY: "Happy",
        SAD: "Sad",
        YES: "Yes",
        NO: "No",
      };
      caption.textContent = labelMap[name] || name;
      caption.style.fontSize = "10px";
      caption.style.color = "#333";

      btn.appendChild(preview);
      btn.appendChild(caption);

      btn.addEventListener("click", () => {
        this.setValue(name);
        if (typeof DropDownDiv.hideIfOwner === "function") DropDownDiv.hideIfOwner(this);
        else if (typeof DropDownDiv.hide === "function") DropDownDiv.hide();
        else DropDownDiv.hideWithoutAnimation();
      });

      return btn;
    };

    ICON_ORDER.forEach((key) => {
      contentDiv.appendChild(makeIconButton(key, ICON_PATTERNS[key]));
    });

    DropDownDiv.getContentDiv().innerHTML = "";
    DropDownDiv.getContentDiv().appendChild(contentDiv);
    DropDownDiv.setColour(this.sourceBlock_?.getColour() || "#1976d2", "#fff");
    DropDownDiv.showPositionedByField(this, () => {});
  }
}

export function registerIconField() {
  (Blockly as any).fieldRegistry.register("field_icon", IconField);
}
