"use client";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteCircuitById,
  getCircuitById,
  getSavedCircuitsList,
  SaveCircuit,
  updateCircuit,
  duplicateCircuit,
} from "@/circuit_canvas/utils/circuitStorage";
import React from "react";
import { FaFolder, FaSearch, FaTimes, FaSave, FaCheck, FaCopy, FaTrash, FaDownload } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { APP_MESSAGES } from "@/common/constants/messages";

type CircuitManagerProps = {
  onCircuitSelect: (circuitId: string) => void;
  currentElements?: CircuitElement[];
  currentWires?: Wire[];
  getSnapshot?: () => string;
  onOpenModal?: () => void; // Called when modal opens (e.g., to stop simulation)
  onCircuitNameChange?: (name: string) => void; // Called when circuit is renamed
  currentCircuitId?: string; // ID of the currently loaded circuit
  currentCircuitName?: string; // Current circuit name to use as default for saving
  controllerCodeMap?: Record<string, string>; // Map of controller ID to code
  onControllerCodeMapLoad?: (codeMap: Record<string, string>) => void; // Called when circuit with code is loaded
  controllerXmlMap?: Record<string, string>; // Map of controller ID to XML
  onControllerXmlMapLoad?: (xmlMap: Record<string, string>) => void; // Called when circuit with XML is loaded
};

