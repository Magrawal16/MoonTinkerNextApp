/**
 * Inject CSS styles for modern category styling
 */
export function injectCategoryStyles() {
  if (!document.getElementById("moontinker-category-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "moontinker-category-styles";
    styleSheet.textContent = `
      /* Tighter Category Styling with Color Bars */
      .blocklyTreeRow,
      [role="treeitem"],
      .blocklyToolboxCategory,
      .moontinker-category {
        padding: 0 !important;
        margin: -3px 0 !important;
        margin-left: -4px !important;
        border-radius: 4px !important;
        border: none !important;
        min-height: 40px !important;
        // background: #bbb !important;
        box-shadow: none !important;
        transition: all 0.2s ease !important;
        position: relative !important;
        cursor: pointer !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        margin-right: 5px !important;
        width: 100% !important;
      }

      /* Color bar at the start of each category (moontinker-category) */
      .blocklyTreeRow::before,
      [role="treeitem"]::before,
      .blocklyToolboxCategory::before,
      .moontinker-category::before {
        content: '';
        display: block;
        width: 4px;
        height: 100%;
        min-height: 36px;
        border-radius: 2px 0 0 2px;
        margin-right: 4px;
        background: var(--mt-category-color, transparent) !important;
        flex-shrink: 0;
      }

      /* Moontinker category color bars by data-category attribute */
      /* --- Blockly Default Categories --- */
      .moontinker-category[data-category="Basic"]::before,
      .moontinker-category[data-category="basic"]::before {
        background: #4ade80 !important; /* green-400 */
      }
      .moontinker-category[data-category="Basic"],
      .moontinker-category[data-category="basic"],
      .blocklyTreeRow[data-category="Basic"],
      .blocklyTreeRow[data-category="basic"],
      [role="treeitem"][data-category="Basic"],
      [role="treeitem"][data-category="basic"],
      .blocklyToolboxCategory[data-category="Basic"],
      .blocklyToolboxCategory[data-category="basic"] {
        background: rgba(74, 222, 128, 0.18) !important;
      }
      .moontinker-category[data-category="Input"]::before,
      .moontinker-category[data-category="input"]::before {
        background: #f59e42 !important; /* orange-400 */
      }
      .moontinker-category[data-category="Input"],
      .moontinker-category[data-category="input"],
      .blocklyTreeRow[data-category="Input"],
      .blocklyTreeRow[data-category="input"],
      [role="treeitem"][data-category="Input"],
      [role="treeitem"][data-category="input"],
      .blocklyToolboxCategory[data-category="Input"],
      .blocklyToolboxCategory[data-category="input"] {
        background: rgba(245, 158, 66, 0.18) !important;
      }
      .moontinker-category[data-category="Led"]::before,
      .moontinker-category[data-category="led"]::before {
        background: #fde047 !important; /* yellow-300 */
      }
      .moontinker-category[data-category="Led"],
      .moontinker-category[data-category="led"],
      .blocklyTreeRow[data-category="Led"],
      .blocklyTreeRow[data-category="led"],
      [role="treeitem"][data-category="Led"],
      [role="treeitem"][data-category="led"],
      .blocklyToolboxCategory[data-category="Led"],
      .blocklyToolboxCategory[data-category="led"] {
        background: rgba(253, 224, 71, 0.18) !important;
      }
      .moontinker-category[data-category="Logic"]::before,
      .moontinker-category[data-category="logic"]::before {
        background: #38bdf8 !important; /* sky-400 */
      }
      .moontinker-category[data-category="Logic"],
      .moontinker-category[data-category="logic"],
      .blocklyTreeRow[data-category="Logic"],
      .blocklyTreeRow[data-category="logic"],
      [role="treeitem"][data-category="Logic"],
      [role="treeitem"][data-category="logic"],
      .blocklyToolboxCategory[data-category="Logic"],
      .blocklyToolboxCategory[data-category="logic"] {
        background: rgba(56, 189, 248, 0.18) !important;
      }
      .moontinker-category[data-category="Variables"]::before,
      .moontinker-category[data-category="variables"]::before {
        background: #fbbf24 !important; /* amber-400 */
      }
      .moontinker-category[data-category="Variables"],
      .moontinker-category[data-category="variables"],
      .blocklyTreeRow[data-category="Variables"],
      .blocklyTreeRow[data-category="variables"],
      [role="treeitem"][data-category="Variables"],
      [role="treeitem"][data-category="variables"],
      .blocklyToolboxCategory[data-category="Variables"],
      .blocklyToolboxCategory[data-category="variables"] {
        background: rgba(251, 191, 36, 0.18) !important;
      }
      .moontinker-category[data-category="Maths"]::before,
      .moontinker-category[data-category="maths"]::before {
        background: #818cf8 !important; /* indigo-400 */
      }
      .moontinker-category[data-category="Maths"],
      .moontinker-category[data-category="maths"],
      .blocklyTreeRow[data-category="Maths"],
      .blocklyTreeRow[data-category="maths"],
      [role="treeitem"][data-category="Maths"],
      [role="treeitem"][data-category="maths"],
      .blocklyToolboxCategory[data-category="Maths"],
      .blocklyToolboxCategory[data-category="maths"] {
        background: rgba(129, 140, 248, 0.18) !important;
      }
      .moontinker-category[data-category="Music"]::before,
      .moontinker-category[data-category="music"]::before {
        background: #f472b6 !important; /* pink-400 */
      }
      .moontinker-category[data-category="Music"],
      .moontinker-category[data-category="music"],
      .blocklyTreeRow[data-category="Music"],
      .blocklyTreeRow[data-category="music"],
      [role="treeitem"][data-category="Music"],
      [role="treeitem"][data-category="music"],
      .blocklyToolboxCategory[data-category="Music"],
      .blocklyToolboxCategory[data-category="music"] {
        background: rgba(244, 114, 182, 0.18) !important;
      }
      /* --- Micro:bit Categories --- */
      .moontinker-category[data-category="Display"]::before {
        background: #2563eb !important; /* blue-600 */
      }
      .moontinker-category[data-category="Display"] {
        background: rgba(37, 99, 235, 0.18) !important;
      }
      .moontinker-category[data-category="Pins"]::before {
        background: #22c55e !important; /* green-500 */
      }
      .moontinker-category[data-category="Pins"] {
        background: rgba(34, 197, 94, 0.18) !important;
      }
      .moontinker-category[data-category="Buttons"]::before {
        background: #a21caf !important; /* purple-700 */
      }
      .moontinker-category[data-category="Buttons"] {
        background: rgba(162, 28, 175, 0.18) !important;
      }
      .moontinker-category[data-category="Sensor"]::before {
        background: #14b8a6 !important; /* teal-500 */
      }
      .moontinker-category[data-category="Sensor"] {
        background: rgba(20, 184, 166, 0.18) !important;
      }
      .moontinker-category[data-category="Loops"]::before {
        background: #f59e42 !important; /* orange-400 */
      }
      .moontinker-category[data-category="Loops"] {
        background: rgba(245, 158, 66, 0.18) !important;
      }
      .moontinker-category[data-category="Timing"]::before {
        background: #ef4444 !important; /* red-500 */
      }
      .moontinker-category[data-category="Timing"] {
        background: rgba(239, 68, 68, 0.18) !important;
      }
      .moontinker-category[data-category="Imports"]::before {
        background: #64748b !important; /* gray-500 */
      }
      .moontinker-category[data-category="Imports"] {
        background: rgba(100, 116, 139, 0.18) !important;
      }

      /* Solid-fill variants: color the entire category row with the block color
         so the toolbox tile matches the blocks' primary color. Text color is
         adjusted for contrast per category. */
      .moontinker-category[data-category="Basic"],
      .moontinker-category[data-category="basic"],
      .blocklyTreeRow[data-category="Basic"],
      .blocklyTreeRow[data-category="basic"],
      [role="treeitem"][data-category="Basic"],
      [role="treeitem"][data-category="basic"],
      .blocklyToolboxCategory[data-category="Basic"],
      .blocklyToolboxCategory[data-category="basic"] {
        background: #0078D7 !important; /* blue */
        color: #ffffff !important;
      }

      .moontinker-category[data-category="Input"],
      .moontinker-category[data-category="input"],
      .blocklyTreeRow[data-category="Input"],
      .blocklyTreeRow[data-category="input"],
      [role="treeitem"][data-category="Input"],
      [role="treeitem"][data-category="input"],
      .blocklyToolboxCategory[data-category="Input"],
      .blocklyToolboxCategory[data-category="input"] {
        background: #c724b1 !important; /* magenta */
        color: #ffffff !important;
      }

      .moontinker-category[data-category="Led"],
      .moontinker-category[data-category="led"],
      .blocklyTreeRow[data-category="Led"],
      .blocklyTreeRow[data-category="led"],
      [role="treeitem"][data-category="Led"],
      [role="treeitem"][data-category="led"],
      .blocklyToolboxCategory[data-category="Led"],
      .blocklyToolboxCategory[data-category="led"] {
        background: #6a1b9a !important; /* purple */
        color: #ffffff !important; /* dark text for contrast */
      }

      .moontinker-category[data-category="Logic"],
      .moontinker-category[data-category="logic"],
      .blocklyTreeRow[data-category="Logic"],
      .blocklyTreeRow[data-category="logic"],
      [role="treeitem"][data-category="Logic"],
      [role="treeitem"][data-category="logic"],
      .blocklyToolboxCategory[data-category="Logic"],
      .blocklyToolboxCategory[data-category="logic"] {
        background: #00bcd4 !important; /* sky */
        color: #ffffff !important;
      }

      .moontinker-category[data-category="Variables"],
      .moontinker-category[data-category="variables"],
      .blocklyTreeRow[data-category="Variables"],
      .blocklyTreeRow[data-category="variables"],
      [role="treeitem"][data-category="Variables"],
      [role="treeitem"][data-category="variables"],
      .blocklyToolboxCategory[data-category="Variables"],
      .blocklyToolboxCategory[data-category="variables"] {
        background: #d4006a !important; /* amber */
        color: #ffffff !important;
      }

      .moontinker-category[data-category="Maths"],
      .moontinker-category[data-category="maths"],
      .blocklyTreeRow[data-category="Maths"],
      .blocklyTreeRow[data-category="maths"],
      [role="treeitem"][data-category="Maths"],
      [role="treeitem"][data-category="maths"],
      .blocklyToolboxCategory[data-category="Maths"],
      .blocklyToolboxCategory[data-category="maths"] {
        background: #7b2d8f !important; /* indigo */
        color: #ffffff !important;
      }

      .moontinker-category[data-category="Music"],
      .moontinker-category[data-category="music"],
      .blocklyTreeRow[data-category="Music"],
      .blocklyTreeRow[data-category="music"],
      [role="treeitem"][data-category="Music"],
      [role="treeitem"][data-category="music"],
      .blocklyToolboxCategory[data-category="Music"],
      .blocklyToolboxCategory[data-category="music"] {
        background: #eb4437 !important; /* pink */
        color: #ffffff !important;
      }
      
      /* Category-specific color bars */
      .blocklyTreeRow[style*="0078D7"]::before,
      [role="treeitem"][style*="0078D7"]::before {
        background: #0078D7 !important;
      }
      
      .blocklyTreeRow[style*="C724B1"]::before,
      [role="treeitem"][style*="C724B1"]::before {
        background: #C724B1 !important;
      }
      
      .blocklyTreeRow[style*="6A1B9A"]::before,
      [role="treeitem"][style*="6A1B9A"]::before {
        background: #6A1B9A !important;
      }
      
      .blocklyTreeRow[style*="00BCD4"]::before,
      [role="treeitem"][style*="00BCD4"]::before {
        background: #00BCD4 !important;
      }
      
      .blocklyTreeRow[style*="DC3545"]::before,
      [role="treeitem"][style*="DC3545"]::before {
        background: #DC3545 !important;
      }
      
      .blocklyTreeRow[style*="F06292"]::before,
      [role="treeitem"][style*="F06292"]::before {
        background: #F06292 !important;
      }
      
      .blocklyTreeRow[style*="7B2D8F"]::before,
      [role="treeitem"][style*="7B2D8F"]::before {
        background: #7B2D8F !important;
      }
      
      .blocklyTreeRow[style*="EB4437"]::before,
      [role="treeitem"][style*="EB4437"]::before {
        background: #EB4437 !important;
      }



      .blocklyTreeRow:hover,
      [role="treeitem"]:hover,
      .blocklyToolboxCategory:hover,
      .moontinker-category:hover {
        filter: brightness(1.15) !important;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5) !important;
        transform: scaleX(1.04) translateX(2px) !important;
      }
      
      /* Enhanced hover colors per category */
      .blocklyTreeRow[style*="0078D7"]:hover,
      [role="treeitem"][style*="0078D7"]:hover {
        background: linear-gradient(135deg, rgba(0, 120, 215, 0.25), rgba(0, 120, 215, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="C724B1"]:hover,
      [role="treeitem"][style*="C724B1"]:hover {
        background: linear-gradient(135deg, rgba(199, 36, 177, 0.25), rgba(199, 36, 177, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="6A1B9A"]:hover,
      [role="treeitem"][style*="6A1B9A"]:hover {
        background: linear-gradient(135deg, rgba(106, 27, 154, 0.25), rgba(106, 27, 154, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="00BCD4"]:hover,
      [role="treeitem"][style*="00BCD4"]:hover {
        background: linear-gradient(135deg, rgba(0, 188, 212, 0.25), rgba(0, 188, 212, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="DC3545"]:hover,
      [role="treeitem"][style*="DC3545"]:hover {
        background: linear-gradient(135deg, rgba(220, 53, 69, 0.25), rgba(220, 53, 69, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="F06292"]:hover,
      [role="treeitem"][style*="F06292"]:hover {
        background: linear-gradient(135deg, rgba(240, 98, 146, 0.25), rgba(240, 98, 146, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="7B2D8F"]:hover,
      [role="treeitem"][style*="7B2D8F"]:hover {
        background: linear-gradient(135deg, rgba(123, 45, 143, 0.25), rgba(123, 45, 143, 0.18)) !important;
      }
      
      .blocklyTreeRow[style*="EB4437"]:hover,
      [role="treeitem"][style*="EB4437"]:hover {
        background: linear-gradient(135deg, rgba(235, 68, 55, 0.25), rgba(235, 68, 55, 0.18)) !important;
      }



      .blocklyTreeRow.blocklyTreeSelected,
      [role="treeitem"][aria-selected="true"],
      .blocklyToolboxCategory.blocklyTreeSelected,
      .moontinker-category.moontinker-selected {
        transform: translateX(4.5px) !important;
        filter: brightness(1.15) saturate(1.15) !important;
        /* Keep the base background color from the category, only enhance visually */
      }



      .blocklyTreeLabel {
        font-size: 14px !important;
        font-weight: 600 !important;
        letter-spacing: 0.2px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif !important;
        color: #335548ff !important;
        transition: all 0.2s ease !important;
      }

      .blocklyToolboxCategoryLabel {
        font-size: 15px !important;
        font-weight: 600 !important;
        letter-spacing: 1px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif !important;
        color: inherit !important;
        transition: all 0.5s ease !important;
      }

      .blocklyTreeRow:hover .blocklyTreeLabel,
      [role="treeitem"]:hover .blocklyTreeLabel,
      .blocklyToolboxCategory:hover .blocklyTreeLabel,
      .moontinker-category:hover .blocklyTreeLabel {
        color: #0078D7 !important;
        font-weight: 600 !important;
      }

      .blocklyTreeRow.blocklyTreeSelected .blocklyTreeLabel,
      .blocklyTreeRow.blocklyTreeSelected span,
      .blocklyTreeRow.blocklyTreeSelected div,
      [role="treeitem"][aria-selected="true"] .blocklyTreeLabel,
      [role="treeitem"][aria-selected="true"] span,
      [role="treeitem"][aria-selected="true"] div,
      .blocklyToolboxCategory.blocklyTreeSelected .blocklyTreeLabel,
      .blocklyToolboxCategory.blocklyTreeSelected span,
      .blocklyToolboxCategory.blocklyTreeSelected .blocklyToolboxCategoryLabel,
      .moontinker-category.moontinker-selected .blocklyTreeLabel,
      .moontinker-category.moontinker-selected span,
      .moontinker-category.moontinker-selected div {
        color: #f3f0f0e4 !important;
        font-weight: 700 !important;
      }

      .blocklyToolboxDiv {
        background: rgba(249, 250, 251, 0.95) !important;
        border-right: 1px solid rgba(226, 232, 240, 0.6) !important;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03) !important;
        width: 160px !important;
        max-width: 160px !important;
      }

      .blocklyTreeRoot {
        padding: 8px 0 !important;
      }
      
      /* Flyout Styling */
      .blocklyFlyout {
        background: #94989eff !important; /* Tailwind gray-300 */
        border-left: 3px solid rgba(4, 6, 8, 1) !important;
        border-right: 3px solid rgba(4, 6, 8, 1) !important;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04) !important;
        z-index: 100 !important;
        margin-left: -2px !important;
      }
      
      .blocklyFlyoutBackground {
        fill: #94989eff !important; /* Tailwind gray-300 */
      }
      
      .blocklyFlyout .blocklyScrollbarVertical {
        margin-right: 0 !important;
      }
      
      .blocklyFlyout > g {
        transform: translateX(6px) !important;
      }
      
      /* Compact Scrollbar */
      .blocklyToolboxDiv::-webkit-scrollbar {
        width: 6px !important;
      }
      
      .blocklyToolboxDiv::-webkit-scrollbar-track {
        background: rgba(241, 245, 249, 0.3) !important;
        border-radius: 3px !important;
      }
      
      .blocklyToolboxDiv::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.5) !important;
        border-radius: 3px !important;
        transition: background 0.2s ease !important;
      }
      
      .blocklyToolboxDiv::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 121, 100, 0.7) !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

/**
 * Inject animation styles
 */
export function injectAnimationStyles() {
  if (!document.getElementById("moontinker-animations")) {
    const animStyle = document.createElement("style");
    animStyle.id = "moontinker-animations";
    animStyle.textContent = `
      @keyframes categoryFadeIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(animStyle);
  }
}

/**
 * Apply modern category styling to toolbox
 */
export function applyModernCategoryStyles() {
  let styleAttempts = 0;
  const maxAttempts = 15;

  const styleCategories = () => {
    styleAttempts++;

    let toolboxDiv = document.querySelector(".blocklyToolboxDiv");
    if (!toolboxDiv) {
      toolboxDiv = document.querySelector('[class*="blocklyToolbox"]');
    }
    if (!toolboxDiv) {
      toolboxDiv = document
        .querySelector(".injectionDiv")
        ?.querySelector("svg.blocklySvg")
        ?.parentElement?.querySelector('[class*="toolbox"]') as HTMLElement;
    }

    if (!toolboxDiv) {
      if (styleAttempts < maxAttempts) {
        setTimeout(styleCategories, 500);
      }
      return;
    }

    let categoryRows = toolboxDiv.querySelectorAll(".blocklyTreeRow");

    if (categoryRows.length === 0) {
      categoryRows = toolboxDiv.querySelectorAll('[role="treeitem"]');
    }

    if (categoryRows.length === 0) {
      categoryRows = toolboxDiv.querySelectorAll(".blocklyToolboxCategory");
    }

    if (categoryRows.length === 0 && styleAttempts < maxAttempts) {
      setTimeout(styleCategories, 500);
      return;
    }

    if (categoryRows.length === 0) {
      return;
    }

    toolboxDiv.classList.add("moontinker-toolbox-enhanced");

    categoryRows.forEach((row, index) => {
      const htmlRow = row as HTMLElement;
      htmlRow.classList.add("moontinker-category");
      // Try to extract category name from label or data attributes
      let categoryName = htmlRow.getAttribute('data-category');
      if (!categoryName) {
        // Try to get from label text
        const label = htmlRow.querySelector('.blocklyTreeLabel, .blocklyToolboxCategoryLabel')?.textContent?.trim();
        if (label) {
          categoryName = label;
        }
      }
      if (!categoryName) {
        const innerData = (htmlRow.querySelector('.blocklyToolboxCategory') as HTMLElement)?.getAttribute('data-category');
        if (innerData) categoryName = innerData;
      }
      if (categoryName) {
        // Normalize for common blockly lower/upper case
        let normalized = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();
        htmlRow.setAttribute('data-category', normalized);
      }
      // Apply dynamic row color derived from block color
      //applyRowColor(htmlRow);
      htmlRow.style.animation = `categoryFadeIn 0.4s ease ${index * 0.05}s backwards`;
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            (node.classList.contains("blocklyTreeRow") ||
              node.getAttribute("role") === "treeitem" ||
              node.classList.contains('blocklyToolboxCategoryContainer'))
          ) {
            node.classList.add("moontinker-category");
           // applyRowColor(node as HTMLElement);
          }
        });
      });
    });

    observer.observe(toolboxDiv, {
      childList: true,
      subtree: true,
    });
  };

  styleCategories();
}

