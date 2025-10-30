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
  private previewEl?: HTMLDivElement; // Interactive 5x5 LED grid on the block
  
  // Mark as editable so Blockly allows clicks
  EDITABLE = true;

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

  // Return empty string so we can render custom HTML instead
  getText(): string {
    return "";
  }

  // Provide current value stored in the field (5x5 with '#' and '.')
  getValue(): string {
    if (!this.pattern) {
      return LedMatrixField.defaultPattern();
    }
    return this.pattern.join("\n");
  }

  // Update the internal pattern and refresh preview
  setValue(newValue: any) {
    const str = String(newValue ?? "");
    
    // Initialize pattern if not already set
    if (!this.pattern) {
      this.pattern = LedMatrixField.normalizeToRows(LedMatrixField.defaultPattern());
    }
    
    const oldValue = this.getValue();
    this.pattern = LedMatrixField.normalizeToRows(str);
    const newValueStr = this.pattern.join("\n");
    
    // Always update to ensure change events fire
    if (oldValue !== newValueStr) {
      super.setValue(newValueStr);
      this.updateInlinePreview();
      
      // Force a block change event to regenerate code
      if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
        Blockly.Events.fire(
          new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(
            this.sourceBlock_,
            'field',
            this.name || 'MATRIX',
            oldValue,
            newValueStr
          )
        );
      }
    }
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

  // Override initView to render the LED matrix directly on the block
  protected initView() {
    // Create the field group and border rect (standard Blockly elements)
    this.createBorderRect_();
    
    // Create text element (required by Blockly)
    this.createTextElement_();
    
    // Hide the text element since we're using custom rendering
    if (this.textElement_) {
      this.textElement_.style.display = "none";
    }

    // Create a foreignObject to embed HTML content for the LED matrix
    const size = this.getSize();
    const foreignObject = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.FOREIGNOBJECT,
      {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
      },
      this.fieldGroup_
    );
    
    // Make foreignObject accept pointer events
    foreignObject.setAttribute("pointer-events", "all");
    foreignObject.style.pointerEvents = "all";

    // Create the inline preview container
    this.previewEl = document.createElement("div");
    this.previewEl.style.display = "grid";
    this.previewEl.style.gridTemplateColumns = "repeat(5, 16px)";
    this.previewEl.style.gridTemplateRows = "repeat(5, 16px)";
    this.previewEl.style.gap = "3px";
    this.previewEl.style.padding = "4px";
    this.previewEl.style.cursor = "pointer";
    this.previewEl.style.userSelect = "none";

    foreignObject.appendChild(this.previewEl);
    this.updateInlinePreview();
  }

  // Override getSize to provide proper dimensions for the LED matrix
  getSize(): { width: number; height: number } {
    // 5 LEDs × 16px + 4 gaps × 3px + padding 4px × 2 = 80 + 12 + 8 = 100px
    return { width: 100, height: 100 };
  }

  // Recreate child squares based on current pattern - no click handlers, just display
  private updateInlinePreview() {
    if (!this.previewEl) return;
    
    // Ensure pattern is initialized
    if (!this.pattern) {
      this.pattern = LedMatrixField.normalizeToRows(LedMatrixField.defaultPattern());
    }
    
    // Always recreate for simplicity
    this.previewEl.innerHTML = "";
    
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const cell = document.createElement("div");
        const on = this.pattern[y]?.charAt(x) === "#";
        cell.style.width = "16px";
        cell.style.height = "16px";
        cell.style.borderRadius = "2px";
        cell.style.background = on ? "#ffd54f" : "#4848cbff";
        cell.style.opacity = on ? "1" : "0.5";
        cell.style.border = "1px solid #666";
        
        this.previewEl.appendChild(cell);
      }
    }
  }

  // Open a clickable editor when field is clicked
  protected override showEditor_(): void {
    const DropDownDiv = (Blockly as any).DropDownDiv;
    
    // Create editor container
    const editor = document.createElement("div");
    editor.style.padding = "12px";
    editor.style.backgroundColor = "#2a2a2a";
    editor.style.borderRadius = "8px";
    editor.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    
    // Title
    const title = document.createElement("div");
    title.textContent = "Click LEDs to toggle";
    title.style.color = "#fff";
    title.style.fontSize = "12px";
    title.style.marginBottom = "8px";
    title.style.textAlign = "center";
    editor.appendChild(title);
    
    // LED Grid
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(5, 32px)";
    grid.style.gridTemplateRows = "repeat(5, 32px)";
    grid.style.gap = "4px";
    grid.style.marginBottom = "10px";
    
    // Create LED cells
    const cells: HTMLDivElement[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const cell = document.createElement("div");
        const on = this.pattern[y]?.charAt(x) === "#";
        cell.style.width = "32px";
        cell.style.height = "32px";
        cell.style.borderRadius = "4px";
        cell.style.background = on ? "#ffd54f" : "#1a1a1a";
        cell.style.border = "2px solid #555";
        cell.style.cursor = "pointer";
        cell.style.transition = "all 0.1s";
        
        // Click to toggle
        cell.addEventListener("click", () => {
          // Get old value BEFORE any changes
          const oldValue = this.pattern.join("\n");
          
          const row = this.pattern[y].split("");
          row[x] = row[x] === "#" ? "." : "#";
          this.pattern[y] = row.join("");
          
          // Update visual
          const newState = row[x] === "#";
          cell.style.background = newState ? "#ffd54f" : "#1a1a1a";
          
          const newValue = this.pattern.join("\n");
          
          // Update using setValue to ensure proper state management
          super.setValue(newValue);
          
          // Fire change event to trigger code regeneration
          if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
            Blockly.Events.fire(
              new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(
                this.sourceBlock_,
                'field',
                this.name || 'MATRIX',
                oldValue,
                newValue
              )
            );
          }
          
          // Update the inline preview
          this.updateInlinePreview();
        });
        
        // Hover effect
        cell.addEventListener("mouseenter", () => {
          cell.style.transform = "scale(1.05)";
          cell.style.borderColor = "#ffd54f";
        });
        
        cell.addEventListener("mouseleave", () => {
          cell.style.transform = "scale(1)";
          cell.style.borderColor = "#555";
        });
        
        cells.push(cell);
        grid.appendChild(cell);
      }
    }
    editor.appendChild(grid);
    
    // Action buttons
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.justifyContent = "center";
    
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.style.padding = "6px 16px";
    clearBtn.style.backgroundColor = "#444";
    clearBtn.style.color = "#fff";
    clearBtn.style.border = "none";
    clearBtn.style.borderRadius = "4px";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.fontSize = "12px";
    clearBtn.addEventListener("click", () => {
      const oldValue = this.pattern.join("\n");
      this.pattern = LedMatrixField.normalizeToRows(LedMatrixField.defaultPattern());
      const newValue = this.pattern.join("\n");
      
      // Update using setValue to ensure proper state management
      super.setValue(newValue);
      
      // Fire change event
      if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
        Blockly.Events.fire(
          new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(
            this.sourceBlock_,
            'field',
            this.name || 'MATRIX',
            oldValue,
            newValue
          )
        );
      }
      
      // Refresh cells
      for (let i = 0; i < 25; i++) {
        cells[i].style.background = "#1a1a1a";
      }
      
      // Update inline preview
      this.updateInlinePreview();
    });
    
    const invertBtn = document.createElement("button");
    invertBtn.textContent = "Invert";
    invertBtn.style.padding = "6px 16px";
    invertBtn.style.backgroundColor = "#444";
    invertBtn.style.color = "#fff";
    invertBtn.style.border = "none";
    invertBtn.style.borderRadius = "4px";
    invertBtn.style.cursor = "pointer";
    invertBtn.style.fontSize = "12px";
    invertBtn.addEventListener("click", () => {
      const oldValue = this.pattern.join("\n");
      this.pattern = this.pattern.map(row =>
        row.split("").map(c => c === "#" ? "." : "#").join("")
      );
      const newValue = this.pattern.join("\n");
      
      // Update using setValue to ensure proper state management
      super.setValue(newValue);
      
      // Fire change event
      if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
        Blockly.Events.fire(
          new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(
            this.sourceBlock_,
            'field',
            this.name || 'MATRIX',
            oldValue,
            newValue
          )
        );
      }
      
      // Refresh cells
      for (let i = 0; i < 25; i++) {
        const y = Math.floor(i / 5);
        const x = i % 5;
        const on = this.pattern[y]?.charAt(x) === "#";
        cells[i].style.background = on ? "#ffd54f" : "#1a1a1a";
      }
      
      // Update inline preview
      this.updateInlinePreview();
    });
    
    actions.appendChild(clearBtn);
    actions.appendChild(invertBtn);
    editor.appendChild(actions);
    
    // Show the editor
    DropDownDiv.clearContent();
    DropDownDiv.getContentDiv().appendChild(editor);
    DropDownDiv.setColour("#2a2a2a", "#2a2a2a");
    DropDownDiv.showPositionedByField(this, () => {
      // On close, update the inline preview
      this.updateInlinePreview();
    });
  }
}

export function registerLedMatrixField() {
  (Blockly as any).fieldRegistry.register("field_led_matrix", LedMatrixField);
}
