## Wire Editing Quick Reference

### Visual Elements

```
Selected Wire with Joints:
    
  Node ●━━━━━●━━━━━━●━━━━━● Node
          ↑          ↑
       Joint 1    Joint 2
     (draggable) (draggable)
   
   - White circles = Draggable joints
   - Double-click circle = Remove joint
   - Drag circle = Reposition wire path
```

### Improved Wire Routing (No Node Overlap)

```
Before (Old):                After (New):
   ●━━━━━━━━━━━●              ●━━━━┓
   Node    Node               Node ┃
                                   ┃
                                   ┗━━━━● Node
                                   
Wires now extend straight from nodes before routing,
making it easier to identify which wire connects to which node!
```

### Multiple Wires Between Same Elements

```
Battery ━━━━━┓              Battery ━━━━━┓
            ┃                            ┃ (offset)
            ┃                            ┗━━━━━┓
            ┃                                  ┃
            ┗━━━━━● LED                        ┗━━━━● LED

Wires automatically offset to prevent overlap!
```

### Toolbar Controls

```
┌─────────────────────────────────────────┐
│ 🎨 [Color] [Auto-Route: ON] [↻] [↺]  │
│                                         │
│ When wire selected:                     │
│ [Auto-Route Wire]                       │
└─────────────────────────────────────────┘

🎨 Color Palette - Change wire color
Auto-Route: ON/OFF - Toggle automatic routing
↻/↺ - Rotate selected element
Auto-Route Wire - Apply routing to selected wire
```

### Wire Creation Modes

**Auto-Routing (Default):**
```
Start Node → End Node
     |           |
     ●━━━━━━━━━━━●
           ↓
     ●━━●
        |
        ●━━●
   (L-shaped path)
```

**Manual Routing:**
```
Start Node → Click → Click → End Node
     |        ↓      ↓        |
     ●━━━━━━━●━━━━━●━━━━━━━━●
        (Custom path with joints)
```

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Select wire | Click wire |
| Delete wire | Delete/Backspace (when selected) |
| Deselect | Esc or Click canvas |
| Undo | Cmd+Z / Ctrl+Z |
| Redo | Cmd+Shift+Z / Ctrl+Shift+Z |

### Mouse Interactions

| Element | Click | Double-Click | Drag |
|---------|-------|--------------|------|
| Wire | Select | - | - |
| Joint Circle | - | Remove joint | Reposition |
| Canvas (while wiring) | Add joint | - | Pan view |
| Node | Start/End wire | - | - |

### Best Practices

1. **Enable Auto-Route** for quick, clean connections
2. **Use manual joints** for specific routing requirements
3. **Drag joints** to fine-tune auto-routed wires
4. **Double-click joints** to simplify complex paths
5. **Apply Auto-Route** to clean up messy wires

### Tips

- Joints snap to 25px grid for alignment
- Collinear joints are automatically simplified
- Wires update in real-time as you drag joints
- All wire edits are undoable (Cmd+Z)
- Auto-routing preserves manually-added joints