/**
 * Hide the underlying SVG text while an HTML input is focused to
 * prevent doubled glyphs (overlay + SVG). Restores on blur.
 */
export function maskEditingTextFields() {
  // Global CSS fallback: when editing, hide SVG text content
  if (!document.getElementById("moontinker-editing-mask")) {
    const s = document.createElement("style");
    s.id = "moontinker-editing-mask";
    s.textContent = `
      /* Aggressively hide SVG text while HTML input is active to prevent any double glyphs */
      body.moontinker-editing .blocklyEditableText { display: none !important; visibility: hidden !important; }
      body.moontinker-editing .blocklyEditableText .blocklyText { display: none !important; visibility: hidden !important; }
      body.moontinker-editing .blocklyEditableText text { display: none !important; visibility: hidden !important; }
      body.moontinker-editing .blocklyNonEditableText { display: none !important; visibility: hidden !important; }
    `;
    document.head.appendChild(s);
  }

  const onFocus = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.classList && target.classList.contains("blocklyHtmlInput")) {
      // Per-field masking: find nearest editable SVG text container
      const widgetDiv = target.closest('.blocklyWidgetDiv');
      const injectionDiv = document.querySelector('.injectionDiv');
      // Try to locate corresponding editable text by position overlap
      // Fallback to global mask if we cannot resolve
      let masked = false;
      if (injectionDiv) {
        const inputs = injectionDiv.querySelectorAll<HTMLElement>('.blocklyEditableText');
        const wRect = widgetDiv?.getBoundingClientRect();
        if (wRect) {
          inputs.forEach((el) => {
            const r = el.getBoundingClientRect();
            const overlaps = !(r.right < wRect.left || r.left > wRect.right || r.bottom < wRect.top || r.top > wRect.bottom);
            if (overlaps) {
              el.setAttribute('data-mt-masked', 'true');
              el.style.visibility = 'hidden';
              el.style.pointerEvents = 'none';
              masked = true;
            }
          });
        }
      }
      if (!masked) {
        document.body.classList.add("moontinker-editing");
      }
    }
  };

  const onBlur = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.classList && target.classList.contains("blocklyHtmlInput")) {
      document.body.classList.remove("moontinker-editing");
      // Clear per-field mask
      document.querySelectorAll<HTMLElement>('.blocklyEditableText[data-mt-masked="true"]').forEach((el) => {
        el.removeAttribute('data-mt-masked');
        el.style.visibility = '';
        el.style.pointerEvents = '';
      });
    }
  };

  // Attach once
  window.addEventListener("focusin", onFocus, { capture: true });
  window.addEventListener("focusout", onBlur, { capture: true });
}
