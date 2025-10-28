import React from "react";
import FloatingPanelComponent from "./components/floatingpanel";

interface ToolbarProps {
  setTool: (tool: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ setTool }) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md">
      <button
        onClick={() => setTool("draw")}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
      >
        Draw
      </button>
      <button
        onClick={() => setTool("select")}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
      >
        Select
      </button>
      <button
        onClick={() => setTool("grab")}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors font-medium"
      >
        Grab
      </button>

      <FloatingPanelComponent
        triggerText="Pick color"
        triggerClasses="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
      />
    </div>
  );
};

export default Toolbar;
