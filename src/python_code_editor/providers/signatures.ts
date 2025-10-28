// components/editor/python/providers/signature.ts
import { API } from "../api/PythonAPI";
import { push } from "../utils/utils";

export const registerSignatureHelp = (monaco: any, disposables: { dispose: () => void }[]) => {
  push(
    disposables,
    monaco.languages.registerSignatureHelpProvider("python", {
      signatureHelpTriggerCharacters: ["(", ","],
      provideSignatureHelp: (model: any, position: any) => {
        const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
        const fnMatch = /([A-Za-z_][A-Za-z0-9_\.]*)\s*\(([^()]*)$/.exec(line);
        if (!fnMatch) return null;

        const fullName = fnMatch[1];
        const paramsSoFar = fnMatch[2];
        const activeParam = paramsSoFar.split(",").length - 1;

        const resolveSig = (fq: string) => {
          if (fq.startsWith("led.")) return (API.led as any)[fq.split(".")[1]];
          if (fq.startsWith("basic.")) return (API.basic as any)[fq.split(".")[1]];
          if (fq.startsWith("pins.")) return (API.pins as any)[fq.split(".")[1]];
          if (fq === "input.on_button_pressed") return (API.input as any).on_button_pressed;
          if (fq === "input.button_is_pressed") return (API.input as any).button_is_pressed;
          if (fq === "input.on_logo_pressed") return (API.input as any).on_logo_pressed;
          if (fq === "input.on_logo_released") return (API.input as any).on_logo_released;
          return undefined;
        };

        const meta: any = resolveSig(fullName);
        if (!meta) return null;

        const sigLabel = meta.sig;
        const params = (sigLabel.match(/\((.*)\)/)?.[1] ?? "")
          .split(",")
          .map((s: string) => s.trim());

        const monacoSig = { label: sigLabel, parameters: params.map((p: string) => ({ label: p || " " })) };

        return {
          value: {
            signatures: [monacoSig],
            activeSignature: 0,
            activeParameter: Math.max(0, Math.min(activeParam, params.length - 1)),
          },
          dispose: () => { },
        };
      },
    })
  );
};
