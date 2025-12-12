import React, { useState } from "react";
import { SHARED_MICROBIT_BLOCKS } from "@/blockly_editor/utils/sharedBlockDefinitions";

import type { WorkspaceSvg } from "blockly";

interface BlockSearchPaletteProps {
  workspace: WorkspaceSvg | null;
  show: boolean;
  onClose: () => void;
}

const BlockSearchPalette: React.FC<BlockSearchPaletteProps> = ({ workspace, show, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBlocks = SHARED_MICROBIT_BLOCKS.filter(block => {
    const term = searchTerm.toLowerCase();
    return (
      block.type.toLowerCase().includes(term) ||
      (block.blockDefinition?.message0?.toLowerCase?.().includes(term) ?? false) ||
      (block.category?.toLowerCase().includes(term) ?? false)
    );
  });

  const handleInsertBlock = (blockType: string) => {
    if (!workspace) return;
    const block = workspace.newBlock(blockType);
    if (block) {
      block.initSvg();
      block.render();
      // Place block at the center of the workspace view
      const metrics = workspace.getMetrics();
      const x = metrics ? metrics.viewLeft + metrics.viewWidth / 2 : 50;
      const y = metrics ? metrics.viewTop + metrics.viewHeight / 2 : 50;
      block.moveBy(x, y);
      block.select();
      workspace.addTopBlock(block);
      // workspace.setSelected is not a public API; block.select() is sufficient
      (workspace as any).resize && (workspace as any).resize();
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-xl border border-gray-200 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search blocks..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button onClick={onClose} className="ml-2 text-gray-500 hover:text-red-500 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 max-h-[60vh]">
          {filteredBlocks.length === 0 ? (
            <div className="text-gray-400 text-center mt-8">No blocks found</div>
          ) : (
            filteredBlocks.map(block => (
              <button
                key={block.type}
                className="w-full text-left px-3 py-2 mb-2 rounded hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
                onClick={() => handleInsertBlock(block.type)}
              >
                <div className="font-semibold text-gray-800">{block.blockDefinition?.message0 || block.type}</div>
                <div className="text-xs text-gray-500">{block.category}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockSearchPalette;
