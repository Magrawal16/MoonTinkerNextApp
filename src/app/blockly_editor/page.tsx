"use client";

import BlocklyEditor from "@/blockly_editor/components/BlocklyEditor";
import PythonPreview from "@/blockly_editor/components/PythonPreview";
import DownloadButton from "@/blockly_editor/components/DownloadButton";
import { useState } from "react";

export default function EditorPage() {
    const [pythonCode, setPythonCode] = useState("");

    return (
        <div className="flex h-screen">
            <div className="w-1/2 border-r">
                <BlocklyEditor onCodeChange={setPythonCode} />
            </div>
            <div className="w-1/2 p-4 flex flex-col">
                <h2 className="text-xl font-semibold mb-2">Generated Python Code</h2>
                <PythonPreview code={pythonCode} />
                <DownloadButton code={pythonCode} />
            </div>
        </div>
    );
}