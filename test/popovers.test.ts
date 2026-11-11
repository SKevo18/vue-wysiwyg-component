import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { WysiwygEditor, type EditorHandle } from "../src/index";
import { passWheel } from "../src/components/floating";

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("anchored popovers", () => {
  it("close when their anchor is clicked again", async () => {
    const ready = Promise.withResolvers<EditorHandle>();
    wrapper = mount(WysiwygEditor, { props: { modelValue: "Area $\\pi r^2$ here.\n", base: { math: true }, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
    await ready.promise;
    const chip = document.querySelector<HTMLElement>(".wy-math-inline")!;
    chip.click();
    await vi.waitFor(() => expect(document.querySelector(".wy-popover textarea")).not.toBeNull());
    chip.click();
    await nextTick();
    expect(document.querySelector(".wy-popover textarea")).toBeNull();
    expect(document.querySelector(".wy-math-inline")).not.toBeNull();
  });
});

describe("the wheel over a popup", () => {
  function page() {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "scrollHeight", { value: 2000 });
    Object.defineProperty(scroller, "clientHeight", { value: 500 });
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy as typeof scroller.scrollBy;
    const anchor = document.createElement("button");
    scroller.append(anchor);
    document.body.append(scroller);
    return { anchor, scrollBy };
  }

  it("scrolls the app's scroll container around the anchor when the popup cannot scroll", () => {
    const { anchor, scrollBy } = page();
    const popup = document.createElement("div");
    popup.innerHTML = "<button>Red</button>";
    document.body.append(popup);
    passWheel(popup, () => anchor);
    const e = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
    popup.querySelector("button")!.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ left: 0, top: 120 });
  });

  it("leaves the wheel to a list inside the popup that can still scroll", () => {
    const { anchor, scrollBy } = page();
    const popup = document.createElement("div");
    const list = document.createElement("div");
    list.style.overflowY = "auto";
    Object.defineProperty(list, "scrollHeight", { value: 900 });
    Object.defineProperty(list, "clientHeight", { value: 300 });
    popup.append(list);
    document.body.append(popup);
    passWheel(popup, () => anchor);
    const e = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
    list.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
