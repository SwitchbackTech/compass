import React, { useEffect, useRef, useState } from "react";

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
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      // Check if there's enough space to the right of the ellipse
      // Consider the container width and position with more generous margin
      const availableSpaceToRight = window.innerWidth - (x + width + 40);
      const textWidth = 180; // Increased approximate width of "pretend we're here" text
      setIsNarrowScreen(availableSpaceToRight < textWidth);
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);

    return () => {
      window.removeEventListener("resize", checkScreenWidth);
    };
  }, [x, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a simple ellipse around the week
    const startX = 5;
    const startY = 5;
    const centerX = startX + width / 2;
    const centerY = startY + height / 2;
    const radiusX = (width - 10) / 2;
    const radiusY = (height - 10) / 2;

    // Draw simple ellipse
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

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

    // Draw "pretend we're here" text with responsive positioning
    ctx.font = "18px Caveat, cursive";
    ctx.fillStyle = color;

    let pretendTextX: number;
    let pretendTextY: number;

    if (isNarrowScreen) {
      // Position text underneath the entire month widget when screen is narrow
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      pretendTextX = startX + width / 2; // Centered horizontally with ellipse
      // Position well below the ellipse to clear the entire month widget
      // The month widget extends below the ellipse, so we need more space
      pretendTextY = startY + height + 60; // Well below the month widget
    } else {
      // Position text to the right of the ellipse when there's space
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      pretendTextX = startX + width + 15; // To the right of the ellipse
      pretendTextY = startY + height / 2; // Vertically centered with ellipse
    }

    ctx.fillText("pretend we're here", pretendTextX, pretendTextY);
  }, [x, y, width, height, color, strokeWidth, text, isNarrowScreen]);

  // Calculate canvas dimensions based on text positioning
  const canvasWidth = isNarrowScreen ? width + 10 : width + 180;
  const canvasHeight = isNarrowScreen ? height + 90 : height + 30;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
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
