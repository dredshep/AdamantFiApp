type HexColor = `#${string}${string}${string}${string}${string}${string}`;

export default function toRgba(hex: HexColor, opacity: number): string {
  // Ensure hex is correctly formatted (runtime check for correct hexadecimal format)
  if (!/^#[A-Fa-f0-9]{6}$/.test(hex)) {
    throw new Error("Hex must be a # followed by a 6-character hexadecimal string.");
  }

  // Remove the hash at the start
  const hexWithoutHash = hex.substring(1);

  // Parse the hex color string
  let r = parseInt(hexWithoutHash.substring(0, 2), 16);
  let g = parseInt(hexWithoutHash.substring(2, 4), 16);
  let b = parseInt(hexWithoutHash.substring(4, 6), 16);

  // Return the RGBA color string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
