// components/editor/python/providers/completions.ts
import { API } from "../api/PythonAPI";
import {
  endsWithInputDot,
  getDotContext,
  getLocalFunctionNames,
  inOnButtonPressedSecondArg,
  isRootish,
  push,
} from "../utils/utils";

const enum K { // shorthands
  Method = 0,
  Function = 1,
  EnumMember = 2,
  Snippet = 3,
  Module = 4,
  Keyword = 5,
}
// Monaco kinds vary; use monaco enums at runtime:
const kind = (monaco: any) => ({
  Method: monaco.languages.CompletionItemKind.Method,
  Function: monaco.languages.CompletionItemKind.Function,
  EnumMember: monaco.languages.CompletionItemKind.EnumMember,
  Snippet: monaco.languages.CompletionItemKind.Snippet,
  Module: monaco.languages.CompletionItemKind.Module,
  Keyword: monaco.languages.CompletionItemKind.Keyword,
});

function suggestNamespaces(monaco: any) {
  const k = kind(monaco);
  return [
    {
      label: "led",
      kind: k.Module,
      insertText: "led.",
      documentation: "LED matrix API.",
    },
    {
      label: "input",
      kind: k.Module,
      insertText: "input.",
      documentation: "Buttons, logo, gestures.",
    },
    {
      label: "basic",
      kind: k.Module,
      insertText: "basic.",
      documentation: "Basic utilities: show_string, forever, pause.",
    },
    {
      label: "pins",
      kind: k.Module,
      insertText: "pins.",
      documentation: "GPIO read/write (digital/analog).",
    },
    {
      label: "Button",
      kind: k.Module,
      insertText: "Button.",
      documentation: "Button enum: A, B, AB.",
    },
    {
      label: "DigitalPin",
      kind: k.Module,
      insertText: "DigitalPin.",
      documentation: "Pin enum: P0, P1, P2, …",
    },
  ];
}

function suggestButtonEnumDirect(monaco: any) {
  const k = kind(monaco);
  return (API.Button as readonly string[]).map((b) => ({
    label: `Button.${b}`,
    filterText: b, // typing "A" still matches
    sortText: `0_${b}`, // float to top
    kind: k.EnumMember,
    insertText: `Button.${b}`,
    documentation: `Button ${b}`,
  }));
}

