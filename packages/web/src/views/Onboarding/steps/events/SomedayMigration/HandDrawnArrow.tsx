import React, { useEffect, useRef } from "react";
import rough from "roughjs";

interface HandDrawnArrowProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  onClick?: () => void;
  text?: string;
}

export const HandDrawnArrow: React.FC<HandDrawnArrowProps> = ({
  x,
  y,
  width = 40,
  height = 20,
  color = "#ff6b6b",
  strokeWidth = 2,
  className,
  onClick,
  text,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create rough.js instance
    const rc = rough.canvas(canvas);

    // Draw a hand-drawn arrow pointing to the left with text on the right side
    const startX = 8;
    const startY = 8;

    // Calculate arrow dimensions (arrow takes up about 60% of width, text takes the rest)
    const arrowWidth = width * 0.9;
    const textAreaWidth = width * 0.1;

    // Arrow body (line) - pointing left, so starts from right and goes left
    const arrowBody = rc.line(
      startX + textAreaWidth + arrowWidth * 0.3, // Start from right side of arrow area
      startY + height / 2,
      startX + textAreaWidth, // End at left side of arrow area (tip area)
      startY + height / 2,
      {
        stroke: color,
        strokeWidth,
        roughness: 1.5,
        bowing: 2,
      },
    );

    // Arrow head (smaller triangle pointing left)
    const tipSize = height * 0.3; // Smaller tip
    const arrowHead = rc.polygon(
      [
        [startX + textAreaWidth, startY + height / 2], // Left point (tip)
        [startX + textAreaWidth + tipSize, startY + height / 2 - tipSize / 2], // Top right
        [startX + textAreaWidth + tipSize, startY + height / 2 + tipSize / 2], // Bottom right
      ],
      {
        stroke: color,
        strokeWidth,
        fill: color,
        fillStyle: "solid",
        roughness: 1.2,
        bowing: 1,
      },
    );

    // Add some wiggly details to make it more hand-drawn
    const wiggle1 = rc.line(
      startX + textAreaWidth + arrowWidth * 0.4,
      startY + height / 2 - 3,
      startX + textAreaWidth + arrowWidth * 0.6,
      startY + height / 2 - 1,
      {
        stroke: color,
        strokeWidth: 1,
        roughness: 2,
        bowing: 3,
      },
    );

    const wiggle2 = rc.line(
      startX + textAreaWidth + arrowWidth * 0.5,
      startY + height / 2 + 3,
      startX + textAreaWidth + arrowWidth * 0.7,
      startY + height / 2 + 1,
      {
        stroke: color,
        strokeWidth: 1,
        roughness: 2,
        bowing: 3,
      },
    );

    // Draw all elements
    rc.draw(arrowBody);
    rc.draw(arrowHead);
    rc.draw(wiggle1);
    rc.draw(wiggle2);

    // Draw text if provided
    if (text) {
      ctx.font = "148px Caveat, cursive";
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Position text at the far right end, beyond the arrow body
      const textX = startX + textAreaWidth + arrowWidth + 10; // 10px gap after arrow
      const textY = startY + height / 2;

      ctx.fillText(text, textX, textY);
    }
  }, [x, y, width, height, color, strokeWidth]);

  return (
    <canvas
      ref={canvasRef}
      width={width + 10}
      height={height + 10}
      className={className}
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: "auto",
        zIndex: 100,
        cursor: onClick ? "pointer" : "default",
      }}
    />
  );
};
