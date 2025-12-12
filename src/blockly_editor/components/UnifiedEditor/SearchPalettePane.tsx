"use client";
import React from "react";
import PythonCodePalette from "../PythonCodeBlockSnippetPalette";

export const SearchPalettePane = React.memo(function SearchPalettePane({
  showCodePalette,
  setShowCodePalette,
  onCodeInsert,
}: {
  showCodePalette: boolean;
  setShowCodePalette: React.Dispatch<React.SetStateAction<boolean>> | ((v: boolean) => void);
  onCodeInsert: (code: string) => void;
}) {
  return (
    <PythonCodePalette
      showCodePalette={showCodePalette}
      setShowCodePalette={((value: boolean | ((prev: boolean) => boolean)) => {
        if (typeof setShowCodePalette === 'function' && (setShowCodePalette as any).length === 1) {
          // It may be a simple setter
          (setShowCodePalette as any)(typeof value === 'function' ? (value as any)(showCodePalette) : value);
        } else {
          // React.Dispatch setter supports functional updates
          (setShowCodePalette as React.Dispatch<React.SetStateAction<boolean>>)(value as any);
        }
      }) as any}
      onCodeInsert={onCodeInsert}
    />
  );
});
