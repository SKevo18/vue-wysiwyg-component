<script setup lang="ts">
// teleported to <body>, so keydown no longer bubbles through the node view and Esc is reported as `escape`
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Placement } from "@floating-ui/dom";
import { floatNear } from "./floating";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{ anchor: HTMLElement | null; side?: "bottom" | "right" | "top"; align?: "start" | "center" | "end" }>(), { side: "bottom", align: "start" });
const emit = defineEmits<{ escape: [event: KeyboardEvent] }>();

const root = ref<HTMLElement | null>(null);
const pos = ref({ x: -9999, y: -9999 });
const room = ref(9999);
let floating: { update(): void; stop(): void } | null = null;

function place() {
  floating?.update();
}

function bind() {
  floating?.stop();
  floating = null;
  if (!root.value || !props.anchor) return;
  floating = floatNear(props.anchor, root.value, {
    placement: (props.align === "center" ? props.side : `${props.side}-${props.align}`) as Placement,
    offset: 4,
    padding: 8,
    apply: (x, y) => (pos.value = { x, y }),
    room: (h) => (room.value = h),
  });
}

watch(() => props.anchor, bind);
onMounted(bind);
onBeforeUnmount(() => floating?.stop());

defineExpose({ place, el: root });
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      v-bind="$attrs"
      class="wy-floating"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px`, '--wy-popover-room': `${room}px` }"
      contenteditable="false"
      data-block-portal
      @mousedown.stop
      @keydown="(e: KeyboardEvent) => e.key === 'Escape' && emit('escape', e)"
    >
      <slot />
    </div>
  </Teleport>
</template>
