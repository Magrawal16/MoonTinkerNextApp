// Types and static snippet data for Python code palette
// Separated from the component for reusability and cleaner organization

export interface Parameter {
  id: string;
  name: string;
  type: "dropdown" | "number" | "text";
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
  // ===== BASIC SECTION =====
  {
    id: "clear_screen",
    name: "Clear Screen",
    description: "Clear the LED display",
    code: "basic.clear_screen()",
    category: "Basic",
  },
  {
    id: "show_string",
    name: "Show String",
    description: "Display scrolling text",
    code: 'basic.show_string("{text}")',
    category: "Basic",
    parameters: [
      {
        id: "text",
        name: "Text to display",
        type: "text",
        defaultValue: "Hello!",
        placeholder: "Enter text",
      },
    ],
  },
  {
    id: "show_number",
    name: "Show Number",
    description: "Display a number",
    code: "basic.show_number({number})",
    category: "Basic",
    parameters: [
      {
        id: "number",
        name: "Number to display",
        type: "number",
        defaultValue: "0",
        placeholder: "Enter number",
      },
    ],
  },
  {
    id: "show_leds",
    name: "Show LEDs",
    description: "Display a custom LED pattern",
    code: `basic.show_leds("""
    . . . . .
    . . . . .
    . . # . .
    . . . . .
    . . . . .
    """)`,
    category: "Basic",
  },
  {
    id: "pause",
    name: "Pause",
    description: "Pause execution in milliseconds",
    code: "basic.pause({ms})",
    category: "Basic",
    parameters: [
      {
        id: "ms",
        name: "Milliseconds",
        type: "number",
        defaultValue: "1000",
        placeholder: "Enter ms",
      },
    ],
  },
  {
    id: "show_image",
    name: "Show Icon",
    description: "Display built-in image",
    code: "display.show(Image.{image})",
    category: "Basic",
    parameters: [
      {
        id: "image",
        name: "Image",
        type: "dropdown",
        options: [
          "HEART",
          "HEART_SMALL",
          "HAPPY",
          "SMILE",
          "SAD",
          "CONFUSED",
          "ANGRY",
          "ASLEEP",
          "SURPRISED",
          "SILLY",
          "FABULOUS",
          "MEH",
        ],
        defaultValue: "HEART",
        placeholder: "Select image",
      },
    ],
  },
  
  {
    id: "forever",
    name: "Forever",
    description: "Run code continuously",
    code: `def on_forever():\n    pass\n\nbasic.forever(on_forever)`,
    category: "Basic",
  },
  {
    id: "on_start",
    name: "On Start",
    description: "Code that runs when the program starts (appears before forever loop)",
    code: `# On start code goes here\n`,
    category: "Basic",
  },
  {
    id: "microbit_import",
    name: "Microbit Import",
    description: "Import microbit module",
    code: "from microbit import *",
    category: "Basic",
  },

