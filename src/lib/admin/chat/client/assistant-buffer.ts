export type AssistantBuffer = {
  push: (delta: string) => void;
  value: () => string;
  length: () => number;
  clear: () => void;
};

export function createAssistantBuffer(): AssistantBuffer {
  let buf = '';
  return {
    push(delta: string) {
      if (typeof delta === 'string' && delta) buf += delta;
    },
    value() {
      return buf;
    },
    length() {
      return buf.length;
    },
    clear() {
      buf = '';
    },
  };
}