type ToastMessage = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function CircuitStorage(props: CircuitManagerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCircuitID, setSelectedCircuitID] = useState<string | null>(null);
  const [selectedCircuitData, setSelectedCircuitData] = useState<any>(null);
  const [circuitName, setCircuitName] = useState("");
  const [selectedCircuitName, setSelectedCircuitName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCircuitId, setLoadingCircuitId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const [savedCircuits, setSavedCircuits] = useState<{ id: string; name: string; createdAt?: string; updatedAt?: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getSavedCircuitsList().then(circuits => {
        setSavedCircuits(circuits);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
      
      // Auto-select the currently loaded circuit if it exists from props
      const circuitIdToSelect = props.currentCircuitId || (() => {
        try {
          // Fallback to localStorage if props.currentCircuitId is not set yet
          return localStorage.getItem('mt_circuit_id') || null;
        } catch (e) {
          return null;
        }
      })();

      if (circuitIdToSelect) {
        setSelectedCircuitID(circuitIdToSelect);
        setSelectedCircuitName(props.currentCircuitName || "");
        // Fetch the circuit data for the loaded circuit
        getCircuitById(circuitIdToSelect).then(data => {
          if (data) {
            setSelectedCircuitData(data);
            setSelectedCircuitName(data.name || "");
          }
        }).catch(e => console.warn("Failed to fetch circuit data:", e));
      }
      
      // Always populate the save input with current circuit name when modal opens
      if (props.currentCircuitName) {
        setCircuitName(props.currentCircuitName);
      }
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
  }, [isOpen, props.currentCircuitId, props.currentCircuitName]);

  const handleCircuitSelect = async (circuitId: string) => {
    setLoadingCircuitId(circuitId);
    try {
      props.onCircuitSelect(circuitId);
      const selected = await getCircuitById(circuitId);
      setSelectedCircuitName(selected?.name ?? "");
      // Load controller code if available
      if (selected?.controllerCodeMap) {
        props.onControllerCodeMapLoad?.(selected.controllerCodeMap);
      }
      // Load controller XML if available
      if (selected?.controllerXmlMap) {
        props.onControllerXmlMapLoad?.(selected.controllerXmlMap);
      }
      showToast(`Circuit "${selected?.name}" loaded successfully!`, 'success');
    } finally {
      setLoadingCircuitId(null);
    }
    setIsOpen(false);
  };

  const handleSaveCircuit = async () => {
    if (!circuitName.trim()) {
      showToast('Please enter a circuit name', 'error');
      return;
    }

    // Check if a circuit with the same name already exists
    const circuitNameExists = savedCircuits.some(
      circuit => circuit.name.toLowerCase() === circuitName.trim().toLowerCase()
    );

    if (circuitNameExists) {
      showToast(APP_MESSAGES.PROMPTS.DUPLICATE_CIRCUIT, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const newId = await SaveCircuit(
        circuitName.trim(),
        props.currentElements ?? [],
        props.currentWires ?? [],
        props.getSnapshot?.() ?? "",
        props.controllerCodeMap ?? {},
        props.controllerXmlMap ?? {}
      );
      const updatedList = await getSavedCircuitsList();
      setSavedCircuits(updatedList);
      // Update parent with new circuit ID
      if (typeof props.onCircuitSelect === 'function' && newId) {
        props.onCircuitSelect(newId);
      }
      showToast(APP_MESSAGES.SUCCESS.CIRCUIT_SAVED, 'success');
      setCircuitName("");
    } catch (error) {
      showToast('Failed to save circuit', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCircuit = async (id: string) => {
    setIsLoading(true);
    try {
      const circuit = await getCircuitById(id);
      const deleted = await deleteCircuitById(id);
      if (deleted) {
        const updatedList = await getSavedCircuitsList();
        setSavedCircuits(updatedList);
        setSelectedCircuitID(null);
        setDeleteConfirmId(null);
        // Show toast and redirect if deleted circuit is the current circuit
        if (props.currentCircuitId === id) {
          showToast(APP_MESSAGES.SUCCESS.CIRCUIT_DELETED, 'info');
          setTimeout(() => {
            router.push('/saved_circuits');
          }, 1200); // Give time for toast to show
        } else {
          showToast(APP_MESSAGES.SUCCESS.CIRCUIT_DELETED, 'info');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateCircuit = async (id: string) => {
    setIsLoading(true);
    try {
      const newId = await duplicateCircuit(id);
      if (newId) {
        const updatedList = await getSavedCircuitsList();
        setSavedCircuits(updatedList);
        setSelectedCircuitID(newId);
        const circuit = await getCircuitById(newId);
        setSelectedCircuitName(circuit?.name ?? "");
        showToast(APP_MESSAGES.SUCCESS.CIRCUIT_DUPLICATED, 'success');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async () => {
    if (!selectedCircuitID || !selectedCircuitName.trim()) return;
    setIsLoading(true);
    try {
      const renamed = await updateCircuit(selectedCircuitID, { name: selectedCircuitName.trim() });
      if (renamed) {
        const updatedList = await getSavedCircuitsList();
        setSavedCircuits(updatedList);
        // Also refresh the selected circuit data to get updated timestamps and snapshots
        const updatedCircuit = await getCircuitById(selectedCircuitID);
        setSelectedCircuitData(updatedCircuit);
        // Notify parent of circuit name change
        props.onCircuitNameChange?.(selectedCircuitName.trim());
        showToast(APP_MESSAGES.SUCCESS.CIRCUIT_RENAMED, 'success');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!selectedCircuitID) return;
    setIsLoading(true);
    try {
      const circuit = await getCircuitById(selectedCircuitID);
      const overridden = await updateCircuit(selectedCircuitID, {
        name: circuit?.name,
        elements: props.currentElements ?? [],
        wires: props.currentWires ?? [],
        snapshot: props.getSnapshot?.() ?? "",
        controllerCodeJson: props.controllerCodeMap ?? {},
        controllerXmlJson: props.controllerXmlMap ?? {},
      });
      if (overridden) {
        const updatedList = await getSavedCircuitsList();
        setSavedCircuits(updatedList);
        // Also refresh the selected circuit data to get updated timestamps and snapshots
        const updatedCircuit = await getCircuitById(selectedCircuitID);
        setSelectedCircuitData(updatedCircuit);
        showToast(`Circuit "${circuit?.name}" updated successfully!`, 'success');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
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
        className="px-3 py-2 bg-[#F4F5F6] rounded border border-gray-300 shadow text-black text-sm font-medium cursor-pointer flex flex-row gap-2 items-center justify-center hover:shadow-blue-400 hover:scale-105"
        onClick={() => {
          props.onOpenModal?.();
          setIsOpen(true);
        }}
        title="Open saved circuits"
      >
        <FaFolder size={16} />
        <span className="text-sm font-medium">Saved</span>
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
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="hover:opacity-70 transition-opacity ml-2"
              aria-label="Close notification"
            >
              <FaTimes size={14} />
            </button>
          </div>
        ))}
      </div>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div
              ref={modalRef}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <FaFolder className="text-blue-500" />
                  Circuit Library
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-500 text-xl" />
                </button>
              </div>

              {/* Main Content - 3 Column Layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Circuit List (30%) */}
                <div className="w-[30%] flex flex-col border-r border-gray-200 bg-gray-50">
                  <div className="p-4 space-y-3">
                    {/* Search Bar */}
                    <div className="relative group">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search circuits..."
                        className="w-full pl-9 pr-9 py-2 border-2 border-gray-300 rounded-lg bg-white text-sm text-gray-700 placeholder-gray-400 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Clear search"
                        >
                          <FaTimes className="text-gray-400 text-xs" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Circuit List */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {isLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {filteredCircuits.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-sm">
                        {searchQuery ? 'No circuits found' : 'No saved circuits yet'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredCircuits.map((circuit) => (
                          <div
                            key={circuit.id}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-150 border-2 ${
                              selectedCircuitID === circuit.id
                                ? 'bg-blue-500 border-blue-600 shadow-lg text-white'
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                            }`}
                            onClick={async () => {
                              if (isLoading) return;
                              setSelectedCircuitID(circuit.id);
                              setSelectedCircuitName(circuit.name);
                              setDeleteConfirmId(null);
                              setIsLoading(true);
                              try {
                                const data = await getCircuitById(circuit.id);
                                setSelectedCircuitData(data);
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                          >
                            <div className={`font-semibold text-sm truncate ${selectedCircuitID === circuit.id ? 'text-white' : 'text-gray-800'}`}>
                              {circuit.name}
                            </div>
                            <div className={`text-xs mt-1 ${selectedCircuitID === circuit.id ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatDate(circuit.updatedAt || circuit.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Panel - Preview (45%) */}
                <div className="w-[45%] flex flex-col bg-white">
                  {selectedCircuitID ? (
                    <div className="flex-1 flex flex-col p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Circuit Preview</h3>
                        <div className="text-xs text-gray-500 space-y-0.5 text-right">
                          <div>Created: {formatDate(selectedCircuitData?.createdAt)}</div>
                          <div>Updated: {formatDate(selectedCircuitData?.updatedAt)}</div>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-gray-200 p-4">
                        {selectedCircuitData?.snapshot ? (
                          <img
                            src={selectedCircuitData.snapshot}
                            className="max-w-full max-h-full object-contain"
                            alt="Circuit Snapshot"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-gray-300 text-6xl mb-3">📋</div>
                            <span className="text-gray-400 text-sm">No preview available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-300">
                      <div className="text-center">
                        <div className="text-7xl mb-4">🔌</div>
                        <p className="text-lg">Select a circuit to view details</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel - Actions (25%) */}
                <div className="w-[25%] flex flex-col border-l border-gray-200 bg-gray-50">
                  {selectedCircuitID ? (
                    <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                      {/* Circuit Name */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                          Circuit Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                          value={selectedCircuitName}
                          onChange={(e) => setSelectedCircuitName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                          placeholder="Enter name..."
                        />
                      </div>

                      {/* Rename Button */}
                      <button
                        className={`w-full px-4 py-2.5 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                          isLoading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                        }`}
                        onClick={handleRename}
                        disabled={isLoading}
                      >
                        <FaSave />
                        Rename Circuit
                      </button>

                      <div className="border-t border-gray-300 my-2"></div>

                      {/* Primary Actions */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                          Actions
                        </label>
                        <button
                          className={`w-full px-4 py-3 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                            loadingCircuitId === selectedCircuitID
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                          }`}
                          onClick={() => handleCircuitSelect(selectedCircuitID || '')}
                          disabled={loadingCircuitId === selectedCircuitID}
                        >
                          {loadingCircuitId === selectedCircuitID ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Loading...
                            </>
                          ) : (
                            <>
                              <FaDownload />
                              Load Circuit
                            </>
                          )}
                        </button>
                        <button
                          className={`w-full px-4 py-3 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                            isLoading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
                          }`}
                          onClick={handleOverride}
                          disabled={isLoading}
                        >
                          <FaSave />
                          Update Circuit
                        </button>
                        <button
                          className={`w-full px-4 py-3 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                            isLoading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg'
                          }`}
                          onClick={() => handleDuplicateCircuit(selectedCircuitID || '')}
                          disabled={isLoading}
                        >
                          <FaCopy />
                          Duplicate
                        </button>
                      </div>

                      <div className="border-t border-gray-300 my-2"></div>

                      {/* Danger Zone */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-red-600 mb-2 uppercase tracking-wide">
                          Danger Zone
                        </label>
                        {deleteConfirmId === selectedCircuitID ? (
                          <button
                            className={`w-full px-4 py-3 rounded-lg transition-all font-bold text-sm flex items-center justify-center gap-2 animate-pulse ${
                              isLoading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                            }`}
                            onClick={() => handleDeleteCircuit(selectedCircuitID || '')}
                            disabled={isLoading}
                          >
                            <FaTrash />
                            Confirm Delete?
                          </button>
                        ) : (
                          <button
                            className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                            onClick={() => setDeleteConfirmId(selectedCircuitID)}
                          >
                            <FaTrash />
                            Delete Circuit
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-4">
                      <p className="text-gray-400 text-sm text-center">Select a circuit to see available actions</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Save New Circuit */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <FaSave className="text-lg" />
                    <span className="font-bold text-sm">Save Current Circuit:</span>
                  </div>
                  <input
                    ref={saveInputRef}
                    type="text"
                    placeholder="Enter new circuit name..."
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    value={circuitName}
                    onChange={(e) => setCircuitName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 text-sm ${
                      isSaving || !circuitName.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
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
                        Save New
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
