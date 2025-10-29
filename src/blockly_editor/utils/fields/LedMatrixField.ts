import * as Blockly from "blockly";

/**
 * LedMatrixField — a 5x5 clickable LED matrix editor as a custom Blockly field.
 *
 * Value format: a 5-line string using '#' for on and '.' for off, separated by newlines.
 * Example:
 *   "#....\n.###.\n.#.#.\n.###.\n.#..."
 *
 * JSON usage:
 *   { type: 'field_led_matrix', name: 'MATRIX', value: ".....\n.....\n.....\n.....\n....." }
 */
export class LedMatrixField extends Blockly.Field {
  private pattern: string[]; // 5 strings of length 5 composed of '#' or '.'
  private previewEl?: HTMLDivElement; // small inline preview on the block
  private onOutsidePointerDown?: (e: Event) => void;
  private onKeyDown?: (e: KeyboardEvent) => void;

  constructor(value?: string) {
    super(value || LedMatrixField.defaultPattern());
    this.pattern = LedMatrixField.normalizeToRows(
      (value as string) || LedMatrixField.defaultPattern()
    );
  }

  // For JSON registration
  static fromJson(options: any): LedMatrixField {
    const value = String(options.value ?? options.text ?? LedMatrixField.defaultPattern());
    return new LedMatrixField(value);
  }

  // Return a user-friendly label in the block so there's a visible, clickable area.
  // Keep it short; the detailed editor opens in a dropdown.
  getText(): string {
    return "edit";
  }

  // Provide current value stored in the field (5x5 with '#' and '.')
  getValue(): string {
    return this.pattern.join("\n");
  }

  // Update the internal pattern and refresh preview
  setValue(newValue: any) {
    const str = String(newValue ?? "");
    this.pattern = LedMatrixField.normalizeToRows(str);
    super.setValue(this.pattern.join("\n"));
    this.updateInlinePreview();
  }

  // Default empty pattern
  static defaultPattern(): string {
    return [".....", ".....", ".....", ".....", "....."].join("\n");
  }

  // Convert any incoming string into exactly 5 rows x 5 cols of '.'/'#'
  private static normalizeToRows(value: string): string[] {
    const cleaned = (value || "")
      .replace(/\r/g, "")
      .split("\n")
      .filter(() => true);

    const rows: string[] = [];
    for (let y = 0; y < 5; y++) {
      const line = cleaned[y] ?? "";
      // Extract only markers; accept either '#' or '.'; ignore spaces and other chars
      const markers = (line.match(/[#.]/g) || []).slice(0, 5);
      while (markers.length < 5) markers.push(".");
      rows.push(markers.join(""));
    }
    return rows;
  }

  // Use default Field rendering (border + text). We intentionally don't override initView
  // with HTML/SVG injections to keep compatibility with Blockly 12's renderer.

  // Recreate child squares based on current pattern
  private updateInlinePreview() {
    if (!this.previewEl) return;
    this.previewEl.innerHTML = "";
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const cell = document.createElement("div");
        const on = this.pattern[y]?.charAt(x) === "#";
        cell.style.width = "8px";
        cell.style.height = "8px";
        cell.style.borderRadius = "2px";
        cell.style.background = on ? "#ffd54f" : "#2f2f2f";
        cell.style.opacity = on ? "1" : "0.35";
        this.previewEl.appendChild(cell);
      }
    }
  }

  // Open an interactive dropdown editor to toggle cells
  showEditor_() {
    const DropDownDiv = (Blockly as any).DropDownDiv as any;
    DropDownDiv.hideWithoutAnimation();

    const container = document.createElement("div");
    container.style.padding = "10px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(5, 24px)";
    grid.style.gridTemplateRows = "repeat(5, 24px)";
    grid.style.gap = "4px";

    const cells: HTMLDivElement[] = [];
    const redraw = () => {
      for (let i = 0; i < cells.length; i++) {
        const y = Math.floor(i / 5);
        const x = i % 5;
        const on = this.pattern[y]?.charAt(x) === "#";
        const el = cells[i];
        el.style.background = on ? "#ffd54f" : "#2f2f2f";
        el.style.opacity = on ? "1" : "0.35";
      }
    };

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const btn = document.createElement("div");
        btn.style.width = "24px";
        btn.style.height = "24px";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.border = "1px solid #999";
        btn.addEventListener("click", () => {
          const row = this.pattern[y].split("");
          row[x] = row[x] === "#" ? "." : "#";
          this.pattern[y] = row.join("");
          // Commit immediately so change events fire and Python updates
          super.setValue(this.pattern.join("\n"));
          redraw();
          this.updateInlinePreview();
        });
        cells.push(btn);
        grid.appendChild(btn);
      }
    }

