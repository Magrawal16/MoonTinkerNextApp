// src/app/editor/components/PythonPreview.tsx
"use client";

export default function PythonPreview({ code }: { code: string }) {
    return (
        <textarea
            readOnly
            value={code}
            className="flex-grow w-full border rounded bg-gray-100 p-2 font-mono text-sm"
        />
    );
}
