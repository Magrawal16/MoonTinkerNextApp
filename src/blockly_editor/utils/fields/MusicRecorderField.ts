import * as Blockly from "blockly";

/**
 * MusicRecorderField (FINAL — Hybrid comments)
 *
 * - FieldPiano-style piano (14 white keys) with drag-to-play
 * - Record (camera icon) / Stop (white square) button — icon pulse on stop
 * - Play button (blue), Save (green), Speed select, Saved recordings controls
 * - Custom Confirm & Info dialogs (in-simulator, no browser confirm/alert)
 * - Playback abort logic (prevents overlapping audio — restarts on new play)
 * - Text-selection disabled across UI; pointerdown uses preventDefault()
 *
 * Hybrid comments: section headers + short notes to keep file readable.
 */

/* -----------------------------
   Types
   ----------------------------- */
type NoteEvent = { note: string; freq: number; time: number };

/* -----------------------------
   Field Class
   ----------------------------- */
export default class MusicRecorderField extends Blockly.Field<string> {
  private isRecording = false;
  private startTime = 0;

  private recordedNotes: NoteEvent[] = [];
  private savedRecordings: { name: string; notes: NoteEvent[] }[] = [];

  private audioCtx: AudioContext | null = null;
  private keyEls: Record<string, HTMLElement> = {};

  // Playback abort handle to prevent overlapping playback
  private playbackAbort = { stop: false };

  constructor(value = "[]") {
    super(value);
  }

  static override fromJson(options: Blockly.FieldConfig) {
    return new MusicRecorderField((options as any).value ?? "[]");
  }

