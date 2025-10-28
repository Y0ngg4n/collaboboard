// Whiteboard.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Canvas,
  PencilBrush,
  TPointerEventInfo,
  Point,
  Circle,
  Rect,
  FabricObject,
  util,
} from "fabric";

import Toolbar, { ToolType } from "./Toolbar";

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [tool, setTool] = useState<ToolType>("draw");
  const [zoomPercentage, setZoomPercentage] = useState<number>(100);
  const [brushColor, setBrushColor] = useState<string>("#000000FF");

  const isDragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handlers = useRef<{ [key: string]: any }>({});

  const isDrawingShape = useRef(false);
  const shapeStartPoint = useRef<{ x: number; y: number } | null>(null);
  const currentShape = useRef<FabricObject | null>(null);

  const getFabricColorProps = useCallback((hexA: string) => {
    if (hexA.length === 9) {
      const hex = hexA.substring(0, 7);
      const alphaHex = hexA.substring(7, 9);
      const alpha = parseInt(alphaHex, 16) / 255;
      return {
        fill: hex,
        opacity: alpha,
        stroke: hex,
        strokeOpacity: alpha,
        strokeWidth: 5,
      };
    }
    return {
      fill: hexA,
      opacity: 1,
      stroke: hexA,
      strokeOpacity: 1,
      strokeWidth: 5,
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      isDrawingMode: false,
    });
    setCanvas(fabricCanvas);

    const brush = new PencilBrush(fabricCanvas);
    brush.color = brushColor;
    brush.width = 5;
    fabricCanvas.freeDrawingBrush = brush;

    const resizeCanvas = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth - 20,
        height: window.innerHeight - 70,
      });
      fabricCanvas.requestRenderAll();
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const dot = new Circle({
      radius: 5,
      fill: "red",
      left: fabricCanvas.getWidth() / 2,
      top: fabricCanvas.getHeight() / 2,
      selectable: false,
    });
    fabricCanvas.add(dot);

    const saved = localStorage.getItem("canvasData");
    if (saved) {
      try {
        fabricCanvas.loadFromJSON(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    }

    const saveCanvas = () => {
      localStorage.setItem("canvasData", JSON.stringify(fabricCanvas.toJSON()));
    };
    window.addEventListener("beforeunload", saveCanvas);

    return () => {
      saveCanvas();
      fabricCanvas.dispose();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("beforeunload", saveCanvas);
    };
  }, []);

  useEffect(() => {
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
    }
  }, [canvas, brushColor]);

  const getPointer = useCallback(
    (event: TPointerEventInfo<PointerEvent>): { x: number; y: number } => {
      if (!canvas) return { x: 0, y: 0 };
      const pointer = util.getPointer(event.e, canvas.getElement());
      return { x: pointer.x, y: pointer.y };
    },
    [canvas],
  );

  const getScreenPointer = useCallback(
    (
      event: TPointerEventInfo<PointerEvent | WheelEvent>,
    ): { x: number; y: number } => {
      if (!canvas) return { x: 0, y: 0 };
      return { x: event.e.offsetX, y: event.e.offsetY };
    },
    [canvas],
  );

  const checkBounds = useCallback(
    (event: TPointerEventInfo<PointerEvent>) => {
      if (!canvas || isDrawingShape.current || isDragging.current) return;
      const pointer = getScreenPointer(event);
      let changed = false;
      if (pointer.x > canvas.getWidth() - 50) {
        canvas.set({ width: canvas.getWidth() + 200 });
        changed = true;
      }
      if (pointer.y > canvas.getHeight() - 50) {
        canvas.set({ height: canvas.getHeight() + 200 });
        changed = true;
      }
      if (changed) canvas.requestRenderAll();
    },
    [canvas, getScreenPointer],
  );

  const startPanning = useCallback(
    (event: TPointerEventInfo<PointerEvent>) => {
      if (tool !== "grab" || !canvas) return;
      event.e.preventDefault();

      isDragging.current = true;
      const p = getScreenPointer(event);
      lastPos.current = p;
      canvas.selection = false;
    },
    [tool, canvas, getScreenPointer],
  );

  const panCanvas = useCallback(
    (event: TPointerEventInfo<PointerEvent>) => {
      if (!isDragging.current || !canvas) return;

      const p = getScreenPointer(event);
      const deltaX = p.x - lastPos.current.x;
      const deltaY = p.y - lastPos.current.y;

      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      vpt[4] += deltaX;
      vpt[5] += deltaY;

      canvas.setViewportTransform(vpt);
      canvas.requestRenderAll();
      lastPos.current = p;
    },
    [canvas, getScreenPointer],
  );

  const stopPanning = useCallback(() => {
    isDragging.current = false;
    if (canvas) canvas.selection = true;
  }, [canvas]);

  const handleZoom = useCallback(
    (event: TPointerEventInfo<WheelEvent>) => {
      if (!canvas) return;
      event.e.preventDefault();

      const delta = event.e.deltaY;
      let zoom = canvas.getZoom();

      zoom *= 0.999 ** delta;
      zoom = Math.min(5, Math.max(0.05, zoom));

      canvas.zoomToPoint(new Point(event.e.offsetX, event.e.offsetY), zoom);

      setZoomPercentage(Math.round(zoom * 100));
    },
    [canvas],
  );

  const startShapeDraw = useCallback(
    (event: TPointerEventInfo<PointerEvent>) => {
      if ((tool !== "rect" && tool !== "circle") || !canvas) return;

      const pointer = getPointer(event);
      isDrawingShape.current = true;
      shapeStartPoint.current = pointer;

      const { fill, opacity, strokeWidth } = getFabricColorProps(brushColor);

      let shape: FabricObject;

      if (tool === "rect") {
        shape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: fill,
          opacity: opacity,
          strokeWidth: strokeWidth,
          stroke: fill,
          selectable: true,
        });
      } else {
        shape = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: fill,
          opacity: opacity,
          strokeWidth: strokeWidth,
          stroke: fill,
          selectable: true,
        });
      }

      canvas.add(shape);
      currentShape.current = shape;
    },
    [tool, canvas, brushColor, getPointer, getFabricColorProps],
  );

  const drawShape = useCallback(
    (event: TPointerEventInfo<PointerEvent>) => {
      if (
        !isDrawingShape.current ||
        !canvas ||
        !currentShape.current ||
        !shapeStartPoint.current
      )
        return;

      const pointer = getPointer(event);
      const start = shapeStartPoint.current;
      const current = currentShape.current;

      if (tool === "rect") {
        const rect = current as Rect;
        const left = Math.min(pointer.x, start.x);
        const top = Math.min(pointer.y, start.y);
        const width = Math.abs(pointer.x - start.x);
        const height = Math.abs(pointer.y - start.y);

        rect.set({ left, top, width, height });
      } else if (tool === "circle") {
        const circle = current as Circle;
        const radius =
          Math.sqrt(
            Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2),
          ) / 2;
        const center = {
          x: (start.x + pointer.x) / 2,
          y: (start.y + pointer.y) / 2,
        };

        circle.set({ left: center.x - radius, top: center.y - radius, radius });
      }

      canvas.requestRenderAll();
    },
    [tool, canvas, getPointer],
  );

  const stopShapeDraw = useCallback(() => {
    if (!isDrawingShape.current || !currentShape.current || !canvas) return;

    if (currentShape.current.width! < 2 || currentShape.current.height! < 2) {
      canvas.remove(currentShape.current);
    } else {
      currentShape.current.setCoords();
    }

    isDrawingShape.current = false;
    currentShape.current = null;
    canvas.selection = true;
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    // Remove all existing handlers
    Object.entries(handlers.current).forEach(([name, fn]) =>
      canvas.off(name as any, fn),
    );
    handlers.current = {};

    canvas.isDrawingMode = tool === "draw";
    canvas.defaultCursor = tool === "grab" ? "grab" : "default";

    const selectable = tool === "select";
    canvas.forEachObject((obj) => (obj.selectable = selectable));

    canvas.selection = tool === "select";

    // Always attach zoom and bounds checking
    handlers.current["mouse:move-check"] = checkBounds;
    handlers.current["mouse:wheel"] = handleZoom;
    canvas.on("mouse:move", checkBounds);
    canvas.on("mouse:wheel", handleZoom);

    if (tool === "grab") {
      canvas.on("mouse:down", startPanning);
      canvas.on("mouse:move", panCanvas);
      canvas.on("mouse:up", stopPanning);
      canvas.selection = false;
    } else if (tool === "rect" || tool === "circle") {
      canvas.on("mouse:down", startShapeDraw);
      canvas.on("mouse:move", drawShape);
      canvas.on("mouse:up", stopShapeDraw);
      canvas.selection = false;
    }

    canvas.requestRenderAll();
  }, [
    canvas,
    tool,
    startPanning,
    panCanvas,
    stopPanning,
    checkBounds,
    handleZoom,
    startShapeDraw,
    drawShape,
    stopShapeDraw,
  ]);

  const zoomIn = () => {
    if (!canvas) return;
    const zoom = Math.min(5, canvas.getZoom() * 1.1);
    canvas.zoomToPoint(
      new Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
      zoom,
    );
    setZoomPercentage(Math.round(zoom * 100));
  };

  const zoomOut = () => {
    if (!canvas) return;
    const zoom = Math.max(0.05, canvas.getZoom() / 1.1);
    canvas.zoomToPoint(
      new Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
      zoom,
    );
    setZoomPercentage(Math.round(zoom * 100));
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100">
      <Toolbar
        setTool={setTool}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        activeTool={tool}
      />

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
