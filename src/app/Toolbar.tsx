// Toolbar.tsx
"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ColorPickerComponent from "./components/ColorPickerComponent";

import { Pencil, MousePointer2, Hand, Square, Circle } from "lucide-react";

export type ToolType = "draw" | "select" | "grab" | "rect" | "circle";

interface ToolbarProps {
  setTool: (tool: ToolType) => void;
  brushColor: string;
  setBrushColor: (hex: string) => void;
  activeTool: ToolType;
}

const Toolbar: React.FC<ToolbarProps> = ({
  setTool,
  brushColor,
  setBrushColor,
  activeTool,
}) => {
  const ToolButton: React.FC<{
    tool: ToolType;
    icon: React.ReactNode;
    label: string;
  }> = ({ tool, icon, label }) => (
    <button
      onClick={() => setTool(tool)}
      className={`p-2 rounded-md transition-colors ${
        activeTool === tool
          ? "bg-gray-200 text-gray-900 shadow-inner"
          : "bg-white text-gray-600 hover:bg-gray-100"
      } flex items-center justify-center`}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white px-3 py-2 rounded-xl shadow-xl border border-gray-200">
      {/* Primary Interaction Tools */}
      <ToolButton
        tool="draw"
        icon={<Pencil size={20} />}
        label="Draw (Pencil)"
      />
      <ToolButton
        tool="select"
        icon={<MousePointer2 size={20} />}
        label="Select"
      />
      <ToolButton tool="grab" icon={<Hand size={20} />} label="Grab/Pan" />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Shape Drawing Tools */}
      <ToolButton
        tool="rect"
        icon={<Square size={20} />}
        label="Draw Rectangle"
      />
      <ToolButton
        tool="circle"
        icon={<Circle size={20} />}
        label="Draw Circle"
      />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Color Picker Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            style={{ backgroundColor: brushColor }}
            className="w-8 h-8 rounded-full border-2 border-white ring-2 ring-gray-300 shadow-md hover:scale-105 transition-transform"
            title="Brush Color"
          />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 border-none shadow-xl">
          <ColorPickerComponent color={brushColor} onChange={setBrushColor} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default Toolbar;
