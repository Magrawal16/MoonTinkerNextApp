import { SharedBlockDefinition } from "../sharedBlockDefinitions";

export const MUSIC_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "music_play_tone",
    category: "Music",
    blockDefinition: {
      type: "music_play_tone",
      message0: "play tone %1 for %2 beat %3",
      args0: [
        { type: "field_piano", name: "NOTE", value: "262" },
        { type: "field_dropdown", name: "DURATION", options: [["1", "1"],["1/2", "0.5"],["1/4", "0.25"],["1/8", "0.125"],["2", "2"],["4", "4"]] },
        { type: "field_dropdown", name: "MODE", options: [["until done", "until_done"],["in background", "background"],["looping in background", "loop"]] },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Play a tone of specific frequency and duration",
    },
    pythonPattern: /(?:^|\s)(?:await\s+)?music\.play_tone\((\d+),\s*(\d+(?:\.\d+)?)\)/g,
    pythonGenerator: (block) => {
      const freq = block.getFieldValue("NOTE");
      const duration = block.getFieldValue("DURATION");
      const mode = block.getFieldValue("MODE") || "until_done";
      if (mode === "loop") return `music.ring_tone(${freq})\n`;
      return `music.play_tone(${freq}, ${duration})\n`;
    },
    pythonExtractor: (match) => ({ NOTE: match[1], DURATION: match[2], MODE: "until_done" }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_play_tone");
      block.setFieldValue(values.NOTE || "262", "NOTE");
      block.setFieldValue(values.DURATION || "1", "DURATION");
      block.setFieldValue(values.MODE || "until_done", "MODE");
      return block;
    },
  },
  {
    type: "music_ring_tone",
    category: "Music",
    blockDefinition: {
      type: "music_ring_tone",
      message0: "ring tone (Hz) %1",
      args0: [ { type: "field_number", name: "FREQ", value: 262, min: 100, max: 10000 } ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Continuously play a tone at the given frequency",
    },
    pythonPattern: /music\.ring_tone\((\d+)\)/g,
    pythonGenerator: (block) => `music.ring_tone(${block.getFieldValue("FREQ")})\n`,
    pythonExtractor: (match) => ({ FREQ: parseInt(match[1]) }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_ring_tone");
      block.setFieldValue(values.FREQ || 262, "FREQ");
      return block;
    },
  },
  {
    type: "music_rest",
    category: "Music",
    blockDefinition: {
      type: "music_rest",
      message0: "rest for %1 beat",
      args0: [ { type: "field_dropdown", name: "DURATION", options: [["1", "1"],["1/2", "0.5"],["1/4", "0.25"],["1/8", "0.125"],["2", "2"],["4", "4"]] } ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Pause playback for a number of beats",
    },
    pythonPattern: /(?:^|\s)(?:await\s+)?music\.rest\((\d+(?:\.\d+)?)\)/g,
    pythonGenerator: (block) => `music.rest(${block.getFieldValue("DURATION")})\n`,
    pythonExtractor: (match) => ({ DURATION: match[1] }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_rest");
      block.setFieldValue(values.DURATION || "1", "DURATION");
      return block;
    },
  },
  {
    type: "music_record_and_play",
    category: "Music",
    blockDefinition: {
      type: "music_record_and_play",
      message0: "record and play %1",
      args0: [ { type: "field_music_recorder", name: "RECORDER", value: "[]" } ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Record a sequence of notes and play them back",
    },
    pythonPattern: /(?:^|\s)(?:await\s+)?music\.record_and_play\((.*?)\)/g,
    pythonGenerator: (block) => {
      const recorded = block.getFieldValue("RECORDER") || "[]";
      if (recorded === "[]" || recorded.trim() === "") return "# no recorded notes\n";
      return `await music.record_and_play(${recorded})\n`;
    },
    pythonExtractor: (match) => ({ RECORDER: match[1] || "[]" }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_record_and_play");
      block.setFieldValue(values.RECORDER || "[]", "RECORDER");
      return block;
    },
  },
];