  /* -----------------------------
     Audio helpers
     ----------------------------- */
  private ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, duration = 0.3) {
    this.ensureAudio();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  /* -----------------------------
     Icons (SVG strings)
     ----------------------------- */
  private recordCameraIcon(size = 16) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"
           xmlns="http://www.w3.org/2000/svg">
        <rect x="2.5" y="5" width="14" height="12" rx="2.2"
              stroke="currentColor" stroke-width="1.6" fill="none"/>
        <path d="M17.8 8.2l3 1v5.6l-3 1V8.2z"
              stroke="currentColor" stroke-width="1.6" fill="none"
              stroke-linejoin="round"/>
        <circle cx="6.3" cy="11.2" r="2.0" fill="#ff2f3b"/>
      </svg>
    `;
  }

  // White square for STOP; class 'mrStopSquare' will be animated
  private stopSquareIcon(size = 16) {
    return `
      <svg class="mrStopSquare" width="${size}" height="${size}"
           viewBox="0 0 24 24" aria-hidden="true"
           xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="16" height="16" fill="white"/>
      </svg>
    `;
  }

  /* -----------------------------
     showEditor_ — main UI builder
     ----------------------------- */
  override showEditor_() {
    const div = Blockly.DropDownDiv.getContentDiv();
    while (div.firstChild) div.firstChild.remove();

    /* -------------------------
       CSS & Animations
       ------------------------- */
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      /* icon pulse only for white stop square */
      @keyframes iconPulse {
        0%,100% { opacity:1; transform: scale(1); }
        50% { opacity:0.28; transform: scale(0.86); }
      }
      .mrStopSquare {
        animation: iconPulse 1s infinite;
        transform-origin: center;
      }

      /* dialogs (confirm + info) */
      .mr-overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.28);
        z-index: 3000;
      }
      .mr-dialog {
        width: 320px;
        background: white;
        border-radius: 10px;
        padding: 14px;
        box-shadow: 0 8px 26px rgba(0,0,0,0.18);
        font-family: monospace;
        color: #222;
      }
      .mr-dialog .mr-msg { margin-bottom: 12px; font-size: 14px; white-space: pre-line; }
      .mr-dialog .mr-row { display:flex; justify-content:center; gap:10px; }
      .mr-btn { padding:8px 14px; border-radius:8px; cursor:pointer; border:1px solid #ccc; background:white; font-family:monospace; }
      .mr-btn.primary { background: linear-gradient(135deg,#FFB3B3,#FF8A8A); color:#661111; border:none; }
      .mr-info-icon { width:36px; height:36px; border-radius:8px; background: linear-gradient(135deg,#E6F0FF,#D5E7FF); display:inline-flex; align-items:center; justify-content:center; margin-right:10px; flex-shrink:0; }
      .mr-info-title { font-weight:600; margin-bottom:6px; }
      .mr-info-ok { background: linear-gradient(135deg,#4A90E2,#357ABD); color:white; border:none; }
    `;
    div.appendChild(styleEl);

    /* -------------------------
       Container (user-select disabled)
       ------------------------- */
    const container = document.createElement("div");
    Object.assign(container.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "10px",
      minWidth: "520px",
      fontFamily: "monospace",
      position: "relative",
      userSelect: "none", // disable selection globally inside container
    });

    /* -------------------------
       Dialog helpers (confirm + info)
       ------------------------- */

    const showConfirmDialog = (
      message: string,
      confirmText = "OK",
      cancelText = "Cancel"
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "mr-overlay";

        const box = document.createElement("div");
        box.className = "mr-dialog";

        const msg = document.createElement("div");
        msg.className = "mr-msg";
        msg.textContent = message;

        const row = document.createElement("div");
        row.className = "mr-row";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "mr-btn";
        cancelBtn.textContent = cancelText;

        const okBtn = document.createElement("button");
        okBtn.className = "mr-btn primary";
        okBtn.textContent = confirmText;

        cancelBtn.onclick = () => {
          overlay.remove();
          resolve(false);
        };

        okBtn.onclick = () => {
          overlay.remove();
          resolve(true);
        };

        row.appendChild(cancelBtn);
        row.appendChild(okBtn);
        box.appendChild(msg);
        box.appendChild(row);
        overlay.appendChild(box);

        container.appendChild(overlay);
      });
    };

    const showInfoDialog = (title: string, message: string, okText = "OK"): Promise<void> => {
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "mr-overlay";

        const box = document.createElement("div");
        box.className = "mr-dialog";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.alignItems = "center";
        topRow.style.marginBottom = "8px";

        const iconWrap = document.createElement("div");
        iconWrap.className = "mr-info-icon";
        iconWrap.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#3B6FD4" stroke-width="1.4" fill="none"/>
            <path d="M11 10h2v6h-2zM11 7h2v2h-2z" fill="#3B6FD4"/>
          </svg>
        `;

        const txtWrap = document.createElement("div");
        txtWrap.style.flex = "1";

        const tEl = document.createElement("div");
        tEl.className = "mr-info-title";
        tEl.textContent = title;

        const mEl = document.createElement("div");
        mEl.className = "mr-msg";
        mEl.style.margin = "0";
        mEl.textContent = message;

        txtWrap.appendChild(tEl);
        txtWrap.appendChild(mEl);

        topRow.appendChild(iconWrap);
        topRow.appendChild(txtWrap);

        const row = document.createElement("div");
        row.className = "mr-row";
        row.style.marginTop = "10px";

        const okBtn = document.createElement("button");
        okBtn.className = "mr-btn mr-info-ok";
        okBtn.textContent = okText;

        okBtn.onclick = () => {
          overlay.remove();
          resolve();
        };

        row.appendChild(okBtn);
        box.appendChild(topRow);
        box.appendChild(row);
        overlay.appendChild(box);

        container.appendChild(overlay);
      });
    };

    /* -------------------------
       Title & toolbar rows
       ------------------------- */
    const titleEl = document.createElement("div");
    titleEl.textContent = "Record & Play";
    Object.assign(titleEl.style, { fontWeight: "600", marginBottom: "8px", fontSize: "15px" });
    container.appendChild(titleEl);

    const row1 = document.createElement("div");
    Object.assign(row1.style, { display: "flex", gap: "12px", marginBottom: "10px" });

    const row2 = document.createElement("div");
    Object.assign(row2.style, { display: "flex", gap: "10px", marginBottom: "10px" });

    /* -------------------------
       Buttons: Record/Stop, Play, Save, Speed
       ------------------------- */
    const recBtn = document.createElement("button");
    recBtn.type = "button";
    recBtn.title = "Record / Stop";
    Object.assign(recBtn.style, {
      width: "140px",
      height: "38px",
      borderRadius: "10px",
      cursor: "pointer",
      border: "1px solid #ccc",
      background: "#f2f2f2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontSize: "14px",
      color: "#222",
      userSelect: "none", // ensure no text selection inside button
    });
    recBtn.innerHTML = `${this.recordCameraIcon(16)}<span>Record</span>`;

    const playBtn = document.createElement("button");
    playBtn.title = "Play";
    Object.assign(playBtn.style, {
      width: "38px",
      height: "38px",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      background: "linear-gradient(135deg, #4A90E2, #357ABD)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.18)",
    });
    playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="white"/></svg>`;

    const saveBtn = document.createElement("button");
    saveBtn.title = "Save";
    saveBtn.textContent = "Save";
    Object.assign(saveBtn.style, {
      width: "80px",
      height: "38px",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      background: "linear-gradient(135deg,#4BE27A,#2CA85C)",
      color: "white",
      fontSize: "14px",
      userSelect: "none",
    });

    const speedSel = document.createElement("select");
    speedSel.title = "Playback Speed";
    Object.assign(speedSel.style, { width: "60px", height: "30px", borderRadius: "6px", border: "1px solid #ccc", userSelect: "none" });
    [["0.5","0.5×"],["1","1×"],["1.5","1.5×"],["2","2×"]].forEach(([v,t]) => {
      const o = document.createElement("option"); o.value = v; o.textContent = t; speedSel.appendChild(o);
    });
    speedSel.value = "1";

    row1.appendChild(recBtn);
    row1.appendChild(playBtn);
    row1.appendChild(saveBtn);
    row1.appendChild(speedSel);

    /* -------------------------
       Row 2 controls: saved recordings selector + play/delete/clear
       ------------------------- */
    const recordingsSelect = document.createElement("select");
    Object.assign(recordingsSelect.style, { width: "170px", height: "30px", borderRadius: "6px", border: "1px solid #ccc", userSelect: "none" });

    const playSelBtn = document.createElement("button");
    playSelBtn.title = "Play selected recording";
    playSelBtn.textContent = "▶";
    Object.assign(playSelBtn.style, { width: "36px", height: "30px", borderRadius: "6px", border: "1px solid #bbb", background: "white", cursor: "pointer", userSelect: "none" });

    const deleteSelBtn = document.createElement("button");
    deleteSelBtn.title = "Delete selected recording";
    deleteSelBtn.textContent = "🗑";
    Object.assign(deleteSelBtn.style, { width: "36px", height: "30px", borderRadius: "6px", border: "1px solid #bbb", background: "white", cursor: "pointer", userSelect: "none" });

    const clearAllBtn = document.createElement("button");
    clearAllBtn.title = "Clear all saved recordings";
    clearAllBtn.textContent = "Clear All";
    Object.assign(clearAllBtn.style, { width: "100px", height: "30px", borderRadius: "6px", background: "linear-gradient(135deg,#FFB3B3,#FF8A8A)", color: "#661111", border: "none", cursor: "pointer", userSelect: "none" });

    row2.appendChild(recordingsSelect);
    row2.appendChild(playSelBtn);
    row2.appendChild(deleteSelBtn);
    row2.appendChild(clearAllBtn);

    container.appendChild(row1);
    container.appendChild(row2);

    /* -------------------------
       Piano (FieldPiano look)
       ------------------------- */
    const pianoWrap = document.createElement("div");
    Object.assign(pianoWrap.style, { width: "520px", display: "flex", justifyContent: "center", marginBottom: "8px", userSelect: "none" });

    const piano = document.createElement("div");
    Object.assign(piano.style, {
      width: "520px",
      height: "120px",
      background: "#ddd",
      borderRadius: "10px",
      display: "flex",
      position: "relative",
      justifyContent: "space-between",
      padding: "5px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
      overflow: "hidden",
      userSelect: "none", // ensure piano container doesn't allow selection
    });

    const gloss = document.createElement("div");
    Object.assign(gloss.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "50px",
      background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))",
      zIndex: "3", pointerEvents: "none"
    });
    piano.appendChild(gloss);

    const WHITE: [string, number][] = [
      ["C4",262],["D4",294],["E4",330],["F4",349],["G4",392],["A4",440],["B4",494],
      ["C5",523],["D5",587],["E5",659],["F5",698],["G5",784],["A5",880],["B5",988]
    ];

    const BLACK: [string, number][] = [
      ["C#4",277],["D#4",311],["F#4",370],["G#4",415],["A#4",466],
      ["C#5",554],["D#5",622],["F#5",740],["G#5",831],["A#5",932]
    ];

    const POS: Record<string, number> = {
      "C#4":27,"D#4":61,"F#4":130,"G#4":164,"A#4":198,
      "C#5":267,"D#5":301,"F#5":370,"G#5":404,"A#5":438
    };

    // Use pointerup/pointercancel for robust clearing (works for mouse/touch/pen)
    let isDown = false;
    document.addEventListener("pointerup", () => (isDown = false));
    document.addEventListener("pointercancel", () => (isDown = false));

    const clearHighlights = () => {
      Array.from(piano.children).forEach((c: any) => {
        if (c === gloss) return;
        c.style.background = c.style.zIndex === "2" ? "#111" : "white";
        c.style.transform = "translateY(0)";
      });
    };

    // White keys build — add userSelect + preventDefault on pointerdown
    WHITE.forEach(([note, freq]) => {
      const key = document.createElement("div");
      Object.assign(key.style, {
        width: "34px",
        height: "100px",
        background: "white",
        border: "1px solid #999",
        borderRadius: "3px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontSize: "11px",
        cursor: "pointer",
        transition: "0.05s",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      });

      key.textContent = note.replace(/\d/, "");
      this.keyEls[note] = key;

      const press = () => {
        clearHighlights();
        key.style.background = "#6EE7B7";
        key.style.transform = "translateY(3px)";
        this.playTone(freq);
        if (this.isRecording) this.recordedNotes.push({ note, freq, time: Date.now() - this.startTime });
      };

      // pointerdown uses event.preventDefault() to stop selection
      // only set isDown when primary button is pressed (buttons & 1)
      key.onpointerdown = (e: PointerEvent) => {
        e.preventDefault();
        if ((e as PointerEvent).buttons & 1) {
          isDown = true;
          press();
        } else {
          // some platforms can fire pointerdown without primary button; don't set isDown
          isDown = false;
        }
      };
      key.onpointerenter = () => { if (isDown) press(); };
      key.onpointerup = () => { key.style.transform = "translateY(0)"; };

      piano.appendChild(key);
    });

    // Black keys — add userSelect + preventDefault on pointerdown
    BLACK.forEach(([note, freq]) => {
      const key = document.createElement("div");
      Object.assign(key.style, {
        width: "22px",
        height: "60px",
        background: "#111",
        border: "1px solid black",
        borderRadius: "3px",
        position: "absolute",
        top: "5px",
        left: `${POS[note]}px`,
        zIndex: "2",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        color: "white",
        fontSize: "10px",
        cursor: "pointer",
        transition: "0.05s",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      });

      key.textContent = note.replace(/\d/, "");
      this.keyEls[note] = key;

      const press = () => {
        clearHighlights();
        key.style.background = "#444";
        key.style.transform = "translateY(2px)";
        this.playTone(freq);
        if (this.isRecording) this.recordedNotes.push({ note, freq, time: Date.now() - this.startTime });
      };

      key.onpointerdown = (e: PointerEvent) => {
        e.preventDefault();
        if ((e as PointerEvent).buttons & 1) {
          isDown = true;
          press();
        } else {
          isDown = false;
        }
      };
      key.onpointerenter = () => { if (isDown) press(); };
      key.onpointerup = () => { key.style.transform = "translateY(0)"; };

      piano.appendChild(key);
    });

    pianoWrap.appendChild(piano);
    container.appendChild(pianoWrap);

    /* -------------------------
       Refresh recordings select
       ------------------------- */
    const refreshSelect = () => {
      recordingsSelect.innerHTML = "";
      if (this.recordedNotes.length) {
        const o = document.createElement("option");
        o.value = "__current__";
        o.textContent = "[Current Recording]";
        recordingsSelect.appendChild(o);
      }
      this.savedRecordings.forEach((r, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = r.name;
        recordingsSelect.appendChild(o);
      });

      const any = recordingsSelect.options.length > 0;
      playSelBtn.disabled = !any;
      playSelBtn.style.opacity = any ? "1" : "0.4";
      deleteSelBtn.disabled = this.savedRecordings.length === 0;
      deleteSelBtn.style.opacity = this.savedRecordings.length ? "1" : "0.4";
      clearAllBtn.disabled = this.savedRecordings.length === 0;
      clearAllBtn.style.opacity = this.savedRecordings.length ? "1" : "0.6";
    };
    refreshSelect();

    /* -------------------------
       Record / Stop behavior
       ------------------------- */
    recBtn.onclick = () => {
      if (!this.isRecording) {
        // start recording → switch to STOP view (white square + text)
        this.isRecording = true;
        this.recordedNotes = [];
        this.startTime = Date.now();

        recBtn.innerHTML = `
          <span style="display:flex;align-items:center;gap:6px;">
            ${this.stopSquareIcon(16)}
            <span>Stop</span>
          </span>
        `;

        recBtn.style.background = "#ff5252";
        recBtn.style.color = "white";
        recBtn.style.border = "1px solid #e04444";
      } else {
        // stop recording → restore RECORD button
        this.isRecording = false;

        recBtn.innerHTML = `${this.recordCameraIcon(16)}<span>Record</span>`;
        recBtn.style.background = "#f2f2f2";
        recBtn.style.color = "#222";
        recBtn.style.border = "1px solid #ccc";

        // normalize times so first note at 0
        const base = this.recordedNotes[0]?.time ?? 0;
        this.recordedNotes = this.recordedNotes.map(n => ({ ...n, time: n.time - base }));

        this.setValue(JSON.stringify({
          recordedNotes: this.recordedNotes,
          savedRecordings: this.savedRecordings,
        }));

        refreshSelect();
      }
    };

    /* -------------------------
       Playback function with abort token
       ------------------------- */
    const playNotes = async (notes: NoteEvent[], speed = Number(speedSel.value)) => {
      // stop any previous playback immediately
      this.playbackAbort.stop = true;

      // new session token
      const session = { stop: false };
      this.playbackAbort = session;

      const sorted = [...notes].sort((a,b) => a.time - b.time);
      const start = Date.now();

      for (const n of sorted) {
        if (session.stop) return;
        const elapsed = Date.now() - start;
        const wait = Math.max(0, (n.time - elapsed) / (isFinite(speed) && speed !== 0 ? speed : 1));
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (session.stop) return;

        // highlight key
        const key = this.keyEls[n.note];
        if (key) {
          const isBlack = key.style.zIndex === "2";
          key.style.background = "#6EE7B7";
          key.style.transform = isBlack ? "translateY(2px)" : "translateY(3px)";
          setTimeout(() => {
            key.style.background = isBlack ? "#111" : "white";
            key.style.transform = "translateY(0)";
          }, Math.max(120, 300 / Math.max(0.001, speed)));
        }

        // play the tone
        this.playTone(n.freq, Math.max(0.12, 0.3 / Math.max(0.001, speed)));
      }
    };

    /* -------------------------
       Play button logic (menu when saved recordings exist)
       ------------------------- */
    playBtn.onclick = (ev) => {
      // immediately stop any running playback (ensures restart)
      this.playbackAbort.stop = true;

      if (!this.recordedNotes.length && !this.savedRecordings.length) return;

      const speed = Number(speedSel.value);

      if (!this.savedRecordings.length) {
        playNotes(this.recordedNotes, speed);
        return;
      }

      // show small menu to pick current or saved
      const menu = document.createElement("div");
      Object.assign(menu.style, {
        position: "absolute",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "6px",
        padding: "8px",
        zIndex: 1000,
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
      });

      if (this.recordedNotes.length) {
        const it = document.createElement("div");
        it.textContent = "Play Current Recording";
        Object.assign(it.style, { padding: "6px 8px", cursor: "pointer", borderRadius: "4px" });
        it.onmouseenter = () => (it.style.background = "#eef5ff");
        it.onmouseleave = () => (it.style.background = "");
        it.onclick = () => { menu.remove(); playNotes(this.recordedNotes, speed); };
        menu.appendChild(it);
      }

      if (this.savedRecordings.length) {
        const head = document.createElement("div");
        head.textContent = "Saved:";
        Object.assign(head.style, { opacity: 0.7, marginTop: "6px", marginBottom: "6px" });
        menu.appendChild(head);

        this.savedRecordings.forEach((r, i) => {
          const it = document.createElement("div");
          it.textContent = r.name;
          Object.assign(it.style, { padding: "6px 8px", cursor: "pointer", borderRadius: "4px" });
          it.onmouseenter = () => (it.style.background = "#eef5ff");
          it.onmouseleave = () => (it.style.background = "");
          it.onclick = () => { menu.remove(); playNotes(r.notes, speed); };
          menu.appendChild(it);
        });
      }

      const cancel = document.createElement("div");
      cancel.textContent = "Cancel";
      Object.assign(cancel.style, { padding: "6px 8px", cursor: "pointer", borderRadius: "4px", textAlign: "center", marginTop: "6px", color: "#666" });
      cancel.onclick = () => menu.remove();
      menu.appendChild(cancel);

      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      const cRect = div.getBoundingClientRect();
      menu.style.left = `${rect.left - cRect.left}px`;
      menu.style.top = `${rect.bottom - cRect.top + 6}px`;

      div.appendChild(menu);
    };

    /* -------------------------
       Save logic — inline name input + info dialog
       ------------------------- */
    saveBtn.onclick = async () => {
      if (!this.recordedNotes.length) {
        await showInfoDialog("No Recording", "There is no recording to save.");
        return;
      }

      // remove existing inline save UI
      const existing = container.querySelector(".mr-save-inline");
      if (existing) existing.remove();

      const wrap = document.createElement("div");
      wrap.className = "mr-save-inline";
      Object.assign(wrap.style, { display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" });

      const input = document.createElement("input");
      Object.assign(input.style, { width: "220px", height: "30px", borderRadius: "6px", border: "1px solid #ccc", padding: "6px" });
      input.placeholder = `Recording ${this.savedRecordings.length + 1}`;

      const ok = document.createElement("button");
      ok.textContent = "OK";
      Object.assign(ok.style, { height: "32px", borderRadius: "6px", cursor: "pointer", userSelect: "none" });

      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      Object.assign(cancel.style, { height: "32px", borderRadius: "6px", cursor: "pointer", userSelect: "none" });

      wrap.appendChild(input);
      wrap.appendChild(ok);
      wrap.appendChild(cancel);
      container.appendChild(wrap);
      input.focus();

      ok.onclick = async () => {
        const name = input.value.trim();
        if (!name) {
          await showInfoDialog("Name required", "Please enter a name for the recording.");
          return;
        }

        this.savedRecordings.push({
          name,
          notes: this.recordedNotes.map(n => ({ ...n })),
        });

        this.setValue(JSON.stringify({
          recordedNotes: this.recordedNotes,
          savedRecordings: this.savedRecordings,
        }));

        wrap.remove();
        refreshSelect();

        await showInfoDialog("Recording saved", `Recording "${name}" saved successfully.`);
      };

      cancel.onclick = () => wrap.remove();
    };

    /* -------------------------
       Play selected saved/current
       ------------------------- */
    playSelBtn.onclick = () => {
      // stop any running playback first
      this.playbackAbort.stop = true;

      const val = recordingsSelect.value;
      const speed = Number(speedSel.value);

      if (val === "__current__") {
        playNotes(this.recordedNotes, speed);
        return;
      }

      const idx = Number(val);
      if (!isNaN(idx) && this.savedRecordings[idx]) playNotes(this.savedRecordings[idx].notes, speed);
    };

    /* -------------------------
       Delete selected (uses confirm dialog)
       ------------------------- */
    deleteSelBtn.onclick = async () => {
      const val = recordingsSelect.value;
      if (!val || val === "__current__") return;

      const idx = Number(val);
      if (isNaN(idx) || !this.savedRecordings[idx]) return;

      const ok = await showConfirmDialog(`Delete "${this.savedRecordings[idx].name}"?`, "Delete", "Cancel");
      if (!ok) return;

      this.savedRecordings.splice(idx, 1);

      this.setValue(JSON.stringify({
        recordedNotes: this.recordedNotes,
        savedRecordings: this.savedRecordings,
      }));

      refreshSelect();
      await showInfoDialog("Deleted", "Recording deleted.");
    };

    /* -------------------------
       Clear all saved recordings (confirm + info)
       ------------------------- */
    clearAllBtn.onclick = async () => {
      if (!this.savedRecordings.length) {
        await showInfoDialog("No saved recordings", "There are no saved recordings to clear.");
        return;
      }

      const ok = await showConfirmDialog("Clear ALL saved recordings?", "Clear All", "Cancel");
      if (!ok) return;

      this.savedRecordings = [];

      this.setValue(JSON.stringify({
        recordedNotes: this.recordedNotes,
        savedRecordings: this.savedRecordings,
      }));

      refreshSelect();
      await showInfoDialog("Cleared", "All recordings have been cleared.");
    };

    /* -------------------------
       Finalize: attach container and show dropdown
       ------------------------- */
    div.appendChild(container);
    Blockly.DropDownDiv.setColour("#fff", "#ccc");
    Blockly.DropDownDiv.showPositionedByField(this);
  }

  /* -----------------------------
     getValue / setValue
     ----------------------------- */
  override getValue() {
    return JSON.stringify({
      recordedNotes: this.recordedNotes,
      savedRecordings: this.savedRecordings,
    });
  }

  override setValue(v: string) {
    try {
      const o = JSON.parse(v);
      this.recordedNotes = o.recordedNotes || [];
      this.savedRecordings = o.savedRecordings || [];
    } catch {
      this.recordedNotes = [];
      this.savedRecordings = [];
    }
  }
}

Blockly.fieldRegistry.register("field_music_recorder", MusicRecorderField);
