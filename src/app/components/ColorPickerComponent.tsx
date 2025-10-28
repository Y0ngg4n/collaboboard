"use client";
import React, { useEffect, useState } from "react";
import { HexAlphaColorPicker } from "react-colorful";

interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
}

export default function ColorPickerComponent({
  color,
  onChange,
}: ColorPickerProps) {
  const normalizedInitialColor =
    color && color.length >= 7 ? color.toUpperCase() : "#000000FF";

  const [hexA, setHexA] = useState<string>(normalizedInitialColor);

  useEffect(() => {
    if (color.toUpperCase() !== hexA) {
      setHexA(color.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const handleColorChange = (newHex: string) => {
    const capitalizedHex = newHex.toUpperCase();

    setHexA(capitalizedHex);
    onChange(capitalizedHex);
  };

  const handleHexClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  return (
    <div className="max-w-sm rounded-md border bg-background p-4 shadow-md flex flex-col items-center">
      <HexAlphaColorPicker
        color={hexA}
        onChange={handleColorChange}
        className="w-full"
      />

      <div className="flex items-center gap-2 mt-4 w-full">
        <input
          type="text"
          value={hexA}
          readOnly
          onClick={handleHexClick}
          className="w-full text-center p-2 border border-gray-300 rounded-md font-mono text-sm cursor-copy select-all focus:ring-2 focus:ring-blue-500"
          title="Click to select and copy"
        />
      </div>
    </div>
  );
}
