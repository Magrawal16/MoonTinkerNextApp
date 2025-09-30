// Types and static snippet data for Python code palette
// Separated from the component for reusability and cleaner organization

export interface Parameter {
  id: string;
  name: string;
  type: 'dropdown' | 'number' | 'text';
  options?: string[];
  defaultValue: string;
  placeholder: string;
}

export interface CodeSnippet {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
  parameters?: Parameter[];
}

export interface CommandPaletteProps {
  showCodePalette: boolean;
  setShowCodePalette: (value: boolean | ((prev: boolean) => boolean)) => void;
  onCodeInsert?: (code: string) => void;
}

export const CODE_SNIPPETS: CodeSnippet[] = [
  // Display Section
  {
    id: "led_plot",
    name: "LED Plot",
    description: "Turn on LED at position",
    code: "led.plot({x}, {y})",
    category: "Display",
    parameters: [
      { id: "x", name: "X coordinate", type: "dropdown", options: ["0","1","2","3","4"], defaultValue: "0", placeholder: "X" },
      { id: "y", name: "Y coordinate", type: "dropdown", options: ["0","1","2","3","4"], defaultValue: "0", placeholder: "Y" }
    ]
  },
  {
    id: "led_unplot",
    name: "LED Unplot",
    description: "Turn off LED at position",
    code: "led.unplot({x}, {y})",
    category: "Display",
    parameters: [
      { id: "x", name: "X coordinate", type: "dropdown", options: ["0","1","2","3","4"], defaultValue: "0", placeholder: "X" },
      { id: "y", name: "Y coordinate", type: "dropdown", options: ["0","1","2","3","4"], defaultValue: "0", placeholder: "Y" }
    ]
  },
  {
    id: "show_string",
    name: "Show String",
    description: "Display scrolling text",
    code: 'basic.show_string("{text}")',
    category: "Display",
    parameters: [
      { id: "text", name: "Text to display", type: "text", defaultValue: "Hello", placeholder: "Enter text" }
    ]
  },
  {
    id: "show_number",
    name: "Show Number",
    description: "Display a number",
    code: "basic.show_number({number})",
    category: "Display",
    parameters: [
      { id: "number", name: "Number to display", type: "number", defaultValue: "42", placeholder: "Enter number" }
    ]
  },
  {
    id: "show_image",
    name: "Show Image",
    description: "Display built-in image",
    code: "display.show(Image.{image})",
    category: "Display",
    parameters: [
      { id: "image", name: "Image", type: "dropdown", options: ["HEART","HEART_SMALL","HAPPY","SMILE","SAD","CONFUSED","ANGRY","ASLEEP","SURPRISED","SILLY","FABULOUS","MEH"], defaultValue: "HEART", placeholder: "Select image" }
    ]
  },
  { id: "clear_screen", name: "Clear Screen", description: "Clear the LED display", code: "basic.clear_screen()", category: "Display" },

  // Pins Section
  {
    id: "digital_write",
    name: "Digital Write",
    description: "Set pin to HIGH or LOW",
    code: "pins.digital_write_pin(DigitalPin.{pin}, {value})",
    category: "Pins",
    parameters: [
      { id: "pin", name: "Pin", type: "dropdown", options: ["P0","P1","P2"], defaultValue: "P0", placeholder: "Pin" },
      { id: "value", name: "Value", type: "dropdown", options: ["0","1"], defaultValue: "1", placeholder: "Value" }
    ]
  },
  {
    id: "digital_read",
    name: "Digital Read",
    description: "Read digital value from pin",
    code: "pins.digital_read_pin(DigitalPin.{pin})",
    category: "Pins",
    parameters: [ { id: "pin", name: "Pin", type: "dropdown", options: ["P0","P1","P2"], defaultValue: "P0", placeholder: "Pin" } ]
  },
  {
    id: "analog_write",
    name: "Analog Write",
    description: "Write analog value to pin",
    code: "pins.analog_write_pin(AnalogPin.{pin}, {value})",
    category: "Pins",
    parameters: [
      { id: "pin", name: "Pin", type: "dropdown", options: ["P0","P1","P2"], defaultValue: "P0", placeholder: "Pin" },
      { id: "value", name: "Value (0-1023)", type: "number", defaultValue: "512", placeholder: "0-1023" }
    ]
  },
  {
    id: "analog_read",
    name: "Analog Read",
    description: "Read analog value from pin",
    code: "pins.read_analog_pin(AnalogPin.{pin})",
    category: "Pins",
    parameters: [ { id: "pin", name: "Pin", type: "dropdown", options: ["P0","P1","P2"], defaultValue: "P0", placeholder: "Pin" } ]
  },

  // Buttons Section
  {
    id: "button_handler",
    name: "Button Handler",
    description: "Function for button press",
    code: `async def on_button_{button_lower}_pressed():`,
    category: "Buttons",
    parameters: [ { id: "button", name: "Button", type: "dropdown", options: ["A","B","AB"], defaultValue: "A", placeholder: "Button" } ]
  },
  {
    id: "button_listener",
    name: "Button Listener",
    description: "Listen for button press",
    code: "input.on_button_pressed(Button.{button}, on_button_{button_lower}_pressed)",
    category: "Buttons",
    parameters: [ { id: "button", name: "Button", type: "dropdown", options: ["A","B","AB"], defaultValue: "A", placeholder: "Button" } ]
  },
  // Touch / Logo Sensor Section
  {
    id: "logo_pressed_listener",
    name: "Logo Pressed Listener",
    description: "Register handler for logo touch (pressed)",
    code: `def on_logo_down():\n    #your code\n\ninput.on_logo_pressed(on_logo_down)`,
    category: "Sensor",
    //parameters: [ { id: "handler", name: "Handler function", type: "text", defaultValue: "on_logo_down", placeholder: "Function name" } ]
  },
  {
    id: "logo_released_listener",
    name: "Logo Released Listener",
    description: "Register handler for logo release",
    code: `def on_logo_up():\n    #your code\n\ninput.on_logo_released(on_logo_up)`,
    category: "Sensor",
    //parameters: [ { id: "handler", name: "Handler function", type: "text", defaultValue: "on_logo_up", placeholder: "Function name" } ]
  },

  // Loops Section
  { id: "forever_loop", name: "Forever Loop", description: "Run code continuously", code: `basic.forever(lambda: None)`, category: "Loops" },
  { id: "while_true", name: "While True Loop", description: "Infinite loop structure", code: `while True:\n    # Your code here`, category: "Loops" },
  {
    id: "for_range",
    name: "For Range Loop",
    description: "Loop with range",
    code: `for i in range({count}):\n    # Your code here`,
    category: "Loops",
    parameters: [ { id: "count", name: "Loop count", type: "number", defaultValue: "10", placeholder: "Enter count" } ]
  },

  // Timing Section
  {
    id: "pause",
    name: "Pause",
    description: "Pause execution in milliseconds",
    code: "await basic.pause({ms})",
    category: "Timing",
    parameters: [ { id: "ms", name: "Milliseconds", type: "number", defaultValue: "1000", placeholder: "Enter ms" } ]
  },
  {
    id: "sleep_ms",
    name: "Sleep (ms)",
    description: "Sleep for milliseconds",
    code: "sleep({ms})",
    category: "Timing",
    parameters: [ { id: "ms", name: "Milliseconds", type: "number", defaultValue: "1000", placeholder: "Enter ms" } ]
  },
  { id: "ticks_ms", name: "Get Ticks (ms)", description: "Get current time in milliseconds", code: "running_time()", category: "Timing" },

  // Imports Section
  { id: "microbit_import", name: "Microbit Import", description: "Import microbit module", code: "from microbit import *", category: "Imports" },
  { id: "music_import", name: "Music Import", description: "Import music module", code: "import music", category: "Imports" },
  { id: "radio_import", name: "Radio Import", description: "Import radio module", code: "import radio", category: "Imports" }
];

export const CATEGORIES = ["Display", "Pins", "Buttons", "Sensor","Loops", "Timing", "Imports"] as const;
