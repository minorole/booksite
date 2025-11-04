export type RunMetrics = { turns: number; toolCalls: number; handoffs: number };

export function createRunMetrics(initial?: Partial<RunMetrics>) {
  const m: RunMetrics = { turns: 0, toolCalls: 0, handoffs: 0, ...(initial || {}) };
  return {
    value(): RunMetrics {
      return { ...m };
    },
    incTurn() {
      m.turns += 1;
    },
    incTool() {
      m.toolCalls += 1;
    },
    incHandoff() {
      m.handoffs += 1;
    },
  };
}
