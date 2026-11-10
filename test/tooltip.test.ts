import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { mount } from "@vue/test-utils";
import { h, withDirectives } from "vue";
import { vTooltip } from "../src/components/tooltip";

const stops: Mock[] = [];
vi.mock("../src/components/floating", () => ({
  floatNear: () => {
    const stop = vi.fn();
    stops.push(stop);
    return { update: () => undefined, stop };
  },
}));

afterEach(() => vi.useRealTimers());

describe("vTooltip", () => {
  it("stops tracking the previous element when the tooltip moves to the next one", async () => {
    vi.useFakeTimers();
    const w = mount({ render: () => [withDirectives(h("button", { class: "a" }), [[vTooltip, "A"]]), withDirectives(h("button", { class: "b" }), [[vTooltip, "B"]])] }, { attachTo: document.body });
    w.get(".a").element.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    await vi.advanceTimersByTimeAsync(500);
    w.get(".b").element.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(stops).toHaveLength(2);
    expect(stops[0]).toHaveBeenCalledOnce();
    expect(stops[1]).not.toHaveBeenCalled();
    w.unmount();
  });
});
