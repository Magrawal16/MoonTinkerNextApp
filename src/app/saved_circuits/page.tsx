"use client";
import React from 'react';
import { getSavedCircuitsList, getCircuitById } from '@/circuit_canvas/utils/circuitStorage';
// (removed duplicate FaMicrochip import)
import { useRouter } from 'next/navigation';
import { FaBatteryFull, FaLightbulb, FaMicrochip, FaMicrophone, FaRegStickyNote, FaBolt, FaQuestion, FaPlus, FaTrash, FaUpload, FaLink } from 'react-icons/fa';

const SavedCircuitsPage = () => {

  const [savedCircuits, setSavedCircuits] = React.useState<Array<{ id: string; name: string; createdAt?: string; updatedAt?: string }>>([]);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setSavedCircuits(getSavedCircuitsList());
    }
  }, []);

  const handleLoad = (id: string) => {
    if (typeof window !== 'undefined') {
      const circuit = getCircuitById(id);
      if (circuit) {
        localStorage.setItem('mt_circuit_elements', JSON.stringify(circuit.elements));
        localStorage.setItem('mt_circuit_wires', JSON.stringify(circuit.wires));
        // Remove imported circuit if any
        localStorage.removeItem('mt:importedCircuit');
        // Redirect to canvas
        router.push('/circuit_canvas');
      } else {
        alert('Circuit not found.');
      }
    }
  };

  const router = useRouter();

  const handleCreate = () => {
    // Only clear session/working circuit data, not saved circuits
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mt:importedCircuit');
      localStorage.removeItem('mt_circuit_elements');
      localStorage.removeItem('mt_circuit_wires');
      localStorage.removeItem('mt_controller_code_map');
      // Do NOT remove saved circuits (e.g., mt:savedCircuits or similar)
    }
    router.push('/circuit_canvas'); // Redirect to blank circuit page
  };

  const [importLink, setImportLink] = React.useState("");

  const handleImport = () => {
    try {
      const url = new URL(importLink);
      const circuitData = url.searchParams.get("circuit");
      if (circuitData) {
        // Store circuit data in localStorage or pass via query (for demo, use localStorage)
        localStorage.setItem("mt:importedCircuit", circuitData);
        router.push("/circuit_canvas?imported=1");
      } else {
        alert("No circuit data found in link.");
      }
    } catch (e) {
      alert("Invalid link format.");
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      padding: '0',
      fontFamily: 'Geist, sans-serif',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <FaMicrochip size={48} color="#6366f1" style={{ marginBottom: '0.5rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Welcome Back!</h1>
          <p style={{ color: '#475569', fontSize: '1.1rem' }}>Your saved circuits are ready. Start tinkering or create something new!</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#334155', fontWeight: 600 }}>Saved Circuits</h2>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', padding: '0.5rem 1.2rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', boxShadow: '0 2px 8px #6366f122', cursor: 'pointer', fontWeight: 600 }}
            onClick={handleCreate}
          >
            <FaPlus /> Create
          </button>
        </div>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {savedCircuits.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', fontSize: '1.1rem' }}>No circuits saved yet.</div>
          ) : (
            savedCircuits.map(circuit => (
              <div key={circuit.id} style={{ background: '#fff', borderRadius: 8, padding: '1rem', boxShadow: '0 2px 8px #6366f122' }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#334155' }}>{circuit.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>
                  Last Modified: {circuit.updatedAt ? new Date(circuit.updatedAt).toLocaleString() : (circuit.createdAt ? new Date(circuit.createdAt).toLocaleString() : 'Unknown')}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button style={{ background: '#e0e7ff', color: '#6366f1', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', fontWeight: 500, cursor: 'pointer', marginRight: 8 }} onClick={() => handleLoad(circuit.id)}>Load</button>
                  <button style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', fontWeight: 500, cursor: 'pointer' }} onClick={() => { setDeleteConfirmId(circuit.id); setDeleteConfirmName(circuit.name); }}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: '2.5rem', background: '#f1f5f9', borderRadius: '10px', padding: '1.5rem 1rem', boxShadow: '0 2px 8px #6366f122' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#334155', fontWeight: 600, marginBottom: '1rem' }}>Import Circuit</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1rem' }}>
            <FaLink color="#6366f1" />
            <input type="text" value={importLink} onChange={e => setImportLink(e.target.value)} placeholder="Paste circuit link here" style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
            <button style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleImport}><FaUpload /> Import</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedCircuitsPage;
