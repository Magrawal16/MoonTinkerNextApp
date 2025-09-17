'use client';

import React, { useState, useEffect } from 'react';
import { FaLightbulb, FaPowerOff, FaArrowLeft, FaArrowRight, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface MicrobitControlPanelProps {
  microbitId: string;
  onPinChange: (pin: number, value: number) => void;
  onLedChange: (leds: boolean[][]) => void;
  initialPins?: Record<string, number>;
  initialLeds?: boolean[][];
}

const MicrobitControlPanel: React.FC<MicrobitControlPanelProps> = ({
  microbitId,
  onPinChange,
  onLedChange,
  initialPins = {},
  initialLeds = Array(5).fill(null).map(() => Array(5).fill(false))
}) => {
  const [pins, setPins] = useState<Record<string, number>>(initialPins);
  const [leds, setLeds] = useState<boolean[][]>(initialLeds);
  const [selectedPin, setSelectedPin] = useState<number>(0);

  // Initialize pins if not provided
  useEffect(() => {
    if (Object.keys(pins).length === 0) {
      const initialPinState: Record<string, number> = {};
      for (let i = 0; i <= 4; i++) {
        initialPinState[`pin${i}`] = 0;
      }
      setPins(initialPinState);
    }
  }, []);

  const handlePinToggle = (pin: number) => {
    const newValue = pins[`pin${pin}`] === 0 ? 1 : 0;
    const updatedPins = { ...pins, [`pin${pin}`]: newValue };
    setPins(updatedPins);
    onPinChange(pin, newValue);
  };

  const handleLedToggle = (row: number, col: number) => {
    const newLeds = [...leds];
    newLeds[row][col] = !newLeds[row][col];
    setLeds(newLeds);
    onLedChange(newLeds);
  };

  const handleArrowPattern = (direction: 'up' | 'down' | 'left' | 'right') => {
    const newLeds = Array(5).fill(null).map(() => Array(5).fill(false));
    
    switch (direction) {
      case 'up':
        for (let i = 0; i < 5; i++) newLeds[0][i] = true;
        break;
      case 'down':
        for (let i = 0; i < 5; i++) newLeds[4][i] = true;
        break;
      case 'left':
        for (let i = 0; i < 5; i++) newLeds[i][0] = true;
        break;
      case 'right':
        for (let i = 0; i < 5; i++) newLeds[i][4] = true;
        break;
    }
    
    setLeds(newLeds);
    onLedChange(newLeds);
  };

  const handleClearLeds = () => {
    const newLeds = Array(5).fill(null).map(() => Array(5).fill(false));
    setLeds(newLeds);
    onLedChange(newLeds);
  };

  const handleAllLeds = () => {
    const newLeds = Array(5).fill(null).map(() => Array(5).fill(true));
    setLeds(newLeds);
    onLedChange(newLeds);
  };

  return (
    <div className="microbit-control-panel bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Micro:bit Control - {microbitId}</h3>
      
      {/* Pin Controls */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2">Digital Pins</h4>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((pin) => (
            <div key={pin} className="flex flex-col items-center">
              <button
                className={`p-2 rounded-full ${
                  pins[`pin${pin}`] === 1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
                onClick={() => handlePinToggle(pin)}
                title={`Pin ${pin}`}
              >
                <FaLightbulb />
              </button>
              <span className="text-xs mt-1">Pin {pin}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* LED Matrix Controls */}
      <div>
        <h4 className="text-md font-medium mb-2">LED Matrix</h4>
        
        {/* LED Grid */}
        <div className="mb-4">
          <div className="inline-block bg-gray-800 p-1 rounded">
            {leds.map((row, rowIndex) => (
              <div key={rowIndex} className="flex">
                {row.map((led, colIndex) => (
                  <div
                    key={colIndex}
                    className={`w-6 h-6 m-1 rounded-full cursor-pointer ${
                      led ? 'bg-yellow-400' : 'bg-gray-600'
                    }`}
                    onClick={() => handleLedToggle(rowIndex, colIndex)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Pattern Controls */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            className="flex items-center justify-center p-2 bg-blue-100 rounded"
            onClick={() => handleArrowPattern('up')}
          >
            <FaArrowUp />
          </button>
          <button
            className="flex items-center justify-center p-2 bg-blue-100 rounded"
            onClick={() => handleArrowPattern('down')}
          >
            <FaArrowDown />
          </button>
          <button
            className="flex items-center justify-center p-2 bg-blue-100 rounded"
            onClick={() => handleArrowPattern('left')}
          >
            <FaArrowLeft />
          </button>
          <button
            className="flex items-center justify-center p-2 bg-blue-100 rounded"
            onClick={() => handleArrowPattern('right')}
          >
            <FaArrowRight />
          </button>
        </div>
        
        {/* Clear/All Controls */}
        <div className="flex gap-2">
          <button
            className="flex-1 p-2 bg-red-100 rounded flex items-center justify-center"
            onClick={handleClearLeds}
          >
            <FaPowerOff className="mr-1" /> Clear
          </button>
          <button
            className="flex-1 p-2 bg-green-100 rounded flex items-center justify-center"
            onClick={handleAllLeds}
          >
            <FaLightbulb className="mr-1" /> All On
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicrobitControlPanel;