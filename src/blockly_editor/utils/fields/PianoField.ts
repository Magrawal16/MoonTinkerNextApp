import * as Blockly from "blockly";

/** Names used for white/black keys (two octaves C4..B5) */
type WhiteName =
  | "C4" | "D4" | "E4" | "F4" | "G4" | "A4" | "B4"
  | "C5" | "D5" | "E5" | "F5" | "G5" | "A5" | "B5";

type BlackName =
  | "C#4" | "D#4" | "F#4" | "G#4" | "A#4"
  | "C#5" | "D#5" | "F#5" | "G#5" | "A#5";

interface KeyDef<TName extends string> {
  name: TName;
  freq: number;
}

export default class FieldPiano extends Blockly.Field<string> {
  private noteValue: number;

  constructor(value: string = "262", validator?: Blockly.FieldValidator<string>) {
    super(value, validator);
    this.noteValue = Number(value) || 262;
  }

  static override fromJson(options: Blockly.FieldConfig): FieldPiano {
    const v = (options as any)?.value as string | undefined;
    return new FieldPiano(v ?? "262");
  }

  override showEditor_(): void {
    Blockly.DropDownDiv.hideIfOwner(this);

    const contentDiv = Blockly.DropDownDiv.getContentDiv();
    while (contentDiv.firstChild) contentDiv.removeChild(contentDiv.firstChild);

    /**************************************************************
     * Mouse-drag tracking (drag-to-play)
     **************************************************************/
    let isMouseDown = false;
    document.addEventListener("mouseup", () => (isMouseDown = false));

    const autoPlayOnInput = true;
    let inputPlayDebounce: number | null = null;

    /**************************************************************
     * Frequency input
     **************************************************************/
    const freqInput = document.createElement("input") as HTMLInputElement;
    freqInput.type = "number";
    freqInput.value = String(this.noteValue);
    Object.assign(freqInput.style, {
      width: "120px",
      padding: "6px",
      borderRadius: "6px",
      border: "1px solid #aaa",
      textAlign: "center",
      fontSize: "14px",
      marginTop: "4px",
      marginBottom: "10px",
    });

    /**************************************************************
     * Container
     **************************************************************/
    const container = document.createElement("div");
    Object.assign(container.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "#fff",
      borderRadius: "8px",
      padding: "10px",
      minWidth: "520px",
    });

    const label = document.createElement("div");
    label.textContent = "Select Note or Enter Frequency";
    Object.assign(label.style, {
      fontSize: "12px",
      fontFamily: "monospace",
      marginBottom: "8px",
    });
    container.appendChild(label);

    /**************************************************************
     * Piano Keys
     **************************************************************/
    const WHITE_KEYS: ReadonlyArray<KeyDef<WhiteName>> = [
      { name: "C4", freq: 262 }, { name: "D4", freq: 294 }, { name: "E4", freq: 330 },
      { name: "F4", freq: 349 }, { name: "G4", freq: 392 }, { name: "A4", freq: 440 },
      { name: "B4", freq: 494 }, { name: "C5", freq: 523 }, { name: "D5", freq: 587 },
      { name: "E5", freq: 659 }, { name: "F5", freq: 698 }, { name: "G5", freq: 784 },
      { name: "A5", freq: 880 }, { name: "B5", freq: 988 },
    ];

    const BLACK_KEYS: ReadonlyArray<KeyDef<BlackName>> = [
      { name: "C#4", freq: 277 }, { name: "D#4", freq: 311 },
      { name: "F#4", freq: 370 }, { name: "G#4", freq: 415 }, { name: "A#4", freq: 466 },
      { name: "C#5", freq: 554 }, { name: "D#5", freq: 622 },
      { name: "F#5", freq: 740 }, { name: "G#5", freq: 831 }, { name: "A#5", freq: 932 },
    ];

    const BLACK_POSITIONS: Record<BlackName, number> = {
      "C#4": 27, "D#4": 61, "F#4": 130, "G#4": 164, "A#4": 198,
      "C#5": 267, "D#5": 301, "F#5": 370, "G#5": 404, "A#5": 438,
    };

    /**************************************************************
     * Piano container with gloss effect
     **************************************************************/
    const piano = document.createElement("div");
    Object.assign(piano.style, {
      position: "relative",
      width: "520px",
      height: "120px",
      display: "flex",
      justifyContent: "space-between",
      background: "#ddd",
      borderRadius: "10px",
      padding: "5px",
      marginBottom: "10px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
      overflow: "hidden",
    });

