import * as Blockly from "blockly";

/**
 * PauseTimeField - A custom field that shows preset dropdown options 
 * but also allows manual number entry
 */
export class PauseTimeField extends Blockly.FieldNumber {
  EDITABLE = true;

  constructor(value?: string | number) {
    super(value || 5000, 0);
  }

  static fromJson(options: any): PauseTimeField {
    const value = options.value ?? 5000;
    return new PauseTimeField(value);
  }

  // Override showEditor to show dropdown with presets plus inline numeric input
  protected override showEditor_(): void {
    const presets = [
      { text: "100 ms", value: 100 },
      { text: "200 ms", value: 200 },
      { text: "500 ms", value: 500 },
      { text: "1 second", value: 1000 },
      { text: "2 seconds", value: 2000 },
      { text: "5 seconds", value: 5000 },
    ];

    // Build a simple custom dropdown UI to avoid focus conflicts with Blockly menus
    Blockly.DropDownDiv.clearContent();
    const div = Blockly.DropDownDiv.getContentDiv();

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.minWidth = "200px";

    const buttonRow = document.createElement("div");
    buttonRow.style.display = "grid";
    buttonRow.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    buttonRow.style.gap = "6px";

    presets.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = preset.text;
      btn.style.padding = "6px 8px";
      btn.style.border = "1px solid #ccc";
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";
      btn.style.background = "#fff";
      btn.onclick = () => {
        this.setValue(preset.value);
        Blockly.DropDownDiv.hideIfOwner(this);
      };
      buttonRow.appendChild(btn);
    });

    const inputLabel = document.createElement("div");
    inputLabel.textContent = "Custom (ms):";
    inputLabel.style.fontSize = "12px";
    inputLabel.style.color = "#555";

    const inputRow = document.createElement("div");
    inputRow.style.display = "flex";
    inputRow.style.gap = "6px";
    inputRow.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = String(this.getValue() || 0);
    input.style.flex = "1";
    input.style.padding = "6px 8px";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "4px";

    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.textContent = "Apply";
    applyBtn.style.padding = "6px 10px";
    applyBtn.style.border = "1px solid #ccc";
    applyBtn.style.borderRadius = "4px";
    applyBtn.style.cursor = "pointer";
    applyBtn.style.background = "#fff";
    applyBtn.onclick = () => {
      const val = Number(input.value);
      if (!Number.isFinite(val) || val < 0) {
        return;
      }
      this.setValue(val);
      Blockly.DropDownDiv.hideIfOwner(this);
    };

    inputRow.appendChild(input);
    inputRow.appendChild(applyBtn);

    container.appendChild(buttonRow);
    container.appendChild(inputLabel);
    container.appendChild(inputRow);
    div.appendChild(container);

    const primaryColour = (this.sourceBlock_ as any)?.getColour() || "#000000";
    Blockly.DropDownDiv.setColour(
      primaryColour,
      (this.sourceBlock_ as any)?.getColourTertiary?.() || "#CCCCCC"
    );

    Blockly.DropDownDiv.showPositionedByField(this, () => {
      // No special cleanup required
    });

    // Focus input so user can type immediately
    setTimeout(() => input.focus({ preventScroll: true }), 0);
  }
}

// Register the field with Blockly
if (typeof Blockly !== 'undefined' && Blockly.fieldRegistry) {
  Blockly.fieldRegistry.register('field_pause_time', PauseTimeField);
}
