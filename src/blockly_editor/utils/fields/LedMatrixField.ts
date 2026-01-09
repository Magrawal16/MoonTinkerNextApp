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

    // Create the inline preview container with modern styling
    this.previewEl = document.createElement("div");
    this.previewEl.style.display = "grid";
    this.previewEl.style.gridTemplateColumns = "repeat(5, 18px)";
    this.previewEl.style.gridTemplateRows = "repeat(5, 18px)";
    this.previewEl.style.gap = "3px";
    this.previewEl.style.padding = "6px";
    this.previewEl.style.backgroundColor = "rgba(15, 23, 42, 0.4)";
    this.previewEl.style.borderRadius = "6px";
    this.previewEl.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    this.previewEl.style.cursor = "pointer";
    this.previewEl.style.userSelect = "none";
    this.previewEl.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.2)";

    foreignObject.appendChild(this.previewEl);
    this.updateInlinePreview();
  }

  // Override getSize to provide proper dimensions for the LED matrix
  getSize(): { width: number; height: number } {
    // 5 LEDs × 18px + 4 gaps × 3px + padding 6px × 2 = 90 + 12 + 12 = 114px
    return { width: 114, height: 114 };
  }

  // Recreate child squares based on current pattern with modern styling
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
        cell.style.width = "18px";
        cell.style.height = "18px";
        cell.style.borderRadius = "3px";
        cell.style.background = on 
          ? "linear-gradient(135deg, #FF5252 0%, #F44336 100%)" 
          : "linear-gradient(135deg, #475569 0%, #334155 100%)";
        cell.style.boxShadow = on 
          ? "0 0 12px rgba(244, 67, 54, 0.8), inset 0 1px 2px rgba(255, 255, 255, 0.3)" 
          : "inset 0 2px 4px rgba(0,0,0,0.4)";
        cell.style.border = on ? "1px solid #FF8A80" : "1px solid #1E293B";
        cell.style.transition = "all 0.2s ease";
        
        this.previewEl.appendChild(cell);
      }
    }
  }

  // Open a clickable editor when field is clicked
  protected override showEditor_(): void {
    const DropDownDiv = (Blockly as any).DropDownDiv;
    
    // Create editor container with blue theme and transparency to match block
    const editor = document.createElement("div");
    editor.style.padding = "16px";
    editor.style.width = "255px";
    editor.style.backgroundColor = "rgba(72, 72, 203, 0.7)"; // Blue theme matching block - more transparent
    editor.style.backdropFilter = "blur(12px)";
    (editor.style as any).webkitBackdropFilter = "blur(12px)"; // Safari support
    editor.style.borderRadius = "12px";
    editor.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.2)";
    editor.style.border = "1px solid rgba(255,255,255,0.3)";
    
    // Title with modern styling
    const title = document.createElement("div");
    title.textContent = "� LED Matrix Editor";
    title.style.color = "#FFFFFF";
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";
    title.style.marginBottom = "12px";
    title.style.textAlign = "center";
    title.style.letterSpacing = "0.5px";
    title.style.textShadow = "0 2px 4px rgba(0,0,0,0.3)";
    editor.appendChild(title);
    
    // LED Grid with blue-themed glassmorphic design
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(5, 36px)";
    grid.style.gridTemplateRows = "repeat(5, 36px)";
    grid.style.gap = "5px";
    grid.style.marginBottom = "14px";
    grid.style.padding = "10px";
    grid.style.backgroundColor = "rgba(50, 50, 180, 0.3)"; // Blue background - more transparent
    grid.style.borderRadius = "10px";
    grid.style.border = "1px solid rgba(255,255,255,0.2)";
    grid.style.boxShadow = "inset 0 2px 8px rgba(0,0,0,0.3)";
    
    // Create LED cells with premium styling
    const cells: HTMLDivElement[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const cell = document.createElement("div");
        const on = this.pattern[y]?.charAt(x) === "#";
        cell.style.width = "36px";
        cell.style.height = "36px";
        cell.style.borderRadius = "6px";
        cell.style.background = on 
          ? "linear-gradient(135deg, #FF5252 0%, #F44336 50%, #E53935 100%)" 
          : "linear-gradient(135deg, #5A5AFF 0%, #4848CB 100%)"; // Brighter blue when off
        cell.style.boxShadow = on 
          ? "0 0 20px rgba(244, 67, 54, 0.9), 0 4px 12px rgba(244, 67, 54, 0.5), inset 0 1px 3px rgba(255, 255, 255, 0.3)" 
          : "inset 0 2px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)";
        cell.style.border = on ? "2px solid #FF8A80" : "2px solid rgba(255,255,255,0.2)";
        cell.style.cursor = "pointer";
        cell.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
        
        // Click to toggle
        cell.addEventListener("click", () => {
          // Get old value BEFORE any changes
          const oldValue = this.pattern.join("\n");
          
          const row = this.pattern[y].split("");
          row[x] = row[x] === "#" ? "." : "#";
          this.pattern[y] = row.join("");
          
          // Update visual with gradient
          const newState = row[x] === "#";
          cell.style.background = newState 
            ? "linear-gradient(135deg, #FF5252 0%, #F44336 50%, #E53935 100%)" 
            : "linear-gradient(135deg, #5A5AFF 0%, #4848CB 100%)"; // Brighter blue when off
          cell.style.boxShadow = newState 
            ? "0 0 20px rgba(244, 67, 54, 0.9), 0 4px 12px rgba(244, 67, 54, 0.5), inset 0 1px 3px rgba(255, 255, 255, 0.3)" 
            : "inset 0 2px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)";
          cell.style.border = newState ? "2px solid #FF8A80" : "2px solid rgba(255,255,255,0.2)";
          
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
        
        // Enhanced hover effect with smooth animations
        cell.addEventListener("mouseenter", () => {
          const isOn = this.pattern[y]?.charAt(x) === "#";
          cell.style.transform = "scale(1.08) translateY(-1px)";
          cell.style.filter = "brightness(1.25)";
          if (!isOn) {
            cell.style.background = "linear-gradient(135deg, #7A7AFF 0%, #6868FF 100%)"; // Even brighter blue on hover
          } else {
            cell.style.boxShadow = "0 0 25px rgba(255, 193, 7, 1), 0 6px 16px rgba(255, 193, 7, 0.6), inset 0 1px 3px rgba(255, 255, 255, 0.4)";
          }
        });
        
        cell.addEventListener("mouseleave", () => {
          const isOn = this.pattern[y]?.charAt(x) === "#";
          cell.style.transform = "scale(1) translateY(0)";
          cell.style.filter = "brightness(1)";
          if (!isOn) {
            cell.style.background = "linear-gradient(135deg, #5A5AFF 0%, #4848CB 100%)";
          } else {
            cell.style.boxShadow = "0 0 20px rgba(255, 193, 7, 0.9), 0 4px 12px rgba(255, 193, 7, 0.5), inset 0 1px 3px rgba(255, 255, 255, 0.3)";
          }
        });
        
        cells.push(cell);
        grid.appendChild(cell);
      }
    }
    editor.appendChild(grid);
    
    // Action buttons with blue-themed glassmorphic design
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "10px";
    actions.style.justifyContent = "center";
    
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "🗑️ Clear";
    clearBtn.style.padding = "6px 10px";
    clearBtn.style.flex = "1";
    clearBtn.style.backgroundColor = "rgba(72, 72, 203, 0.6)"; // Matching blue theme - more transparent
    clearBtn.style.color = "#FFFFFF";
    clearBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    clearBtn.style.borderRadius = "8px";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.fontSize = "11px";
    clearBtn.style.fontWeight = "600";
    clearBtn.style.whiteSpace = "nowrap";
    clearBtn.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    clearBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    clearBtn.style.backdropFilter = "blur(4px)";
    clearBtn.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
    
    // Hover effects for Clear button
    clearBtn.addEventListener("mouseenter", () => {
      clearBtn.style.backgroundColor = "rgba(90, 90, 220, 0.8)";
      clearBtn.style.transform = "translateY(-2px)";
      clearBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    });
    clearBtn.addEventListener("mouseleave", () => {
      clearBtn.style.backgroundColor = "rgba(72, 72, 203, 0.6)";
      clearBtn.style.transform = "translateY(0)";
      clearBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    });
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
      
      // Refresh cells with blue gradient styling
      for (let i = 0; i < 25; i++) {
        cells[i].style.background = "linear-gradient(135deg, #5A5AFF 0%, #4848CB 100%)";
        cells[i].style.boxShadow = "inset 0 2px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)";
        cells[i].style.border = "2px solid rgba(255,255,255,0.2)";
      }
      
      // Update inline preview
      this.updateInlinePreview();
    });
    
    const invertBtn = document.createElement("button");
    invertBtn.textContent = "🔄 Invert";
    invertBtn.style.padding = "6px 10px";
    invertBtn.style.flex = "1";
    invertBtn.style.backgroundColor = "rgba(255, 193, 7, 0.7)";
    invertBtn.style.color = "#000000";
    invertBtn.style.border = "1px solid rgba(255,255,255,0.25)";
    invertBtn.style.borderRadius = "8px";
    invertBtn.style.cursor = "pointer";
    invertBtn.style.fontSize = "11px";
    invertBtn.style.fontWeight = "600";
    invertBtn.style.whiteSpace = "nowrap";
    invertBtn.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    invertBtn.style.boxShadow = "0 2px 8px rgba(255, 193, 7, 0.4), 0 0 20px rgba(255, 193, 7, 0.2)";
    invertBtn.style.backdropFilter = "blur(4px)";
    invertBtn.style.textShadow = "0 1px 2px rgba(255,255,255,0.3)";
    
    // Hover effects for Invert button
    invertBtn.addEventListener("mouseenter", () => {
      invertBtn.style.backgroundColor = "rgba(255, 214, 51, 0.9)";
      invertBtn.style.transform = "translateY(-2px)";
      invertBtn.style.boxShadow = "0 4px 16px rgba(255, 193, 7, 0.6), 0 0 30px rgba(255, 193, 7, 0.3)";
    });
    invertBtn.addEventListener("mouseleave", () => {
      invertBtn.style.backgroundColor = "rgba(255, 193, 7, 0.7)";
      invertBtn.style.transform = "translateY(0)";
      invertBtn.style.boxShadow = "0 2px 8px rgba(255, 193, 7, 0.4), 0 0 20px rgba(255, 193, 7, 0.2)";
    });
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
      
      // Refresh cells with gradient styling
      for (let i = 0; i < 25; i++) {
        const y = Math.floor(i / 5);
        const x = i % 5;
        const on = this.pattern[y]?.charAt(x) === "#";
        cells[i].style.background = on 
          ? "linear-gradient(135deg, #FFD93D 0%, #FFC107 50%, #FFB300 100%)" 
          : "linear-gradient(135deg, #5A5AFF 0%, #4848CB 100%)"; // Brighter blue when off
        cells[i].style.boxShadow = on 
          ? "0 0 20px rgba(255, 193, 7, 0.9), 0 4px 12px rgba(255, 193, 7, 0.5), inset 0 1px 3px rgba(255, 255, 255, 0.3)" 
          : "inset 0 2px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)";
        cells[i].style.border = on ? "2px solid #FFE082" : "2px solid rgba(255,255,255,0.2)";
      }
      
      // Update inline preview
      this.updateInlinePreview();
    });
    
    const okBtn = document.createElement("button");
    okBtn.textContent = "✓OK";
    okBtn.style.padding = "6px 10px";
    okBtn.style.flex = "1";
    okBtn.style.backgroundColor = "rgba(76, 175, 80, 0.8)";
    okBtn.style.color = "#ffffff";
    okBtn.style.border = "1px solid rgba(255,255,255,0.25)";
    okBtn.style.borderRadius = "8px";
    okBtn.style.cursor = "pointer";
    okBtn.style.fontSize = "11px";
    okBtn.style.fontWeight = "600";
    okBtn.style.whiteSpace = "nowrap";
    okBtn.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    okBtn.style.boxShadow = "0 2px 8px rgba(76, 175, 80, 0.4), 0 0 20px rgba(76, 175, 80, 0.2)";
    okBtn.style.backdropFilter = "blur(4px)";
    okBtn.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
    
    // Hover effects for OK button
    okBtn.addEventListener("mouseenter", () => {
      okBtn.style.backgroundColor = "rgba(102, 187, 106, 0.9)";
      okBtn.style.transform = "translateY(-2px)";
      okBtn.style.boxShadow = "0 4px 16px rgba(76, 175, 80, 0.6), 0 0 30px rgba(76, 175, 80, 0.3)";
    });
    okBtn.addEventListener("mouseleave", () => {
      okBtn.style.backgroundColor = "rgba(76, 175, 80, 0.8)";
      okBtn.style.transform = "translateY(0)";
      okBtn.style.boxShadow = "0 2px 8px rgba(76, 175, 80, 0.4), 0 0 20px rgba(76, 175, 80, 0.2)";
    });
    okBtn.addEventListener("click", () => {
      // Close the dropdown editor
      DropDownDiv.hideIfOwner(this);
    });
    
    actions.appendChild(clearBtn);
    actions.appendChild(invertBtn);
    actions.appendChild(okBtn);
    editor.appendChild(actions);
    
    // Show the editor with blue-themed transparent background
    DropDownDiv.clearContent();
    const contentDiv = DropDownDiv.getContentDiv();
    contentDiv.appendChild(editor);
    
    // Set blue transparent background color to match block theme - more transparent
    DropDownDiv.setColour("rgba(72, 72, 203, 0.7)", "rgba(72, 72, 203, 0.7)");
    
    DropDownDiv.showPositionedByField(this, () => {
      // On close, update the inline preview
      this.updateInlinePreview();
    });
  }
}

export function registerLedMatrixField() {
  (Blockly as any).fieldRegistry.register("field_led_matrix", LedMatrixField);
}
