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

    // Draw a hand-drawn arrow pointing to the right
    // Draw within canvas coordinates (starting from 5,5 to leave some padding)
    const startX = 5;
    const startY = 5;

    // Arrow body (line)
    const arrowBody = rc.line(
      startX,
      startY + height / 2,
      startX + width * 0.7,
      startY + height / 2,
      {
        stroke: color,
        strokeWidth,
        roughness: 1.5,
        bowing: 2,
      },
    );

    // Arrow head (triangle)
    const arrowHead = rc.polygon(
      [
        [startX + width * 0.7, startY + height / 2],
        [startX + width, startY],
        [startX + width, startY + height],
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
      startX + width * 0.1,
      startY + height / 2 - 3,
      startX + width * 0.3,
      startY + height / 2 - 1,
      {
        stroke: color,
        strokeWidth: 1,
        roughness: 2,
        bowing: 3,
      },
    );

    const wiggle2 = rc.line(
      startX + width * 0.2,
      startY + height / 2 + 3,
      startX + width * 0.4,
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
        zIndex: 10,
        cursor: onClick ? "pointer" : "default",
      }}
    />
  );
};
