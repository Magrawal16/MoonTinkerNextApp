import * as Blockly from "blockly";

export function applyFieldEditorPatches() {
  try {
    const FT: any = (Blockly as any).FieldTextInput;
    if (FT && !FT.__moontinkerPatchedHideSvg) {
      const originalShow = FT.prototype.showEditor_;
      FT.prototype.showEditor_ = function (...args: any[]) {
        const result = originalShow.apply(this, args);
        try {
          const textEl = (this as any).textElement_ as SVGTextElement | null;
          if (textEl) {
            (textEl as any).style.display = 'none';
          }
          const widgetDiv = (Blockly as any).WidgetDiv || null;
          const inputEl = widgetDiv?.getInputElement?.() || document.querySelector('.blocklyWidgetDiv .blocklyHtmlInput');
          const restore = () => {
            try { if (textEl) (textEl as any).style.display = ''; } catch (_) {}
            if (inputEl) inputEl.removeEventListener('blur', restore);
          };
          if (inputEl) {
            inputEl.addEventListener('blur', restore, { once: true });
          } else {
            const wHide = widgetDiv?.hide?.bind(widgetDiv);
            if (typeof wHide === 'function') {
              widgetDiv.hide = function (...a: any[]) { try { restore(); } catch (_) {} return wHide(...a); };
            }
          }
        } catch (_) {}
        return result;
      };
      FT.__moontinkerPatchedHideSvg = true;
    }
  } catch (_) {}

  try {
    const FN: any = (Blockly as any).FieldNumber || (Blockly as any).fieldRegistry?.get('field_number');
    if (FN && !FN.__moontinkerPatchedHideSvg) {
      const proto = FN.prototype || FN;
      const originalShowNum = proto.showEditor_;
      if (typeof originalShowNum === 'function') {
        proto.showEditor_ = function (...args: any[]) {
          const result = originalShowNum.apply(this, args);
          try {
            const textEl = (this as any).textElement_ as SVGTextElement | null;
            if (textEl) (textEl as any).style.display = 'none';
            const widgetDiv = (Blockly as any).WidgetDiv || null;
            const inputEl = widgetDiv?.getInputElement?.() || document.querySelector('.blocklyWidgetDiv .blocklyHtmlInput');
            const restore = () => {
              try { if (textEl) (textEl as any).style.display = ''; } catch (_) {}
              if (inputEl) inputEl.removeEventListener('blur', restore);
            };
            if (inputEl) {
              inputEl.addEventListener('blur', restore, { once: true });
            } else {
              const wHide = widgetDiv?.hide?.bind(widgetDiv);
              if (typeof wHide === 'function') {
                widgetDiv.hide = function (...a: any[]) { try { restore(); } catch (_) {} return wHide(...a); };
              }
            }
          } catch (_) {}
          return result;
        };
        FN.__moontinkerPatchedHideSvg = true;
      }
    }
  } catch (_) {}
}
