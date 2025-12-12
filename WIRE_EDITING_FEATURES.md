# Wire Editing & Auto-Routing Features

## Overview
Enhanced wire editing capabilities and automatic wire routing for cleaner circuit layouts.

## New Features

### 1. **Editable Wire Joints**
Wires now support interactive joint editing:
- **Drag Joints**: When a wire is selected, white circles appear at each joint that can be dragged to reposition
- **Remove Joints**: Double-click any joint circle to remove it from the wire path
- **Visual Feedback**: Joint circles scale with zoom level and show hover cursor changes
- **Snap to Grid**: Joints automatically snap to the 25px grid when drag ends for cleaner alignment

### 2. **Automatic Wire Routing**
Smart orthogonal (right-angle) wire routing for professional-looking circuits:
- **Auto-Route Toggle**: Enable/disable automatic routing via toolbar button (ON by default)
- **Orthogonal Paths**: When enabled, wires automatically create L-shaped paths between nodes
- **Manual Override**: Users can still add custom joints by clicking on canvas during wire creation
- **Per-Wire Auto-Route**: Apply automatic routing to any selected wire using the "Auto-Route Wire" button

### 3. **Enhanced User Experience**
### 3. **Enhanced User Experience**
// Removed references to WIRE_RECONNECTION_FEATURE.md
// ...existing code... (remove any mention of reconnection)
              // ...existing code...
## How to Use

### Creating Clean Wires
1. Ensure "Auto-Route: ON" is enabled in the toolbar
2. Click a node to start wiring
3. Click the destination node - the wire automatically routes with right angles
4. To add custom joints, click on the canvas between nodes

### Editing Existing Wires
1. Click any wire to select it
2. Drag the white circles (joints) to adjust the path
3. Double-click a joint to remove it
4. Click "Auto-Route Wire" button to apply automatic routing

### Manual Wire Routing
1. Set "Auto-Route: OFF" in the toolbar
2. Click start node
3. Click on canvas to add joints along the path
4. Click destination node to complete

## Technical Implementation

### New Files
- `src/circuit_canvas/utils/wireRouting.ts` - Core routing algorithms
  - `calculateOrthogonalPath()` - Generates L-shaped wire paths
  - `simplifyWirePath()` - Removes redundant collinear joints
  - `snapToGrid()` - Grid alignment utility
  - `findClosestJoint()` - Joint selection helper

### Modified Files
- `src/circuit_canvas/hooks/useWireManagement.ts`
  - Added `draggingJoint` and `autoRouteEnabled` state
  - New functions: `handleJointDragStart/Move/End`, `addJointToWire`, `removeJointFromWire`, `applyAutoRouting`
  - Wire creation now uses auto-routing when enabled

- `src/circuit_canvas/components/core/CircuitCanvas.tsx`
  - Added draggable joint circles rendering in wire layer
  - Auto-route toggle and per-wire auto-route buttons in toolbar
  - Hover/cursor feedback for joints

- `src/circuit_canvas/components/core/PropertiesPanel.tsx`
  - Added wire editing tips section
  - Enhanced visual guidance for users

## Benefits

✅ **Cleaner Circuits**: Orthogonal routing creates professional-looking layouts
✅ **Flexibility**: Users can choose between automatic and manual routing
✅ **Easy Adjustments**: Drag joints to fine-tune wire paths
✅ **Reduced Clutter**: Simplified paths eliminate unnecessary joints
✅ **Better UX**: Visual feedback and clear controls improve usability

## Future Enhancements (Optional)
- Smart obstacle avoidance when routing
- Multiple routing styles (Manhattan, Bezier curves, etc.)
- Keyboard shortcuts for joint manipulation
- Wire path optimization suggestions
