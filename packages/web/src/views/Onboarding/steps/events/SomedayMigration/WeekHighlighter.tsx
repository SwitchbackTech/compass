import React, { useEffect, useRef } from "react";
import rough from "roughjs";

interface WeekHighlighterProps {
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

export const WeekHighlighter: React.FC<WeekHighlighterProps> = ({
  x,
  y,
  width = 280,
  height = 40,
  color = "#ff6b6b",
  strokeWidth = 3,
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

    // Draw a hand-drawn ellipse around the week
    const startX = 5;
    const startY = 5;

    // Draw ellipse around the current week
    const ellipse = rc.ellipse(
      startX + width / 2, // center x
      startY + height / 2, // center y
      width - 10, // width with padding
      height - 10, // height with padding
      {
        stroke: color,
        strokeWidth,
        fill: "none",
        roughness: 1.5,
        bowing: 2,
      },
    );

    // Draw the ellipse
    rc.draw(ellipse);

    // Draw text if provided
    if (text) {
      ctx.font = "18px Caveat, cursive";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Position text at the top of the ellipse
      const textX = startX + width / 2;
      const textY = startY - 15; // Above the ellipse

      ctx.fillText(text, textX, textY);
    }
  }, [x, y, width, height, color, strokeWidth, text]);

  return (
    <canvas
      ref={canvasRef}
      width={width + 10}
      height={height + 30} // Extra height for text above
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
