"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Circle, FabricObject, Point, PencilBrush } from "fabric";
import Toolbar from "./Toolbar";

interface MouseEvent {
  e: any;
}

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [tool, setTool] = useState<string>("draw");
  const [zoomPercentage, setZoomPercentage] = useState<number>(100);
  const isDragging = useRef<boolean>(false);
  const lastPosX = useRef<number>(0);
  const lastPosY = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      isDrawingMode: false,
    });
    setCanvas(fabricCanvas);
    if (!fabricCanvas.freeDrawingBrush) {
      // You might need to cast `fabricCanvas` to `any` or extend the Fabric types
      // if Typescript complains that PencilBrush isn't compatible with freeDrawingBrush.
      fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    }
    fabricCanvas.freeDrawingBrush!.color = "#000000"; // Black color
    fabricCanvas.freeDrawingBrush!.width = 5; // 5px wide line
    const resizeCanvas = () => {
      fabricCanvas.setWidth(window.innerWidth - 20);
      fabricCanvas.setHeight(window.innerHeight - 70);
      fabricCanvas.renderAll();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Add a dot in the center of the canvas
    const dot = new Circle({
      radius: 5,
      fill: "red",
      left: fabricCanvas.getWidth() / 2,
      top: fabricCanvas.getHeight() / 2,
      selectable: false,
    });
    fabricCanvas.add(dot);

    // Load canvas data from local storage
    const savedCanvasData = localStorage.getItem("canvasData");
    if (savedCanvasData) {
      try {
        fabricCanvas.loadFromJSON(savedCanvasData, () => {
          fabricCanvas.renderAll();
        });
      } catch (error) {
        console.error("Failed to load canvas data:", error);
      }
    }

    // Save canvas data to local storage before unload
    const saveCanvasData = () => {
      try {
        const jsonData = fabricCanvas.toJSON();
        localStorage.setItem("canvasData", JSON.stringify(jsonData));
      } catch (error) {
        console.error("Failed to save canvas data:", error);
      }
    };
    window.addEventListener("beforeunload", saveCanvasData);

    return () => {
      saveCanvasData();
      fabricCanvas.dispose();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("beforeunload", saveCanvasData);
    };
  }, []);

  const checkCanvasBounds = useCallback(
    (e: MouseEvent) => {
      if (!canvas) return;

      const pointer = canvas.getPointer(e.e);
      const buffer = 50;
      let needsUpdate = false;

      const currentWidth = canvas.getWidth();
      const currentHeight = canvas.getHeight();

      if (pointer.x > currentWidth - buffer) {
        canvas.setWidth(currentWidth + 200);
        needsUpdate = true;
      }
      if (pointer.y > currentHeight - buffer) {
        canvas.setHeight(currentHeight + 200);
        needsUpdate = true;
      }

      if (needsUpdate) {
        canvas.renderAll();
      }
    },
    [canvas],
  );

  const startPanning = useCallback(
    (opt: MouseEvent) => {
      if (tool === "grab") {
        const evt = opt.e;
        isDragging.current = true;
        lastPosX.current = evt.clientX;
        lastPosY.current = evt.clientY;
      }
    },
    [tool],
  );

  const panCanvas = useCallback(
    (opt: MouseEvent) => {
      if (isDragging.current && canvas) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX.current;
          vpt[5] += e.clientY - lastPosY.current;
          canvas.requestRenderAll();
          lastPosX.current = e.clientX;
          lastPosY.current = e.clientY;
        }
      }
    },
    [canvas],
  );

  const stopPanning = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleZoom = useCallback(
    (opt: MouseEvent) => {
      if (!canvas) return;

      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom = zoom + delta / 200;
      zoom = Math.max(0.05, zoom);
      zoom = Math.min(5, zoom);

      const point = new Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, zoom);
      setZoomPercentage(Math.round(zoom * 100));
      opt.e.preventDefault();
      opt.e.stopPropagation();
    },
    [canvas],
  );

  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = tool === "draw";

    // Remove all event listeners first (using the non-deprecated method)
    canvas.__eventListeners = canvas.__eventListeners || {};
    canvas.__eventListeners["mouse:down"] = [];
    canvas.__eventListeners["mouse:move"] = [];
    canvas.__eventListeners["mouse:up"] = [];
    canvas.__eventListeners["mouse:wheel"] = [];

    if (tool === "select") {
      canvas.selection = true;
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = true;
      });
    } else if (tool === "grab") {
      canvas.selection = false;
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
      });

      canvas.on("mouse:down", startPanning);
      canvas.on("mouse:move", panCanvas);
      canvas.on("mouse:up", stopPanning);
    } else {
      canvas.selection = false;
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
      });
    }

    canvas.on("mouse:move", checkCanvasBounds);
    canvas.on("mouse:wheel", handleZoom);
  }, [
    canvas,
    tool,
    startPanning,
    panCanvas,
    stopPanning,
    checkCanvasBounds,
    handleZoom,
  ]);

  const zoomIn = () => {
    if (!canvas) return;
    let zoom = canvas.getZoom();
    zoom = Math.min(5, zoom * 1.1);
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const point = new Point(centerX, centerY);
    canvas.zoomToPoint(point, zoom);
    setZoomPercentage(Math.round(zoom * 100));
  };

  const zoomOut = () => {
    if (!canvas) return;
    let zoom = canvas.getZoom();
    zoom = Math.max(0.05, zoom / 1.1);
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const point = new Point(centerX, centerY);
    canvas.zoomToPoint(point, zoom);
    setZoomPercentage(Math.round(zoom * 100));
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100">
      <Toolbar setTool={setTool} />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md">
        <button
          onClick={zoomIn}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Zoom In
        </button>
        <button
          onClick={zoomOut}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Zoom Out
        </button>
        <span className="text-sm font-medium text-gray-700">
          Zoom: {zoomPercentage}%
        </span>
      </div>
      <canvas ref={canvasRef} className="border border-gray-300" />
    </div>
  );
};

export default Whiteboard;
