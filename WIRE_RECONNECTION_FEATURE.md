# Wire Reconnection Feature

## Overview
The wire reconnection feature allows users to change which nodes a wire connects to without deleting and recreating the wire. This maintains the wire's properties (color, joints) while updating its endpoints.

## Usage

### Reconnecting a Wire Endpoint

1. **Select a Wire**: Click on any wire in the circuit canvas
2. **Open Properties Panel**: The properties panel appears on the right side
3. **Choose Reconnection Action**:
   - Click **"Reconnect Start"** to change the starting node
   - Click **"Reconnect End"** to change the ending node
4. **Visual Feedback**: An orange banner appears at the top of the canvas indicating reconnection mode
5. **Click Target Node**: Click on any node in the circuit to reconnect the wire
6. **Complete**: The wire is now connected to the new node

### Canceling Reconnection

- Click the **"Cancel"** button in the orange banner
- Or press `Escape` key

## Technical Implementation

### Type Definitions

```typescript
// EditingWire type in circuit.ts
export type EditingWire = {
  wireId: string;
  end: "from" | "to";
};

// PropertiesPanel callback
onWireReconnect?: (wireId: string, end: "from" | "to") => void;
```

### Key Files Modified

#### 1. `PropertiesPanel.tsx`
- Added `onWireReconnect` prop
- Added "Reconnect Start" and "Reconnect End" buttons in wire section
- Updated wire editing tips to include reconnection

#### 2. `CircuitCanvas.tsx`
- Implemented `onWireReconnect` handler that sets `editingWire` state
- Added visual indicator (orange banner) when in reconnection mode
- Provides cancel functionality

#### 3. `useWireManagement.ts`
- Enhanced `handleNodeClick` to handle reconnection mode
- When `editingWire` is active, clicking a node updates the wire's endpoint
- Properly maps "from"/"to" to "fromNodeId"/"toNodeId"

### State Flow

```
User clicks "Reconnect Start/End"
  ↓
onWireReconnect(wireId, end) called
  ↓
setEditingWire({ wireId, end })
  ↓
Visual indicator shown (orange banner)
  ↓
User clicks target node
  ↓
handleNodeClick detects editingWire state
  ↓
Wire's fromNodeId or toNodeId updated
  ↓
History snapshot pushed (undoable)
  ↓
editingWire reset to null
```

## User Experience

### Visual Feedback
- **Orange Banner**: Clearly indicates reconnection mode is active
- **Clear Instructions**: Banner text specifies which end (start/end) is being reconnected
- **Cancel Button**: Prominent escape option in the banner
- **Preserved Selection**: Wire remains selected after reconnection

### Wire Properties Preservation
- **Color**: Maintained during reconnection
- **Joints**: Maintained (though may need manual adjustment after reconnection)
- **ID**: Wire ID remains unchanged

### History Integration
- Reconnection is recorded in history (can be undone/redone)
- Uses same history system as other wire edits

## Best Practices

### When to Use Reconnection
- Changing wire routing without losing custom joints
- Maintaining wire color when rewiring
- Correcting misconnected wires

### Limitations
- Cannot reconnect both ends simultaneously (must do one at a time)
- Joints may need repositioning after reconnection if nodes are far apart
- Cannot create duplicate wires (same prevention as normal wire creation)

## Future Enhancements (Potential)

1. **Node Highlighting**: Highlight valid target nodes during reconnection mode
2. **Preview Mode**: Show wire path preview before confirming reconnection
3. **Smart Joint Adjustment**: Automatically reposition joints for optimal routing after reconnection
4. **Batch Reconnection**: Select multiple wires and reconnect them together
5. **Keyboard Shortcuts**: Dedicated hotkeys for triggering reconnection mode

## Related Features

- **Wire Editing**: Drag white circles to adjust wire path
- **Joint Management**: Double-click to remove joints, click canvas while wiring to add joints
- **Wire Color**: Change wire color from properties panel or toolbar
- **Undo/Redo**: All reconnection actions are fully undoable

## Testing Checklist

- [ ] Reconnect start node works correctly
- [ ] Reconnect end node works correctly
- [ ] Orange banner displays with correct message
- [ ] Cancel button exits reconnection mode
- [ ] Wire properties (color, joints) preserved after reconnection
- [ ] History system records reconnection (undo/redo works)
- [ ] Cannot create duplicate wires via reconnection
- [ ] Visual feedback clears after reconnection complete
- [ ] Works with all element types (resistors, LEDs, batteries, microbit nodes)
# Wire Reconnection Feature

