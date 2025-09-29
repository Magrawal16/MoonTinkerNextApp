// components/editor/python/PythonAPI.ts
export type Monaco = any;

export const DIGITAL_PINS = Array.from({ length: 21 }, (_, i) => `P${i}`);

export const API = {
  led: {
    plot: { sig: "led.plot(x: int, y: int) -> None", doc: "Turn on LED at (x, y)." },
    unplot: { sig: "led.unplot(x: int, y: int) -> None", doc: "Turn off LED at (x, y)." },
    toggle: { sig: "led.toggle(x: int, y: int) -> None", doc: "Toggle LED at (x, y)." },
    point: { sig: "led.point(x: int, y: int) -> bool", doc: "Return True if LED at (x, y) is on." },
  },
  input: {
    on_button_pressed: {
      sig: "input.on_button_pressed(button: Button, handler: () -> None) -> None",
      doc: "Register a handler that runs when the button is pressed.",
      snippet:
        `def \${1:handler}():\n` +
        `\t\${2:# your code}\n\n` +
        `input.on_button_pressed(Button.\${3|A,B,AB|}, \${1})\n`,
    },
    on_logo_pressed: {
      sig: "input.on_logo_pressed(on_logo_down: () -> None) -> None",
      doc: "Register a handler that runs when the logo is pressed.",
      snippet:
        `def \${1:on_logo_down}():\n` +
        `\t\${2:# your code}\n\n` +
        `input.on_logo_pressed({1})\n`,
    },
  },
  basic: {
    show_string: {
      sig: "basic.show_string(text: str, interval: int = 150) -> None",
      doc: "Scroll a string across the LED matrix.",
    },
    forever: {
      sig: "basic.forever(handler: () -> None) -> None",
      doc: "Run the given handler repeatedly with a short pause.",
      snippet: "def loop():\n\t# your code\n\nbasic.forever(loop)\n",
    },
    pause: { sig: "basic.pause(ms: int) -> None", doc: "Pause execution for ms milliseconds." },
  },
  pins: {
    digital_write_pin: {
      sig: "pins.digital_write_pin(pin: DigitalPin, value: int) -> None",
      doc: "Write digital value (0/1) to a pin.",
    },
    digital_read_pin: {
      sig: "pins.digital_read_pin(pin: DigitalPin) -> int",
      doc: "Read digital value (0/1) from a pin.",
    },
    analog_write_pin: {
      sig: "pins.analog_write_pin(pin: DigitalPin, value: int) -> None",
      doc: "Write analog value (usually 0-1023) to a pin.",
    },
    read_analog_pin: {
      sig: "pins.read_analog_pin(pin: DigitalPin) -> int",
      doc: "Read analog value (usually 0-1023) from a pin.",
    },
  },
  Button: ["A", "B", "AB"] as const,
  DigitalPin: DIGITAL_PINS,
};

// Optional: allow dynamic pin injection later (e.g., from simulator)
export const setDigitalPins = (pins: string[]) => {
  (API as any).DigitalPin = pins;
};
