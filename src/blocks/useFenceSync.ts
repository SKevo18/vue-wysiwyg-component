import { toValue, watch, type MaybeRefOrGetter } from "vue";

type Attrs = Record<string, string>;

export function useFenceSync(source: MaybeRefOrGetter<{ attrs: Attrs; body: string }>, emit: (attrs: Attrs, body: string) => void, reload: (attrs: Attrs, body: string) => void) {
  const read = () => {
    const v = toValue(source);
    return [v.attrs, v.body] as const;
  };
  const [attrs0, body0] = read();
  let last = { attrs: attrs0, body: body0 };
  // shallow attribute comparison: the form rebuilds its attrs object on every change
  const isLast = (attrs: Attrs, body: string) => {
    const keys = Object.keys(attrs);
    return body === last.body && keys.length === Object.keys(last.attrs).length && keys.every((k) => attrs[k] === last.attrs[k]);
  };
  watch(read, ([attrs, body]) => {
    if (isLast(attrs, body)) return;
    last = { attrs, body };
    reload(attrs, body);
  });
  return function publish(attrs: Attrs, body: string) {
    if (isLast(attrs, body)) return;
    last = { attrs, body };
    emit(attrs, body);
  };
}

export function moveItem<T>(list: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
}
