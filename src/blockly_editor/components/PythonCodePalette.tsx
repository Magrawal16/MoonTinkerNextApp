// PythonCodePalette.tsx - Add micro:bit-specific snippets
const MICROBIT_SNIPPETS = [
  {
    name: "Button Press Handler",
    code: `def on_button_a_pressed():
    # Code to run when button A is pressed
    display.show(Image.HAPPY)

# Register the handler
button_a.on_press(on_button_a_pressed)
`,
    category: "Micro:bit"
  },
  {
    name: "Display Scroll Text",
    code: `display.scroll("Hello, Micro:bit!")
`,
    category: "Micro:bit"
  },
  {
    name: "LED Matrix Pattern",
    code: `# Create a custom image
custom_image = Image("09090:"
                     "90909:"
                     "09090:"
                     "90909:"
                     "09090")
display.show(custom_image)
`,
    category: "Micro:bit"
  },
  {
    name: "Reading Analog Input",
    code: `# Read analog value from pin0
value = pin0.read_analog()
display.scroll(str(value))
`,
    category: "Micro:bit"
  },
  {
    name: "Forever Loop",
    code: `while True:
    # Your code here
    sleep(1000)  # Wait for 1 second
`,
    category: "Micro:bit"
  }
];