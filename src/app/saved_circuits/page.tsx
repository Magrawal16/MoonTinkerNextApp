"use client";
import React from 'react';
import { getSavedCircuitsList, getCircuitById, deleteCircuitById } from '@/circuit_canvas/utils/circuitStorage';
import { useRouter } from 'next/navigation';
import { FaMicrochip, FaPlus, FaTrash, FaFolder, FaPlay, FaLink, FaUpload, FaBoltLightning } from 'react-icons/fa6';
import AuthHeader from '@/components/AuthHeader';
import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import { showErrorToast } from '@/common/utils/toastNotification';
import { APP_MESSAGES } from '@/common/constants/messages';

const SavedCircuitsPage = () => {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  
  const [savedCircuits, setSavedCircuits] = React.useState<Array<{ id: string; name: string; createdAt?: string; updatedAt?: string; snapshot?: string }>>([]);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [importLink, setImportLink] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      getSavedCircuitsList().then(async (circuits) => {
        // Fetch full circuit data including snapshots
        const circuitsWithSnapshots = await Promise.all(
          circuits.map(async (circuit) => {
            try {
              const fullData = await getCircuitById(circuit.id);
              return {
                ...circuit,
                snapshot: fullData?.snapshot
              };
            } catch (error) {
              console.warn(`Failed to fetch snapshot for circuit ${circuit.id}:`, error);
              return circuit;
            }
          })
        );
        setSavedCircuits(circuitsWithSnapshots);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, []);

  const handleDeleteCircuit = async (id: string) => {
    try {
      const deleted = await deleteCircuitById(id);
      if (deleted) {
        const updatedList = await getSavedCircuitsList();
        // Fetch full circuit data including snapshots for remaining circuits
        const circuitsWithSnapshots = await Promise.all(
          updatedList.map(async (circuit) => {
            try {
              const fullData = await getCircuitById(circuit.id);
              return {
                ...circuit,
                snapshot: fullData?.snapshot
              };
            } catch (error) {
              console.warn(`Failed to fetch snapshot for circuit ${circuit.id}:`, error);
              return circuit;
            }
          })
        );
        setSavedCircuits(circuitsWithSnapshots);
      }
    } catch (error) {
      showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_DELETE_FAILED);
    }
    setDeleteConfirmId(null);
    setDeleteConfirmName(null);
  };

  const handleLoad = async (id: string) => {
    const circuit = await getCircuitById(id);
    if (circuit) {
      localStorage.setItem('mt_circuit_id', id);
      localStorage.setItem('mt_circuit_name', circuit.name);
      localStorage.setItem('mt_circuit_elements', JSON.stringify(circuit.elements));
      localStorage.setItem('mt_circuit_wires', JSON.stringify(circuit.wires));
      // Persist controller code and XML from backend
      if (circuit.controllerCodeMap) {
        localStorage.setItem('mt_controller_code_map', JSON.stringify(circuit.controllerCodeMap));
      }
      if (circuit.controllerXmlMap) {
        localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(circuit.controllerXmlMap));
      }
      localStorage.removeItem('mt:importedCircuit');
      router.push('/circuit_canvas');
    }
  };

  const handleCreate = () => {
    // Clear session data for new circuit
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mt:importedCircuit');
      localStorage.removeItem('mt_circuit_elements');
      localStorage.removeItem('mt_circuit_wires');
      localStorage.removeItem('mt_controller_code_map');
      localStorage.removeItem('mt_circuit_id'); // Clear circuit ID for new circuit
      localStorage.removeItem('mt_circuit_name'); // Clear circuit name for new circuit
      // Circuit name will be generated randomly by the canvas
    }
    router.push('/circuit_canvas?new=1');
  };

  const handleImport = () => {
    try {
      const url = new URL(importLink);
      const circuitData = url.searchParams.get("circuit");
      if (circuitData) {
        localStorage.setItem("mt:importedCircuit", circuitData);
        router.push("/circuit_canvas?imported=1");
      } else {
        showErrorToast(APP_MESSAGES.ERRORS.NO_CIRCUIT_DATA);
      }
    } catch (e) {
      showErrorToast(APP_MESSAGES.ERRORS.INVALID_LINK);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Unknown";
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLoad(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FaMicrochip className="text-white text-lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Circuit Library</h1>
          </div>
          <AuthHeader inline />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back{authContext?.userEmail ? `, ${authContext.userEmail}` : ''}!</h2>
          <p className="text-gray-600 text-lg">Select a circuit to continue editing or create a new one</p>
        </div>

        {/* Create Button - Prominent */}
        <div className="mb-8">
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <FaPlus className="text-xl" />
            Create New Circuit
          </button>
        </div>

        {/* Saved Circuits Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="ml-3 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FaBoltLightning className="text-white text-sm" />
            </div>
            <span className="text-blue-600 font-serif">Circuits</span>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : savedCircuits.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
              <FaFolder className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-6">No circuits saved yet</p>
              <p className="text-gray-400 mb-6">Create your first circuit to get started</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <FaPlus /> Create First Circuit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCircuits.map(circuit => (
                <div
                  key={circuit.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleLoad(circuit.id)}
                  onKeyDown={(e) => handleCardKeyDown(e, circuit.id)}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden group flex flex-col cursor-pointer"
                >
                  {/* Snapshot Preview */}
                  <div className="relative bg-gray-100 aspect-video overflow-hidden flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    {circuit.snapshot ? (
                      <img
                        src={circuit.snapshot}
                        alt={circuit.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <FaMicrochip className="text-4xl mx-auto mb-2" />
                        <p className="text-sm">No preview available</p>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col flex-1 p-6">
                    {/* Header */}
                    <div className="mb-4">
                      <h4 className="font-bold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {circuit.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(circuit.updatedAt || circuit.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLoad(circuit.id); }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
                      >
                        <FaPlay className="text-sm" />
                        Edit Circuit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(circuit.id);
                          setDeleteConfirmName(circuit.name);
                        }}
                        className="flex items-center justify-center px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-lg transition-colors"
                        title="Delete circuit"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Import Circuit Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaLink className="text-blue-600" />
            Import Circuit from Link
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={importLink}
              onChange={e => setImportLink(e.target.value)}
              placeholder="Paste circuit link here..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <FaUpload />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95">
            <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Circuit?</h3>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirmName}</span>?
            </p>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCircuit(deleteConfirmId)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedCircuitsPage;
