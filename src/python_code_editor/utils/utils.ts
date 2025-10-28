// components/editor/python/utils.ts
import type { Monaco } from "../api/PythonAPI";

export const getLocalFunctionNames = (model: any): string[] => {
  const text = model.getValue();
  const names = new Set<string>();
  const re = /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(.*\)\s*:/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) names.add(m[1]);
  return Array.from(names);
};

export const isRootish = (s: string) => /\b$/.test(s) || s === "";

export const getDotContext = (s: string) =>
  /([A-Za-z_][A-Za-z0-9_]*)\.$/.exec(s)?.[1];

export const endsWithInputDot = (s: string) => /\binput\.\s*$/.test(s);

// Heuristic: are we inside input.on_button_pressed(...) second arg?
export const inOnButtonPressedSecondArg = (model: any, pos: { lineNumber: number; column: number }) => {
  const line = model.getLineContent(pos.lineNumber);
  const toCursor = line.slice(0, pos.column - 1);
  const idx = toCursor.lastIndexOf("input.on_button_pressed(");
  if (idx === -1) return false;
  const afterOpen = toCursor.slice(idx + "input.on_button_pressed(".length);
  const commaCount = (afterOpen.match(/,/g) || []).length;
  return commaCount >= 1; // second arg or later
};
// Convenience to register and track disposables
export const push = (arr: { dispose: () => void }[], d: { dispose: () => void }) => {
  arr.push(d);
};