  // ===== INPUT SECTION =====
  {
    id: "button_pressed",
    name: "On Button Pressed",
    description: "Function triggered when button is pressed",
    code: `def on_button_pressed_{button_lower}():\n    pass\n\ninput.on_button_pressed(Button.{button}, on_button_pressed_{button_lower})`,
    category: "Input",
    parameters: [
      {
        id: "button",
        name: "Button",
        type: "dropdown",
        options: ["A", "B", "AB"],
        defaultValue: "A",
        placeholder: "Button",
      },
    ],
  },
  {
    id: "button_conditional_listener",
    name: "Button Conditional",
    description: "Check if button is pressed",
    code: "input.button_is_pressed(Button.{button})",
    category: "Input",
    parameters: [
      {
        id: "button",
        name: "Button",
        type: "dropdown",
        options: ["A", "B", "AB"],
        defaultValue: "A",
        placeholder: "Button",
      },
    ],
  },
  {
    id: "temperature",
    name: "Temperature",
    description: "Read temperature in °C",
    code: "input.temperature()",
    category: "Input",
  },
  {
    id: "light_level",
    name: "Light Level",
    description: "Read ambient light level (0-255)",
    code: "input.light_level()",
    category: "Input",
  },
  {
    id: "logo_pressed",
    name: "On Logo Pressed | micro:bit (V2)",
    description: "Function triggered when logo is pressed",
    code: `def on_logo_pressed():\n    pass\n\ninput.on_logo_pressed(on_logo_pressed)`,
    category: "Input",
  },
  {
    id: "logo_released",
    name: "On Logo Released | micro:bit (V2)",
    description: "Function triggered when logo is released",
    code: `def on_logo_released():\n    pass\n\ninput.on_logo_released(on_logo_released)`,
    category: "Input",
  },
  {
    id: "logo_is_pressed",
    name: "Logo Is Pressed | micro:bit (V2)",
    description: "Check if logo touch sensor is pressed",
    code: "input.logo_is_pressed()",
    category: "Input",
  },
  {
    id: "gesture_listener",
    name: "On Gesture",
    description: "Function triggered when a gesture happens",
    code: `def on_gesture_{gesture_lower}():\n    pass\n\ninput.on_gesture(Gesture.{gesture}, on_gesture_{gesture_lower})`,
    category: "Input",
    parameters: [
      {
        id: "gesture",
        name: "Gesture",
        type: "dropdown",
        options: [
          "SHAKE",
          "LOGO_UP",
          "LOGO_DOWN",
          "SCREEN_UP",
          "SCREEN_DOWN",
          "TILT_LEFT",
          "TILT_RIGHT",
          "FREE_FALL",
          "THREE_G",
          "SIX_G",
          "EIGHT_G",
        ],
        defaultValue: "SHAKE",
        placeholder: "Gesture",
      },
    ],
  },
  {
    id: "gesture_conditional",
    name: "Gesture Conditional",
    description: "Check if a gesture is active",
    code: "input.is_gesture(Gesture.{gesture})",
    category: "Input",
    parameters: [
      {
        id: "gesture",
        name: "Gesture",
        type: "dropdown",
        options: [
          "SHAKE",
          "LOGO_UP",
          "LOGO_DOWN",
          "SCREEN_UP",
          "SCREEN_DOWN",
          "TILT_LEFT",
          "TILT_RIGHT",
          "FREE_FALL",
          "THREE_G",
          "SIX_G",
          "EIGHT_G",
        ],
        defaultValue: "SHAKE",
        placeholder: "Gesture",
      },
    ],
  },

    // ===== LED SECTION =====
  {
    id: "led_plot",
    name: "LED Plot",
    description: "Turn on LED at position",
    code: "led.plot({x}, {y})",
    category: "Led",
    parameters: [
      {
        id: "x",
        name: "X coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "X",
      },
      {
        id: "y",
        name: "Y coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "Y",
      },
    ],
  },
  {
    id: "led_unplot",
    name: "LED Unplot",
    description: "Turn off LED at position",
    code: "led.unplot({x}, {y})",
    category: "Led",
    parameters: [
      {
        id: "x",
        name: "X coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "X",
      },
      {
        id: "y",
        name: "Y coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "Y",
      },
    ],
  },
  {
    id: "led_brightness",
    name: "LED Brightness",
    description: "Set LED brightness at position",
    code: "led.plot_brightness({x}, {y}, {brightness})",
    category: "Led",
    parameters: [
      {
        id: "x",
        name: "X coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "X",
      },
      {
        id: "y",
        name: "Y coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "Y",
      },
      {
        id: "brightness",
        name: "Brightness (0-255)",
        type: "number",
        defaultValue: "255",
        placeholder: "0-255",
      },
    ],
  },
  {
    id: "led_toggle",
    name: "LED Toggle",
    description: "Toggle LED at position",
    code: "led.toggle({x}, {y})",
    category: "Led",
    parameters: [
      {
        id: "x",
        name: "X coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "X",
      },
      {
        id: "y",
        name: "Y coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "Y",
      },
    ],
  },
  {
    id: "led_point",
    name: "LED Point",
    description: "Check if LED is on at position",
    code: "led.point({x}, {y})",
    category: "Led",
    parameters: [
      {
        id: "x",
        name: "X coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "X",
      },
      {
        id: "y",
        name: "Y coordinate",
        type: "dropdown",
        options: ["0", "1", "2", "3", "4"],
        defaultValue: "0",
        placeholder: "Y",
      },
    ],
  },