    // ⭐ Gloss shine overlay
    const gloss = document.createElement("div");
    Object.assign(gloss.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "50px",
      background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0) )",
      pointerEvents: "none",
      zIndex: "3",
    });
    piano.appendChild(gloss);

    container.appendChild(piano);

    const highlightColor = "#6EE7B7";

    const clearHighlights = () => {
      for (const child of Array.from(piano.children) as HTMLElement[]) {
        if (child === gloss) continue;
        const isBlack = child.style.zIndex === "2";
        child.style.background = isBlack ? "#111" : "white";
        child.style.transform = "translateY(0px)";
      }
    };

    /**************************************************************
     * WHITE KEYS
     **************************************************************/
    WHITE_KEYS.forEach((note) => {
      const key = document.createElement("div");
      Object.assign(key.style, {
        width: "34px",
        height: "100px",
        background: note.freq === this.noteValue ? highlightColor : "white",
        border: "1px solid #999",
        borderRadius: "3px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        fontSize: "11px",
        fontFamily: "monospace",

        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",

        transition: "transform 0.08s ease",
      });

      key.textContent = note.name.replace(/\d/, "");

      const press = () => {
        clearHighlights();
        key.style.background = highlightColor;
        key.style.transform = "translateY(3px)";  // press effect
        this.noteValue = note.freq;
        this.setValue(String(note.freq));
        freqInput.value = String(note.freq);
        this.playTone(note.freq);
      };

      key.onpointerdown = () => {
        isMouseDown = true;
        press();
      };

      key.onpointerenter = () => {
        if (isMouseDown) press();
      };

      key.onpointerup = () => {
        key.style.transform = "translateY(0px)";
      };

      piano.appendChild(key);
    });

    /**************************************************************
     * BLACK KEYS
     **************************************************************/
    BLACK_KEYS.forEach((note) => {
      const key = document.createElement("div");
      Object.assign(key.style, {
        width: "22px",
        height: "60px",
        background: note.freq === this.noteValue ? "#444" : "#111",
        border: "1px solid #000",
        borderRadius: "3px",
        position: "absolute",
        top: "5px",
        left: `${BLACK_POSITIONS[note.name]}px`,
        cursor: "pointer",
        zIndex: "2",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        fontSize: "10px",
        color: "white",

        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",

        transition: "transform 0.08s ease, background 0.1s",
      });

      key.textContent = note.name.replace(/\d/, "");

      const press = () => {
        clearHighlights();
        key.style.background = "#444";
        key.style.transform = "translateY(2px)";
        this.noteValue = note.freq;
        this.setValue(String(note.freq));
        freqInput.value = String(note.freq);
        this.playTone(note.freq);
      };

      key.onpointerdown = () => {
        isMouseDown = true;
        press();
      };

      key.onpointerenter = () => {
        if (isMouseDown) press();
      };

      key.onpointerup = () => {
        key.style.transform = "translateY(0px)";
      };

      piano.appendChild(key);
    });

    /**************************************************************
     * Play Button (modern blue)
     **************************************************************/
    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.title = "Play frequency";
    playBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" fill="white"/>
      </svg>`;

    Object.assign(playBtn.style, {
      width: "38px",
      height: "38px",
      borderRadius: "10px",
      cursor: "pointer",
      border: "none",
      background: "linear-gradient(135deg, #4A90E2, #357ABD)",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "0.15s ease",
      userSelect: "none",
    });

    playBtn.onmouseenter = () => {
      playBtn.style.background = "linear-gradient(135deg, #5AA0F2, #468BDE)";
    };
    playBtn.onmouseleave = () => {
      playBtn.style.background = "linear-gradient(135deg, #4A90E2, #357ABD)";
    };

    const inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "6px",
    });

    freqInput.oninput = () => {
      const v = Number(freqInput.value);
      if (!isNaN(v) && v > 0) {
        this.noteValue = v;
        this.setValue(String(v));
        clearHighlights();

        if (autoPlayOnInput) {
          if (inputPlayDebounce) clearTimeout(inputPlayDebounce);
          inputPlayDebounce = window.setTimeout(() => this.playTone(v), 350);
        }
      }
    };

    playBtn.onclick = () => {
      const v = Number(freqInput.value);
      if (!isNaN(v) && v > 0) this.playTone(v);
    };

    inputRow.appendChild(freqInput);
    inputRow.appendChild(playBtn);
    container.appendChild(inputRow);

    contentDiv.appendChild(container);
    Blockly.DropDownDiv.setColour("#ffffff", "#cccccc");
    Blockly.DropDownDiv.showPositionedByField(this, this.onDropdownHide_.bind(this));
  }

  private playTone(frequency: number): void {
    try {
      const Ctx =
        (window as any).AudioContext ||
        (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  private onDropdownHide_(): void {
    const contentDiv = Blockly.DropDownDiv.getContentDiv();
    while (contentDiv.firstChild) contentDiv.removeChild(contentDiv.firstChild);
  }
}

Blockly.fieldRegistry.register("field_piano", FieldPiano);
