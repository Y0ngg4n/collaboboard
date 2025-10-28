"use client";
import { motion } from "framer-motion";
import { Pipette, Palette } from "lucide-react";
import { ColorPicker, parseColor } from "@ark-ui/react/color-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ColorPickerComponent() {
  return (
    <Card className="w-full max-w-md mx-auto p-4 bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-2xl">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Choose a Color
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ColorPicker.Root defaultValue={parseColor("#eb5e41")}>
          <div className="space-y-4">
            {/* Inputs Row */}
            <ColorPicker.Control className="flex items-center gap-2">
              <div className="flex items-center gap-2 border rounded-lg p-2 w-full bg-muted/50">
                <ColorPicker.ChannelInput
                  channel="hex"
                  className="w-24 bg-transparent border-none text-sm outline-none"
                />
                <ColorPicker.ChannelInput
                  channel="alpha"
                  className="w-16 bg-transparent border-none text-sm outline-none"
                />
                <ColorPicker.ValueText className="text-sm text-muted-foreground" />
                <ColorPicker.Trigger className="ml-auto cursor-pointer">
                  <ColorPicker.TransparencyGrid className="rounded-lg" />
                  <ColorPicker.ValueSwatch className="w-8 h-8 rounded-lg border shadow-sm" />
                </ColorPicker.Trigger>
              </div>
            </ColorPicker.Control>

            {/* Popover */}
            <ColorPicker.Positioner>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ColorPicker.Content className="p-4 bg-card/90 rounded-xl shadow-xl border space-y-4 backdrop-blur">
                  {/* Format Toggle */}
                  <div className="flex items-center justify-between">
                    <ColorPicker.FormatTrigger asChild>
                      <Button variant="outline" size="sm">
                        Toggle Format
                      </Button>
                    </ColorPicker.FormatTrigger>
                    <ColorPicker.FormatSelect className="text-sm" />
                  </div>

                  <div className="relative w-full h-60 rounded-lg overflow-hidden">
                    <ColorPicker.Area className="absolute inset-0">
                      <ColorPicker.AreaBackground
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: `linear-gradient(to right, #fff, hsl(0, 100%, 50%)),
                     linear-gradient(to top, #000, transparent)`,
                        }}
                      />
                      <ColorPicker.AreaThumb className="w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none" />
                    </ColorPicker.Area>
                  </div>

                  {/* Hue + Alpha Sliders */}
                  <div className="space-y-2">
                    <ColorPicker.ChannelSlider
                      channel="hue"
                      className="relative h-2 rounded-full overflow-hidden cursor-pointer"
                    >
                      <ColorPicker.ChannelSliderTrack className="absolute inset-0 rounded-full" />
                      <ColorPicker.ChannelSliderThumb className="w-4 h-4 rounded-full border-2 border-white shadow absolute top-1/2 -translate-y-1/2" />
                    </ColorPicker.ChannelSlider>

                    <ColorPicker.ChannelSlider
                      channel="alpha"
                      className="relative h-2 rounded-full overflow-hidden cursor-pointer"
                    >
                      <ColorPicker.TransparencyGrid className="absolute inset-0" />
                      <ColorPicker.ChannelSliderTrack className="absolute inset-0 rounded-full" />
                      <ColorPicker.ChannelSliderThumb className="w-4 h-4 rounded-full border-2 border-white shadow absolute top-1/2 -translate-y-1/2" />
                    </ColorPicker.ChannelSlider>
                  </div>

                  {/* Swatches + Eyedropper */}
                  <div className="flex items-center gap-3 justify-between">
                    <ColorPicker.SwatchGroup className="flex gap-2">
                      {[
                        "#ef4444",
                        "#3b82f6",
                        "#22c55e",
                        "#facc15",
                        "#a855f7",
                      ].map((color) => (
                        <ColorPicker.SwatchTrigger key={color} value={color}>
                          <ColorPicker.Swatch
                            value={color}
                            className="w-6 h-6 rounded-full border hover:scale-105 transition-transform"
                          >
                            <ColorPicker.SwatchIndicator>
                              ✓
                            </ColorPicker.SwatchIndicator>
                          </ColorPicker.Swatch>
                        </ColorPicker.SwatchTrigger>
                      ))}
                    </ColorPicker.SwatchGroup>

                    <ColorPicker.EyeDropperTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Pipette className="w-4 h-4" />
                      </Button>
                    </ColorPicker.EyeDropperTrigger>
                  </div>
                </ColorPicker.Content>
              </motion.div>
            </ColorPicker.Positioner>

            <ColorPicker.HiddenInput />
          </div>
        </ColorPicker.Root>
      </CardContent>
    </Card>
  );
}
