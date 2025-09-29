// components/editor/python/providers/symbols.ts
import { push } from "../utils/utils";

export const registerSymbolProvider = (monaco: any, disposables: { dispose: () => void }[]) => {
  push(disposables,
    monaco.languages.registerDocumentSymbolProvider("python", {
      provideDocumentSymbols: (model: any) => {
        const symbols: any[] = [];
        const lines = model.getLinesContent();
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          const def = /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(.*\)\s*:/.exec(ln);
          const cls = /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(ln);
          if (def) {
            symbols.push({
              name: def[1],
              kind: (window as any).monaco?.languages.SymbolKind.Function ?? 12,
              range: new (window as any).monaco.Range(i + 1, 1, i + 1, ln.length + 1),
              selectionRange: new (window as any).monaco.Range(i + 1, 1, i + 1, ln.length + 1),
            });
          } else if (cls) {
            symbols.push({
              name: cls[1],
              kind: (window as any).monaco?.languages.SymbolKind.Class ?? 5,
              range: new (window as any).monaco.Range(i + 1, 1, i + 1, ln.length + 1),
              selectionRange: new (window as any).monaco.Range(i + 1, 1, i + 1, ln.length + 1),
            });
          }
        }
        return symbols;
      },
    })
  );
};
