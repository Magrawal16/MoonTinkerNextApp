"use client";
import React from "react";
import CodeEditor from "@/python_code_editor/components/PythonCodeEditor";

export const CodeEditorPane = React.memo(function CodeEditorPane({
  code,
  onChange,
}: {
  code: string;
  onChange: (newCode: string) => void;
}) {
  return <CodeEditor code={code} onChange={onChange} />;
});
