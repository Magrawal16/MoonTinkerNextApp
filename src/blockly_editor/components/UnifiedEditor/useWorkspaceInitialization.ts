import { useCallback, useRef } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { BidirectionalConverter } from "@/blockly_editor/utils/blocklyPythonConvertor";
import { createUpdatedBlocklyEditor, SharedBlockRegistry } from "@/blockly_editor/utils/sharedBlockDefinitions";
import { setupRegistryAndGenerators } from "./hooks/useRegistrySetup";
import { createSimpleToolbox } from "./toolbox";
import {
  updateAllLedBlockStates,
  updateForeverBlockStates,
  updateOnStartBlockStates,
  ensureVariableShadowsOnBlock,
  updateLedBlockRunState,
} from "./blockValidation";
import { injectCategoryStyles, injectAnimationStyles, applyModernCategoryStyles } from "./workspaceStyles";
import { applyFieldEditorPatches } from "./hooks/useEditorPatches";
import { addWorkspaceListeners } from "./hooks/useWorkspaceListeners";

interface UseWorkspaceInitializationProps {
  blocklyRef: React.RefObject<HTMLDivElement | null>;
  workspaceRef: React.MutableRefObject<Blockly.Workspace | null>;
  setWorkspaceReady: (ready: boolean) => void;
  setBidirectionalConverter: (converter: BidirectionalConverter | null) => void;
  setIsUpdatingFromBlocks: (updating: boolean) => void;
  setControllerCodeMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveWorkspaceState: (controllerId?: string) => void;
  activeControllerId: string | null;
  isUpdatingFromCode: boolean;
  localCodeRef: React.MutableRefObject<string>;
  lastCodeRef: React.MutableRefObject<string>;
  loadWorkspaceState: (controllerId?: string) => boolean;
  stopSimulationRef: React.MutableRefObject<(() => void) | undefined>;
  setIsConverting: (converting: boolean) => void;
  setConversionType: (type: "toBlocks" | "toText" | null) => void;
}