    // ===== LOGIC SECTION =====
  {
    id: "if_true",
    name: "If ",
    description: "Execute code if condition is true",
    code: `if True:\n    # your code here`,
    category: "Logic",
  },
  {
    id: "if_else",
    name: "If Else",
    description: "Execute code in if/else branches",
    code: "if True:\n    pass\nelse:\n    pass",
    category: "Logic",
  },
  {
    id: "condition_and",
    name: "And",
    description: "Boolean AND condition",
    code: "True and False",
    category: "Logic",
  },
  {
    id: "condition_or",
    name: "Or",
    description: "Boolean OR condition",
    code: "True or False",
    category: "Logic",
  },
 

  // ===== LOOPS SECTION =====
  {
    id: "while_true",
    name: "While",
    description: "While loop structure",
    code: "while true:\n  pass",
    category: "Loops",
  },
  {
    id: "repeat",
    name: "Repeat",
    description: "Repeat loop structure",
    code: "for _ in range(0):\n  pass",
    category: "Loops",
  },

    // ===== VARIABLES SECTION =====
  {
    id: "set_variable",
    name: "Set Variable",
    description: "Set a variable to a value",
    code: `{variable} = {value}`,
    category: "Variables",
    parameters: [
      {
        id: "variable",
        name: "Variable name",
        type: "text",
        defaultValue: "item",
        placeholder: "name",
      },
      {
        id: "value",
        name: "Value",
        type: "number",
        defaultValue: "0",
        placeholder: "value",
      },
    ],
  },
  {
    id: "change_variable",
    name: "Change Variable",
    description: "Change variable by a value",
    code: `{variable} = {variable} + {delta}`,
    category: "Variables",
    parameters: [
      {
        id: "variable",
        name: "Variable name",
        type: "text",
        defaultValue: "item",
        placeholder: "name",
      },
      {
        id: "delta",
        name: "Change by",
        type: "number",
        defaultValue: "1",
        placeholder: "amount",
      },
    ],
  },

  
  // ===== PINS SECTION =====
  {
    id: "digital_write",
    name: "Digital Write",
    description: "Set pin to HIGH or LOW",
    code: "pins.digital_write_pin(DigitalPin.{pin}, {value})",
    category: "Pins",
    parameters: [
      {
        id: "pin",
        name: "Pin",
        type: "dropdown",
        options: ["P0", "P1", "P2"],
        defaultValue: "P0",
        placeholder: "Pin",
      },
      {
        id: "value",
        name: "Value",
        type: "dropdown",
        options: ["0", "1"],
        defaultValue: "1",
        placeholder: "Value",
      },
    ],
  },
  {
    id: "digital_read",
    name: "Digital Read",
    description: "Read digital value from pin",
    code: "pins.digital_read_pin(DigitalPin.{pin})",
    category: "Pins",
    parameters: [
      {
        id: "pin",
        name: "Pin",
        type: "dropdown",
        options: ["P0", "P1", "P2"],
        defaultValue: "P0",
        placeholder: "Pin",
      },
    ],
  },
  {
    id: "analog_write",
    name: "Analog Write",
    description: "Write analog value to pin",
    code: "pins.analog_write_pin(AnalogPin.{pin}, {value})",
    category: "Pins",
    parameters: [
      {
        id: "pin",
        name: "Pin",
        type: "dropdown",
        options: ["P0", "P1", "P2"],
        defaultValue: "P0",
        placeholder: "Pin",
      },
      {
        id: "value",
        name: "Value (0-1023)",
        type: "number",
        defaultValue: "512",
        placeholder: "0-1023",
      },
    ],
  },
  {
    id: "analog_read",
    name: "Analog Read",
    description: "Read analog value from pin",
    code: "pins.read_analog_pin(AnalogPin.{pin})",
    category: "Pins",
    parameters: [
      {
        id: "pin",
        name: "Pin",
        type: "dropdown",
        options: ["P0", "P1", "P2"],
        defaultValue: "P0",
        placeholder: "Pin",
      },
    ],
  },

