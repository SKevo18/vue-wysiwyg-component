// besides the trailing call, `fn` runs at the latest `maxWait` ms after the first call of a burst
export interface Debounced {
  schedule(): void;
  cancel(): void;
}

export function debounced(fn: () => void, delay: number, maxWait: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let since = 0;
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }
  return {
    schedule() {
      const now = Date.now();
      if (timer === undefined) since = now;
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          timer = undefined;
          fn();
        },
        Math.max(0, Math.min(delay, since + maxWait - now)),
      );
    },
    cancel,
  };
}
