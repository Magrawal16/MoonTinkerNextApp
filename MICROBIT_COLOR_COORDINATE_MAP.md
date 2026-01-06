# Micro:bit Color & Coordinate Mapping System

## Overview
Created a centralized coordinate mapping system for micro:bit components to support multiple color variants and maintain correct overlay positioning.

## Files Created

### `src/circuit_canvas/utils/microbitCoordinateMap.ts`
Central configuration file that maps coordinates for:
- **Micro:bit variants** (red, yellow, green, blue)
- **Micro:bit with Breakout Board**

Each map defines:
- SVG dimensions (width, height, offsetX, offsetY)
- Hit area for selection
- Touch sensor (logo) position and size
- **USB on/off overlay** position and size (separate coordinates for simulation states)
- LED matrix grid (start position, spacing, LED radius)
- Button positions (A, B, AB)
- Explosion overlay position and size

## Updated Components

### 1. **Microbit.tsx**
- Now loads the correct color SVG based on the `color` prop
- Uses `getMicrobitCoordinates(color)` to get all positioning data
- All overlays (LEDs, buttons, logo, explosion) now use mapped coordinates
- Supports 4 colors: red, yellow, green, blue (defaults to red)

### 2. **MicrobitWithBreakout.tsx**
- Uses `getMicrobitWithBreakoutCoordinates()` for positioning
- All overlays use mapped coordinates
- Maintains separate coordinate set since breakout board has different dimensions

### 3. **PropertiesPanel.tsx**
- Added micro:bit color selector dropdown (Red/Yellow/Green/Blue)
- Color change triggers component re-render with new SVG
- Update button now works for micro:bit elements

## Type System Updates

### `types/circuit.ts`
- Added `color?: string` to `MicrobitProps` interface
- Allows color prop to be passed to micro:bit components

### `utils/createElement.ts`
- Default `color: "red"` for new micro:bit elements
- Added `"color"` to micro:bit `displayProperties`

### `data/defaultElementProperties.ts`
- Micro:bit palette entry now includes `color: "red"` in `defaultProps`

## How to Adjust Coordinates

If SVG artwork changes or new color variants are added:

1. Open `src/circuit_canvas/utils/microbitCoordinateMap.ts`
2. Find the color variant in `MICROBIT_COORDINATES`
3. Adjust the specific coordinates:
   - `ledMatrix.startX/Y` - Top-left LED position
   - `ledMatrix.spacingX/Y` - Distance between LEDs
   - `logo.x/y` - Touch sensor position
   - `usbOn.x/y/width/height` - USB on indicator overlay position
   - `usbOff.x/y/width/height` - USB off indicator overlay position
   - `buttons.A/B/AB.x/y` - Button center positions
   - `explosion.x/y` - Explosion graphic position

## Usage Example

```typescript
// In component:
const coords = getMicrobitCoordinates(color); // or getMicrobitWithBreakoutCoordinates()

// Use mapped values:
<Rect x={coords.hitArea.x} y={coords.hitArea.y} />
<Circle x={coords.ledMatrix.startX + x * coords.ledMatrix.spacingX} />
<Group x={coords.buttons.A.x} y={coords.buttons.A.y}>
```

## Benefits

1. **Single Source of Truth** - All coordinates in one file
2. **Easy Color Addition** - Just add new color entry to map
3. **Maintainable** - No scattered hardcoded values
4. **Scalable** - Can add more variants (e.g., different board versions)
5. **Type-Safe** - TypeScript ensures all coordinates are defined

## Testing

To test color switching:
1. Drop a micro:bit on the canvas
2. Select it
3. In Properties Panel, change the "micro:bit Color" dropdown
4. Click "Update"
5. The board should switch to the selected color
6. Verify all overlays (LEDs, buttons, logo) remain properly aligned
