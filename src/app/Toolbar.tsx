// Toolbar.tsx
"use client";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ColorPickerComponent from "./components/ColorPickerComponent";
import {
  Pencil,
  MousePointer2,
  Hand,
  Square,
  Circle,
  Eraser,
  Trash2,
} from "lucide-react";

export type ToolType =
  | "draw"
  | "select"
  | "grab"
  | "rect"
  | "circle"
  | "eraser";

interface ToolbarProps {
  setTool: (tool: ToolType) => void;
  brushColor: string;
  setBrushColor: (hex: string) => void;
  activeTool: ToolType;
  fillShapes: boolean;
  setFillShapes: (fill: boolean) => void;
  onClearCanvas: () => void;
  eraserMode: "draw" | "object";
  setEraserMode: (mode: "draw" | "object") => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  setTool,
  brushColor,
  setBrushColor,
  activeTool,
  fillShapes,
  setFillShapes,
  onClearCanvas,
  eraserMode,
  setEraserMode,
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
      <ToolButton tool="eraser" icon={<Eraser size={20} />} label="Eraser" />
      <ToolButton
        tool="select"
        icon={<MousePointer2 size={20} />}
        label="Select"
      />
      <ToolButton tool="grab" icon={<Hand size={20} />} label="Grab/Pan" />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Eraser Mode Toggle - only show when eraser is active */}
      {activeTool === "eraser" && (
        <>
          <button
            onClick={() =>
              setEraserMode(eraserMode === "draw" ? "object" : "draw")
            }
            className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              eraserMode === "draw"
                ? "bg-purple-500 text-white"
                : "bg-orange-500 text-white"
            }`}
            title="Toggle Eraser Mode"
          >
            {eraserMode === "draw" ? "Draw Erase" : "Object Erase"}
          </button>
        </>
      )}

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

      {/* Fill Toggle - only show when rect or circle is active */}
      {(activeTool === "rect" || activeTool === "circle") && (
        <>
          <button
            onClick={() => setFillShapes(!fillShapes)}
            className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              fillShapes
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
            title="Toggle Fill"
          >
            {fillShapes ? "Filled" : "Outline"}
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
        </>
      )}

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

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Clear All Button */}
      <button
        onClick={onClearCanvas}
        className="p-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
        title="Clear All"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

export default Toolbar;
