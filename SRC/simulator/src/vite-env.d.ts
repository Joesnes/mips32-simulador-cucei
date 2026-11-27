/// <reference types="vite/client" />

declare module '*.asm?raw' {
  const source: string;
  export default source;
}
