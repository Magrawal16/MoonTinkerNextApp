"use client";
import React from "react";

const BlocklyContainer = React.memo(
  ({ innerRef }: { innerRef: React.RefObject<HTMLDivElement | null> }) => {
    return (
      <div
        ref={innerRef}
        className="w-full h-full relative"
        style={{ backgroundColor: "#e5e7eb" }}
      />
    );
  },
  () => true
);
BlocklyContainer.displayName = "BlocklyContainer";

export const BlockEditorPane = React.memo(function BlockEditorPane({
  blocklyRef,
}: {
  blocklyRef: React.RefObject<HTMLDivElement | null>;
}) {
  return <BlocklyContainer innerRef={blocklyRef} />;
});
