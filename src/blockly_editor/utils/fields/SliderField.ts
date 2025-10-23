import * as Blockly from "blockly";

/**
 * Minimal slider field for Blockly using DropDownDiv and <input type="range">.
 * JSON usage: { type: 'field_slider', name: 'BRIGHTNESS', value: 255, min: 0, max: 255, precision: 1 }
 */
export class SliderField extends Blockly.FieldNumber {
  private sliderMin: number;
  private sliderMax: number;
  private sliderStep: number;
  private sliderInput?: HTMLInputElement;
  private valueLabel?: HTMLSpanElement;
  private onOutsidePointerDown?: (e: Event) => void;
  private onKeyDown?: (e: KeyboardEvent) => void;

  constructor(value = 0, opt_config?: { min?: number; max?: number; precision?: number }) {
    super(value, opt_config?.min, opt_config?.max, opt_config?.precision);
    this.sliderMin = opt_config?.min ?? 0;
    this.sliderMax = opt_config?.max ?? 100;
    this.sliderStep = opt_config?.precision ?? 1;
  }

  static fromJson(options: any): SliderField {
    const value = Number(options.value ?? options.text ?? 0);
    const min = options.min != null ? Number(options.min) : undefined;
    const max = options.max != null ? Number(options.max) : undefined;
    const precision = options.precision != null ? Number(options.precision) : 1;
    const field = new SliderField(value, { min, max, precision });
    // Name is assigned by Blockly when inflating JSON into a block; no need to set here.
    return field;
  }

  // Override to show a slider popup instead of plain text editor
  showEditor_() {
  const DropDownDiv = (Blockly as any).DropDownDiv as any;
    DropDownDiv.hideWithoutAnimation();

    const contentDiv = document.createElement("div");
    contentDiv.style.padding = "8px 12px";
    contentDiv.style.minWidth = "180px";

    const label = document.createElement("div");
    label.style.display = "flex";
    label.style.justifyContent = "space-between";
    label.style.alignItems = "center";
    label.style.marginBottom = "8px";

    const title = document.createElement("span");
    title.textContent = this.getText() ? this.getText().split(" ")[0] : "Brightness";

    const valueEl = document.createElement("span");
    valueEl.style.fontWeight = "600";
    valueEl.textContent = String(this.getValue());
    this.valueLabel = valueEl;

    label.appendChild(title);
    label.appendChild(valueEl);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(this.sliderMin);
    slider.max = String(this.sliderMax);
    slider.step = String(this.sliderStep);
    slider.value = String(this.getValue());
    slider.style.width = "100%";

    slider.addEventListener("input", () => {
      const num = Number(slider.value);
      this.setValue(num);
      if (this.valueLabel) this.valueLabel.textContent = String(num);
    });

    contentDiv.appendChild(label);
    contentDiv.appendChild(slider);

    this.sliderInput = slider;

    DropDownDiv.getContentDiv().innerHTML = "";
    DropDownDiv.getContentDiv().appendChild(contentDiv);

    DropDownDiv.setColour(this.sourceBlock_?.getColour() || "#673ab7", "#fff");
    DropDownDiv.showPositionedByField(this, this.onDropdownClose_.bind(this));

    // Close when clicking anywhere outside the dropdown content or pressing Escape.
    // Important: attach on the next macrotask so we don't immediately close due to the same click
    // that opened the editor (click/mousedown sequence that triggered showEditor_).
    setTimeout(() => {
      const container = (Blockly as any).DropDownDiv.getContentDiv?.() || contentDiv;

      this.onOutsidePointerDown = (ev: Event) => {
        const target = ev.target as Node | null;
        // If the click is not inside the dropdown container, hide it
        if (target && container && !container.contains(target)) {
          if (typeof DropDownDiv.hideIfOwner === "function") {
            DropDownDiv.hideIfOwner(this);
          } else if (typeof DropDownDiv.hide === "function") {
            DropDownDiv.hide();
          } else {
            DropDownDiv.hideWithoutAnimation();
          }
          // Cleanup listeners immediately after hiding
          document.removeEventListener("pointerdown", this.onOutsidePointerDown!, true);
          window.removeEventListener("keydown", this.onKeyDown!, true);
          this.onOutsidePointerDown = undefined;
          this.onKeyDown = undefined;
        }
      };

      this.onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          if (typeof DropDownDiv.hideIfOwner === "function") {
            DropDownDiv.hideIfOwner(this);
          } else if (typeof DropDownDiv.hide === "function") {
            DropDownDiv.hide();
          } else {
            DropDownDiv.hideWithoutAnimation();
          }
          document.removeEventListener("pointerdown", this.onOutsidePointerDown!, true);
          window.removeEventListener("keydown", this.onKeyDown!, true);
          this.onOutsidePointerDown = undefined;
          this.onKeyDown = undefined;
        }
      };

      // Capture phase so we run even if other libs stop propagation.
      document.addEventListener("pointerdown", this.onOutsidePointerDown, true);
      window.addEventListener("keydown", this.onKeyDown, true);
    }, 0);
  }

  private onDropdownClose_() {
    // Nothing special; value already updated during input events.
    this.sliderInput = undefined;
    this.valueLabel = undefined;
    // Ensure global listeners are removed if still attached
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

export function registerSliderField() {
  (Blockly as any).fieldRegistry.register("field_slider", SliderField);
}