    redraw();
    container.appendChild(grid);

    // Quick actions row
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "space-between";
    actions.style.gap = "8px";

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.type = "button";
    clearBtn.style.padding = "6px 10px";
    clearBtn.style.border = "1px solid #bbb";
    clearBtn.style.borderRadius = "6px";
    clearBtn.style.background = "#fff";
    clearBtn.addEventListener("click", () => {
      this.pattern = LedMatrixField.normalizeToRows(LedMatrixField.defaultPattern());
      super.setValue(this.pattern.join("\n"));
      redraw();
      this.updateInlinePreview();
    });

    const invertBtn = document.createElement("button");
    invertBtn.textContent = "Invert";
    invertBtn.type = "button";
    invertBtn.style.padding = "6px 10px";
    invertBtn.style.border = "1px solid #bbb";
    invertBtn.style.borderRadius = "6px";
    invertBtn.style.background = "#fff";
    invertBtn.addEventListener("click", () => {
      this.pattern = this.pattern.map((row) =>
        row
          .split("")
          .map((c) => (c === "#" ? "." : "#"))
          .join("")
      );
      super.setValue(this.pattern.join("\n"));
      redraw();
      this.updateInlinePreview();
    });

    actions.appendChild(clearBtn);
    actions.appendChild(invertBtn);
    container.appendChild(actions);

    const DropDown = (Blockly as any).DropDownDiv as any;
    DropDown.getContentDiv().innerHTML = "";
    DropDown.getContentDiv().appendChild(container);
    DropDown.setColour(this.sourceBlock_?.getColour() || "#1565c0", "#fff");
    DropDown.showPositionedByField(this, this.onDropdownClose_.bind(this));

    // Dismiss on outside click / escape
    setTimeout(() => {
      const content = DropDown.getContentDiv?.() || container;

      this.onOutsidePointerDown = (ev: Event) => {
        const target = ev.target as Node | null;
        if (target && content && !content.contains(target)) {
          if (typeof DropDown.hideIfOwner === "function") DropDown.hideIfOwner(this);
          else if (typeof DropDown.hide === "function") DropDown.hide();
          else DropDown.hideWithoutAnimation();
          document.removeEventListener("pointerdown", this.onOutsidePointerDown!, true);
          window.removeEventListener("keydown", this.onKeyDown!, true);
          this.onOutsidePointerDown = undefined;
          this.onKeyDown = undefined;
        }
      };

      this.onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (typeof DropDown.hideIfOwner === "function") DropDown.hideIfOwner(this);
          else if (typeof DropDown.hide === "function") DropDown.hide();
          else DropDown.hideWithoutAnimation();
          document.removeEventListener("pointerdown", this.onOutsidePointerDown!, true);
          window.removeEventListener("keydown", this.onKeyDown!, true);
          this.onOutsidePointerDown = undefined;
          this.onKeyDown = undefined;
        }
      };

      document.addEventListener("pointerdown", this.onOutsidePointerDown, true);
      window.addEventListener("keydown", this.onKeyDown, true);
    }, 0);
  }

  private onDropdownClose_() {
    // Ensure cleanup
    if (this.onOutsidePointerDown) {
      document.removeEventListener("pointerdown", this.onOutsidePointerDown, true);
      this.onOutsidePointerDown = undefined;
    }
    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown, true);
      this.onKeyDown = undefined;
    }
  }
}

export function registerLedMatrixField() {
  (Blockly as any).fieldRegistry.register("field_led_matrix", LedMatrixField);
}
