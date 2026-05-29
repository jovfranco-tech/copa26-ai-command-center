export function makeLogger(scope: string) {
  const tag = `[${scope}]`;
  return {
    info: (...a: unknown[]) => console.log(tag, ...a),
    warn: (...a: unknown[]) => console.warn(tag, ...a),
    error: (...a: unknown[]) => console.error(tag, ...a),
    stop: (msg: string) => console.error(`${tag} STOP:`, msg),
  };
}
export type Logger = ReturnType<typeof makeLogger>;
