// components/editor/python/providers/completions.ts
import { API } from "../api/PythonAPI";
import { endsWithInputDot, getDotContext, getLocalFunctionNames, inOnButtonPressedSecondArg, isRootish, push } from "../utils/utils";

export const registerCompletionProvider = (monaco: any, disposables: { dispose: () => void }[]) => {
  push(disposables,
    monaco.languages.registerCompletionItemProvider("python", {
      triggerCharacters: [".", "(", ","],
      provideCompletionItems: (model: any, position: any) => {
        const textUntilPos = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const lastToken = /([A-Za-z_][A-Za-z0-9_\.]*)$/.exec(textUntilPos)?.[1] ?? "";
        const items: any[] = [];

        // 1) If in 2nd arg of input.on_button_pressed, suggest local function names
        if (inOnButtonPressedSecondArg(model, position)) {
          getLocalFunctionNames(model).forEach((name : any) =>
            items.push({
              label: name,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: name,
              documentation: "Local function",
            })
          );
          return { suggestions: items };
        }

        const dotCtx = getDotContext(textUntilPos);
        const rootish = isRootish(lastToken);
        const blockRoot = rootish && !endsWithInputDot(textUntilPos);

        // 2) Dot-members
        if (dotCtx === "led") {
          Object.entries(API.led).forEach(([name, meta]: any) =>
            items.push({
              label: name,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: `${name}(\${1:x}, \${2:y})`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: meta.doc,
              detail: meta.sig,
            })
          );
        } else if (dotCtx === "input") {
          items.push({
            label: "on_button_pressed",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: `on_button_pressed(Button.\${1|A,B,AB|}, \${2:handler})`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: API.input.on_button_pressed.doc,
            detail: API.input.on_button_pressed.sig,
          });
        } else if (dotCtx === "basic") {
          const { show_string, forever, pause } = API.basic as any;
          items.push(
            {
              label: "show_string",
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: `show_string("\${1:text}", \${2:150})`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: show_string.doc,
              detail: show_string.sig,
            },
            {
              label: "forever",
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: `forever(\${1:loop})`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Call basic.forever with a function name you defined above.",
              detail: forever.sig,
            },
            {
              label: "pause",
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: `pause(\${1:1000})`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: pause.doc,
              detail: pause.sig,
            }
          );
        } else if (dotCtx === "pins") {
          Object.entries(API.pins).forEach(([name, meta]: any) =>
            items.push({
              label: name,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText:
                name === "digital_read_pin" || name === "read_analog_pin"
                  ? `${name}(DigitalPin.\${1|${(API as any).DigitalPin.join(",")}|})`
                  : `${name}(DigitalPin.\${1|${(API as any).DigitalPin.join(",")}|}, \${2:value})`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: meta.doc,
              detail: meta.sig,
            })
          );
        } else if (dotCtx === "Button") {
          (API.Button as readonly string[]).forEach((b) =>
            items.push({
              label: b,
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: b,
              documentation: `Button ${b}`,
            })
          );
        } else if (dotCtx === "DigitalPin") {
          (API as any).DigitalPin.forEach((p: string) =>
            items.push({
              label: p,
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: p,
              documentation: `Digital Pin ${p}`,
            })
          );
        } else if (blockRoot) {
          // 3) Root-level helpers/snippets
          items.push(
            {
              label: "from microbit import *",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "from microbit import *\n",
              documentation: "Import Micro:bit API into your script.",
            },
            {
              label: "on_button_pressed scaffold",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: API.input.on_button_pressed.snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Scaffold a button handler (define function, then register).",
              detail: API.input.on_button_pressed.sig,
            },
            {
              label: "forever loop scaffold",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: (API.basic as any).forever.snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: (API.basic as any).forever.doc,
              detail: (API.basic as any).forever.sig,
            }
          );
        }

        return { suggestions: items };
      },
    })
  );
};
