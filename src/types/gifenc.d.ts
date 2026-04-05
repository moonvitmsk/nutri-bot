declare module 'gifenc' {
  export function GIFEncoder(): {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: {
      palette?: number[][];
      delay?: number;
      transparent?: boolean;
      dispose?: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  export function quantize(data: Uint8Array, maxColors: number, opts?: { format?: string }): number[][];
  export function applyPalette(data: Uint8Array, palette: number[][], format?: string): Uint8Array;
}
