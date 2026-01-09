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

  const uid = "bf_slider_" + Math.random().toString(36).slice(2, 9);

  const contentDiv = document.createElement("div");
  contentDiv.id = uid;
  contentDiv.style.padding = "14px";
  contentDiv.style.minWidth = "240px";
  contentDiv.style.boxSizing = "border-box";
  contentDiv.style.borderRadius = "12px";
  contentDiv.style.boxShadow = "0 10px 22px rgba(0,0,0,0.22)";
  contentDiv.style.fontFamily = "Arial, Helvetica, sans-serif";
  contentDiv.style.background = this.sourceBlock_?.getColour?.() || "#6a2fb0";
  contentDiv.style.color = "#fff";
  contentDiv.style.transition = "transform 160ms ease, box-shadow 160ms ease";

  // SLIDER ROW: left label | slider container | right label
  const sliderRow = document.createElement("div");
  sliderRow.style.display = "flex";
  sliderRow.style.alignItems = "center";
  sliderRow.style.gap = "10px";

  const leftLabel = document.createElement("div");
  leftLabel.textContent = String(this.sliderMin);
  leftLabel.style.fontSize = "12px";
  leftLabel.style.width = "32px";
  leftLabel.style.textAlign = "left";
  leftLabel.style.opacity = "0.95";

  const rightLabel = document.createElement("div");
  rightLabel.textContent = String(this.sliderMax);
  rightLabel.style.fontSize = "12px";
  rightLabel.style.width = "32px";
  rightLabel.style.textAlign = "right";
  rightLabel.style.opacity = "0.95";

  // Slider container holds the visible track, the animated fill, and the real input
  const sliderContainer = document.createElement("div");
  sliderContainer.style.flex = "1";
  sliderContainer.style.position = "relative";
  sliderContainer.style.height = "18px";
  sliderContainer.style.display = "flex";
  sliderContainer.style.alignItems = "center";

  // Animated fill (the colored bar that grows left->right)
  const fill = document.createElement("div");
  fill.className = "bf-slider-fill";
  fill.style.position = "absolute";
  fill.style.left = "0";
  fill.style.top = "50%";
  fill.style.transform = "translateY(-50%)";
  fill.style.height = "10px";
  fill.style.borderRadius = "10px";
  fill.style.pointerEvents = "none";
  fill.style.background = "linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.18))";
  fill.style.width = "0%";
  fill.style.transition = "width 160ms ease";

  // Base track (subtle translucent bar) sits above fill so we can control fill look
  const trackBg = document.createElement("div");
  trackBg.style.position = "absolute";
  trackBg.style.left = "0";
  trackBg.style.right = "0";
  trackBg.style.top = "50%";
  trackBg.style.transform = "translateY(-50%)";
  trackBg.style.height = "10px";
  trackBg.style.borderRadius = "10px";
  trackBg.style.background = "rgba(255,255,255,0.18)";

  // The actual range input (native) - made visually transparent so fill shows through
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(this.sliderMin);
  slider.max = String(this.sliderMax);
  slider.step = String(this.sliderStep);
  slider.value = String(this.getValue());
  slider.style.width = "100%";
  slider.style.margin = "0";
  slider.style.padding = "0";
  slider.style.background = "transparent";
  slider.style.position = "relative";
  slider.style.zIndex = "2";
  slider.style.height = "18px";
  slider.style.cursor = "pointer";
  slider.style.appearance = "none";

  // Style the native track/thumb cross-browser via injected CSS (scoped by uid)
  const style = document.createElement("style");
  style.textContent = `
    #${uid} input[type="range"]::-webkit-slider-runnable-track {
      height: 10px;
      -webkit-appearance: none;
      background: transparent;
      border: none;
    }
    #${uid} input[type="range"]::-moz-range-track {
      height: 10px;
      background: transparent;
      border: none;
    }
    #${uid} input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 4px solid rgba(42,161,214,1);
      margin-top: -5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
    }
    #${uid} input[type="range"]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 4px solid rgba(42,161,214,1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
    }

    /* Hover/active effects: slightly bigger thumb and stronger glow */
    #${uid}[data-hover="true"] input[type="range"]::-webkit-slider-thumb {
      transform: scale(1.08);
      box-shadow: 0 8px 18px rgba(0,0,0,0.35), 0 0 10px rgba(42,161,214,0.22);
      border-color: rgba(42,161,214,0.98);
    }
    #${uid}[data-hover="true"] input[type="range"]::-moz-range-thumb {
      transform: scale(1.08);
      box-shadow: 0 8px 18px rgba(0,0,0,0.35), 0 0 10px rgba(42,161,214,0.22);
      border-color: rgba(42,161,214,0.98);
    }

    /* Make the container lift slightly on hover */
    #${uid}[data-hover="true"] {
      transform: translateY(-6px);
      box-shadow: 0 16px 34px rgba(0,0,0,0.28);
    }

    /* Reduce outline on focus but keep accessibility */
    #${uid} input[type="range"]:focus {
      outline: none;
    }
  `;

  // Wire up slider behavior
  const updateFill = (valStr: string) => {
    const v = Number(valStr);
    const min = Number(slider.min);
    const max = Number(slider.max);
    const pct = Math.round(((v - min) / (max - min)) * 100);
    fill.style.width = pct + "%";
  };

  slider.addEventListener("input", () => {
    const num = Number(slider.value);
    this.setValue(num); // updates the field stored value on the block
    updateFill(slider.value);
  });

  // Hover state: set a data attribute on the root so CSS transitions run
  const onPointerEnter = () => {
    contentDiv.setAttribute("data-hover", "true");
  };
  const onPointerLeave = () => {
    contentDiv.removeAttribute("data-hover");
  };
  contentDiv.addEventListener("pointerenter", onPointerEnter);
  contentDiv.addEventListener("pointerleave", onPointerLeave);

  // Build DOM tree
  sliderContainer.appendChild(fill);
  sliderContainer.appendChild(trackBg);
  sliderContainer.appendChild(slider);
  sliderRow.appendChild(leftLabel);
  sliderRow.appendChild(sliderContainer);
  sliderRow.appendChild(rightLabel);

  contentDiv.appendChild(sliderRow);
  contentDiv.appendChild(style);

  // Keep reference for cleanup
  this.sliderInput = slider;

  // Append into DropDownDiv and show
  DropDownDiv.getContentDiv().innerHTML = "";
  DropDownDiv.getContentDiv().appendChild(contentDiv);
  const dropdownDiv = DropDownDiv.getContentDiv().parentElement;
  if (dropdownDiv) {
    dropdownDiv.style.background = "transparent";
    dropdownDiv.style.border = "none";
    dropdownDiv.style.boxShadow = "none";
    dropdownDiv.style.padding = "0";   // optional
  }
  DropDownDiv.showPositionedByField(this, this.onDropdownClose_.bind(this));

  // initialize fill to current value
  updateFill(slider.value);

  // Close-handling (same as before, but keep references to listeners for cleanup)
  setTimeout(() => {
    const container = DropDownDiv.getContentDiv?.() || contentDiv;

    this.onOutsidePointerDown = (ev: Event) => {
      if (!container.contains(ev.target as Node)) {
        if (typeof DropDownDiv.hideIfOwner === "function") {
          DropDownDiv.hideIfOwner(this);
        } else if (typeof DropDownDiv.hide === "function") {
          DropDownDiv.hide();
        } else {
          DropDownDiv.hideWithoutAnimation();
        }
        document.removeEventListener("pointerdown", this.onOutsidePointerDown!, true);
        window.removeEventListener("keydown", this.onKeyDown!, true);
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
      }
    };

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
