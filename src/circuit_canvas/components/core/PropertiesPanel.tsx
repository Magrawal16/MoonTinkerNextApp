import React, { useState } from "react";
import { CircuitElement, Wire, Node, PropertiesPanelProps } from "@/circuit_canvas/types/circuit";
import { FaCopy, FaDownload, FaMicrochip } from "react-icons/fa";

// Add this interface for microbit controls
interface MicrobitControlState {
  pins: Record<string, number>;
  leds: boolean[][];
}

const PropertiesPanel: React.FC<PropertiesPanelProps & { 
  microbitControls?: Record<string, MicrobitControlState>;
}> = ({
  selectedElement,
  wires,
  getNodeById,
  onElementEdit,
  onWireEdit,
  onEditWireSelect,
  setOpenCodeEditor,
  wireColor,
  microbitControls = {}
}) => {
  const [copied, setCopied] = useState(false);

  // Generate Python code for micro:bit
  const generateMicrobitPythonCode = (elementId: string): string => {
    const controlState = microbitControls[elementId];
    if (!controlState) return "# No micro:bit configuration found";
    
    let code = `from microbit import *\n\n`;
    
    // Add pin configurations
    Object.entries(controlState.pins || {}).forEach(([pinName, value]) => {
      const pinNum = pinName.replace('pin', '');
      code += `pin${pinNum}.write_digital(${value})\n`;
    });
    
    code += '\n';
    
    // Add LED matrix configuration
    if (controlState.leds) {
      code += '# LED matrix pattern\n';
      code += 'led_pattern = [\n';
      controlState.leds.forEach(row => {
        code += '    [';
        code += row.map(led => led ? '1' : '0').join(', ');
        code += '],\n';
      });
      code += ']\n\n';
      
      code += `# Display the pattern\ndef display_pattern(pattern):\n`;
      code += `    for i in range(5):\n`;
      code += `        for j in range(5):\n`;
      code += `            display.set_pixel(i, j, 9 if pattern[i][j] else 0)\n\n`;
      
      code += `while True:\n`;
      code += `    display_pattern(led_pattern)\n`;
      code += `    sleep(100)\n`;
    }
    
    return code;
  };

  const handleCopyCode = () => {
    if (selectedElement && selectedElement.type === "microbit") {
      const code = generateMicrobitPythonCode(selectedElement.id);
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCode = () => {
    if (selectedElement && selectedElement.type === "microbit") {
      const code = generateMicrobitPythonCode(selectedElement.id);
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `microbit_code_${selectedElement.id}.py`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenCodeEditor = () => {
    if (selectedElement && selectedElement.type === "microbit") {
      setOpenCodeEditor(true);
    }
  };

  if (!selectedElement) {
    return <div className="p-4 text-gray-500">No element selected</div>;
  }

  if (selectedElement.type === "wire") {
    const wire = wires.find((w) => w.id === selectedElement.id);
    if (!wire) return null;

    const fromNode = getNodeById(wire.fromNodeId);
    const toNode = getNodeById(wire.toNodeId);

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Wire Properties</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">From Node</label>
          <div className="text-sm text-gray-600">
            {fromNode ? `Node ${fromNode.id.slice(-4)}` : "Unknown"}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">To Node</label>
          <div className="text-sm text-gray-600">
            {toNode ? `Node ${toNode.id.slice(-4)}` : "Unknown"}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Wire Color</label>
          <input
            type="color"
            value={wireColor || "#000000"}
            onChange={(e) => {
              onWireEdit({ ...wire, color: e.target.value }, false);
            }}
            className="w-full h-8"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onEditWireSelect?.(wire)}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded"
          >
            Edit Path
          </button>
          <button
            onClick={() => onWireEdit(wire, true)}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // Handle micro:bit element specifically
  if (selectedElement.type === "microbit") {
    const pythonCode = generateMicrobitPythonCode(selectedElement.id);
    
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Micro:bit Properties</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Element ID</label>
          <div className="text-sm text-gray-600">{selectedElement.id}</div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Position</label>
          <div className="text-sm text-gray-600">
            X: {selectedElement.x}, Y: {selectedElement.y}
          </div>
        </div>
        
        {selectedElement.rotation !== undefined && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Rotation</label>
            <div className="text-sm text-gray-600">{selectedElement.rotation}°</div>
          </div>
        )}
        
        {/* Python Code Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Generated Python Code</label>
            <div className="flex gap-1">
              <button
                onClick={handleCopyCode}
                className="p-1 text-gray-600 hover:text-blue-600"
                title="Copy code"
              >
                <FaCopy size={14} />
              </button>
              <button
                onClick={handleDownloadCode}
                className="p-1 text-gray-600 hover:text-green-600"
                title="Download code"
              >
                <FaDownload size={14} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-40 font-mono">
              {pythonCode}
            </pre>
            {copied && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Copied!
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleOpenCodeEditor}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
        >
          <FaMicrochip /> Open Code Editor
        </button>
        
        <button
          onClick={() => onElementEdit(selectedElement, true)}
          className="w-full mt-2 bg-red-500 text-white py-2 px-4 rounded"
        >
          Delete Element
        </button>
      </div>
    );
  }

  // Handle other element types
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">
        {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Properties
      </h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Element ID</label>
        <div className="text-sm text-gray-600">{selectedElement.id}</div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Position</label>
        <div className="text-sm text-gray-600">
          X: {selectedElement.x}, Y: {selectedElement.y}
        </div>
      </div>
      
      {selectedElement.rotation !== undefined && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Rotation</label>
          <div className="text-sm text-gray-600">{selectedElement.rotation}°</div>
        </div>
      )}
      
      {selectedElement.properties && Object.keys(selectedElement.properties).length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium mb-2">Properties</h4>
          {Object.entries(selectedElement.properties).map(([key, value]) => (
            <div key={key} className="mb-2">
              <label className="block text-sm font-medium mb-1">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <input
                type={typeof value === "number" ? "number" : "text"}
                value={value as string | number}
                onChange={(e) => {
                  const updatedValue = typeof value === "number" 
                    ? parseFloat(e.target.value) || 0 
                    : e.target.value;
                  
                  onElementEdit({
                    ...selectedElement,
                    properties: {
                      ...selectedElement.properties,
                      [key]: updatedValue
                    }
                  }, false);
                }}
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
        </div>
      )}
      
      {selectedElement.computed && Object.keys(selectedElement.computed).length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium mb-2">Computed Values</h4>
          {Object.entries(selectedElement.computed).map(([key, value]) => (
            value !== undefined && (
              <div key={key} className="mb-2">
                <label className="block text-sm font-medium mb-1">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <div className="text-sm text-gray-600">
                  {typeof value === "number" ? value.toFixed(2) : String(value)}
                </div>
              </div>
            )
          ))}
        </div>
      )}
      
      <button
        onClick={() => onElementEdit(selectedElement, true)}
        className="w-full bg-red-500 text-white py-2 px-4 rounded"
      >
        Delete Element
      </button>
    </div>
  );
};

export default PropertiesPanel;