## Overview
The wire reconnection feature allows users to change which nodes a wire connects to without deleting and recreating the wire. This maintains the wire's properties (color, joints) while updating its endpoints.

## Usage

### Reconnecting a Wire Endpoint

1. **Select a Wire**: Click on any wire in the circuit canvas
2. **Open Properties Panel**: The properties panel appears on the right side
3. **Choose Reconnection Action**:
   - Click **"Reconnect Start"** to change the starting node
   - Click **"Reconnect End"** to change the ending node
4. **Visual Feedback**: An orange banner appears at the top of the canvas indicating reconnection mode
5. **Click Target Node**: Click on any node in the circuit to reconnect the wire
6. **Complete**: The wire is now connected to the new node

### Canceling Reconnection

- Click the **"Cancel"** button in the orange banner
- Or press `Escape` key

## Technical Implementation

### Type Definitions

```typescript
// EditingWire type in circuit.ts
export type EditingWire = {
  wireId: string;
  end: "from" | "to";
};

// PropertiesPanel callback
onWireReconnect?: (wireId: string, end: "from" | "to") => void;
```

### Key Files Modified

#### 1. `PropertiesPanel.tsx`
- Added `onWireReconnect` prop
- Added "Reconnect Start" and "Reconnect End" buttons in wire section
- Updated wire editing tips to include reconnection

#### 2. `CircuitCanvas.tsx`
- Implemented `onWireReconnect` handler that sets `editingWire` state
- Added visual indicator (orange banner) when in reconnection mode
- Provides cancel functionality

#### 3. `useWireManagement.ts`
- Enhanced `handleNodeClick` to handle reconnection mode
- When `editingWire` is active, clicking a node updates the wire's endpoint
- Properly maps "from"/"to" to "fromNodeId"/"toNodeId"

### State Flow

```
User clicks "Reconnect Start/End"
  ↓
onWireReconnect(wireId, end) called
  ↓
setEditingWire({ wireId, end })
  ↓
Visual indicator shown (orange banner)
  ↓
User clicks target node
  ↓
handleNodeClick detects editingWire state
  ↓
Wire's fromNodeId or toNodeId updated
  ↓
History snapshot pushed (undoable)
  ↓
editingWire reset to null
```

## User Experience

### Visual Feedback
- **Orange Banner**: Clearly indicates reconnection mode is active
- **Clear Instructions**: Banner text specifies which end (start/end) is being reconnected
- **Cancel Button**: Prominent escape option in the banner
- **Preserved Selection**: Wire remains selected after reconnection

### Wire Properties Preservation
- **Color**: Maintained during reconnection
- **Joints**: Maintained (though may need manual adjustment after reconnection)
- **ID**: Wire ID remains unchanged

### History Integration
- Reconnection is recorded in history (can be undone/redone)
- Uses same history system as other wire edits

## Best Practices

### When to Use Reconnection
- Changing wire routing without losing custom joints
- Maintaining wire color when rewiring
- Correcting misconnected wires

### Limitations
- Cannot reconnect both ends simultaneously (must do one at a time)
- Joints may need repositioning after reconnection if nodes are far apart
- Cannot create duplicate wires (same prevention as normal wire creation)

## Future Enhancements (Potential)

1. **Node Highlighting**: Highlight valid target nodes during reconnection mode
2. **Preview Mode**: Show wire path preview before confirming reconnection
3. **Smart Joint Adjustment**: Automatically reposition joints for optimal routing after reconnection
4. **Batch Reconnection**: Select multiple wires and reconnect them together
5. **Keyboard Shortcuts**: Dedicated hotkeys for triggering reconnection mode

## Related Features

- **Wire Editing**: Drag white circles to adjust wire path
- **Joint Management**: Double-click to remove joints, click canvas while wiring to add joints
- **Wire Color**: Change wire color from properties panel or toolbar
- **Undo/Redo**: All reconnection actions are fully undoable

## Testing Checklist

- [ ] Reconnect start node works correctly
- [ ] Reconnect end node works correctly
- [ ] Orange banner displays with correct message
- [ ] Cancel button exits reconnection mode
- [ ] Wire properties (color, joints) preserved after reconnection
- [ ] History system records reconnection (undo/redo works)
- [ ] Cannot create duplicate wires via reconnection
- [ ] Visual feedback clears after reconnection complete
- [ ] Works with all element types (resistors, LEDs, batteries, microbit nodes)