export const registerCompletionProvider = (
  monaco: any,
  disposables: { dispose: () => void }[]
) => {
  const k = kind(monaco);

  push(
    disposables,
    monaco.languages.registerCompletionItemProvider("python", {
      triggerCharacters: [".", "(", ",", " "],
      provideCompletionItems: (model: any, position: any) => {
        const textUntilPos = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const line = textUntilPos;
        const lastToken =
          /([A-Za-z_][A-Za-z0-9_\.]*)$/.exec(textUntilPos)?.[1] ?? "";
        const items: any[] = [];

        // 0) Local handler names when typing the 2nd arg of input.on_button_pressed(...)
        if (inOnButtonPressedSecondArg(model, position)) {
          getLocalFunctionNames(model).forEach((name: string) =>
            items.push({
              label: name,
              kind: k.Function,
              insertText: name,
              documentation: "Local function",
            })
          );
          // Also suggest enums for the rare case user swaps arg order
          suggestButtonEnumDirect(monaco).forEach((it) =>
            items.push({ ...it, sortText: `1_${it.sortText}` })
          );
          return { suggestions: items };
        }

        // 1) If cursor looks like we're in the first arg of on_button_pressed, suggest Button enums directly
        //    Matches: input.on_button_pressed(    |  input.on_button_pressed(B
        const onBtnHead =
          /input\s*\.\s*on_button_pressed\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)?$/.test(
            line
          );
        if (onBtnHead) {
          suggestButtonEnumDirect(monaco).forEach((it) => items.push(it));
        }

        const dotCtx = getDotContext(textUntilPos);
        const rootish = isRootish(lastToken);
        const atBlockRoot = rootish && !endsWithInputDot(textUntilPos);

        // 2) Dot owner members
        if (dotCtx === "led") {
          Object.entries(API.led).forEach(([name, meta]: any) =>
            items.push({
              label: name,
              kind: k.Method,
              insertText: `${name}(\${1:x}, \${2:y})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: meta.doc,
              detail: meta.sig,
            })
          );
        } else if (dotCtx === "input") {
          items.push(
            {
              label: "on_button_pressed",
              kind: k.Method,
              insertText: `on_button_pressed(Button.\${1|A,B,AB|}, \${2:handler})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: API.input.on_button_pressed.doc,
              detail: API.input.on_button_pressed.sig,
            },
            {
              label: "on_logo_pressed",
              kind: k.Method,
              insertText: `on_logo_pressed(\${1:handler})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: API.input.on_logo_pressed.doc,
              detail: API.input.on_logo_pressed.sig,
            },
            {
              label: "on_logo_released",
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: `on_logo_released(\${1:handler})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: API.input.on_logo_released.doc,
              detail: API.input.on_logo_released.sig,
            }
          );
        } else if (dotCtx === "basic") {
          const { show_string, forever, pause } = API.basic as any;
          items.push(
            {
              label: "show_string",
              kind: k.Method,
              insertText: `show_string("\${1:text}", \${2:150})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: show_string.doc,
              detail: show_string.sig,
            },
            {
              label: "forever",
              kind: k.Method,
              insertText: `forever(\${1:loop})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Call basic.forever with a function name you defined above.",
              detail: forever.sig,
            },
            {
              label: "pause",
              kind: k.Method,
              insertText: `pause(\${1:1000})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: pause.doc,
              detail: pause.sig,
            }
          );
        } else if (dotCtx === "pins") {
          Object.entries(API.pins).forEach(([name, meta]: any) => {
            const isRead =
              name === "digital_read_pin" || name === "read_analog_pin";
            const pinList = (API as any).DigitalPin.join(",");
            items.push({
              label: name,
              kind: k.Method,
              insertText: isRead
                ? `${name}(DigitalPin.\${1|${pinList}|})`
                : `${name}(DigitalPin.\${1|${pinList}|}, \${2:value})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: meta.doc,
              detail: meta.sig,
            });
          });
        } else if (dotCtx === "Button") {
          (API.Button as readonly string[]).forEach((b) =>
            items.push({
              label: b,
              kind: k.EnumMember,
              insertText: b,
              documentation: `Button ${b}`,
            })
          );
        } else if (dotCtx === "DigitalPin") {
          (API as any).DigitalPin.forEach((p: string) =>
            items.push({
              label: p,
              kind: k.EnumMember,
              insertText: p,
              documentation: `Digital Pin ${p}`,
            })
          );
        }

        // 3) Root-level helpers/snippets + namespace prompts
        if (atBlockRoot) {
          items.push(
            ...suggestNamespaces(monaco),
            {
              label: "from microbit import *",
              kind: k.Snippet,
              insertText: "from microbit import *\n",
              documentation: "Import Micro:bit API into your script.",
            },
            {
              label: "def function scaffold",
              kind: k.Snippet,
              insertText: "def ${1:name}(${2}):\n    ${3:pass}\n",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Define a Python function.",
            },
            {
              label: "class scaffold",
              kind: k.Snippet,
              insertText:
                "class ${1:Name}:\n    def __init__(self${2}):\n        ${3:pass}\n",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Define a Python class.",
            },
            {
              label: "on_button_pressed scaffold",
              kind: k.Snippet,
              insertText: (API.input as any).on_button_pressed.snippet,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Scaffold a button handler (define function, then register).",
              detail: API.input.on_button_pressed.sig,
            },
            {
              label: "on_logo_pressed scaffold",
              kind: k.Snippet,
              insertText:
                "def ${1:on_logo_down}():\n    ${2:pass}\n\ninput.on_logo_pressed(${1:on_logo_down})\n",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Scaffold a logo press handler.",
              detail: (API.input as any).on_logo_pressed.sig,
            },
            {
              label: "forever loop scaffold",
              kind: k.Snippet,
              insertText: (API.basic as any).forever.snippet,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: (API.basic as any).forever.doc,
              detail: (API.basic as any).forever.sig,
            },
            {
              label: "while True loop",
              kind: k.Snippet,
              insertText: "while True:\n    ${1:pass}\n",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Plain Python loop (runs forever).",
            },
            {
              label: "LED demo: plot center",
              kind: k.Snippet,
              insertText: "from microbit import *\n\nled.plot(2, 2)\n",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Quick LED demo (center pixel).",
            },
            {
              label: "Pins demo: blink P0",
              kind: k.Snippet,
              insertText:
                "from microbit import *\n\nwhile True:\n    pins.digital_write_pin(DigitalPin.P0, 1)\n    basic.pause(200)\n    pins.digital_write_pin(DigitalPin.P0, 0)\n    basic.pause(200)\n",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Blink a pin using basic.pause.",
            },
            {
              label: "Hello string",
              kind: k.Snippet,
              insertText: 'basic.show_string("Hello!", 100)\n',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Scroll a friendly greeting.",
            },
            {
              label: "on_logo_released scaffold",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: (API.input as any).on_logo_released.snippet,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Scaffold a logo release handler.",
              detail: (API.input as any).on_logo_released.sig,
            }
          );
        }

        return { suggestions: items };
      },
    })
  );
};
