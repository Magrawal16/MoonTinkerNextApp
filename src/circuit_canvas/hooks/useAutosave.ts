import { useEffect, useRef, useCallback, useState } from 'react';
import { CircuitElement, Wire } from '@/circuit_canvas/types/circuit';
import { updateCircuit } from '@/circuit_canvas/utils/circuitStorage';
import { captureFullCircuitSnapshot } from '@/circuit_canvas/utils/canvasTransform';
import Konva from 'konva';

interface UseAutosaveOptions {
  circuitId: string | null;
  circuitName: string;
  elements: CircuitElement[];
  wires: Wire[];
  controllerCodeMap: Record<string, string>;
  controllerXmlMap?: Record<string, string>;
  isSimulationRunning: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  enabled?: boolean;
  debounceMs?: number;
  isCreatingWire?: boolean; // Skip autosave while wire is being created
}

interface AutosaveStatus {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error?: string;
}

/**
 * Hook to automatically save circuit changes to the backend after a debounce period.
 * 
 * Features:
 * - Debounces saves to avoid excessive API calls
 * - Only saves existing circuits (requires circuitId)
 * - Skips saves during simulation
 * - Provides status indicator for UI feedback
 * - Silent saves with minimal user interruption
 */
export function useAutosave({
  circuitId,
  circuitName,
  elements,
  wires,
  controllerCodeMap,
  controllerXmlMap,
  isSimulationRunning,
  stageRef,
  enabled = true,
  debounceMs = 4000, // Default 4 seconds after last change
  isCreatingWire = false,
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>({
    status: 'idle',
    lastSaved: null,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const lastCircuitIdRef = useRef<string | null>(null);
  const lastQueuedHashRef = useRef<string>('');

  // Compute a hash of current state to detect actual changes
  function getCurrentStateHash() {
    try {
      // Strip computed fields from elements before hashing
      const sanitizedElements = elements.map(({ computed, ...rest }) => rest);
      
      return JSON.stringify({
        name: circuitName,
        elements: sanitizedElements,
        wires,
        code: controllerCodeMap,
        xml: controllerXmlMap,
      });
    } catch (e) {
      console.warn('[Autosave] Failed to compute state hash:', e);
      return '';
    }
  }

  // When switching to a loaded circuit, seed the last-saved hash so we don't resave unchanged data
  useEffect(() => {
    if (!circuitId) return;
    if (lastCircuitIdRef.current === circuitId) return;
    lastCircuitIdRef.current = circuitId;
    lastSavedStateRef.current = getCurrentStateHash();
  }, [circuitId]);

  // Perform the actual save operation
  const performSave = useCallback(async () => {
    if (!circuitId || isSavingRef.current) {
      // If we cannot save, clear any queued state and reset status
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      lastQueuedHashRef.current = '';
      setStatus(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    const currentHash = getCurrentStateHash();
    
    // Skip if nothing changed
    if (currentHash === lastSavedStateRef.current) {
      setStatus(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    // Validate data before saving
    if (!circuitName || !circuitName.trim()) {
      console.warn('[Autosave] Skipping save - invalid circuit name');
      setStatus(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    if (!Array.isArray(elements) || !Array.isArray(wires)) {
      console.warn('[Autosave] Skipping save - invalid elements or wires');
      setStatus(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    isSavingRef.current = true;
    setStatus(prev => ({ ...prev, status: 'saving' }));

    try {
      // Capture full circuit snapshot with all elements visible
      const snapshot = stageRef.current 
        ? captureFullCircuitSnapshot(stageRef.current, 50) 
        : '';
      
      console.log('[Autosave] Saving circuit:', {
        id: circuitId,
        name: circuitName,
        elementsCount: elements.length,
        wiresCount: wires.length,
        hasControllerCode: Object.keys(controllerCodeMap || {}).length > 0,
        hasSnapshot: snapshot.length > 0,
      });

      const success = await updateCircuit(circuitId, {
        name: circuitName.trim(),
        elements,
        wires,
        snapshot,
        controllerCodeJson: controllerCodeMap,
        controllerXmlJson: controllerXmlMap,
      });

      if (success) {
        lastSavedStateRef.current = currentHash;
        console.log('[Autosave] Save successful');
        setStatus({
          status: 'saved',
          lastSaved: new Date(),
        });
        
        // Clear 'saved' status after 2 seconds
        setTimeout(() => {
          setStatus(prev => 
            prev.status === 'saved' ? { ...prev, status: 'idle' } : prev
          );
        }, 2000);
      } else {
        console.error('[Autosave] Save failed - updateCircuit returned false');
        setStatus({
          status: 'error',
          lastSaved: null,
          error: 'Save failed',
        });
      }
    } catch (error) {
      console.error('[Autosave] Error saving circuit:', error);
      setStatus({
        status: 'error',
        lastSaved: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      isSavingRef.current = false;
      lastQueuedHashRef.current = '';
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    }
  }, [
    circuitId,
    circuitName,
    elements,
    wires,
    controllerCodeMap,
    controllerXmlMap,
  ]);

  // Schedule autosave when state changes
  useEffect(() => {
    // Don't autosave if:
    // - Feature is disabled
    // - No circuit ID (new unsaved circuit)
    // - Simulation is running
    // - Currently saving
    // - Wire is being created
    if (!enabled || !circuitId || isSimulationRunning || isSavingRef.current || isCreatingWire) {
      // Clear any pending save if wire creation started
      if (isCreatingWire && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        lastQueuedHashRef.current = '';
      }
      return;
    }

    const currentHash = getCurrentStateHash();
    
    // Skip if nothing changed
    if (currentHash === lastSavedStateRef.current) {
      // Nothing to save; ensure we exit pending
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      lastQueuedHashRef.current = '';
      setStatus(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    // If this hash is already queued, don't re-queue or set pending again
    if (currentHash === lastQueuedHashRef.current && saveTimeoutRef.current) {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Track queued hash and mark pending once
    lastQueuedHashRef.current = currentHash;
    setStatus(prev => ({ ...prev, status: 'pending' }));

    // Schedule save after debounce period
    saveTimeoutRef.current = setTimeout(() => {
      lastQueuedHashRef.current = '';
      saveTimeoutRef.current = null;
      performSave();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    enabled,
    circuitId,
    isSimulationRunning,
    performSave,
    debounceMs,
    elements,
    wires,
    controllerCodeMap,
    controllerXmlMap,
    circuitName,
    isCreatingWire,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      lastQueuedHashRef.current = '';
      setStatus(prev => ({ ...prev, status: 'idle' }));
    };
  }, []);

  // Manual save trigger (if needed)
  const triggerManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    performSave();
  }, [performSave]);

  return {
    status,
    triggerManualSave,
  };
}
