declare module 'png-chunks-extract' {
  export interface PngChunk {
    name: string;
    data: Uint8Array;
  }

  export default function extractChunks(data: Uint8Array): PngChunk[];
}