export function useWorkspaceInitialization({
  blocklyRef,
  workspaceRef,
  setWorkspaceReady,
  setBidirectionalConverter,
  setIsUpdatingFromBlocks,
  setControllerCodeMap,
  saveWorkspaceState,
  activeControllerId,
  isUpdatingFromCode,
  localCodeRef,
  lastCodeRef,
  loadWorkspaceState,
  stopSimulationRef,
  setIsConverting,
  setConversionType,
}: UseWorkspaceInitializationProps) {
  const pendingCreationGroups = useRef<Set<string>>(new Set());
  const creationTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const xmlSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingFromBlocksRef = useRef(false);

  const initializeWorkspace = useCallback(() => {
    if (!blocklyRef.current) {
      return;
    }

    if (workspaceRef.current && workspaceRef.current.rendered) {
      setWorkspaceReady(true);
      return;
    }

    if (workspaceRef.current) {
      try {
        workspaceRef.current.dispose();
      } catch (error) {
        // Silently handle errors
      }
      workspaceRef.current = null;
      setWorkspaceReady(false);
    }

    try {
      // Initialize shared blocks + generators via modular helper
      const Editor = createUpdatedBlocklyEditor();
      Editor.initializeSharedBlocks();
      Editor.setupPythonGenerators(pythonGenerator);

      const workspace = Blockly.inject(blocklyRef.current, {
        toolbox: createSimpleToolbox(),
        renderer: "zelos",
        trashcan: true,
        scrollbars: true,
        sounds:false,
        zoom: {
          controls: true,
          wheel: true,
        },
        theme: Blockly.Theme.defineTheme("custom", {
          name: "custom",
          base: Blockly.Themes.Classic,
          componentStyles: {
            workspaceBackgroundColour: "#d3d3d3",
            toolboxBackgroundColour: "#ffffff",
            toolboxForegroundColour: "#333333",
            flyoutBackgroundColour: "#ffffff",
            flyoutForegroundColour: "#333333",
            flyoutOpacity: 1,
            scrollbarColour: "#cccccc",
            scrollbarOpacity: 0.5,
          },
        }),
      });

      if (!workspace) {
        throw new Error("Workspace creation failed");
      }

      workspaceRef.current = workspace;

      // Apply editor field patches via helper
      applyFieldEditorPatches();

      // Register variables category & button via modular helper
      setupRegistryAndGenerators(workspace as Blockly.WorkspaceSvg);

      SharedBlockRegistry.setupDuplicateOnDragListener(workspace as Blockly.WorkspaceSvg);

      // Custom prompt dialog for variables
      try {
        const dialog: any = (Blockly as any).dialog || ((Blockly as any).dialog = {});
        if (typeof dialog.setPrompt !== "function") {
          dialog.setPrompt = (fn: any) => {
            dialog.showPrompt = fn;
          };
        }

        if (!dialog.showPrompt) {
          dialog.setPrompt(
            (
              message: string,
              defaultValue: string,
              callback: (val: string | null) => void
            ) => {
              const overlay = document.createElement("div");
              overlay.style.cssText =
                "position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9999";

              const modal = document.createElement("div");
              modal.style.cssText =
                "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.15);min-width:360px;max-width:90vw;padding:16px";

              const title = document.createElement("div");
              title.textContent = message || "New variable name:";
              title.style.cssText =
                "font-size:16px;font-weight:600;margin-bottom:10px";
              modal.appendChild(title);

              const input = document.createElement("input");
              input.type = "text";
              input.value = defaultValue || "";
              input.style.cssText =
                "width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;outline:none";
              input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") ok();
                if (e.key === "Escape") cancel();
              });
              modal.appendChild(input);

              const actions = document.createElement("div");
              actions.style.cssText =
                "display:flex;gap:8px;justify-content:flex-end;margin-top:14px";

              const cancelBtn = document.createElement("button");
              cancelBtn.textContent = "Cancel";
              cancelBtn.style.cssText =
                "padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff";
              cancelBtn.onclick = () => cancel();

              const okBtn = document.createElement("button");
              okBtn.textContent = "OK";
              okBtn.style.cssText =
                "padding:8px 12px;border-radius:6px;background:#2563eb;color:#fff";
              okBtn.onclick = () => ok();

              actions.appendChild(cancelBtn);
              actions.appendChild(okBtn);
              modal.appendChild(actions);

              overlay.appendChild(modal);
              document.body.appendChild(overlay);
              setTimeout(() => input.focus(), 0);

              const cleanup = () => {
                if (overlay.parentElement)
                  overlay.parentElement.removeChild(overlay);
              };
              const ok = () => {
                const val = input.value.trim();
                cleanup();
                callback(val || null);
              };
              const cancel = () => {
                cleanup();
                callback(null);
              };
            }
          );
        }
      } catch (e) {
        // Silently fail
      }

      // Enhance flyout for variable blocks with shadows
      try {
        const enhanceFlyout = (host: any) => {
          if (!host || typeof host.flyoutCategory !== "function") return;
          const original = host.flyoutCategory.bind(host);
          const ensureJsonShadows = (items: any[]) => {
            items.forEach((item) => {
              if (item?.kind !== "block") return;
              if (item.type === "variables_set") {
                item.inputs = item.inputs || {};
                const v = item.inputs["VALUE"];
                if (!v || !v.shadow) {
                  item.inputs["VALUE"] = {
                    shadow: { type: "math_number", fields: { NUM: 0 } },
                  };
                }
              } else if (item.type === "math_change") {
                item.inputs = item.inputs || {};
                const d = item.inputs["DELTA"];
                if (!d || !d.shadow) {
                  item.inputs["DELTA"] = {
                    shadow: { type: "math_number", fields: { NUM: 1 } },
                  };
                }
              }
            });
          };
          const ensureXmlShadow = (
            el: Element,
            inputName: string,
            def: number
          ) => {
            let valueEl = Array.from(el.children).find(
              (c) =>
                c.tagName.toLowerCase() === "value" &&
                c.getAttribute("name") === inputName
            ) as Element | undefined;
            if (!valueEl) {
              valueEl = document.createElement("value");
              valueEl.setAttribute("name", inputName);
              el.appendChild(valueEl);
            } else {
              while (valueEl.firstChild) valueEl.removeChild(valueEl.firstChild);
            }
            const shadow = document.createElement("shadow");
            shadow.setAttribute("type", "math_number");
            const field = document.createElement("field");
            field.setAttribute("name", "NUM");
            field.textContent = String(def);
            shadow.appendChild(field);
            valueEl.appendChild(shadow);
          };

          host.flyoutCategory = function (ws: any, ...rest: any[]) {
            let items: any;
            try {
              items = original(ws, false);
            } catch (_) {
              items = original(ws);
            }
            if (Array.isArray(items)) {
              ensureJsonShadows(items);
            } else if (items && typeof items.length === "number") {
              for (let i = 0; i < items.length; i++) {
                const node = items[i] as any;
                if (
                  node?.nodeType === 1 &&
                  node.tagName?.toLowerCase() === "block"
                ) {
                  const type = node.getAttribute("type");
                  if (type === "variables_set") ensureXmlShadow(node, "VALUE", 0);
                  else if (type === "math_change")
                    ensureXmlShadow(node, "DELTA", 1);
                }
              }
            }
            return items;
          };
        };
        enhanceFlyout((Blockly as any).Variables);
        enhanceFlyout((Blockly as any).VariablesDynamic);
      } catch (e) {
        // Silently fail
      }

      // Patch flyout show to ensure shadows
      try {
        const tryPatchFlyoutShow = () => {
          const ws: any = workspaceRef.current;
          if (!ws) return;
          const toolbox =
            typeof ws.getToolbox === "function" ? ws.getToolbox() : null;
          const flyout: any =
            toolbox?.getFlyout?.() ||
            (typeof ws.getFlyout === "function" ? ws.getFlyout() : null);
          if (!flyout || typeof flyout.show !== "function") return;
          if ((flyout as any).__moontinkerPatched) return;

          const originalShow = flyout.show.bind(flyout);
          flyout.show = function (...args: any[]) {
            originalShow(...args);
            try {
              const fws: any =
                typeof flyout.getWorkspace === "function"
                  ? flyout.getWorkspace()
                  : flyout.workspace_;
              const blocks: any[] = fws?.getAllBlocks?.(false) || [];
              blocks.forEach((b: any) => ensureVariableShadowsOnBlock(b));
            } catch (_) {}
          };
          (flyout as any).__moontinkerPatched = true;
        };

        tryPatchFlyoutShow();
        setTimeout(tryPatchFlyoutShow, 0);
        setTimeout(tryPatchFlyoutShow, 200);
      } catch (_) {}

      // Create converter
      const converter = new BidirectionalConverter(workspace, pythonGenerator);
      setBidirectionalConverter(converter);

      // Set up change listener via helper
      const changeListener = addWorkspaceListeners(workspaceRef, {
        activeControllerId,
        saveWorkspaceState,
        stopSimulationRef,
        setControllerCodeMap,
        lastCodeRef,
        localCodeRef,
        isUpdatingFromCode,
        setIsUpdatingFromBlocks,
        setWorkspaceReady,
        loadWorkspaceState,
        converter,
      });


      // Inject styles and apply category backgrounds immediately
      injectCategoryStyles();
      applyModernCategoryStyles();
      setWorkspaceReady(true);

      setTimeout(() => {
        const codeAtInit = localCodeRef.current;
        const loaded = loadWorkspaceState(activeControllerId || undefined);
        if (!loaded) {
          if (workspace && codeAtInit.trim() && converter) {
            try {
              converter.pythonToBlocks(codeAtInit);
              lastCodeRef.current = codeAtInit;
              setTimeout(
                () => saveWorkspaceState(activeControllerId || undefined),
                100
              );
            } catch (error) {
              // Silently handle errors
            }
          }
        }

        setTimeout(() => {
          setIsConverting(false);
          setConversionType(null);
          updateAllLedBlockStates(workspace);
          updateForeverBlockStates(workspace);
          updateOnStartBlockStates(workspace);
        }, 200);
      }, 500);
    } catch (error) {
      setWorkspaceReady(true);
      setIsConverting(false);
      setConversionType(null);
    }
  }, [
    blocklyRef,
    workspaceRef,
    setWorkspaceReady,
    setBidirectionalConverter,
    isUpdatingFromCode,
    setIsUpdatingFromBlocks,
    activeControllerId,
    setControllerCodeMap,
    lastCodeRef,
    stopSimulationRef,
    saveWorkspaceState,
    localCodeRef,
    loadWorkspaceState,
    setIsConverting,
    setConversionType,
  ]);

  return { initializeWorkspace };
}
