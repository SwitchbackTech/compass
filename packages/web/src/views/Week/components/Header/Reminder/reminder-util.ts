/**
 * Helper function to generate a natural, hand-drawn underline path
 * @param width
 * @returns
 */
export const generateHandDrawnUnderline = (width: number): string => {
  // Create a more natural, hand-drawn underline
  const height = 10;
  const baseY = height / 2;

  // Start with a slight offset for a more natural look
  let path = `M${Math.random() * 5},${baseY + (Math.random() * 4 - 2)}`;

  // Create the main underline with natural variations
  const mainLineWidth = width * 0.95; // Cover most of the width
  const mainLineEnd = mainLineWidth - Math.random() * 10;

  // Add some natural curve to the main line
  const cp1x = mainLineWidth * 0.3 + (Math.random() * 20 - 10);
  const cp1y = baseY + (Math.random() * 6 - 3);
  const cp2x = mainLineWidth * 0.7 + (Math.random() * 20 - 10);
  const cp2y = baseY + (Math.random() * 6 - 3);

  path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${mainLineEnd},${baseY + (Math.random() * 4 - 2)}`;

  // Randomly decide if we should add a second stroke
  if (Math.random() > 0.3) {
    // Add a second stroke that overlaps with the first one
    const secondLineStart = Math.max(
      0,
      mainLineWidth * 0.1 - Math.random() * 20,
    );
    const secondLineEnd = Math.min(
      width,
      mainLineWidth * 0.8 + Math.random() * 30,
    );

    path += ` M${secondLineStart},${baseY + (Math.random() * 6 - 1)}`;

    const cp3x =
      secondLineStart +
      (secondLineEnd - secondLineStart) * 0.3 +
      (Math.random() * 20 - 10);
    const cp3y = baseY + (Math.random() * 8 - 2);
    const cp4x =
      secondLineStart +
      (secondLineEnd - secondLineStart) * 0.7 +
      (Math.random() * 20 - 10);
    const cp4y = baseY + (Math.random() * 8 - 2);

    path += ` C${cp3x},${cp3y} ${cp4x},${cp4y} ${secondLineEnd},${baseY + (Math.random() * 6 - 1)}`;
  }

  return path;
};
