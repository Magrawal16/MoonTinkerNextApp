"use client";

import React, { useState } from "react";
import { CODE_SNIPPETS, CATEGORIES, CodeSnippet, CommandPaletteProps } from "@/blockly_editor/types/PythonCodeSnippet";

export default function PythonCodePalette({
  showCodePalette,
  setShowCodePalette,
  onCodeInsert,
}: CommandPaletteProps) {
  const [currentView, setCurrentView] = useState<string | null>(null); // null = main view, string = category view
  const [parameterValues, setParameterValues] = useState<Record<string, Record<string, string>>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  const navigateToCategory = (category: string) => {
    setIsAnimating(true);
    setAnimationDirection('forward');
    
    setTimeout(() => {
      setCurrentView(category);
      // Reset scroll position when navigating to category
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const navigateBack = () => {
    setIsAnimating(true);
    setAnimationDirection('backward');
    
    setTimeout(() => {
      setCurrentView(null);
      // Reset scroll position when navigating back to main view
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  // Reset to main view when palette is closed
  React.useEffect(() => {
    if (!showCodePalette) {
      setCurrentView(null);
    } else {
      // Reset scroll position when palette is opened
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 0);
    }
  }, [showCodePalette]);

  // Initialize parameter values for snippets
  React.useEffect(() => {
    const initialValues: Record<string, Record<string, string>> = {};
    CODE_SNIPPETS.forEach(snippet => {
      if (snippet.parameters) {
        initialValues[snippet.id] = {};
        snippet.parameters.forEach(param => {
          initialValues[snippet.id][param.id] = param.defaultValue;
        });
      }
    });
    setParameterValues(initialValues);
  }, []);

  const updateParameterValue = (snippetId: string, parameterId: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [snippetId]: {
        ...prev[snippetId],
        [parameterId]: value
      }
    }));
  };

  const generateCode = (snippet: CodeSnippet): string => {
    if (!snippet.parameters) {
      return snippet.code;
    }

    let code = snippet.code;
    snippet.parameters.forEach(param => {
      const value = parameterValues[snippet.id]?.[param.id] || param.defaultValue;
      code = code.replace(new RegExp(`\\{${param.id}\\}`, 'g'), value);
    });
    
    // Handle special transformations
    // For button_lower: convert button value to lowercase
    if (code.includes('{button_lower}')) {
      const buttonValue = parameterValues[snippet.id]?.['button'] || 'A';
      const buttonLower = buttonValue.toLowerCase();
      code = code.replace(new RegExp(`\\{button_lower\\}`, 'g'), buttonLower);
    }
    
    return code;
  };

  const handleDragStart = (e: React.DragEvent, snippet: CodeSnippet) => {
    const actualCode = generateCode(snippet);
    e.dataTransfer.setData("text/plain", actualCode);
    e.dataTransfer.setData(
      "application/code-snippet",
      JSON.stringify({
        ...snippet,
        code: actualCode,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };


  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Display":
        return "📱";
      case "Pins": 
        return "🔌";
      case "Buttons":
        return "🔘";
      case "Loops":
        return "🔄";
      case "Timing":
        return "⏱️";
      case "Imports":
        return "📦";
      case "Sensor":
        return "👆";
      default:
        return "📋";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Display":
        return "bg-blue-500";
      case "Pins":
        return "bg-green-500";
      case "Buttons":
        return "bg-purple-500"; 
      case "Loops":
        return "bg-orange-500";
      case "Timing":
        return "bg-red-500";
      case "Imports":
        return "bg-gray-500";
      case "Sensor":
        return "bg-teal-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div
      className={`absolute left-0 top-0 bottom-0 z-40 transition-all duration-300 overflow-visible ${
        showCodePalette ? "w-80" : "w-0"
      }`}
      style={{
        pointerEvents: showCodePalette ? "auto" : "none",
        background: showCodePalette ? "rgba(255, 255, 255, 0.95)" : "transparent",
        backdropFilter: showCodePalette ? "blur(15px)" : "none",
        WebkitBackdropFilter: showCodePalette ? "blur(15px)" : "none",
        border: showCodePalette ? "1px solid rgba(255, 255, 255, 0.3)" : "none",
        boxShadow: showCodePalette ? "0 8px 32px 0 rgba(31, 38, 135, 0.37)" : "none",
        borderRadius: showCodePalette ? "15px" : "0px",
      }}
    >
      {showCodePalette && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div 
              className={`transition-all duration-300 ease-in-out ${
                isAnimating ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {currentView ? (
                // Category view header with back button
                <div className="flex items-center gap-3">
                  <button
                    onClick={navigateBack}
                    disabled={isAnimating}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200 font-medium disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Categories
                  </button>
                </div>
              ) : (
                // Main view header
                <>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-xl">🧩</span>
                    Code Snippets
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Drag snippets into your code</p>
                </>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2">
            <div 
              className={`transition-all duration-300 ease-in-out ${
                isAnimating 
                  ? animationDirection === 'forward' 
                    ? 'transform translate-x-full opacity-0 scale-95' 
                    : 'transform -translate-x-full opacity-0 scale-95'
                  : 'transform translate-x-0 opacity-100 scale-100'
              }`}
            >
              
              {currentView ? (
                // Category-specific view
                <CategoryView 
                  category={currentView}
                  snippets={CODE_SNIPPETS.filter(snippet => snippet.category === currentView)}
                  onDragStart={handleDragStart}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryColor={getCategoryColor}
                  parameterValues={parameterValues}
                  onParameterChange={updateParameterValue}
                  generateCode={generateCode}
                  onCodeInsert={onCodeInsert} // Add this line
                />
              ) : (
                // Main categories view
                <CategoriesListView 
                  categories={CATEGORIES}
                  snippets={CODE_SNIPPETS}
                  onCategoryClick={navigateToCategory}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryColor={getCategoryColor}
                  isAnimating={isAnimating}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              💡 Drag code snippets into your editor
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for main categories list view
interface CategoriesListViewProps {
  categories: readonly string[];
  snippets: CodeSnippet[];
  onCategoryClick: (category: string) => void;
  getCategoryIcon: (category: string) => string;
  getCategoryColor: (category: string) => string;
  isAnimating?: boolean;
}

function CategoriesListView({
  categories,
  snippets,
  onCategoryClick,
  getCategoryIcon,
  getCategoryColor,
  isAnimating,
}: CategoriesListViewProps) {
  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const categorySnippets = snippets.filter(
          (snippet) => snippet.category === category
        );
        
        if (categorySnippets.length === 0) return null;
        
        return (
          <button
            key={category}
            onClick={() => onCategoryClick(category)}
            disabled={isAnimating}
            className="w-full flex items-center justify-between p-5 rounded-2xl hover:bg-gray-50 transition-all duration-200 group border border-gray-100 hover:border-gray-200 hover:shadow-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${getCategoryColor(category)} flex items-center justify-center text-white text-xl font-semibold shadow-lg`}>
                {getCategoryIcon(category)}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800 text-lg mb-1">{category}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {category === "Display" && "The micro:bit's LED display output"}
                  {category === "Pins" && "Use digital and analog pins in code"}
                  {category === "Buttons" && "Use button inputs in your code"}
                  {category === "Loops" && "Count and repeat sets of commands"}
                  {category === "Timing" && "Pause and timing functions"}
                  {category === "Imports" && "Essential Python module imports"}
                  {category === "Sensor" && "Use logo touch and sensor events"}

                </p>
              </div>
            </div>
            <svg 
              className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// Helper component for category-specific view
interface CategoryViewProps {
  category: string;
  snippets: CodeSnippet[];
  onDragStart: (e: React.DragEvent, snippet: CodeSnippet) => void;
  getCategoryIcon: (category: string) => string;
  getCategoryColor: (category: string) => string;
  parameterValues: Record<string, Record<string, string>>;
  onParameterChange: (
    snippetId: string,
    parameterId: string,
    value: string
  ) => void;
  generateCode: (snippet: CodeSnippet) => string;
  onCodeInsert?: (code: string) => void; // Add this line
}

function CategoryView({
  category,
  snippets,
  onDragStart,
  getCategoryIcon,
  getCategoryColor,
  parameterValues,
  onParameterChange,
  generateCode,
  onCodeInsert
}: CategoryViewProps) {


  const handleCodeClick = (snippet: CodeSnippet) => {
    if (onCodeInsert) {
      onCodeInsert(generateCode(snippet));
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className={`w-12 h-12 rounded-xl ${getCategoryColor(category)} flex items-center justify-center text-white text-lg font-semibold shadow-sm`}>
          {getCategoryIcon(category)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{category}</h2>
          <p className="text-sm text-gray-600">
            {category === "Display" && "The micro:bit's LED display output"}
            {category === "Pins" && "Use digital and analog pins in code"}
            {category === "Buttons" && "Use button inputs in your code"}
            {category === "Loops" && "Count and repeat sets of commands"}
            {category === "Timing" && "Pause and timing functions"}
            {category === "Imports" && "Essential Python module imports"}
            {category === "Sensor" && "Use logo touch and sensor events"}
          </p>
        </div>
      </div>

      {/* Snippets Grid */}
      <div className="space-y-3">
        {snippets.map((snippet) => (
          <div
            key={snippet.id}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h5 className="font-semibold text-gray-800 text-base mb-2">{snippet.name}</h5>
                <p className="text-sm text-gray-600 mb-3">{snippet.description}</p>
                
                {/* Parameter Controls */}
                {snippet.parameters && snippet.parameters.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {snippet.parameters.map((param) => (
                      <div key={param.id} className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 min-w-[80px]">
                          {param.name}:
                        </label>
                        {param.type === 'dropdown' ? (
                          <select
                            value={parameterValues[snippet.id]?.[param.id] || param.defaultValue}
                            onChange={(e) => onParameterChange(snippet.id, param.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
                          >
                            {param.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : param.type === 'number' ? (
                          <input
                            type="number"
                            value={parameterValues[snippet.id]?.[param.id] || param.defaultValue}
                            onChange={(e) => onParameterChange(snippet.id, param.id, e.target.value)}
                            placeholder={param.placeholder}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                          />
                        ) : (
                          <input
                            type="text"
                            value={parameterValues[snippet.id]?.[param.id] || param.defaultValue}
                            onChange={(e) => onParameterChange(snippet.id, param.id, e.target.value)}
                            placeholder={param.placeholder}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Code Block with Drag Handle */}
                <div className="relative group">
  <div 
    className="relative p-3 bg-teal-50 rounded-lg border border-teal-200 group-hover:border-teal-300 group-hover:bg-teal-100/50 transition-all duration-200 cursor-grab active:cursor-grabbing"
    draggable
    onDragStart={(e) => onDragStart(e, snippet)}
    onClick={() => handleCodeClick(snippet)} // Add this line
    // ERROR : Cannot find name 'handleCodeClick'.
  >
                    {/* Drag dots - appears on hover */}
    <div className="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity duration-200">
      <svg className="w-2 h-4 text-gray-500" fill="currentColor" viewBox="0 0 8 16">
        <circle cx="2" cy="4" r="1"/>
        <circle cx="6" cy="4" r="1"/>
        <circle cx="2" cy="8" r="1"/>
        <circle cx="6" cy="8" r="1"/>
        <circle cx="2" cy="12" r="1"/>
        <circle cx="6" cy="12" r="1"/>
      </svg>
    </div>
    
    <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto pl-6">
      {generateCode(snippet)}
    </pre>
  </div>
</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
