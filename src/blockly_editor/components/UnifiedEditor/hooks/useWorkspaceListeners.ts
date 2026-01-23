import * as Blockly from "blockly";
import { BidirectionalConverter } from "@/blockly_editor/utils/blocklyPythonConvertor";
import { ensureVariableShadowsOnBlock, updateAllLedBlockStates, updateForeverBlockStates, updateOnStartBlockStates, updateLedBlockRunState } from "../blockValidation";

export function addWorkspaceListeners(
  workspaceRef: React.MutableRefObject<Blockly.Workspace | null>,
  options: {
    activeControllerIdRef: React.MutableRefObject<string | null>;
    saveWorkspaceState: (controllerId?: string) => void;
    stopSimulationRef: React.MutableRefObject<(() => void) | undefined>;
    setControllerCodeMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    lastCodeRef: React.MutableRefObject<string>;
    isUpdatingFromCodeRef: React.MutableRefObject<boolean>;
    setIsUpdatingFromBlocks: (updating: boolean) => void;
    converter: BidirectionalConverter;
    isSwitchingControllerRef?: React.MutableRefObject<boolean>;
  }
) {
  const pendingCreationGroups = new Set<string>();
  const creationTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const xmlSaveTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
  const isUpdatingFromBlocksRef: { current: boolean } = { current: false };

  let conversionTimeout: ReturnType<typeof setTimeout> | null = null;
  const changeListener = (event: any) => {
    if (options.isUpdatingFromCodeRef.current) return;
    if (options.isSwitchingControllerRef?.current) return;
    const BEvents: any = (Blockly as any).Events;
    const isCreate = event.type === BEvents.BLOCK_CREATE || event.type === BEvents.CREATE;
    const isDelete = event.type === BEvents.BLOCK_DELETE || event.type === BEvents.DELETE;
    const isChange = event.type === BEvents.BLOCK_CHANGE || event.type === BEvents.CHANGE;
    const isMove = event.type === BEvents.BLOCK_MOVE || event.type === BEvents.MOVE;
    const isEndDrag = event.type === BEvents.END_DRAG || event.type === BEvents.BLOCK_DRAG;

    let affectsCode = false;
    if (isCreate || isDelete) {
      affectsCode = true;
    } else if (isChange) {
      const e: any = event;
      affectsCode = e?.element === "field" || e?.element === "mutation" || e?.element === "disabled";
    } else if (isMove) {
      const e: any = event;
      const parentChanged = e?.oldParentId !== e?.newParentId;
      const inputChanged = e?.oldInputName !== e?.newInputName;
      affectsCode = Boolean(parentChanged || inputChanged);
    }

    try {
      const w = workspaceRef.current;
      if (w) {
        if (isCreate || isDelete) {
          updateAllLedBlockStates(w);
          if (isCreate && (event as any).group) {
            const blockId = (event as any).blockId || ((event as any).ids?.[0]);
            const block = blockId ? w.getBlockById(blockId) : null;
            if (block && (block.type === "forever" || block.type === "on_start")) {
              const groupId = (event as any).group;
              pendingCreationGroups.add(groupId);
              const timeoutId = setTimeout(() => {
                if (pendingCreationGroups.has(groupId)) {
                  pendingCreationGroups.delete(groupId);
                  creationTimeouts.delete(groupId);
                  updateForeverBlockStates(w);
                  updateOnStartBlockStates(w);
                }
              }, 1000);
              creationTimeouts.set(groupId, timeoutId);
            }
          }
          if (isDelete) {
            updateForeverBlockStates(w);
            updateOnStartBlockStates(w);
          }
        } else if (isEndDrag) {
          const groupId = (event as any).group;
          if (groupId && pendingCreationGroups.has(groupId)) {
            const timeoutId = creationTimeouts.get(groupId);
            if (timeoutId) {
              clearTimeout(timeoutId);
              creationTimeouts.delete(groupId);
            }
            pendingCreationGroups.delete(groupId);
            setTimeout(() => {
              updateForeverBlockStates(w);
              updateOnStartBlockStates(w);
            }, 300);
          } else {
            updateForeverBlockStates(w);
            updateOnStartBlockStates(w);
          }
        } else if (isMove) {
          const e: any = event;
          const parentChanged = e?.oldParentId !== e?.newParentId;
          const inputChanged = e?.oldInputName !== e?.newInputName;
          const isPendingCreation = e?.group && pendingCreationGroups.has(e.group);
          if (parentChanged || inputChanged) {
            updateAllLedBlockStates(w);
            if (!isPendingCreation) {
              updateForeverBlockStates(w);
              updateOnStartBlockStates(w);
            }
          } else if ((event as any).blockId && !isPendingCreation) {
            const b = w.getBlockById((event as any).blockId);
            if (b) updateLedBlockRunState(b);
          }
        } else if (isChange) {
          const e: any = event;
          if (e?.element === "disabled" || e?.element === "mutation") {
            updateAllLedBlockStates(w);
            updateForeverBlockStates(w);
            updateOnStartBlockStates(w);
          } else if ((event as any).blockId) {
            const b = w.getBlockById((event as any).blockId);
            if (b) updateLedBlockRunState(b);
          }
        } else {
          const groupId = (event as any).group;
          const isPendingCreation = groupId && pendingCreationGroups.has(groupId);
          updateAllLedBlockStates(w);
          if (!isPendingCreation) {
            updateForeverBlockStates(w);
            updateOnStartBlockStates(w);
          }
        }
      }
    } catch (_) {}

    if (isCreate) {
      try {
        const w = workspaceRef.current;
        if (w) {
          const ids: string[] = (event.ids || (event.blockId ? [event.blockId] : [])) as any;
          ids.forEach((id) => ensureVariableShadowsOnBlock(w.getBlockById(id)));
        }
      } catch (_) {}
    }

    if (affectsCode) {
      try { options.stopSimulationRef.current?.(); } catch (_) {}
      const activeId = options.activeControllerIdRef.current;
      if (activeId) {
        if (xmlSaveTimeoutRef.current) clearTimeout(xmlSaveTimeoutRef.current);
        xmlSaveTimeoutRef.current = setTimeout(() => {
          // Re-read active id at save time to avoid stale writes
          const idNow = options.activeControllerIdRef.current;
          if (idNow) {
            options.saveWorkspaceState(idNow);
          }
        }, 400);
      }
    }

    if (conversionTimeout) clearTimeout(conversionTimeout);
    conversionTimeout = setTimeout(() => {
      const activeId = options.activeControllerIdRef.current;
      if (options.isSwitchingControllerRef?.current) return;
      if (options.converter && activeId && !isUpdatingFromBlocksRef.current) {
        try {
          isUpdatingFromBlocksRef.current = true;
          options.setIsUpdatingFromBlocks(true);
          const generatedCode = options.converter.blocksToPython();
          if (generatedCode !== options.lastCodeRef.current) {
            // Always write under the *current* active controller id
            const idNow = options.activeControllerIdRef.current;
            if (idNow) {
              options.setControllerCodeMap((prev) => ({ ...prev, [idNow]: generatedCode }));
            }
            options.lastCodeRef.current = generatedCode;
            options.stopSimulationRef.current?.();
          }
        } catch (_) {
        } finally {
          isUpdatingFromBlocksRef.current = false;
          options.setIsUpdatingFromBlocks(false);
        }
      }
    }, 300);
  };

  const ws = workspaceRef.current as any;
  ws?.addChangeListener(changeListener);

  return changeListener;
}
