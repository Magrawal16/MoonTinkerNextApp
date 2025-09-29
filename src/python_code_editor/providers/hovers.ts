// components/editor/python/providers/hovers.ts
import { API } from "../api/PythonAPI";
import { getDotContext, push } from "../utils/utils";

export const registerHoverProvider = (monaco: any, disposables: { dispose: () => void }[]) => {
  push(
    disposables,
    monaco.languages.registerHoverProvider("python", {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return { contents: [] };
        const line = model.getLineContent(position.lineNumber);
        const before = line.slice(0, (word.startColumn ?? 1) - 1);
        const dotOwner = getDotContext(before + ".") ?? undefined;

        const getSigDoc = (obj: any, name: string) =>
          obj?.[name] ? { sig: obj[name].sig, doc: obj[name].doc } : null;

        if (dotOwner === "led") {
          const md = getSigDoc(API.led, word.word);
          if (md) return { contents: [{ value: `**${md.sig}**\n\n${md.doc}` }] };
        }
        if (dotOwner === "basic") {
          const md = getSigDoc(API.basic as any, word.word);
          if (md) return { contents: [{ value: `**${md.sig}**\n\n${md.doc}` }] };
        }
        if (dotOwner === "pins") {
          const md = getSigDoc(API.pins as any, word.word);
          if (md) return { contents: [{ value: `**${md.sig}**\n\n${md.doc}` }] };
        }
        if (dotOwner === "input") {
          const md = getSigDoc(API.input as any, word.word);
          if (md) return { contents: [{ value: `**${md.sig}**\n\n${md.doc}` }] };
        }
        if (dotOwner === "Button" && (API.Button as readonly string[]).includes(word.word as any)) {
          return { contents: [{ value: `**Button.${word.word}**` }] };
        }
        if (dotOwner === "DigitalPin" && (API as any).DigitalPin.includes(word.word)) {
          return { contents: [{ value: `**DigitalPin.${word.word}**` }] };
        }
        return { contents: [] };
      },
    })
  );
};
