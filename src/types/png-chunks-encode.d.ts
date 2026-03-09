declare module 'png-chunks-encode' {
  export interface PngChunk {
    name: string;
    data: Uint8Array;
  }

  export default function encodeChunks(chunks: PngChunk[]): Uint8Array;
}
