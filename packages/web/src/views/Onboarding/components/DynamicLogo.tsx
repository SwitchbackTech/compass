import React, { useEffect } from "react";

export const DynamicLogo = () => {
  useEffect(() => {
    document.addEventListener("DOMContentLoaded", function () {
      (function () {
        const loadElements = function () {
          const container = document.getElementById(
            "ascii-canvas-1753449179897",
          ).parentNode;
          const canvas = document.getElementById("ascii-canvas-1753449179897");
          const ctx = canvas.getContext("2d");
          const sourceMedia = document.getElementById(
            "source-image-1753449179897",
          );
          if (!canvas || !sourceMedia) {
            setTimeout(loadElements, 50);
            return;
          }
          const config = {
            mouseRadius: 50,
            intensity: 3,
            fontSize: 12,
            charSpacing: 0.6,
            lineHeight: 1,
            mousePersistence: 0.97,
            returnSpeed: 0.1,
            returnWhenStill: true,
            enableJiggle: true,
            jiggleIntensity: 0.2,
            detailFactor: 100,
            contrast: 95,
            brightness: 90,
            saturation: 120,
            useTransparentBackground: true,
            backgroundColor: "transparent",
          };
          const charSet = " .:-=+*#%@";
          const colorScheme = (r, g, b, brightness, saturation) => {
            const sat = saturation / 100;
            const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
            const rSat = Math.max(0, Math.min(255, gray + sat * (r - gray)));
            const gSat = Math.max(0, Math.min(255, gray + sat * (g - gray)));
            const bSat = Math.max(0, Math.min(255, gray + sat * (b - gray)));
            return `rgb(${Math.round(rSat)},${Math.round(gSat)},${Math.round(bSat)})`;
          };
          let mouseX = -1000;
          let mouseY = -1000;
          let lastMouseMoveTime = 0;
          let isAnimating = false;
          let chars = [];
          let particles = [];
          let velocities = [];
          let originalPositions = [];
          const isVideo = false;
          function updateCanvasSize() {
            const containerWidth = container.clientWidth || 300;
            const containerHeight = container.clientHeight || 150;
            const mediaRatio = isVideo
              ? sourceMedia.videoHeight / sourceMedia.videoWidth
              : sourceMedia.height / sourceMedia.width;
            let width, height;
            if (containerWidth * mediaRatio <= containerHeight) {
              width = containerWidth;
              height = width * mediaRatio;
            } else {
              height = containerHeight;
              width = height / mediaRatio;
            }
            canvas.width = width;
            canvas.height = height;
            return { width, height };
          }
          function applyContrastAndBrightness(imageData) {
            const contrastPercent = config.contrast;
            const brightnessPercent = config.brightness;
            const data = imageData.data;
            if (contrastPercent === 100 && brightnessPercent === 100)
              return imageData;
            let contrastFactor;
            if (contrastPercent < 100) {
              contrastFactor = contrastPercent / 100;
            } else {
              contrastFactor = 1 + ((contrastPercent - 100) / 100) * 0.8;
            }
            let brightnessFactor;
            if (brightnessPercent < 100) {
              brightnessFactor = (brightnessPercent / 100) * 1.2;
            } else {
              brightnessFactor = 1 + ((brightnessPercent - 100) / 100) * 0.8;
            }
            for (let i = 0; i < data.length; i += 4) {
              let r = data[i];
              let g = data[i + 1];
              let b = data[i + 2];
              if (brightnessPercent !== 100) {
                if (brightnessPercent < 100) {
                  r *= brightnessFactor;
                  g *= brightnessFactor;
                  b *= brightnessFactor;
                } else {
                  r = r + (255 - r) * (brightnessFactor - 1);
                  g = g + (255 - g) * (brightnessFactor - 1);
                  b = b + (255 - b) * (brightnessFactor - 1);
                }
              }
              if (contrastPercent !== 100) {
                r = 128 + contrastFactor * (r - 128);
                g = 128 + contrastFactor * (g - 128);
                b = 128 + contrastFactor * (b - 128);
              }
              data[i] = Math.max(0, Math.min(255, r));
              data[i + 1] = Math.max(0, Math.min(255, g));
              data[i + 2] = Math.max(0, Math.min(255, b));
            }
            return imageData;
          }
          function generateAsciiArt() {
            const dimensions = updateCanvasSize();
            const columns = Math.round(
              Math.max(20, (dimensions.width / 1200) * config.detailFactor * 3),
            );
            const aspectRatio = isVideo
              ? sourceMedia.videoHeight / sourceMedia.videoWidth
              : sourceMedia.height / sourceMedia.width;
            const rows = Math.ceil(columns * aspectRatio);
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = columns;
            tempCanvas.height = rows;
            const tempCtx = tempCanvas.getContext("2d");
            tempCtx.drawImage(sourceMedia, 0, 0, columns, rows);
            let imageData = tempCtx.getImageData(0, 0, columns, rows);
            imageData = applyContrastAndBrightness(imageData);
            tempCtx.putImageData(imageData, 0, 0);
            const fontSizeX = dimensions.width / columns;
            const fontSizeY = fontSizeX * config.lineHeight;
            if (chars.length === 0) {
              chars = [];
              particles = [];
              velocities = [];
              originalPositions = [];
              for (let y = 0; y < rows; y++) {
                for (let x = 0; x < columns; x++) {
                  const posX = x * fontSizeX;
                  const posY = y * fontSizeY;
                  chars.push({ char: " ", x: posX, y: posY, color: "black" });
                  particles.push({ x: posX, y: posY });
                  velocities.push({ x: 0, y: 0 });
                  originalPositions.push({ x: posX, y: posY });
                }
              }
            }
            const pixels = imageData.data;
            for (let y = 0; y < rows; y++) {
              for (let x = 0; x < columns; x++) {
                const index = (y * columns + x) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
                const charIndex = Math.floor(
                  (brightness / 256) * charSet.length,
                );
                const char = charSet[Math.min(charIndex, charSet.length - 1)];
                const color = colorScheme(
                  r,
                  g,
                  b,
                  brightness,
                  config.saturation,
                );
                const charIdx = y * columns + x;
                if (charIdx < chars.length) {
                  chars[charIdx].char = char;
                  chars[charIdx].color = color;
                }
              }
            }
          }
          function animate() {
            if (!isAnimating) return;
            if (isVideo) {
              generateAsciiArt();
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!config.useTransparentBackground) {
              ctx.fillStyle = config.backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.font = `${config.fontSize}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const mouseStillTime = Date.now() - lastMouseMoveTime;
            const mouseIsStill = mouseStillTime > 500;
            for (let i = 0; i < particles.length && i < chars.length; i++) {
              const particle = particles[i];
              const velocity = velocities[i];
              const targetX = originalPositions[i].x;
              const targetY = originalPositions[i].y;
              const dx = particle.x - mouseX;
              const dy = particle.y - mouseY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (
                distance < config.mouseRadius &&
                (!mouseIsStill || !config.returnWhenStill)
              ) {
                const force =
                  (1 - distance / config.mouseRadius) * config.intensity;
                const angle = Math.atan2(dy, dx);
                velocity.x += Math.cos(angle) * force * 0.2;
                velocity.y += Math.sin(angle) * force * 0.2;
              }
              if (config.enableJiggle) {
                velocity.x += (Math.random() - 0.5) * config.jiggleIntensity;
                velocity.y += (Math.random() - 0.5) * config.jiggleIntensity;
              }
              velocity.x *= config.mousePersistence;
              velocity.y *= config.mousePersistence;
              particle.x += velocity.x;
              particle.y += velocity.y;
              const springX = targetX - particle.x;
              const springY = targetY - particle.y;
              particle.x += springX * config.returnSpeed;
              particle.y += springY * config.returnSpeed;
              const charInfo = chars[i];
              ctx.fillStyle = charInfo.color;
              ctx.fillText(charInfo.char, particle.x, particle.y);
            }
            requestAnimationFrame(animate);
          }
          canvas.addEventListener("mousemove", function (e) {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            lastMouseMoveTime = Date.now();
          });
          canvas.addEventListener("mouseleave", function () {
            mouseX = -1000;
            mouseY = -1000;
          });
          function initializeAscii() {
            if (
              (sourceMedia.complete || isVideo) &&
              (isVideo ? sourceMedia.readyState >= 2 : true)
            ) {
              updateCanvasSize();
              generateAsciiArt();
              isAnimating = true;
              animate();
              if (isVideo) sourceMedia.play();
            } else {
              sourceMedia.onload = function () {
                updateCanvasSize();
                generateAsciiArt();
                isAnimating = true;
                animate();
              };
              if (isVideo) {
                sourceMedia.onloadeddata = function () {
                  updateCanvasSize();
                  generateAsciiArt();
                  isAnimating = true;
                  animate();
                  sourceMedia.play();
                };
              }
            }
          }
          window.addEventListener("resize", function () {
            chars = [];
            generateAsciiArt();
          });
          initializeAscii();
        };
        loadElements();
      })();
    });
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      setTimeout(function () {
        const event = document.createEvent("Event");
        event.initEvent("DOMContentLoaded", true, true);
        document.dispatchEvent(event);
      }, 100);
    }
  }, []);

  return (
    <span>
      <span
        style={{
          width: "100%",
          height: "100%",
          margin: "0 auto",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          id="ascii-canvas-1753449179897"
          style={{ display: "block", maxWidth: "100%", maxHeight: "100%" }}
        />
        <img
          id="source-image-1753449179897"
          src="data:image/jpeg;base64,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"
          style={{ display: "none" }}
        />
      </span>
    </span>
  );
};
