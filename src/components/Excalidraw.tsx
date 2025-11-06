"use client";
import dynamic from "next/dynamic";

// Dynamic imports for Excalidraw components
export const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);
