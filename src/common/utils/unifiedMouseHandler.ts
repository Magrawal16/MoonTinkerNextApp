/**
 * Unified Mouse Handler
 * Treats right-click the same as left-click across the application
 * Prevents context menu and delegates right-click to the same handler as left-click
 */

/**
 * Wraps a mouse event handler to treat right-click (button 2) the same as left-click (button 0)
 * @param handler The original mouse event handler
 * @returns A wrapped handler that accepts both left and right clicks
 */
export function createUnifiedClickHandler<T extends React.MouseEvent>(
  handler: (e: T) => void
): (e: T) => void {
  return (e: T) => {
    // Only proceed on left-click (button 0) or right-click (button 2)
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    }
  };
}

/**
 * Initialize global right-click suppression
 * Prevents browser context menu and allows custom right-click handling
 * Call this once at app initialization
 */
export function initializeUnifiedMouseBehavior() {
  if (typeof window === "undefined") return;

  // Suppress context menu on right-click
  document.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    { passive: false }
  );

  // Map to track which elements had right-click mousedown for click simulation
  const rightClickTargets = new WeakSet<HTMLElement>();

  // Handle right-click mousedown: treat as left-click mousedown
  document.addEventListener("mousedown", (e: MouseEvent) => {
    if (e.button === 2) {
      // Right-click detected - prevent default and mark target
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (target) {
        rightClickTargets.add(target);

        // Create synthetic mousedown event with left-click properties
        const syntheticEvent = new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0, // Left button
          buttons: 1,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
        });

        // Dispatch to the target so React handlers receive it
        target.dispatchEvent(syntheticEvent);
      }
    }
  }, true); // Use capture phase to intercept before React

  // Handle right-click mouseup: treat as left-click mouseup, then trigger click
  document.addEventListener("mouseup", (e: MouseEvent) => {
    if (e.button === 2) {
      // Right-click release detected
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (target) {
        // Create synthetic mouseup event with left-click properties
        const syntheticUpEvent = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
        });

        target.dispatchEvent(syntheticUpEvent);

        // Trigger click event if the target had mousedown on right-click
        if (rightClickTargets.has(target)) {
          rightClickTargets.delete(target);

          // Create synthetic click event
          const clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
          });

          target.dispatchEvent(clickEvent);

          // Also try calling click() method for elements that override it
          if (typeof (target as any).click === "function") {
            try {
              (target as any).click();
            } catch (err) {
              // Silently fail if click() throws
            }
          }
        }
      }
    }
  }, true); // Use capture phase
}

/**
 * Make a specific element respond to both left and right clicks uniformly
 * @param element The DOM element to apply unified click behavior to
 * @param handler The handler to call on either left or right click
 */
export function enableUnifiedClickOnElement(
  element: HTMLElement,
  handler: (e: MouseEvent) => void
) {
  const wrappedHandler = (e: MouseEvent) => {
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    }
  };

  element.addEventListener("mousedown", wrappedHandler);
  element.addEventListener("mouseup", wrappedHandler);
}
