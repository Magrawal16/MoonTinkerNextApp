// components/editor/python/lint/inlineDefLint.ts
export const addInlineDefLint = (monaco: any, editor: any) => {
  const model = editor.getModel?.();
  if (!model) return;

  const run = () => {
    const matches = model.findMatches(
      String.raw`(on_button_pressed\s*\(\s*Button\.(A|B|AB)\s*,\s*def\b)|(on_logo_(pressed|released)\s*\(\s*def\b)`,
      false,
      false,
      false,
      null,
      true
    );

    const markers = matches.map((m: any) => ({
      severity: monaco.MarkerSeverity.Error,
      message:
        "Define the handler first, then pass its name:\n\ndef handler():\n    ...\n\ninput.on_button_pressed(Button.X, handler)",
      startLineNumber: m.range.startLineNumber,
      startColumn: m.range.startColumn,
      endLineNumber: m.range.endLineNumber,
      endColumn: m.range.endColumn,
    }));

    monaco.editor.setModelMarkers(model, "inline-def-lint", markers);
  };

  run();
  model.onDidChangeContent(run);
};