  // ===== MATHS SECTION =====
  {
    id: "pick_random",
    name: "Pick Random",
    description: "Pick a random integer between two numbers",
    code: "random.randint(0, 0)",
    category: "Maths",
  },

  // ===== MUSIC SECTION =====
  // {
  //   id: "music_import",
  //   name: "Music Import",
  //   description: "Import music module",
  //   code: "import music",
  //   category: "Music",
  // },
  {
    id: "music_play_tone",
    name: "Play Tone",
    description: "Play a tone for beats",
    code: "music.play_tone({frequency}, {beats})",
    category: "Music",
    parameters: [
      {
        id: "frequency",
        name: "Frequency (Hz)",
        type: "number",
        defaultValue: "262",
        placeholder: "Hz",
      },
      {
        id: "beats",
        name: "Beats",
        type: "dropdown",
        options: ["1", "0.5", "0.25", "0.125", "2", "4"],
        defaultValue: "1",
        placeholder: "beats",
      },
    ],
  },
  {
    id: "music_ring_tone",
    name: "Ring Tone",
    description: "Continuously play a tone",
    code: "music.ring_tone({frequency})",
    category: "Music",
    parameters: [
      {
        id: "frequency",
        name: "Frequency (Hz)",
        type: "number",
        defaultValue: "262",
        placeholder: "Hz",
      },
    ],
  },
  {
    id: "music_rest",
    name: "Rest",
    description: "Pause music for beats",
    code: "music.rest({beats})",
    category: "Music",
    parameters: [
      {
        id: "beats",
        name: "Beats",
        type: "dropdown",
        options: ["1", "0.5", "0.25", "0.125", "2", "4"],
        defaultValue: "1",
        placeholder: "beats",
      },
    ],
  },
  {
    id: "music_record_and_play",
    name: "Record and Play",
    description: "Record tones then play them",
    code: "await music.record_and_play({recorded})",
    category: "Music",
    parameters: [
      {
        id: "recorded",
        name: "Recorded data",
        type: "text",
        defaultValue: "[]",
        placeholder: "[frequency, beats] list",
      },
    ],
  },

  // ===== REFERENCE CODE SECTION =====
  {
    id: "reference_ultrasonic_4p",
    name: "Reference: 4p Ultrasonic Sensor",
    description: "Ultrasonic sensor reference using TRIG and ECHO pins",
    code: `from microbit import *

# Pin configuration
TRIG_PIN = "Your trig pin"
ECHO_PIN = "Your echo pin"

def measure():
    # Clear TRIG pin
    pins.digital_write_pin(TRIG_PIN, 0)
    basic.sleep(15)

    # Send trigger pulse
    pins.digital_write_pin(TRIG_PIN, 1)
    basic.sleep(1)
    pins.digital_write_pin(TRIG_PIN, 0)

    # Wait for sensor response
    basic.sleep(100)

    # Read echo pin
    return pins.digital_read_pin(ECHO_PIN)

def show_result(detected):
    # Clear display
    for x in range(5):
        for y in range(5):
            led.unplot(x, y)

    if detected:
        # Full screen for detection
        for x in range(5):
            for y in range(5):
                led.plot(x, y)
    else:
        # Single center dot for no detection
        led.plot(2, 2)

# Main program
basic.show_string("---")
pins.digital_write_pin(TRIG_PIN, 1)
basic.pause(1000)

while True:
    result = measure()
    show_result(result)
    basic.pause(300)
`,
    category: "Reference Code",
  },
];

export const CATEGORIES = [
  "Basic",
  "Input",
  "Loops",
  "Led",
  "Logic",
  "Variables",
  "Maths",
  "Music",
  "Pins",
  "Reference Code",
] as const;
