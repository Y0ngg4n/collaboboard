"use client";
import { FloatingPanel } from "@ark-ui/react/floating-panel";
import { Portal } from "@ark-ui/react/portal";
import { ArrowDownLeft, Maximize2, Minus, XIcon } from "lucide-react";
import ColorPickerComponent from "./colorpicker";

interface FloatingPanelProps {
  triggerText: string;
  triggerClasses?: string;
}

const FloatingPanelComponent: React.FC<FloatingPanelProps> = ({
  triggerText,
  triggerClasses = "",
}) => {
  return (
    <FloatingPanel.Root
      getAnchorPosition={({ triggerRect }) => {
        if (!triggerRect) return { x: 0, y: 0 };
        return {
          x: triggerRect.x,
          y: triggerRect.y + triggerRect.height,
        };
      }}
    >
      <FloatingPanel.Trigger
        className={`px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition ${triggerClasses}`}
      >
        {triggerText}
      </FloatingPanel.Trigger>
      <Portal>
        <FloatingPanel.Positioner className="z-50">
          <FloatingPanel.Content className="bg-background/90 dark:bg-zinc-900/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[500px] max-w-[90vw]">
            <FloatingPanel.DragTrigger>
              <FloatingPanel.Header className="flex items-center justify-between p-3 border-b border-border cursor-move bg-muted/50">
                <FloatingPanel.Title className="font-semibold text-sm">
                  Floating Color Picker
                </FloatingPanel.Title>
                <FloatingPanel.Control className="flex items-center gap-2 text-muted-foreground">
                  <FloatingPanel.StageTrigger stage="minimized">
                    <Minus className="w-4 h-4" />
                  </FloatingPanel.StageTrigger>
                  <FloatingPanel.StageTrigger stage="maximized">
                    <Maximize2 className="w-4 h-4" />
                  </FloatingPanel.StageTrigger>
                  <FloatingPanel.StageTrigger stage="default">
                    <ArrowDownLeft className="w-4 h-4" />
                  </FloatingPanel.StageTrigger>
                  <FloatingPanel.CloseTrigger>
                    <XIcon className="w-4 h-4" />
                  </FloatingPanel.CloseTrigger>
                </FloatingPanel.Control>
              </FloatingPanel.Header>
            </FloatingPanel.DragTrigger>

            <FloatingPanel.Body className="p-4">
              <ColorPickerComponent />
            </FloatingPanel.Body>

            {/* Resize Handles */}
            <FloatingPanel.ResizeTrigger axis="n" />
            <FloatingPanel.ResizeTrigger axis="e" />
            <FloatingPanel.ResizeTrigger axis="w" />
            <FloatingPanel.ResizeTrigger axis="s" />
            <FloatingPanel.ResizeTrigger axis="ne" />
            <FloatingPanel.ResizeTrigger axis="se" />
            <FloatingPanel.ResizeTrigger axis="sw" />
            <FloatingPanel.ResizeTrigger axis="nw" />
          </FloatingPanel.Content>
        </FloatingPanel.Positioner>
      </Portal>
    </FloatingPanel.Root>
  );
};

export default FloatingPanelComponent;
