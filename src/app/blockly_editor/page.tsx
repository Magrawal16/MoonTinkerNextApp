'use client';

import BlocklyEditor from "@/blockly_editor/components/BlocklyEditor";

// import dynamic from "next/dynamic";

// const CircuitCanvas = dynamic(() => import('@/circuit_canvas/components/core/CircuitCanvas'), {
//   ssr: false,
// });


export default function Page() {
    return <BlocklyEditor />;
}
