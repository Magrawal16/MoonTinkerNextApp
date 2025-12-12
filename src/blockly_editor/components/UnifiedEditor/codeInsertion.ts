/**
 * Handle code snippet insertion into the editor
 */
export function handleCodeInsertLogic(
  code: string,
  currentCode: string
): string {
  let newCode = currentCode;

  const isImport =
    code.trim().startsWith("import ") || code.trim().startsWith("from ");
  const isFunction =
    code.trim().startsWith("def ") || code.trim().startsWith("async def ");

  if (isImport) {
    const lines = currentCode.split("\n");

    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].trim().startsWith("import ") ||
        lines[i].trim().startsWith("from ")
      ) {
        lastImportIndex = i;
      } else if (
        lines[i].trim().length > 0 &&
        !lines[i].trim().startsWith("#")
      ) {
        break;
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, code);
    } else {
      lines.unshift(code);
    }

    if (
      lines.length > lastImportIndex + 2 &&
      lines[lastImportIndex + 2].trim().length > 0
    ) {
      lines.splice(lastImportIndex + 2, 0, "");
    }

    newCode = lines.join("\n");
  } else if (isFunction) {
    const lines = currentCode.split("\n");
    let insertIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line.startsWith("def ") ||
        line.startsWith("async def ") ||
        line.startsWith("class ")
      ) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex > 0 && lines[insertIndex - 1].trim() !== "") {
      lines.splice(insertIndex, 0, "");
      insertIndex++;
    }

    lines.splice(insertIndex, 0, code);
    newCode = lines.join("\n");
  } else {
    const lines = currentCode.split("\n");
    const lastLine = lines[lines.length - 1] || "";

    const indentMatch = lastLine.match(/^(\s*)/);
    const currentIndent = indentMatch ? indentMatch[1] : "";

    const codeLines = code.split("\n");
    const formattedCode = codeLines
      .map((line) => {
        if (line.trim() === "" || line.trim().startsWith("#")) return line;

        const isTopLevel =
          line.trim().startsWith("import ") ||
          line.trim().startsWith("from ") ||
          line.trim().startsWith("def ") ||
          line.trim().startsWith("async def ") ||
          line.trim().startsWith("class ") ||
          line.trim().startsWith("while ") ||
          line.trim().startsWith("for ") ||
          line.trim().startsWith("if ") ||
          line.trim().startsWith("elif ") ||
          line.trim().startsWith("else:");

        return isTopLevel ? line : currentIndent + line;
      })
      .join("\n");

    const separator = currentCode.trim() === "" ? "" : "\n\n";
    newCode = currentCode + separator + formattedCode;
  }

  return newCode;
}
