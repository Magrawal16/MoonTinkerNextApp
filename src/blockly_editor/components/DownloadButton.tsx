// src/app/editor/components/DownloadButton.tsx
"use client";

export default function DownloadButton({ code }: { code: string }) {
    const handleDownload = () => {
        const blob = new Blob([code], { type: "text/x-python" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "microbit_program.py";
        link.href = url;
        link.click();
    };

    return (
        <button
            onClick={handleDownload}
            className="mt-4 self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
            Download .py File
        </button>
    );
}
