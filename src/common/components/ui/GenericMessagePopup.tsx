"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

type MessageType = "success" | "error" | "info" | "warning";

interface MessageState {
  open: boolean;
  text: string;
  type: MessageType;
}

interface MessageContextType {
  showMessage: (text: string, type?: MessageType, durationMs?: number) => void;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const useMessage = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return ctx;
};

export const MessageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [message, setMessage] = useState<MessageState>({
    open: false,
    text: "",
    type: "info",
  });

  const [mounted, setMounted] = useState(false);

  // Set mounted to true after first client render
  useEffect(() => {
    setMounted(true);
  }, []);

  const showMessage = (
    text: string,
    type: MessageType = "info",
    durationMs = 3000
  ) => {
    setMessage({ open: false, text: "", type }); // Close first
    setTimeout(() => {
      setMessage({ open: true, text, type });
      setTimeout(() => {
        setMessage((prev) => ({ ...prev, open: false }));
      }, durationMs);
    }, 10); // Small delay to trigger re-render
  };

  return (
    <MessageContext.Provider value={{ showMessage }}>
      {children}
      {/* Only render portal on client after mount */}
      {mounted && message.open
        ? createPortal(
            <div
              className={`glass-popup fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 max-w-xs font-semibold text-base [text-shadow:_1px_1px_4px_rgba(0,0,0,0.8)]`}
              style={{
                backgroundColor:
                  message.type === "success"
                    ? "rgba(46, 204, 113, 0.9)" // Vibrant green for success
                    : message.type === "error"
                    ? "rgba(231, 76, 60, 0.9)" // Vibrant red for error
                    : message.type === "info"
                    ? "rgba(52, 152, 219, 0.9)" // Soft blue for info
                    : "rgba(241, 196, 15, 0.9)", // Golden yellow for warning
                color: "#fff", // White text for all message types
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow:
                  "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 0 16px rgba(255, 255, 255, 0.2)",
              }}
            >
              {message.text}
            </div>,
            document.body
          )
        : null}
    </MessageContext.Provider>
  );
};