declare module 'png-chunk-text' {
  const pngChunkText: {
    encode(keyword: string, content: string): { name: string; data: Uint8Array };
    decode(data: Uint8Array): { keyword: string; text: string };
  };

  export default pngChunkText;
}
