/**
 * MakeCode to MicroPython Converter
 * 
 * Converts MakeCode-style Python code to standard MicroPython
 * that runs on the micro:bit hardware.
 * 
 * MakeCode Python API → MicroPython API mappings:
 * - basic.show_string() → display.scroll()
 * - basic.show_number() → display.scroll(str())
 * - basic.show_icon() → display.show(Image.XXX)
 * - basic.show_leds() → display.show(Image())
 * - basic.pause() → sleep()
 * - basic.clear_screen() → display.clear()
 * - basic.forever() → while True loop
 * - input.on_button_pressed() → button_x.was_pressed() polling in main loop
 * - input.button_is_pressed() → button_a.is_pressed() etc.
 */

// Track button handlers for conversion to polling model
interface ButtonHandler {
  button: 'A' | 'B' | 'AB';
  functionName: string;
}

/**
 * Convert MakeCode Python to MicroPython
 */
export function convertMakeCodeToMicroPython(makeCodePython: string): string {
  let code = makeCodePython;
  
  // Track what imports we need
  const needsImports = new Set<string>();
  needsImports.add('microbit'); // Always need this
  
  // Track forever functions for conversion
  const foreverFunctions: string[] = [];
  
  // Track button handlers for conversion
  const buttonHandlers: ButtonHandler[] = [];
  
  // Find all basic.forever() calls and extract function names
  const foreverPattern = /basic\.forever\s*\(\s*(\w+)\s*\)/g;
  let match;
  while ((match = foreverPattern.exec(code)) !== null) {
    foreverFunctions.push(match[1]);
  }
  
  // Find all button handler registrations
  const buttonAPattern = /input\.on_button_pressed\s*\(\s*Button\.A\s*,\s*(\w+)\s*\)/g;
  const buttonBPattern = /input\.on_button_pressed\s*\(\s*Button\.B\s*,\s*(\w+)\s*\)/g;
  const buttonABPattern = /input\.on_button_pressed\s*\(\s*Button\.AB\s*,\s*(\w+)\s*\)/g;
  
  while ((match = buttonAPattern.exec(code)) !== null) {
    buttonHandlers.push({ button: 'A', functionName: match[1] });
  }
  while ((match = buttonBPattern.exec(code)) !== null) {
    buttonHandlers.push({ button: 'B', functionName: match[1] });
  }
  while ((match = buttonABPattern.exec(code)) !== null) {
    buttonHandlers.push({ button: 'AB', functionName: match[1] });
  }
  
  // Remove basic.forever() calls - we'll add while True at the end
  code = code.replace(/basic\.forever\s*\(\s*\w+\s*\)\s*\n?/g, '');
  
  // Remove button handler registrations - we'll add polling in the main loop
  code = code.replace(/input\.on_button_pressed\s*\(\s*Button\.(A|B|AB)\s*,\s*\w+\s*\)\s*\n?/g, '');
  
  // Convert basic.show_string() → display.scroll()
  code = code.replace(/basic\.show_string\s*\(/g, 'display.scroll(');
  
  // Convert basic.show_number() → display.show() for single digits, display.scroll() for larger
  // For simplicity, use display.show() which works for single digits and scrolls for multi-digit
  code = code.replace(/basic\.show_number\s*\(\s*([^)]+)\s*\)/g, 'display.show($1)');
  
  // Convert basic.pause() → sleep()
  code = code.replace(/basic\.pause\s*\(/g, 'sleep(');
  
  // Convert basic.clear_screen() → display.clear()
  code = code.replace(/basic\.clear_screen\s*\(\s*\)/g, 'display.clear()');
  
  // Convert basic.show_icon with icon names
  const iconMappings: Record<string, string> = {
    'IconNames.HEART': 'Image.HEART',
    'IconNames.HAPPY': 'Image.HAPPY',
    'IconNames.SAD': 'Image.SAD',
    'IconNames.CONFUSED': 'Image.CONFUSED',
    'IconNames.ANGRY': 'Image.ANGRY',
    'IconNames.ASLEEP': 'Image.ASLEEP',
    'IconNames.SURPRISED': 'Image.SURPRISED',
    'IconNames.SILLY': 'Image.SILLY',
    'IconNames.FABULOUS': 'Image.FABULOUS',
    'IconNames.MEH': 'Image.MEH',
    'IconNames.YES': 'Image.YES',
    'IconNames.NO': 'Image.NO',
    'IconNames.CLOCK12': 'Image.CLOCK12',
    'IconNames.CLOCK1': 'Image.CLOCK1',
    'IconNames.CLOCK2': 'Image.CLOCK2',
    'IconNames.CLOCK3': 'Image.CLOCK3',
    'IconNames.CLOCK4': 'Image.CLOCK4',
    'IconNames.CLOCK5': 'Image.CLOCK5',
    'IconNames.CLOCK6': 'Image.CLOCK6',
    'IconNames.CLOCK7': 'Image.CLOCK7',
    'IconNames.CLOCK8': 'Image.CLOCK8',
    'IconNames.CLOCK9': 'Image.CLOCK9',
    'IconNames.CLOCK10': 'Image.CLOCK10',
    'IconNames.CLOCK11': 'Image.CLOCK11',
    'IconNames.ARROW_N': 'Image.ARROW_N',
    'IconNames.ARROW_NE': 'Image.ARROW_NE',
    'IconNames.ARROW_E': 'Image.ARROW_E',
    'IconNames.ARROW_SE': 'Image.ARROW_SE',
    'IconNames.ARROW_S': 'Image.ARROW_S',
    'IconNames.ARROW_SW': 'Image.ARROW_SW',
    'IconNames.ARROW_W': 'Image.ARROW_W',
    'IconNames.ARROW_NW': 'Image.ARROW_NW',
    'IconNames.TRIANGLE': 'Image.TRIANGLE',
    'IconNames.TRIANGLE_LEFT': 'Image.TRIANGLE_LEFT',
    'IconNames.CHESSBOARD': 'Image.CHESSBOARD',
    'IconNames.DIAMOND': 'Image.DIAMOND',
    'IconNames.DIAMOND_SMALL': 'Image.DIAMOND_SMALL',
    'IconNames.SQUARE': 'Image.SQUARE',
    'IconNames.SQUARE_SMALL': 'Image.SQUARE_SMALL',
    'IconNames.RABBIT': 'Image.RABBIT',
    'IconNames.COW': 'Image.COW',
    'IconNames.MUSIC_CROTCHET': 'Image.MUSIC_CROTCHET',
    'IconNames.MUSIC_QUAVER': 'Image.MUSIC_QUAVER',
    'IconNames.MUSIC_QUAVERS': 'Image.MUSIC_QUAVERS',
    'IconNames.PITCHFORK': 'Image.PITCHFORK',
    'IconNames.XMAS': 'Image.XMAS',
    'IconNames.PACMAN': 'Image.PACMAN',
    'IconNames.TARGET': 'Image.TARGET',
    'IconNames.TSHIRT': 'Image.TSHIRT',
    'IconNames.ROLLERSKATE': 'Image.ROLLERSKATE',
    'IconNames.DUCK': 'Image.DUCK',
    'IconNames.HOUSE': 'Image.HOUSE',
    'IconNames.TORTOISE': 'Image.TORTOISE',
    'IconNames.BUTTERFLY': 'Image.BUTTERFLY',
    'IconNames.STICKFIGURE': 'Image.STICKFIGURE',
    'IconNames.GHOST': 'Image.GHOST',
    'IconNames.SWORD': 'Image.SWORD',
    'IconNames.GIRAFFE': 'Image.GIRAFFE',
    'IconNames.SKULL': 'Image.SKULL',
    'IconNames.UMBRELLA': 'Image.UMBRELLA',
    'IconNames.SNAKE': 'Image.SNAKE',
    'IconNames.SMALL_HEART': 'Image.HEART_SMALL',
  };
  
  // Replace icon names
  for (const [makecode, micropython] of Object.entries(iconMappings)) {
    code = code.replace(new RegExp(makecode.replace('.', '\\.'), 'g'), micropython);
  }
  
  // Convert basic.show_icon() → display.show()
  code = code.replace(/basic\.show_icon\s*\(/g, 'display.show(');
  
  // Convert basic.show_leds() - this is more complex
  // basic.show_leds(`# . . . #\n. # . # .\n. . # . .\n. # . # .\n# . . . #`) 
  // → display.show(Image('90009:09090:00900:09090:90009'))
  code = code.replace(
    /basic\.show_leds\s*\(\s*[`"']([^`"']+)[`"']\s*\)/g,
    (match, ledPattern) => {
      const micropythonPattern = convertLedPatternToMicroPython(ledPattern);
      return `display.show(Image('${micropythonPattern}'))`;
    }
  );
  
  // Convert input functions (direct calls, not event handlers)
  code = code.replace(/input\.button_is_pressed\s*\(\s*Button\.A\s*\)/g, 'button_a.is_pressed()');
  code = code.replace(/input\.button_is_pressed\s*\(\s*Button\.B\s*\)/g, 'button_b.is_pressed()');
  
  // Convert led functions
  code = code.replace(/led\.plot\s*\(/g, 'display.set_pixel(');
  code = code.replace(/led\.unplot\s*\(/g, 'display.set_pixel('); // Note: need to add , 0) at end
  code = code.replace(/led\.toggle\s*\(/g, '# toggle pixel at (');
  
  // Convert music functions
  if (code.includes('music.')) {
    needsImports.add('music');
  }
  code = code.replace(/music\.play_tone\s*\(/g, 'music.pitch(');
  code = code.replace(/music\.rest\s*\(/g, 'sleep(');
  
  // Remove on_start function wrapper if present, keep the content
  code = code.replace(/def on_start\s*\(\s*\)\s*:\s*\n([\s\S]*?)(?=\ndef|\non_start\(\)|\n[^\s]|$)/g, (match, content) => {
    // Remove one level of indentation from content
    return content.replace(/^  /gm, '');
  });
  
  // Remove on_start() call
  code = code.replace(/\non_start\s*\(\s*\)\s*\n?/g, '\n');
  
  // Build the imports
  let imports = '# Imports go at the top\nfrom microbit import *\n';
  if (needsImports.has('music')) {
    imports += 'import music\n';
  }
  
  // Remove any existing imports that might conflict
  code = code.replace(/from microbit import \*/g, '');
  code = code.replace(/import microbit/g, '');
  
  // Build the forever loop if there are forever functions or button handlers
  let foreverLoop = '';
  const needsMainLoop = foreverFunctions.length > 0 || buttonHandlers.length > 0;
  
  if (needsMainLoop) {
    foreverLoop = '\n# Main loop\nwhile True:\n';
    
    // Add button polling
    for (const handler of buttonHandlers) {
      if (handler.button === 'A') {
        foreverLoop += `    if button_a.was_pressed():\n`;
        foreverLoop += `        ${handler.functionName}()\n`;
      } else if (handler.button === 'B') {
        foreverLoop += `    if button_b.was_pressed():\n`;
        foreverLoop += `        ${handler.functionName}()\n`;
      } else if (handler.button === 'AB') {
        foreverLoop += `    if button_a.is_pressed() and button_b.is_pressed():\n`;
        foreverLoop += `        ${handler.functionName}()\n`;
      }
    }
    
    // Add forever function calls
    for (const funcName of foreverFunctions) {
      foreverLoop += `    ${funcName}()\n`;
    }
    
    // Add a small sleep to prevent tight loop if only button handlers
    if (foreverFunctions.length === 0 && buttonHandlers.length > 0) {
      foreverLoop += `    sleep(10)  # Small delay to prevent tight loop\n`;
    }
  }
  
  // Clean up multiple blank lines
  code = code.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  code = code.trim();
  
  // Combine everything
  const result = imports + '\n' + code + foreverLoop;
  
  return result;
}

/**
 * Convert MakeCode LED pattern to MicroPython Image format
 * Input: "# . . . #\n. # . # .\n. . # . .\n. # . # .\n# . . . #"
 * Output: "90009:09090:00900:09090:90009"
 */
function convertLedPatternToMicroPython(pattern: string): string {
  const rows = pattern.split('\n').map(row => row.trim());
  const microPythonRows: string[] = [];
  
  for (const row of rows) {
    if (!row) continue;
    const pixels = row.split(/\s+/);
    let rowStr = '';
    for (const pixel of pixels) {
      rowStr += pixel === '#' ? '9' : '0';
    }
    if (rowStr.length === 5) {
      microPythonRows.push(rowStr);
    }
  }
  
  return microPythonRows.join(':');
}

/**
 * Check if code appears to be MakeCode-style Python
 */
export function isMakeCodeStyle(code: string): boolean {
  const makeCodePatterns = [
    /basic\./,
    /input\.button_is_pressed/,
    /input\.on_button_pressed/,
    /IconNames\./,
    /Button\.A/,
    /Button\.B/,
    /on_start\s*\(\)/,
    /basic\.forever/,
  ];
  
  return makeCodePatterns.some(pattern => pattern.test(code));
}

/**
 * Auto-convert code if needed, or pass through if already MicroPython
 */
export function ensureMicroPythonFormat(code: string): string {
  // If it already has microbit import, assume it's valid MicroPython
  if (code.includes('from microbit import') || code.includes('import microbit')) {
    return code;
  }
  
  // If it looks like MakeCode style, convert it
  if (isMakeCodeStyle(code)) {
    return convertMakeCodeToMicroPython(code);
  }
  
  // Otherwise, add the import and return as-is
  return '# Imports go at the top\nfrom microbit import *\n\n' + code;
}

export default {
  convertMakeCodeToMicroPython,
  isMakeCodeStyle,
  ensureMicroPythonFormat,
};
