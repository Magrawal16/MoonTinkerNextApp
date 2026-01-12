"use client";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteCircuitById,
  getCircuitById,
  getSavedCircuitsList,
  SaveCircuit,
  editCircuitName,
  overrideCircuit,
  duplicateCircuit,
} from "@/circuit_canvas/utils/circuitStorage";
import React from "react";
import { FaFolder, FaSearch, FaTimes, FaSave, FaCheck, FaCopy, FaTrash, FaDownload } from "react-icons/fa";

type CircuitManagerProps = {
  onCircuitSelect: (circuitId: string) => void;
  currentElements?: CircuitElement[];
  currentWires?: Wire[];
  getSnapshot?: () => string;
};

type ToastMessage = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function CircuitStorage(props: CircuitManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCircuitID, setSelectedCircuitID] = useState<string | null>(null);
  const [circuitName, setCircuitName] = useState("");
  const [selectedCircuitName, setSelectedCircuitName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const [savedCircuits, setSavedCircuits] = useState(getSavedCircuitsList());

  useEffect(() => {
    if (isOpen) {
      setSavedCircuits(getSavedCircuitsList());
      document.addEventListener("mousedown", handleClickOutside);
      // Focus save input when modal opens
      setTimeout(() => saveInputRef.current?.focus(), 100);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      setSelectedCircuitID(null);
      setSearchQuery("");
      setDeleteConfirmId(null);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCircuitSelect = (circuitId: string) => {
    props.onCircuitSelect(circuitId);
    const selected = getCircuitById(circuitId);
    setSelectedCircuitName(selected?.name ?? "");
    showToast(`Circuit "${selected?.name}" loaded successfully!`, 'success');
    setIsOpen(false);
  };

  const handleSaveCircuit = () => {
    if (!circuitName.trim()) {
      showToast('Please enter a circuit name', 'error');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      try {
        SaveCircuit(
          circuitName.trim(),
          props.currentElements ?? [],
          props.currentWires ?? [],
          props.getSnapshot?.() ?? ""
        );
        setSavedCircuits(getSavedCircuitsList());
        showToast(`Circuit "${circuitName}" saved successfully!`, 'success');
        setCircuitName("");
      } catch (error) {
        showToast('Failed to save circuit', 'error');
      } finally {
        setIsSaving(false);
      }
    }, 100);
  };

  const handleDeleteCircuit = (id: string) => {
    const circuit = getCircuitById(id);
    if (deleteCircuitById(id)) {
      setSavedCircuits(getSavedCircuitsList());
      setSelectedCircuitID(null);
      showToast(`Circuit "${circuit?.name}" deleted`, 'info');
      setDeleteConfirmId(null);
    }
  };

  const handleDuplicateCircuit = (id: string) => {
    const newId = duplicateCircuit(id);
    if (newId) {
      setSavedCircuits(getSavedCircuitsList());
      setSelectedCircuitID(newId);
      const circuit = getCircuitById(newId);
      setSelectedCircuitName(circuit?.name ?? "");
      showToast('Circuit duplicated successfully!', 'success');
    }
  };

  const handleRename = () => {
    if (!selectedCircuitID || !selectedCircuitName.trim()) return;
    if (editCircuitName(selectedCircuitID, selectedCircuitName.trim())) {
      setSavedCircuits(getSavedCircuitsList());
      showToast('Circuit renamed successfully!', 'success');
    }
  };

  const handleOverride = () => {
    if (!selectedCircuitID) return;
    const circuit = getCircuitById(selectedCircuitID);
    if (overrideCircuit(
      selectedCircuitID,
      props.currentElements ?? [],
      props.currentWires ?? [],
      props.getSnapshot?.() ?? ""
    )) {
      setSavedCircuits(getSavedCircuitsList());
      showToast(`Circuit "${circuit?.name}" updated successfully!`, 'success');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredCircuits = savedCircuits.filter(circuit =>
    circuit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && circuitName.trim()) {
      handleSaveCircuit();
    }
  };

  return (
    <>
      <button
        className="px-2 py-1 bg-[#F4F5F6] rounded border border-gray-300 shadow text-black text-xs font-medium cursor-pointer flex flex-row gap-1.5 items-center justify-center hover:shadow-blue-400 hover:scale-105"
        onClick={() => setIsOpen(true)}
        title="Open saved circuits"
      >
        <FaFolder size={11} />
        <span>Saved</span>
      </button>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[60] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300 ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {toast.type === 'success' && <FaCheck />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div
              ref={modalRef}
              className="bg-white p-6 rounded-2xl shadow-2xl w-[90%] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaFolder className="text-blue-500" />
                  Circuit Library
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>

              <div className="border-t border-gray-200 my-3"></div>

              {/* Main Content */}
              <div className="flex flex-row gap-6 flex-1 overflow-hidden">
                {/* Left Panel - Circuit List */}
                <div className="flex flex-col w-2/5 gap-3">
                  {/* Search Bar */}
                  <div className="relative group">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-blue-500 transition-colors duration-200" />
                    <input
                      type="text"
                      placeholder="Search circuits..."
                      className="w-full pl-10 pr-9 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-sm text-gray-700 placeholder-gray-400 
                                 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                                 transition-all duration-200 hover:border-gray-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Clear search"
                      >
                        <FaTimes className="text-gray-400 text-[10px]" />
                      </button>
                    )}
                  </div>

                  {/* Circuit List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {filteredCircuits.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        {searchQuery ? 'No circuits found' : 'No saved circuits yet'}
                      </div>
                    ) : (
                      filteredCircuits.map((circuit) => (
                        <div
                          key={circuit.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-150 border-2 ${
                            selectedCircuitID === circuit.id
                              ? 'bg-blue-50 border-blue-400 shadow-md'
                              : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedCircuitID(circuit.id);
                            setSelectedCircuitName(circuit.name);
                            setDeleteConfirmId(null);
                          }}
                        >
                          <div className="font-semibold text-gray-800 truncate">{circuit.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(circuit.updatedAt || circuit.createdAt)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-l border-gray-200"></div>

                {/* Right Panel - Circuit Details */}
                <div className="flex flex-col w-3/5 gap-4 overflow-y-auto">
                  {selectedCircuitID ? (
                    <>
                      {/* Preview */}
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Preview</h3>
                        {getCircuitById(selectedCircuitID)?.snapshot ? (
                          <img
                            src={getCircuitById(selectedCircuitID)!.snapshot}
                            className="w-full aspect-video object-contain rounded-lg border border-gray-200 bg-gray-50"
                            alt="Circuit Snapshot"
                          />
                        ) : (
                          <div className="w-full aspect-video flex items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <span className="text-gray-400 text-sm">No preview available</span>
                          </div>
                        )}
                      </div>

                      {/* Circuit Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Circuit Name
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedCircuitName}
                            onChange={(e) => setSelectedCircuitName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                          />
                          <button
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                            onClick={handleRename}
                          >
                            Rename
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                          onClick={() => handleCircuitSelect(selectedCircuitID)}
                        >
                          <FaDownload />
                          Load Circuit
                        </button>
                        <button
                          className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                          onClick={handleOverride}
                        >
                          <FaSave />
                          Update
                        </button>
                        <button
                          className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                          onClick={() => handleDuplicateCircuit(selectedCircuitID)}
                        >
                          <FaCopy />
                          Duplicate
                        </button>
                        {deleteConfirmId === selectedCircuitID ? (
                          <button
                            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md animate-pulse"
                            onClick={() => handleDeleteCircuit(selectedCircuitID)}
                          >
                            <FaTrash />
                            Confirm Delete?
                          </button>
                        ) : (
                          <button
                            className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            onClick={() => setDeleteConfirmId(selectedCircuitID)}
                          >
                            <FaTrash />
                            Delete
                          </button>
                        )}
                      </div>

                      {/* Info */}
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <div>Created: {formatDate(getCircuitById(selectedCircuitID)?.createdAt)}</div>
                        <div>Last updated: {formatDate(getCircuitById(selectedCircuitID)?.updatedAt)}</div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      Select a circuit to view details
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Save New Circuit */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaSave />
                  Save Current Circuit
                </h3>
                <div className="flex gap-3">
                  <input
                    ref={saveInputRef}
                    type="text"
                    placeholder="Enter circuit name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={circuitName}
                    onChange={(e) => setCircuitName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      isSaving || !circuitName.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
                    }`}
                    onClick={handleSaveCircuit}
                    disabled={isSaving || !circuitName.trim()}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Save Circuit
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
