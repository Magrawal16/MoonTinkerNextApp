import { SharedBlockDefinition } from "../sharedBlockDefinitions";

export const MATHS_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "math_random_int",
    category: "Maths",
    blockDefinition: {
      type: "math_random_int",
      message0: "pick random %1 to %2",
      args0: [
        { type: "input_value", name: "FROM", check: "Number" },
        { type: "input_value", name: "TO", check: "Number" },
      ],
      inputsInline: true,
      output: "Number",
      tooltip: "Return a random integer between the two specified values (inclusive)",
    },
    pythonPattern: /random\.randint\((-?\d+),\s*(-?\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const from = generator.valueToCode(block, "FROM", (generator as any).ORDER_NONE) || "0";
      const to = generator.valueToCode(block, "TO", (generator as any).ORDER_NONE) || "10";
      return [`random.randint(${from}, ${to})`, (generator as any).ORDER_FUNCTION_CALL || 0];
    },
    pythonExtractor: (match) => ({ FROM: parseInt(match[1]), TO: parseInt(match[2]) }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("math_random_int");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      // Attach number shadows similar to original
      try {
        const attach = (name: string, val: number) => {
          const num = workspace.newBlock("math_number");
          (num as any).setShadow(true);
          (num as any).setFieldValue(String(Number.isFinite(val) ? val : 0), "NUM");
          if ((num as any).initSvg) (num as any).initSvg();
          if ((num as any).render) (num as any).render();
          const input = block.getInput(name);
          input?.connection?.connect((num as any).outputConnection);
        };
        attach("FROM", Number.isFinite(values.FROM) ? values.FROM : 0);
        attach("TO", Number.isFinite(values.TO) ? values.TO : 10);
      } catch {}
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
];
