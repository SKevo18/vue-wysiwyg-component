import markdownit from "markdown-it";
import ins from "markdown-it-ins";
import mark from "markdown-it-mark";
import { MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import { DOMParser as DOMParser$1, DOMSerializer, Fragment, Slice } from "@tiptap/pm/model";
import { Extension, Node as Node$1, createDocument, findParentNode, getSchema, mergeAttributes } from "@tiptap/core";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import { BulletList, ListItem, ListKeymap, OrderedList, TaskItem, TaskList } from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Text from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode, UndoRedo } from "@tiptap/extensions";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import rust from "highlight.js/lib/languages/rust";
import csharp from "highlight.js/lib/languages/csharp";
import php from "highlight.js/lib/languages/php";
import lua from "highlight.js/lib/languages/lua";
import ruby from "highlight.js/lib/languages/ruby";
import CodeBlock from "@tiptap/extension-code-block";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import { AlignCenter, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, AlignJustify, AlignLeft, AlignRight, AppWindow, Baseline, BetweenHorizontalEnd, BetweenHorizontalStart, BetweenVerticalEnd, BetweenVerticalStart, Bold as Bold$1, Bookmark, CalendarDays, Check, ChevronDown, ChevronRight, ChevronsDownUp, Code as Code$1, Columns2, Columns3, Columns4, Copy, CopyPlus, Ellipsis, ExternalLink, FileCode, FileCode2, FileSymlink, FileText, Globe, GripHorizontal, GripVertical, Heading as Heading$1, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Highlighter, Image as Image$1, ImagePlus, Italic as Italic$1, Link as Link$1, List, ListOrdered, ListTodo, ListTree, LoaderCircle, Maximize2, MessageSquareQuote, Minimize2, Minus, MoreHorizontal, Palette, PanelLeft, PanelRight, Paperclip, Pencil, Pilcrow, Plus, Quote, Redo2, RefreshCw, RotateCcw, Scaling, Sigma, Sparkles, SquareFunction, Strikethrough, Trash2, Underline as Underline$1, Undo2, Ungroup, Unlink, User, X, ZoomIn } from "@lucide/vue";
import { Fragment as Fragment$1, Teleport, computed, createBlock, createCommentVNode, createElementBlock, createElementVNode, createSlots, createTextVNode, createVNode, defineComponent, getCurrentInstance, getCurrentScope, inject, mergeProps, nextTick, normalizeClass, normalizeStyle, onBeforeUnmount, onMounted, onScopeDispose, openBlock, provide, ref, renderList, renderSlot, resolveComponent, resolveDynamicComponent, shallowRef, toDisplayString, toRaw, toValue, unref, vModelText, vShow, watch, withCtx, withDirectives, withKeys, withModifiers } from "vue";
import { EditorContent, NodeViewContent, NodeViewWrapper, VueNodeViewRenderer, VueRenderer, nodeViewProps, useEditor } from "@tiptap/vue-3";
import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import { NodeSelection, Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { CellSelection, TableMap, moveTableColumn, moveTableRow, selectedRect } from "@tiptap/pm/tables";
import { redo, undo } from "@tiptap/pm/history";
import { BubbleMenu } from "@tiptap/vue-3/menus";
// src/core/colors.ts
var PALETTE = [
	"gray",
	"brown",
	"orange",
	"yellow",
	"green",
	"blue",
	"purple",
	"pink",
	"red"
];
var NAMES = Object.fromEntries(PALETTE.map((n) => [n, true]));
function isTextToken(v) {
	return typeof v === "string" && NAMES[v] === true;
}
/** `yellow_bg` */
function isBgToken(v) {
	return typeof v === "string" && v.endsWith("_bg") && NAMES[v.slice(0, -3)] === true;
}
function isColorToken(v) {
	return isTextToken(v) || isBgToken(v);
}
/** `red` → `var(--vc-color-red)`, `red_bg` → `var(--vc-bg-red)`; null for anything else */
function tokenCss(token) {
	if (isTextToken(token)) return `var(--vc-color-${token})`;
	if (isBgToken(token)) return `var(--vc-bg-${token.slice(0, -3)})`;
	return null;
}
/** a token read back from a rendered `var(--vc-…)` value, so pasted editor html keeps its colours */
function tokenFromCss(value) {
	const m = /^\s*var\(--vc-(color|bg)-([a-z]+)\)\s*$/.exec(value ?? "");
	if (!m || NAMES[m[2]] !== true) return null;
	return m[1] === "bg" ? `${m[2]}_bg` : m[2];
}
/** inline style of a block colour: text tokens colour the text, background tokens fill the block */
function blockColorStyle(token) {
	const css = tokenCss(token);
	if (!css) return null;
	return isBgToken(token) ? `background-color: ${css}` : `color: ${css}`;
}
// src/core/attrs.ts
var ORDERED_STYLES = [
	"decimal",
	"lower-alpha",
	"upper-alpha",
	"lower-roman",
	"upper-roman"
];
var BULLET_STYLES = [
	"disc",
	"circle",
	"square",
	"dash",
	"arrow"
];
var DIVIDER_WIDTHS = [
	1,
	2,
	3,
	4
];
var DIVIDER_STYLES = [
	"solid",
	"dashed",
	"dotted",
	"double"
];
var DIVIDER_DESIGNS = [
	"none",
	"star",
	"diamond",
	"dots",
	"fleuron"
];
var DIVIDER_COLORS = [
	"red",
	"orange",
	"amber",
	"green",
	"teal",
	"blue",
	"violet",
	"pink"
];
var DEFAULT_DIVIDER = {
	width: 1,
	color: null,
	style: "solid",
	design: "none",
	char: null
};
var DIVIDER_GLYPHS = {
	star: "★",
	diamond: "◆",
	dots: "• • •",
	fleuron: "❦"
};
var BULLET_GLYPHS = {
	dash: "–",
	arrow: "→"
};
var HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
var segmenter = null;
function graphemes(s) {
	if (typeof Intl.Segmenter !== "function") return s;
	segmenter ??= new Intl.Segmenter(void 0, { granularity: "grapheme" });
	return segmenter.segment(s);
}
/** grapheme clusters, so an emoji counts as one; no `"` because the attribute syntax cannot quote it */
function validChar(s) {
	if (!s || /[\s"]/.test(s)) return false;
	let n = 0;
	for (const _ of graphemes(s)) if (++n > 2) return false;
	return true;
}
function parseAttrLine(line) {
	const s = line.trim();
	if (s.length < 3 || s[0] !== "{" || s[s.length - 1] !== "}") return null;
	const fields = {};
	const re = /\s*([a-z]+)=(?:"([^"]*)"|([^\s"{}]+))\s*/gy;
	const body = s.slice(1, -1);
	let at = 0;
	while (at < body.length) {
		re.lastIndex = at;
		const m = re.exec(body);
		if (!m || m[1] in fields) return null;
		fields[m[1]] = m[2] ?? m[3];
		at = re.lastIndex;
	}
	return Object.keys(fields).length ? fields : null;
}
function formatFields(fields) {
	if (!fields.length) return "";
	return `{${fields.map(([k, v]) => /^[^\s"{}=]+$/.test(v) ? `${k}=${v}` : `${k}="${v}"`).join(" ")}}`;
}
function parseListAttrs(fields, kind) {
	const attrs = {
		style: null,
		marker: null
	};
	for (const [k, v] of Object.entries(fields)) if (k === "style") {
		const ordered = ORDERED_STYLES.includes(v);
		const bullet = BULLET_STYLES.includes(v);
		if (kind === "ordered" ? !ordered : kind === "bullet" ? !bullet : !ordered && !bullet) return null;
		attrs.style = v;
	} else if (k === "marker" && kind !== "ordered" && validChar(v)) attrs.marker = v;
	else return null;
	return attrs;
}
function formatListAttrs(attrs) {
	if (attrs.marker) return formatFields([["marker", attrs.marker]]);
	if (attrs.style && attrs.style !== "decimal" && attrs.style !== "disc") return formatFields([["style", attrs.style]]);
	return "";
}
function parseDividerAttrs(fields) {
	const attrs = { ...DEFAULT_DIVIDER };
	for (const [k, v] of Object.entries(fields)) if (k === "width" && /^[1-4]$/.test(v)) attrs.width = Number(v);
	else if (k === "color" && (DIVIDER_COLORS.includes(v) || HEX_RE.test(v))) attrs.color = v.toLowerCase();
	else if (k === "style" && DIVIDER_STYLES.includes(v)) attrs.style = v;
	else if (k === "design" && DIVIDER_DESIGNS.includes(v)) attrs.design = v;
	else if (k === "char" && validChar(v)) attrs.char = v;
	else return null;
	return attrs;
}
function formatDividerAttrs(attrs) {
	const fields = [];
	if (attrs.width && attrs.width !== 1) fields.push(["width", String(attrs.width)]);
	if (attrs.color) fields.push(["color", attrs.color]);
	if (attrs.style && attrs.style !== "solid") fields.push(["style", attrs.style]);
	if (attrs.char) fields.push(["char", attrs.char]);
	else if (attrs.design && attrs.design !== "none") fields.push(["design", attrs.design]);
	return formatFields(fields);
}
function cssString(s) {
	return `"${s.replace(/\\/g, String.raw`\\`).replace(/"/g, String.raw`\"`)}"`;
}
function listLook(attrs) {
	if (attrs.marker && validChar(attrs.marker)) return {
		class: "wy-list-marker",
		style: `--wy-list-marker: ${cssString(attrs.marker + " ")}`
	};
	const style = attrs.style;
	if (!style || style === "decimal" || style === "disc" || !parseListAttrs({ style }, null)) return {
		class: "",
		style: ""
	};
	const glyph = BULLET_GLYPHS[style];
	return glyph ? {
		class: "wy-list-marker",
		style: `--wy-list-marker: ${cssString(glyph + " ")}`
	} : {
		class: `wy-list-${style}`,
		style: ""
	};
}
function dividerOrnament(attrs) {
	return attrs.char ?? (attrs.design === "none" ? "" : DIVIDER_GLYPHS[attrs.design]);
}
function dividerStyle(attrs) {
	const parts = [];
	const width = attrs.style === "double" ? attrs.width * 2 + 1 : attrs.width;
	if (width !== 1 && Number.isInteger(width)) parts.push(`--wy-divider-width: ${width}px`);
	if (attrs.style !== "solid" && DIVIDER_STYLES.includes(attrs.style)) parts.push(`--wy-divider-style: ${attrs.style}`);
	if (attrs.color && parseDividerAttrs({ color: attrs.color })) parts.push(`--wy-divider-color: ${attrs.color.startsWith("#") ? attrs.color : `var(--vc-tint-${attrs.color})`}`);
	return parts.join("; ");
}
function listOpen(tokens, close) {
	const type = close.type.replace(/_close$/, "_open");
	for (let i = tokens.length - 2; i >= 0; i--) if (tokens[i].type === type && tokens[i].level === close.level) return tokens[i];
	return null;
}
/** keys an attribute line may set on the block before it, in written order; a line with any other key stays text */
var BLOCK_ATTRS = [["icon", (v) => v.length > 0 && v.length <= 64 && !/[\n"]/.test(v)], ["color", isColorToken]];
var BLOCK_ATTR_KEYS = BLOCK_ATTRS.map(([k]) => k);
function parseBlockAttrs(fields) {
	for (const [k, v] of Object.entries(fields)) {
		const valid = BLOCK_ATTRS.find(([key]) => key === k)?.[1];
		if (!valid?.(v)) return null;
	}
	return fields;
}
/** `{icon=💡 color=gray_bg}`; empty and null values are left out */
function formatBlockAttrs(attrs) {
	const fields = [];
	for (const [k, valid] of BLOCK_ATTRS) {
		const v = attrs[k];
		if (typeof v === "string" && v && valid(v)) fields.push([k, v]);
	}
	return formatFields(fields);
}
var NO_BLOCK_ATTRS = {
	bullet_list_close: true,
	ordered_list_close: true,
	table_close: true,
	list_item_close: true
};
function blockAttrsTarget(tokens) {
	const last = tokens.length - 1;
	const prev = tokens[last];
	if (!prev || NO_BLOCK_ATTRS[prev.type] === true) return null;
	let at = -1;
	if (prev.type === "fence") at = last;
	else if (prev.nesting === -1) {
		const type = prev.type.replace(/_close$/, "_open");
		for (let i = last - 1; i >= 0; i--) if (tokens[i].type === type && tokens[i].level === prev.level) {
			at = i;
			break;
		}
	}
	if (at < 0) return null;
	const before = tokens[at - 1];
	return before?.type === "list_item_open" ? before : tokens[at];
}
function attrLineRule(state, startLine, _endLine, silent) {
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	const fields = parseAttrLine(state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]));
	if (!fields) return false;
	const block = parseBlockAttrs(fields);
	if (silent) return block !== null || state.listIndent >= 0 && parseListAttrs(fields, null) !== null;
	const prev = state.tokens[state.tokens.length - 1];
	const list = prev?.type === "bullet_list_close" || prev?.type === "ordered_list_close" ? parseListAttrs(fields, prev.type === "ordered_list_close" ? "ordered" : "bullet") : null;
	if (prev?.type === "hr") {
		const divider = parseDividerAttrs(fields);
		if (!divider) return false;
		prev.meta = {
			...prev.meta,
			divider
		};
	} else if (list) {
		const open = listOpen(state.tokens, prev);
		if (!open) return false;
		open.meta = {
			...open.meta,
			list
		};
	} else if (block) {
		const target = blockAttrsTarget(state.tokens);
		if (!target) return false;
		const meta = target.meta ?? {};
		target.meta = {
			...meta,
			blockAttrs: {
				...meta.blockAttrs,
				...block
			}
		};
	} else return false;
	state.line = startLine + 1;
	return true;
}
function blockAttrsPlugin(md) {
	md.block.ruler.before("lheading", "block_attrs", attrLineRule, { alt: ["paragraph", "blockquote"] });
}
// src/core/info.ts
function parseInfo(info) {
	const fields = [];
	let cur = "";
	let inQuote = false;
	for (const ch of info) if (ch === "\"") inQuote = !inQuote;
	else if (ch === " " && !inQuote) {
		if (cur) fields.push(cur);
		cur = "";
	} else cur += ch;
	if (cur) fields.push(cur);
	const attrs = {};
	if (fields.length === 0) return {
		kind: "",
		attrs
	};
	for (const f of fields.slice(1)) {
		const eq = f.indexOf("=");
		if (eq < 0) attrs[f.toLowerCase()] = "true";
		else attrs[f.slice(0, eq).toLowerCase()] = f.slice(eq + 1);
	}
	return {
		kind: fields[0].toLowerCase(),
		attrs
	};
}
function formatInfo(kind, attrs) {
	const parts = [kind];
	for (const [k, v] of Object.entries(attrs)) {
		if (v === "" || v === void 0) continue;
		if (v === "true") parts.push(k);
		else parts.push(/[\s"]/.test(v) ? `${k}="${v.replace(/"/g, "")}"` : `${k}=${v}`);
	}
	return parts.join(" ");
}
function fenceFor(body) {
	const ticks = body.match(/`{3,}/g);
	return ticks ? ticks.sort()[ticks.length - 1] + "`" : "```";
}
function blockBody(body) {
	return body.replace(/^(?:[ \t]*\n)+/, "").replace(/(?:\n[ \t]*)+$/, "");
}
function newBlockId() {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
	const arr = /* @__PURE__ */ new Uint8Array(8);
	crypto.getRandomValues(arr);
	let out = "";
	for (const b of arr) out += alphabet[b % 36];
	return out;
}
function fenceOpen(line) {
	const trimmed = line.replace(/^ {0,3}/, "");
	if (line.length - trimmed.length > 3) return null;
	const m = /^(`{3,}|~{3,})(.*)$/.exec(trimmed);
	if (!m) return null;
	if (m[1][0] === "`" && m[2].includes("`")) return null;
	return {
		marker: m[1],
		info: m[2].trim()
	};
}
function fenceClose(line, marker) {
	const trimmed = line.trim();
	if (line.length - line.replace(/^ */, "").length > 3) return false;
	return trimmed.startsWith(marker) && trimmed.replace(new RegExp(`^${marker[0] === "`" ? "`" : "~"}+$`), "") === "";
}
function sectionLabel(line) {
	if (line === "====") return "";
	return line.startsWith("==== ") ? line.slice(5).trim() : null;
}
function splitSections(body) {
	const out = [];
	let cur = [];
	let fence = "";
	const flush = () => {
		const last = out[out.length - 1];
		if (last) last.body = cur.join("\n").replace(/^\n+|\n+$/g, "");
		cur = [];
	};
	for (const line of body.split("\n")) {
		if (fence) {
			if (fenceClose(line, fence)) fence = "";
		} else {
			const label = sectionLabel(line);
			if (label !== null) {
				flush();
				out.push({
					label,
					body: ""
				});
				continue;
			}
			const open = fenceOpen(line);
			if (open) fence = open.marker;
		}
		cur.push(line);
	}
	flush();
	return out;
}
function joinSections(sections) {
	return sections.map((p) => {
		const label = p.label.replace(/\s+/g, " ").trim();
		const head = label ? `==== ${label}` : "====";
		return p.body ? `${head}\n${p.body}` : head;
	}).join("\n\n");
}
// src/core/media.ts
var FIGURE_ALIGNS = [
	"left",
	"center",
	"right",
	"float-left",
	"float-right"
];
function parseImageAttrs(body) {
	const attrs = {
		width: null,
		align: null
	};
	let any = false;
	for (const part of body.trim().split(/\s+/)) {
		const m = /^(width|align)=(.+)$/.exec(part);
		if (!m) continue;
		if (m[1] === "width") {
			const n = /^(\d+)%?$/.exec(m[2]);
			if (!n) continue;
			attrs.width = Math.min(100, Math.max(10, parseInt(n[1], 10)));
			any = true;
		} else if (FIGURE_ALIGNS.includes(m[2])) {
			attrs.align = m[2];
			any = true;
		}
	}
	return any ? attrs : null;
}
function formatImageAttrs(attrs) {
	const parts = [];
	if (attrs.width && attrs.width !== 100) parts.push(`width=${attrs.width}%`);
	if (attrs.align) parts.push(`align=${attrs.align}`);
	return parts.length ? `{${parts.join(" ")}}` : "";
}
function shownAlign(align, caption) {
	return align ?? (caption ? "center" : "left");
}
var MEDIA_EXTS = {
	mp4: "video",
	webm: "video",
	mov: "video",
	mp3: "audio",
	ogg: "audio",
	wav: "audio",
	m4a: "audio"
};
var IMAGE_EXT_RE = /^(png|jpe?g|gif|webp|svg|avif|bmp|tiff?)$/;
function fileExt(src) {
	const clean = src.split(/[?#]/)[0];
	const m = /\.([a-z0-9]{1,16})$/i.exec(clean);
	return m ? m[1].toLowerCase() : "";
}
function mediaKind(src) {
	return MEDIA_EXTS[fileExt(src)] ?? null;
}
function isImageSrc(src) {
	return IMAGE_EXT_RE.test(fileExt(src));
}
var SIZE_RE = /^\d+([.,]\d+)?\s?(B|kB|KB|MB|GB)$/;
function formatBytes(bytes, locale = "en") {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
	return kb < 1024 ? `${fmt.format(kb)} kB` : `${fmt.format(kb / 1024)} MB`;
}
// src/core/highlight.ts
for (const [name, lang] of Object.entries({
	python,
	javascript,
	typescript,
	sql,
	bash,
	c,
	cpp,
	java,
	go,
	json,
	xml,
	css,
	yaml,
	markdown,
	plaintext,
	rust,
	csharp,
	php,
	lua,
	ruby
})) hljs.registerLanguage(name, lang);
hljs.registerAliases(["py"], { languageName: "python" });
hljs.registerAliases(["js", "mjs"], { languageName: "javascript" });
hljs.registerAliases(["ts"], { languageName: "typescript" });
hljs.registerAliases([
	"sh",
	"shell",
	"zsh"
], { languageName: "bash" });
hljs.registerAliases([
	"html",
	"svg",
	"xhtml"
], { languageName: "xml" });
hljs.registerAliases(["yml"], { languageName: "yaml" });
hljs.registerAliases(["md"], { languageName: "markdown" });
hljs.registerAliases(["txt", "text"], { languageName: "plaintext" });
hljs.registerAliases(["cs"], { languageName: "csharp" });
hljs.registerAliases(["c++"], { languageName: "cpp" });
var CODE_LANGUAGES = Object.freeze([
	"python",
	"javascript",
	"typescript",
	"html",
	"css",
	"sql",
	"bash",
	"json",
	"yaml",
	"markdown",
	"c",
	"cpp",
	"java",
	"go",
	"rust",
	"php",
	"ruby",
	"lua",
	"text"
]);
var CACHE_SIZE = 200;
var cache$1 = /* @__PURE__ */ new Map();
function escapeHtml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function registerCodeLanguage(name, language, aliases = []) {
	hljs.registerLanguage(name, language);
	if (aliases.length) hljs.registerAliases(aliases, { languageName: name });
	cache$1.clear();
}
function highlightCode(code, lang) {
	const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
	const key = `${language}\n${code}`;
	const hit = cache$1.get(key);
	if (hit !== void 0) {
		cache$1.delete(key);
		cache$1.set(key, hit);
		return hit;
	}
	let value;
	try {
		value = hljs.highlight(code, {
			language,
			ignoreIllegals: true
		}).value;
	} catch {
		value = escapeHtml(code);
	}
	cache$1.set(key, value);
	if (cache$1.size > CACHE_SIZE) cache$1.delete(cache$1.keys().next().value);
	return value;
}
// src/core/callouts.ts
var CIRCLE_INFO = [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10"
	}],
	["path", { d: "M12 16v-4" }],
	["path", { d: "M12 8h.01" }]
];
var CALLOUT_ICONS = {
	note: CIRCLE_INFO,
	info: CIRCLE_INFO,
	tip: [
		["path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }],
		["path", { d: "M9 18h6" }],
		["path", { d: "M10 22h4" }]
	],
	success: [["circle", {
		cx: "12",
		cy: "12",
		r: "10"
	}], ["path", { d: "m9 12 2 2 4-4" }]],
	important: [
		["path", { d: "M12 16h.01" }],
		["path", { d: "M12 8v4" }],
		["path", { d: "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z" }]
	],
	warning: [
		["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
		["path", { d: "M12 9v4" }],
		["path", { d: "M12 17h.01" }]
	],
	caution: [["path", { d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" }]],
	danger: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10"
		}],
		["path", { d: "m15 9-6 6" }],
		["path", { d: "m9 9 6 6" }]
	],
	question: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10"
		}],
		["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }],
		["path", { d: "M12 17h.01" }]
	],
	example: [
		["path", { d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" }],
		["path", { d: "M6.453 15h11.094" }],
		["path", { d: "M8.5 2h7" }]
	],
	details: [["path", { d: "m9 18 6-6-6-6" }]]
};
var MARKDOWN_CALLOUTS = Object.freeze([
	"note",
	"tip",
	"important",
	"warning",
	"caution",
	"question",
	"example",
	"details"
]);
var HTML_CALLOUTS = Object.freeze([
	"info",
	"success",
	"warning",
	"danger"
]);
// src/core/palette.ts
function isPaletteToken(v) {
	return isColorToken(v);
}
function paletteCss(token) {
	return tokenCss(token) ?? "";
}
/** custom properties the callout css reads: `--wy-callout-bg` for a background token, `--wy-callout-fg` for a text token */
function calloutStyle(token) {
	const css = tokenCss(token);
	if (!css) return void 0;
	return isBgToken(token) ? `--wy-callout-bg: ${css}` : `--wy-callout-fg: ${css}`;
}
// src/schema/nodes.ts
/** a palette token from `data-color`; html may carry other colors, which stay out of the palette attribute */
function paletteAttribute() {
	return {
		default: null,
		parseHTML: (dom) => {
			const v = dom.getAttribute("data-color");
			return isPaletteToken(v) ? v : null;
		},
		renderHTML: (a) => a.color ? { "data-color": a.color } : {}
	};
}
function readAlign(dom) {
	const a = dom.getAttribute("data-align");
	return a && FIGURE_ALIGNS.includes(a) ? a : null;
}
function readWidth(dom, img) {
	const candidates = [
		dom.getAttribute("data-width"),
		img?.style.width,
		img?.getAttribute("width")
	];
	for (const c of candidates) {
		const m = c ? /^(\d+)(%?)$/.exec(c.trim()) : null;
		if (m && (m[2] || c === dom.getAttribute("data-width"))) {
			const n = parseInt(m[1], 10);
			if (n >= 10 && n <= 100) return n;
		}
	}
	return null;
}
function readPixels(img) {
	const w = img?.getAttribute("width") ?? "";
	return /^\d+$/.test(w) ? parseInt(w, 10) : null;
}
function imageLayoutAttributes() {
	return {
		width: {
			default: null,
			parseHTML: (dom) => readWidth(dom, dom),
			renderHTML: (a) => a.width ? { "data-width": String(a.width) } : {}
		},
		align: {
			default: null,
			parseHTML: readAlign,
			renderHTML: (a) => a.align ? { "data-align": a.align } : {}
		}
	};
}
var InlineImage = Image.extend({
	draggable: false,
	addAttributes() {
		return {
			...this.parent?.(),
			...imageLayoutAttributes()
		};
	},
	renderHTML({ HTMLAttributes, node }) {
		const width = node.attrs.width;
		return ["img", mergeAttributes(HTMLAttributes, width ? { style: `width: ${width}%` } : {})];
	}
}).configure({
	inline: true,
	allowBase64: false
});
var Figure = Node$1.create({
	name: "figure",
	group: "block",
	atom: true,
	draggable: false,
	selectable: true,
	addAttributes() {
		return {
			src: {
				default: "",
				parseHTML: (dom) => dom.querySelector("img")?.getAttribute("src") ?? "",
				renderHTML: () => ({})
			},
			alt: {
				default: null,
				parseHTML: (dom) => dom.querySelector("img")?.getAttribute("alt") || null,
				renderHTML: () => ({})
			},
			caption: {
				default: null,
				parseHTML: (dom) => dom.getAttribute("data-caption") || dom.querySelector("figcaption")?.textContent || null,
				renderHTML: () => ({})
			},
			width: {
				default: null,
				parseHTML: (dom) => readWidth(dom, dom.querySelector("img")),
				renderHTML: () => ({})
			},
			align: {
				default: null,
				parseHTML: (dom) => {
					const a = readAlign(dom) ?? (dom.querySelector("img") ? readAlign(dom.querySelector("img")) : null);
					if (a) return a;
					const t = dom.style.textAlign;
					return t === "center" || t === "right" ? t : null;
				},
				renderHTML: () => ({})
			},
			/** pixel width from pasted html; replaced by `width` once resized */
			pixels: {
				default: null,
				parseHTML: (dom) => readWidth(dom, dom.querySelector("img")) ? null : readPixels(dom.querySelector("img")),
				renderHTML: () => ({})
			}
		};
	},
	parseHTML() {
		const hasImg = (dom) => dom.querySelector("img")?.getAttribute("src") ? null : false;
		return [{
			tag: "p[data-type=\"image\"]",
			priority: 60,
			getAttrs: hasImg
		}, {
			tag: "figure",
			getAttrs: hasImg
		}];
	},
	renderHTML({ HTMLAttributes, node }) {
		const { src, alt, caption, width, align, pixels } = node.attrs;
		const shown = shownAlign(align, caption);
		const img = ["img", {
			src,
			alt: alt ?? "",
			width: pixels ? String(pixels) : null,
			style: width ? `width: ${width}%` : null,
			"data-align": align
		}];
		const attrs = mergeAttributes({
			"data-type": "image",
			"data-align": align,
			"data-width": width ? String(width) : null,
			class: `wy-figure wy-align-${shown}`
		}, HTMLAttributes);
		if (caption) return [
			"figure",
			mergeAttributes(attrs, { "data-caption": caption }),
			img,
			[
				"figcaption",
				{},
				caption
			]
		];
		const textAlign = shown === "center" || shown === "right" ? `text-align: ${shown}` : null;
		return [
			"p",
			mergeAttributes(attrs, { style: textAlign }),
			img
		];
	}
});
var Callout = Node$1.create({
	name: "callout",
	group: "block",
	content: "block+",
	defining: true,
	draggable: false,
	addAttributes() {
		return {
			type: {
				default: "note",
				parseHTML: (dom) => (dom.hasAttribute("data-callout") ? dom.getAttribute("data-type") : dom.getAttribute("data-variant")) || "note",
				renderHTML: () => ({})
			},
			title: {
				default: "",
				parseHTML: (dom) => dom.getAttribute("data-title") || "",
				renderHTML: (a) => a.title ? { "data-title": a.title } : {}
			},
			icon: {
				default: "",
				parseHTML: (dom) => dom.getAttribute("data-icon") || "",
				renderHTML: (a) => a.icon ? { "data-icon": a.icon } : {}
			},
			color: paletteAttribute()
		};
	},
	parseHTML() {
		return [{ tag: "div[data-type=\"callout\"]" }, { tag: "div[data-callout]" }];
	},
	renderHTML({ HTMLAttributes, node }) {
		return [
			"div",
			mergeAttributes({
				"data-type": "callout",
				"data-variant": node.attrs.type,
				class: "wy-callout",
				style: calloutStyle(node.attrs.color) ?? null
			}, HTMLAttributes),
			0
		];
	}
});
var Divider = HorizontalRule.extend({
	draggable: false,
	addAttributes() {
		const attr = (name) => ({
			default: DEFAULT_DIVIDER[name],
			parseHTML: (dom) => {
				const v = dom.getAttribute(`data-${name}`);
				return (v ? parseDividerAttrs({ [name]: v })?.[name] : void 0) ?? DEFAULT_DIVIDER[name];
			},
			renderHTML: (a) => a[name] !== DEFAULT_DIVIDER[name] ? { [`data-${name}`]: String(a[name]) } : {}
		});
		return {
			width: attr("width"),
			color: attr("color"),
			style: attr("style"),
			design: attr("design"),
			char: attr("char")
		};
	},
	parseHTML() {
		return [{ tag: "hr" }, { tag: "div.wy-divider" }];
	},
	renderHTML({ HTMLAttributes, node }) {
		const attrs = node.attrs;
		const style = dividerStyle(attrs) || null;
		const ornament = dividerOrnament(attrs);
		if (!ornament) return ["hr", mergeAttributes({
			class: "wy-divider",
			style
		}, HTMLAttributes)];
		return [
			"div",
			mergeAttributes({
				class: "wy-divider has-ornament",
				role: "separator",
				style
			}, HTMLAttributes),
			[
				"span",
				{
					class: "wy-divider-ornament",
					"aria-hidden": "true"
				},
				ornament
			]
		];
	}
});
var ListStyles = Extension.create({
	name: "listStyles",
	addGlobalAttributes() {
		return [{
			types: ["bulletList", "orderedList"],
			attributes: {
				listStyle: {
					default: null,
					parseHTML: (dom) => parseListAttrs({ style: dom.getAttribute("data-list-style") ?? "" }, dom.tagName === "OL" ? "ordered" : "bullet")?.style ?? null,
					renderHTML: (a) => {
						const look = listLook({
							style: a.listStyle,
							marker: a.marker
						});
						return {
							...a.listStyle ? { "data-list-style": a.listStyle } : {},
							...look.class ? { class: look.class } : {},
							...look.style ? { style: look.style } : {}
						};
					}
				},
				marker: {
					default: null,
					parseHTML: (dom) => parseListAttrs({ marker: dom.getAttribute("data-marker") ?? "" }, "bullet")?.marker ?? null,
					renderHTML: (a) => a.marker ? { "data-marker": a.marker } : {}
				}
			}
		}];
	}
});
var FileChips = Extension.create({
	name: "fileChips",
	addGlobalAttributes() {
		return [{
			types: ["link"],
			attributes: { fileChip: {
				default: null,
				parseHTML: () => null,
				renderHTML: (a) => typeof a.title === "string" && SIZE_RE.test(a.title) ? {
					"data-file-size": a.title,
					download: ""
				} : {}
			} }
		}];
	}
});
var GenericCodeBlock = CodeBlock.extend({ addAttributes() {
	return {
		...this.parent?.(),
		meta: {
			default: "",
			parseHTML: (el) => el.getAttribute("data-meta") ?? "",
			renderHTML: (a) => a.meta ? { "data-meta": a.meta } : {}
		}
	};
} }).configure({ defaultLanguage: null });
function flattenToParagraph(content, schema) {
	const br = schema.nodes.hardBreak;
	const out = [];
	const push = (nodes) => {
		if (nodes.length === 0) return;
		if (out.length) out.push(br.create());
		out.push(...nodes);
	};
	const lines = (text) => text.split("\n").flatMap((line, i) => [...i ? [br.create()] : [], ...line ? [schema.text(line)] : []]);
	const walk = (frag) => {
		let inline = [];
		frag.forEach((node) => {
			if (node.isInline) {
				inline.push(node);
				return;
			}
			push(inline);
			inline = [];
			const { attrs } = node;
			if (node.isTextblock) push(node.type.spec.code ? lines(node.textContent) : node.content.content.slice());
			else if (node.type.name === "figure" && schema.nodes.image) push([schema.nodes.image.create({
				src: attrs.src,
				alt: attrs.alt,
				title: attrs.caption,
				width: attrs.width
			})]);
			else if (node.type.name === "mathBlock" && schema.nodes.mathInline) push([schema.nodes.mathInline.create({ tex: attrs.tex })]);
			else if (node.isLeaf) push(lines(String(attrs.body ?? node.textContent)));
			else {
				if (typeof attrs.title === "string" && attrs.title.trim()) push(lines(attrs.title.trim()));
				walk(node.content);
			}
		});
		push(inline);
	};
	walk(content);
	return schema.nodes.paragraph.create(null, out);
}
function inlineCell(cell, tag) {
	return cell.extend({
		content: "paragraph",
		parseHTML() {
			return [{
				tag,
				getContent: (dom, schema) => Fragment.from(flattenToParagraph(DOMParser$1.fromSchema(schema).parseSlice(dom).content, schema))
			}];
		}
	});
}
var InlineTableCell = inlineCell(TableCell, "td");
var InlineTableHeader = inlineCell(TableHeader, "th");
var InlineDocument = Node$1.create({
	name: "doc",
	topNode: true,
	content: "paragraph"
});
// src/builtins/math.ts
var MathInline = Node$1.create({
	name: "mathInline",
	group: "inline",
	inline: true,
	atom: true,
	addAttributes() {
		return { tex: {
			default: "",
			parseHTML: (dom) => dom.getAttribute("data-tex") || "",
			renderHTML: (a) => ({ "data-tex": a.tex })
		} };
	},
	parseHTML() {
		return [{ tag: "span[data-math-inline]" }];
	},
	renderHTML({ HTMLAttributes, node }) {
		return [
			"span",
			mergeAttributes({ "data-math-inline": "" }, HTMLAttributes),
			`$${node.attrs.tex}$`
		];
	}
});
var MathBlock = Node$1.create({
	name: "mathBlock",
	group: "block",
	atom: true,
	draggable: false,
	addAttributes() {
		return {
			tex: {
				default: "",
				parseHTML: (dom) => dom.getAttribute("data-tex") || "",
				renderHTML: (a) => ({ "data-tex": a.tex })
			},
			/** the source used a ```math fence instead of `$$`; kept on round trip. */
			fence: {
				default: false,
				parseHTML: (dom) => dom.hasAttribute("data-fence"),
				renderHTML: (a) => a.fence ? { "data-fence": "" } : {}
			}
		};
	},
	parseHTML() {
		return [{ tag: "div[data-math-block]" }];
	},
	renderHTML({ HTMLAttributes, node }) {
		return [
			"div",
			mergeAttributes({ "data-math-block": "" }, HTMLAttributes),
			`$$${node.attrs.tex}$$`
		];
	}
});
function mathInlineRule(state, silent) {
	const src = state.src;
	if (src.charCodeAt(state.pos) !== 36) return false;
	if (src.charCodeAt(state.pos + 1) === 36) return false;
	const start = state.pos + 1;
	if (start >= state.posMax || src[start] === " ") return false;
	let end = start;
	while (end < state.posMax) {
		end = src.indexOf("$", end);
		if (end < 0 || end >= state.posMax) return false;
		if (src[end - 1] !== "\\" && src[end - 1] !== " ") break;
		end++;
	}
	if (end < 0 || end >= state.posMax + 1 || end === start) return false;
	const next = src.charCodeAt(end + 1);
	if (next >= 48 && next <= 57) return false;
	if (!silent) {
		const token = state.push("math_inline", "math", 0);
		token.content = src.slice(start, end);
	}
	state.pos = end + 1;
	return true;
}
function mathBlockRule(state, startLine, endLine, silent) {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const max = state.eMarks[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	if (state.src.slice(start, start + 2) !== "$$") return false;
	const firstLine = state.src.slice(start + 2, max);
	if (silent) return true;
	let nextLine = startLine;
	let content;
	if (firstLine.trim().endsWith("$$")) content = firstLine.trim().slice(0, -2);
	else {
		content = firstLine;
		let found = false;
		for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
			const line = state.src.slice(state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine]);
			if (line.trim().endsWith("$$")) {
				content += "\n" + line.trim().slice(0, -2);
				found = true;
				break;
			}
			content += "\n" + line;
		}
		if (!found) return false;
	}
	state.line = nextLine + 1;
	const token = state.push("math_block", "math", 0);
	token.block = true;
	token.content = content.trim();
	token.map = [startLine, state.line];
	return true;
}
function soleFormula(b) {
	if (b.type.name !== "paragraph") return null;
	const maths = [];
	let other = false;
	b.forEach((c) => {
		if (c.type.name === "mathInline") maths.push(c);
		else if (!c.isText || c.text.trim()) other = true;
	});
	return !other && maths.length === 1 ? maths[0] : null;
}
var mathExtension = {
	name: "math",
	tiptap: [MathInline, MathBlock],
	markdown: {
		plugins: [(md) => {
			md.inline.ruler.after("escape", "math_inline", mathInlineRule);
			md.block.ruler.before("fence", "math_block", mathBlockRule, { alt: [
				"paragraph",
				"reference",
				"blockquote",
				"list"
			] });
		}],
		fences: [{
			kind: "math",
			parse: (ctx) => ctx.atom("math_fence", {})
		}],
		tokens: {
			math_inline: {
				node: "mathInline",
				getAttrs: (tok) => ({ tex: tok.content })
			},
			math_block: {
				node: "mathBlock",
				getAttrs: (tok) => ({
					tex: tok.content,
					fence: false
				})
			},
			math_fence: {
				node: "mathBlock",
				getAttrs: (tok) => ({
					tex: tok.content.replace(/\n$/, "").trim(),
					fence: true
				})
			}
		},
		nodes: {
			mathInline(state, node) {
				state.write(`$${String(node.attrs.tex).trim()}$`);
			},
			mathBlock(state, node, _parent, _index, h) {
				const tex = String(node.attrs.tex).trim();
				if (node.attrs.fence) {
					h.writeFence(state, node, "math", tex);
					return;
				}
				state.write("$$\n");
				state.text(tex, false);
				state.write("\n$$");
				state.closeBlock(node);
			}
		},
		escape: "\\$"
	},
	slash: [{
		id: "mathBlock",
		group: "blocks",
		rank: 20,
		label: "",
		icon: Sigma,
		run: (c) => c.insert("mathBlock", {
			tex: "",
			fence: false
		})
	}, {
		id: "mathInline",
		group: "blocks",
		rank: 30,
		label: "",
		icon: SquareFunction,
		inline: true,
		run: (c) => c.insert("mathInline", { tex: "" })
	}],
	convert: {
		convertible: ["mathBlock"],
		wrappable: ["mathBlock"],
		paragraphs: { mathBlock: (b, ctx) => {
			const tex = String(b.attrs.tex ?? "").trim();
			return [ctx.schema.nodes.paragraph.create(null, tex ? ctx.schema.nodes.mathInline.create({ tex }) : null)];
		} },
		targets: [{
			id: "mathBlock",
			label: "",
			icon: Sigma,
			rank: 64,
			convert: (blocks, ctx) => {
				const math = blocks.length === 1 ? soleFormula(blocks[0]) : null;
				return math ? [ctx.schema.nodes.mathBlock.create({
					tex: math.attrs.tex,
					fence: false
				})] : null;
			}
		}]
	}
};
// src/builtins/details.ts
function headingLevel(v) {
	const n = Number(v);
	return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 0;
}
var Details = Node$1.create({
	name: "details",
	group: "block",
	content: "block+",
	defining: true,
	draggable: false,
	addAttributes() {
		return {
			title: {
				default: "",
				parseHTML: (dom) => dom.getAttribute("data-title") || dom.querySelector(":scope > summary")?.textContent || "",
				renderHTML: () => ({})
			},
			open: {
				default: false,
				parseHTML: (dom) => dom.hasAttribute("open"),
				renderHTML: (a) => a.open ? { open: "" } : {}
			},
			heading: {
				default: 0,
				parseHTML: (dom) => headingLevel(dom.getAttribute("data-heading") ?? dom.querySelector(":scope > summary > :is(h1, h2, h3, h4)")?.tagName.slice(1)),
				renderHTML: (a) => a.heading ? { "data-heading": String(a.heading) } : {}
			}
		};
	},
	parseHTML() {
		return [{
			tag: "details",
			contentElement: (dom) => dom.querySelector(":scope > [data-details-body]") ?? dom
		}];
	},
	renderHTML({ HTMLAttributes, node }) {
		const title = node.attrs.title || "";
		const level = headingLevel(node.attrs.heading);
		const summary = level ? [
			"summary",
			{},
			[
				`h${level}`,
				{},
				title
			]
		] : [
			"summary",
			{},
			title
		];
		return [
			"details",
			mergeAttributes({
				"data-type": "details",
				"data-title": title || null,
				class: "wy-details"
			}, HTMLAttributes),
			summary,
			[
				"div",
				{ "data-details-body": "" },
				0
			]
		];
	}
});
function toggleHeading(level) {
	return (blocks, ctx) => {
		const details = ctx.schema.nodes.details;
		const b = blocks.length === 1 ? blocks[0] : null;
		if (b?.type === details) return [details.create({
			...b.attrs,
			heading: level
		}, b.content)];
		if (!level) return null;
		if (b && (b.type.name === "paragraph" || b.type.name === "heading")) return [details.create({
			title: ctx.plainText(b.content).replace(/\n/g, " ").trim(),
			open: true,
			heading: level
		}, ctx.schema.nodes.paragraph.create())];
		return ctx.wrap(blocks, "details", `toggleHeading${level}`)?.map((n) => n.type === details ? details.create({
			...n.attrs,
			heading: level
		}, n.content) : n) ?? null;
	};
}
var HEADING_ICONS$2 = [
	Heading1,
	Heading2,
	Heading3
];
var detailsExtension = {
	name: "details",
	tiptap: [Details],
	markdown: {
		fences: [{
			kind: "details",
			parse: (ctx) => ctx.container("details", {
				title: ctx.info.attrs.title ?? "",
				open: ctx.info.attrs.open === "true",
				heading: headingLevel(ctx.info.attrs.heading)
			})
		}],
		tokens: { details: {
			block: "details",
			getAttrs: (tok) => ({
				title: tok.meta.title,
				open: !!tok.meta.open,
				heading: tok.meta.heading ?? 0
			})
		} },
		nodes: { details(state, node, _parent, _index, h) {
			const level = headingLevel(node.attrs.heading);
			const info = formatInfo("details", {
				title: String(node.attrs.title ?? "").trim(),
				heading: level ? String(level) : "",
				open: node.attrs.open ? "true" : ""
			});
			h.writeFence(state, node, info, h.contentMarkdown(node));
		} }
	},
	slash: [{
		id: "details",
		group: "text",
		rank: 40,
		label: "",
		icon: ChevronsDownUp,
		run: (c) => c.insert("details", {
			title: "",
			open: false
		}, [{ type: "paragraph" }])
	}, ...HEADING_ICONS$2.map((icon, i) => ({
		id: `toggleHeading${i + 1}`,
		group: "text",
		rank: 41 + i,
		label: "",
		icon,
		keywords: "toggle collapsible details",
		run: (c) => c.insert("details", {
			title: "",
			open: true,
			heading: i + 1
		}, [{ type: "paragraph" }])
	}))],
	convert: {
		containers: { details: {
			title: (node) => String(node.attrs.title ?? "").trim(),
			build: ({ title, content }, ctx, target) => ctx.schema.nodes.details.create({
				title,
				open: false,
				heading: headingLevel(/^toggleHeading(\d)$/.exec(target)?.[1])
			}, content)
		} },
		targets: [
			{
				id: "details",
				label: "",
				icon: ChevronsDownUp,
				rank: 32,
				container: "details"
			},
			{
				id: "details",
				label: "",
				convert: toggleHeading(0)
			},
			...HEADING_ICONS$2.map((icon, i) => ({
				id: `toggleHeading${i + 1}`,
				label: "",
				icon,
				rank: 33 + i * .1,
				convert: toggleHeading(i + 1)
			}))
		]
	}
};
// src/builtins/footnotes.ts
var label = {
	default: "1",
	parseHTML: (dom) => dom.getAttribute("data-label") || "1",
	renderHTML: (a) => ({ "data-label": a.label })
};
var FootnoteRef = Node$1.create({
	name: "footnoteRef",
	group: "inline",
	inline: true,
	atom: true,
	addAttributes() {
		return { label };
	},
	parseHTML() {
		return [{ tag: "sup[data-footnote-ref]" }];
	},
	renderHTML({ HTMLAttributes, node }) {
		return [
			"sup",
			mergeAttributes({
				"data-footnote-ref": "",
				class: "wy-footnote-ref"
			}, HTMLAttributes),
			`[^${node.attrs.label}]`
		];
	}
});
var FootnoteDef = Node$1.create({
	name: "footnoteDef",
	group: "block",
	content: "text*",
	marks: "",
	code: true,
	defining: true,
	addAttributes() {
		return { label };
	},
	parseHTML() {
		return [{
			tag: "div[data-footnote-def]",
			preserveWhitespace: "full"
		}];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes({
				"data-footnote-def": "",
				class: "wy-footnote-def"
			}, HTMLAttributes),
			0
		];
	}
});
/** continuation lines run until a blank line (indentation stripped). */
function footnoteDefRule(state, startLine, endLine, silent) {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const max = state.eMarks[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	const m = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/.exec(state.src.slice(start, max));
	if (!m) return false;
	if (silent) return true;
	const lines = [m[2]];
	let next = startLine + 1;
	for (; next < endLine; next++) {
		if (state.isEmpty(next)) break;
		const s = state.bMarks[next] + state.tShift[next];
		const e = state.eMarks[next];
		if (state.sCount[next] - state.blkIndent < 2 && /^\[\^[^\]\s]+\]:/.test(state.src.slice(s, e))) break;
		lines.push(state.src.slice(s, e).trim());
	}
	state.line = next;
	const token = state.push("footnote_def", "div", 0);
	token.block = true;
	token.meta = { label: m[1] };
	token.content = lines.join("\n").trim();
	token.map = [startLine, next];
	return true;
}
function footnoteRefRule(state, silent) {
	const src = state.src;
	if (src.charCodeAt(state.pos) !== 91 || src.charCodeAt(state.pos + 1) !== 94) return false;
	const close = src.indexOf("]", state.pos + 2);
	if (close < 0 || close >= state.posMax) return false;
	const name = src.slice(state.pos + 2, close);
	if (!name || /\s/.test(name)) return false;
	if (!silent) state.push("footnote_ref", "sup", 0).meta = { label: name };
	state.pos = close + 1;
	return true;
}
var footnotesExtension = {
	name: "footnotes",
	formats: ["markdown"],
	tiptap: [FootnoteRef, FootnoteDef],
	markdown: {
		plugins: [(md) => {
			md.block.ruler.before("reference", "pm_footnote_def", footnoteDefRule, { alt: ["paragraph", "reference"] });
			md.inline.ruler.after("image", "pm_footnote_ref", footnoteRefRule);
		}],
		tokens: {
			footnote_ref: {
				node: "footnoteRef",
				getAttrs: (tok) => ({ label: tok.meta.label })
			},
			footnote_def: {
				block: "footnoteDef",
				noCloseToken: true,
				getAttrs: (tok) => ({ label: tok.meta.label })
			}
		},
		nodes: {
			footnoteRef(state, node) {
				state.write(`[^${node.attrs.label}]`);
			},
			footnoteDef(state, node) {
				state.write(`[^${node.attrs.label}]: `);
				state.text(node.textContent.split("\n").join("\n    "), false);
				state.closeBlock(node);
			}
		}
	}
};
// src/editor/context.ts
var ContextStorage = Extension.create({
	name: "wysiwyg",
	addOptions() {
		return { context: null };
	},
	addStorage() {
		return { context: this.options.context };
	}
});
var EDITOR_CONTEXT = Symbol("wysiwyg-context");
function contextOf(editor) {
	const ctx = editor.storage.wysiwyg?.context;
	if (!ctx) throw new Error("not a wysiwyg editor");
	return ctx;
}
function useEditorContext() {
	const ctx = inject(EDITOR_CONTEXT, null);
	if (!ctx) throw new Error("useEditorContext() needs a WysiwygEditor ancestor");
	return ctx;
}
// src/components/floating.ts
function floatNear(anchor, el, o) {
	const padding = o.padding;
	const room = o.room;
	const middleware = [
		offset(o.offset),
		flip({ padding }),
		shift({ padding }),
		...room ? [size({
			padding,
			apply: ({ availableHeight }) => room(availableHeight)
		})] : []
	];
	const update = () => void computePosition(anchor, el, {
		strategy: "fixed",
		placement: o.placement,
		middleware
	}).then(({ x, y }) => o.apply(x, y));
	return {
		update,
		stop: autoUpdate(anchor, el, update)
	};
}
// src/components/tooltip.ts
var DELAY = 450;
var apple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
function formatKeys(keys) {
	const parts = keys.split("-").map((k) => {
		const low = k.toLowerCase();
		if (low === "mod") return apple ? "⌘" : "Ctrl";
		if (low === "shift") return apple ? "⇧" : "Shift";
		if (low === "alt") return apple ? "⌥" : "Alt";
		if (low === "enter") return apple ? "↩" : "Enter";
		return k.length === 1 ? k.toUpperCase() : k;
	});
	return apple ? parts.join("") : parts.join("+");
}
var tip = null;
var current$1 = null;
var timer = 0;
var stop = null;
var values = /* @__PURE__ */ new WeakMap();
function element() {
	if (!tip) {
		tip = document.createElement("div");
		tip.className = "wy-tooltip";
		tip.setAttribute("role", "tooltip");
		tip.hidden = true;
		document.body.appendChild(tip);
	}
	return tip;
}
function hide() {
	window.clearTimeout(timer);
	stop?.();
	stop = null;
	current$1 = null;
	if (tip) tip.hidden = true;
}
function show(el) {
	const value = values.get(el);
	const text = typeof value === "string" ? value : value?.text;
	if (!text || !el.isConnected) return;
	const t = element();
	t.textContent = text;
	const keys = typeof value === "object" && value?.keys ? formatKeys(value.keys) : "";
	if (keys) {
		const k = document.createElement("kbd");
		k.textContent = keys;
		t.append(" ", k);
	}
	t.hidden = false;
	current$1 = el;
	stop?.();
	stop = floatNear(el, t, {
		placement: "top",
		offset: 6,
		padding: 6,
		apply: (x, y) => {
			t.style.left = `${x}px`;
			t.style.top = `${y}px`;
		}
	}).stop;
}
function onEnter(e) {
	const el = e.currentTarget;
	if (e instanceof PointerEvent && e.pointerType === "touch") return;
	window.clearTimeout(timer);
	timer = window.setTimeout(() => show(el), current$1 ? 0 : DELAY);
}
function onFocus(e) {
	const el = e.currentTarget;
	if (el.matches(":focus-visible")) show(el);
}
var vTooltip = {
	mounted(el, binding) {
		values.set(el, binding.value);
		const text = typeof binding.value === "string" ? binding.value : binding.value?.text;
		if (text && !el.getAttribute("aria-label") && !el.textContent?.trim()) el.setAttribute("aria-label", text);
		el.addEventListener("pointerenter", onEnter);
		el.addEventListener("pointerleave", hide);
		el.addEventListener("pointerdown", hide);
		el.addEventListener("focus", onFocus);
		el.addEventListener("blur", hide);
	},
	updated(el, binding) {
		values.set(el, binding.value);
		if (current$1 === el && JSON.stringify(binding.value) !== JSON.stringify(binding.oldValue)) {
			hide();
			show(el);
		}
	},
	beforeUnmount(el) {
		if (current$1 === el) hide();
		el.removeEventListener("pointerenter", onEnter);
		el.removeEventListener("pointerleave", hide);
		el.removeEventListener("pointerdown", hide);
		el.removeEventListener("focus", onFocus);
		el.removeEventListener("blur", hide);
	}
};
// src/nodes/ColumnView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$38 = ["aria-label"];
// src/nodes/ColumnView.vue
var ColumnView_default = /* @__PURE__ */ defineComponent({
	__name: "ColumnView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const t = contextOf(props.editor).t;
		const readonly = computed(() => !props.editor.isEditable);
		const width = computed(() => props.node.attrs.width);
		const grow = computed(() => width.value ? formatColumnWidth(width.value) : "calc(100 / var(--wy-columns, 2))");
		const resizing = ref(false);
		let drag = null;
		function parent() {
			const pos = props.getPos();
			if (typeof pos !== "number") return null;
			const $pos = props.editor.state.doc.resolve(pos);
			return $pos.parent.type.name === "columns" ? {
				pos: $pos.before(),
				node: $pos.parent,
				index: $pos.index()
			} : null;
		}
		function onDown(e) {
			const p = parent();
			if (!p || e.button !== 0 || p.index >= p.node.childCount - 1) return;
			const row = e.currentTarget.closest(".wy-columns");
			const first = props.editor.view.nodeDOM(p.pos + 1 + offsetOf(p.node, p.index));
			const second = props.editor.view.nodeDOM(p.pos + 1 + offsetOf(p.node, p.index + 1));
			if (!(row instanceof HTMLElement) || !(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return;
			e.preventDefault();
			e.currentTarget.setPointerCapture(e.pointerId);
			const shares = columnShares(p.node);
			drag = {
				columnsPos: p.pos,
				index: p.index,
				shares,
				px: row.clientWidth,
				startX: e.clientX,
				doms: [first, second],
				next: [shares[p.index], shares[p.index + 1]]
			};
			resizing.value = true;
		}
		function offsetOf(node, index) {
			let offset = 0;
			for (let i = 0; i < index; i++) offset += node.child(i).nodeSize;
			return offset;
		}
		function onMove(e) {
			if (!drag) return;
			const total = drag.shares.reduce((s, w) => s + w, 0);
			const pair = drag.shares[drag.index] + drag.shares[drag.index + 1];
			const delta = (e.clientX - drag.startX) / Math.max(1, drag.px) * total;
			const a = Math.min(pair - 10, Math.max(10, drag.shares[drag.index] + delta));
			drag.next = [a, pair - a];
			drag.doms[0].style.flexGrow = String(a);
			drag.doms[1].style.flexGrow = String(pair - a);
		}
		function onUp() {
			const d = drag;
			drag = null;
			resizing.value = false;
			if (!d) return;
			d.doms.forEach((el) => el.style.removeProperty("flex-grow"));
			const node = props.editor.state.doc.nodeAt(d.columnsPos);
			if (!node || node.type.name !== "columns") return;
			const shares = [...d.shares];
			shares[d.index] = d.next[0];
			shares[d.index + 1] = d.next[1];
			const total = shares.reduce((s, w) => s + w, 0);
			const tr = props.editor.state.tr;
			node.forEach((c, offset, i) => tr.setNodeMarkup(d.columnsPos + 1 + offset, null, {
				...c.attrs,
				width: Math.round(shares[i] * 100 / total * 10) / 10
			}));
			props.editor.view.dispatch(tr);
		}
		onBeforeUnmount(() => {
			drag = null;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: normalizeClass(["wy-column", { "is-resizing": resizing.value }]),
				style: normalizeStyle({ flexGrow: grow.value })
			}, {
				default: withCtx(() => [createVNode(unref(NodeViewContent), { class: "wy-column-body" }), !readonly.value ? withDirectives((openBlock(), createElementBlock("div", {
					key: 0,
					class: "wy-column-resize",
					contenteditable: "false",
					role: "separator",
					"aria-orientation": "vertical",
					"aria-label": unref(t)("columns.resize"),
					onPointerdown: onDown,
					onPointermove: onMove,
					onPointerup: onUp,
					onPointercancel: onUp
				}, null, 40, _hoisted_1$38)), [[unref(vTooltip), unref(t)("columns.resize")]]) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class", "style"]);
		};
	}
});
// src/blocks/BlockFrame.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$37 = {
	key: 0,
	class: "wy-block-tools",
	contenteditable: "false"
};
var _hoisted_2$29 = { class: "wy-block-label" };
var _hoisted_3$29 = ["aria-label"];
var _hoisted_4$26 = ["aria-label"];
var _hoisted_5$24 = ["aria-label"];
var _hoisted_6$18 = ["aria-label"];
var _hoisted_7$14 = { class: "wy-block-body" };
// src/blocks/BlockFrame.vue
var BlockFrame_default = /* @__PURE__ */ defineComponent({
	__name: "BlockFrame",
	props: {
		label: {},
		selected: {
			type: Boolean,
			default: false
		},
		editing: {
			type: Boolean,
			default: false
		},
		readonly: {
			type: Boolean,
			default: false
		},
		copyText: { default: "" },
		editable: {
			type: Boolean,
			default: true
		},
		deletable: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"edit",
		"delete",
		"more"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = inject(EDITOR_CONTEXT, null);
		const t = (key, fallback) => ctx?.t(key) ?? fallback;
		async function copy() {
			if (!props.copyText) return;
			try {
				await navigator.clipboard.writeText(props.copyText);
				ctx?.services.toast?.(t("editor.copied", "Copied"), "success");
			} catch {}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(["wy-block-frame", {
				"is-selected": __props.selected,
				"is-editing": __props.editing,
				"is-readonly": __props.readonly,
				"is-editable": __props.editable && !__props.readonly
			}]) }, [
				!__props.readonly ? (openBlock(), createElementBlock("div", _hoisted_1$37, [
					createElementVNode("span", _hoisted_2$29, toDisplayString(__props.label), 1),
					__props.editable && !__props.editing ? withDirectives((openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: "wy-icon-btn",
						"aria-label": t("block.edit", "Edit"),
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[1] || (_cache[1] = ($event) => emit("edit"))
					}, [createVNode(unref(Pencil), { size: 14 })], 40, _hoisted_3$29)), [[unref(vTooltip), t("block.edit", "Edit")]]) : createCommentVNode("", true),
					__props.copyText ? withDirectives((openBlock(), createElementBlock("button", {
						key: 1,
						type: "button",
						class: "wy-icon-btn",
						"aria-label": t("block.copy", "Copy"),
						onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
						onClick: copy
					}, [createVNode(unref(Copy), { size: 14 })], 40, _hoisted_4$26)), [[unref(vTooltip), t("block.copy", "Copy")]]) : createCommentVNode("", true),
					__props.deletable ? withDirectives((openBlock(), createElementBlock("button", {
						key: 2,
						type: "button",
						class: "wy-icon-btn is-danger",
						"aria-label": t("block.delete", "Delete"),
						onMousedown: _cache[3] || (_cache[3] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[4] || (_cache[4] = ($event) => emit("delete"))
					}, [createVNode(unref(Trash2), { size: 14 })], 40, _hoisted_5$24)), [[unref(vTooltip), t("block.delete", "Delete")]]) : createCommentVNode("", true),
					_ctx.$slots.menu ? withDirectives((openBlock(), createElementBlock("button", {
						key: 3,
						type: "button",
						class: "wy-icon-btn",
						"data-block-more": "",
						"aria-label": t("block.more", "More"),
						onMousedown: _cache[5] || (_cache[5] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[6] || (_cache[6] = ($event) => emit("more", $event))
					}, [createVNode(unref(Ellipsis), { size: 14 })], 40, _hoisted_6$18)), [[unref(vTooltip), t("block.more", "More")]]) : createCommentVNode("", true)
				])) : createCommentVNode("", true),
				createElementVNode("div", _hoisted_7$14, [renderSlot(_ctx.$slots, "default")]),
				renderSlot(_ctx.$slots, "menu")
			], 2);
		};
	}
});
// src/editor/convert.ts
var LISTS = {
	bulletList: true,
	orderedList: true,
	taskList: true
};
var HEADING_ICONS$1 = [
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6
];
var typeOf = (n) => n.type.name;
var isText = (n) => typeOf(n) === "paragraph" || typeOf(n) === "heading";
var isList = (n) => LISTS[typeOf(n)] === true;
var isEmptyParagraph = (n) => typeOf(n) === "paragraph" && n.childCount === 0;
function childrenOf(node) {
	const out = [];
	node.forEach((c) => out.push(c));
	return out;
}
function paragraph(schema, content) {
	return schema.nodes.paragraph.create(null, content);
}
function bold(content, schema) {
	const mark = schema.marks.bold;
	if (!mark) return content;
	const out = [];
	content.forEach((c) => out.push(c.mark(mark.create().addToSet(c.marks))));
	return Fragment.from(out);
}
function plainText(content) {
	let s = "";
	content.forEach((c) => {
		if (c.isText) s += c.text;
		else if (typeOf(c) === "hardBreak") s += "\n";
		else if (typeOf(c) === "mathInline") s += `$${c.attrs.tex}$`;
		else if (typeOf(c) === "image") s += c.attrs.alt ?? "";
		else s += c.textContent;
	});
	return s;
}
function sectionBody(section) {
	const body = childrenOf(section);
	return body.length === 1 && isEmptyParagraph(body[0]) ? [] : body;
}
function listItems(list) {
	return childrenOf(list).map((item) => {
		const body = childrenOf(item);
		const first = body[0];
		const labelled = !!first && typeOf(first) === "paragraph";
		return {
			label: labelled ? first.content : Fragment.empty,
			body: labelled ? body.slice(1) : body,
			checked: item.attrs.checked === true
		};
	});
}
function listAttrs(source, to) {
	const style = source?.attrs.listStyle ?? null;
	if (to === "orderedList") return {
		start: 1,
		listStyle: style && ORDERED_STYLES.includes(style) ? style : null
	};
	if (to === "bulletList") return {
		listStyle: style && BULLET_STYLES.includes(style) ? style : null,
		marker: source && typeOf(source) === "bulletList" ? source.attrs.marker ?? null : null
	};
	return null;
}
function buildList(type, items, attrs, schema, nested) {
	const itemType = schema.nodes[type === "taskList" ? "taskItem" : "listItem"];
	const children = items.map((it) => {
		const body = it.body.map((b) => nested && typeOf(b) === nested ? retypeList(b, type, schema) : b);
		return itemType.create(type === "taskList" ? { checked: it.checked } : null, [paragraph(schema, it.label), ...body]);
	});
	return schema.nodes[type].create(attrs, children);
}
function retypeList(list, to, schema) {
	return buildList(to, listItems(list), listAttrs(list, to), schema, typeOf(list));
}
function sequenceItems(blocks) {
	const out = [];
	let prev = null;
	for (const b of blocks) {
		if (isText(b)) out.push({
			label: b.content,
			body: [],
			checked: false
		});
		else if (isList(b) && !(prev && isText(prev))) out.push(...listItems(b));
		else if (out.length) out[out.length - 1].body.push(b);
		else return null;
		prev = b;
	}
	return out;
}
function itemsToParagraphs(items, schema) {
	return items.flatMap((it) => [...it.label.size || !it.body.length ? [paragraph(schema, it.label)] : [], ...it.body]);
}
function convertRegistry(config, markdown) {
	const b = config.base;
	const reg = {
		targets: [],
		transforms: /* @__PURE__ */ new Map(),
		convertible: /* @__PURE__ */ new Set([
			"paragraph",
			"heading",
			"codeBlock",
			"bulletList",
			"orderedList",
			"taskList",
			"blockquote",
			"callout"
		]),
		wrappable: /* @__PURE__ */ new Set([
			"paragraph",
			"heading",
			"codeBlock",
			"bulletList",
			"orderedList",
			"taskList",
			"blockquote",
			"callout"
		]),
		containers: /* @__PURE__ */ new Map(),
		sections: /* @__PURE__ */ new Map(),
		items: /* @__PURE__ */ new Map(),
		paragraphs: /* @__PURE__ */ new Map(),
		markdown
	};
	reg.containers.set("blockquote", {
		title: (node) => quoteTitle(node, markdown).title,
		build: ({ title, content }, ctx) => {
			const s = ctx.schema;
			return s.nodes.blockquote.create(null, title ? [paragraph(s, bold(ctx.parseInline(title), s)), ...content] : content);
		}
	});
	reg.containers.set("callout", {
		title: (node) => String(node.attrs.title ?? "").trim(),
		build: ({ title, content }, ctx) => ctx.schema.nodes.callout.create({
			type: b.callouts[0] ?? "note",
			title
		}, content)
	});
	const defs = [
		{
			id: "paragraph",
			label: "",
			icon: Pilcrow,
			rank: 0,
			convert: toParagraph
		},
		...b.headings.map((level) => ({
			id: `heading${level}`,
			label: "",
			icon: HEADING_ICONS$1[level - 1],
			rank: 9 + level,
			convert: toHeading(level)
		})),
		...b.lists ? [{
			id: "bulletList",
			label: "",
			icon: List,
			rank: 20,
			convert: toList("bulletList")
		}, {
			id: "orderedList",
			label: "",
			icon: ListOrdered,
			rank: 21,
			convert: toList("orderedList")
		}] : [],
		...b.taskLists ? [{
			id: "taskList",
			label: "",
			icon: ListTodo,
			rank: 22,
			convert: toList("taskList")
		}] : [],
		...b.blockquote ? [{
			id: "quote",
			label: "",
			icon: Quote,
			rank: 30,
			container: "blockquote"
		}] : [],
		...b.callouts.length ? [{
			id: "callout",
			label: "",
			icon: MessageSquareQuote,
			rank: 31,
			container: "callout"
		}] : [],
		...b.codeBlocks ? [{
			id: "codeBlock",
			label: "",
			icon: FileCode2,
			rank: 60,
			convert: toCodeBlock
		}] : [],
		{
			id: "unwrap",
			label: "",
			icon: Ungroup,
			rank: 100,
			convert: toUnwrapped
		}
	];
	for (const e of config.extensions) {
		const h = e.convert;
		if (!h) continue;
		for (const n of h.convertible ?? []) reg.convertible.add(n);
		for (const n of h.wrappable ?? []) reg.wrappable.add(n);
		for (const [n, spec] of Object.entries(h.containers ?? {})) {
			reg.containers.set(n, spec);
			reg.convertible.add(n);
			reg.wrappable.add(n);
		}
		for (const [n, child] of Object.entries(h.sections ?? {})) {
			reg.sections.set(n, child);
			reg.convertible.add(n);
			reg.wrappable.add(n);
		}
		for (const [n, fn] of Object.entries(h.items ?? {})) reg.items.set(n, fn);
		for (const [n, fn] of Object.entries(h.paragraphs ?? {})) reg.paragraphs.set(n, fn);
		defs.push(...h.targets ?? []);
	}
	const byId = /* @__PURE__ */ new Map();
	for (const d of defs) {
		const transform = d.convert ?? ((blocks, ctx) => ctx.wrap(blocks, d.container ?? "", d.id));
		reg.transforms.set(d.id, [transform, ...reg.transforms.get(d.id) ?? []]);
		const prev = byId.get(d.id);
		byId.set(d.id, {
			id: d.id,
			label: d.label || prev?.label || "",
			icon: d.icon ?? prev?.icon,
			rank: d.rank ?? prev?.rank ?? 50
		});
	}
	reg.targets = [...byId.values()].sort((x, y) => x.rank - y.rank);
	return reg;
}
function quoteTitle(node, markdown) {
	const content = childrenOf(node);
	const schema = node.type.schema;
	const first = content[0];
	const boldMark = schema.marks.bold;
	if (boldMark && first && content.length > 1 && typeOf(first) === "paragraph" && first.childCount > 0) {
		let allBold = true;
		first.forEach((c) => allBold &&= boldMark.isInSet(c.marks) !== void 0);
		if (allBold) {
			const plain = [];
			first.forEach((c) => plain.push(c.mark(boldMark.removeFromSet(c.marks))));
			return {
				title: markdown.serializeInline(schema.topNodeType.create(null, paragraph(schema, Fragment.from(plain)))),
				content: content.slice(1)
			};
		}
	}
	return {
		title: "",
		content
	};
}
function context(reg, schema) {
	const md = reg.markdown;
	const isContainer = (n) => reg.containers.has(typeOf(n));
	const isSections = (n) => reg.sections.has(typeOf(n));
	const titled = (node) => {
		if (typeOf(node) === "blockquote") return quoteTitle(node, md);
		return {
			title: reg.containers.get(typeOf(node)).title(node),
			content: childrenOf(node)
		};
	};
	const sectionItems = (node) => childrenOf(node).map((s) => ({
		label: ctx.parseInline(String(s.attrs.label ?? "")),
		body: sectionBody(s),
		checked: false
	}));
	const buildSections = (type, sections, attrs = null) => {
		const child = schema.nodes[reg.sections.get(type)];
		return schema.nodes[type].create(attrs, sections.map((s) => child.create({ label: s.label }, s.body.length ? s.body : [paragraph(schema)])));
	};
	const flattenSections = (node) => {
		const out = [];
		node.forEach((s) => {
			const label = String(s.attrs.label ?? "").trim();
			if (label) out.push(paragraph(schema, bold(ctx.parseInline(label), schema)));
			out.push(...sectionBody(s));
		});
		return out.length ? out : [paragraph(schema)];
	};
	const build = (node, target, input) => {
		if (reg.sections.has(node)) return buildSections(node, [{
			label: input.title,
			body: input.content
		}]);
		return reg.containers.get(node).build(input, ctx, target);
	};
	const toParagraphs = (b) => {
		if (isText(b)) return [paragraph(schema, b.content)];
		const own = reg.paragraphs.get(typeOf(b));
		if (own) return own(b, ctx);
		if (typeOf(b) === "codeBlock") {
			const lines = b.textContent.split("\n").filter((l) => l.trim());
			return lines.length ? lines.map((l) => paragraph(schema, Fragment.from(schema.text(l)))) : [paragraph(schema)];
		}
		if (isList(b)) return itemsToParagraphs(listItems(b), schema);
		if (isContainer(b)) {
			const content = childrenOf(b);
			return content.every(isText) ? content.map((c) => paragraph(schema, c.content)) : null;
		}
		return null;
	};
	const ctx = {
		isContainer,
		isSections,
		flattenSections,
		hasItems: (n) => reg.items.has(typeOf(n)),
		schema,
		items(blocks) {
			const b = blocks.length === 1 ? blocks[0] : null;
			if (b && isList(b)) return listItems(b);
			if (b && isSections(b)) return sectionItems(b);
			const own = b && reg.items.get(typeOf(b));
			if (b && own) return own(b, ctx);
			if (b && isContainer(b)) return sequenceItems(childrenOf(b));
			return sequenceItems(blocks);
		},
		list: (type, items) => buildList(type, items, listAttrs(null, type), schema, null),
		paragraphs(blocks) {
			const out = [];
			for (const b of blocks) {
				const ps = toParagraphs(b);
				if (!ps) return null;
				out.push(...ps);
			}
			return out;
		},
		itemParagraphs: (items) => itemsToParagraphs(items, schema),
		wrap(blocks, node, target) {
			if (!schema.nodes[node]) return null;
			const b = blocks.length === 1 ? blocks[0] : null;
			if (b && typeOf(b) === node) return null;
			if (b && isContainer(b)) return [build(node, target, titled(b))];
			if (b && isSections(b)) {
				if (reg.sections.has(node)) {
					const child = schema.nodes[reg.sections.get(node)];
					return [schema.nodes[node].create(null, childrenOf(b).map((s) => child.create({ label: s.attrs.label }, s.content)))];
				}
				const sections = childrenOf(b);
				if (sections.length === 1) {
					const s = sections[0];
					const body = sectionBody(s);
					return [build(node, target, {
						title: String(s.attrs.label ?? "").trim(),
						content: body.length ? body : [paragraph(schema)]
					})];
				}
				return [build(node, target, {
					title: typeof b.attrs.title === "string" ? b.attrs.title.trim() : "",
					content: flattenSections(b)
				})];
			}
			if (b && isList(b) && reg.sections.has(node)) return [buildSections(node, listItems(b).map((it) => ({
				label: ctx.inlineMarkdown(it.label),
				body: it.body
			})))];
			if (!blocks.every((x) => reg.wrappable.has(typeOf(x)))) return null;
			return [build(node, target, {
				title: "",
				content: [...blocks]
			})];
		},
		parse: (src) => childrenOf(md.parse(src, schema)).filter((x) => !isEmptyParagraph(x)),
		parseInline: (src) => src.trim() ? md.parseInline(src, schema).firstChild?.content ?? Fragment.empty : Fragment.empty,
		serialize: (blocks) => md.serialize(schema.topNodeType.create(null, [...blocks])),
		inlineMarkdown: (content) => content.size ? md.serializeInline(schema.topNodeType.create(null, paragraph(schema, content))) : "",
		plainText
	};
	return ctx;
}
var toParagraph = (blocks, ctx) => ctx.paragraphs(blocks);
function toHeading(level) {
	return (blocks, ctx) => {
		if (blocks.some((b) => typeOf(b) === "codeBlock")) return null;
		const ps = ctx.paragraphs(blocks);
		if (!ps?.every((p) => typeOf(p) === "paragraph")) return null;
		if (blocks.some((b) => ctx.hasItems(b))) return null;
		return ps.map((p) => ctx.schema.nodes.heading.create({ level }, p.content));
	};
}
function toList(type) {
	return (blocks, ctx) => {
		const b = blocks.length === 1 ? blocks[0] : null;
		if (b && isList(b)) return typeOf(b) === type ? null : [retypeList(b, type, ctx.schema)];
		const items = ctx.items(blocks);
		return items?.length ? [ctx.list(type, items)] : null;
	};
}
var toCodeBlock = (blocks, ctx) => {
	if (!blocks.every(isText)) return null;
	const text = blocks.map((x) => plainText(x.content)).join("\n");
	return [ctx.schema.nodes.codeBlock.create({ language: null }, text ? ctx.schema.text(text) : null)];
};
var toUnwrapped = (blocks, ctx) => {
	const b = blocks.length === 1 ? blocks[0] : null;
	if (b && ctx.isContainer(b)) return childrenOf(b);
	if (b && ctx.isSections(b)) return ctx.flattenSections(b);
	return null;
};
function convertBlocks$1(reg, blocks, target, schema) {
	if (!blocks.length || !blocks.every((b) => reg.convertible.has(typeOf(b)))) return null;
	const ctx = context(reg, schema);
	for (const transform of reg.transforms.get(target) ?? []) try {
		const out = transform(blocks, ctx);
		if (!out?.length) continue;
		for (const n of out) n.check();
		return out;
	} catch (e) {
		console.error(`vue-wysiwyg-component: convert target "${target}" failed`, e);
	}
	return null;
}
function sameNodes(a, b) {
	return a.length === b.length && a.every((n, i) => n.eq(b[i]));
}
function convertTargets$1(reg, blocks, schema, fits = () => true) {
	const results = /* @__PURE__ */ new Map();
	for (const t of reg.targets) {
		const out = convertBlocks$1(reg, blocks, t.id, schema);
		if (out && !sameNodes(out, blocks) && fits(out)) results.set(t.id, out);
	}
	const unwrapped = results.get("unwrap");
	const paragraphs = results.get("paragraph");
	if (unwrapped && paragraphs && sameNodes(unwrapped, paragraphs)) results.delete("unwrap");
	return reg.targets.filter((t) => results.has(t.id));
}
function selectionRun(state) {
	const range = state.selection.$from.blockRange(state.selection.$to, (n) => n.type.spec.content === "block+");
	if (!range) return null;
	const nodes = [];
	for (let i = range.startIndex; i < range.endIndex; i++) nodes.push(range.parent.child(i));
	return nodes.length ? {
		from: range.start,
		to: range.end,
		nodes
	} : null;
}
function nodeRun(state, pos) {
	const node = pos >= 0 && pos < state.doc.content.size ? state.doc.nodeAt(pos) : null;
	return node?.isBlock ? {
		from: pos,
		to: pos + node.nodeSize,
		nodes: [node]
	} : null;
}
function runTargets(reg, state, run) {
	const $from = state.doc.resolve(run.from);
	const start = $from.index();
	const end = start + run.nodes.length;
	return convertTargets$1(reg, run.nodes, state.schema, (nodes) => $from.parent.canReplace(start, end, Fragment.from(nodes)));
}
function convertRun(reg, state, run, target, selectAll = false) {
	const nodes = convertBlocks$1(reg, run.nodes, target, state.schema);
	if (!nodes) return null;
	const tr = state.tr.replaceWith(run.from, run.to, nodes);
	const end = run.from + Fragment.from(nodes).size;
	let firstStart = -1;
	let firstEnd = -1;
	let lastEnd = -1;
	tr.doc.nodesBetween(run.from, end, (n, pos) => {
		if (!n.isTextblock) return true;
		if (firstStart < 0) {
			firstStart = pos + 1;
			firstEnd = pos + n.nodeSize - 1;
		}
		lastEnd = pos + n.nodeSize - 1;
		return false;
	});
	if (firstStart < 0) tr.setSelection(NodeSelection.create(tr.doc, run.from));
	else tr.setSelection(selectAll ? TextSelection.create(tr.doc, firstStart, lastEnd) : TextSelection.create(tr.doc, firstEnd));
	return tr.scrollIntoView();
}
// src/components/ConvertItems.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$36 = ["data-convert", "onClick"];
// src/components/ConvertItems.vue
var ConvertItems_default = /* @__PURE__ */ defineComponent({
	__name: "ConvertItems",
	props: { targets: {} },
	emits: ["pick"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const ctx = useEditorContext();
		function label(target) {
			return ctx.text(target.label, `convert.targets.${target.id}`) || ctx.text("", `slash.items.${target.id}.label`) || target.id;
		}
		return (_ctx, _cache) => {
			return openBlock(true), createElementBlock(Fragment$1, null, renderList(__props.targets, (target) => {
				return openBlock(), createElementBlock("button", {
					key: target.id,
					type: "button",
					role: "menuitem",
					class: "wy-menu-item",
					"data-convert": target.id,
					onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
					onClick: ($event) => emit("pick", target.id)
				}, [target.icon ? (openBlock(), createBlock(resolveDynamicComponent(target.icon), {
					key: 0,
					class: "wy-menu-icon",
					size: 16,
					"aria-hidden": "true"
				})) : createCommentVNode("", true), createElementVNode("span", null, toDisplayString(label(target)), 1)], 40, _hoisted_1$36);
			}), 128);
		};
	}
});
// src/blocks/BlockMenu.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$35 = { class: "wy-menu-heading" };
// src/blocks/BlockMenu.vue
var BlockMenu_default = /* @__PURE__ */ defineComponent({
	__name: "BlockMenu",
	props: {
		open: { type: Boolean },
		convert: {}
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const root = ref(null);
		function run() {
			const pos = props.convert?.getPos();
			return props.convert && pos !== void 0 ? nodeRun(props.convert.editor.state, pos) : null;
		}
		const targets = computed(() => {
			const c = props.convert;
			if (!props.open || !c?.node || !c.editor.isEditable) return [];
			const r = run();
			return r ? runTargets(contextOf(c.editor).convert, c.editor.state, r) : [];
		});
		const title = computed(() => props.convert ? contextOf(props.convert.editor).t("convert.title") : "");
		function pick(target) {
			const editor = props.convert?.editor;
			const r = run();
			const tr = editor && r && convertRun(contextOf(editor).convert, editor.state, r, target);
			emit("close");
			if (!editor || !tr) return;
			editor.view.dispatch(tr);
			editor.view.focus();
		}
		function onDocDown(e) {
			const target = e.target;
			if (!root.value || root.value.contains(target)) return;
			if (target.closest?.("[data-block-more]")?.closest(".wy-block-frame") === root.value.parentElement) return;
			emit("close");
		}
		function onKey(e) {
			if (e.key !== "Escape") return;
			e.stopPropagation();
			emit("close");
		}
		function listen(on) {
			const fn = on ? document.addEventListener.bind(document) : document.removeEventListener.bind(document);
			fn("mousedown", onDocDown, true);
			fn("keydown", onKey, true);
		}
		watch(() => props.open, listen, { immediate: true });
		onBeforeUnmount(() => listen(false));
		return (_ctx, _cache) => {
			return __props.open ? (openBlock(), createElementBlock("div", {
				key: 0,
				ref_key: "root",
				ref: root,
				class: "wy-menu wy-block-menu",
				role: "menu",
				contenteditable: "false",
				"data-block-portal": "",
				onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
			}, [renderSlot(_ctx.$slots, "default"), targets.value.length ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [createElementVNode("div", _hoisted_1$35, toDisplayString(title.value), 1), createVNode(ConvertItems_default, {
				targets: targets.value,
				onPick: pick
			}, null, 8, ["targets"])], 64)) : createCommentVNode("", true)], 544)) : createCommentVNode("", true);
		};
	}
});
// src/components/SlashMenu.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$34 = ["aria-label"];
var _hoisted_2$28 = {
	key: 0,
	class: "wy-menu-empty"
};
var _hoisted_3$28 = {
	class: "wy-menu-heading",
	role: "presentation"
};
var _hoisted_4$25 = [
	"aria-selected",
	"aria-disabled",
	"title",
	"data-index",
	"onMouseenter",
	"onClick"
];
var _hoisted_5$23 = { class: "wy-slash-text" };
var _hoisted_6$17 = { class: "wy-slash-label" };
var _hoisted_7$13 = {
	key: 0,
	class: "wy-slash-desc"
};
// src/components/SlashMenu.vue
var SlashMenu_default = /* @__PURE__ */ defineComponent({
	__name: "SlashMenu",
	props: {
		items: {},
		command: { type: Function },
		inCell: { type: Boolean },
		groupLabel: { type: Function },
		t: { type: Function }
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const active = ref(0);
		const list = ref(null);
		const groups = computed(() => {
			const out = [];
			props.items.forEach((item, index) => {
				let g = out.find((x) => x.group === item.group);
				if (!g) out.push(g = {
					group: item.group,
					items: []
				});
				g.items.push({
					item,
					index
				});
			});
			return out;
		});
		const enabled = (i) => !props.inCell || !!props.items[i]?.inline;
		watch(() => [props.items, props.inCell], () => {
			active.value = Math.max(0, props.items.findIndex((_, i) => enabled(i)));
		}, { immediate: true });
		async function reveal() {
			await nextTick();
			list.value?.querySelector(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
		}
		function select(i) {
			const item = props.items[i];
			if (item && enabled(i)) props.command(item);
		}
		function step(dir) {
			const n = props.items.length;
			for (let k = 1; k <= n; k++) {
				const i = ((active.value + dir * k) % n + n) % n;
				if (enabled(i)) {
					active.value = i;
					return;
				}
			}
		}
		function onKeyDown(e) {
			if (props.items.length === 0) return false;
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				step(e.key === "ArrowDown" ? 1 : -1);
				reveal();
				return true;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				select(active.value);
				return true;
			}
			return false;
		}
		__expose({ onKeyDown });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: "wy-menu wy-slash",
				role: "listbox",
				"aria-label": __props.t("slash.title")
			}, [__props.items.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_2$28, toDisplayString(__props.t("slash.empty")), 1)) : (openBlock(), createElementBlock("div", {
				key: 1,
				ref_key: "list",
				ref: list,
				class: "wy-slash-list"
			}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(groups.value, (g) => {
				return openBlock(), createElementBlock(Fragment$1, { key: g.group }, [createElementVNode("div", _hoisted_3$28, toDisplayString(__props.groupLabel(g.group)), 1), (openBlock(true), createElementBlock(Fragment$1, null, renderList(g.items, ({ item, index }) => {
					return openBlock(), createElementBlock("button", {
						key: item.id,
						type: "button",
						role: "option",
						class: normalizeClass(["wy-menu-item wy-slash-item", { "is-active": index === active.value }]),
						"aria-selected": index === active.value,
						"aria-disabled": !enabled(index) || void 0,
						title: enabled(index) ? void 0 : __props.t("editor.inlineOnly"),
						"data-index": index,
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onMouseenter: ($event) => enabled(index) && (active.value = index),
						onClick: ($event) => select(index)
					}, [item.icon ? (openBlock(), createBlock(resolveDynamicComponent(item.icon), {
						key: 0,
						class: "wy-menu-icon",
						size: 18,
						"aria-hidden": "true"
					})) : createCommentVNode("", true), createElementVNode("span", _hoisted_5$23, [createElementVNode("span", _hoisted_6$17, toDisplayString(item.label), 1), item.description ? (openBlock(), createElementBlock("span", _hoisted_7$13, toDisplayString(item.description), 1)) : createCommentVNode("", true)])], 42, _hoisted_4$25);
				}), 128))], 64);
			}), 128))], 512))], 8, _hoisted_1$34);
		};
	}
});
// src/editor/tables.ts
function isInCell($pos) {
	for (let d = $pos.depth; d > 0; d--) {
		const role = $pos.node(d).type.spec.tableRole;
		if (role === "cell" || role === "header_cell") return true;
	}
	return false;
}
function cellSlice(slice, state) {
	const role = slice.content.firstChild?.type.spec.tableRole;
	if (role === "table" || role === "row" || role === "cell" || role === "header_cell") return slice;
	return new Slice(Fragment.from(flattenToParagraph(slice.content, state.schema)), 1, 1);
}
function cellPos(table, row, col) {
	const map = TableMap.get(table.node);
	return table.pos + 1 + map.map[row * map.width + col];
}
function selectLine(editor, table, kind, index) {
	const node = editor.state.doc.nodeAt(table.pos);
	if (!node || node.type.name !== "table") return false;
	const ref = {
		pos: table.pos,
		node
	};
	const map = TableMap.get(node);
	if (index >= (kind === "col" ? map.width : map.height)) return false;
	const $cell = editor.state.doc.resolve(kind === "col" ? cellPos(ref, 0, index) : cellPos(ref, index, 0));
	const sel = kind === "col" ? CellSelection.colSelection($cell) : CellSelection.rowSelection($cell);
	editor.view.dispatch(editor.state.tr.setSelection(sel));
	return true;
}
function caretIn(editor, tablePos, row, col) {
	const node = editor.state.doc.nodeAt(tablePos);
	if (!node) return;
	const pos = cellPos({
		pos: tablePos,
		node
	}, row, col);
	const cell = editor.state.doc.nodeAt(pos);
	editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(pos + cell.nodeSize - 1), -1)));
}
function runTableAction(editor, table, a) {
	const map = TableMap.get(table.node);
	if (a.kind === "table") {
		if (a.action === "delete") {
			selectLine(editor, table, "row", 0);
			editor.chain().focus().deleteTable().run();
			return;
		}
		const col = a.action === "addCol";
		selectLine(editor, table, col ? "col" : "row", (col ? map.width : map.height) - 1);
		if (col) editor.chain().focus().addColumnAfter().run();
		else editor.chain().focus().addRowAfter().run();
		caretIn(editor, table.pos, col ? 0 : map.height, col ? map.width : 0);
		return;
	}
	if (!selectLine(editor, table, a.kind, a.index)) return;
	const chain = editor.chain().focus();
	const isCol = a.kind === "col";
	const count = isCol ? map.width : map.height;
	let target = a.index;
	switch (a.action) {
		case "delete":
			if (count === 1) {
				chain.deleteTable().run();
				return;
			}
			if (isCol) chain.deleteColumn().run();
			else chain.deleteRow().run();
			target = Math.min(a.index, count - 2);
			break;
		case "before":
			if (isCol) chain.addColumnBefore().run();
			else chain.addRowBefore().run();
			break;
		case "after":
			if (isCol) chain.addColumnAfter().run();
			else chain.addRowAfter().run();
			target = a.index + 1;
			break;
		case "header":
			if (isCol) chain.toggleHeaderColumn().run();
			else chain.toggleHeaderRow().run();
			break;
		default: chain.setCellAttribute("align", a.action).run();
	}
	caretIn(editor, table.pos, isCol ? 0 : target, isCol ? target : 0);
}
/** the header row stays first: gfm writes it above the `---` line, so it neither moves nor gets displaced */
function moveLine(editor, table, kind, from, to) {
	if (from === to) return false;
	const node = editor.state.doc.nodeAt(table.pos);
	if (!node || node.type.name !== "table") return false;
	if (kind === "row" && hasHeaderRow(node) && (from === 0 || to === 0)) return false;
	if (!selectLine(editor, table, kind, from)) return false;
	return (kind === "col" ? moveTableColumn({
		from,
		to,
		pos: table.pos + 1
	}) : moveTableRow({
		from,
		to,
		pos: table.pos + 1
	}))(editor.state, editor.view.dispatch);
}
function hasHeaderRow(table) {
	let header = table.firstChild !== null && table.firstChild.childCount > 0;
	table.firstChild?.forEach((cell) => {
		if (cell.type.name !== "tableHeader") header = false;
	});
	return header;
}
/** every row starts with a header cell (markdown has no header column; it lives in html and the shared document) */
function hasHeaderColumn(table) {
	let header = table.childCount > 0;
	table.forEach((row) => {
		if (row.firstChild?.type.name !== "tableHeader") header = false;
	});
	return header;
}
// src/editor/behaviour.ts
var BLOCK_EDIT_EVENT = "wy-block-edit";
function blockStopEvent({ event }) {
	const target = event.target;
	if (!(target instanceof Element)) return false;
	const wrapper = target.closest("[data-node-view-wrapper]");
	const content = target.closest("[data-node-view-content], [data-node-view-content-vue]");
	if (content && wrapper && wrapper.contains(content)) return false;
	const type = event.type;
	if (type.startsWith("drag") || type === "drop") {
		if (type === "dragstart" && !target.closest("[data-drag-handle]")) {
			event.preventDefault();
			return true;
		}
		return false;
	}
	if ([
		"INPUT",
		"BUTTON",
		"SELECT",
		"TEXTAREA"
	].includes(target.tagName) || target instanceof HTMLElement && target.isContentEditable) return true;
	if (type === "copy" || type === "paste" || type === "cut") return false;
	if (type === "mousedown" || type === "mouseup" || type === "click" || type === "dblclick") return !target.closest("[data-drag-handle]");
	return true;
}
/** script and data urls become "" */
function normalizeHref(raw) {
	const v = raw.trim();
	if (/^(javascript|vbscript|data):/i.test(v.replace(/[\u0000-\u0020]/g, ""))) return "";
	if (!v || /^([a-z][a-z0-9+.-]*:|\/|#|\?|\.)/i.test(v)) return v;
	if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)) return `mailto:${v}`;
	if (/^\+?[\d\s()-]{6,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, "")}`;
	return `https://${v}`;
}
function linkAtSelection(editor) {
	const { from, to } = editor.state.selection;
	const href = String(editor.getAttributes("link").href ?? "");
	if (href) editor.chain().focus().extendMarkRange("link").run();
	const sel = editor.state.selection;
	return {
		href,
		text: editor.state.doc.textBetween(href ? sel.from : from, href ? sel.to : to, " "),
		hasLink: !!href
	};
}
function applyLink(editor, rawHref, text) {
	const href = normalizeHref(rawHref);
	if (!href) {
		removeLink(editor);
		return;
	}
	const { from, to, empty } = editor.state.selection;
	const label = text || rawHref.trim();
	if (empty || text && text !== editor.state.doc.textBetween(from, to, " ")) editor.chain().focus().insertContentAt({
		from,
		to
	}, {
		type: "text",
		text: label,
		marks: [{
			type: "link",
			attrs: { href }
		}]
	}).run();
	else editor.chain().focus().setLink({ href }).run();
}
function removeLink(editor) {
	editor.chain().focus().extendMarkRange("link").unsetLink().run();
}
/** the host's `openLink` first (it returns true for routes it handles), otherwise a new tab without an opener */
function openHref(services, raw, event) {
	const href = normalizeHref(raw);
	if (!href || services.openLink?.(href, event) === true) return;
	window.open(href, "_blank", "noopener,noreferrer");
}
var DRAG_PX = 4;
/** a plain click on a link opens it in editable and readonly editors; dragging, shift and multi clicks select text */
var LinkClicks = Extension.create({
	name: "linkClicks",
	addOptions() {
		return { open: () => {} };
	},
	addProseMirrorPlugins() {
		const open = this.options.open;
		let down = null;
		return [new Plugin({
			key: new PluginKey("linkClicks"),
			props: { handleDOMEvents: {
				mousedown(_view, event) {
					down = {
						x: event.clientX,
						y: event.clientY
					};
					return false;
				},
				click(view, event) {
					const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
					if (!link || event.button !== 0 || link.closest(".ProseMirror") !== view.dom) return false;
					event.preventDefault();
					const moved = !!down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_PX;
					const selecting = window.getSelection()?.isCollapsed === false;
					if (moved || selecting || event.shiftKey || event.detail > 1) return false;
					open(link.getAttribute("href") ?? "", event);
					return true;
				}
			} }
		})];
	}
});
var SLASH_KEY = new PluginKey("wysiwygSlash");
var SlashCommand = Extension.create({
	name: "slashCommand",
	addOptions() {
		return {
			items: () => [],
			groupLabel: (id) => id,
			t: (k) => k
		};
	},
	addProseMirrorPlugins() {
		const options = this.options;
		return [Suggestion({
			editor: this.editor,
			char: "/",
			pluginKey: SLASH_KEY,
			allowSpaces: false,
			startOfLine: false,
			allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
			items: ({ query, editor }) => options.items(query).filter((i) => i.enabled(editor)),
			command: ({ editor, range, props }) => {
				if (props.inline || !isInCell(editor.state.selection.$from)) props.run(editor, range);
			},
			render: () => {
				let renderer = null;
				let el = null;
				let floating = null;
				let rect = null;
				const close = () => {
					floating?.stop();
					renderer?.destroy();
					el?.remove();
					renderer = null;
					el = null;
					floating = null;
				};
				const reference = { getBoundingClientRect: () => rect?.() ?? new DOMRect() };
				const props = (p) => ({
					items: p.items,
					command: p.command,
					inCell: isInCell(p.editor.state.selection.$from),
					groupLabel: options.groupLabel,
					t: options.t
				});
				return {
					onStart(p) {
						rect = p.clientRect ?? null;
						renderer = new VueRenderer(SlashMenu_default, {
							props: props(p),
							editor: p.editor
						});
						const menu = el = renderer.element;
						menu.style.position = "fixed";
						menu.style.zIndex = "1000";
						document.body.appendChild(menu);
						floating = floatNear(reference, menu, {
							placement: "bottom-start",
							offset: 6,
							padding: 8,
							apply: (x, y) => {
								menu.style.left = `${x}px`;
								menu.style.top = `${y}px`;
							},
							room: (h) => menu.style.setProperty("--wy-menu-room", `${Math.max(160, h)}px`)
						});
					},
					onUpdate(p) {
						rect = p.clientRect ?? null;
						renderer?.updateProps(props(p));
						floating?.update();
					},
					onKeyDown(p) {
						if (p.event.key === "Escape") {
							p.event.stopPropagation();
							close();
							return true;
						}
						return (renderer?.ref)?.onKeyDown?.(p.event) ?? false;
					},
					onExit: close
				};
			}
		})];
	}
});
var BlockKeys = Extension.create({
	name: "blockKeys",
	addProseMirrorPlugins() {
		return [new Plugin({
			key: new PluginKey("blockKeys"),
			props: { handleKeyDown(view, event) {
				const sel = view.state.selection;
				if (event.key !== "Enter" || !(sel instanceof NodeSelection) || sel.node.isTextblock) return false;
				const dom = view.nodeDOM(sel.from);
				if (!(dom instanceof HTMLElement) || !dom.hasAttribute("data-node-view-wrapper")) return false;
				dom.dispatchEvent(new CustomEvent(BLOCK_EDIT_EVENT));
				return true;
			} }
		})];
	}
});
var InlineKeys = Extension.create({
	name: "inlineKeys",
	addKeyboardShortcuts() {
		return {
			Enter: () => true,
			"Shift-Enter": () => true
		};
	}
});
/** a click right of an inline atom that ends its line puts the caret after it (firefox puts it before) */
var InlineAtomClick = Extension.create({
	name: "inlineAtomClick",
	addProseMirrorPlugins() {
		return [new Plugin({ props: { handleClick(view, pos, event) {
			const $pos = view.state.doc.resolve(pos);
			const rightOf = (at) => {
				const dom = view.nodeDOM(at);
				if (!(dom instanceof HTMLElement)) return false;
				const r = dom.getBoundingClientRect();
				return event.clientX > r.right && event.clientY >= r.top && event.clientY <= r.bottom;
			};
			let target = null;
			const after = $pos.nodeAfter;
			const before = $pos.nodeBefore;
			if (after?.isInline && after.isAtom && rightOf(pos)) target = pos + after.nodeSize;
			else if (before?.isInline && before.isAtom && $pos.parentOffset === $pos.parent.content.size && rightOf(pos - before.nodeSize)) target = pos;
			if (target === null) return false;
			view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, target)));
			return true;
		} } })];
	}
});
var TableCells = Extension.create({
	name: "tableCells",
	priority: 101,
	addKeyboardShortcuts() {
		return { Enter: ({ editor }) => {
			const sel = editor.state.selection;
			return sel instanceof TextSelection && isInCell(sel.$from) && !SLASH_KEY.getState(editor.state)?.active && editor.commands.setHardBreak();
		} };
	},
	addProseMirrorPlugins() {
		return [new Plugin({
			key: new PluginKey("tableCells"),
			props: { transformPasted: (slice, view) => isInCell(view.state.selection.$from) ? cellSlice(slice, view.state) : slice }
		})];
	}
});
var HostKeys = Extension.create({
	name: "hostKeys",
	priority: 1e3,
	addOptions() {
		return { keys: () => ({}) };
	},
	addKeyboardShortcuts() {
		const out = {};
		for (const [key, fn] of Object.entries(this.options.keys())) out[key] = fn;
		return out;
	}
});
// src/editor/fresh.ts
var freshType = null;
function markFresh(typeName) {
	freshType = typeName;
}
function takeFresh(typeName) {
	if (freshType !== typeName) return false;
	freshType = null;
	return true;
}
function insertFresh(editor, type, attrs = {}, range, content) {
	markFresh(type);
	try {
		const chain = editor.chain().focus();
		if (range) chain.deleteRange(range);
		if (!(!!editor.schema.nodes[type] && chain.insertContent(content ? {
			type,
			attrs,
			content
		} : {
			type,
			attrs
		}).run())) takeFresh(type);
	} catch (e) {
		takeFresh(type);
		throw e;
	}
}
// src/blocks/useBlockNode.ts
var PORTAL_SELECTOR = "[data-block-portal], .wy-modal, [role=dialog], [role=menu], [role=listbox], .wy-slash";
function useBlockNode(props, opts = {}) {
	const editing = ref(false);
	const selected = computed(() => props.selected);
	const readonly = computed(() => !props.editor.isEditable);
	const copyText = computed(() => {
		const ctx = contextOf(props.editor);
		if (ctx.config.format === "markdown") return ctx.markdown.serializeNode(props.node);
		return fragmentHtml(Fragment.from(props.node), props.editor.schema);
	});
	function rootEl() {
		const pos = props.getPos();
		const dom = typeof pos === "number" ? props.editor.view.nodeDOM(pos) : null;
		return dom instanceof HTMLElement ? dom : null;
	}
	function selectSelf() {
		const pos = props.getPos();
		if (typeof pos === "number") props.editor.commands.setNodeSelection(pos);
	}
	function onDocClick(e) {
		const target = e.target;
		const el = rootEl();
		if (!target || !el || el.contains(target) || target.closest(PORTAL_SELECTOR)) return;
		stopEdit();
	}
	function onKeydown(e) {
		if (e.key !== "Escape" || !editing.value) return;
		e.preventDefault();
		e.stopPropagation();
		stopEdit();
		selectSelf();
		props.editor.view.focus();
	}
	function startEdit() {
		if (readonly.value || editing.value) return;
		editing.value = true;
		selectSelf();
		document.addEventListener("click", onDocClick, true);
	}
	function stopEdit() {
		if (!editing.value) return;
		editing.value = false;
		document.removeEventListener("click", onDocClick, true);
	}
	function finishEdit() {
		stopEdit();
		props.editor.commands.focus();
	}
	function onHeaderKey(e) {
		if (e.key !== "Enter" && e.key !== "ArrowDown") return;
		e.preventDefault();
		const pos = props.getPos();
		if (typeof pos !== "number") return;
		const view = props.editor.view;
		view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos + 2))));
		view.focus();
	}
	const onEditEvent = () => startEdit();
	let mounted = false;
	onMounted(() => {
		mounted = true;
		const el = rootEl();
		el?.addEventListener("keydown", onKeydown);
		el?.addEventListener(BLOCK_EDIT_EVENT, onEditEvent);
		if (opts.editOnInsert && takeFresh(props.node.type.name)) queueMicrotask(() => mounted && startEdit());
	});
	onBeforeUnmount(() => {
		mounted = false;
		stopEdit();
		const el = rootEl();
		el?.removeEventListener("keydown", onKeydown);
		el?.removeEventListener(BLOCK_EDIT_EVENT, onEditEvent);
	});
	return {
		selected,
		editing,
		startEdit,
		stopEdit,
		finishEdit,
		update: (attrs) => props.updateAttributes(attrs),
		remove() {
			stopEdit();
			props.deleteNode();
		},
		copyText,
		readonly,
		onKeydown,
		onHeaderKey
	};
}
// src/nodes/ColumnsView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$33 = ["title"];
// src/nodes/ColumnsView.vue
var ColumnsView_default = /* @__PURE__ */ defineComponent({
	__name: "ColumnsView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const t = contextOf(props.editor).t;
		const { selected, remove, copyText, readonly } = useBlockNode(props);
		const menu = ref(false);
		const count = computed(() => props.node.childCount);
		const sized = computed(() => {
			let any = false;
			props.node.forEach((c) => any ||= c.attrs.width !== null);
			return any;
		});
		function at() {
			const pos = props.getPos();
			return typeof pos === "number" ? pos : null;
		}
		/** the column holding the caret, else the last one */
		function currentColumn(pos) {
			const $head = props.editor.state.selection.$head;
			for (let d = $head.depth; d > 0; d--) if ($head.before(d) === pos) return $head.index(d);
			return count.value - 1;
		}
		function addColumn() {
			const pos = at();
			if (pos === null) return;
			const { schema, tr } = props.editor.state;
			const end = pos + props.node.nodeSize - 1;
			const n = count.value;
			props.node.forEach((c, offset) => {
				if (c.attrs.width) tr.setNodeMarkup(pos + 1 + offset, null, {
					...c.attrs,
					width: Math.round(c.attrs.width * n * 100 / (n + 1)) / 100
				});
			});
			tr.insert(end, schema.nodes.column.create(null, schema.nodes.paragraph.create()));
			tr.setSelection(TextSelection.near(tr.doc.resolve(end + 2)));
			props.editor.view.dispatch(tr.scrollIntoView());
			props.editor.view.focus();
			menu.value = false;
		}
		/** the column's blocks move to its neighbour; the last remaining column unwraps */
		function removeColumn() {
			const pos = at();
			if (pos === null) return;
			const index = currentColumn(pos);
			const columns = [];
			props.node.forEach((c, offset) => columns.push({
				node: c,
				from: pos + 1 + offset
			}));
			const gone = columns[index];
			const keep = columns[index === 0 ? 1 : index - 1];
			const { tr, schema } = props.editor.state;
			if (!keep) return;
			const moved = [];
			gone.node.forEach((b) => {
				if (!(b.type.name === "paragraph" && b.childCount === 0)) moved.push(b);
			});
			const merged = keep.node.copy(index === 0 ? Fragment.from(moved).append(keep.node.content) : keep.node.content.append(Fragment.from(moved)));
			const rest = columns.filter((c) => c !== gone).map((c) => c === keep ? merged : c.node);
			const replacement = rest.length === 1 ? rest[0].content : Fragment.from(schema.nodes.columns.create(props.node.attrs, rest.map((c) => c.type.create({
				...c.attrs,
				width: null
			}, c.content))));
			tr.replaceWith(pos, pos + props.node.nodeSize, replacement);
			tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)));
			props.editor.view.dispatch(tr.scrollIntoView());
			props.editor.view.focus();
			menu.value = false;
		}
		function equalWidths() {
			const pos = at();
			if (pos === null) return;
			const tr = props.editor.state.tr;
			props.node.forEach((c, offset) => tr.setNodeMarkup(pos + 1 + offset, null, {
				...c.attrs,
				width: null
			}));
			props.editor.view.dispatch(tr);
			menu.value = false;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-columns"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)("columns.label"),
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[1] || (_cache[1] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						convert: props,
						onClose: _cache[0] || (_cache[0] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [
							createElementVNode("button", {
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								onClick: addColumn
							}, [createVNode(unref(Plus), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("columns.add")), 1)]),
							createElementVNode("button", {
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								title: unref(t)("columns.removeHint"),
								onClick: removeColumn
							}, [createVNode(unref(Minus), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("columns.remove")), 1)], 8, _hoisted_1$33),
							sized.value ? (openBlock(), createElementBlock("button", {
								key: 0,
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								onClick: equalWidths
							}, [createVNode(unref(Columns2), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("columns.equal")), 1)])) : createCommentVNode("", true)
						]),
						_: 1
					}, 8, ["open", "convert"])]),
					default: withCtx(() => [createVNode(unref(NodeViewContent), {
						class: "wy-columns",
						style: normalizeStyle({ "--wy-columns": count.value })
					}, null, 8, ["style"])]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
/** a column width in percent, at most two decimals; null shares the rest equally */
function parseColumnWidth(v) {
	const s = String(v ?? "").trim();
	if (!/^\d+(?:\.\d+)?$/.test(s)) return null;
	const n = Number(s);
	return n > 0 && n <= 100 ? n : null;
}
function formatColumnWidth(w) {
	return String(Math.round(w * 100) / 100);
}
/** each column's share in percent of the row; columns without a width split what the others leave */
function columnShares(columns) {
	const widths = [];
	columns.forEach((c) => widths.push(parseColumnWidth(c.attrs.width)));
	const fixed = widths.reduce((s, w) => s + (w ?? 0), 0);
	const free = widths.filter((w) => w === null).length;
	const rest = free ? Math.max(10, (100 - fixed) / free) : 0;
	return widths.map((w) => w ?? rest);
}
var columnsExtension = {
	name: "columns",
	tiptap: [Node$1.create({
		name: "columns",
		group: "block",
		content: "column+",
		defining: true,
		draggable: false,
		parseHTML() {
			return [{ tag: "div[data-type=\"columns\"]" }];
		},
		renderHTML({ HTMLAttributes, node }) {
			return [
				"div",
				mergeAttributes({
					"data-type": "columns",
					class: "wy-columns",
					style: `--wy-columns: ${node.childCount}`
				}, HTMLAttributes),
				0
			];
		}
	}), Node$1.create({
		name: "column",
		content: "block+",
		defining: true,
		isolating: true,
		draggable: false,
		addAttributes() {
			return { width: {
				default: null,
				parseHTML: (dom) => parseColumnWidth(dom.getAttribute("data-width")),
				renderHTML: (a) => a.width ? {
					"data-width": formatColumnWidth(a.width),
					style: `flex-grow: ${formatColumnWidth(a.width)}`
				} : {}
			} };
		},
		parseHTML() {
			return [{ tag: "div[data-type=\"column\"]" }];
		},
		renderHTML({ HTMLAttributes }) {
			return [
				"div",
				mergeAttributes({
					"data-type": "column",
					class: "wy-column"
				}, HTMLAttributes),
				0
			];
		}
	})],
	nodeViews: {
		columns: ColumnsView_default,
		column: ColumnView_default
	},
	markdown: {
		fences: [{
			kind: "columns",
			parse: (ctx) => ctx.sections("columns", "column", {})
		}],
		tokens: {
			columns: { block: "columns" },
			column: {
				block: "column",
				getAttrs: (tok) => ({ width: parseColumnWidth(tok.meta?.label) })
			}
		},
		nodes: {
			columns(state, node, _parent, _index, h) {
				const sections = [];
				node.forEach((c) => sections.push({
					label: c.attrs.width ? formatColumnWidth(c.attrs.width) : "",
					body: h.contentMarkdown(c)
				}));
				h.writeFence(state, node, "columns", joinSections(sections));
			},
			column() {}
		}
	},
	slash: [
		Columns2,
		Columns3,
		Columns4
	].map((icon, i) => ({
		id: `columns${i + 2}`,
		group: "blocks",
		rank: 12 + i,
		label: "",
		icon,
		keywords: "columns layout side",
		run: (c) => c.insertSections("columns", "column", i + 2)
	})),
	convert: {
		sections: { columns: "column" },
		targets: [{
			id: "columns",
			label: "",
			icon: Columns2,
			rank: 38,
			convert: (blocks, ctx) => {
				const s = ctx.schema;
				if (blocks.length === 1 && blocks[0].type.name === "columns") return null;
				return [s.nodes.columns.create(null, [s.nodes.column.create(null, [...blocks]), s.nodes.column.create(null, s.nodes.paragraph.create())])];
			}
		}]
	}
};
// src/core/embeds.ts
var EMBED_PROVIDERS = [
	"youtube",
	"vimeo",
	"loom",
	"figma",
	"gist",
	"maps",
	"tweet",
	"codepen",
	"generic"
];
function parseUrl(raw) {
	try {
		const url = new URL(raw.trim());
		return url.protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}
var host = (url) => url.hostname.toLowerCase().replace(/^(www|m)\./, "");
/** `1h2m3s`, `90s` or `90` as seconds */
function seconds(t) {
	if (!t) return 0;
	if (/^\d+$/.test(t)) return Number(t);
	const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
	return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}
function youtube(url) {
	const h = host(url);
	let id = null;
	if (h === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
	else if (h === "youtube.com" || h === "youtube-nocookie.com" || h === "music.youtube.com") {
		const parts = url.pathname.split("/").filter(Boolean);
		if (parts[0] === "watch") id = url.searchParams.get("v");
		else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") id = parts[1] ?? null;
	}
	if (!id || !/^[\w-]{6,}$/.test(id)) return null;
	const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
	return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
}
function vimeo(url) {
	const h = host(url);
	if (h !== "vimeo.com" && h !== "player.vimeo.com") return null;
	const m = /^\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/.exec(url.pathname);
	if (!m) return null;
	const hash = m[2] ?? url.searchParams.get("h");
	return `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`;
}
function loom(url) {
	const m = host(url) === "loom.com" ? /^\/(?:share|embed)\/([\da-f]+)/.exec(url.pathname) : null;
	return m ? `https://www.loom.com/embed/${m[1]}` : null;
}
function figma(url) {
	const h = host(url);
	if (h === "embed.figma.com") return url.href;
	if (h !== "figma.com" || !/^\/(file|design|proto|board|slides|deck)\//.test(url.pathname)) return null;
	return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url.href)}`;
}
function gist(url) {
	const m = host(url) === "gist.github.com" ? /^\/([\w-]+)\/([\da-f]+)/.exec(url.pathname) : null;
	return m ? `https://gist.github.com/${m[1]}/${m[2]}.pibb` : null;
}
function maps(url) {
	const h = host(url);
	if (!/^(maps\.)?google\.[a-z.]+$/.test(h) || h.startsWith("google.") && !url.pathname.startsWith("/maps")) return null;
	if (url.pathname.startsWith("/maps/embed")) return url.href;
	const q = url.searchParams.get("q") ?? url.searchParams.get("query");
	const place = /\/place\/([^/]+)/.exec(url.pathname)?.[1];
	const at = /\/@(-?[\d.]+),(-?[\d.]+),(\d+(?:\.\d+)?)z/.exec(url.pathname);
	const params = new URLSearchParams();
	if (q) params.set("q", q);
	else if (place) params.set("q", decodeURIComponent(place.replace(/\+/g, " ")));
	else if (at) params.set("q", `${at[1]},${at[2]}`);
	else return null;
	if (at) params.set("z", String(Math.round(Number(at[3]))));
	params.set("output", "embed");
	return `https://maps.google.com/maps?${params}`;
}
function tweet(url) {
	const h = host(url);
	if (h !== "twitter.com" && h !== "x.com" && h !== "mobile.twitter.com") return null;
	const m = /^\/[\w]+\/status(?:es)?\/(\d+)/.exec(url.pathname);
	return m ? `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&dnt=true` : null;
}
function codepen(url) {
	const m = host(url) === "codepen.io" ? /^\/([\w-]+)\/(?:pen|embed|full|details)\/(\w+)/.exec(url.pathname) : null;
	return m ? `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result` : null;
}
var DETECTORS = [
	["youtube", youtube],
	["vimeo", vimeo],
	["loom", loom],
	["figma", figma],
	["gist", gist],
	["maps", maps],
	["tweet", tweet],
	["codepen", codepen]
];
/** null for anything but an https address */
function embedFor(raw) {
	const url = parseUrl(raw);
	if (!url) return null;
	for (const [provider, detect] of DETECTORS) {
		const src = detect(url);
		if (src) return {
			provider,
			src
		};
	}
	return {
		provider: "generic",
		src: url.href
	};
}
/** null keeps the provider's own shape (16:9 video or the default height) */
var EMBED_HEIGHTS = {
	youtube: null,
	vimeo: null,
	loom: null,
	figma: 450,
	gist: 320,
	maps: 400,
	tweet: 560,
	codepen: 420,
	generic: 420
};
var EMBED_MAX_HEIGHT = 1600;
/** sandbox flags; a page of the host's own origin loses `allow-same-origin`, so it cannot reach the editor */
function embedSandbox(src) {
	const flags = [
		"allow-scripts",
		"allow-popups",
		"allow-popups-to-escape-sandbox",
		"allow-presentation",
		"allow-forms"
	];
	let same = true;
	try {
		same = typeof location !== "undefined" && new URL(src).origin === location.origin;
	} catch {}
	if (!same) flags.push("allow-same-origin");
	return flags.join(" ");
}
/** a lone URL as typed or pasted; http is allowed for links and bookmarks */
function loneUrl(text) {
	const v = text.trim();
	if (!v || /\s/.test(v)) return null;
	try {
		const url = new URL(v);
		return url.protocol === "https:" || url.protocol === "http:" ? v : null;
	} catch {
		return null;
	}
}
// src/editor/navigate.ts
/** the host's `openLink` first; otherwise internal pages open in this tab and outside links in a new one */
function followLink(services, href, event, sameTab) {
	if (!href) return;
	event.preventDefault();
	if (services.openLink?.(href, event)) return;
	if (sameTab && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button !== 1) window.location.assign(href);
	else window.open(href, "_blank", "noopener,noreferrer");
}
var RESOLVE_TTL = 6e4;
var resolved = /* @__PURE__ */ new Map();
/** `services.resolveLink`, shared by every block and chip of one address for a minute */
function resolveOnce(services, href) {
	const resolve = services.resolveLink;
	if (!resolve || !href) return Promise.resolve(null);
	const hit = resolved.get(href);
	if (hit && Date.now() - hit.at < RESOLVE_TTL) return hit.result;
	const result = resolve(href).catch(() => null);
	resolved.set(href, {
		at: Date.now(),
		result
	});
	result.then((r) => r || resolved.delete(href));
	return result;
}
// src/nodes/BookmarkView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$32 = [
	"placeholder",
	"aria-label",
	"readonly",
	"onKeydown"
];
var _hoisted_2$27 = ["disabled"];
var _hoisted_3$27 = ["href"];
var _hoisted_4$24 = { class: "wy-bookmark-text" };
var _hoisted_5$22 = { class: "wy-bookmark-title" };
var _hoisted_6$16 = {
	key: 0,
	class: "wy-bookmark-desc"
};
var _hoisted_7$12 = { class: "wy-bookmark-url" };
var _hoisted_8$11 = ["src"];
var _hoisted_9$9 = ["src"];
var _hoisted_10$8 = ["disabled"];
var _hoisted_11$6 = ["href"];
// src/nodes/BookmarkView.vue
var BookmarkView_default = /* @__PURE__ */ defineComponent({
	__name: "BookmarkView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const { selected, editing, startEdit, finishEdit, stopEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
		const menu = ref(false);
		const loading = ref(false);
		const input = ref(null);
		const draft = ref("");
		const failedImage = ref(false);
		const failedIcon = ref(false);
		const a = computed(() => props.node.attrs);
		const title = computed(() => a.value.title || a.value.site || siteName(a.value.url) || a.value.url);
		let abort = null;
		watch(() => a.value.image, () => failedImage.value = false);
		watch(() => a.value.icon, () => failedIcon.value = false);
		watch(editing, async (on) => {
			if (!on) return;
			draft.value = a.value.url;
			await nextTick();
			input.value?.focus();
			input.value?.select();
		}, { immediate: true });
		async function refresh(url = a.value.url) {
			abort?.abort();
			menu.value = false;
			const fallback = { site: siteName(url) };
			const preview = ctx.services.linkPreview;
			if (!preview) {
				update(fallback);
				return;
			}
			const ctrl = abort = new AbortController();
			loading.value = true;
			try {
				const p = await preview(url, ctrl.signal);
				if (ctrl.signal.aborted || props.node.attrs.url !== url) return;
				update({
					title: p?.title ?? "",
					description: p?.description ?? "",
					image: p?.image ?? "",
					icon: p?.icon ?? "",
					site: p?.site || fallback.site
				});
			} catch {
				if (!ctrl.signal.aborted) ctx.services.toast?.(t("bookmark.failed"), "error");
			} finally {
				if (!ctrl.signal.aborted) loading.value = false;
			}
		}
		function submit() {
			const url = normalizeHref(draft.value);
			if (!url || !loneUrl(url)) return;
			const changed = url !== a.value.url;
			update({
				url,
				...changed ? {
					title: "",
					description: "",
					image: "",
					icon: "",
					site: siteName(url)
				} : {}
			});
			finishEdit();
			if (changed) refresh(url);
		}
		function cancel() {
			if (!a.value.url) remove();
			else stopEdit();
		}
		function open(e) {
			if (a.value.url) followLink(ctx.services, a.value.url, e, false);
		}
		onMounted(() => {
			if (!readonly.value && a.value.url && !a.value.title && !a.value.site) refresh();
		});
		onBeforeUnmount(() => abort?.abort());
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-bookmark"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)("bookmark.label"),
					selected: unref(selected),
					editing: unref(editing),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[8] || (_cache[8] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						onClose: _cache[7] || (_cache[7] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [
							a.value.url && !unref(readonly) ? (openBlock(), createElementBlock("button", {
								key: 0,
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								onClick: _cache[4] || (_cache[4] = ($event) => (menu.value = false, unref(startEdit)()))
							}, [createVNode(unref(Pencil), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("bookmark.edit")), 1)])) : createCommentVNode("", true),
							a.value.url ? (openBlock(), createElementBlock("button", {
								key: 1,
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								disabled: loading.value,
								onClick: _cache[5] || (_cache[5] = ($event) => refresh())
							}, [createVNode(unref(RefreshCw), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("bookmark.refresh")), 1)], 8, _hoisted_10$8)) : createCommentVNode("", true),
							a.value.url ? (openBlock(), createElementBlock("a", {
								key: 2,
								class: "wy-menu-item",
								role: "menuitem",
								href: a.value.url,
								target: "_blank",
								rel: "noopener noreferrer",
								onClick: _cache[6] || (_cache[6] = ($event) => (menu.value = false, open($event)))
							}, [createVNode(unref(ExternalLink), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("bookmark.open")), 1)], 8, _hoisted_11$6)) : createCommentVNode("", true)
						]),
						_: 1
					}, 8, ["open"])]),
					default: withCtx(() => [unref(editing) || !a.value.url ? (openBlock(), createElementBlock("form", {
						key: 0,
						class: "wy-url-form",
						contenteditable: "false",
						"data-block-portal": "",
						onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
						onSubmit: withModifiers(submit, ["prevent"])
					}, [withDirectives(createElementVNode("input", {
						ref_key: "input",
						ref: input,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => draft.value = $event),
						class: "wy-input",
						type: "url",
						inputmode: "url",
						autocomplete: "off",
						spellcheck: "false",
						placeholder: unref(t)("bookmark.placeholder"),
						"aria-label": unref(t)("bookmark.url"),
						readonly: unref(readonly),
						onKeydown: withKeys(withModifiers(cancel, ["prevent", "stop"]), ["esc"])
					}, null, 40, _hoisted_1$32), [[vModelText, draft.value]]), createElementVNode("button", {
						type: "submit",
						class: "wy-btn is-primary",
						disabled: !unref(loneUrl)(unref(normalizeHref)(draft.value))
					}, toDisplayString(unref(t)("bookmark.create")), 9, _hoisted_2$27)], 32)) : (openBlock(), createElementBlock("a", {
						key: 1,
						class: normalizeClass(["wy-bookmark-card", { "is-loading": loading.value }]),
						href: a.value.url,
						target: "_blank",
						rel: "noopener noreferrer",
						contenteditable: "false",
						draggable: "false",
						onClick: open
					}, [createElementVNode("span", _hoisted_4$24, [
						createElementVNode("span", _hoisted_5$22, toDisplayString(loading.value && !a.value.title ? unref(t)("bookmark.loading") : title.value), 1),
						a.value.description ? (openBlock(), createElementBlock("span", _hoisted_6$16, toDisplayString(a.value.description), 1)) : createCommentVNode("", true),
						createElementVNode("span", _hoisted_7$12, [a.value.icon && !failedIcon.value ? (openBlock(), createElementBlock("img", {
							key: 0,
							class: "wy-bookmark-favicon",
							src: a.value.icon,
							alt: "",
							onError: _cache[2] || (_cache[2] = ($event) => failedIcon.value = true)
						}, null, 40, _hoisted_8$11)) : (openBlock(), createBlock(unref(Globe), {
							key: 1,
							size: 14,
							"aria-hidden": "true"
						})), createElementVNode("span", null, toDisplayString(a.value.url), 1)])
					]), a.value.image && !failedImage.value ? (openBlock(), createElementBlock("img", {
						key: 0,
						class: "wy-bookmark-image",
						src: a.value.image,
						alt: "",
						loading: "lazy",
						onError: _cache[3] || (_cache[3] = ($event) => failedImage.value = true)
					}, null, 40, _hoisted_9$9)) : createCommentVNode("", true)], 10, _hoisted_3$27))]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"editing",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/builtins/fenceText.ts
/** a fence info value on one line without `"` (the info syntax cannot quote it) or a backtick (it would end the fence) */
function infoText(v) {
	return String(v ?? "").replace(/\s+/g, " ").replace(/["`]/g, "'").trim();
}
/** an address in a fence info value: whitespace, quotes and backticks percent-encoded */
function infoUrl(v) {
	return String(v ?? "").trim().replace(/[\s"`]/g, (c) => encodeURIComponent(c));
}
function stringAttr(name) {
	return {
		default: "",
		parseHTML: (dom) => dom.getAttribute(`data-${name}`) ?? "",
		renderHTML: (a) => a[name] ? { [`data-${name}`]: String(a[name]) } : {}
	};
}
// src/builtins/bookmark.ts
var BOOKMARK_FIELDS = [
	"url",
	"title",
	"description",
	"image",
	"icon",
	"site"
];
var URL_FIELDS = {
	url: true,
	image: true,
	icon: true
};
function siteName(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}
var bookmarkExtension = {
	name: "bookmark",
	tiptap: [Node$1.create({
		name: "bookmark",
		group: "block",
		atom: true,
		draggable: false,
		selectable: true,
		addAttributes() {
			return Object.fromEntries(BOOKMARK_FIELDS.map((f) => [f, stringAttr(f)]));
		},
		parseHTML() {
			return [{ tag: "div[data-type=\"bookmark\"]" }];
		},
		renderHTML({ HTMLAttributes, node }) {
			const a = node.attrs;
			const text = [
				"span",
				{ class: "wy-bookmark-text" },
				[
					"span",
					{ class: "wy-bookmark-title" },
					a.title || a.url
				]
			];
			if (a.description) text.push([
				"span",
				{ class: "wy-bookmark-desc" },
				a.description
			]);
			text.push([
				"span",
				{ class: "wy-bookmark-url" },
				a.url
			]);
			const link = [
				"a",
				{
					href: a.url,
					target: "_blank",
					rel: "noopener noreferrer",
					class: "wy-bookmark-card"
				},
				text
			];
			if (a.image) link.push(["img", {
				src: a.image,
				alt: "",
				class: "wy-bookmark-image",
				loading: "lazy"
			}]);
			return [
				"div",
				mergeAttributes({
					"data-type": "bookmark",
					class: "wy-bookmark"
				}, HTMLAttributes),
				link
			];
		}
	})],
	nodeViews: { bookmark: BookmarkView_default },
	markdown: {
		fences: [{
			kind: "bookmark",
			parse: (ctx) => {
				const a = ctx.info.attrs;
				const body = ctx.body.trim();
				ctx.atom("bookmark", {
					...a,
					url: a.url ?? (/^\S+$/.test(body) ? body : "")
				});
			}
		}],
		tokens: { bookmark: {
			node: "bookmark",
			getAttrs: (tok) => Object.fromEntries(BOOKMARK_FIELDS.map((f) => [f, String(tok.meta[f] ?? "")]))
		} },
		nodes: { bookmark(state, node, _parent, _index, h) {
			const attrs = Object.fromEntries(BOOKMARK_FIELDS.map((f) => [f, URL_FIELDS[f] ? infoUrl(node.attrs[f]) : infoText(node.attrs[f])]));
			h.writeFence(state, node, formatInfo("bookmark", attrs), "");
		} }
	},
	slash: [{
		id: "bookmark",
		group: "media",
		rank: 30,
		label: "",
		icon: Bookmark,
		keywords: "link preview card url",
		run: (c) => c.insert("bookmark", {})
	}]
};
// src/nodes/EmbedView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$31 = [
	"placeholder",
	"aria-label",
	"readonly",
	"onKeydown"
];
var _hoisted_2$26 = ["disabled"];
var _hoisted_3$26 = ["data-provider"];
var _hoisted_4$23 = [
	"src",
	"sandbox",
	"title"
];
var _hoisted_5$21 = ["aria-label"];
var _hoisted_6$15 = ["aria-label"];
var _hoisted_7$11 = {
	key: 2,
	class: "wy-embed-shield",
	"aria-hidden": "true"
};
var _hoisted_8$10 = ["href"];
var _hoisted_9$8 = ["href"];
// src/nodes/EmbedView.vue
var EmbedView_default = /* @__PURE__ */ defineComponent({
	__name: "EmbedView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const t = contextOf(props.editor).t;
		const { selected, editing, startEdit, finishEdit, stopEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
		const menu = ref(false);
		const input = ref(null);
		const draft = ref("");
		const url = computed(() => props.node.attrs.url ?? "");
		const target = computed(() => embedFor(url.value));
		const provider = computed(() => target.value?.provider ?? "generic");
		const height = computed(() => props.node.attrs.height ?? EMBED_HEIGHTS[provider.value]);
		const live = ref(null);
		const shown = computed(() => live.value ?? height.value);
		const interactive = computed(() => readonly.value || selected.value);
		watch(editing, async (on) => {
			if (!on) return;
			draft.value = url.value;
			await nextTick();
			input.value?.focus();
			input.value?.select();
		}, { immediate: true });
		function submit() {
			const next = normalizeHref(draft.value);
			if (!embedFor(next)) return;
			update(embedAttrs(next, { height: next === url.value ? props.node.attrs.height : null }));
			finishEdit();
		}
		function cancel() {
			if (!url.value) remove();
			else stopEdit();
		}
		function select() {
			const pos = props.getPos();
			if (typeof pos === "number") props.editor.commands.setNodeSelection(pos);
		}
		let startY = 0;
		let startH = 0;
		function onResizeDown(e) {
			if (e.button !== 0) return;
			e.preventDefault();
			const frame = e.currentTarget.parentElement.querySelector(".wy-embed-frame");
			startY = e.clientY;
			startH = frame.getBoundingClientRect().height;
			live.value = Math.round(startH);
			e.currentTarget.setPointerCapture(e.pointerId);
		}
		function onResizeMove(e) {
			if (live.value === null) return;
			live.value = Math.round(Math.min(EMBED_MAX_HEIGHT, Math.max(120, startH + e.clientY - startY)));
		}
		function onResizeUp() {
			if (live.value === null) return;
			const h = live.value;
			live.value = null;
			if (h !== props.node.attrs.height) update({ height: h });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-embed"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)(`embed.providers.${provider.value}`),
					selected: unref(selected),
					editing: unref(editing),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[7] || (_cache[7] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						onClose: _cache[6] || (_cache[6] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [
							url.value && !unref(readonly) ? (openBlock(), createElementBlock("button", {
								key: 0,
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								onClick: _cache[3] || (_cache[3] = ($event) => (menu.value = false, unref(startEdit)()))
							}, [createVNode(unref(Pencil), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("embed.edit")), 1)])) : createCommentVNode("", true),
							url.value ? (openBlock(), createElementBlock("a", {
								key: 1,
								class: "wy-menu-item",
								role: "menuitem",
								href: url.value,
								target: "_blank",
								rel: "noopener noreferrer",
								onClick: _cache[4] || (_cache[4] = ($event) => menu.value = false)
							}, [createVNode(unref(ExternalLink), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("embed.open")), 1)], 8, _hoisted_9$8)) : createCommentVNode("", true),
							_ctx.node.attrs.height && !unref(readonly) ? (openBlock(), createElementBlock("button", {
								key: 2,
								type: "button",
								class: "wy-menu-item",
								role: "menuitem",
								onClick: _cache[5] || (_cache[5] = ($event) => (unref(update)({ height: null }), menu.value = false))
							}, toDisplayString(unref(t)("embed.defaultHeight")), 1)) : createCommentVNode("", true)
						]),
						_: 1
					}, 8, ["open"])]),
					default: withCtx(() => [unref(editing) || !url.value ? (openBlock(), createElementBlock("form", {
						key: 0,
						class: "wy-url-form",
						contenteditable: "false",
						"data-block-portal": "",
						onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
						onSubmit: withModifiers(submit, ["prevent"])
					}, [withDirectives(createElementVNode("input", {
						ref_key: "input",
						ref: input,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => draft.value = $event),
						class: "wy-input",
						type: "url",
						inputmode: "url",
						autocomplete: "off",
						spellcheck: "false",
						placeholder: unref(t)("embed.placeholder"),
						"aria-label": unref(t)("embed.url"),
						readonly: unref(readonly),
						onKeydown: withKeys(withModifiers(cancel, ["prevent", "stop"]), ["esc"])
					}, null, 40, _hoisted_1$31), [[vModelText, draft.value]]), createElementVNode("button", {
						type: "submit",
						class: "wy-btn is-primary",
						disabled: !unref(embedFor)(unref(normalizeHref)(draft.value))
					}, toDisplayString(unref(t)("embed.create")), 9, _hoisted_2$26)], 32)) : target.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: "wy-embed",
						"data-provider": provider.value,
						contenteditable: "false"
					}, [
						createElementVNode("iframe", {
							class: normalizeClass(["wy-embed-frame", { "is-video": shown.value === null }]),
							src: target.value.src,
							style: normalizeStyle(shown.value !== null ? { height: `${shown.value}px` } : void 0),
							sandbox: unref(embedSandbox)(target.value.src),
							allow: "fullscreen; picture-in-picture; encrypted-media; clipboard-write",
							referrerpolicy: "strict-origin-when-cross-origin",
							loading: "lazy",
							title: unref(t)(`embed.providers.${provider.value}`)
						}, null, 14, _hoisted_4$23),
						!interactive.value ? (openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: "wy-embed-overlay",
							"aria-label": unref(t)("embed.interact"),
							onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
							onClick: select
						}, null, 40, _hoisted_5$21)) : createCommentVNode("", true),
						!unref(readonly) ? withDirectives((openBlock(), createElementBlock("div", {
							key: 1,
							class: "wy-embed-resize",
							role: "separator",
							"aria-orientation": "horizontal",
							"aria-label": unref(t)("embed.resize"),
							onPointerdown: onResizeDown,
							onPointermove: onResizeMove,
							onPointerup: onResizeUp,
							onPointercancel: onResizeUp
						}, null, 40, _hoisted_6$15)), [[unref(vTooltip), unref(t)("embed.resize")]]) : createCommentVNode("", true),
						live.value !== null ? (openBlock(), createElementBlock("div", _hoisted_7$11)) : createCommentVNode("", true)
					], 8, _hoisted_3$26)) : (openBlock(), createElementBlock("a", {
						key: 2,
						class: "wy-embed-fallback",
						href: url.value,
						target: "_blank",
						rel: "noopener noreferrer",
						contenteditable: "false"
					}, toDisplayString(url.value), 9, _hoisted_8$10))]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"editing",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/builtins/embed.ts
function parseEmbedHeight(v) {
	const s = String(v ?? "");
	if (!/^\d+$/.test(s)) return null;
	return Math.min(EMBED_MAX_HEIGHT, Math.max(120, Number(s)));
}
function provider(v, url) {
	return EMBED_PROVIDERS.includes(v) ? v : embedFor(url)?.provider ?? "generic";
}
/** attributes of an embed of `url`; `src` is always derived again, so a stored document cannot point the iframe elsewhere */
function embedAttrs(url, stored = {}) {
	const target = embedFor(url);
	return {
		url,
		src: target?.src ?? "",
		provider: stored.provider === void 0 ? target?.provider ?? "generic" : provider(stored.provider, url),
		height: parseEmbedHeight(stored.height)
	};
}
var embedExtension = {
	name: "embed",
	tiptap: [Node$1.create({
		name: "embed",
		group: "block",
		atom: true,
		draggable: false,
		selectable: true,
		addAttributes() {
			return {
				url: {
					default: "",
					parseHTML: (dom) => dom.getAttribute("data-url") ?? "",
					renderHTML: (a) => ({ "data-url": a.url })
				},
				src: {
					default: "",
					parseHTML: (dom) => embedFor(dom.getAttribute("data-url") ?? "")?.src ?? "",
					renderHTML: () => ({})
				},
				provider: {
					default: "generic",
					parseHTML: (dom) => provider(dom.getAttribute("data-provider"), dom.getAttribute("data-url") ?? ""),
					renderHTML: (a) => ({ "data-provider": a.provider })
				},
				height: {
					default: null,
					parseHTML: (dom) => parseEmbedHeight(dom.getAttribute("data-height")),
					renderHTML: (a) => a.height ? { "data-height": String(a.height) } : {}
				}
			};
		},
		parseHTML() {
			return [{ tag: "div[data-type=\"embed\"]" }];
		},
		renderHTML({ HTMLAttributes, node }) {
			const { src, height } = node.attrs;
			const attrs = mergeAttributes({
				"data-type": "embed",
				class: "wy-embed"
			}, HTMLAttributes);
			if (!src) return [
				"div",
				attrs,
				[
					"a",
					{
						href: node.attrs.url,
						target: "_blank",
						rel: "noopener noreferrer"
					},
					node.attrs.url
				]
			];
			return [
				"div",
				attrs,
				["iframe", {
					src,
					sandbox: embedSandbox(src),
					allow: "fullscreen; picture-in-picture; encrypted-media; clipboard-write",
					referrerpolicy: "strict-origin-when-cross-origin",
					loading: "lazy",
					style: height ? `height: ${height}px` : null
				}]
			];
		}
	})],
	nodeViews: { embed: EmbedView_default },
	markdown: {
		fences: [{
			kind: "embed",
			parse: (ctx) => ctx.atom("embed", embedAttrs(ctx.info.attrs.url ?? ctx.body.trim(), {
				provider: ctx.info.attrs.provider,
				height: ctx.info.attrs.height
			}))
		}],
		tokens: { embed: {
			node: "embed",
			getAttrs: (tok) => ({
				url: tok.meta.url,
				src: tok.meta.src,
				provider: tok.meta.provider,
				height: tok.meta.height
			})
		} },
		nodes: { embed(state, node, _parent, _index, h) {
			const height = node.attrs.height;
			h.writeFence(state, node, formatInfo("embed", {
				url: infoUrl(node.attrs.url),
				provider: String(node.attrs.provider ?? ""),
				height: height ? String(height) : ""
			}), "");
		} }
	},
	slash: [{
		id: "embed",
		group: "media",
		rank: 40,
		label: "",
		icon: AppWindow,
		keywords: "iframe youtube vimeo loom figma gist map tweet codepen video",
		run: (c) => c.insert("embed", {})
	}]
};
// src/components/PalettePicker.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$30 = { class: "wy-palette" };
var _hoisted_2$25 = { class: "wy-menu-heading" };
var _hoisted_3$25 = ["aria-label"];
var _hoisted_4$22 = [
	"aria-label",
	"aria-pressed",
	"onClick"
];
var _hoisted_5$20 = {
	key: 1,
	"aria-hidden": "true"
};
// src/components/PalettePicker.vue
var PalettePicker_default = /* @__PURE__ */ defineComponent({
	__name: "PalettePicker",
	props: {
		value: {},
		t: {},
		text: {
			type: Boolean,
			default: true
		}
	},
	emits: ["pick"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const rows = [{
			heading: "palette.background",
			tokens: PALETTE.map((p) => `${p}_bg`)
		}, ...props.text ? [{
			heading: "palette.text",
			tokens: [...PALETTE]
		}] : []];
		const name = (token) => props.t(`palette.${token.replace(/_bg$/, "")}`);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$30, [(openBlock(), createElementBlock(Fragment$1, null, renderList(rows, (row) => {
				return openBlock(), createElementBlock(Fragment$1, { key: row.heading }, [createElementVNode("div", _hoisted_2$25, toDisplayString(__props.t(row.heading)), 1), createElementVNode("div", {
					class: "wy-palette-row",
					role: "group",
					"aria-label": __props.t(row.heading)
				}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(row.tokens, (token) => {
					return withDirectives((openBlock(), createElementBlock("button", {
						key: token,
						type: "button",
						class: normalizeClass(["wy-swatch", token.endsWith("_bg") ? "is-bg" : "is-text"]),
						style: normalizeStyle(token.endsWith("_bg") ? { background: unref(paletteCss)(token) } : { color: unref(paletteCss)(token) }),
						"aria-label": name(token),
						"aria-pressed": token === __props.value,
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: ($event) => emit("pick", token)
					}, [token === __props.value ? (openBlock(), createBlock(unref(Check), {
						key: 0,
						size: 14
					})) : !token.endsWith("_bg") ? (openBlock(), createElementBlock("span", _hoisted_5$20, "A")) : createCommentVNode("", true)], 46, _hoisted_4$22)), [[unref(vTooltip), name(token)]]);
				}), 128))], 8, _hoisted_3$25)], 64);
			}), 64)), __props.value ? (openBlock(), createElementBlock("button", {
				key: 0,
				type: "button",
				class: "wy-menu-item",
				onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["prevent"])),
				onClick: _cache[2] || (_cache[2] = ($event) => emit("pick", null))
			}, toDisplayString(__props.t("palette.default")), 33)) : createCommentVNode("", true)]);
		};
	}
});
// src/nodes/TocView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$29 = ["aria-label"];
var _hoisted_2$24 = {
	key: 0,
	class: "wy-toc-empty"
};
var _hoisted_3$24 = ["href", "onClick"];
// src/nodes/TocView.vue
var TocView_default = /* @__PURE__ */ defineComponent({
	__name: "TocView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const t = contextOf(props.editor).t;
		const { selected, update, remove, copyText, readonly } = useBlockNode(props);
		const menu = ref(false);
		const entries = shallowRef(tocEntries(props.editor.state.doc));
		const top = computed(() => Math.min(...entries.value.map((e) => e.level), 6));
		const color = computed(() => props.node.attrs.color ?? null);
		const style = computed(() => {
			const c = color.value;
			if (!c) return void 0;
			return c.endsWith("_bg") ? { background: paletteCss(c) } : { "--wy-toc-color": paletteCss(c) };
		});
		function refresh({ transaction }) {
			if (transaction.docChanged) entries.value = tocEntries(props.editor.state.doc);
		}
		props.editor.on("transaction", refresh);
		onBeforeUnmount(() => props.editor.off("transaction", refresh));
		function go(e, ev) {
			ev.preventDefault();
			const dom = props.editor.view.nodeDOM(e.pos);
			if (dom instanceof HTMLElement) dom.scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-toc"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)("toc.label"),
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[3] || (_cache[3] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						onClose: _cache[2] || (_cache[2] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [createVNode(PalettePicker_default, {
							value: color.value,
							t: unref(t),
							onPick: _cache[1] || (_cache[1] = ($event) => unref(update)({ color: $event }))
						}, null, 8, ["value", "t"])]),
						_: 1
					}, 8, ["open"])]),
					default: withCtx(() => [createElementVNode("nav", {
						class: normalizeClass(["wy-toc", { "has-bg": color.value?.endsWith("_bg") }]),
						style: normalizeStyle(style.value),
						"aria-label": unref(t)("toc.label"),
						contenteditable: "false"
					}, [!entries.value.length ? (openBlock(), createElementBlock("p", _hoisted_2$24, toDisplayString(unref(t)("toc.empty")), 1)) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment$1, null, renderList(entries.value, (e) => {
						return openBlock(), createElementBlock("a", {
							key: e.pos,
							class: "wy-toc-item",
							href: `#${e.text}`,
							style: normalizeStyle({ "--wy-toc-depth": e.level - top.value }),
							onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
							onClick: ($event) => go(e, $event)
						}, toDisplayString(e.text), 45, _hoisted_3$24);
					}), 128))], 14, _hoisted_1$29)]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/builtins/toc.ts
/** headings and toggle headings in document order */
function tocEntries(doc) {
	const out = [];
	doc.descendants((node, pos) => {
		if (node.type.name === "heading") {
			if (node.textContent.trim()) out.push({
				pos,
				level: node.attrs.level,
				text: node.textContent.trim()
			});
			return false;
		}
		if (node.type.name === "details" && node.attrs.heading && String(node.attrs.title ?? "").trim()) out.push({
			pos,
			level: node.attrs.heading,
			text: String(node.attrs.title).trim()
		});
		return !node.isTextblock;
	});
	return out;
}
/** `{color=…}` on the line after an atom fence */
function writeColorLine(state, node) {
	const attrs = formatBlockAttrs({ color: node.attrs.color });
	if (!attrs) return;
	state.flushClose(1);
	state.write(attrs);
	state.closeBlock(node);
}
var tocExtension = {
	name: "tableOfContents",
	tiptap: [Node$1.create({
		name: "tableOfContents",
		group: "block",
		atom: true,
		draggable: false,
		selectable: true,
		addAttributes() {
			return { color: paletteAttribute() };
		},
		parseHTML() {
			return [{ tag: "nav[data-type=\"toc\"]" }];
		},
		renderHTML({ HTMLAttributes }) {
			return ["nav", mergeAttributes({
				"data-type": "toc",
				class: "wy-toc"
			}, HTMLAttributes)];
		}
	})],
	nodeViews: { tableOfContents: TocView_default },
	markdown: {
		fences: [{
			kind: "toc",
			parse: (ctx) => ctx.atom("table_of_contents", {})
		}],
		tokens: { table_of_contents: {
			node: "tableOfContents",
			getAttrs: (tok) => ({ color: tok.meta.blockAttrs?.color ?? null })
		} },
		nodes: { tableOfContents(state, node, _parent, _index, h) {
			h.writeFence(state, node, "toc", "");
			writeColorLine(state, node);
		} }
	},
	slash: [{
		id: "tableOfContents",
		group: "blocks",
		rank: 40,
		label: "",
		icon: ListTree,
		keywords: "toc contents outline headings",
		run: (c) => c.insert("tableOfContents", {})
	}]
};
// src/nodes/PageLinkView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$28 = ["href"];
var _hoisted_2$23 = {
	class: "wy-page-link-icon",
	"aria-hidden": "true"
};
var _hoisted_3$23 = ["src"];
var _hoisted_4$21 = { class: "wy-page-link-title" };
// src/nodes/PageLinkView.vue
var PageLinkView_default = /* @__PURE__ */ defineComponent({
	__name: "PageLinkView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const { selected, update, remove, copyText, readonly } = useBlockNode(props);
		const menu = ref(false);
		const resolved = ref(null);
		const href = computed(() => props.node.attrs.href ?? "");
		const title = computed(() => resolved.value?.title || props.node.attrs.title || href.value || t("pageLink.untitled"));
		const icon = computed(() => resolved.value?.icon || props.node.attrs.icon || "");
		const isImage = computed(() => /^(https?:|\/|data:image\/|blob:)/.test(icon.value));
		const color = computed(() => props.node.attrs.color ?? null);
		const style = computed(() => {
			const c = color.value;
			if (!c) return void 0;
			return c.endsWith("_bg") ? { background: paletteCss(c) } : { color: paletteCss(c) };
		});
		watch(href, async (h) => {
			resolved.value = null;
			const r = await resolveOnce(ctx.services, h);
			if (h === href.value) resolved.value = r;
		}, { immediate: true });
		function open(e) {
			followLink(ctx.services, href.value, e, true);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-page-link"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)("pageLink.label"),
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[2] || (_cache[2] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						onClose: _cache[1] || (_cache[1] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [createVNode(PalettePicker_default, {
							value: color.value,
							t: unref(t),
							onPick: _cache[0] || (_cache[0] = ($event) => unref(update)({ color: $event }))
						}, null, 8, ["value", "t"])]),
						_: 1
					}, 8, ["open"])]),
					default: withCtx(() => [createElementVNode("a", {
						class: normalizeClass(["wy-page-link", { "has-bg": color.value?.endsWith("_bg") }]),
						href: href.value,
						style: normalizeStyle(style.value),
						contenteditable: "false",
						draggable: "false",
						onClick: open
					}, [createElementVNode("span", _hoisted_2$23, [icon.value && isImage.value ? (openBlock(), createElementBlock("img", {
						key: 0,
						src: icon.value,
						alt: ""
					}, null, 8, _hoisted_3$23)) : icon.value ? (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [createTextVNode(toDisplayString(icon.value), 1)], 64)) : (openBlock(), createBlock(unref(FileText), {
						key: 2,
						size: 18
					}))]), createElementVNode("span", _hoisted_4$21, toDisplayString(title.value), 1)], 14, _hoisted_1$28)]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/components/SuggestionList.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$27 = ["aria-label", "aria-busy"];
var _hoisted_2$22 = {
	key: 0,
	class: "wy-menu-heading",
	role: "presentation"
};
var _hoisted_3$22 = [
	"aria-selected",
	"data-index",
	"onMouseenter",
	"onClick"
];
var _hoisted_4$20 = {
	class: "wy-suggest-icon",
	"aria-hidden": "true"
};
var _hoisted_5$19 = ["src"];
var _hoisted_6$14 = { key: 2 };
var _hoisted_7$10 = { class: "wy-suggest-text" };
var _hoisted_8$9 = { class: "wy-suggest-title" };
var _hoisted_9$7 = {
	key: 0,
	class: "wy-suggest-detail"
};
var _hoisted_10$7 = {
	key: 0,
	class: "wy-menu-hint"
};
// src/components/SuggestionList.vue
var SuggestionList_default = /* @__PURE__ */ defineComponent({
	__name: "SuggestionList",
	props: {
		items: {},
		loading: {
			type: Boolean,
			default: false
		},
		empty: { default: "" },
		label: { default: "" }
	},
	emits: ["pick"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const active = ref(0);
		const list = ref(null);
		const rows = computed(() => props.items.map((item, index) => ({
			item,
			index,
			heading: item.group && item.group !== props.items[index - 1]?.group ? item.group : ""
		})));
		watch(() => props.items, () => active.value = 0);
		const isImage = (icon) => /^(https?:|\/|data:image\/|blob:)/.test(icon);
		async function reveal() {
			await nextTick();
			list.value?.querySelector(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
		}
		function onKeyDown(e) {
			const n = props.items.length;
			if (!n) return false;
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				active.value = (active.value + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
				reveal();
				return true;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				const item = props.items[active.value];
				if (item) emit("pick", item);
				return true;
			}
			return false;
		}
		__expose({ onKeyDown });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "list",
				ref: list,
				class: "wy-suggest",
				role: "listbox",
				"aria-label": __props.label || void 0,
				"aria-busy": __props.loading || void 0
			}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(rows.value, ({ item, index, heading }) => {
				return openBlock(), createElementBlock(Fragment$1, { key: item.key }, [heading ? (openBlock(), createElementBlock("div", _hoisted_2$22, toDisplayString(heading), 1)) : createCommentVNode("", true), createElementVNode("button", {
					type: "button",
					role: "option",
					class: normalizeClass(["wy-menu-item wy-suggest-item", { "is-active": index === active.value }]),
					"aria-selected": index === active.value,
					"data-index": index,
					onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
					onMouseenter: ($event) => active.value = index,
					onClick: ($event) => emit("pick", item)
				}, [createElementVNode("span", _hoisted_4$20, [item.icon && typeof item.icon !== "string" ? (openBlock(), createBlock(resolveDynamicComponent(item.icon), {
					key: 0,
					size: 18
				})) : item.icon && isImage(item.icon) ? (openBlock(), createElementBlock("img", {
					key: 1,
					src: item.icon,
					alt: ""
				}, null, 8, _hoisted_5$19)) : item.icon ? (openBlock(), createElementBlock("span", _hoisted_6$14, toDisplayString(item.icon), 1)) : createCommentVNode("", true)]), createElementVNode("span", _hoisted_7$10, [createElementVNode("span", _hoisted_8$9, toDisplayString(item.title), 1), item.detail ? (openBlock(), createElementBlock("span", _hoisted_9$7, toDisplayString(item.detail), 1)) : createCommentVNode("", true)])], 42, _hoisted_3$22)], 64);
			}), 128)), !__props.items.length && __props.empty ? (openBlock(), createElementBlock("p", _hoisted_10$7, toDisplayString(__props.empty), 1)) : createCommentVNode("", true)], 8, _hoisted_1$27);
		};
	}
});
// src/components/PageSearch.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$26 = ["placeholder", "aria-label"];
// src/components/PageSearch.vue
var PageSearch_default = /* @__PURE__ */ defineComponent({
	__name: "PageSearch",
	props: {
		search: { type: Function },
		placeholder: {},
		empty: {},
		searching: {},
		label: {}
	},
	emits: ["pick", "close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const root = ref(null);
		const input = ref(null);
		const list = ref(null);
		const query = ref("");
		const items = ref([]);
		const loading = ref(false);
		let timer = 0;
		let abort = null;
		function run() {
			window.clearTimeout(timer);
			abort?.abort();
			loading.value = true;
			timer = window.setTimeout(async () => {
				const ctrl = abort = new AbortController();
				try {
					const found = await props.search(query.value.trim(), ctrl.signal);
					if (!ctrl.signal.aborted) items.value = found;
				} catch {
					if (!ctrl.signal.aborted) items.value = [];
				} finally {
					if (!ctrl.signal.aborted) loading.value = false;
				}
			}, 150);
		}
		function onKey(e) {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				emit("close");
				return;
			}
			if (list.value?.onKeyDown(e)) e.preventDefault();
		}
		function onDocDown(e) {
			if (root.value && !root.value.contains(e.target)) emit("close");
		}
		onMounted(async () => {
			document.addEventListener("mousedown", onDocDown, true);
			run();
			await nextTick();
			input.value?.focus();
		});
		onBeforeUnmount(() => {
			window.clearTimeout(timer);
			abort?.abort();
			document.removeEventListener("mousedown", onDocDown, true);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "root",
				ref: root,
				class: "wy-menu wy-page-search",
				contenteditable: "false"
			}, [withDirectives(createElementVNode("input", {
				ref_key: "input",
				ref: input,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => query.value = $event),
				class: "wy-input is-sm",
				type: "search",
				autocomplete: "off",
				spellcheck: "false",
				placeholder: __props.placeholder,
				"aria-label": __props.label,
				onInput: run,
				onKeydown: onKey
			}, null, 40, _hoisted_1$26), [[vModelText, query.value]]), createVNode(SuggestionList_default, {
				ref_key: "list",
				ref: list,
				items: items.value,
				loading: loading.value,
				empty: loading.value ? __props.searching : __props.empty,
				label: __props.label,
				onPick: _cache[1] || (_cache[1] = ($event) => emit("pick", $event))
			}, null, 8, [
				"items",
				"loading",
				"empty",
				"label"
			])], 512);
		};
	}
});
// src/core/mentions.ts
var DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/;
var ID_RE = /^[^\s()\\]+$/;
function isMentionDate(v) {
	return typeof v === "string" && DATE_RE.test(v);
}
/** the target in `@[label](<target>)`: `user:<id>`, `page:<id>`, `date:<start>` or `date:<start>/<end>` */
function mentionTarget(a) {
	if (a.kind === "date") {
		if (!isMentionDate(a.start)) return null;
		return `date:${a.start}${isMentionDate(a.end) ? `/${a.end}` : ""}`;
	}
	return (a.kind === "user" || a.kind === "page") && ID_RE.test(a.id) ? `${a.kind}:${a.id}` : null;
}
function parseMentionTarget(target) {
	const m = /^(user|page|date):(.+)$/.exec(target);
	if (!m) return null;
	const kind = m[1];
	const value = m[2];
	if (kind !== "date") return ID_RE.test(value) ? {
		kind,
		id: value,
		start: null,
		end: null
	} : null;
	const [start, end, extra] = value.split("/");
	if (extra !== void 0 || !isMentionDate(start) || end !== void 0 && !isMentionDate(end)) return null;
	return {
		kind,
		id: "",
		start,
		end: end ?? null
	};
}
function escapeMentionLabel(label) {
	return label.replace(/[\\[\]]/g, "\\$&").replace(/\s*\n\s*/g, " ");
}
function mentionMarkdown(a) {
	const target = mentionTarget(a);
	return target ? `@[${escapeMentionLabel(a.label)}](${target})` : null;
}
/** inline rule for `@[label](kind:value)`; must run before `link` */
function mentionRule(state, silent) {
	const src = state.src;
	const at = state.pos;
	if (src.charCodeAt(at) !== 64 || src.charCodeAt(at + 1) !== 91) return false;
	let label = "";
	let i = at + 2;
	for (; i < state.posMax; i++) {
		const ch = src[i];
		if (ch === "\\" && i + 1 < state.posMax) {
			label += src[++i];
			continue;
		}
		if (ch === "]" || ch === "\n") break;
		if (ch === "[") return false;
		label += ch;
	}
	if (src[i] !== "]" || src[i + 1] !== "(") return false;
	const close = src.indexOf(")", i + 2);
	if (close < 0 || close > state.posMax) return false;
	const parsed = parseMentionTarget(src.slice(i + 2, close));
	if (!parsed) return false;
	if (!silent) state.push("mention", "span", 0).meta = {
		...parsed,
		label
	};
	state.pos = close + 1;
	return true;
}
function parseDate(v) {
	const [d, t] = v.split("T");
	const [y, m, day] = d.split("-").map(Number);
	const [hh, mm] = (t ?? "0:0").split(":").map(Number);
	return {
		date: new Date(y, m - 1, day, hh, mm),
		time: t !== void 0
	};
}
/**
* "May 1, 2024", "May 1, 2024, 10:00 AM" or a range of them joined by " → ", in the editor's locale. date and
* time are formatted apart and joined by ", " with plain spaces: engines differ in how they join them ("at" in
* Safari) and in the space before AM, and an importer has to write the same label
*/
function dateLabel(start, end, locale) {
	const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
	const hour = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
	const fmt = (v) => {
		const { date, time } = parseDate(v);
		return (time ? `${day.format(date)}, ${hour.format(date)}` : day.format(date)).replace(/\s/g, " ");
	};
	return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}
function isoDate(d) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** `/p/{id}` style template with the id filled in */
function pageHref(template, id) {
	return template.replace("{id}", encodeURIComponent(id));
}
// src/editor/mentionItems.ts
var MENTION_ICONS = {
	user: User,
	page: FileText,
	date: CalendarDays
};
function mentionEntry(s, ctx) {
	return {
		key: `${s.kind}:${s.id || s.start || s.label}`,
		title: s.label,
		detail: s.detail,
		icon: s.icon || MENTION_ICONS[s.kind],
		group: ctx.t(`mention.groups.${s.kind}`),
		suggestion: s
	};
}
/** today, tomorrow, yesterday and an ISO date typed as the query */
function dateSuggestions(query, ctx) {
	const q = query.trim().toLowerCase();
	const day = (offset) => {
		const d = /* @__PURE__ */ new Date();
		d.setDate(d.getDate() + offset);
		return isoDate(d);
	};
	const out = [
		{
			name: ctx.t("mention.today"),
			start: day(0)
		},
		{
			name: ctx.t("mention.tomorrow"),
			start: day(1)
		},
		{
			name: ctx.t("mention.yesterday"),
			start: day(-1)
		}
	].filter((n) => !q || n.name.toLowerCase().startsWith(q)).map((n) => ({
		kind: "date",
		id: "",
		label: dateLabel(n.start, null, ctx.locale),
		detail: n.name,
		start: n.start
	}));
	if (/^\d{4}-\d{2}-\d{2}$/.test(q) && !Number.isNaN(Date.parse(q))) out.unshift({
		kind: "date",
		id: "",
		label: dateLabel(q, null, ctx.locale),
		start: q
	});
	return out;
}
/** host results (users and pages) after the matching dates; aborted searches resolve to [] */
async function searchMentions(services, query, kind, signal, ctx) {
	const dates = kind === void 0 || kind === "date" ? dateSuggestions(query, ctx) : [];
	if (kind === "date" || !services.searchMentions) return dates;
	try {
		const hits = (await services.searchMentions(query, kind, signal)).filter((s) => !kind || s.kind === kind).slice(0, 12);
		return signal.aborted ? [] : [
			...hits.filter((s) => s.kind === "user"),
			...hits.filter((s) => s.kind === "page"),
			...dates
		];
	} catch {
		return signal.aborted ? [] : dates;
	}
}
// src/editor/popup.ts
/** a component floating at a caret rectangle, mounted in <body> like the slash menu */
function openPopup(editor, component, props, rect, placement = "bottom-start") {
	const renderer = new VueRenderer(component, {
		props,
		editor
	});
	const el = renderer.element;
	el.style.position = "fixed";
	el.style.zIndex = "1000";
	el.setAttribute("data-block-portal", "");
	el.classList.add("wy-menu");
	document.body.appendChild(el);
	const floating = floatNear({ getBoundingClientRect: () => rect() ?? new DOMRect() }, el, {
		placement,
		offset: 6,
		padding: 8,
		apply: (x, y) => {
			el.style.left = `${x}px`;
			el.style.top = `${y}px`;
		},
		room: (h) => el.style.setProperty("--wy-menu-room", `${Math.max(160, h)}px`)
	});
	let open = true;
	return {
		element: el,
		get ref() {
			return renderer.ref;
		},
		update(next) {
			if (!open) return;
			renderer.updateProps(next);
			floating.update();
		},
		reposition: () => floating.update(),
		close() {
			if (!open) return;
			open = false;
			floating.stop();
			renderer.destroy();
			el.remove();
		}
	};
}
/** the caret rectangle of a document position */
function caretRect(editor, pos) {
	return () => {
		if (editor.isDestroyed) return null;
		const at = Math.min(pos, editor.state.doc.content.size);
		try {
			const c = editor.view.coordsAtPos(at);
			return new DOMRect(c.left, c.top, 0, c.bottom - c.top);
		} catch {
			return null;
		}
	};
}
// src/editor/pageSearch.ts
var current = null;
/** "link to page": search pages and insert a pageLink block at `at` */
function openPageSearch(editor, at) {
	current?.close();
	const ctx = contextOf(editor);
	const close = () => {
		current?.close();
		current = null;
	};
	const pick = (entry) => {
		const s = entry.suggestion;
		close();
		const href = s.href ?? pageHref(ctx.config.base.pageHref, s.id);
		const pos = Math.min(at, editor.state.doc.content.size);
		editor.chain().focus().setTextSelection(pos).run();
		insertFresh(editor, "pageLink", {
			href,
			title: s.label,
			icon: s.icon && !/^(https?:|\/|data:|blob:)/.test(s.icon) ? s.icon : ""
		});
	};
	current = openPopup(editor, PageSearch_default, {
		search: async (q, signal) => (await searchMentions(ctx.services, q, "page", signal, ctx)).map((s) => mentionEntry(s, ctx)),
		placeholder: ctx.t("pageLink.searchPlaceholder"),
		empty: ctx.t("mention.empty"),
		searching: ctx.t("mention.searching"),
		label: ctx.t("pageLink.search"),
		onPick: pick,
		onClose: () => {
			close();
			editor.commands.focus();
		}
	}, caretRect(editor, at));
}
var pageLinkExtension = {
	name: "pageLink",
	tiptap: [Node$1.create({
		name: "pageLink",
		group: "block",
		atom: true,
		draggable: false,
		selectable: true,
		addAttributes() {
			return {
				href: stringAttr("href"),
				title: stringAttr("title"),
				icon: stringAttr("icon"),
				color: paletteAttribute()
			};
		},
		parseHTML() {
			return [{ tag: "div[data-type=\"page-link\"]" }];
		},
		renderHTML({ HTMLAttributes, node }) {
			const { href, title, icon } = node.attrs;
			const link = [
				"a",
				{
					href,
					class: "wy-page-link-anchor"
				},
				[
					"span",
					{
						class: "wy-page-link-icon",
						"aria-hidden": "true"
					},
					icon || "📄"
				],
				[
					"span",
					{ class: "wy-page-link-title" },
					title || href
				]
			];
			return [
				"div",
				mergeAttributes({
					"data-type": "page-link",
					class: "wy-page-link"
				}, HTMLAttributes),
				link
			];
		}
	})],
	nodeViews: { pageLink: PageLinkView_default },
	markdown: {
		fences: [{
			kind: "page",
			parse: (ctx) => {
				const a = ctx.info.attrs;
				ctx.atom("page_link", {
					href: a.href ?? "",
					title: a.title ?? "",
					icon: a.icon ?? ""
				});
			}
		}],
		tokens: { page_link: {
			node: "pageLink",
			getAttrs: (tok) => ({
				href: tok.meta.href,
				title: tok.meta.title,
				icon: tok.meta.icon,
				color: tok.meta.blockAttrs?.color ?? null
			})
		} },
		nodes: { pageLink(state, node, _parent, _index, h) {
			h.writeFence(state, node, formatInfo("page", {
				href: infoUrl(node.attrs.href),
				title: infoText(node.attrs.title),
				icon: infoText(node.attrs.icon).replace(/\s/g, "")
			}), "");
			writeColorLine(state, node);
		} }
	},
	slash: [{
		id: "pageLink",
		group: "blocks",
		rank: 45,
		label: "",
		icon: FileSymlink,
		keywords: "link to page subpage mention",
		enabled: (editor) => !!editor.storage.wysiwyg?.context?.services.searchMentions,
		run: (c) => {
			const at = c.range?.from ?? c.editor.state.selection.from;
			c.clear();
			openPageSearch(c.editor, at);
		}
	}]
};
// src/components/AnchoredPopover.vue
var AnchoredPopover_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AnchoredPopover",
	props: {
		anchor: {},
		side: { default: "bottom" },
		align: { default: "start" }
	},
	emits: ["escape"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const root = ref(null);
		const pos = ref({
			x: -9999,
			y: -9999
		});
		const room = ref(9999);
		let floating = null;
		function place() {
			floating?.update();
		}
		function bind() {
			floating?.stop();
			floating = null;
			if (!root.value || !props.anchor) return;
			floating = floatNear(props.anchor, root.value, {
				placement: props.align === "center" ? props.side : `${props.side}-${props.align}`,
				offset: 4,
				padding: 8,
				apply: (x, y) => pos.value = {
					x,
					y
				},
				room: (h) => room.value = h
			});
		}
		watch(() => props.anchor, bind);
		onMounted(bind);
		onBeforeUnmount(() => floating?.stop());
		__expose({
			place,
			el: root
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Teleport, { to: "body" }, [createElementVNode("div", mergeProps({
				ref_key: "root",
				ref: root
			}, _ctx.$attrs, {
				class: "wy-floating",
				style: {
					left: `${pos.value.x}px`,
					top: `${pos.value.y}px`,
					"--wy-popover-room": `${room.value}px`
				},
				contenteditable: "false",
				"data-block-portal": "",
				onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"])),
				onKeydown: _cache[1] || (_cache[1] = (e) => e.key === "Escape" && emit("escape", e))
			}), [renderSlot(_ctx.$slots, "default")], 16)]);
		};
	}
});
// src/nodes/MentionView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$25 = ["href"];
var _hoisted_2$21 = {
	class: "wy-mention-icon",
	"aria-hidden": "true"
};
var _hoisted_3$21 = ["title"];
var _hoisted_4$19 = { class: "wy-field" };
var _hoisted_5$18 = { class: "wy-label" };
var _hoisted_6$13 = ["value"];
var _hoisted_7$9 = { class: "wy-check" };
var _hoisted_8$8 = ["checked"];
var _hoisted_9$6 = ["value", "aria-label"];
var _hoisted_10$6 = { class: "wy-check" };
var _hoisted_11$5 = ["checked"];
var _hoisted_12$5 = [
	"value",
	"min",
	"aria-label"
];
// src/nodes/MentionView.vue
var MentionView_default = /* @__PURE__ */ defineComponent({
	__name: "MentionView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const { selected, editing, startEdit, finishEdit, update, readonly, onKeydown } = useBlockNode(props);
		const anchor = ref(null);
		const a = computed(() => props.node.attrs);
		const href = computed(() => a.value.kind === "page" && a.value.id ? pageHref(ctx.config.base.pageHref, a.value.id) : "");
		const resolved = ref(null);
		const text = computed(() => a.value.kind === "page" && resolved.value?.title || mentionText(a.value, ctx.locale));
		const icon = computed(() => /^(https?:|\/|data:|blob:)/.test(resolved.value?.icon ?? "") ? "" : resolved.value?.icon || "");
		watch(href, async (h) => {
			resolved.value = null;
			const r = await resolveOnce(ctx.services, h);
			if (h === href.value) resolved.value = r;
		}, { immediate: true });
		const startDate = computed(() => (a.value.start ?? "").slice(0, 10));
		const startTime = computed(() => (a.value.start ?? "").slice(11, 16));
		const endDate = computed(() => (a.value.end ?? "").slice(0, 10));
		const withTime = computed(() => (a.value.start ?? "").includes("T"));
		/** date attributes and a fresh label in the editor's locale */
		function setDate(next) {
			const date = next.date ?? startDate.value;
			if (!isMentionDate(date)) return;
			const time = next.time === void 0 ? startTime.value : next.time;
			const start = time ? `${date}T${time}` : date;
			const endDay = next.end === void 0 ? endDate.value : next.end;
			const end = endDay && isMentionDate(endDay) ? time ? `${endDay}T${time}` : endDay : null;
			update({
				start,
				end,
				label: dateLabel(start, end, ctx.locale)
			});
		}
		function onClick(e) {
			if (a.value.kind === "page" && href.value) followLink(ctx.services, href.value, e, true);
			else if (a.value.kind === "date" && !readonly.value) startEdit();
		}
		function onKey(e) {
			if (e.key === "Enter") {
				e.preventDefault();
				finishEdit();
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "span",
				class: normalizeClass(["wy-inline-atom wy-mention-atom", {
					"is-selected": unref(selected),
					"is-editing": unref(editing)
				}])
			}, {
				default: withCtx(() => [a.value.kind === "page" ? (openBlock(), createElementBlock("a", {
					key: 0,
					ref_key: "anchor",
					ref: anchor,
					class: "wy-mention is-page",
					href: href.value || void 0,
					draggable: "false",
					onClick
				}, [createElementVNode("span", _hoisted_2$21, [icon.value ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [createTextVNode(toDisplayString(icon.value), 1)], 64)) : (openBlock(), createBlock(unref(FileText), {
					key: 1,
					size: 14
				}))]), createTextVNode(toDisplayString(text.value), 1)], 8, _hoisted_1$25)) : (openBlock(), createElementBlock("span", {
					key: 1,
					ref_key: "anchor",
					ref: anchor,
					class: normalizeClass(["wy-mention", `is-${a.value.kind}`]),
					title: a.value.kind === "date" && !unref(readonly) ? unref(t)("mention.editDate") : void 0,
					onClick
				}, [a.value.kind === "date" ? (openBlock(), createBlock(unref(CalendarDays), {
					key: 0,
					class: "wy-mention-icon",
					size: 14,
					"aria-hidden": "true"
				})) : createCommentVNode("", true), createTextVNode(toDisplayString(text.value), 1)], 10, _hoisted_3$21)), unref(editing) && a.value.kind === "date" ? (openBlock(), createBlock(AnchoredPopover_default, {
					key: 2,
					anchor: anchor.value,
					class: "wy-popover wy-date-picker",
					onEscape: unref(onKeydown)
				}, {
					default: withCtx(() => [
						createElementVNode("label", _hoisted_4$19, [createElementVNode("span", _hoisted_5$18, toDisplayString(unref(t)("mention.date")), 1), createElementVNode("input", {
							class: "wy-input is-sm",
							type: "date",
							value: startDate.value,
							onChange: _cache[0] || (_cache[0] = ($event) => setDate({ date: $event.target.value })),
							onKeydown: onKey
						}, null, 40, _hoisted_6$13)]),
						createElementVNode("label", _hoisted_7$9, [createElementVNode("input", {
							type: "checkbox",
							checked: withTime.value,
							onChange: _cache[1] || (_cache[1] = ($event) => setDate({ time: $event.target.checked ? "09:00" : null }))
						}, null, 40, _hoisted_8$8), createTextVNode(" " + toDisplayString(unref(t)("mention.includeTime")), 1)]),
						withTime.value ? (openBlock(), createElementBlock("input", {
							key: 0,
							class: "wy-input is-sm",
							type: "time",
							value: startTime.value,
							"aria-label": unref(t)("mention.time"),
							onChange: _cache[2] || (_cache[2] = ($event) => setDate({ time: $event.target.value || null })),
							onKeydown: onKey
						}, null, 40, _hoisted_9$6)) : createCommentVNode("", true),
						createElementVNode("label", _hoisted_10$6, [createElementVNode("input", {
							type: "checkbox",
							checked: !!endDate.value,
							onChange: _cache[3] || (_cache[3] = ($event) => setDate({ end: $event.target.checked ? startDate.value : null }))
						}, null, 40, _hoisted_11$5), createTextVNode(" " + toDisplayString(unref(t)("mention.endDate")), 1)]),
						endDate.value ? (openBlock(), createElementBlock("input", {
							key: 1,
							class: "wy-input is-sm",
							type: "date",
							value: endDate.value,
							min: startDate.value,
							"aria-label": unref(t)("mention.endDate"),
							onChange: _cache[4] || (_cache[4] = ($event) => setDate({ end: $event.target.value || null })),
							onKeydown: onKey
						}, null, 40, _hoisted_12$5)) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["anchor", "onEscape"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]);
		};
	}
});
// src/builtins/mention.ts
var KINDS = [
	"user",
	"page",
	"date"
];
function attr(name, fallback) {
	return {
		default: fallback,
		parseHTML: (dom) => dom.getAttribute(`data-${name}`) ?? fallback,
		renderHTML: (a) => a[name] ? { [`data-${name}`]: String(a[name]) } : {}
	};
}
function mentionText(a, locale) {
	if (a.kind === "date" && isMentionDate(a.start)) return a.label || dateLabel(a.start, isMentionDate(a.end) ? a.end : null, locale);
	return a.kind === "user" ? `@${a.label || a.id}` : a.label || a.id;
}
var Mention = Node$1.create({
	name: "mention",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	addOptions() {
		return { pageHref: "/p/{id}" };
	},
	addAttributes() {
		return {
			kind: {
				default: "user",
				parseHTML: (dom) => KINDS.find((k) => k === dom.getAttribute("data-kind")) ?? "user",
				renderHTML: (a) => ({ "data-kind": a.kind })
			},
			id: attr("id", ""),
			label: {
				default: "",
				parseHTML: (dom) => dom.getAttribute("data-label") ?? dom.textContent?.replace(/^@/, "") ?? "",
				renderHTML: (a) => ({ "data-label": a.label })
			},
			start: attr("start", null),
			end: attr("end", null)
		};
	},
	parseHTML() {
		return [{ tag: "span[data-type=\"mention\"][data-kind]" }, { tag: "a[data-type=\"mention\"][data-kind]" }];
	},
	renderHTML({ HTMLAttributes, node }) {
		const a = node.attrs;
		const attrs = mergeAttributes({
			"data-type": "mention",
			class: `wy-mention is-${a.kind}`
		}, HTMLAttributes);
		const text = mentionText(a, "en");
		if (a.kind === "page" && a.id) return [
			"a",
			mergeAttributes(attrs, { href: pageHref(this.options.pageHref, a.id) }),
			text
		];
		return [
			"span",
			attrs,
			text
		];
	},
	renderText({ node }) {
		return mentionText(node.attrs, "en");
	}
});
var MENTION_KEY = new PluginKey("wysiwygMention");
var MentionSuggest = Extension.create({
	name: "mentionSuggest",
	addProseMirrorPlugins() {
		let abort = null;
		return [Suggestion({
			editor: this.editor,
			char: "@",
			pluginKey: MENTION_KEY,
			allowSpaces: false,
			allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code && !!state.schema.nodes.mention,
			items: async ({ query, editor }) => {
				abort?.abort();
				const ctrl = abort = new AbortController();
				const ctx = contextOf(editor);
				const pause = Promise.withResolvers();
				setTimeout(pause.resolve, ctx.services.searchMentions ? 120 : 0);
				await pause.promise;
				if (ctrl.signal.aborted) return [];
				return (await searchMentions(ctx.services, query, void 0, ctrl.signal, ctx)).map((s) => mentionEntry(s, ctx));
			},
			command: ({ editor, range, props }) => {
				const s = props.suggestion;
				const attrs = {
					kind: s.kind,
					id: s.id,
					label: s.label,
					start: s.start ?? null,
					end: s.end ?? null
				};
				editor.chain().focus().insertContentAt(range, [{
					type: "mention",
					attrs
				}, {
					type: "text",
					text: " "
				}]).run();
			},
			render: () => {
				let popup = null;
				const props = (p) => {
					const ctx = contextOf(p.editor);
					return {
						items: p.items,
						empty: ctx.services.searchMentions ? ctx.t("mention.empty") : "",
						label: ctx.t("mention.label"),
						onPick: p.command
					};
				};
				return {
					onStart(p) {
						popup = openPopup(p.editor, SuggestionList_default, props(p), () => p.clientRect?.() ?? null);
					},
					onUpdate(p) {
						popup?.update(props(p));
					},
					onKeyDown(p) {
						if (p.event.key === "Escape") {
							p.event.stopPropagation();
							popup?.close();
							popup = null;
							return true;
						}
						return (popup?.ref)?.onKeyDown?.(p.event) ?? false;
					},
					onExit() {
						abort?.abort();
						popup?.close();
						popup = null;
					}
				};
			}
		})];
	}
});
function mentionExtension(base) {
	return {
		name: "mention",
		tiptap: [Mention.configure({ pageHref: base.pageHref }), MentionSuggest],
		nodeViews: { mention: MentionView_default },
		markdown: {
			plugins: [(md) => md.inline.ruler.before("link", "mention", mentionRule)],
			tokens: { mention: {
				node: "mention",
				getAttrs: (tok) => ({ ...tok.meta })
			} },
			nodes: { mention(state, node) {
				const md = mentionMarkdown(node.attrs);
				if (md) state.write(md);
				else state.text(String(node.attrs.label ?? ""));
			} }
		}
	};
}
// src/builtins/index.ts
function builtinExtensions(base) {
	const out = [];
	if (base.math) out.push(mathExtension);
	if (base.details) out.push(detailsExtension);
	if (base.footnotes) out.push(footnotesExtension);
	if (base.columns) out.push(columnsExtension);
	if (base.bookmarks) out.push(bookmarkExtension);
	if (base.embeds) out.push(embedExtension);
	if (base.toc) out.push(tocExtension);
	if (base.pageLinks) out.push(pageLinkExtension);
	if (base.mentions) out.push(mentionExtension(base));
	return out;
}
// src/schema/colors.ts
var OUTSIDE_LINKS = 1100;
/** node types that take a block colour; types missing from the schema are ignored */
var BLOCK_COLOR_TYPES = [
	"paragraph",
	"heading",
	"listItem",
	"taskItem",
	"blockquote",
	"callout",
	"details",
	"tableCell",
	"tableHeader",
	"pageLink"
];
function textToken(el) {
	const data = el.getAttribute("data-color");
	if (isTextToken(data)) return data;
	const css = tokenFromCss(el.style.getPropertyValue("color"));
	return isTextToken(css) ? css : null;
}
var PaletteTextStyle = TextStyle.extend({
	priority: 1101,
	parseHTML() {
		return [{
			tag: "span",
			consuming: false,
			getAttrs: (el) => textToken(el) ? {} : false
		}];
	}
});
var PaletteColor = Color.extend({ addGlobalAttributes() {
	return [{
		types: ["textStyle"],
		attributes: { color: {
			default: null,
			parseHTML: textToken,
			renderHTML: (a) => isTextToken(a.color) ? {
				"data-color": a.color,
				style: `color: ${tokenCss(a.color)}`
			} : {}
		} }
	}];
} });
var PaletteHighlight = Highlight.extend({
	priority: OUTSIDE_LINKS,
	addAttributes() {
		return { color: {
			default: null,
			parseHTML: (el) => {
				const data = el.getAttribute("data-color");
				if (isBgToken(data)) return data;
				const css = tokenFromCss(el.style.getPropertyValue("background-color"));
				return isBgToken(css) ? css : null;
			},
			renderHTML: (a) => isBgToken(a.color) ? {
				"data-color": a.color,
				style: `background-color: ${tokenCss(a.color)}`
			} : {}
		} };
	}
});
var BlockColor = Extension.create({
	name: "blockColor",
	addGlobalAttributes() {
		return [{
			types: BLOCK_COLOR_TYPES,
			attributes: { color: {
				default: null,
				parseHTML: (el) => {
					const v = el.getAttribute("data-block-color");
					return isColorToken(v) ? v : null;
				},
				renderHTML: (a) => {
					const style = blockColorStyle(a.color);
					return style ? {
						"data-block-color": a.color,
						style
					} : {};
				}
			} }
		}];
	}
});
// src/schema/index.ts
var ALL_LEVELS = [
	1,
	2,
	3,
	4,
	5,
	6
];
/**
* inline code takes every other mark (bold, colours, links), as in Notion. lowest priority makes it the innermost
* mark, which the markdown serialiser needs to write its backticks inside the other marks' delimiters
*/
var InnerCode = Code.extend({
	priority: 1,
	excludes: "code"
});
function resolveBase(format, base = {}) {
	const html = format === "html";
	const callouts = base.callouts ?? true;
	const code = base.codeBlocks ?? true;
	return {
		headings: base.headings === false ? [] : base.headings ?? (html ? [
			1,
			2,
			3
		] : ALL_LEVELS),
		underline: base.underline ?? true,
		highlight: base.highlight ?? true,
		color: base.color ?? true,
		textAlign: base.textAlign ?? html,
		lists: base.lists ?? true,
		listStyles: base.listStyles ?? !html,
		taskLists: base.taskLists ?? true,
		blockquote: base.blockquote ?? true,
		callouts: callouts === true ? [...html ? HTML_CALLOUTS : MARKDOWN_CALLOUTS] : callouts === false ? [] : callouts,
		dividers: base.dividers ?? true,
		codeBlocks: code === true ? [...CODE_LANGUAGES] : code === false ? false : code,
		tables: base.tables ?? true,
		images: base.images ?? true,
		files: base.files ?? true,
		links: base.links ?? true,
		downscale: base.downscale ?? 2560,
		math: base.math ?? false,
		details: base.details ?? false,
		footnotes: base.footnotes ?? false,
		columns: base.columns ?? false,
		bookmarks: base.bookmarks ?? false,
		embeds: base.embeds ?? false,
		toc: base.toc ?? false,
		pageLinks: base.pageLinks ?? false,
		mentions: base.mentions ?? false,
		diagrams: base.diagrams === true ? ["mermaid", "plantuml"] : base.diagrams || [],
		plantumlServer: (base.plantumlServer ?? "https://www.plantuml.com/plantuml").replace(/\/+$/, ""),
		pageHref: base.pageHref ?? "/p/{id}"
	};
}
/** shared default, so callers without extensions hit the same cache entry */
var NO_EXTENSIONS = [];
var configs = /* @__PURE__ */ new WeakMap();
function resolveConfig(format, base, extensions = NO_EXTENSIONS) {
	let byKey = configs.get(extensions);
	if (!byKey) configs.set(extensions, byKey = /* @__PURE__ */ new Map());
	const key = `${format}:${JSON.stringify(base ?? {})}`;
	const hit = byKey.get(key);
	if (hit) return hit;
	const resolved = resolveBase(format, base);
	const config = {
		format,
		base: resolved,
		extensions: [...builtinExtensions(resolved), ...extensions.filter((e) => !e.formats || e.formats.includes(format))]
	};
	byKey.set(key, config);
	return config;
}
function coreExtensions(config, inline, history) {
	const b = config.base;
	const lists = b.lists && !inline;
	const listItems = lists || !inline && b.taskLists;
	const out = [Bold];
	if (!inline && (b.blockquote || b.callouts.length > 0)) out.push(Blockquote);
	if (listItems) out.push(BulletList);
	out.push(InnerCode);
	if (!inline) out.push(Document, Dropcursor.configure({
		color: "var(--vc-accent)",
		width: 2
	}), Gapcursor, HardBreak);
	if (!inline && b.headings.length) out.push(Heading.configure({ levels: b.headings }));
	if (history) out.push(UndoRedo.configure({ newGroupDelay: 500 }));
	out.push(Italic);
	if (listItems) out.push(ListItem);
	if (!inline) out.push(ListKeymap);
	if (b.links) out.push(Link.configure({
		openOnClick: false,
		autolink: true,
		linkOnPaste: true,
		defaultProtocol: "https",
		HTMLAttributes: {
			target: "_blank",
			rel: "noopener noreferrer"
		}
	}));
	if (lists) out.push(OrderedList);
	out.push(Paragraph, Strike, Text);
	if (b.underline) out.push(Underline);
	if (!inline) out.push(TrailingNode);
	return out;
}
/**
* not cached: `history: false` leaves the local undo history out for a collaborative editor, whose
* collaboration extension owns it. the history adds no schema, so `schemaFor` is the same either way.
*/
function schemaExtensions(config, inline = false, history = true) {
	const b = config.base;
	const html = config.format === "html";
	const out = [];
	if (inline) out.push(InlineDocument);
	out.push(...coreExtensions(config, inline, history));
	if (b.highlight) out.push(html ? Highlight.configure({ multicolor: true }) : PaletteHighlight);
	if (b.color) out.push(...html ? [TextStyle, Color] : [PaletteTextStyle, PaletteColor]);
	if (b.color && !html && !inline) out.push(BlockColor);
	if (b.textAlign && !inline) out.push(TextAlign.configure({ types: ["heading", "paragraph"] }));
	if (b.links && b.files) out.push(FileChips);
	if (!inline) {
		if (b.dividers) out.push(Divider);
		if (b.listStyles && b.lists) out.push(ListStyles);
		if (b.codeBlocks) out.push(GenericCodeBlock);
		if (b.images) out.push(InlineImage, Figure);
		if (b.tables) out.push(Table.configure({ resizable: true }), TableRow, InlineTableHeader, InlineTableCell);
		if (b.taskLists) out.push(TaskList, TaskItem.configure({ nested: true }));
		if (b.callouts.length) out.push(Callout);
	}
	for (const ext of config.extensions) out.push(...ext.tiptap ?? []);
	return out;
}
var schemas = /* @__PURE__ */ new WeakMap();
function schemaFor(config, inline = false) {
	let entry = schemas.get(config);
	if (!entry) schemas.set(config, entry = {});
	const key = inline ? "inline" : "block";
	return entry[key] ??= getSchema(schemaExtensions(config, inline, false));
}
// src/markdown/rules.ts
function imageAttrsRule(state, silent) {
	if (silent || state.src.charCodeAt(state.pos) !== 123 || state.pending) return false;
	const prev = state.tokens[state.tokens.length - 1];
	if (!prev || prev.type !== "image") return false;
	const m = /^\{([^{}\n]*)\}/.exec(state.src.slice(state.pos, state.posMax));
	if (!m) return false;
	const attrs = parseImageAttrs(m[1]);
	if (!attrs) return false;
	prev.meta = {
		...prev.meta,
		...attrs
	};
	state.pos += m[0].length;
	return true;
}
/** `color=red bg=yellow`; `bg` also takes `yellow_bg`, `color` also takes a background token */
function parseSpanAttrs(fields) {
	const out = {
		color: null,
		bg: null
	};
	for (const [k, v] of Object.entries(fields)) if (k === "color" && isTextToken(v)) out.color = v;
	else if (k === "color" && isBgToken(v) && !fields.bg) out.bg = v;
	else if (k === "bg" && (isTextToken(v) || isBgToken(v))) out.bg = isBgToken(v) ? v : `${v}_bg`;
	else return null;
	return out;
}
var SPAN_ATTRS_RE = /^\{[^{}\n]*\}/;
/**
* `[text]{color=red bg=yellow}`: text colour and background colour marks around the bracketed inline content.
* silent mode (markdown-it scanning a link label) never matches, so a link label may hold a span:
* `[[a]{color=red} b](/p/1)`. a matched span would read as a nested link and void the outer link
*/
function colorSpanRule(state, silent) {
	if (silent || state.src.charCodeAt(state.pos) !== 91) return false;
	const labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, false);
	if (labelEnd < 0) return false;
	const m = SPAN_ATTRS_RE.exec(state.src.slice(labelEnd + 1, state.posMax));
	const fields = m ? parseAttrLine(m[0]) : null;
	const span = fields && parseSpanAttrs(fields);
	if (!m || !span) return false;
	const max = state.posMax;
	state.pos += 1;
	state.posMax = labelEnd;
	if (span.color) state.push("text_color_open", "span", 1).meta = { color: span.color };
	if (span.bg) state.push("bg_color_open", "mark", 1).meta = { color: span.bg };
	state.md.inline.tokenize(state);
	if (span.bg) state.push("bg_color_close", "mark", -1);
	if (span.color) state.push("text_color_close", "span", -1);
	state.posMax = max;
	state.pos = labelEnd + 1 + m[0].length;
	return true;
}
/** inline tokens that become the same editor mark; a document holds one mark of each type per character */
var MARK_GROUPS = {
	text_color: "textStyle",
	bg_color: "highlight",
	mark: "highlight"
};
/**
* a span nested in a span of the same mark (`[a [b]{color=red} c]{color=blue}`, `==a [b]{bg=yellow} c==`):
* the inner one wins over its own text and the outer one resumes after it. the parser would otherwise drop
* the outer mark at the inner close
*/
function sameMarkNestingRule(state) {
	for (const block of state.tokens) {
		if (block.type !== "inline" || !block.children) continue;
		const open = {};
		const out = [];
		for (const tok of block.children) {
			const kind = tok.type.replace(/_(open|close)$/, "");
			const group = tok.nesting !== 0 ? MARK_GROUPS[kind] : void 0;
			if (!group) {
				out.push(tok);
				continue;
			}
			const stack = open[group] ??= [];
			if (tok.nesting === 1) {
				const outer = stack[stack.length - 1];
				if (outer) out.push(markToken(state, outer, -1));
				stack.push(tok);
				out.push(tok);
			} else {
				stack.pop();
				out.push(tok);
				const outer = stack[stack.length - 1];
				if (outer) out.push(markToken(state, outer, 1));
			}
		}
		block.children = out;
	}
}
function markToken(state, like, nesting) {
	const tok = new state.Token(like.type.replace(/_open$/, nesting === 1 ? "_open" : "_close"), like.tag, nesting);
	tok.meta = like.meta;
	tok.markup = like.markup;
	return tok;
}
function figureRule(state) {
	const tokens = state.tokens;
	for (let i = 0; i + 2 < tokens.length; i++) {
		const inline = tokens[i + 1];
		if (tokens[i].type !== "paragraph_open" || inline.type !== "inline" || tokens[i + 2].type !== "paragraph_close") continue;
		const prev = i > 0 ? tokens[i - 1].type : "";
		if (prev === "list_item_open" || prev === "task_item_open") continue;
		const image = inline.children?.length === 1 ? inline.children[0] : null;
		if (!image || image.type !== "image") continue;
		const attrs = image.meta ?? {
			width: null,
			align: null
		};
		const fig = new state.Token("figure", "figure", 0);
		fig.block = true;
		fig.map = tokens[i].map;
		fig.meta = {
			image,
			caption: String(image.attrGet("title") ?? ""),
			width: attrs.width,
			align: attrs.align
		};
		tokens.splice(i, 3, fig);
	}
}
var CELL_BREAK = /<br\s*\/?>/gi;
/** an all-empty header row is dropped (that is how a headerless table is written); `\<br>` stays text; must run before `text_join` */
function tableCellsRule(state) {
	const tokens = state.tokens;
	let inCell = false;
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (t.type === "th_open" || t.type === "td_open") inCell = true;
		else if (t.type === "th_close" || t.type === "td_close") inCell = false;
		else if (t.type === "inline" && inCell && t.children) t.children = splitCellBreaks(state, t.children);
		else if (t.type === "thead_open" && dropEmptyHead(tokens, i)) i--;
	}
}
function splitCellBreaks(state, children) {
	const out = [];
	for (const child of children) {
		const parts = child.type === "text" ? child.content.split(CELL_BREAK) : [];
		if (parts.length < 2) {
			out.push(child);
			continue;
		}
		parts.forEach((part, k) => {
			if (k > 0) out.push(new state.Token("hardbreak", "br", 0));
			if (!part) return;
			const text = new state.Token("text", "", 0);
			text.content = part;
			out.push(text);
		});
	}
	return out;
}
function dropEmptyHead(tokens, i) {
	let end = i;
	while (end < tokens.length && tokens[end].type !== "thead_close") end++;
	if (tokens[end + 1]?.type !== "tbody_open") return false;
	for (let k = i; k < end; k++) if (tokens[k].type === "inline" && tokens[k].content.trim()) return false;
	tokens.splice(i, end - i + 1);
	return true;
}
var CALLOUT_RE = /^\[!([A-Za-z]+)\][ \t]*([^\n]*)(?:\n|$)/;
function calloutAt(tokens, i, kinds) {
	const inline = tokens[i + 2];
	if (tokens[i]?.type !== "blockquote_open" || tokens[i + 1]?.type !== "paragraph_open" || inline?.type !== "inline") return null;
	const m = CALLOUT_RE.exec(inline.content);
	const type = m?.[1].toLowerCase() ?? "";
	if (!m || !kinds.includes(type)) return null;
	let depth = 0;
	for (let j = i; j < tokens.length; j++) {
		const t = tokens[j].type;
		if (t === "blockquote_open") depth++;
		else if (t === "blockquote_close" && --depth === 0) return {
			type,
			title: m[2].trim(),
			inline,
			rest: inline.content.slice(m[0].length),
			close: j
		};
	}
	return null;
}
function retagCallouts(tokens, kinds) {
	for (let i = 0; i < tokens.length; i++) {
		const callout = calloutAt(tokens, i, kinds);
		if (!callout) continue;
		tokens[i].type = "callout_open";
		tokens[i].meta = {
			...tokens[i].meta,
			type: callout.type,
			title: callout.title
		};
		tokens[callout.close].type = "callout_close";
		if (callout.rest.trim() === "") tokens.splice(i + 1, 3);
		else {
			callout.inline.content = callout.rest;
			callout.inline.children = [];
		}
	}
}
var TASK_RE = /^\[([ xX])\][ \t]+/;
function retagTaskLists(tokens) {
	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i].type !== "bullet_list_open") continue;
		const items = [];
		let ok = true;
		let depth = 0;
		let j = i;
		for (; j < tokens.length; j++) {
			const t = tokens[j];
			if (t.type === "bullet_list_open" || t.type === "ordered_list_open") depth++;
			else if (t.type === "bullet_list_close" || t.type === "ordered_list_close") {
				if (--depth === 0) break;
			} else if (t.type === "list_item_open" && depth === 1) {
				const para = tokens[j + 1];
				const inline = tokens[j + 2];
				const m = para?.type === "paragraph_open" && inline?.type === "inline" ? TASK_RE.exec(inline.content) : null;
				if (!m) {
					ok = false;
					break;
				}
				items.push({
					open: t,
					inline,
					checked: m[1] !== " "
				});
			}
		}
		if (!ok || items.length === 0) continue;
		tokens[i].type = "task_list_open";
		tokens[j].type = "task_list_close";
		depth = 0;
		for (let k = i; k <= j; k++) {
			const t = tokens[k];
			if (t.type === "task_list_open" || t.type === "bullet_list_open" || t.type === "ordered_list_open") depth++;
			else if (t.type === "task_list_close" || t.type === "bullet_list_close" || t.type === "ordered_list_close") depth--;
			else if (depth === 1 && t.type === "list_item_open") t.type = "task_item_open";
			else if (depth === 1 && t.type === "list_item_close") t.type = "task_item_close";
		}
		for (const it of items) {
			it.open.meta = {
				...it.open.meta,
				checked: it.checked
			};
			it.inline.content = it.inline.content.replace(TASK_RE, "");
			it.inline.children = [];
		}
	}
}
function wrapTableCells(state, tokens) {
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (t.type !== "th_open" && t.type !== "td_open" || tokens[i + 1]?.type !== "inline") continue;
		tokens.splice(i + 1, 0, new state.Token("paragraph_open", "p", 1));
		tokens.splice(i + 3, 0, new state.Token("paragraph_close", "p", -1));
		i += 3;
	}
}
function atomToken(node) {
	return `${node}__fence`;
}
/** runs on the block stream before the inline rule so nested container bodies are retagged too and their inline content is parsed once by the outer core chain */
function retagTokens(state, tokens, opts) {
	retagFences(state, tokens, opts);
	if (opts.callouts.length) retagCallouts(tokens, opts.callouts);
	if (opts.taskLists) retagTaskLists(tokens);
	if (opts.tables) wrapTableCells(state, tokens);
	for (const hook of opts.hooks) hook(tokens, { Token: state.Token });
}
function spliceContainer(state, tokens, i, name, meta, body, opts) {
	const open = new state.Token(`${name}_open`, "div", 1);
	open.block = true;
	open.meta = meta;
	const close = new state.Token(`${name}_close`, "div", -1);
	close.block = true;
	const inner = [];
	state.md.block.parse(body.replace(/\n$/, ""), state.md, state.env, inner);
	if (inner.length === 0) {
		const text = new state.Token("inline", "", 0);
		text.content = "";
		text.children = [];
		inner.push(new state.Token("paragraph_open", "p", 1), text, new state.Token("paragraph_close", "p", -1));
	}
	retagTokens(state, inner, opts);
	tokens.splice(i, 1, open, ...inner, close);
	return inner.length + 1;
}
function spliceSections(state, tokens, i, name, child, meta, body, opts) {
	const sections = splitSections(body.replace(/\n$/, ""));
	if (sections.length === 0) sections.push({
		label: "",
		body: ""
	});
	const inner = sections.map(() => tokens[i]);
	for (let k = sections.length - 1; k >= 0; k--) spliceContainer(state, inner, k, child, { label: sections[k].label }, sections[k].body, opts);
	const open = new state.Token(`${name}_open`, "div", 1);
	open.block = true;
	open.meta = meta;
	const close = new state.Token(`${name}_close`, "div", -1);
	close.block = true;
	tokens.splice(i, 1, open, ...inner, close);
	return inner.length + 1;
}
function findRule(rules, info) {
	for (let k = rules.length - 1; k >= 0; k--) {
		const r = rules[k];
		if (r.kind === info.kind && (!r.match || r.match(info))) return r;
	}
	return null;
}
function retagFences(state, tokens, opts) {
	if (!opts.fences.length) return;
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (t.type !== "fence") continue;
		const info = parseInfo(t.info.trim());
		const rule = findRule(opts.fences, info);
		if (!rule) continue;
		const blockAttrs = t.meta?.blockAttrs;
		const withAttrs = (meta) => blockAttrs ? {
			...meta,
			blockAttrs
		} : meta;
		if (rule.parse) {
			let advance = 0;
			const own = t.content.replace(/\n$/, "");
			const ctx = {
				info,
				body: own,
				token: t,
				container: (name, meta, body = own) => void (advance = spliceContainer(state, tokens, i, name, withAttrs(meta), body, opts)),
				sections: (name, child, meta, body = own) => void (advance = spliceSections(state, tokens, i, name, child, withAttrs(meta), body, opts)),
				atom: (name, meta) => {
					t.type = name;
					t.meta = withAttrs(meta);
				}
			};
			rule.parse(ctx);
			i += advance;
			continue;
		}
		if (!rule.node) continue;
		if (rule.ensureId && !info.attrs.id) info.attrs = {
			id: newBlockId(),
			...info.attrs
		};
		t.meta = withAttrs({
			kind: info.kind,
			attrs: info.attrs
		});
		t.type = atomToken(rule.node);
	}
}
// src/markdown/index.ts
/** inline tokens whose mark the schema may lack (e.g. no text colour); they are dropped then, keeping their text */
var OPTIONAL_MARK_TOKENS = {
	text_color: true,
	bg_color: true,
	ins: true
};
/** these write their own attribute line, or none: a list item writes its line after its first child, a bookmark's `icon` is its favicon */
var OWN_ATTR_LINE = {
	listItem: true,
	taskItem: true,
	tableCell: true,
	tableHeader: true,
	horizontalRule: true,
	callout: true,
	pageLink: true,
	tableOfContents: true,
	bookmark: true
};
var ITEMS$1 = {
	listItem: true,
	taskItem: true
};
function markStart(parent, index, m) {
	let i = index;
	while (i > 0 && m.isInSet(parent.child(i - 1).marks)) i--;
	return i;
}
function markEnd(parent, index, m) {
	let i = index;
	while (i < parent.childCount && m.isInSet(parent.child(i).marks)) i++;
	return i;
}
function tokenMark(node, name, valid) {
	const m = node.marks.find((x) => x.type.name === name);
	return m && valid(m.attrs.color) ? m : null;
}
/** text colour and background colour over exactly the same run are written as one `[text]{color=red bg=yellow}` */
function pairedColors(parent, index) {
	if (index < 0 || index >= parent.childCount) return null;
	const node = parent.child(index);
	const fg = tokenMark(node, "textStyle", isTextToken);
	const bg = tokenMark(node, "highlight", isBgToken);
	if (!fg || !bg) return null;
	if (markStart(parent, index, fg) !== markStart(parent, index, bg) || markEnd(parent, index, fg) !== markEnd(parent, index, bg)) return null;
	return {
		color: String(fg.attrs.color),
		bg: String(bg.attrs.color)
	};
}
/** where each of a child's marks starts (`dir` -1) or ends (`dir` 1, exclusive) in its run of siblings */
function runEdges(parent, dir) {
	const n = parent.childCount;
	const out = new Array(n);
	for (let k = 0; k < n; k++) {
		const i = dir < 0 ? k : n - 1 - k;
		const marks = parent.child(i).marks;
		const near = i + dir >= 0 && i + dir < n ? parent.child(i + dir) : null;
		out[i] = marks.map((m) => {
			const j = near ? near.marks.findIndex((x) => x.eq(m)) : -1;
			return j < 0 ? dir < 0 ? i : i + 1 : out[i + dir][j];
		});
	}
	return out;
}
/**
* reorders each child's marks outermost first, as markdown has to nest them: a mark that starts earlier, or that
* runs further, wraps the others, and unescaped marks (code) stay innermost. prosemirror-markdown otherwise opens
* marks in schema order, which splits a long bold or background run around a shorter coloured or linked run.
* the reordered mark arrays only feed the serialiser
*/
function nestMarks(parent, innermost) {
	if (parent.childCount < 2) return parent;
	const starts = runEdges(parent, -1);
	const ends = runEdges(parent, 1);
	const children = [];
	let changed = false;
	parent.forEach((child, _, i) => {
		if (child.marks.length < 2) {
			children.push(child);
			return;
		}
		const keyed = child.marks.map((m, k) => ({
			m,
			inner: innermost(m) ? 1 : 0,
			start: starts[i][k],
			end: ends[i][k],
			rank: k
		}));
		keyed.sort((a, b) => a.inner - b.inner || a.start - b.start || b.end - a.end || a.rank - b.rank);
		const marks = keyed.map((x) => x.m);
		if (marks.every((m, k) => m === child.marks[k])) children.push(child);
		else {
			changed = true;
			children.push(child.mark(marks));
		}
	});
	return changed ? parent.copy(Fragment.fromArray(children)) : parent;
}
function nestDoc(node, innermost) {
	if (node.inlineContent) return nestMarks(node, innermost);
	if (!node.childCount) return node;
	const children = [];
	let changed = false;
	node.forEach((child) => {
		const next = nestDoc(child, innermost);
		if (next !== child) changed = true;
		children.push(next);
	});
	return changed ? node.copy(Fragment.fromArray(children)) : node;
}
function cellAttrs(tok) {
	const m = /text-align:\s*(left|center|right)/.exec(String(tok.attrGet("style") ?? ""));
	return { align: m ? m[1] : null };
}
function imageAttrs(meta) {
	return {
		width: meta?.width ?? null,
		align: meta?.align ?? null
	};
}
function baseTokens(config) {
	const levels = config.base.headings;
	const top = levels.length ? Math.max(...levels) : 6;
	return {
		blockquote: { block: "blockquote" },
		paragraph: { block: "paragraph" },
		list_item: { block: "listItem" },
		bullet_list: {
			block: "bulletList",
			getAttrs: (tok) => ({
				listStyle: tok.meta?.list?.style ?? null,
				marker: tok.meta?.list?.marker ?? null
			})
		},
		ordered_list: {
			block: "orderedList",
			getAttrs: (tok) => ({
				start: +(tok.attrGet("start") ?? 1) || 1,
				listStyle: tok.meta?.list?.style ?? null
			})
		},
		task_list: { block: "taskList" },
		task_item: {
			block: "taskItem",
			getAttrs: (tok) => ({ checked: !!tok.meta?.checked })
		},
		heading: {
			block: "heading",
			getAttrs: (tok) => ({ level: Math.min(+tok.tag.slice(1), top) })
		},
		code_block: {
			block: "codeBlock",
			noCloseToken: true,
			getAttrs: () => ({
				language: null,
				meta: ""
			})
		},
		fence: {
			block: "codeBlock",
			noCloseToken: true,
			getAttrs: (tok) => {
				const info = tok.info.trim();
				const sp = info.search(/\s/);
				return {
					language: (sp < 0 ? info : info.slice(0, sp)) || null,
					meta: sp < 0 ? "" : info.slice(sp + 1).trim()
				};
			}
		},
		hr: {
			node: "horizontalRule",
			getAttrs: (tok) => ({
				...DEFAULT_DIVIDER,
				...tok.meta?.divider
			})
		},
		image: {
			node: "image",
			getAttrs: (tok) => ({
				src: tok.attrGet("src"),
				title: tok.attrGet("title") || null,
				alt: tok.children?.map((c) => c.content).join("") || null,
				...imageAttrs(tok.meta)
			})
		},
		figure: {
			node: "figure",
			getAttrs: (tok) => {
				const meta = tok.meta;
				return {
					src: meta.image.attrGet("src"),
					alt: meta.image.children?.map((c) => c.content).join("") || null,
					caption: meta.caption || null,
					...imageAttrs(meta)
				};
			}
		},
		hardbreak: { node: "hardBreak" },
		em: { mark: "italic" },
		strong: { mark: "bold" },
		s: { mark: "strike" },
		mark: {
			mark: "highlight",
			getAttrs: () => ({ color: null })
		},
		text_color: {
			mark: "textStyle",
			getAttrs: (tok) => ({ color: tok.meta.color })
		},
		bg_color: {
			mark: "highlight",
			getAttrs: (tok) => ({ color: tok.meta.color })
		},
		ins: { mark: "underline" },
		link: {
			mark: "link",
			getAttrs: (tok) => ({
				href: tok.attrGet("href"),
				title: tok.attrGet("title") || null
			})
		},
		code_inline: {
			mark: "code",
			noCloseToken: true
		},
		table: { block: "table" },
		thead: { ignore: true },
		tbody: { ignore: true },
		tr: { block: "tableRow" },
		th: {
			block: "tableHeader",
			getAttrs: cellAttrs
		},
		td: {
			block: "tableCell",
			getAttrs: cellAttrs
		},
		callout: {
			block: "callout",
			getAttrs: (tok) => ({
				type: tok.meta.type,
				title: tok.meta.title,
				icon: tok.meta.blockAttrs?.icon ?? "",
				color: tok.meta.blockAttrs?.color ?? null
			})
		}
	};
}
function backticksFor(node, side) {
	const ticks = /`+/g;
	let m;
	let len = 0;
	if (node.isText) while (m = ticks.exec(node.text)) len = Math.max(len, m[0].length);
	let result = len > 0 && side > 0 ? " `" : "`";
	for (let i = 0; i < len; i++) result += "`";
	if (len > 0 && side < 0) result += " ";
	return result;
}
var ALIGN_RULES = {
	left: ":--- |",
	center: ":---: |",
	right: "---: |"
};
function buildConverter(config) {
	const b = config.base;
	const exts = config.extensions;
	const fences = exts.flatMap((e) => e.markdown?.fences ?? []);
	const retag = {
		callouts: b.callouts,
		taskLists: b.taskLists,
		tables: b.tables,
		fences,
		hooks: exts.flatMap((e) => e.markdown?.retag ? [e.markdown.retag] : [])
	};
	function markdownIt(schema, inline) {
		const md = markdownit({
			html: false,
			linkify: false,
			typographer: false,
			breaks: false
		});
		if (b.highlight) md.use(mark);
		if (b.underline) md.use(ins);
		if (b.color || b.highlight) {
			md.inline.ruler.before("link", "color_span", colorSpanRule);
			md.core.ruler.after("inline", "same_mark_nesting", sameMarkNestingRule);
		}
		if (!b.images) md.disable("image");
		else md.inline.ruler.after("image", "image_attrs", imageAttrsRule);
		if (b.images && schema.nodes.figure) md.core.ruler.after("inline", "figures", figureRule);
		if (b.tables) md.core.ruler.before("text_join", "table_cells", tableCellsRule);
		else md.disable("table");
		if (b.listStyles || b.dividers || b.color || b.callouts.length || b.toc || b.pageLinks) md.use(blockAttrsPlugin);
		if (!b.dividers) md.disable("hr");
		if (!b.headings.length) md.disable(["heading", "lheading"]);
		if (!b.blockquote && !b.callouts.length) md.disable("blockquote");
		if (!b.lists && !b.taskLists) md.disable("list");
		if (!b.codeBlocks) md.disable(fences.length ? ["code"] : ["code", "fence"]);
		if (!b.links) md.disable([
			"link",
			"autolink",
			"reference"
		]);
		md.core.ruler.after("block", "pm_retag", (state) => retagTokens(state, state.tokens, retag));
		for (const e of exts) for (const plugin of e.markdown?.plugins ?? []) plugin(md, {
			schema,
			inline
		});
		return md;
	}
	const specs = baseTokens(config);
	for (const r of fences) if (!r.parse && r.node) specs[atomToken(r.node)] = {
		node: r.node,
		getAttrs: (tok) => ({
			attrs: tok.meta.attrs,
			body: tok.content.replace(/\n$/, "")
		})
	};
	for (const e of exts) Object.assign(specs, e.markdown?.tokens);
	const normalizers = exts.flatMap((e) => e.markdown?.normalize ? [e.markdown.normalize] : []);
	/** an attribute line's fields (`{color=…}`) land on every node type that has an attribute of that name */
	function withBlockAttrs(spec, type) {
		const keys = BLOCK_ATTR_KEYS.filter((k) => k in (type.spec.attrs ?? {}));
		if (!keys.length) return spec;
		return {
			...spec,
			getAttrs: (tok, tokens, i) => {
				const own = spec.getAttrs ? spec.getAttrs(tok, tokens, i) : typeof spec.attrs === "function" ? spec.attrs(tok) : spec.attrs;
				const extra = tok.meta?.blockAttrs;
				if (!extra) return own ?? null;
				const attrs = { ...own };
				for (const k of keys) if (extra[k] !== void 0) attrs[k] = extra[k];
				return attrs;
			}
		};
	}
	function specsFor(schema) {
		const out = {};
		for (const [token, spec] of Object.entries(specs)) {
			const name = spec.block ?? spec.node ?? spec.mark;
			const type = name ? schema.nodes[name] : void 0;
			if (type) out[token] = withBlockAttrs(spec, type);
			else if (!name || schema.marks[name]) out[token] = spec;
			else if (OPTIONAL_MARK_TOKENS[token] === true) out[token] = { ignore: true };
		}
		return out;
	}
	const parsers = /* @__PURE__ */ new WeakMap();
	const inlineParsers = /* @__PURE__ */ new WeakMap();
	function parse(md, schema = blockSchema) {
		let p = parsers.get(schema);
		if (!p) parsers.set(schema, p = new MarkdownParser(schema, markdownIt(schema, false), specsFor(schema)));
		let doc = p.parse(md.replace(/\r\n?/g, "\n"));
		for (const n of normalizers) try {
			doc = n(doc);
		} catch (e) {
			console.error("vue-wysiwyg-component: markdown normalize hook failed", e);
		}
		return doc;
	}
	function parseInline(md, schema = inlineSchema) {
		let p = inlineParsers.get(schema);
		if (!p) {
			const it = markdownIt(schema, true);
			p = new MarkdownParser(schema, { parse(src, env) {
				const inline = it.parseInline(src, env)[0];
				if (!inline) return [];
				const Tok = inline.constructor;
				return [
					new Tok("paragraph_open", "p", 1),
					inline,
					new Tok("paragraph_close", "p", -1)
				];
			} }, specsFor(schema));
			inlineParsers.set(schema, p);
		}
		return p.parse(md.replace(/\s*\n\s*/g, " ").trim());
	}
	let inAutolink = false;
	function isPlainURL(link, parent, index) {
		if (link.attrs.title || !/^\w+:/.test(String(link.attrs.href))) return false;
		const content = parent.child(index);
		if (!content.isText || content.text !== link.attrs.href || content.marks[content.marks.length - 1] !== link) return false;
		return index === parent.childCount - 1 || !link.isInSet(parent.child(index + 1).marks);
	}
	const marks = {
		italic: {
			open: "*",
			close: "*",
			mixable: true,
			expelEnclosingWhitespace: true
		},
		bold: {
			open: "**",
			close: "**",
			mixable: true,
			expelEnclosingWhitespace: true
		},
		strike: {
			open: "~~",
			close: "~~",
			mixable: true,
			expelEnclosingWhitespace: true
		},
		highlight: {
			open: (_state, m, parent, index) => !isBgToken(m.attrs.color) ? "==" : pairedColors(parent, index) ? "" : "[",
			close: (_state, m, parent, index) => !isBgToken(m.attrs.color) ? "==" : pairedColors(parent, index - 1) ? "" : `]{bg=${String(m.attrs.color).slice(0, -3)}}`,
			mixable: true,
			expelEnclosingWhitespace: true
		},
		textStyle: {
			open: (_state, m) => isTextToken(m.attrs.color) ? "[" : "",
			close(_state, m, parent, index) {
				if (!isTextToken(m.attrs.color)) return "";
				const pair = pairedColors(parent, index - 1);
				return `]{color=${m.attrs.color}${pair ? ` bg=${pair.bg.slice(0, -3)}` : ""}}`;
			},
			expelEnclosingWhitespace: true
		},
		underline: {
			open: "++",
			close: "++",
			mixable: true,
			expelEnclosingWhitespace: true
		},
		link: {
			open(_state, mark, parent, index) {
				inAutolink = isPlainURL(mark, parent, index);
				return inAutolink ? "<" : "[";
			},
			close(_state, mark) {
				const auto = inAutolink;
				inAutolink = false;
				if (auto) return ">";
				const title = mark.attrs.title ? ` "${String(mark.attrs.title).replace(/"/g, String.raw`\"`)}"` : "";
				return `](${String(mark.attrs.href ?? "").replace(/[()"]/g, String.raw`\$&`)}${title})`;
			},
			mixable: true
		},
		code: {
			open: (_state, _mark, parent, index) => backticksFor(parent.child(index), -1),
			close: (_state, _mark, parent, index) => backticksFor(parent.child(index - 1), 1),
			escape: false
		}
	};
	for (const e of exts) Object.assign(marks, e.markdown?.marks);
	const escapes = [
		...b.highlight ? ["=(?==)"] : [],
		...b.underline ? [String.raw`\+(?=\+)`] : [],
		...exts.flatMap((e) => e.markdown?.escape ? [e.markdown.escape] : [])
	];
	const options = {
		hardBreakNodeName: "hardBreak",
		escapeExtraCharacters: escapes.length ? new RegExp(escapes.join("|"), "g") : void 0,
		strict: false
	};
	function writeFence(state, node, info, body) {
		const fence = fenceFor(body);
		state.write(fence + info + "\n");
		if (body) {
			state.text(body, false);
			state.write("\n");
		}
		state.write(fence);
		state.closeBlock(node);
	}
	function contentMarkdown(node) {
		return fragmentMarkdown(converter, node.content, node.type.schema);
	}
	function sectionsMarkdown(node) {
		const sections = [];
		node.forEach((child) => sections.push({
			label: String(child.attrs.label ?? ""),
			body: contentMarkdown(child)
		}));
		return joinSections(sections);
	}
	function inlineMarkdown(content) {
		const schema = content.firstChild?.type.schema;
		if (!schema || !content.size) return "";
		return serializeInline(schema.topNodeType.create(null, schema.nodes.paragraph.create(null, content)));
	}
	const helpers = {
		writeFence,
		contentMarkdown,
		sectionsMarkdown,
		inlineMarkdown
	};
	function imageSyntax(state, node) {
		const caption = String(node.attrs.caption ?? node.attrs.title ?? "");
		const title = caption ? ` "${caption.replace(/"/g, String.raw`\"`)}"` : "";
		return `![${state.esc(node.attrs.alt || "")}](${String(node.attrs.src).replace(/[()]/g, String.raw`\$&`)}${title})${formatImageAttrs(node.attrs)}`;
	}
	function writeListAttrs(state, node) {
		const attrs = formatListAttrs({
			style: node.attrs.listStyle,
			marker: node.attrs.marker
		});
		if (!attrs) return;
		state.flushClose(1);
		state.write(attrs);
		state.closeBlock(node.lastChild);
	}
	/** `{color=…}` on its own line right under the block just written */
	function writeAttrLine(state, node, line) {
		const s = state;
		if (s.closed) s.flushClose(1);
		else s.ensureNewLine();
		state.write(line);
		state.closeBlock(node);
	}
	/** a list item's line follows its first child, so its nested blocks keep their own lines */
	function renderItem(state, item) {
		item.forEach((child, _, i) => {
			state.render(child, item, i);
			const line = i === 0 ? formatBlockAttrs(item.attrs) || formatBlockAttrs(child.attrs) : "";
			if (line) writeAttrLine(state, child, line);
		});
	}
	let cellSerializer = null;
	function cellText(cell) {
		cellSerializer ??= new MarkdownSerializer({
			...nodes,
			paragraph: plainParagraph,
			hardBreak(state) {
				state.write("<br>");
			},
			text(state, node) {
				state.text(node.text.replace(/<(br\s*\/?>)/gi, "\0$1"), !inAutolink);
			}
		}, marks, options);
		const doc = cell.type.schema.topNodeType.create(null, cell.content);
		return cellSerializer.serialize(doc, { tightLists: true }).split(/\n+/).map((l) => l.trim()).filter(Boolean).join(" ").replace(/\u0000/g, String.raw`\<`).replace(/\|/g, String.raw`\|`);
	}
	function serializeTable(state, node) {
		const rows = [];
		node.forEach((row) => {
			const cells = [];
			row.forEach((cell) => cells.push(cellText(cell)));
			rows.push(cells);
		});
		const first = node.firstChild;
		const cols = Math.max(1, ...rows.map((r) => r.length));
		let header = true;
		first?.forEach((cell) => {
			if (cell.type.name !== "tableHeader") header = false;
		});
		const aligns = Array.from({ length: cols }, (_, i) => first && i < first.childCount ? first.child(i).attrs.align : null);
		const line = (cells) => "| " + Array.from({ length: cols }, (_, i) => cells[i] ?? "").join(" | ") + " |";
		const body = header ? rows.slice(1) : rows;
		state.write(line(header ? rows[0] : []) + "\n");
		state.write("|" + aligns.map((a) => " " + (ALIGN_RULES[a ?? ""] ?? "--- |")).join("") + (body.length ? "\n" : ""));
		state.write(body.map(line).join("\n"));
		state.closeBlock(node);
	}
	function plainParagraph(state, node) {
		state.renderInline(node);
		state.closeBlock(node);
	}
	const nodes = {
		blockquote(state, node) {
			state.wrapBlock("> ", null, node, () => state.renderContent(node));
		},
		callout(state, node) {
			const title = String(node.attrs.title ?? "").trim();
			state.write(`> [!${String(node.attrs.type).toUpperCase()}]${title ? " " + title : ""}\n`);
			state.wrapBlock("> ", null, node, () => state.renderContent(node));
			const attrs = formatBlockAttrs({
				icon: node.attrs.icon,
				color: node.attrs.color
			});
			if (!attrs) return;
			state.flushClose(1);
			state.write(attrs);
			state.closeBlock(node);
		},
		codeBlock(state, node) {
			const lang = String(node.attrs.language ?? "");
			const meta = String(node.attrs.meta ?? "");
			writeFence(state, node, lang ? lang + (meta ? " " + meta : "") : "", node.textContent);
		},
		heading(state, node) {
			state.write(state.repeat("#", node.attrs.level) + " ");
			state.renderInline(node, false);
			state.closeBlock(node);
		},
		horizontalRule(state, node) {
			state.write("---");
			const attrs = formatDividerAttrs(node.attrs);
			if (attrs) {
				state.ensureNewLine();
				state.write(attrs);
			}
			state.closeBlock(node);
		},
		bulletList(state, node) {
			state.renderList(node, "  ", () => "- ");
			writeListAttrs(state, node);
		},
		orderedList(state, node) {
			const start = node.attrs.start || 1;
			const maxW = String(start + node.childCount - 1).length;
			const space = state.repeat(" ", maxW + 2);
			state.renderList(node, space, (i) => {
				const n = String(start + i);
				return state.repeat(" ", maxW - n.length) + n + ". ";
			});
			writeListAttrs(state, node);
		},
		listItem: renderItem,
		taskList(state, node) {
			state.renderList(node, "  ", () => "- ");
		},
		taskItem(state, node) {
			state.write(node.attrs.checked ? "[x] " : "[ ] ");
			renderItem(state, node);
		},
		paragraph: plainParagraph,
		image(state, node) {
			state.write(imageSyntax(state, node));
		},
		figure(state, node) {
			state.write(imageSyntax(state, node));
			state.closeBlock(node);
		},
		hardBreak(state, node, parent, index) {
			for (let i = index + 1; i < parent.childCount; i++) if (parent.child(i).type !== node.type) {
				state.write("  \n");
				return;
			}
		},
		text(state, node) {
			state.text(node.text, !inAutolink);
		},
		table: serializeTable,
		tableRow() {},
		tableCell() {},
		tableHeader() {}
	};
	for (const r of fences) {
		if (r.parse || !r.node) continue;
		const kind = r.kind;
		nodes[r.node] = (state, node) => writeFence(state, node, formatInfo(kind, node.attrs.attrs ?? {}), String(node.attrs.body ?? ""));
	}
	for (const e of exts) for (const [name, fn] of Object.entries(e.markdown?.nodes ?? {})) nodes[name] = (state, node, parent, index) => fn(state, node, parent, index, helpers);
	for (const [name, fn] of Object.entries(nodes)) {
		if (OWN_ATTR_LINE[name] === true) continue;
		nodes[name] = (state, node, parent, index) => {
			fn(state, node, parent, index);
			if (!node.isBlock || ITEMS$1[parent.type.name] === true && index === 0) return;
			const line = formatBlockAttrs(node.attrs);
			if (line) writeAttrLine(state, node, line);
		};
	}
	const serializer = new MarkdownSerializer(nodes, marks, options);
	const unescaped = (m) => marks[m.type.name]?.escape === false;
	function serialize(doc) {
		return serializer.serialize(nestDoc(doc, unescaped), { tightLists: true }).trimEnd() + "\n";
	}
	function serializeInline(doc) {
		return serializer.serialize(nestDoc(doc, unescaped), { tightLists: true }).replace(/\s*\n\s*/g, " ").trim();
	}
	function serializeNode(node) {
		const schema = node.type.schema;
		return serialize(schema.topNodeType.create(null, node.isBlock ? [node] : [schema.nodes.paragraph.create(null, [node])])).trimEnd();
	}
	const blockSchema = schemaFor(config);
	const inlineSchema = schemaFor(config, true);
	const converter = {
		config,
		schema: blockSchema,
		inlineSchema,
		parse,
		parseInline,
		serialize,
		serializeInline,
		serializeNode,
		slice: (md, schema = blockSchema) => Slice.maxOpen(parse(md, schema).content),
		toHtml(md) {
			const doc = parse(md);
			return fragmentHtml(doc.content, doc.type.schema);
		}
	};
	return converter;
}
function fragmentHtml(content, schema) {
	const div = document.createElement("div");
	div.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(content, { document }));
	return div.innerHTML;
}
function fragmentMarkdown(markdown, content, schema) {
	return markdown.serialize(schema.topNodeType.create(null, content)).trimEnd();
}
var converters = /* @__PURE__ */ new WeakMap();
function markdownFor(config) {
	let c = converters.get(config);
	if (!c) converters.set(config, c = buildConverter(config));
	return c;
}
function createMarkdown(extensions = NO_EXTENSIONS, options = {}) {
	return markdownFor(resolveConfig("markdown", options.base, extensions));
}
// src/i18n/index.ts
var MESSAGES = {
	en: {
		editor: {
			placeholder: "Write, or type / for blocks",
			parseFailed: "The content could not be shown visually. It opened in source mode.",
			uploading: "Uploading {n} file(s)",
			uploadingProgress: "Uploading {n} file(s), {percent} %",
			uploadFailed: "Upload failed: {name}",
			copied: "Copied",
			inlineOnly: "Table cells hold text only"
		},
		toolbar: {
			label: "Formatting",
			undo: "Undo",
			redo: "Redo",
			textStyle: "Text style",
			paragraph: "Text",
			heading: "Heading {n}",
			codeBlock: "Code",
			bold: "Bold",
			italic: "Italic",
			underline: "Underline",
			strike: "Strikethrough",
			code: "Inline code",
			highlight: "Highlight",
			color: "Colour",
			link: "Link",
			bulletList: "Bulleted list",
			orderedList: "Numbered list",
			taskList: "Checklist",
			listStyle: "List style",
			quote: "Quote",
			callout: "Callout",
			insert: "Insert",
			image: "Image",
			file: "File",
			align: "Alignment",
			alignLeft: "Left",
			alignCenter: "Center",
			alignRight: "Right",
			alignJustify: "Justify",
			focus: "Focus mode",
			exitFocus: "Leave focus mode",
			source: "Markdown source",
			visual: "Visual editor",
			more: "More"
		},
		listStyle: {
			numbering: "Numbering",
			bullets: "Bullets",
			custom: "Own character",
			apply: "Apply",
			customHint: "One or two characters, no spaces or quotes.",
			styles: {
				decimal: "1, 2, 3",
				"lower-alpha": "a, b, c",
				"upper-alpha": "A, B, C",
				"lower-roman": "i, ii, iii",
				"upper-roman": "I, II, III",
				disc: "Dot",
				circle: "Circle",
				square: "Square",
				dash: "Dash",
				arrow: "Arrow"
			}
		},
		colors: {
			text: "Text colour",
			background: "Background colour",
			default: "Default",
			none: "No highlight",
			gray: "Gray",
			red: "Red",
			orange: "Orange",
			yellow: "Yellow",
			green: "Green",
			blue: "Blue",
			purple: "Purple",
			pink: "Pink",
			brown: "Brown",
			reset: "Remove colour"
		},
		bubble: {
			label: "Selection",
			askAi: "Ask AI"
		},
		slash: {
			title: "Blocks",
			empty: "Nothing found",
			groups: {
				text: "Text",
				lists: "Lists",
				blocks: "Blocks",
				media: "Media"
			},
			items: {
				paragraph: {
					label: "Text",
					description: "Plain paragraph"
				},
				heading1: {
					label: "Heading 1",
					description: "Title of the page"
				},
				heading2: {
					label: "Heading 2",
					description: "Section heading"
				},
				heading3: {
					label: "Heading 3",
					description: "Subsection heading"
				},
				heading4: {
					label: "Heading 4",
					description: "Small heading"
				},
				heading5: {
					label: "Heading 5",
					description: "Smaller heading"
				},
				heading6: {
					label: "Heading 6",
					description: "Smallest heading"
				},
				quote: {
					label: "Quote",
					description: "Quoted text"
				},
				callout: {
					label: "Callout",
					description: "Box for a note, tip or warning"
				},
				codeBlock: {
					label: "Code",
					description: "Code with syntax highlighting"
				},
				hr: {
					label: "Divider",
					description: "Line between sections"
				},
				bulletList: {
					label: "Bulleted list",
					description: "List with bullets"
				},
				orderedList: {
					label: "Numbered list",
					description: "List with numbers"
				},
				taskList: {
					label: "Checklist",
					description: "List with checkboxes"
				},
				table: {
					label: "Table",
					description: "Rows and columns"
				},
				image: {
					label: "Image",
					description: "Upload or pick a picture"
				},
				file: {
					label: "File",
					description: "Attach a file as a link"
				},
				mathInline: {
					label: "Inline formula",
					description: "LaTeX in the text"
				},
				mathBlock: {
					label: "Formula",
					description: "LaTeX on its own line"
				},
				details: {
					label: "Collapsible",
					description: "Section readers open on click"
				},
				toggleHeading1: {
					label: "Toggle heading 1",
					description: "Large heading that folds its content"
				},
				toggleHeading2: {
					label: "Toggle heading 2",
					description: "Medium heading that folds its content"
				},
				toggleHeading3: {
					label: "Toggle heading 3",
					description: "Small heading that folds its content"
				},
				columns2: {
					label: "2 columns",
					description: "Blocks side by side"
				},
				columns3: {
					label: "3 columns",
					description: "Three blocks side by side"
				},
				columns4: {
					label: "4 columns",
					description: "Four blocks side by side"
				},
				bookmark: {
					label: "Bookmark",
					description: "Link with a preview card"
				},
				embed: {
					label: "Embed",
					description: "Video, map, design or page"
				},
				tableOfContents: {
					label: "Table of contents",
					description: "Links to the headings"
				},
				pageLink: {
					label: "Link to page",
					description: "Block that opens another page"
				}
			}
		},
		convert: {
			title: "Turn into",
			targets: {
				paragraph: "Text",
				unwrap: "Unwrap",
				columns: "Columns"
			}
		},
		blockMenu: {
			label: "Block",
			duplicate: "Duplicate",
			copy: "Copy as markdown",
			delete: "Delete",
			color: "Colour"
		},
		gutter: {
			drag: "Drag to move, click for options",
			add: "Add a block below"
		},
		table: {
			menu: "Table",
			column: "Column {n}",
			row: "Row {n}",
			dragHint: "Drag to move, click for options",
			insertLeft: "Insert left",
			insertRight: "Insert right",
			insertAbove: "Insert above",
			insertBelow: "Insert below",
			align: "Align",
			alignLeft: "Left",
			alignCenter: "Center",
			alignRight: "Right",
			headerRow: "Header row",
			headerColumn: "Header column",
			deleteColumn: "Delete column",
			deleteRow: "Delete row",
			deleteTable: "Delete table",
			addColumn: "Add column",
			addRow: "Add row"
		},
		link: {
			title: "Link",
			url: "Address",
			urlPlaceholder: "Paste a link",
			text: "Text",
			textPlaceholder: "Shown text",
			searchPlaceholder: "Search or paste a link",
			results: "Results",
			searching: "Searching",
			linkTo: "Link to this address",
			noResults: "Nothing found",
			apply: "Apply",
			remove: "Remove link",
			open: "Open link",
			copy: "Copy link",
			edit: "Edit link"
		},
		field: {
			tools: "Formatting",
			expand: "Open the full editor",
			expandTitle: "Edit",
			close: "Close"
		},
		draft: {
			idle: "Unsaved changes",
			saving: "Saving",
			saved: "Saved",
			offline: "Offline",
			error: "Not saved"
		},
		block: {
			edit: "Edit",
			copy: "Copy as markdown",
			delete: "Delete",
			more: "More"
		},
		code: {
			label: "Code",
			language: "Language",
			languagePlaceholder: "e.g. python"
		},
		callout: {
			label: "Callout",
			changeType: "Change the type",
			title: "Title",
			addTitle: "Add a title",
			changeIcon: "Change the icon",
			icon: "Icon",
			ownIcon: "Emoji or text",
			useIcon: "Use",
			defaultIcon: "Default icon",
			kinds: "Kind",
			types: {
				note: "Note",
				info: "Info",
				tip: "Tip",
				success: "Success",
				important: "Important",
				warning: "Warning",
				caution: "Caution",
				danger: "Danger",
				question: "Question",
				example: "Example",
				details: "Details"
			}
		},
		image: {
			label: "Image",
			video: "Video",
			audio: "Audio",
			alt: "Description",
			altPlaceholder: "What the picture shows",
			altHelp: "Read by screen readers and shown when the image cannot load.",
			title: "Title",
			caption: "Caption",
			captionPlaceholder: "Caption (optional)",
			width: "Width",
			resize: "Drag to resize",
			replace: "Image",
			replaceFile: "Replace the file",
			originalSize: "Original size",
			toFigure: "Own block",
			zoom: "Enlarge",
			align: {
				left: "Left",
				center: "Center",
				right: "Right",
				"float-left": "Wrap on the left",
				"float-right": "Wrap on the right"
			}
		},
		divider: {
			label: "Divider",
			line: "Line",
			width: "Width",
			widthPx: "{n} px",
			color: "Colour",
			defaultColor: "Default",
			customColor: "Own colour",
			design: "Ornament",
			customChar: "Own ornament",
			charInvalid: "One or two characters, no spaces or quotes.",
			styles: {
				solid: "Solid",
				dashed: "Dashed",
				dotted: "Dotted",
				double: "Double"
			},
			designs: {
				none: "None",
				star: "Star",
				diamond: "Diamond",
				dots: "Dots",
				fleuron: "Fleuron"
			},
			colors: {
				red: "Red",
				orange: "Orange",
				amber: "Amber",
				green: "Green",
				teal: "Teal",
				blue: "Blue",
				violet: "Violet",
				pink: "Pink"
			}
		},
		math: {
			label: "Formula",
			edit: "Edit the formula",
			empty: "Empty formula",
			placeholder: "LaTeX, e.g. \\frac{a}{b}",
			tex: "LaTeX"
		},
		details: {
			label: "Collapsible",
			title: "Title",
			titlePlaceholder: "Title readers click to open",
			toggleDefault: "Open for readers",
			openByDefault: "Open for readers",
			closedByDefault: "Closed for readers",
			headingLabel: "Toggle heading {n}",
			expand: "Expand",
			collapse: "Collapse"
		},
		footnote: { label: "Footnote" },
		source: { label: "Markdown source" },
		columns: {
			label: "Columns",
			add: "Add column",
			remove: "Remove column",
			removeHint: "Its blocks move to the column next to it.",
			equal: "Equal widths",
			resize: "Drag to resize"
		},
		bookmark: {
			edit: "Change link",
			label: "Bookmark",
			url: "Link",
			placeholder: "Paste a link",
			create: "Create bookmark",
			loading: "Loading preview",
			failed: "The preview could not be loaded.",
			refresh: "Refresh preview",
			open: "Open link"
		},
		embed: {
			edit: "Change link",
			url: "Link",
			placeholder: "Paste a link to embed",
			create: "Embed",
			open: "Open original",
			interact: "Click to interact",
			resize: "Drag to resize",
			defaultHeight: "Default height",
			providers: {
				youtube: "YouTube",
				vimeo: "Vimeo",
				loom: "Loom",
				figma: "Figma",
				gist: "Gist",
				maps: "Google Maps",
				tweet: "Post on X",
				codepen: "CodePen",
				generic: "Embed"
			}
		},
		toc: {
			label: "Table of contents",
			empty: "No headings yet"
		},
		pageLink: {
			label: "Page",
			untitled: "Untitled",
			search: "Link to page",
			searchPlaceholder: "Search pages"
		},
		mention: {
			label: "Mention",
			empty: "Nothing found",
			searching: "Searching",
			groups: {
				user: "People",
				page: "Pages",
				date: "Dates"
			},
			today: "Today",
			tomorrow: "Tomorrow",
			yesterday: "Yesterday",
			date: "Date",
			time: "Time",
			includeTime: "Include time",
			endDate: "End date",
			editDate: "Change the date"
		},
		paste: {
			label: "Paste as",
			link: "Keep as link",
			bookmark: "Bookmark",
			embed: "Embed"
		},
		diagram: {
			alt: "Diagram",
			loading: "Drawing the diagram",
			empty: "Empty diagram",
			failed: "The diagram could not be drawn."
		},
		palette: {
			background: "Background",
			text: "Text color",
			default: "Default color",
			gray: "Gray",
			brown: "Brown",
			orange: "Orange",
			yellow: "Yellow",
			green: "Green",
			blue: "Blue",
			purple: "Purple",
			pink: "Pink",
			red: "Red"
		},
		dialog: {
			close: "Close",
			cancel: "Cancel"
		}
	},
	sk: {
		editor: {
			placeholder: "Píšte text alebo napíšte / pre vloženie bloku",
			parseFailed: "Obsah sa nepodarilo zobraziť vizuálne, otvoril sa zdrojový text.",
			uploading: "Nahráva sa súborov: {n}",
			uploadingProgress: "Nahráva sa súborov: {n} ({percent} %)",
			uploadFailed: "Súbor {name} sa nepodarilo nahrať.",
			copied: "Skopírované",
			inlineOnly: "V bunke tabuľky môže byť len text"
		},
		toolbar: {
			label: "Nástroje editora",
			undo: "Späť",
			redo: "Znova",
			textStyle: "Štýl textu",
			paragraph: "Odsek",
			heading: "Nadpis {n}",
			codeBlock: "Blok kódu",
			bold: "Tučné",
			italic: "Kurzíva",
			underline: "Podčiarknuté",
			strike: "Prečiarknuté",
			code: "Kód v texte",
			highlight: "Zvýraznenie",
			color: "Farba",
			link: "Odkaz",
			bulletList: "Odrážky",
			orderedList: "Číslovaný zoznam",
			taskList: "Zoznam úloh",
			listStyle: "Štýl zoznamu",
			quote: "Citát",
			callout: "Upozornenie",
			insert: "Vložiť",
			image: "Obrázok",
			file: "Súbor",
			align: "Zarovnanie",
			alignLeft: "Doľava",
			alignCenter: "Na stred",
			alignRight: "Doprava",
			alignJustify: "Do bloku",
			focus: "Sústrediť sa",
			exitFocus: "Ukončiť sústredenie",
			source: "Zdrojový text (Markdown)",
			visual: "Vizuálny editor",
			more: "Ďalšie"
		},
		listStyle: {
			numbering: "Číslovanie",
			bullets: "Odrážky",
			custom: "Vlastný znak",
			apply: "Použiť",
			customHint: "Jeden alebo dva znaky bez medzier a úvodzoviek.",
			styles: {
				decimal: "Čísla",
				"lower-alpha": "Malé písmená",
				"upper-alpha": "Veľké písmená",
				"lower-roman": "Malé rímske číslice",
				"upper-roman": "Veľké rímske číslice",
				disc: "Plný krúžok",
				circle: "Prázdny krúžok",
				square: "Štvorček",
				dash: "Pomlčka",
				arrow: "Šípka"
			}
		},
		colors: {
			text: "Farba textu",
			background: "Farba pozadia",
			default: "Predvolená",
			none: "Bez zvýraznenia",
			gray: "Sivá",
			red: "Červená",
			orange: "Oranžová",
			yellow: "Žltá",
			green: "Zelená",
			blue: "Modrá",
			purple: "Fialová",
			pink: "Ružová",
			brown: "Hnedá",
			reset: "Odstrániť farbu"
		},
		bubble: {
			label: "Formátovanie výberu",
			askAi: "Opýtať sa AI"
		},
		slash: {
			title: "Vložiť blok",
			empty: "Žiadny blok nezodpovedá hľadaniu",
			groups: {
				text: "Text",
				lists: "Zoznamy",
				blocks: "Bloky",
				media: "Médiá"
			},
			items: {
				paragraph: {
					label: "Odsek",
					description: "Obyčajný text"
				},
				heading1: {
					label: "Nadpis 1",
					description: "Najvyššia úroveň, nad kapitolami"
				},
				heading2: {
					label: "Nadpis 2",
					description: "Hlavná sekcia"
				},
				heading3: {
					label: "Nadpis 3",
					description: "Podsekcia"
				},
				heading4: {
					label: "Nadpis 4",
					description: "Menší nadpis"
				},
				heading5: {
					label: "Nadpis 5",
					description: "Drobný nadpis"
				},
				heading6: {
					label: "Nadpis 6",
					description: "Najmenší nadpis"
				},
				quote: {
					label: "Citát",
					description: "Odsadený citát"
				},
				callout: {
					label: "Upozornenie",
					description: "Zvýraznený box: poznámka, tip, varovanie"
				},
				codeBlock: {
					label: "Blok kódu",
					description: "Kód so zvýraznením syntaxe"
				},
				hr: {
					label: "Oddeľovač",
					description: "Vodorovná čiara"
				},
				bulletList: {
					label: "Odrážky",
					description: "Jednoduchý zoznam"
				},
				orderedList: {
					label: "Číslovaný zoznam",
					description: "Zoznam s poradím"
				},
				taskList: {
					label: "Zoznam úloh",
					description: "Zoznam so zaškrtávacími políčkami"
				},
				table: {
					label: "Tabuľka",
					description: "Tabuľka 3 x 3 s hlavičkou"
				},
				image: {
					label: "Obrázok",
					description: "Nahrať alebo vybrať obrázok"
				},
				file: {
					label: "Súbor",
					description: "Priložiť súbor ako odkaz"
				},
				mathInline: {
					label: "Vzorec v texte",
					description: "Matematika (LaTeX) v riadku"
				},
				mathBlock: {
					label: "Vzorec",
					description: "Matematika (LaTeX) ako samostatný blok"
				},
				details: {
					label: "Zbaliť obsah",
					description: "Skrytý text, napríklad riešenie"
				},
				toggleHeading1: {
					label: "Rozbaľovací nadpis 1",
					description: "Veľký nadpis, ktorý skryje obsah"
				},
				toggleHeading2: {
					label: "Rozbaľovací nadpis 2",
					description: "Stredný nadpis, ktorý skryje obsah"
				},
				toggleHeading3: {
					label: "Rozbaľovací nadpis 3",
					description: "Malý nadpis, ktorý skryje obsah"
				},
				columns2: {
					label: "2 stĺpce",
					description: "Bloky vedľa seba"
				},
				columns3: {
					label: "3 stĺpce",
					description: "Tri bloky vedľa seba"
				},
				columns4: {
					label: "4 stĺpce",
					description: "Štyri bloky vedľa seba"
				},
				bookmark: {
					label: "Záložka",
					description: "Odkaz s náhľadom"
				},
				embed: {
					label: "Vložiť obsah",
					description: "Video, mapa, návrh alebo stránka"
				},
				tableOfContents: {
					label: "Obsah",
					description: "Odkazy na nadpisy"
				},
				pageLink: {
					label: "Odkaz na stránku",
					description: "Blok, ktorý otvorí inú stránku"
				}
			}
		},
		convert: {
			title: "Previesť na",
			targets: {
				paragraph: "Text",
				unwrap: "Zrušiť obal",
				columns: "Stĺpce"
			}
		},
		blockMenu: {
			label: "Ponuka bloku",
			duplicate: "Duplikovať",
			copy: "Kopírovať ako markdown",
			delete: "Odstrániť",
			color: "Farba"
		},
		gutter: {
			drag: "Potiahnutím presuniete, kliknutím otvoríte ponuku bloku",
			add: "Vložiť blok pod"
		},
		table: {
			menu: "Tabuľka",
			column: "Stĺpec {n}",
			row: "Riadok {n}",
			dragHint: "Kliknutím otvoríte ponuku, potiahnutím presuniete.",
			insertLeft: "Vložiť stĺpec vľavo",
			insertRight: "Vložiť stĺpec vpravo",
			insertAbove: "Vložiť riadok nad",
			insertBelow: "Vložiť riadok pod",
			align: "Zarovnanie stĺpca",
			alignLeft: "Doľava",
			alignCenter: "Na stred",
			alignRight: "Doprava",
			headerRow: "Hlavičkový riadok",
			headerColumn: "Hlavičkový stĺpec",
			deleteColumn: "Odstrániť stĺpec",
			deleteRow: "Odstrániť riadok",
			deleteTable: "Odstrániť tabuľku",
			addColumn: "Pridať stĺpec",
			addRow: "Pridať riadok"
		},
		link: {
			title: "Odkaz",
			url: "Adresa",
			urlPlaceholder: "Vložte odkaz",
			text: "Text odkazu",
			textPlaceholder: "Zobrazený text",
			searchPlaceholder: "Hľadajte alebo vložte odkaz",
			results: "Výsledky",
			searching: "Hľadám",
			linkTo: "Odkaz na túto adresu",
			noResults: "Nič sa nenašlo",
			apply: "Použiť",
			remove: "Odstrániť odkaz",
			open: "Otvoriť odkaz",
			copy: "Kopírovať odkaz",
			edit: "Upraviť odkaz"
		},
		field: {
			tools: "Formátovanie",
			expand: "Otvoriť v editore",
			expandTitle: "Úprava textu",
			close: "Zavrieť"
		},
		draft: {
			idle: "Neuložené zmeny",
			saving: "Ukladá sa",
			saved: "Koncept uložený",
			offline: "Offline, koncept sa neuložil",
			error: "Koncept sa nepodarilo uložiť"
		},
		block: {
			edit: "Upraviť",
			copy: "Kopírovať ako markdown",
			delete: "Odstrániť",
			more: "Ďalšie"
		},
		code: {
			label: "Kód",
			language: "Jazyk",
			languagePlaceholder: "napr. python"
		},
		callout: {
			label: "Upozornenie",
			changeType: "Zmeniť typ",
			title: "Nadpis",
			addTitle: "Pridať nadpis",
			changeIcon: "Zmeniť ikonu",
			icon: "Ikona",
			ownIcon: "Emoji alebo text",
			useIcon: "Použiť",
			defaultIcon: "Predvolená ikona",
			kinds: "Typ",
			types: {
				note: "Poznámka",
				info: "Informácia",
				tip: "Tip",
				success: "Úspech",
				important: "Dôležité",
				warning: "Varovanie",
				caution: "Pozor",
				danger: "Nebezpečenstvo",
				question: "Otázka",
				example: "Príklad",
				details: "Podrobnosti"
			}
		},
		image: {
			label: "Obrázok",
			video: "Video",
			audio: "Zvuk",
			alt: "Popis",
			altPlaceholder: "Čo je na obrázku",
			altHelp: "Prečíta ho čítačka obrazovky a ukáže sa, keď sa obrázok nenačíta.",
			title: "Titulok",
			caption: "Popisok",
			captionPlaceholder: "Popisok (nepovinný)",
			width: "Šírka",
			resize: "Potiahnutím zmeníte veľkosť",
			replace: "Obrázok",
			replaceFile: "Nahradiť súbor",
			originalSize: "Pôvodná veľkosť",
			toFigure: "Samostatný blok",
			zoom: "Zväčšiť",
			align: {
				left: "Vľavo",
				center: "Na stred",
				right: "Vpravo",
				"float-left": "Obtekať zľava",
				"float-right": "Obtekať sprava"
			}
		},
		divider: {
			label: "Oddeľovač",
			line: "Čiara",
			width: "Hrúbka",
			widthPx: "{n} px",
			color: "Farba",
			defaultColor: "Predvolená",
			customColor: "Vlastná farba",
			design: "Ozdoba",
			customChar: "Vlastná ozdoba",
			charInvalid: "Jeden alebo dva znaky bez medzier a úvodzoviek.",
			styles: {
				solid: "Plná",
				dashed: "Čiarkovaná",
				dotted: "Bodkovaná",
				double: "Dvojitá"
			},
			designs: {
				none: "Žiadna",
				star: "Hviezda",
				diamond: "Kosoštvorec",
				dots: "Bodky",
				fleuron: "Kvet"
			},
			colors: {
				red: "Červená",
				orange: "Oranžová",
				amber: "Jantárová",
				green: "Zelená",
				teal: "Tyrkysová",
				blue: "Modrá",
				violet: "Fialová",
				pink: "Ružová"
			}
		},
		math: {
			label: "Vzorec",
			edit: "Upraviť vzorec",
			empty: "Prázdny vzorec",
			placeholder: "LaTeX, napr. \\frac{a}{b}",
			tex: "LaTeX"
		},
		details: {
			label: "Zbaliť obsah",
			title: "Nadpis",
			titlePlaceholder: "Nadpis, na ktorý čitateľ klikne",
			toggleDefault: "Otvorené pre čitateľov",
			openByDefault: "Čitatelia ho uvidia otvorené",
			closedByDefault: "Čitatelia ho uvidia zbalené",
			headingLabel: "Rozbaľovací nadpis {n}",
			expand: "Rozbaliť",
			collapse: "Zbaliť"
		},
		footnote: { label: "Poznámka pod čiarou" },
		source: { label: "Zdrojový text (Markdown)" },
		columns: {
			label: "Stĺpce",
			add: "Pridať stĺpec",
			remove: "Odstrániť stĺpec",
			removeHint: "Jeho bloky sa presunú do susedného stĺpca.",
			equal: "Rovnaké šírky",
			resize: "Potiahnutím zmeníte šírku"
		},
		bookmark: {
			edit: "Zmeniť odkaz",
			label: "Záložka",
			url: "Odkaz",
			placeholder: "Vložte odkaz",
			create: "Vytvoriť záložku",
			loading: "Načítava sa náhľad",
			failed: "Náhľad sa nepodarilo načítať.",
			refresh: "Obnoviť náhľad",
			open: "Otvoriť odkaz"
		},
		embed: {
			edit: "Zmeniť odkaz",
			url: "Odkaz",
			placeholder: "Vložte odkaz na obsah",
			create: "Vložiť",
			open: "Otvoriť originál",
			interact: "Kliknutím ovládate obsah",
			resize: "Potiahnutím zmeníte výšku",
			defaultHeight: "Predvolená výška",
			providers: {
				youtube: "YouTube",
				vimeo: "Vimeo",
				loom: "Loom",
				figma: "Figma",
				gist: "Gist",
				maps: "Mapy Google",
				tweet: "Príspevok na X",
				codepen: "CodePen",
				generic: "Vložený obsah"
			}
		},
		toc: {
			label: "Obsah",
			empty: "Zatiaľ bez nadpisov"
		},
		pageLink: {
			label: "Stránka",
			untitled: "Bez názvu",
			search: "Odkaz na stránku",
			searchPlaceholder: "Hľadať stránky"
		},
		mention: {
			label: "Zmienka",
			empty: "Nič sa nenašlo",
			searching: "Hľadá sa",
			groups: {
				user: "Ľudia",
				page: "Stránky",
				date: "Dátumy"
			},
			today: "Dnes",
			tomorrow: "Zajtra",
			yesterday: "Včera",
			date: "Dátum",
			time: "Čas",
			includeTime: "Aj s časom",
			endDate: "Dátum konca",
			editDate: "Zmeniť dátum"
		},
		paste: {
			label: "Vložiť ako",
			link: "Ponechať odkaz",
			bookmark: "Záložka",
			embed: "Vložený obsah"
		},
		diagram: {
			alt: "Diagram",
			loading: "Kreslí sa diagram",
			empty: "Prázdny diagram",
			failed: "Diagram sa nepodarilo nakresliť."
		},
		palette: {
			background: "Pozadie",
			text: "Farba textu",
			default: "Predvolená farba",
			gray: "Sivá",
			brown: "Hnedá",
			orange: "Oranžová",
			yellow: "Žltá",
			green: "Zelená",
			blue: "Modrá",
			purple: "Fialová",
			pink: "Ružová",
			red: "Červená"
		},
		dialog: {
			close: "Zavrieť",
			cancel: "Zrušiť"
		}
	}
};
function lookup(tree, path) {
	let cur = tree;
	for (const p of path) {
		if (!cur || typeof cur !== "object") return void 0;
		cur = Reflect.get(cur, p);
	}
	return typeof cur === "string" ? cur : void 0;
}
function hasMessage(trees, key) {
	const path = key.split(".");
	return trees.some((t) => lookup(t, path) !== void 0);
}
function createTranslator(trees) {
	return (key, params) => {
		const path = key.split(".");
		let text;
		for (const t of trees) {
			text = lookup(t, path);
			if (text !== void 0) break;
		}
		if (text === void 0) return key;
		return params ? text.replace(/\{(\w+)\}/g, (m, k) => k in params ? String(params[k]) : m) : text;
	};
}
// src/core/math.ts
var katex = shallowRef(null);
var loader = null;
var loading = null;
var cache = /* @__PURE__ */ new Map();
function setKatexLoader(load) {
	if (load && !loader) loader = load;
}
/** the package's own katex, its stylesheet and the mhchem `\ce` macros */
async function bundledKatex() {
	const [k] = await Promise.all([import("katex"), import("katex/dist/katex.min.css")]);
	await import("katex/contrib/mhchem");
	return k.default;
}
function load() {
	if (loading) return;
	loading = (loader ?? bundledKatex)().then((m) => {
		katex.value = "renderToString" in m ? m : m.default;
	}, (e) => console.error("vue-wysiwyg-component: KaTeX failed to load", e));
}
function renderMath(tex, display) {
	const k = katex.value;
	if (!k) {
		load();
		return `<code class="wy-math-source">${escapeHtml(tex)}</code>`;
	}
	const key = `${display ? "D" : "I"}${tex}`;
	const hit = cache.get(key);
	if (hit !== void 0) return hit;
	let html;
	try {
		html = k.renderToString(tex, {
			displayMode: display,
			throwOnError: false,
			strict: "ignore",
			output: "htmlAndMathml"
		});
	} catch {
		html = `<code class="wy-math-error">${escapeHtml(tex)}</code>`;
	}
	cache.set(key, html);
	if (cache.size > 200) cache.delete(cache.keys().next().value);
	return html;
}
// src/editor/catalog.ts
var HEADING_ICONS = [
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6
];
var BASE_GROUPS = [
	{
		id: "text",
		label: "",
		rank: 10
	},
	{
		id: "lists",
		label: "",
		rank: 20
	},
	{
		id: "blocks",
		label: "",
		rank: 30
	},
	{
		id: "media",
		label: "",
		rank: 40
	}
];
function chainAt(editor, range) {
	const c = editor.chain().focus();
	return range ? c.deleteRange(range) : c;
}
function slashContext(editor, range, services) {
	let at = range;
	return {
		editor,
		services,
		get range() {
			return at;
		},
		insert: (type, attrs = {}, content) => insertFresh(editor, type, attrs, at, content),
		insertSections(type, child, count = 2) {
			const section = {
				type: child,
				content: [{ type: "paragraph" }]
			};
			chainAt(editor, at).insertContent({
				type,
				content: Array.from({ length: count }, () => section)
			}).command(({ tr }) => {
				const $head = tr.selection.$head;
				for (let d = $head.depth; d > 0; d--) {
					if ($head.node(d).type.name !== type) continue;
					tr.setSelection(TextSelection.near(tr.doc.resolve($head.start(d) + 1)));
					break;
				}
				return true;
			}).run();
		},
		clear() {
			if (at) editor.chain().focus().deleteRange(at).run();
			at = void 0;
		},
		chain: () => chainAt(editor, at)
	};
}
function builtinItems(config, files, services) {
	const b = config.base;
	const canUpload = !!services.upload;
	const items = b.headings.map((level) => ({
		id: `heading${level}`,
		group: "text",
		rank: level,
		label: "",
		icon: HEADING_ICONS[level - 1],
		run: (c) => c.chain().setHeading({ level }).run()
	}));
	if (b.blockquote) items.push({
		id: "quote",
		group: "text",
		rank: 20,
		label: "",
		icon: Quote,
		run: (c) => c.chain().toggleBlockquote().run()
	});
	if (b.callouts.length) items.push({
		id: "callout",
		group: "text",
		rank: 30,
		label: "",
		icon: MessageSquareQuote,
		run: (c) => c.chain().wrapIn("callout", {
			type: b.callouts[0],
			title: ""
		}).run()
	});
	if (b.codeBlocks) items.push({
		id: "codeBlock",
		group: "text",
		rank: 50,
		label: "",
		icon: FileCode2,
		run: (c) => c.chain().setCodeBlock().run()
	});
	if (b.dividers) items.push({
		id: "hr",
		group: "text",
		rank: 60,
		label: "",
		icon: Minus,
		run: (c) => c.chain().setHorizontalRule().run()
	});
	if (b.lists) {
		items.push({
			id: "bulletList",
			group: "lists",
			rank: 10,
			label: "",
			icon: List,
			run: (c) => c.chain().toggleBulletList().run()
		});
		items.push({
			id: "orderedList",
			group: "lists",
			rank: 20,
			label: "",
			icon: ListOrdered,
			run: (c) => c.chain().toggleOrderedList().run()
		});
	}
	if (b.taskLists) items.push({
		id: "taskList",
		group: "lists",
		rank: 30,
		label: "",
		icon: ListTodo,
		run: (c) => c.chain().toggleTaskList().run()
	});
	if (b.tables) items.push({
		id: "table",
		group: "blocks",
		rank: 10,
		label: "",
		icon: Columns3,
		run: (c) => c.chain().insertTable({
			rows: 3,
			cols: 3,
			withHeaderRow: true
		}).run()
	});
	if (b.images && canUpload) items.push({
		id: "image",
		group: "media",
		rank: 10,
		label: "",
		icon: Image$1,
		inline: true,
		run: (c) => {
			c.clear();
			files.pick("image");
		}
	});
	if (b.files && canUpload) items.push({
		id: "file",
		group: "media",
		rank: 20,
		label: "",
		icon: Paperclip,
		inline: true,
		run: (c) => {
			c.clear();
			files.pick("file");
		}
	});
	return items;
}
function slashCatalog(config, files, services, text) {
	const groups = [...BASE_GROUPS, ...config.extensions.flatMap((e) => e.slashGroups ?? [])];
	const rankOf = (id) => groups.find((g) => g.id === id)?.rank ?? 1e3;
	const defs = [...builtinItems(config, files, services), ...config.extensions.flatMap((e) => e.slash ?? [])];
	defs.sort((a, b) => rankOf(a.group) - rankOf(b.group) || (a.rank ?? 100) - (b.rank ?? 100));
	return defs.map((d) => {
		const label = text(d.label, `slash.items.${d.id}.label`) || d.id;
		const description = text(d.description, `slash.items.${d.id}.description`);
		return {
			id: d.id,
			group: d.group,
			label,
			description,
			icon: d.icon,
			keywords: `${d.id} ${label} ${description} ${d.keywords ?? ""}`.toLowerCase(),
			inline: !!d.inline,
			enabled: (editor) => d.enabled?.(editor) ?? true,
			run: (editor, range) => d.run(slashContext(editor, range, services))
		};
	});
}
function groupLabel(config, id, text) {
	return text([...BASE_GROUPS, ...config.extensions.flatMap((e) => e.slashGroups ?? [])].find((g) => g.id === id)?.label, `slash.groups.${id}`) || id;
}
/** items whose label matches come first, group by group, so "/columns" offers the columns before the table */
function filterItems(items, query) {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return items;
	const hits = items.filter((i) => words.every((w) => i.keywords.includes(w)));
	const labelled = (i) => words.every((w) => i.label.toLowerCase().includes(w));
	const strong = new Set(hits.filter(labelled).map((i) => i.group));
	const first = /* @__PURE__ */ new Map();
	hits.forEach((i, n) => first.has(i.group) || first.set(i.group, n));
	const keyed = hits.map((item, n) => ({
		item,
		group: (strong.has(item.group) ? 0 : hits.length) + first.get(item.group),
		label: labelled(item) ? 0 : 1,
		n
	}));
	keyed.sort((a, b) => a.group - b.group || a.label - b.label || a.n - b.n);
	return keyed.map((x) => x.item);
}
// src/editor/debounce.ts
function debounced(fn, delay, maxWait) {
	let timer;
	let since = 0;
	function cancel() {
		clearTimeout(timer);
		timer = void 0;
	}
	return {
		schedule() {
			const now = Date.now();
			if (timer === void 0) since = now;
			clearTimeout(timer);
			timer = setTimeout(() => {
				timer = void 0;
				fn();
			}, Math.max(0, Math.min(delay, since + maxWait - now)));
		},
		cancel
	};
}
// src/editor/files.ts
var QUALITY = .85;
var SCALABLE = {
	"image/png": true,
	"image/jpeg": true,
	"image/webp": true
};
function fitWithin(width, height, max) {
	const side = Math.max(width, height);
	if (side <= max) return null;
	const scale = max / side;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}
function renamed(name, type) {
	const ext = type === "image/png" ? "png" : "jpg";
	const base = name.replace(/\.[^./]+$/, "") || "image";
	const current = /\.([^./]+)$/.exec(name)?.[1]?.toLowerCase();
	if (current === ext || ext === "jpg" && current === "jpeg") return name;
	return `${base}.${ext}`;
}
function hasAlpha(data) {
	for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
	return false;
}
/** png keeps transparency, everything else becomes jpeg (quality 0.85); gifs stay as they are, nothing is upscaled */
async function downscaleImage(file, max) {
	if (!SCALABLE[file.type] || typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return file;
	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}
	try {
		const size = fitWithin(bitmap.width, bitmap.height, max);
		if (!size) return file;
		const canvas = new OffscreenCanvas(size.width, size.height);
		const ctx = canvas.getContext("2d");
		if (!ctx) return file;
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(bitmap, 0, 0, size.width, size.height);
		const alpha = file.type !== "image/jpeg" && hasAlpha(ctx.getImageData(0, 0, size.width, size.height).data);
		const type = alpha ? "image/png" : "image/jpeg";
		const blob = await canvas.convertToBlob(alpha ? { type } : {
			type,
			quality: QUALITY
		});
		if (blob.type !== type) return file;
		return new File([blob], renamed(file.name, type), {
			type,
			lastModified: file.lastModified
		});
	} catch {
		return file;
	} finally {
		bitmap.close();
	}
}
function chooseLocal(kind, multiple) {
	const { promise, resolve } = Promise.withResolvers();
	const input = document.createElement("input");
	input.type = "file";
	input.multiple = multiple;
	if (kind === "image") input.accept = "image/*";
	input.addEventListener("change", () => resolve(Array.from(input.files ?? [])), { once: true });
	input.addEventListener("cancel", () => resolve([]), { once: true });
	input.click();
	return promise;
}
function isImage(up) {
	return up.type.startsWith("image/") || up.type.startsWith("video/") || up.type.startsWith("audio/") || isImageSrc(up.url) || isImageSrc(up.name) || !!mediaKind(up.url);
}
function createFileController(o) {
	const b = o.config.base;
	function at(editor, pos) {
		return pos === null || pos === void 0 || pos > editor.state.doc.content.size ? null : pos;
	}
	function insertNodes(editor, content, pos) {
		const chain = editor.chain().focus();
		return pos === null ? chain.insertContent(content).run() : chain.insertContentAt(pos, content).run();
	}
	function insertResult(up, pos) {
		const editor = o.editor();
		if (!editor) return;
		const p = at(editor, pos);
		const schema = editor.schema;
		const alt = up.name.replace(/\.[^.]+$/, "") || null;
		if (b.images && isImage(up) && (schema.nodes.figure || schema.nodes.image)) {
			const $pos = p === null ? editor.state.selection.$from : editor.state.doc.resolve(p);
			if (!schema.nodes.figure || isInCell($pos) || schema.topNodeType.spec.content === "paragraph") insertNodes(editor, {
				type: "image",
				attrs: {
					src: up.url,
					alt
				}
			}, p);
			else {
				markFresh("figure");
				if (!insertNodes(editor, {
					type: "figure",
					attrs: {
						src: up.url,
						alt,
						align: o.config.format === "markdown" ? "center" : null
					}
				}, p)) takeFresh("figure");
			}
			return;
		}
		if (!schema.marks.link) return;
		const title = b.files && up.size !== void 0 ? formatBytes(up.size, o.locale) : null;
		insertNodes(editor, [{
			type: "text",
			text: up.name,
			marks: [{
				type: "link",
				attrs: {
					href: up.url,
					title
				}
			}]
		}, {
			type: "text",
			text: " "
		}], p);
	}
	const aborter = new AbortController();
	const inFlight = /* @__PURE__ */ new Map();
	let nextId = 0;
	function report() {
		const known = [...inFlight.values()].filter((f) => f !== null);
		o.progress(inFlight.size, known.length ? known.reduce((a, b) => a + b, 0) / known.length : null);
	}
	async function upload(file) {
		const send = o.services.upload;
		if (!send) throw new Error("no upload service");
		const id = nextId++;
		inFlight.set(id, null);
		report();
		try {
			const prepared = b.downscale && file.type.startsWith("image/") ? await downscaleImage(file, b.downscale) : file;
			const onProgress = (fraction) => {
				if (!inFlight.has(id)) return;
				inFlight.set(id, Math.min(1, Math.max(0, fraction)));
				report();
			};
			return await send(prepared, {
				onProgress,
				signal: aborter.signal
			});
		} finally {
			inFlight.delete(id);
			report();
		}
	}
	async function uploadAndInsert(file, pos) {
		try {
			const up = await upload(file);
			if (!aborter.signal.aborted) insertResult(up, pos);
		} catch {
			if (!aborter.signal.aborted) o.services.toast?.(o.t("editor.uploadFailed", { name: file.name }), "error");
		}
	}
	function accepts(file) {
		const type = file.type;
		return type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/") ? b.images || b.files : b.files;
	}
	function insert(files, pos = null) {
		const list = files.filter(accepts);
		if (!list.length || list.some((f) => f instanceof File) && !o.services.upload) return false;
		for (const f of list) if (f instanceof File) uploadAndInsert(f, pos);
		else insertResult(f, pos);
		return true;
	}
	async function choose(kind, multiple = true) {
		return (o.services.pickFile ? await o.services.pickFile(kind) : await chooseLocal(kind, multiple)) ?? [];
	}
	async function pick(kind, pos = null) {
		const picked = await choose(kind);
		if (picked.length) insert(picked, pos);
	}
	return {
		pick,
		choose,
		insert,
		upload,
		dispose: () => aborter.abort()
	};
}
// src/editor/history.ts
/** outside the local history and without an update event, keeping the caret where it was */
function replaceDocument(editor, doc) {
	const { state, view } = editor;
	const from = state.selection.from;
	const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content).setMeta("addToHistory", false).setMeta("preventUpdate", true);
	tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(from, tr.doc.content.size)), -1));
	view.dispatch(tr);
}
var ServerHistory = Extension.create({
	name: "serverHistory",
	addOptions() {
		return {
			bridge: () => null,
			collaborative: false
		};
	},
	addCommands() {
		if (this.options.collaborative) return {
			historyUndo: () => ({ commands }) => commands.undo?.() ?? false,
			historyRedo: () => ({ commands }) => commands.redo?.() ?? false
		};
		const step = (dir) => () => ({ state, dispatch, tr }) => {
			const before = tr.doc;
			if ((dir === "undo" ? undo : redo)(state, dispatch) && !tr.doc.eq(before)) return true;
			const bridge = this.options.bridge();
			if (!bridge || (dir === "undo" ? !bridge.canUndo() : !bridge.canRedo())) return false;
			if (dispatch) queueMicrotask(() => void (dir === "undo" ? bridge.undo() : bridge.redo()));
			return true;
		};
		return {
			historyUndo: step("undo"),
			historyRedo: step("redo")
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-z": () => this.editor.commands.historyUndo(),
			"Mod-Shift-z": () => this.editor.commands.historyRedo(),
			"Mod-y": () => this.editor.commands.historyRedo()
		};
	}
});
// src/components/EmojiPicker.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$24 = { class: "wy-emoji-picker" };
var _hoisted_2$20 = ["aria-label"];
var _hoisted_3$20 = [
	"aria-selected",
	"aria-label",
	"onClick"
];
var _hoisted_4$18 = ["placeholder", "aria-label"];
var _hoisted_5$17 = ["disabled"];
// src/components/EmojiPicker.vue
var EmojiPicker_default = /* @__PURE__ */ defineComponent({
	__name: "EmojiPicker",
	props: {
		value: {},
		t: { type: Function }
	},
	emits: ["pick"],
	setup(__props, { emit: __emit }) {
		const validIcon = (v) => !!v && parseBlockAttrs({ icon: v }) !== null;
		const props = __props;
		const emit = __emit;
		const EMOJIS = [
			"💡",
			"📌",
			"📝",
			"✅",
			"❌",
			"⚠️",
			"❗",
			"❓",
			"ℹ️",
			"🔥",
			"🚀",
			"🎯",
			"📣",
			"🔒",
			"🔑",
			"🛠️",
			"⚙️",
			"📎",
			"📅",
			"⏰",
			"💬",
			"👉",
			"⭐",
			"🧪",
			"🐛",
			"📦",
			"🔗",
			"📖",
			"🧭",
			"🏁",
			"❤️",
			"👍",
			"👀",
			"🎉",
			"🧠",
			"💰",
			"🌱",
			"☕",
			"🗂️",
			"📊",
			"🛡️",
			"🔍",
			"🚧",
			"📢",
			"🤝",
			"🏆",
			"🧩",
			"✏️"
		];
		const own = ref(EMOJIS.includes(props.value) ? "" : props.value);
		function applyOwn() {
			const v = own.value.trim();
			if (validIcon(v)) emit("pick", v);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$24, [
				createElementVNode("div", {
					class: "wy-emoji-grid",
					role: "listbox",
					"aria-label": __props.t("callout.icon")
				}, [(openBlock(), createElementBlock(Fragment$1, null, renderList(EMOJIS, (e) => {
					return createElementVNode("button", {
						key: e,
						type: "button",
						role: "option",
						class: "wy-emoji",
						"aria-selected": e === __props.value,
						"aria-label": e,
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: ($event) => emit("pick", e)
					}, toDisplayString(e), 41, _hoisted_3$20);
				}), 64))], 8, _hoisted_2$20),
				createElementVNode("form", {
					class: "wy-emoji-own",
					onSubmit: withModifiers(applyOwn, ["prevent"])
				}, [withDirectives(createElementVNode("input", {
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => own.value = $event),
					class: "wy-input is-sm",
					maxlength: "32",
					placeholder: __props.t("callout.ownIcon"),
					"aria-label": __props.t("callout.ownIcon")
				}, null, 8, _hoisted_4$18), [[vModelText, own.value]]), createElementVNode("button", {
					type: "submit",
					class: "wy-btn is-sm",
					disabled: !validIcon(own.value.trim())
				}, toDisplayString(__props.t("callout.useIcon")), 9, _hoisted_5$17)], 32),
				__props.value ? (openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: "wy-menu-item",
					onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[3] || (_cache[3] = ($event) => emit("pick", ""))
				}, toDisplayString(__props.t("callout.defaultIcon")), 33)) : createCommentVNode("", true)
			]);
		};
	}
});
// src/nodes/CalloutIcon.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$23 = ["width", "height"];
// src/nodes/CalloutIcon.vue
var CalloutIcon_default = /* @__PURE__ */ defineComponent({
	__name: "CalloutIcon",
	props: {
		type: {},
		size: {}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("svg", {
				viewBox: "0 0 24 24",
				width: __props.size ?? 16,
				height: __props.size ?? 16,
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"aria-hidden": "true"
			}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(CALLOUT_ICONS)[__props.type] ?? unref(CALLOUT_ICONS).note, ([tag, attrs], i) => {
				return openBlock(), createBlock(resolveDynamicComponent(tag), mergeProps({ key: i }, { ref_for: true }, attrs), null, 16);
			}), 128))], 8, _hoisted_1$23);
		};
	}
});
// src/nodes/CalloutView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$22 = ["data-variant", "data-color"];
var _hoisted_2$19 = {
	class: "wy-callout-title",
	contenteditable: "false"
};
var _hoisted_3$19 = [
	"aria-label",
	"aria-expanded",
	"disabled"
];
var _hoisted_4$17 = {
	key: 0,
	class: "wy-callout-emoji"
};
var _hoisted_5$16 = [
	"value",
	"placeholder",
	"size",
	"aria-label",
	"readonly"
];
var _hoisted_6$12 = { class: "wy-menu-heading" };
var _hoisted_7$8 = [
	"data-variant",
	"aria-pressed",
	"onClick"
];
var _hoisted_8$7 = ["data-variant"];
// src/nodes/CalloutView.vue
var CalloutView_default = /* @__PURE__ */ defineComponent({
	__name: "CalloutView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const kinds = ctx.config.base.callouts;
		const { selected, remove, update, copyText, readonly, onHeaderKey } = useBlockNode(props);
		const menu = ref(false);
		const picker = ref(false);
		const iconButton = ref(null);
		const type = computed(() => props.node.attrs.type || kinds[0] || "note");
		const icon = computed(() => props.node.attrs.icon || "");
		const color = computed(() => props.node.attrs.color ?? null);
		const kindLabel = (k) => ctx.has(`callout.types.${k}`) ? t(`callout.types.${k}`) : k;
		const titleInput = ref(null);
		const titleFocused = ref(false);
		const titled = computed(() => !!props.node.attrs.title || titleFocused.value);
		function setType(next) {
			update({ type: next });
			menu.value = false;
		}
		function setIcon(next) {
			update({ icon: next });
			picker.value = false;
			props.editor.commands.focus();
		}
		function setColor(next) {
			update({ color: next });
		}
		function onDocDown(e) {
			const target = e.target;
			if (!target.closest?.(".wy-callout-picker") && !iconButton.value?.contains(target)) picker.value = false;
		}
		watch(picker, (open) => open ? document.addEventListener("mousedown", onDocDown, true) : document.removeEventListener("mousedown", onDocDown, true));
		onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));
		async function addTitle() {
			menu.value = false;
			titleFocused.value = true;
			await nextTick();
			titleInput.value?.focus();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-callout"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: kindLabel(type.value),
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[8] || (_cache[8] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						convert: props,
						onClose: _cache[7] || (_cache[7] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [
							!titled.value && !unref(readonly) ? (openBlock(), createElementBlock("button", {
								key: 0,
								type: "button",
								class: "wy-menu-item",
								onClick: addTitle
							}, [createVNode(unref(Heading$1), {
								class: "wy-menu-icon",
								size: 16
							}), createTextVNode(toDisplayString(unref(t)("callout.addTitle")), 1)])) : createCommentVNode("", true),
							createVNode(PalettePicker_default, {
								value: color.value,
								t: unref(t),
								onPick: setColor
							}, null, 8, ["value", "t"]),
							createElementVNode("div", _hoisted_6$12, toDisplayString(unref(t)("callout.kinds")), 1),
							(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(kinds), (k) => {
								return openBlock(), createElementBlock("button", {
									key: k,
									type: "button",
									class: "wy-menu-item",
									"data-variant": k,
									"aria-pressed": k === type.value,
									role: "menuitemradio",
									onClick: ($event) => setType(k)
								}, [createElementVNode("span", {
									class: "wy-callout-swatch",
									"data-variant": k
								}, [createVNode(CalloutIcon_default, { type: k }, null, 8, ["type"])], 8, _hoisted_8$7), createElementVNode("span", null, toDisplayString(kindLabel(k)), 1)], 8, _hoisted_7$8);
							}), 128))
						]),
						_: 1
					}, 8, ["open", "convert"])]),
					default: withCtx(() => [createElementVNode("div", {
						class: normalizeClass(["wy-callout", {
							"has-title": titled.value,
							"has-icon": !!icon.value
						}]),
						"data-variant": type.value,
						"data-color": color.value || void 0,
						style: normalizeStyle(unref(calloutStyle)(color.value))
					}, [createElementVNode("div", _hoisted_2$19, [withDirectives((openBlock(), createElementBlock("button", {
						ref_key: "iconButton",
						ref: iconButton,
						type: "button",
						class: "wy-callout-icon",
						"aria-label": unref(t)("callout.changeIcon"),
						"aria-expanded": picker.value,
						disabled: unref(readonly),
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[1] || (_cache[1] = ($event) => picker.value = !picker.value)
					}, [icon.value ? (openBlock(), createElementBlock("span", _hoisted_4$17, toDisplayString(icon.value), 1)) : (openBlock(), createBlock(CalloutIcon_default, {
						key: 1,
						type: type.value
					}, null, 8, ["type"]))], 40, _hoisted_3$19)), [[unref(vTooltip), unref(t)("callout.changeIcon")]]), withDirectives(createElementVNode("input", {
						ref_key: "titleInput",
						ref: titleInput,
						class: "wy-callout-title-input",
						value: _ctx.node.attrs.title,
						placeholder: kindLabel(type.value),
						size: Math.max(3, String(_ctx.node.attrs.title || kindLabel(type.value)).length + 1),
						"aria-label": unref(t)("callout.title"),
						readonly: unref(readonly),
						onInput: _cache[2] || (_cache[2] = ($event) => unref(update)({ title: $event.target.value })),
						onFocus: _cache[3] || (_cache[3] = ($event) => titleFocused.value = true),
						onBlur: _cache[4] || (_cache[4] = ($event) => titleFocused.value = false),
						onKeydown: _cache[5] || (_cache[5] = (...args) => unref(onHeaderKey) && unref(onHeaderKey)(...args))
					}, null, 40, _hoisted_5$16), [[vShow, titled.value]])]), createVNode(unref(NodeViewContent), { class: "wy-callout-body" })], 14, _hoisted_1$22), picker.value ? (openBlock(), createBlock(AnchoredPopover_default, {
						key: 0,
						anchor: iconButton.value,
						class: "wy-menu wy-callout-picker",
						onEscape: _cache[6] || (_cache[6] = ($event) => picker.value = false)
					}, {
						default: withCtx(() => [createVNode(EmojiPicker_default, {
							value: icon.value,
							t: unref(t),
							onPick: setIcon
						}, null, 8, ["value", "t"])]),
						_: 1
					}, 8, ["anchor"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/core/diagrams.ts
var PLANTUML_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
/** plantuml's text encoding: raw deflate of the utf-8 source in its own base64 alphabet */
async function plantumlEncode(source) {
	const stream = new Blob([new TextEncoder().encode(source)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
	const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
	let out = "";
	for (let i = 0; i < bytes.length; i += 3) {
		const b1 = bytes[i];
		const b2 = bytes[i + 1] ?? 0;
		const b3 = bytes[i + 2] ?? 0;
		out += PLANTUML_ALPHABET[b1 >> 2] + PLANTUML_ALPHABET[(b1 & 3) << 4 | b2 >> 4] + PLANTUML_ALPHABET[(b2 & 15) << 2 | b3 >> 6] + PLANTUML_ALPHABET[b3 & 63];
	}
	return out;
}
async function plantumlUrl(server, source) {
	return `${server}/svg/${await plantumlEncode(source)}`;
}
function luminance(color) {
	const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim());
	let rgb = null;
	if (hex) {
		const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
		rgb = [
			0,
			2,
			4
		].map((i) => parseInt(h.slice(i, i + 2), 16));
	} else {
		const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color);
		if (m) rgb = [
			m[1],
			m[2],
			m[3]
		].map(Number);
	}
	return rgb ? (.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]) / 255 : null;
}
/** dark when the editor's `--vc-bg` (or the page background) is dark */
function isDarkTheme(el) {
	if (typeof document === "undefined") return false;
	const target = el ?? document.documentElement;
	const style = getComputedStyle(target);
	const l = luminance(style.getPropertyValue("--vc-bg")) ?? luminance(getComputedStyle(document.body).backgroundColor);
	if (l !== null) return l < .5;
	return style.colorScheme === "dark" || document.documentElement.classList.contains("dark");
}
/** calls `fn` when the host switches its theme (class, style or color scheme) */
function watchTheme(fn) {
	if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
	const observer = new MutationObserver(fn);
	const opts = {
		attributes: true,
		attributeFilter: [
			"class",
			"style",
			"data-theme"
		]
	};
	observer.observe(document.documentElement, opts);
	if (document.body) observer.observe(document.body, opts);
	const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
	media?.addEventListener("change", fn);
	return () => {
		observer.disconnect();
		media?.removeEventListener("change", fn);
	};
}
var mermaid = null;
var queue = Promise.resolve();
var counter = 0;
/** renders one diagram at a time: mermaid keeps its configuration and scratch elements global */
function renderMermaid(source, dark) {
	mermaid ??= import("mermaid").then((m) => m.default);
	const job = queue.then(async () => {
		const api = await mermaid;
		api.initialize({
			startOnLoad: false,
			securityLevel: "strict",
			theme: dark ? "dark" : "default",
			fontFamily: "inherit"
		});
		const id = `wy-mermaid-${++counter}`;
		try {
			await api.parse(source);
			return (await api.render(id, source)).svg;
		} finally {
			document.getElementById(id)?.remove();
			document.getElementById(`d${id}`)?.remove();
		}
	});
	queue = job.catch(() => void 0);
	return job;
}
// src/nodes/DiagramView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$21 = ["data-language"];
var _hoisted_2$18 = {
	key: 0,
	class: "wy-diagram-error",
	role: "alert"
};
var _hoisted_3$18 = ["innerHTML"];
var _hoisted_4$16 = ["src", "alt"];
var _hoisted_5$15 = {
	key: 3,
	class: "wy-diagram-hint"
};
var _hoisted_6$11 = {
	key: 4,
	class: "wy-diagram-hint"
};
// src/nodes/DiagramView.vue
var DiagramView_default = /* @__PURE__ */ defineComponent({
	__name: "DiagramView",
	props: {
		language: {},
		source: {},
		server: {},
		services: {},
		t: { type: Function }
	},
	setup(__props) {
		const props = __props;
		const root = ref(null);
		const svg = ref("");
		const img = ref("");
		const error = ref("");
		const loading = ref(true);
		let timer = 0;
		let abort = null;
		let blobUrl = "";
		let run = 0;
		function setImage(url, blob = false) {
			if (blobUrl) URL.revokeObjectURL(blobUrl);
			blobUrl = blob ? url : "";
			img.value = url;
		}
		async function render() {
			const id = ++run;
			const source = props.source.trim();
			abort?.abort();
			if (!source) {
				svg.value = "";
				setImage("");
				error.value = "";
				loading.value = false;
				return;
			}
			loading.value = true;
			try {
				if (props.language === "mermaid") {
					const out = await renderMermaid(source, isDarkTheme(root.value));
					if (id !== run) return;
					svg.value = out;
					error.value = "";
				} else if (props.services.plantuml) {
					const ctrl = abort = new AbortController();
					const markup = await props.services.plantuml(source, ctrl.signal);
					if (id !== run) return;
					setImage(URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" })), true);
					error.value = "";
				} else {
					const url = await plantumlUrl(props.server, source);
					if (id !== run) return;
					setImage(url);
					error.value = "";
				}
			} catch (e) {
				if (id !== run) return;
				svg.value = "";
				setImage("");
				error.value = (e instanceof Error ? e.message : String(e)).split("\n").slice(0, 6).join("\n") || props.t("diagram.failed");
			} finally {
				if (id === run) loading.value = false;
			}
		}
		function schedule() {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => void render(), 300);
		}
		watch(() => [props.source, props.language], schedule);
		let stopTheme = () => {};
		onMounted(() => {
			render();
			if (props.language === "mermaid") stopTheme = watchTheme(schedule);
		});
		onBeforeUnmount(() => {
			run++;
			window.clearTimeout(timer);
			abort?.abort();
			stopTheme();
			setImage("");
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "root",
				ref: root,
				class: normalizeClass(["wy-diagram", { "is-loading": loading.value && !svg.value && !img.value }]),
				"data-language": __props.language
			}, [error.value ? (openBlock(), createElementBlock("div", _hoisted_2$18, toDisplayString(error.value), 1)) : svg.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: "wy-diagram-svg",
				innerHTML: svg.value
			}, null, 8, _hoisted_3$18)) : img.value ? (openBlock(), createElementBlock("img", {
				key: 2,
				class: "wy-diagram-img",
				src: img.value,
				alt: __props.t("diagram.alt"),
				onError: _cache[0] || (_cache[0] = ($event) => error.value = __props.t("diagram.failed"))
			}, null, 40, _hoisted_4$16)) : loading.value ? (openBlock(), createElementBlock("p", _hoisted_5$15, toDisplayString(__props.t("diagram.loading")), 1)) : (openBlock(), createElementBlock("p", _hoisted_6$11, toDisplayString(__props.t("diagram.empty")), 1))], 10, _hoisted_1$21);
		};
	}
});
// src/nodes/CodeBlockView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$20 = { class: "wy-code" };
var _hoisted_2$17 = ["innerHTML"];
var _hoisted_3$17 = { class: "wy-field" };
var _hoisted_4$15 = { class: "wy-label" };
var _hoisted_5$14 = [
	"value",
	"placeholder",
	"onKeydown"
];
var _hoisted_6$10 = ["value"];
// src/nodes/CodeBlockView.vue
var CodeBlockView_default = /* @__PURE__ */ defineComponent({
	__name: "CodeBlockView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const { selected, remove, update, copyText, readonly } = useBlockNode(props);
		const menu = ref(false);
		const language = computed(() => props.node.attrs.language ?? "");
		const editing = ref(false);
		const highlighted = computed(() => editing.value ? "" : highlightCode(props.node.textContent, language.value));
		const diagram = computed(() => ctx.config.base.diagrams.includes(language.value) ? language.value : null);
		const sourceShown = computed(() => !diagram.value || editing.value || selected.value || !props.node.textContent.trim());
		const languages = ctx.config.base.codeBlocks || [];
		const listId = `wy-code-languages-${Math.random().toString(36).slice(2, 8)}`;
		const label = computed(() => {
			for (const h of ctx.codeBlock) {
				const l = h.label?.(props.node);
				if (l) return l;
			}
			return language.value || t("code.label");
		});
		function syncEditing() {
			const pos = props.getPos();
			if (typeof pos !== "number") return;
			const { from, to } = props.editor.state.selection;
			editing.value = props.editor.isFocused && from > pos && to < pos + props.node.nodeSize;
		}
		props.editor.on("selectionUpdate", syncEditing);
		props.editor.on("blur", syncEditing);
		props.editor.on("focus", syncEditing);
		onBeforeUnmount(() => {
			props.editor.off("selectionUpdate", syncEditing);
			props.editor.off("blur", syncEditing);
			props.editor.off("focus", syncEditing);
		});
		function editSource() {
			const pos = props.getPos();
			if (readonly.value || typeof pos !== "number") return;
			const view = props.editor.view;
			view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos + props.node.nodeSize - 1)));
			view.focus();
		}
		function setLanguage(e) {
			update({ language: e.target.value.trim().toLowerCase() || null });
		}
		function commit(e) {
			setLanguage(e);
			menu.value = false;
			props.editor.commands.focus();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: normalizeClass(["wy-node wy-node-code", {
					"is-editing": editing.value,
					"is-diagram": diagram.value,
					"is-source-hidden": !sourceShown.value
				}])
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: label.value,
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[2] || (_cache[2] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						convert: props,
						onClose: _cache[1] || (_cache[1] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [
							createElementVNode("label", _hoisted_3$17, [createElementVNode("span", _hoisted_4$15, toDisplayString(unref(t)("code.language")), 1), createElementVNode("input", {
								class: "wy-input is-sm",
								value: language.value,
								placeholder: unref(t)("code.languagePlaceholder"),
								spellcheck: "false",
								list: listId,
								onChange: setLanguage,
								onKeydown: withKeys(withModifiers(commit, ["prevent"]), ["enter"])
							}, null, 40, _hoisted_5$14)]),
							createElementVNode("datalist", { id: listId }, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(languages), (l) => {
								return openBlock(), createElementBlock("option", {
									key: l,
									value: l
								}, null, 8, _hoisted_6$10);
							}), 128))]),
							(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(ctx).codeBlock.filter((x) => x.menu), (h, i) => {
								return openBlock(), createBlock(resolveDynamicComponent(h.menu), mergeProps({ key: i }, { ref_for: true }, props), null, 16);
							}), 128))
						]),
						_: 1
					}, 8, ["open", "convert"])]),
					default: withCtx(() => [
						createElementVNode("pre", _hoisted_1$20, [!editing.value ? (openBlock(), createElementBlock("code", {
							key: 0,
							class: "wy-code-highlight",
							"aria-hidden": "true",
							contenteditable: "false",
							innerHTML: highlighted.value
						}, null, 8, _hoisted_2$17)) : createCommentVNode("", true), createVNode(unref(NodeViewContent), {
							as: "code",
							class: normalizeClass(language.value ? `language-${language.value}` : ""),
							spellcheck: "false"
						}, null, 8, ["class"])]),
						diagram.value ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: "wy-code-diagram",
							contenteditable: "false",
							onClick: editSource
						}, [createVNode(DiagramView_default, {
							language: diagram.value,
							source: _ctx.node.textContent,
							server: unref(ctx).config.base.plantumlServer,
							services: unref(ctx).services,
							t: unref(t)
						}, null, 8, [
							"language",
							"source",
							"server",
							"services",
							"t"
						])])) : createCommentVNode("", true),
						(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(ctx).codeBlock.filter((x) => x.below), (h, i) => {
							return openBlock(), createElementBlock("div", {
								key: i,
								class: "wy-code-below",
								contenteditable: "false",
								"data-block-portal": "",
								onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
							}, [(openBlock(), createBlock(resolveDynamicComponent(h.below), mergeProps({ ref_for: true }, props), null, 16))], 32);
						}), 128))
					]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			}, 8, ["class"]);
		};
	}
});
// src/nodes/DetailsView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$19 = [
	"data-open",
	"data-heading",
	"data-block-color"
];
var _hoisted_2$16 = {
	class: "wy-details-summary",
	contenteditable: "false"
};
var _hoisted_3$16 = ["aria-label", "aria-expanded"];
var _hoisted_4$14 = [
	"value",
	"placeholder",
	"aria-label",
	"readonly"
];
// src/nodes/DetailsView.vue
var DetailsView_default = /* @__PURE__ */ defineComponent({
	__name: "DetailsView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const t = contextOf(props.editor).t;
		const { selected, remove, update, copyText, readonly, onHeaderKey } = useBlockNode(props);
		const readerOpen = ref(null);
		const open = computed(() => readonly.value ? readerOpen.value ?? !!props.node.attrs.open : !!props.node.attrs.open);
		function toggle() {
			if (readonly.value) {
				readerOpen.value = !open.value;
				return;
			}
			const pos = props.getPos();
			const { from, to } = props.editor.state.selection;
			if (open.value && typeof pos === "number" && from > pos && to < pos + props.node.nodeSize) props.editor.view.dispatch(props.editor.state.tr.setSelection(NodeSelection.create(props.editor.state.doc, pos)));
			update({ open: !open.value });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-details"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: _ctx.node.attrs.heading ? unref(t)("details.headingLabel", { n: _ctx.node.attrs.heading }) : unref(t)("details.label"),
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove)
				}, {
					default: withCtx(() => [createElementVNode("div", {
						class: "wy-details",
						"data-open": open.value ? "true" : "false",
						"data-heading": _ctx.node.attrs.heading || void 0,
						"data-block-color": _ctx.node.attrs.color || void 0,
						style: normalizeStyle(unref(blockColorStyle)(_ctx.node.attrs.color) ?? void 0)
					}, [createElementVNode("div", _hoisted_2$16, [withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-details-toggle",
						"aria-label": unref(t)(open.value ? "details.collapse" : "details.expand"),
						"aria-expanded": open.value,
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: toggle
					}, [createVNode(unref(ChevronRight), { size: 16 })], 40, _hoisted_3$16)), [[unref(vTooltip), unref(t)(open.value ? "details.collapse" : "details.expand")]]), createElementVNode("input", {
						class: "wy-details-title",
						value: _ctx.node.attrs.title,
						placeholder: unref(t)("details.titlePlaceholder"),
						"aria-label": unref(t)("details.title"),
						readonly: unref(readonly),
						onInput: _cache[1] || (_cache[1] = ($event) => unref(update)({ title: $event.target.value })),
						onKeydown: _cache[2] || (_cache[2] = (...args) => unref(onHeaderKey) && unref(onHeaderKey)(...args))
					}, null, 40, _hoisted_4$14)]), withDirectives(createVNode(unref(NodeViewContent), { class: "wy-details-body" }, null, 512), [[vShow, open.value]])], 12, _hoisted_1$19)]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/nodes/DividerView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$18 = { class: "wy-divider-hit" };
var _hoisted_2$15 = {
	class: "wy-divider-ornament",
	"aria-hidden": "true"
};
var _hoisted_3$15 = { class: "wy-menu-heading" };
var _hoisted_4$13 = { class: "wy-menu-split" };
var _hoisted_5$13 = ["aria-label"];
var _hoisted_6$9 = [
	"aria-label",
	"aria-pressed",
	"onClick"
];
var _hoisted_7$7 = ["aria-label"];
var _hoisted_8$6 = ["aria-pressed", "onClick"];
var _hoisted_9$5 = { class: "wy-menu-heading" };
var _hoisted_10$5 = ["aria-label"];
var _hoisted_11$4 = ["aria-pressed", "aria-label"];
var _hoisted_12$4 = [
	"aria-pressed",
	"aria-label",
	"onClick"
];
var _hoisted_13$4 = ["value", "aria-label"];
var _hoisted_14$3 = { class: "wy-menu-heading" };
var _hoisted_15$3 = ["aria-pressed", "onClick"];
var _hoisted_16$2 = {
	class: "wy-menu-sample",
	"aria-hidden": "true"
};
var _hoisted_17$2 = { class: "wy-field" };
var _hoisted_18$2 = { class: "wy-label" };
var _hoisted_19$2 = [
	"value",
	"aria-invalid",
	"onKeydown"
];
var _hoisted_20$2 = {
	key: 0,
	class: "wy-menu-hint is-danger"
};
// src/nodes/DividerView.vue
var DividerView_default = /* @__PURE__ */ defineComponent({
	__name: "DividerView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const t = contextOf(props.editor).t;
		const { selected, remove, update, copyText, readonly } = useBlockNode(props);
		const menu = ref(false);
		const attrs = computed(() => props.node.attrs);
		const ornament = computed(() => dividerOrnament(attrs.value));
		const look = computed(() => dividerStyle(attrs.value));
		const customColor = computed(() => attrs.value.color?.startsWith("#") ? attrs.value.color : "");
		const charInvalid = ref(false);
		function setChar(e) {
			const v = e.target.value.trim();
			charInvalid.value = v !== "" && !validChar(v);
			if (!charInvalid.value) update({ char: v || null });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-divider"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)("divider.label"),
					selected: unref(selected),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					editable: false,
					onDelete: unref(remove),
					onMore: _cache[3] || (_cache[3] = ($event) => menu.value = !menu.value)
				}, {
					menu: withCtx(() => [createVNode(BlockMenu_default, {
						open: menu.value,
						class: "wy-divider-menu",
						onClose: _cache[2] || (_cache[2] = ($event) => menu.value = false)
					}, {
						default: withCtx(() => [
							createElementVNode("div", _hoisted_3$15, toDisplayString(unref(t)("divider.line")), 1),
							createElementVNode("div", _hoisted_4$13, [createElementVNode("div", {
								class: "wy-seg",
								role: "group",
								"aria-label": unref(t)("divider.line")
							}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(DIVIDER_STYLES), (s) => {
								return withDirectives((openBlock(), createElementBlock("button", {
									key: s,
									type: "button",
									"aria-label": unref(t)(`divider.styles.${s}`),
									"aria-pressed": attrs.value.style === s,
									onClick: ($event) => unref(update)({ style: s })
								}, [createElementVNode("span", {
									class: "wy-line-sample",
									style: normalizeStyle({
										borderTopStyle: s,
										borderTopWidth: s === "double" ? "5px" : "3px"
									}),
									"aria-hidden": "true"
								}, null, 4)], 8, _hoisted_6$9)), [[unref(vTooltip), unref(t)(`divider.styles.${s}`)]]);
							}), 128))], 8, _hoisted_5$13), createElementVNode("div", {
								class: "wy-seg",
								role: "group",
								"aria-label": unref(t)("divider.width")
							}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(DIVIDER_WIDTHS), (w) => {
								return openBlock(), createElementBlock("button", {
									key: w,
									type: "button",
									"aria-pressed": attrs.value.width === w,
									onClick: ($event) => unref(update)({ width: w })
								}, toDisplayString(unref(t)("divider.widthPx", { n: w })), 9, _hoisted_8$6);
							}), 128))], 8, _hoisted_7$7)]),
							createElementVNode("div", _hoisted_9$5, toDisplayString(unref(t)("divider.color")), 1),
							createElementVNode("div", {
								class: "wy-swatches",
								role: "group",
								"aria-label": unref(t)("divider.color")
							}, [
								withDirectives((openBlock(), createElementBlock("button", {
									type: "button",
									class: "wy-swatch is-round is-default",
									"aria-pressed": !attrs.value.color,
									"aria-label": unref(t)("divider.defaultColor"),
									onClick: _cache[0] || (_cache[0] = ($event) => unref(update)({ color: null }))
								}, [!attrs.value.color ? (openBlock(), createBlock(unref(Check), {
									key: 0,
									size: 12
								})) : createCommentVNode("", true)], 8, _hoisted_11$4)), [[unref(vTooltip), unref(t)("divider.defaultColor")]]),
								(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(DIVIDER_COLORS), (c) => {
									return withDirectives((openBlock(), createElementBlock("button", {
										key: c,
										type: "button",
										class: "wy-swatch is-round",
										style: normalizeStyle({ background: `var(--vc-tint-${c})` }),
										"aria-pressed": attrs.value.color === c,
										"aria-label": unref(t)(`divider.colors.${c}`),
										onClick: ($event) => unref(update)({ color: c })
									}, [attrs.value.color === c ? (openBlock(), createBlock(unref(Check), {
										key: 0,
										class: "wy-swatch-check",
										size: 12
									})) : createCommentVNode("", true)], 12, _hoisted_12$4)), [[unref(vTooltip), unref(t)(`divider.colors.${c}`)]]);
								}), 128)),
								withDirectives((openBlock(), createElementBlock("label", {
									class: "wy-swatch is-round is-custom",
									style: normalizeStyle(customColor.value ? { "--wy-sw": customColor.value } : void 0)
								}, [customColor.value ? (openBlock(), createBlock(unref(Check), {
									key: 0,
									class: "wy-swatch-check",
									size: 12
								})) : createCommentVNode("", true), createElementVNode("input", {
									type: "color",
									class: "wy-sr-only",
									value: customColor.value || "#808080",
									"aria-label": unref(t)("divider.customColor"),
									onChange: _cache[1] || (_cache[1] = ($event) => unref(update)({ color: $event.target.value }))
								}, null, 40, _hoisted_13$4)], 4)), [[unref(vTooltip), unref(t)("divider.customColor")]])
							], 8, _hoisted_10$5),
							createElementVNode("div", _hoisted_14$3, toDisplayString(unref(t)("divider.design")), 1),
							(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(DIVIDER_DESIGNS), (d) => {
								return openBlock(), createElementBlock("button", {
									key: d,
									type: "button",
									class: "wy-menu-item",
									role: "menuitemradio",
									"aria-pressed": !attrs.value.char && attrs.value.design === d,
									onClick: ($event) => unref(update)({
										design: d,
										char: null
									})
								}, [createElementVNode("span", _hoisted_16$2, toDisplayString(d === "none" ? "-" : unref(DIVIDER_GLYPHS)[d]), 1), createElementVNode("span", null, toDisplayString(unref(t)(`divider.designs.${d}`)), 1)], 8, _hoisted_15$3);
							}), 128)),
							createElementVNode("label", _hoisted_17$2, [
								createElementVNode("span", _hoisted_18$2, toDisplayString(unref(t)("divider.customChar")), 1),
								createElementVNode("input", {
									class: "wy-input is-sm",
									value: attrs.value.char ?? "",
									maxlength: "16",
									spellcheck: "false",
									"aria-invalid": charInvalid.value || void 0,
									onChange: setChar,
									onKeydown: withKeys(withModifiers(setChar, ["prevent"]), ["enter"])
								}, null, 40, _hoisted_19$2),
								charInvalid.value ? (openBlock(), createElementBlock("span", _hoisted_20$2, toDisplayString(unref(t)("divider.charInvalid")), 1)) : createCommentVNode("", true)
							])
						]),
						_: 1
					}, 8, ["open"])]),
					default: withCtx(() => [createElementVNode("div", _hoisted_1$18, [!ornament.value ? (openBlock(), createElementBlock("hr", {
						key: 0,
						class: "wy-divider",
						style: normalizeStyle(look.value)
					}, null, 4)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: "wy-divider has-ornament",
						role: "separator",
						style: normalizeStyle(look.value)
					}, [createElementVNode("span", _hoisted_2$15, toDisplayString(ornament.value), 1)], 4))])]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/nodes/FigureView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$17 = { class: "wy-figure-inner" };
var _hoisted_2$14 = { class: "wy-figure-media" };
var _hoisted_3$14 = ["src", "aria-label"];
var _hoisted_4$12 = ["src", "aria-label"];
var _hoisted_5$12 = ["src", "alt"];
var _hoisted_6$8 = ["aria-label", "title"];
var _hoisted_7$6 = ["value", "placeholder"];
var _hoisted_8$5 = { class: "wy-figure-bar" };
var _hoisted_9$4 = {
	class: "wy-seg",
	role: "group"
};
var _hoisted_10$4 = [
	"aria-pressed",
	"aria-label",
	"onClick"
];
var _hoisted_11$3 = { class: "wy-inline-field" };
var _hoisted_12$3 = { class: "wy-label" };
var _hoisted_13$3 = ["value", "aria-label"];
var _hoisted_14$2 = ["aria-label", "disabled"];
var _hoisted_15$2 = ["aria-label"];
var _hoisted_16$1 = ["aria-expanded"];
var _hoisted_17$1 = {
	key: 0,
	class: "wy-figure-form"
};
var _hoisted_18$1 = { class: "wy-field" };
var _hoisted_19$1 = { class: "wy-label" };
var _hoisted_20$1 = ["value", "placeholder"];
var _hoisted_21$1 = { class: "wy-menu-hint" };
// src/nodes/FigureView.vue
var FigureView_default = /* @__PURE__ */ defineComponent({
	__name: "FigureView",
	props: nodeViewProps,
	setup(__props) {
		const ICONS = {
			left: AlignHorizontalJustifyStart,
			center: AlignHorizontalJustifyCenter,
			right: AlignHorizontalJustifyEnd,
			"float-left": PanelLeft,
			"float-right": PanelRight
		};
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const markdown = ctx.config.format === "markdown";
		const aligns = markdown ? FIGURE_ALIGNS : [
			"left",
			"center",
			"right"
		];
		const Field = ctx.field;
		const { selected, editing, startEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
		const form = ref(false);
		const box = ref(null);
		const tools = ref(null);
		const caption = computed(() => String(props.node.attrs.caption ?? ""));
		const width = computed(() => Number(props.node.attrs.width) || 100);
		const media = computed(() => mediaKind(String(props.node.attrs.src ?? "")));
		const align = computed(() => props.node.attrs.align ?? null);
		const shown = computed(() => shownAlign(align.value, caption.value));
		const rightAnchored = computed(() => shown.value === "right" || shown.value === "float-right");
		const boxStyle = computed(() => {
			if (props.node.attrs.width) return { "--wy-figure-width": `${width.value}%` };
			if (props.node.attrs.pixels) return { "--wy-figure-width": `${props.node.attrs.pixels}px` };
		});
		function el() {
			return box.value?.$el ?? null;
		}
		function column(node) {
			const parent = node.parentElement;
			const cs = getComputedStyle(parent);
			return {
				left: parent.getBoundingClientRect().left + parseFloat(cs.paddingLeft),
				width: parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
			};
		}
		const toolsStyle = ref("");
		let observer = null;
		function place() {
			const node = el();
			const parent = tools.value?.offsetParent;
			if (!node?.parentElement || !parent) return;
			const col = column(node);
			toolsStyle.value = `left: ${col.left - parent.getBoundingClientRect().left}px; max-width: ${col.width}px`;
		}
		watch(editing, async (on) => {
			observer?.disconnect();
			observer = null;
			form.value = false;
			if (!on) return;
			await nextTick();
			const node = el();
			if (!node?.parentElement) return;
			observer = new ResizeObserver(place);
			observer.observe(node);
			observer.observe(node.parentElement);
			place();
		});
		watch([shown, width], place, { flush: "post" });
		onBeforeUnmount(() => observer?.disconnect());
		function setWidth(n) {
			if (!Number.isFinite(n)) return;
			const w = Math.min(100, Math.max(10, Math.round(n)));
			update({
				width: w === 100 ? null : w,
				pixels: null
			});
		}
		function onWidthKey(e) {
			const step = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
			if (step) {
				e.preventDefault();
				setWidth(width.value + step * (e.shiftKey ? 10 : 1));
			} else if (e.key === "Enter") {
				e.preventDefault();
				setWidth(Number(e.target.value));
			}
		}
		function startResize(e) {
			const node = el();
			const handle = e.currentTarget;
			if (!node?.parentElement || readonly.value) return;
			e.preventDefault();
			const col = column(node).width;
			const startX = e.clientX;
			const startW = node.getBoundingClientRect().width;
			const factor = shown.value === "center" ? 2 : rightAnchored.value ? -1 : 1;
			const move = (ev) => setWidth((startW + (ev.clientX - startX) * factor) / col * 100);
			const stop = () => {
				handle.removeEventListener("pointermove", move);
				handle.removeEventListener("pointerup", stop);
				handle.removeEventListener("pointercancel", stop);
			};
			handle.setPointerCapture(e.pointerId);
			handle.addEventListener("pointermove", move);
			handle.addEventListener("pointerup", stop);
			handle.addEventListener("pointercancel", stop);
		}
		async function replace() {
			const first = (await ctx.files.choose("image", false))[0];
			if (!first) return;
			try {
				const up = first instanceof File ? await ctx.files.upload(first) : first;
				update({
					src: up.url,
					alt: props.node.attrs.alt || up.name.replace(/\.[^.]+$/, "") || null
				});
			} catch {
				ctx.services.toast?.(t("editor.uploadFailed", { name: first.name }), "error");
			}
		}
		function zoom() {
			ctx.zoom({
				src: String(props.node.attrs.src ?? ""),
				alt: String(props.node.attrs.alt ?? "")
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				ref_key: "box",
				ref: box,
				as: "div",
				class: normalizeClass(["wy-node wy-node-figure wy-figure", `wy-align-${shown.value}`]),
				style: normalizeStyle(boxStyle.value)
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)(media.value ? `image.${media.value}` : "image.label"),
					selected: unref(selected) || unref(editing),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					onEdit: unref(startEdit),
					onDelete: unref(remove)
				}, {
					default: withCtx(() => [createElementVNode("figure", _hoisted_1$17, [createElementVNode("span", _hoisted_2$14, [media.value === "video" ? (openBlock(), createElementBlock("video", {
						key: 0,
						src: _ctx.node.attrs.src,
						controls: "",
						preload: "metadata",
						"aria-label": _ctx.node.attrs.alt || "",
						onClick: _cache[0] || (_cache[0] = ($event) => unref(editing) || unref(startEdit)())
					}, null, 8, _hoisted_3$14)) : media.value === "audio" ? (openBlock(), createElementBlock("audio", {
						key: 1,
						src: _ctx.node.attrs.src,
						controls: "",
						preload: "metadata",
						"aria-label": _ctx.node.attrs.alt || "",
						onClick: _cache[1] || (_cache[1] = ($event) => unref(editing) || unref(startEdit)())
					}, null, 8, _hoisted_4$12)) : (openBlock(), createElementBlock("img", {
						key: 2,
						src: _ctx.node.attrs.src,
						alt: _ctx.node.attrs.alt || "",
						class: normalizeClass({ "is-zoomable": unref(readonly) }),
						loading: "lazy",
						draggable: "false",
						onClick: _cache[2] || (_cache[2] = ($event) => _ctx.editor.isEditable ? unref(editing) || unref(startEdit)() : zoom())
					}, null, 10, _hoisted_5$12)), unref(editing) ? (openBlock(), createElementBlock("span", {
						key: 3,
						class: normalizeClass(["wy-figure-resize", { "is-left": rightAnchored.value }]),
						role: "separator",
						"aria-label": unref(t)("image.resize"),
						title: unref(t)("image.resize"),
						contenteditable: "false",
						onPointerdown: startResize
					}, null, 42, _hoisted_6$8)) : createCommentVNode("", true)]), unref(editing) ? (openBlock(), createElementBlock("figcaption", {
						key: 0,
						class: "wy-figure-caption-edit",
						contenteditable: "false",
						onMousedown: _cache[5] || (_cache[5] = withModifiers(() => {}, ["stop"]))
					}, [markdown ? (openBlock(), createBlock(resolveDynamicComponent(unref(Field)), {
						key: 0,
						class: "wy-field-quiet",
						size: "compact",
						format: "markdown",
						inline: "",
						"model-value": caption.value,
						placeholder: unref(t)("image.captionPlaceholder"),
						"onUpdate:modelValue": _cache[3] || (_cache[3] = (v) => unref(update)({ caption: v || null }))
					}, null, 8, ["model-value", "placeholder"])) : (openBlock(), createElementBlock("input", {
						key: 1,
						class: "wy-input is-quiet",
						value: caption.value,
						placeholder: unref(t)("image.captionPlaceholder"),
						onInput: _cache[4] || (_cache[4] = ($event) => unref(update)({ caption: $event.target.value || null }))
					}, null, 40, _hoisted_7$6))], 32)) : caption.value ? (openBlock(), createElementBlock("figcaption", {
						key: 1,
						onClick: _cache[6] || (_cache[6] = ($event) => unref(startEdit)())
					}, toDisplayString(caption.value), 1)) : createCommentVNode("", true)]), unref(editing) ? (openBlock(), createElementBlock("div", {
						key: 0,
						ref_key: "tools",
						ref: tools,
						class: "wy-figure-tools",
						style: normalizeStyle(toolsStyle.value),
						contenteditable: "false",
						"data-block-portal": "",
						onMousedown: _cache[11] || (_cache[11] = withModifiers(() => {}, ["stop"]))
					}, [createElementVNode("div", _hoisted_8$5, [
						createElementVNode("div", _hoisted_9$4, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(aligns), (a) => {
							return withDirectives((openBlock(), createElementBlock("button", {
								key: a,
								type: "button",
								"aria-pressed": shown.value === a,
								"aria-label": unref(t)(`image.align.${a}`),
								onClick: ($event) => unref(update)({ align: a })
							}, [(openBlock(), createBlock(resolveDynamicComponent(ICONS[a]), { size: 16 }))], 8, _hoisted_10$4)), [[unref(vTooltip), unref(t)(`image.align.${a}`)]]);
						}), 128))]),
						createElementVNode("label", _hoisted_11$3, [
							createElementVNode("span", _hoisted_12$3, toDisplayString(unref(t)("image.width")), 1),
							createElementVNode("input", {
								class: "wy-input is-sm is-num",
								type: "number",
								min: "10",
								max: "100",
								step: "1",
								value: width.value,
								"aria-label": unref(t)("image.width"),
								onChange: _cache[7] || (_cache[7] = ($event) => setWidth(Number($event.target.value))),
								onKeydown: onWidthKey
							}, null, 40, _hoisted_13$3),
							_cache[12] || (_cache[12] = createElementVNode("span", { class: "wy-muted" }, "%", -1))
						]),
						withDirectives((openBlock(), createElementBlock("button", {
							type: "button",
							class: "wy-tool",
							"aria-label": unref(t)("image.originalSize"),
							disabled: !_ctx.node.attrs.width && !_ctx.node.attrs.pixels,
							onClick: _cache[8] || (_cache[8] = ($event) => unref(update)({
								width: null,
								pixels: null
							}))
						}, [createVNode(unref(Scaling), { size: 16 })], 8, _hoisted_14$2)), [[unref(vTooltip), unref(t)("image.originalSize")]]),
						!media.value ? withDirectives((openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: "wy-tool",
							"aria-label": unref(t)("image.zoom"),
							onClick: zoom
						}, [createVNode(unref(ZoomIn), { size: 16 })], 8, _hoisted_15$2)), [[unref(vTooltip), unref(t)("image.zoom")]]) : createCommentVNode("", true),
						createElementVNode("button", {
							type: "button",
							class: "wy-btn is-sm",
							"aria-expanded": form.value,
							onClick: _cache[9] || (_cache[9] = ($event) => form.value = !form.value)
						}, [createVNode(unref(ImagePlus), { size: 16 }), createTextVNode(toDisplayString(unref(t)("image.replace")), 1)], 8, _hoisted_16$1),
						(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(ctx).figure.filter((x) => x.tools), (h, i) => {
							return openBlock(), createBlock(resolveDynamicComponent(h.tools), mergeProps({ key: i }, { ref_for: true }, props), null, 16);
						}), 128))
					]), form.value ? (openBlock(), createElementBlock("div", _hoisted_17$1, [
						createElementVNode("label", _hoisted_18$1, [createElementVNode("span", _hoisted_19$1, toDisplayString(unref(t)("image.alt")), 1), createElementVNode("input", {
							class: "wy-input is-sm",
							type: "text",
							value: _ctx.node.attrs.alt || "",
							placeholder: unref(t)("image.altPlaceholder"),
							onInput: _cache[10] || (_cache[10] = ($event) => unref(update)({ alt: $event.target.value || null }))
						}, null, 40, _hoisted_20$1)]),
						createElementVNode("span", _hoisted_21$1, toDisplayString(unref(t)("image.altHelp")), 1),
						unref(ctx).services.upload || unref(ctx).services.pickFile ? (openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: "wy-btn is-sm",
							onClick: replace
						}, toDisplayString(unref(t)("image.replaceFile")), 1)) : createCommentVNode("", true)
					])) : createCommentVNode("", true)], 36)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"readonly",
					"copy-text",
					"onEdit",
					"onDelete"
				])]),
				_: 1
			}, 8, ["class", "style"]);
		};
	}
});
// src/nodes/InlineImageView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$16 = [
	"src",
	"alt",
	"title"
];
var _hoisted_2$13 = { class: "wy-field" };
var _hoisted_3$13 = { class: "wy-label" };
var _hoisted_4$11 = ["value", "placeholder"];
var _hoisted_5$11 = { class: "wy-field" };
var _hoisted_6$7 = { class: "wy-label" };
var _hoisted_7$5 = ["value"];
// src/nodes/InlineImageView.vue
var InlineImageView_default = /* @__PURE__ */ defineComponent({
	__name: "InlineImageView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const { selected, editing, startEdit, stopEdit, finishEdit, update, readonly, onKeydown } = useBlockNode(props);
		const image = ref(null);
		const altInput = ref(null);
		const canFigure = ref(false);
		watch(editing, async (on) => {
			if (!on) return;
			const pos = props.getPos();
			canFigure.value = !!props.editor.schema.nodes.figure && typeof pos === "number" && !isInCell(props.editor.state.doc.resolve(pos));
			await nextTick();
			altInput.value?.focus();
		});
		function toFigure() {
			const pos = props.getPos();
			if (typeof pos !== "number") return;
			const { src, alt, title, width, align } = props.node.attrs;
			stopEdit();
			markFresh("figure");
			props.editor.chain().focus().insertContentAt({
				from: pos,
				to: pos + props.node.nodeSize
			}, {
				type: "figure",
				attrs: {
					src,
					alt,
					caption: title || null,
					width,
					align
				}
			}).run();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "span",
				class: normalizeClass(["wy-inline-atom", {
					"is-selected": unref(selected),
					"is-editing": unref(editing)
				}])
			}, {
				default: withCtx(() => [createElementVNode("img", {
					ref_key: "image",
					ref: image,
					src: _ctx.node.attrs.src,
					alt: _ctx.node.attrs.alt || "",
					title: _ctx.node.attrs.title || void 0,
					class: normalizeClass({ "is-zoomable": unref(readonly) }),
					style: normalizeStyle(_ctx.node.attrs.width ? `width:${_ctx.node.attrs.width}%` : void 0),
					loading: "lazy",
					draggable: "false",
					onClick: _cache[0] || (_cache[0] = ($event) => _ctx.editor.isEditable ? unref(startEdit)() : unref(ctx).zoom({
						src: _ctx.node.attrs.src,
						alt: _ctx.node.attrs.alt || ""
					}))
				}, null, 14, _hoisted_1$16), unref(editing) ? (openBlock(), createBlock(AnchoredPopover_default, {
					key: 0,
					anchor: image.value,
					class: "wy-popover",
					onEscape: unref(onKeydown)
				}, {
					default: withCtx(() => [
						createElementVNode("label", _hoisted_2$13, [createElementVNode("span", _hoisted_3$13, toDisplayString(unref(t)("image.alt")), 1), createElementVNode("input", {
							ref_key: "altInput",
							ref: altInput,
							class: "wy-input",
							type: "text",
							value: _ctx.node.attrs.alt || "",
							placeholder: unref(t)("image.altPlaceholder"),
							onInput: _cache[1] || (_cache[1] = ($event) => unref(update)({ alt: $event.target.value || null })),
							onKeydown: _cache[2] || (_cache[2] = withKeys(withModifiers((...args) => unref(finishEdit) && unref(finishEdit)(...args), ["prevent"]), ["enter"]))
						}, null, 40, _hoisted_4$11)]),
						createElementVNode("label", _hoisted_5$11, [createElementVNode("span", _hoisted_6$7, toDisplayString(unref(t)("image.title")), 1), createElementVNode("input", {
							class: "wy-input",
							type: "text",
							value: _ctx.node.attrs.title || "",
							onInput: _cache[3] || (_cache[3] = ($event) => unref(update)({ title: $event.target.value || null })),
							onKeydown: _cache[4] || (_cache[4] = withKeys(withModifiers((...args) => unref(finishEdit) && unref(finishEdit)(...args), ["prevent"]), ["enter"]))
						}, null, 40, _hoisted_7$5)]),
						canFigure.value ? (openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: "wy-btn is-sm",
							onClick: toFigure
						}, toDisplayString(unref(t)("image.toFigure")), 1)) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["anchor", "onEscape"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]);
		};
	}
});
// src/nodes/mathField.ts
function applyMathEdit(area, tex, write, edit) {
	const el = area.value;
	const next = edit(tex, el?.selectionStart ?? tex.length, el?.selectionEnd ?? tex.length);
	write(next.value);
	nextTick(() => {
		area.value?.focus();
		area.value?.setSelectionRange(next.start, next.end);
	});
}
// src/nodes/MathBlockView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$15 = ["innerHTML"];
var _hoisted_2$12 = {
	key: 1,
	class: "wy-block-empty"
};
var _hoisted_3$12 = [
	"value",
	"placeholder",
	"aria-label"
];
var _hoisted_4$10 = ["innerHTML"];
var _hoisted_5$10 = {
	key: 0,
	class: "wy-math-palette"
};
// src/nodes/MathBlockView.vue
var MathBlockView_default = /* @__PURE__ */ defineComponent({
	__name: "MathBlockView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const palettes = ctx.math.filter((m) => m.palette);
		const { selected, editing, startEdit, finishEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
		const area = ref(null);
		const tex = computed(() => props.node.attrs.tex ?? "");
		const apply = (edit) => applyMathEdit(area, tex.value, (v) => update({ tex: v }), edit);
		const html = computed(() => tex.value.trim() ? renderMath(tex.value.trim(), true) : "");
		watch(editing, async (on) => {
			if (on) {
				await nextTick();
				area.value?.focus();
				area.value?.setSelectionRange(tex.value.length, tex.value.length);
			} else if (!tex.value.trim()) remove();
		});
		function onKey(e) {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				finishEdit();
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "div",
				class: "wy-node wy-node-math"
			}, {
				default: withCtx(() => [createVNode(BlockFrame_default, {
					label: unref(t)("math.label"),
					selected: unref(selected),
					editing: unref(editing),
					readonly: unref(readonly),
					"copy-text": unref(copyText),
					onEdit: unref(startEdit),
					onDelete: unref(remove)
				}, {
					default: withCtx(() => [!unref(editing) ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: "wy-block-rendered",
						onClick: _cache[0] || (_cache[0] = (...args) => unref(startEdit) && unref(startEdit)(...args))
					}, [html.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: "wy-math-block",
						innerHTML: html.value
					}, null, 8, _hoisted_1$15)) : (openBlock(), createElementBlock("p", _hoisted_2$12, toDisplayString(unref(t)("math.empty")), 1))])) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: "wy-math-editor",
						contenteditable: "false",
						"data-block-portal": "",
						onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
					}, [
						createElementVNode("textarea", {
							ref_key: "area",
							ref: area,
							class: "wy-input is-mono",
							value: tex.value,
							placeholder: unref(t)("math.placeholder"),
							"aria-label": unref(t)("math.tex"),
							spellcheck: "false",
							onInput: _cache[1] || (_cache[1] = ($event) => unref(update)({ tex: $event.target.value })),
							onKeydown: onKey
						}, null, 40, _hoisted_3$12),
						createElementVNode("div", {
							class: "wy-math-block",
							innerHTML: html.value
						}, null, 8, _hoisted_4$10),
						unref(palettes).length ? (openBlock(), createElementBlock("div", _hoisted_5$10, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(palettes), (p, i) => {
							return openBlock(), createBlock(resolveDynamicComponent(p.palette), {
								key: i,
								apply
							});
						}), 128))])) : createCommentVNode("", true)
					], 32))]),
					_: 1
				}, 8, [
					"label",
					"selected",
					"editing",
					"readonly",
					"copy-text",
					"onEdit",
					"onDelete"
				])]),
				_: 1
			});
		};
	}
});
// src/nodes/MathInlineView.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$14 = ["title"];
var _hoisted_2$11 = ["innerHTML"];
var _hoisted_3$11 = {
	key: 1,
	class: "wy-muted"
};
var _hoisted_4$9 = [
	"value",
	"placeholder",
	"aria-label"
];
var _hoisted_5$9 = ["innerHTML"];
// src/nodes/MathInlineView.vue
var MathInlineView_default = /* @__PURE__ */ defineComponent({
	__name: "MathInlineView",
	props: nodeViewProps,
	setup(__props) {
		const props = __props;
		const ctx = contextOf(props.editor);
		const t = ctx.t;
		const palettes = ctx.math.filter((m) => m.palette);
		const { selected, editing, startEdit, finishEdit, update, remove, readonly, onKeydown } = useBlockNode(props, { editOnInsert: true });
		const anchor = ref(null);
		const area = ref(null);
		const tex = computed(() => props.node.attrs.tex ?? "");
		const apply = (edit) => applyMathEdit(area, tex.value, (v) => update({ tex: v }), edit);
		const html = computed(() => tex.value.trim() ? renderMath(tex.value.trim(), false) : "");
		watch(editing, async (on) => {
			if (on) {
				await nextTick();
				area.value?.focus();
				area.value?.select();
			} else if (!tex.value.trim()) remove();
		});
		function onKey(e) {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				finishEdit();
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(NodeViewWrapper), {
				as: "span",
				class: normalizeClass(["wy-inline-atom", {
					"is-selected": unref(selected),
					"is-editing": unref(editing)
				}])
			}, {
				default: withCtx(() => [createElementVNode("span", {
					ref_key: "anchor",
					ref: anchor,
					class: "wy-math-inline",
					title: unref(readonly) ? void 0 : unref(t)("math.edit"),
					onClick: _cache[0] || (_cache[0] = ($event) => unref(readonly) || unref(startEdit)())
				}, [html.value ? (openBlock(), createElementBlock("span", {
					key: 0,
					innerHTML: html.value
				}, null, 8, _hoisted_2$11)) : (openBlock(), createElementBlock("span", _hoisted_3$11, toDisplayString(unref(t)("math.empty")), 1))], 8, _hoisted_1$14), unref(editing) ? (openBlock(), createBlock(AnchoredPopover_default, {
					key: 0,
					anchor: anchor.value,
					class: normalizeClass(["wy-popover", { "is-wide": unref(palettes).length }]),
					onEscape: unref(onKeydown)
				}, {
					default: withCtx(() => [
						createElementVNode("textarea", {
							ref_key: "area",
							ref: area,
							class: "wy-input is-mono",
							rows: "2",
							value: tex.value,
							placeholder: unref(t)("math.placeholder"),
							"aria-label": unref(t)("math.tex"),
							spellcheck: "false",
							onInput: _cache[1] || (_cache[1] = ($event) => unref(update)({ tex: $event.target.value })),
							onKeydown: onKey
						}, null, 40, _hoisted_4$9),
						createElementVNode("span", {
							class: "wy-math-preview",
							innerHTML: html.value
						}, null, 8, _hoisted_5$9),
						(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(palettes), (p, i) => {
							return openBlock(), createBlock(resolveDynamicComponent(p.palette), {
								key: i,
								apply
							});
						}), 128))
					]),
					_: 1
				}, 8, [
					"anchor",
					"class",
					"onEscape"
				])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]);
		};
	}
});
// src/editor/pasteUrl.ts
var PASTE_URL_KEY = new PluginKey("wysiwygPasteUrl");
var PasteUrl = Extension.create({
	name: "pasteUrl",
	addProseMirrorPlugins() {
		const editor = this.editor;
		let menu = null;
		let pending = null;
		const close = () => {
			menu?.close();
			menu = null;
			pending = null;
		};
		/** the pasted paragraph, if it still holds just the address */
		const pastedBlock = (view, p) => {
			if (p.from > view.state.doc.content.size) return null;
			const $pos = view.state.doc.resolve(p.from);
			return $pos.parent.type.name === "paragraph" && $pos.parent.textContent === p.url ? {
				from: $pos.before(),
				to: $pos.after()
			} : null;
		};
		const pick = (entry) => {
			const p = pending;
			close();
			if (!p || entry.key === "link") return;
			const view = editor.view;
			const block = pastedBlock(view, p);
			const { schema } = view.state;
			const node = entry.key === "bookmark" ? schema.nodes.bookmark?.create({ url: p.url }) : schema.nodes.embed?.create(embedAttrs(p.url));
			if (!block || !node) return;
			view.dispatch(view.state.tr.replaceWith(block.from, block.to, node).scrollIntoView());
			view.focus();
		};
		const open = (view, p) => {
			const ctx = contextOf(editor);
			const schema = view.state.schema;
			const target = embedFor(p.url);
			const items = [{
				key: "link",
				title: ctx.t("paste.link"),
				icon: Link$1
			}];
			if (schema.nodes.bookmark) items.push({
				key: "bookmark",
				title: ctx.t("paste.bookmark"),
				icon: Bookmark
			});
			if (schema.nodes.embed && target) items.push({
				key: "embed",
				title: ctx.t("paste.embed"),
				detail: ctx.t(`embed.providers.${target.provider}`),
				icon: AppWindow
			});
			if (items.length < 2) return;
			pending = p;
			menu = openPopup(editor, SuggestionList_default, {
				items,
				label: ctx.t("paste.label"),
				onPick: pick
			}, caretRect(editor, p.from + p.url.length));
		};
		return [new Plugin({
			key: PASTE_URL_KEY,
			props: {
				handlePaste(view, event) {
					const url = loneUrl(event.clipboardData?.getData("text/plain") ?? "");
					const { $from, empty } = view.state.selection;
					if (!url || !empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size || isInCell($from)) return false;
					const link = view.state.schema.marks.link;
					const tr = view.state.tr.insertText(url, $from.pos);
					if (link) tr.addMark($from.pos, $from.pos + url.length, link.create({ href: url }));
					view.dispatch(tr);
					open(view, {
						from: $from.pos,
						url
					});
					return true;
				},
				handleKeyDown(_view, event) {
					if (!menu) return false;
					if (event.key === "Escape") {
						close();
						return true;
					}
					if (menu.ref?.onKeyDown?.(event)) return true;
					close();
					return false;
				},
				handleDOMEvents: { blur: () => {
					close();
					return false;
				} }
			},
			view: () => ({
				update(view, prev) {
					if (menu && (view.state.doc !== prev.doc || !view.state.selection.eq(prev.selection))) close();
				},
				destroy: close
			})
		})];
	}
});
// src/editor/clipboard.ts
function looksLikeMarkdown(text) {
	return text.includes("\n") || /^(#|-|\*|>|```|\|)/.test(text) || /\*\*|==|\$|\[/.test(text);
}
var RICH_HTML = /<(h[1-6]|ul|ol|li|table|img|blockquote|strong|em|b|i|a|pre|code)[\s>]/i;
function pasteAsMarkdown(text, html) {
	if (!text.trim() || !looksLikeMarkdown(text)) return false;
	return !html || !RICH_HTML.test(html) && !new DOMParser().parseFromString(html, "text/html").querySelector("[data-pm-slice]");
}
function clipboardText(slice, markdown) {
	const { content } = slice;
	const schema = content.firstChild?.type.schema;
	if (!schema) return "";
	let inline = true;
	content.forEach((n) => {
		if (!n.isInline) inline = false;
	});
	try {
		if (inline) return markdown.serializeInline(schema.topNodeType.create(null, schema.nodes.paragraph.create(null, content)));
		return fragmentMarkdown(markdown, content, schema);
	} catch {
		return content.textBetween(0, content.size, "\n\n");
	}
}
var DROP = "style, script, meta, link, title, xml, head, noscript, iframe, object, embed, form, input:not([type=checkbox]), button, select, textarea, svg, canvas";
var KEEP_ATTRS = {
	A: [
		"href",
		"title",
		"data-type"
	],
	IMG: [
		"src",
		"alt",
		"title",
		"width",
		"data-align",
		"data-width"
	],
	TD: ["colspan", "rowspan"],
	TH: ["colspan", "rowspan"],
	OL: ["start", "data-list-style"],
	UL: [
		"data-type",
		"data-list-style",
		"data-marker"
	],
	LI: ["data-type", "data-checked"],
	DIV: [
		"data-type",
		"data-variant",
		"data-title",
		"data-callout",
		"data-math-block",
		"data-tex"
	],
	P: [
		"data-type",
		"data-align",
		"data-width"
	],
	FIGURE: [
		"data-type",
		"data-align",
		"data-width",
		"data-caption"
	],
	SPAN: [
		"data-color",
		"data-math-inline",
		"data-tex"
	],
	MARK: ["data-color"],
	PRE: ["data-meta"],
	CODE: ["class"],
	INPUT: ["type", "checked"],
	DETAILS: ["open", "data-title"]
};
var ALIGNABLE = {
	P: true,
	H1: true,
	H2: true,
	H3: true,
	H4: true,
	H5: true,
	H6: true,
	DIV: true,
	TD: true,
	TH: true
};
var BLOCK = "p, div, h1, h2, h3, h4, h5, h6, ul, ol, li, table, blockquote, pre, hr, figure";
function wrapChildren(el, tag) {
	const w = el.ownerDocument.createElement(tag);
	while (el.firstChild) w.appendChild(el.firstChild);
	el.appendChild(w);
}
function unwrap(el) {
	el.replaceWith(...Array.from(el.childNodes));
}
/** keeps text alignment but drops every other style; the editor's own html (`data-pm-slice`) passes untouched */
function cleanPastedHtml(html) {
	const doc = new DOMParser().parseFromString(html, "text/html");
	if (doc.querySelector("[data-pm-slice]")) return html;
	const body = doc.body;
	body.querySelectorAll(DROP).forEach((el) => el.remove());
	const walker = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
	const comments = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) comments.push(n);
	comments.forEach((n) => n.parentNode?.removeChild(n));
	for (const el of Array.from(body.querySelectorAll("*"))) {
		const tag = el.tagName;
		const s = el.style;
		const weight = s.fontWeight;
		const align = ALIGNABLE[tag] && [
			"center",
			"right",
			"justify"
		].includes(s.textAlign) ? s.textAlign : "";
		if ((tag === "B" || tag === "STRONG") && weight && (weight === "normal" || Number(weight) <= 400)) {
			unwrap(el);
			continue;
		}
		if (tag.includes(":")) {
			unwrap(el);
			continue;
		}
		if ((weight === "bold" || Number(weight) >= 600) && !/^(B|STRONG|H\d|TH)$/.test(tag)) wrapChildren(el, "strong");
		if (s.fontStyle === "italic" && tag !== "I" && tag !== "EM") wrapChildren(el, "em");
		if (s.textDecorationLine?.includes("underline") || s.textDecoration?.includes("underline")) {
			if (tag !== "U" && tag !== "A") wrapChildren(el, "u");
		}
		if (s.textDecorationLine?.includes("line-through") || s.textDecoration?.includes("line-through")) {
			if (tag !== "S" && tag !== "DEL") wrapChildren(el, "s");
		}
		const keep = KEEP_ATTRS[tag] ?? [];
		for (const a of Array.from(el.attributes)) if (!keep.includes(a.name)) el.removeAttribute(a.name);
		if (align) el.setAttribute("style", `text-align: ${align}`);
	}
	for (const el of Array.from(body.querySelectorAll("span, font"))) if (!el.attributes.length) unwrap(el);
	for (const el of Array.from(body.querySelectorAll("div:not([data-type]):not([data-callout]):not([data-math-block])"))) {
		if (el.querySelector(BLOCK)) continue;
		const p = doc.createElement("p");
		p.append(...Array.from(el.childNodes));
		if (el.getAttribute("style")) p.setAttribute("style", el.getAttribute("style"));
		el.replaceWith(p);
	}
	for (const p of Array.from(body.querySelectorAll("p"))) if (!p.textContent?.replace(/\u00a0/g, " ").trim() && !p.querySelector("img")) p.remove();
	return body.innerHTML;
}
function clipboardExtension(markdown, copyMarkdown) {
	return Extension.create({
		name: "wysiwygClipboard",
		addProseMirrorPlugins() {
			return [new Plugin({
				key: new PluginKey("wysiwygClipboard"),
				props: {
					clipboardTextSerializer: copyMarkdown ? (slice) => clipboardText(slice, markdown) : void 0,
					transformPastedHTML: cleanPastedHtml,
					handlePaste(view, event) {
						const data = event.clipboardData;
						const text = data?.getData("text/plain") ?? "";
						if (!pasteAsMarkdown(text, data?.getData("text/html") ?? "")) return false;
						const { state } = view;
						if (state.selection.$from.parent.type.spec.code) return false;
						let slice;
						try {
							slice = state.schema.topNodeType.spec.content === "paragraph" ? Slice.maxOpen(markdown.parseInline(text, state.schema).content) : markdown.slice(text, state.schema);
						} catch {
							return false;
						}
						if (isInCell(state.selection.$from)) {
							if (slice.content.firstChild?.type.name === "table") return false;
							slice = cellSlice(slice, state);
						}
						view.dispatch(state.tr.replaceSelection(slice).setMeta("paste", true).setMeta("uiEvent", "paste").scrollIntoView());
						return true;
					}
				}
			})];
		}
	});
}
// src/editor/gutter.ts
var GRIP_ICON = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"12\" r=\"1\"/><circle cx=\"9\" cy=\"5\" r=\"1\"/><circle cx=\"9\" cy=\"19\" r=\"1\"/><circle cx=\"15\" cy=\"12\" r=\"1\"/><circle cx=\"15\" cy=\"5\" r=\"1\"/><circle cx=\"15\" cy=\"19\" r=\"1\"/></svg>";
var PLUS_ICON = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12h14\"/><path d=\"M12 5v14\"/></svg>";
var GAP = 8;
var FRAME_GAP = 12;
var HIDE_DELAY$2 = 250;
var LEAF = "input, textarea, select, button, img, svg, video, audio, iframe, canvas";
function firstLineRect(dom) {
	const walker = document.createTreeWalker(dom, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: (n) => {
		if (n instanceof Element) {
			if (n.matches(".wy-block-tools, .wy-block-menu, [data-block-portal]")) return NodeFilter.FILTER_REJECT;
			return n.matches(LEAF) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		}
		return n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	} });
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		let rects;
		if (n instanceof Element) rects = n.getClientRects();
		else {
			const range = document.createRange();
			range.selectNodeContents(n);
			rects = range.getClientRects();
		}
		if (rects.length && rects[0].height > 0) return rects[0];
	}
	return null;
}
function frameEdge(dom) {
	const frame = dom.classList.contains("wy-block-frame") ? dom : dom.querySelector(":scope > .wy-block-frame");
	if (!frame) return null;
	const body = frame.querySelector(":scope > .wy-block-body");
	const rect = body?.getBoundingClientRect();
	if (!body || !rect || rect.width === 0) return dom.getBoundingClientRect().left - 6;
	return rect.left - (parseFloat(getComputedStyle(body).outlineOffset) || 0);
}
function blockAtPos(view, inside) {
	if (inside < 0 || inside > view.state.doc.content.size) return null;
	const $pos = view.state.doc.resolve(inside);
	const pos = $pos.depth === 0 ? $pos.pos : $pos.before(1);
	if (pos < 0 || pos >= view.state.doc.content.size || !view.state.doc.nodeAt(pos)) return null;
	const dom = view.nodeDOM(pos);
	return dom instanceof HTMLElement && dom.parentNode === view.dom ? {
		pos,
		dom
	} : null;
}
function nodeAtSafe(view, pos) {
	return pos >= 0 && pos < view.state.doc.content.size ? view.state.doc.nodeAt(pos) : null;
}
function blockAt(view, target) {
	if (!(target instanceof Node)) return null;
	let el = target;
	while (el && el.parentNode !== view.dom) el = el.parentNode;
	if (!(el instanceof HTMLElement)) return null;
	return blockAtPos(view, view.posAtDOM(el, 0));
}
function blockBeside(view, y) {
	const edge = view.dom.getBoundingClientRect().left + 1;
	const hit = view.posAtCoords({
		left: edge,
		top: y
	});
	const found = hit && blockAtPos(view, hit.inside >= 0 ? hit.inside : hit.pos);
	if (!found) return null;
	const rect = found.dom.getBoundingClientRect();
	return y >= rect.top && y <= rect.bottom ? found : null;
}
var GutterView = class {
	el;
	grip;
	plus;
	hovered = null;
	container = null;
	zone = null;
	frame = 0;
	view;
	options;
	hideTimer = 0;
	constructor(view, options) {
		this.view = view;
		this.options = options;
		const labels = options.labels();
		this.el = document.createElement("div");
		this.el.className = "wy-gutter";
		this.el.setAttribute("contenteditable", "false");
		this.grip = document.createElement("span");
		this.grip.className = "wy-grip";
		this.grip.draggable = true;
		this.grip.title = labels.drag;
		this.grip.setAttribute("role", "button");
		this.grip.setAttribute("aria-haspopup", "menu");
		this.grip.tabIndex = -1;
		this.grip.innerHTML = GRIP_ICON;
		this.plus = document.createElement("button");
		this.plus.type = "button";
		this.plus.className = "wy-grip";
		this.plus.title = labels.add;
		this.plus.setAttribute("aria-label", labels.add);
		this.plus.innerHTML = PLUS_ICON;
		this.el.append(this.plus, this.grip);
		this.el.addEventListener("mouseenter", this.cancelHide);
		this.grip.addEventListener("dragstart", this.onDragStart);
		this.grip.addEventListener("click", this.onGripClick);
		this.grip.addEventListener("dragend", this.onDragEnd);
		this.plus.addEventListener("mousedown", (e) => e.preventDefault());
		this.plus.addEventListener("click", this.onPlus);
		this.hide();
		this.bindLater();
	}
	bindLater = () => {
		this.frame = 0;
		if (!this.bind()) this.frame = requestAnimationFrame(this.bindLater);
	};
	bind() {
		const container = this.view.dom.parentElement;
		const zone = container?.parentElement;
		if (!container || !zone || !this.view.dom.isConnected) return false;
		if (zone === this.zone && container === this.container) return true;
		this.unbind();
		this.container = container;
		this.zone = zone;
		container.appendChild(this.el);
		zone.addEventListener("mousemove", this.onMove);
		zone.addEventListener("mouseleave", this.onLeave);
		return true;
	}
	unbind() {
		this.zone?.removeEventListener("mousemove", this.onMove);
		this.zone?.removeEventListener("mouseleave", this.onLeave);
		this.zone = null;
	}
	update() {
		this.bind();
		if (this.hovered && !this.view.editable) this.hide();
		else if (this.hovered) {
			if (!nodeAtSafe(this.view, this.hovered.pos) || this.view.nodeDOM(this.hovered.pos) !== this.hovered.dom) this.hide();
			else this.place();
		}
	}
	destroy() {
		cancelAnimationFrame(this.frame);
		this.unbind();
		this.cancelHide();
		this.el.remove();
	}
	onMove = (e) => {
		if (!this.view.editable || this.view.dragging || this.options.menuOpen()) return;
		const target = e.target;
		if (this.el.contains(target) || this.inStrip(e.clientX, e.clientY)) {
			this.cancelHide();
			return;
		}
		const dom = this.view.dom;
		let found = null;
		if (dom.contains(target)) found = blockAt(this.view, target);
		else if (e.clientX < dom.getBoundingClientRect().left) found = blockBeside(this.view, e.clientY);
		if (!found) {
			this.scheduleHide();
			return;
		}
		this.cancelHide();
		if (this.hovered?.dom === found.dom && this.hovered.pos === found.pos) return;
		this.hovered = found;
		this.place();
	};
	onLeave = () => this.scheduleHide();
	inStrip(x, y) {
		if (!this.hovered) return false;
		const h = this.el.getBoundingClientRect();
		const b = this.hovered.dom.getBoundingClientRect();
		return y >= h.top && y <= h.bottom && x >= h.left && x <= Math.max(h.right, b.left);
	}
	scheduleHide() {
		if (!this.hovered || this.hideTimer || this.options.menuOpen()) return;
		this.hideTimer = window.setTimeout(() => {
			this.hideTimer = 0;
			this.hide();
		}, HIDE_DELAY$2);
	}
	cancelHide = () => {
		if (!this.hideTimer) return;
		window.clearTimeout(this.hideTimer);
		this.hideTimer = 0;
	};
	place() {
		const container = this.container;
		if (!this.hovered || !container) return;
		const { dom } = this.hovered;
		const rect = dom.getBoundingClientRect();
		const base = container.getBoundingClientRect();
		const style = getComputedStyle(dom);
		const lineHeight = parseFloat(style.lineHeight) || 24;
		this.el.style.display = "flex";
		const width = this.el.offsetWidth;
		const height = this.el.offsetHeight;
		const line = firstLineRect(dom);
		const centre = line ? line.top + Math.min(line.height, lineHeight) / 2 : rect.top + (parseFloat(style.paddingTop) || 0) + lineHeight / 2;
		const ring = style.float !== "none" ? null : dom.classList.contains("tableWrapper") ? rect.left : frameEdge(dom);
		const left = ring === null ? rect.left - GAP - width : ring - FRAME_GAP - width;
		this.el.style.top = `${centre - height / 2 - base.top + container.scrollTop}px`;
		this.el.style.left = `${left - base.left}px`;
	}
	hide() {
		this.cancelHide();
		this.hovered = null;
		this.el.style.display = "none";
	}
	onGripClick = () => {
		if (!this.hovered) return;
		const { pos } = this.hovered;
		const node = nodeAtSafe(this.view, pos);
		if (!node) return;
		if (NodeSelection.isSelectable(node)) this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)));
		this.options.onMenu(pos, this.grip);
	};
	onPlus = () => {
		if (!this.hovered) return;
		const node = nodeAtSafe(this.view, this.hovered.pos);
		if (!node) return;
		const after = this.hovered.pos + node.nodeSize;
		this.hide();
		this.options.onInsertAfter(after);
	};
	onDragStart = (e) => {
		if (!this.hovered || !e.dataTransfer) return;
		const { pos, dom } = this.hovered;
		if (!nodeAtSafe(this.view, pos)) return;
		const selection = NodeSelection.create(this.view.state.doc, pos);
		this.view.dispatch(this.view.state.tr.setSelection(selection));
		const slice = selection.content();
		const { dom: html, text } = this.view.serializeForClipboard(slice);
		e.dataTransfer.clearData();
		e.dataTransfer.setData("text/html", html.innerHTML);
		e.dataTransfer.setData("text/plain", text);
		e.dataTransfer.effectAllowed = "copyMove";
		const rect = dom.getBoundingClientRect();
		e.dataTransfer.setDragImage(dom, Math.min(24, rect.width / 2), 12);
		this.view.dragging = {
			slice,
			move: true
		};
		this.el.style.display = "none";
	};
	onDragEnd = () => {
		window.setTimeout(() => {
			if (this.view.dragging) this.view.dragging = null;
		}, 50);
	};
};
var GutterHandle = Extension.create({
	name: "gutterHandle",
	addOptions() {
		return {
			onInsertAfter: () => {},
			onMenu: () => {},
			menuOpen: () => false,
			labels: () => ({
				drag: "",
				add: ""
			})
		};
	},
	addProseMirrorPlugins() {
		const options = this.options;
		return [new Plugin({
			key: new PluginKey("gutterHandle"),
			view: (view) => new GutterView(view, options)
		})];
	}
});
// src/editor/setup.ts
var BASE_VIEWS = {
	callout: CalloutView_default,
	codeBlock: CodeBlockView_default,
	details: DetailsView_default,
	horizontalRule: DividerView_default,
	figure: FigureView_default,
	image: InlineImageView_default,
	mathBlock: MathBlockView_default,
	mathInline: MathInlineView_default
};
function editorExtensions(ctx, opts) {
	const views = { ...BASE_VIEWS };
	for (const e of ctx.config.extensions) Object.assign(views, e.nodeViews);
	const out = [
		...schemaExtensions(ctx.config, ctx.inline, !opts.collaboration).map((ext) => {
			const view = views[ext.name];
			if (!view || !(ext instanceof Node$1)) return ext;
			return ext.extend({ addNodeView: () => VueNodeViewRenderer(view, { stopEvent: blockStopEvent }) });
		}),
		ContextStorage.configure({ context: ctx }),
		HostKeys.configure({ keys: opts.hostKeys }),
		ServerHistory.configure({
			bridge: opts.bridge,
			collaborative: !!opts.collaboration
		}),
		InlineAtomClick,
		clipboardExtension(ctx.markdown, ctx.config.format === "markdown")
	];
	if (ctx.config.base.links) out.push(LinkClicks.configure({ open: (href, event) => openHref(ctx.services, href, event) }));
	if (ctx.inline) {
		out.push(InlineKeys, Placeholder.configure({
			placeholder: opts.placeholder,
			showOnlyWhenEditable: true
		}));
		if (opts.collaboration) out.push(...opts.collaboration);
		return out;
	}
	out.push(BlockKeys, TableCells, Placeholder.configure({
		placeholder: ({ editor, node }) => node.type.name === "heading" ? ctx.t("toolbar.heading", { n: node.attrs.level }) : editor.isEmpty ? opts.placeholder : "",
		includeChildren: false,
		showOnlyWhenEditable: true,
		showOnlyCurrent: true
	}), SlashCommand.configure({
		items: (q) => filterItems(ctx.slashItems, q),
		groupLabel: (id) => groupLabel(ctx.config, id, ctx.text),
		t: (k) => ctx.t(k)
	}));
	if (ctx.config.base.bookmarks || ctx.config.base.embeds) out.push(PasteUrl);
	if (opts.gutter) {
		const g = opts.gutter;
		out.push(GutterHandle.configure({
			onInsertAfter: g.onInsertAfter,
			onMenu: g.onMenu,
			menuOpen: g.menuOpen,
			labels: () => ({
				drag: ctx.t("gutter.drag"),
				add: ctx.t("gutter.add")
			})
		}));
	}
	if (opts.collaboration) out.push(...opts.collaboration);
	return out;
}
// src/plugin.ts
var WYSIWYG_DEFAULTS = Symbol("wysiwyg-defaults");
function createWysiwyg(defaults = {}) {
	return { install(app) {
		app.provide(WYSIWYG_DEFAULTS, defaults);
		app.directive("tooltip", vTooltip);
	} };
}
var HANDLE_REGISTRY = Symbol("wysiwyg-handles");
/** editor last focused (or first mounted) among this component's descendants; nested fields inside node views do not count. */
function useEditorHandle() {
	const current = shallowRef(null);
	const mounted = [];
	provide(HANDLE_REGISTRY, {
		register(handle) {
			mounted.push(handle);
			current.value ??= handle;
			return () => {
				mounted.splice(mounted.indexOf(handle), 1);
				if (current.value === handle) current.value = mounted[mounted.length - 1] ?? null;
			};
		},
		activate(handle) {
			current.value = handle;
		}
	});
	return current;
}
function useHandleRegistry() {
	return inject(HANDLE_REGISTRY, null);
}
// src/editor/blockColor.ts
var ITEMS = {
	listItem: true,
	taskItem: true
};
function colorable(node) {
	return BLOCK_COLOR_TYPES.includes(node.type.name) && "color" in (node.type.spec.attrs ?? {});
}
/**
* where a block colour of the run lands: each colourable block; inside a list or table, its items or cells; a first
* child of a list item colours the item, as the markdown writes it
*/
function colorTargets(state, run) {
	const out = [];
	const visit = (node, pos) => {
		if (colorable(node)) {
			if (!out.includes(pos)) out.push(pos);
			return;
		}
		if (node.isTextblock || node.isLeaf) return;
		node.forEach((child, offset) => visit(child, pos + 1 + offset));
	};
	let pos = run.from;
	for (const node of run.nodes) {
		const $pos = state.doc.resolve(pos);
		if ($pos.depth > 0 && ITEMS[$pos.parent.type.name] === true && $pos.index() === 0 && colorable($pos.parent)) visit($pos.parent, $pos.before());
		else visit(node, pos);
		pos += node.nodeSize;
	}
	return out;
}
function blockColorOf(state, run) {
	const first = colorTargets(state, run)[0];
	return first === void 0 ? "" : String(state.doc.nodeAt(first)?.attrs.color ?? "");
}
function setBlockColor(editor, run, token) {
	const tr = editor.state.tr;
	for (const pos of colorTargets(editor.state, run)) {
		const node = tr.doc.nodeAt(pos);
		if (node) tr.setNodeMarkup(pos, void 0, {
			...node.attrs,
			color: token
		});
	}
	if (tr.docChanged) editor.view.dispatch(tr);
}
// src/components/ColorMenu.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$13 = ["aria-label"];
var _hoisted_2$10 = { class: "wy-menu-heading" };
var _hoisted_3$10 = ["aria-label"];
var _hoisted_4$8 = [
	"title",
	"aria-label",
	"aria-checked",
	"onClick"
];
var _hoisted_5$8 = { class: "wy-menu-heading" };
var _hoisted_6$6 = ["aria-label"];
var _hoisted_7$4 = [
	"title",
	"aria-label",
	"aria-checked",
	"onClick"
];
var _hoisted_8$4 = ["aria-disabled"];
// src/components/ColorMenu.vue
var ColorMenu_default = /* @__PURE__ */ defineComponent({
	__name: "ColorMenu",
	props: {
		editor: {},
		color: {},
		highlight: {},
		block: { type: Boolean }
	},
	emits: ["done", "pick"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = useEditorContext();
		const t = ctx.t;
		const html = ctx.config.format === "html" && !props.block;
		const HTML_TEXT = [
			{
				id: "default",
				value: "",
				css: ""
			},
			{
				id: "gray",
				value: "#6b7280",
				css: "#6b7280"
			},
			{
				id: "red",
				value: "#dc2626",
				css: "#dc2626"
			},
			{
				id: "orange",
				value: "#ea580c",
				css: "#ea580c"
			},
			{
				id: "yellow",
				value: "#ca8a04",
				css: "#ca8a04"
			},
			{
				id: "green",
				value: "#16a34a",
				css: "#16a34a"
			},
			{
				id: "blue",
				value: "#2563eb",
				css: "#2563eb"
			},
			{
				id: "purple",
				value: "#9333ea",
				css: "#9333ea"
			},
			{
				id: "pink",
				value: "#db2777",
				css: "#db2777"
			}
		];
		const HTML_MARKS = [
			{
				id: "none",
				value: "",
				css: ""
			},
			{
				id: "yellow",
				value: "#fef08a",
				css: "#fef08a"
			},
			{
				id: "green",
				value: "#bbf7d0",
				css: "#bbf7d0"
			},
			{
				id: "blue",
				value: "#bfdbfe",
				css: "#bfdbfe"
			},
			{
				id: "purple",
				value: "#e9d5ff",
				css: "#e9d5ff"
			},
			{
				id: "pink",
				value: "#fbcfe8",
				css: "#fbcfe8"
			},
			{
				id: "red",
				value: "#fecaca",
				css: "#fecaca"
			}
		];
		const TOKEN_TEXT = [{
			id: "default",
			value: "",
			css: ""
		}, ...PALETTE.map((n) => ({
			id: n,
			value: n,
			css: tokenCss(n)
		}))];
		const TOKEN_MARKS = [{
			id: "none",
			value: "",
			css: ""
		}, ...PALETTE.map((n) => ({
			id: n,
			value: `${n}_bg`,
			css: tokenCss(`${n}_bg`)
		}))];
		const text = html ? HTML_TEXT : TOKEN_TEXT;
		const marks = html ? HTML_MARKS : TOKEN_MARKS;
		const showText = props.block || ctx.config.base.color;
		const showMarks = props.block || ctx.config.base.highlight;
		const colored = computed(() => !!(props.color || props.highlight));
		function setColor(v) {
			if (props.block) emit("pick", v || null);
			else {
				const c = props.editor.chain().focus();
				(v ? c.setColor(v) : c.unsetColor()).run();
			}
			emit("done");
		}
		function setHighlight(v) {
			if (props.block) emit("pick", v || null);
			else {
				const c = props.editor.chain().focus();
				(v ? c.setHighlight({ color: v }) : c.unsetHighlight()).run();
			}
			emit("done");
		}
		function reset() {
			if (props.block) emit("pick", null);
			else {
				let c = props.editor.chain().focus();
				if (ctx.config.base.color) c = c.unsetColor();
				if (ctx.config.base.highlight) c = c.unsetHighlight();
				c.run();
			}
			emit("done");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: "wy-colors",
				role: "menu",
				"aria-label": unref(t)("toolbar.color")
			}, [
				unref(showText) ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [createElementVNode("div", _hoisted_2$10, toDisplayString(unref(t)("colors.text")), 1), createElementVNode("div", {
					class: "wy-swatches",
					role: "group",
					"aria-label": unref(t)("colors.text")
				}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(text), (c) => {
					return openBlock(), createElementBlock("button", {
						key: c.id,
						type: "button",
						role: "menuitemradio",
						class: "wy-swatch is-text",
						style: normalizeStyle({ color: c.css || "var(--vc-fg)" }),
						title: unref(t)(`colors.${c.id}`),
						"aria-label": unref(t)(`colors.${c.id}`),
						"aria-checked": __props.color === c.value,
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: ($event) => setColor(c.value)
					}, [_cache[4] || (_cache[4] = createTextVNode(" A", -1)), __props.color === c.value ? (openBlock(), createBlock(unref(Check), {
						key: 0,
						class: "wy-swatch-check",
						size: 12
					})) : createCommentVNode("", true)], 44, _hoisted_4$8);
				}), 128))], 8, _hoisted_3$10)], 64)) : createCommentVNode("", true),
				unref(showMarks) ? (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [createElementVNode("div", _hoisted_5$8, toDisplayString(unref(t)("colors.background")), 1), createElementVNode("div", {
					class: "wy-swatches",
					role: "group",
					"aria-label": unref(t)("colors.background")
				}, [(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(marks), (c) => {
					return openBlock(), createElementBlock("button", {
						key: c.id,
						type: "button",
						role: "menuitemradio",
						class: normalizeClass(["wy-swatch", { "is-none": !c.value }]),
						style: normalizeStyle({ background: c.css || void 0 }),
						title: unref(t)(`colors.${c.id}`),
						"aria-label": unref(t)(`colors.${c.id}`),
						"aria-checked": __props.highlight === c.value,
						onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["prevent"])),
						onClick: ($event) => setHighlight(c.value)
					}, [__props.highlight === c.value ? (openBlock(), createBlock(unref(Check), {
						key: 0,
						class: "wy-swatch-check",
						size: 12
					})) : createCommentVNode("", true)], 46, _hoisted_7$4);
				}), 128))], 8, _hoisted_6$6)], 64)) : createCommentVNode("", true),
				createElementVNode("button", {
					type: "button",
					role: "menuitem",
					class: "wy-menu-item wy-colors-reset",
					"aria-disabled": !colored.value || void 0,
					onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[3] || (_cache[3] = ($event) => colored.value && reset())
				}, [createVNode(unref(RotateCcw), {
					class: "wy-menu-icon",
					size: 15,
					"aria-hidden": "true"
				}), createTextVNode(toDisplayString(unref(t)("colors.reset")), 1)], 40, _hoisted_8$4)
			], 8, _hoisted_1$13);
		};
	}
});
// src/components/BlockActionsMenu.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$12 = ["aria-label"];
var _hoisted_2$9 = ["aria-expanded"];
var _hoisted_3$9 = { class: "wy-grow" };
var _hoisted_4$7 = ["aria-expanded"];
var _hoisted_5$7 = { class: "wy-grow" };
var _hoisted_6$5 = ["aria-label"];
// src/components/BlockActionsMenu.vue
var BlockActionsMenu_default = /* @__PURE__ */ defineComponent({
	__name: "BlockActionsMenu",
	props: {
		editor: {},
		run: {},
		anchor: {},
		convertOnly: { type: Boolean },
		selectAll: { type: Boolean }
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = useEditorContext();
		const t = ctx.t;
		const targets = computed(() => runTargets(ctx.convert, props.editor.state, props.run));
		const colorable = computed(() => colorTargets(props.editor.state, props.run).length > 0);
		const blockColor = computed(() => blockColorOf(props.editor.state, props.run));
		const sub = ref(null);
		const menuEl = ref(null);
		const subEl = ref(null);
		const triggers = {
			convert: null,
			color: null
		};
		const trigger = computed(() => sub.value ? triggers[sub.value] : null);
		function focusItem(root, which) {
			const items = [...root?.querySelectorAll("[role^=\"menuitem\"]:not([aria-disabled=\"true\"])") ?? []];
			if (!items.length) return;
			const i = items.indexOf(document.activeElement);
			items[which === "first" ? 0 : which === "last" ? items.length - 1 : (i + which + items.length) % items.length].focus({ preventScroll: true });
		}
		async function openSub(which, focus) {
			sub.value = which;
			if (!focus) return;
			await nextTick();
			focusItem(subEl.value, "first");
		}
		function closeSub() {
			trigger.value?.focus({ preventScroll: true });
			sub.value = null;
		}
		function finish() {
			emit("close");
			props.editor.view.focus();
		}
		function convert(target) {
			const tr = convertRun(ctx.convert, props.editor.state, props.run, target, props.selectAll);
			if (tr) props.editor.view.dispatch(tr);
			finish();
		}
		function color(token) {
			setBlockColor(props.editor, props.run, token);
			finish();
		}
		function duplicate() {
			const { state } = props.editor;
			const { to, nodes } = props.run;
			const tr = state.tr.insert(to, Fragment.from(nodes));
			const first = tr.doc.nodeAt(to);
			if (nodes.length === 1 && first && !first.isTextblock && NodeSelection.isSelectable(first)) tr.setSelection(NodeSelection.create(tr.doc, to));
			else tr.setSelection(Selection.near(tr.doc.resolve(to + 1)));
			props.editor.view.dispatch(tr.scrollIntoView());
			finish();
		}
		async function copy() {
			const schema = props.editor.schema;
			const nodes = props.run.nodes;
			const text = ctx.config.format === "markdown" ? fragmentMarkdown(ctx.markdown, nodes, schema) : fragmentHtml(Fragment.from(nodes), schema);
			finish();
			try {
				await navigator.clipboard.writeText(text);
				ctx.services.toast?.(t("editor.copied"), "success");
			} catch {}
		}
		function remove() {
			props.editor.view.dispatch(props.editor.state.tr.delete(props.run.from, props.run.to).scrollIntoView());
			finish();
		}
		function onKeydown(e, inSub) {
			const root = inSub ? subEl.value : menuEl.value;
			switch (e.key) {
				case "ArrowDown":
				case "ArrowUp":
					focusItem(root, e.key === "ArrowDown" ? 1 : -1);
					break;
				case "Home":
				case "End":
					focusItem(root, e.key === "Home" ? "first" : "last");
					break;
				case "ArrowRight": {
					const which = Object.keys(triggers).find((k) => triggers[k] === document.activeElement);
					if (inSub || !which) return;
					openSub(which, true);
					break;
				}
				case "ArrowLeft":
					if (!inSub) return;
					closeSub();
					break;
				case "Escape":
					if (inSub) closeSub();
					else finish();
					break;
				case "Tab":
					finish();
					break;
				default: return;
			}
			e.preventDefault();
			e.stopPropagation();
		}
		function onDocDown(e) {
			const target = e.target;
			if (menuEl.value?.contains(target) || subEl.value?.contains(target) || props.anchor.contains(target)) return;
			emit("close");
		}
		onMounted(async () => {
			document.addEventListener("mousedown", onDocDown, true);
			await nextTick();
			focusItem(menuEl.value, "first");
		});
		onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment$1, null, [createVNode(AnchoredPopover_default, {
				anchor: __props.anchor,
				class: "wy-menu wy-block-actions"
			}, {
				default: withCtx(() => [createElementVNode("div", {
					ref_key: "menuEl",
					ref: menuEl,
					class: "wy-menu-list",
					role: "menu",
					"aria-label": __props.convertOnly ? unref(t)("convert.title") : unref(t)("blockMenu.label"),
					onKeydown: _cache[12] || (_cache[12] = ($event) => onKeydown($event, false))
				}, [__props.convertOnly ? (openBlock(), createBlock(ConvertItems_default, {
					key: 0,
					targets: targets.value,
					onPick: convert
				}, null, 8, ["targets"])) : (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [
					targets.value.length ? (openBlock(), createElementBlock("button", {
						key: 0,
						ref: (el) => triggers.convert = el,
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						"aria-haspopup": "menu",
						"aria-expanded": sub.value === "convert",
						"data-convert-menu": "",
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onPointerenter: _cache[1] || (_cache[1] = ($event) => $event.pointerType === "mouse" && openSub("convert", false)),
						onClick: _cache[2] || (_cache[2] = ($event) => openSub("convert", true))
					}, [createElementVNode("span", _hoisted_3$9, toDisplayString(unref(t)("convert.title")), 1), createVNode(unref(ChevronRight), {
						class: "wy-menu-icon",
						size: 16,
						"aria-hidden": "true"
					})], 40, _hoisted_2$9)) : createCommentVNode("", true),
					colorable.value ? (openBlock(), createElementBlock("button", {
						key: 1,
						ref: (el) => triggers.color = el,
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						"aria-haspopup": "menu",
						"aria-expanded": sub.value === "color",
						"data-color-menu": "",
						onMousedown: _cache[3] || (_cache[3] = withModifiers(() => {}, ["prevent"])),
						onPointerenter: _cache[4] || (_cache[4] = ($event) => $event.pointerType === "mouse" && openSub("color", false)),
						onClick: _cache[5] || (_cache[5] = ($event) => openSub("color", true))
					}, [
						createVNode(unref(Palette), {
							class: "wy-menu-icon",
							size: 16,
							"aria-hidden": "true"
						}),
						createElementVNode("span", _hoisted_5$7, toDisplayString(unref(t)("blockMenu.color")), 1),
						createVNode(unref(ChevronRight), {
							class: "wy-menu-icon",
							size: 16,
							"aria-hidden": "true"
						})
					], 40, _hoisted_4$7)) : createCommentVNode("", true),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						onMousedown: _cache[6] || (_cache[6] = withModifiers(() => {}, ["prevent"])),
						onMouseenter: _cache[7] || (_cache[7] = ($event) => sub.value = null),
						onClick: duplicate
					}, [createVNode(unref(CopyPlus), {
						class: "wy-menu-icon",
						size: 16,
						"aria-hidden": "true"
					}), createTextVNode(toDisplayString(unref(t)("blockMenu.duplicate")), 1)], 32),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						onMousedown: _cache[8] || (_cache[8] = withModifiers(() => {}, ["prevent"])),
						onMouseenter: _cache[9] || (_cache[9] = ($event) => sub.value = null),
						onClick: copy
					}, [createVNode(unref(Copy), {
						class: "wy-menu-icon",
						size: 16,
						"aria-hidden": "true"
					}), createTextVNode(toDisplayString(unref(t)("blockMenu.copy")), 1)], 32),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item is-danger",
						role: "menuitem",
						onMousedown: _cache[10] || (_cache[10] = withModifiers(() => {}, ["prevent"])),
						onMouseenter: _cache[11] || (_cache[11] = ($event) => sub.value = null),
						onClick: remove
					}, [createVNode(unref(Trash2), {
						class: "wy-menu-icon",
						size: 16,
						"aria-hidden": "true"
					}), createTextVNode(toDisplayString(unref(t)("blockMenu.delete")), 1)], 32)
				], 64))], 40, _hoisted_1$12)]),
				_: 1
			}, 8, ["anchor"]), sub.value && trigger.value ? (openBlock(), createBlock(AnchoredPopover_default, {
				key: 0,
				anchor: trigger.value,
				side: "right",
				class: normalizeClass(["wy-menu wy-block-actions", { "wy-color-panel": sub.value === "color" }])
			}, {
				default: withCtx(() => [sub.value === "convert" ? (openBlock(), createElementBlock("div", {
					key: 0,
					ref_key: "subEl",
					ref: subEl,
					class: "wy-menu-list",
					role: "menu",
					"aria-label": unref(t)("convert.title"),
					onKeydown: _cache[13] || (_cache[13] = ($event) => onKeydown($event, true))
				}, [createVNode(ConvertItems_default, {
					targets: targets.value,
					onPick: convert
				}, null, 8, ["targets"])], 40, _hoisted_6$5)) : (openBlock(), createElementBlock("div", {
					key: 1,
					ref_key: "subEl",
					ref: subEl,
					onKeydown: _cache[14] || (_cache[14] = ($event) => onKeydown($event, true))
				}, [createVNode(ColorMenu_default, {
					editor: __props.editor,
					block: "",
					color: unref(isBgToken)(blockColor.value) ? "" : blockColor.value,
					highlight: unref(isBgToken)(blockColor.value) ? blockColor.value : "",
					onPick: color
				}, null, 8, [
					"editor",
					"color",
					"highlight"
				])], 544))]),
				_: 1
			}, 8, ["anchor", "class"])) : createCommentVNode("", true)], 64);
		};
	}
});
// src/components/Dropdown.vue?vue&type=script&setup=true&lang.ts
var FOCUSABLE$1 = "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";
// src/components/Dropdown.vue
var Dropdown_default = /* @__PURE__ */ defineComponent({
	__name: "Dropdown",
	props: {
		panelClass: { default: "" },
		side: { default: "bottom" }
	},
	emits: ["open"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const open = ref(false);
		const host = ref(null);
		const popover = ref(null);
		function items() {
			return [...popover.value?.el?.querySelectorAll(FOCUSABLE$1) ?? []];
		}
		function close(refocus = true) {
			if (!open.value) return;
			open.value = false;
			if (refocus) host.value?.querySelector("button")?.focus({ preventScroll: true });
		}
		async function toggle() {
			open.value = !open.value;
			if (!open.value) return;
			emit("open");
			const fromKeyboard = !!host.value?.contains(document.activeElement);
			await nextTick();
			if (fromKeyboard) items()[0]?.focus({ preventScroll: true });
		}
		function onPanelKey(e) {
			if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
			const list = items();
			if (!list.length || e.target.tagName === "INPUT") return;
			e.preventDefault();
			list[(list.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus({ preventScroll: true });
		}
		function onDown(e) {
			const t = e.target;
			if (host.value?.contains(t) || popover.value?.el?.contains(t)) return;
			close(false);
		}
		function onKey(e) {
			if (e.key === "Escape" && host.value?.contains(e.target)) close();
		}
		function listen(on) {
			if (on) {
				document.addEventListener("mousedown", onDown, true);
				document.addEventListener("keydown", onKey);
			} else {
				document.removeEventListener("mousedown", onDown, true);
				document.removeEventListener("keydown", onKey);
			}
		}
		watch(open, listen);
		onBeforeUnmount(() => listen(false));
		__expose({ close });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				ref_key: "host",
				ref: host,
				class: "wy-dropdown"
			}, [renderSlot(_ctx.$slots, "trigger", {
				open: open.value,
				toggle
			}), open.value ? (openBlock(), createBlock(AnchoredPopover_default, {
				key: 0,
				ref_key: "popover",
				ref: popover,
				anchor: host.value,
				side: __props.side,
				class: normalizeClass(["wy-menu wy-dropdown-panel is-open", __props.panelClass]),
				onEscape: _cache[0] || (_cache[0] = ($event) => close()),
				onKeydown: onPanelKey
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { close: () => close() })]),
				_: 3
			}, 8, [
				"anchor",
				"side",
				"class"
			])) : createCommentVNode("", true)], 512);
		};
	}
});
// src/components/ColorTool.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$11 = [
	"aria-label",
	"aria-expanded",
	"onClick"
];
// src/components/ColorTool.vue
var ColorTool_default = /* @__PURE__ */ defineComponent({
	__name: "ColorTool",
	props: {
		editor: {},
		tick: {},
		small: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const ctx = useEditorContext();
		const t = ctx.t;
		const html = ctx.config.format === "html";
		const state = computed(() => {
			props.tick;
			return {
				color: String(props.editor.getAttributes("textStyle").color ?? ""),
				mark: String(props.editor.getAttributes("highlight").color ?? "")
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Dropdown_default, { "panel-class": "wy-color-panel" }, {
				trigger: withCtx(({ open, toggle }) => [withDirectives((openBlock(), createElementBlock("button", {
					type: "button",
					class: normalizeClass(["wy-tool", { "is-sm": __props.small }]),
					"aria-label": unref(t)("toolbar.color"),
					"aria-haspopup": "menu",
					"aria-expanded": open,
					onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
					onClick: toggle
				}, [createVNode(unref(Baseline), {
					size: __props.small ? 15 : 18,
					style: normalizeStyle({ color: (html ? state.value.color : unref(tokenCss)(state.value.color)) || void 0 })
				}, null, 8, ["size", "style"])], 42, _hoisted_1$11)), [[unref(vTooltip), unref(t)("toolbar.color")]])]),
				default: withCtx(({ close }) => [createVNode(ColorMenu_default, {
					editor: __props.editor,
					color: state.value.color,
					highlight: state.value.mark,
					onDone: close
				}, null, 8, [
					"editor",
					"color",
					"highlight",
					"onDone"
				])]),
				_: 1
			});
		};
	}
});
// src/components/MarkButtons.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$10 = [
	"aria-label",
	"aria-pressed",
	"onClick"
];
// src/components/MarkButtons.vue
var MarkButtons_default = /* @__PURE__ */ defineComponent({
	__name: "MarkButtons",
	props: {
		editor: {},
		tick: {},
		small: {
			type: Boolean,
			default: false
		},
		highlight: {
			type: Boolean,
			default: true
		}
	},
	setup(__props) {
		const props = __props;
		const ctx = useEditorContext();
		const b = ctx.config.base;
		const html = ctx.config.format === "html";
		const tools = [
			{
				id: "bold",
				icon: Bold$1,
				keys: "Mod-b",
				toggle: (c) => c.toggleBold()
			},
			{
				id: "italic",
				icon: Italic$1,
				keys: "Mod-i",
				toggle: (c) => c.toggleItalic()
			},
			...b.underline ? [{
				id: "underline",
				icon: Underline$1,
				keys: "Mod-u",
				toggle: (c) => c.toggleUnderline()
			}] : [],
			{
				id: "strike",
				icon: Strikethrough,
				keys: "Mod-Shift-s",
				toggle: (c) => c.toggleStrike()
			},
			{
				id: "code",
				icon: Code$1,
				keys: "Mod-e",
				toggle: (c) => c.toggleCode()
			},
			...b.highlight && !html && props.highlight ? [{
				id: "highlight",
				icon: Highlighter,
				keys: "Mod-Shift-h",
				toggle: (c) => c.toggleHighlight()
			}] : []
		];
		const active = computed(() => {
			props.tick;
			return Object.fromEntries(tools.map((m) => [m.id, props.editor.isActive(m.id)]));
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment$1, null, renderList(tools, (m) => {
				return withDirectives((openBlock(), createElementBlock("button", {
					key: m.id,
					type: "button",
					class: normalizeClass(["wy-tool", { "is-sm": __props.small }]),
					"aria-label": unref(ctx).t(`toolbar.${m.id}`),
					"aria-pressed": active.value[m.id],
					onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
					onClick: ($event) => m.toggle(__props.editor.chain().focus()).run()
				}, [(openBlock(), createBlock(resolveDynamicComponent(m.icon), { size: __props.small ? 15 : 18 }, null, 8, ["size"]))], 42, _hoisted_1$10)), [[unref(vTooltip), {
					text: unref(ctx).t(`toolbar.${m.id}`),
					keys: m.keys
				}]]);
			}), 64);
		};
	}
});
// src/components/FloatingToolbar.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$9 = ["aria-label"];
var _hoisted_2$8 = ["aria-label"];
var _hoisted_3$8 = { class: "wy-tool-text" };
var _hoisted_4$6 = ["aria-label", "aria-pressed"];
var _hoisted_5$6 = [
	"aria-label",
	"aria-expanded",
	"onClick"
];
var _hoisted_6$4 = ["aria-label"];
var _hoisted_7$3 = {
	key: 0,
	class: "wy-sep"
};
var _hoisted_8$3 = [
	"aria-label",
	"aria-pressed",
	"disabled",
	"onClick"
];
var _hoisted_9$3 = ["aria-label"];
var _hoisted_10$3 = { class: "wy-tool-text is-optional" };
var CONTEXT_CHARS = 600;
// src/components/FloatingToolbar.vue
var FloatingToolbar_default = /* @__PURE__ */ defineComponent({
	__name: "FloatingToolbar",
	props: {
		editor: {},
		tick: {},
		readonly: { type: Boolean },
		full: { type: Boolean }
	},
	emits: ["link", "convert"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = useEditorContext();
		const t = ctx.t;
		const b = ctx.config.base;
		const html = ctx.config.format === "html";
		const bar = ref(null);
		const tools = computed(() => props.readonly ? ctx.bubble.filter((item) => item.readonly) : ctx.bubble);
		const colors = b.color || b.highlight;
		const LIST_LABELS = {
			bulletList: "bulletList",
			orderedList: "orderedList",
			taskList: "taskList"
		};
		function blockLabel(e) {
			const $from = e.state.selection.$from;
			for (let d = $from.depth; d > 0; d--) {
				const n = $from.node(d);
				const name = n.type.name;
				if (name === "heading") return t("toolbar.heading", { n: n.attrs.level });
				if (name === "codeBlock") return t("toolbar.codeBlock");
				if (name === "listItem" || name === "taskItem") {
					const list = LIST_LABELS[$from.node(d - 1).type.name];
					if (list) return t(`toolbar.${list}`);
				}
				if (name === "blockquote") return t("toolbar.quote");
				if (name === "callout") return t("toolbar.callout");
				if (name !== "paragraph") {
					const label = ctx.text("", `slash.items.${name}.label`);
					if (label) return label;
				}
			}
			return t("toolbar.paragraph");
		}
		const state = computed(() => {
			props.tick;
			const e = props.editor;
			const run = !props.full || e.state.selection.empty || ctx.inline ? null : selectionRun(e.state);
			const convert = !!run && runTargets(ctx.convert, e.state, run).length > 0;
			return {
				link: e.isActive("link"),
				color: String(e.getAttributes("textStyle").color ?? ""),
				mark: String(e.getAttributes("highlight").color ?? ""),
				convert,
				block: convert ? blockLabel(e) : ""
			};
		});
		function shouldShow({ editor: e, from, to }) {
			if (from === to || !e.isEditable && !tools.value.length) return false;
			if (e.state.selection instanceof NodeSelection || e.state.selection instanceof CellSelection) return false;
			if (e.isActive("codeBlock")) return false;
			return e.state.doc.textBetween(from, to, " ").trim().length > 0;
		}
		function toMath() {
			const e = props.editor;
			const { from, to } = e.state.selection;
			insertFresh(e, "mathInline", { tex: e.state.doc.textBetween(from, to, " ").trim() }, {
				from,
				to
			});
		}
		function askAi() {
			const { doc, selection } = props.editor.state;
			const { from, to } = selection;
			const fragment = selection.content().content;
			const text = doc.textBetween(from, to, "\n");
			let content = text;
			try {
				content = html ? fragmentHtml(fragment, doc.type.schema) : fragmentMarkdown(ctx.markdown, fragment, doc.type.schema);
			} catch {}
			ctx.services.askAi?.({
				selection: text,
				content,
				before: doc.textBetween(Math.max(0, from - 4 * CONTEXT_CHARS), from, "\n").slice(-600),
				after: doc.textBetween(to, Math.min(doc.content.size, to + 4 * CONTEXT_CHARS), "\n").slice(0, CONTEXT_CHARS)
			});
		}
		function buttons() {
			return [...bar.value?.querySelectorAll("button:not([disabled])") ?? []];
		}
		function onKeydown(e) {
			const list = buttons();
			const i = list.indexOf(document.activeElement);
			let next = -1;
			if (e.key === "ArrowRight") next = (i + 1) % list.length;
			else if (e.key === "ArrowLeft") next = (i - 1 + list.length) % list.length;
			else if (e.key === "Home") next = 0;
			else if (e.key === "End") next = list.length - 1;
			else if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				props.editor.view.focus();
				return;
			}
			if (next < 0 || !list.length) return;
			e.preventDefault();
			list[next].focus();
		}
		/** for Alt+F10 in the editor; false when the toolbar is hidden */
		function focusFirst() {
			const first = buttons()[0];
			if (!first || !first.offsetParent) return false;
			first.focus();
			return true;
		}
		__expose({ focusFirst });
		function prepareFloating() {
			const layer = bar.value?.parentElement;
			if (!layer) return;
			layer.style.position = "fixed";
			layer.style.visibility = "hidden";
		}
		const appendTo = () => props.editor.isDestroyed ? document.createElement("div") : props.editor.view.dom.closest(".wy-editor") ?? document.createElement("div");
		function overflowBounds() {
			const viewport = window.visualViewport;
			const x = viewport?.offsetLeft ?? 0;
			const y = viewport?.offsetTop ?? 0;
			const width = viewport?.width ?? window.innerWidth;
			const bottom = y + (viewport?.height ?? window.innerHeight);
			const toolbar = appendTo().querySelector(":scope > .wy-toolbar");
			const top = Math.min(bottom, Math.max(y, toolbar?.getBoundingClientRect().bottom ?? y));
			return {
				padding: {
					top: 16,
					bottom: 16,
					left: 8,
					right: 8
				},
				rootBoundary: {
					x,
					y: top,
					width,
					height: bottom - top
				},
				boundary: width > 640 ? props.editor.view.dom.closest(".wy-surface") ?? [] : []
			};
		}
		const floating = {
			strategy: "fixed",
			placement: typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches ? "bottom" : "top",
			offset: 8,
			flip: overflowBounds,
			shift: () => ({
				...overflowBounds(),
				crossAxis: true
			}),
			hide: () => ({
				strategy: "referenceHidden",
				rootBoundary: overflowBounds().rootBoundary
			}),
			onShow: prepareFloating
		};
		function onSelectionChange() {
			const e = props.editor;
			const sel = window.getSelection();
			if (e.isDestroyed || e.isEditable || e.state.selection.empty) return;
			if (!sel || sel.isCollapsed || !e.view.dom.contains(sel.anchorNode)) e.commands.setTextSelection(e.state.selection.from);
		}
		onMounted(() => document.addEventListener("selectionchange", onSelectionChange));
		onBeforeUnmount(() => document.removeEventListener("selectionchange", onSelectionChange));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(BubbleMenu), {
				class: "wy-bubble-layer",
				editor: __props.editor,
				"should-show": shouldShow,
				options: floating,
				"append-to": appendTo
			}, {
				default: withCtx(() => [createElementVNode("div", {
					ref_key: "bar",
					ref: bar,
					class: "wy-bubble",
					role: "toolbar",
					"aria-label": unref(t)("bubble.label"),
					onKeydown
				}, [
					!__props.readonly ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [
						state.value.convert ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [withDirectives((openBlock(), createElementBlock("button", {
							type: "button",
							class: "wy-tool is-wide wy-bubble-block",
							"aria-haspopup": "menu",
							"aria-label": `${unref(t)("convert.title")} ${state.value.block}`,
							"data-convert-menu": "",
							onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
							onClick: _cache[1] || (_cache[1] = ($event) => emit("convert", $event.currentTarget))
						}, [createElementVNode("span", _hoisted_3$8, toDisplayString(state.value.block), 1), createVNode(unref(ChevronDown), { size: 14 })], 40, _hoisted_2$8)), [[unref(vTooltip), unref(t)("convert.title")]]), _cache[8] || (_cache[8] = createElementVNode("span", { class: "wy-sep" }, null, -1))], 64)) : createCommentVNode("", true),
						createVNode(MarkButtons_default, {
							editor: __props.editor,
							tick: __props.tick,
							highlight: !unref(colors)
						}, null, 8, [
							"editor",
							"tick",
							"highlight"
						]),
						unref(b).links ? withDirectives((openBlock(), createElementBlock("button", {
							key: 1,
							type: "button",
							class: "wy-tool",
							"aria-label": unref(t)("toolbar.link"),
							"aria-pressed": state.value.link,
							onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
							onClick: _cache[3] || (_cache[3] = ($event) => emit("link"))
						}, [createVNode(unref(Link$1), { size: 18 })], 40, _hoisted_4$6)), [[unref(vTooltip), {
							text: unref(t)("toolbar.link"),
							keys: "Mod-k"
						}]]) : createCommentVNode("", true),
						unref(colors) ? (openBlock(), createBlock(Dropdown_default, {
							key: 2,
							"panel-class": "wy-color-panel"
						}, {
							trigger: withCtx(({ open, toggle }) => [withDirectives((openBlock(), createElementBlock("button", {
								type: "button",
								class: "wy-tool is-wide wy-color-trigger",
								"aria-label": unref(t)("toolbar.color"),
								"aria-haspopup": "menu",
								"aria-expanded": open,
								onMousedown: _cache[4] || (_cache[4] = withModifiers(() => {}, ["prevent"])),
								onClick: toggle
							}, [createElementVNode("span", {
								class: "wy-color-sample",
								style: normalizeStyle({
									color: (html ? state.value.color : unref(tokenCss)(state.value.color)) || void 0,
									background: (html ? state.value.mark : unref(tokenCss)(state.value.mark)) || void 0
								})
							}, "A", 4), createVNode(unref(ChevronDown), { size: 14 })], 40, _hoisted_5$6)), [[unref(vTooltip), unref(t)("toolbar.color")]])]),
							default: withCtx(({ close }) => [createVNode(ColorMenu_default, {
								editor: __props.editor,
								color: state.value.color,
								highlight: state.value.mark,
								onDone: close
							}, null, 8, [
								"editor",
								"color",
								"highlight",
								"onDone"
							])]),
							_: 1
						})) : createCommentVNode("", true),
						unref(b).math ? withDirectives((openBlock(), createElementBlock("button", {
							key: 3,
							type: "button",
							class: "wy-tool",
							"aria-label": unref(t)("slash.items.mathInline.label"),
							onMousedown: _cache[5] || (_cache[5] = withModifiers(() => {}, ["prevent"])),
							onClick: toMath
						}, [createVNode(unref(SquareFunction), { size: 18 })], 40, _hoisted_6$4)), [[unref(vTooltip), unref(t)("slash.items.mathInline.label")]]) : createCommentVNode("", true)
					], 64)) : createCommentVNode("", true),
					tools.value.length ? (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [!__props.readonly ? (openBlock(), createElementBlock("span", _hoisted_7$3)) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment$1, null, renderList(tools.value, (item) => {
						return withDirectives((openBlock(), createElementBlock("button", {
							key: item.id,
							type: "button",
							class: "wy-tool",
							"aria-label": unref(ctx).text(item.label),
							"aria-pressed": item.active?.(__props.editor) ?? void 0,
							disabled: item.enabled ? !item.enabled(__props.editor) : false,
							onMousedown: _cache[6] || (_cache[6] = withModifiers(() => {}, ["prevent"])),
							onClick: ($event) => item.run(__props.editor, unref(ctx).services)
						}, [(openBlock(), createBlock(resolveDynamicComponent(item.icon), { size: 18 }))], 40, _hoisted_8$3)), [[unref(vTooltip), {
							text: unref(ctx).text(item.label),
							keys: item.shortcut
						}]]);
					}), 128))], 64)) : createCommentVNode("", true),
					unref(ctx).services.askAi && !__props.readonly ? (openBlock(), createElementBlock(Fragment$1, { key: 2 }, [_cache[9] || (_cache[9] = createElementVNode("span", { class: "wy-sep" }, null, -1)), withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool is-wide",
						"aria-label": unref(t)("bubble.askAi"),
						onMousedown: _cache[7] || (_cache[7] = withModifiers(() => {}, ["prevent"])),
						onClick: askAi
					}, [createVNode(unref(Sparkles), { size: 18 }), createElementVNode("span", _hoisted_10$3, toDisplayString(unref(t)("bubble.askAi")), 1)], 40, _hoisted_9$3)), [[unref(vTooltip), unref(t)("bubble.askAi")]])], 64)) : createCommentVNode("", true)
				], 40, _hoisted_1$9)]),
				_: 1
			}, 8, ["editor"]);
		};
	}
});
// src/components/ImageLightbox.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$8 = ["aria-label"];
var _hoisted_2$7 = ["src", "alt"];
var _hoisted_3$7 = ["aria-label", "title"];
// src/components/ImageLightbox.vue
var ImageLightbox_default = /* @__PURE__ */ defineComponent({
	__name: "ImageLightbox",
	props: {
		image: {},
		closeLabel: {}
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const closeButton = ref(null);
		let returnTo = null;
		function onKey(e) {
			if (e.key !== "Escape" && e.key !== "Tab") return;
			e.preventDefault();
			e.stopPropagation();
			if (e.key === "Escape") emit("close");
		}
		watch(() => props.image, async (img, prev) => {
			if (img && !prev) {
				returnTo = document.activeElement;
				document.addEventListener("keydown", onKey, true);
				await nextTick();
				closeButton.value?.focus();
			} else if (!img && prev) {
				document.removeEventListener("keydown", onKey, true);
				returnTo?.focus({ preventScroll: true });
				returnTo = null;
			}
		});
		onBeforeUnmount(() => document.removeEventListener("keydown", onKey, true));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Teleport, { to: "body" }, [__props.image ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: "wy-lightbox",
				role: "dialog",
				"aria-modal": "true",
				"aria-label": __props.image.alt || __props.closeLabel,
				onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
			}, [createElementVNode("img", {
				class: "wy-lightbox-image",
				src: __props.image.src,
				alt: __props.image.alt
			}, null, 8, _hoisted_2$7), createElementVNode("button", {
				ref_key: "closeButton",
				ref: closeButton,
				type: "button",
				class: "wy-lightbox-close",
				"aria-label": __props.closeLabel,
				title: __props.closeLabel
			}, [createVNode(unref(X), { size: 20 })], 8, _hoisted_3$7)], 8, _hoisted_1$8)) : createCommentVNode("", true)]);
		};
	}
});
// src/components/Modal.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$7 = ["aria-label"];
var _hoisted_2$6 = { class: "wy-modal-head" };
var _hoisted_3$6 = { class: "wy-modal-title" };
var _hoisted_4$5 = ["aria-label"];
var _hoisted_5$5 = { class: "wy-modal-body" };
var openDialogs = [];
var FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [contenteditable='true'], [tabindex]:not([tabindex='-1'])";
// src/components/Modal.vue
var Modal_default = /* @__PURE__ */ defineComponent({
	__name: "Modal",
	props: {
		open: { type: Boolean },
		title: { default: "" },
		size: { default: "sm" },
		closeLabel: { default: "Close" }
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const panel = ref(null);
		let previous = null;
		let overflow = "";
		const stack = openDialogs;
		const self = Symbol("modal");
		function trapTab(e) {
			const el = panel.value;
			if (!el || e.defaultPrevented || !(el === document.activeElement || el.contains(document.activeElement))) return;
			const items = [...el.querySelectorAll(FOCUSABLE)];
			const first = items[0];
			const last = items[items.length - 1];
			const active = document.activeElement;
			if (!first || !last) {
				e.preventDefault();
				el.focus();
			} else if (e.shiftKey && (active === first || active === el)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		}
		function onKey(e) {
			if (stack[stack.length - 1] !== self) return;
			if (e.key === "Tab") return trapTab(e);
			if (e.key !== "Escape") return;
			const target = e.target;
			if (e.defaultPrevented && !target?.classList?.contains("wy-content")) return;
			if (panel.value?.querySelector("[aria-expanded=\"true\"]") && !target?.closest(".wy-modal-head")) return;
			e.preventDefault();
			emit("close");
		}
		function release() {
			const i = stack.indexOf(self);
			if (i < 0) return;
			stack.splice(i, 1);
			document.body.style.overflow = overflow;
			document.removeEventListener("keydown", onKey);
		}
		watch(() => props.open, async (open, was) => {
			if (open) {
				previous = document.activeElement;
				overflow = document.body.style.overflow;
				document.body.style.overflow = "hidden";
				stack.push(self);
				document.addEventListener("keydown", onKey);
				await nextTick();
				if (!panel.value?.contains(document.activeElement)) panel.value?.focus();
			} else if (was) {
				release();
				previous?.focus?.();
			}
		}, { immediate: true });
		onBeforeUnmount(release);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Teleport, { to: "body" }, [__props.open ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: "wy-modal-backdrop",
				onMousedown: _cache[1] || (_cache[1] = withModifiers(($event) => emit("close"), ["self"]))
			}, [createElementVNode("div", {
				ref_key: "panel",
				ref: panel,
				class: normalizeClass(["wy-modal", `is-${__props.size}`]),
				role: "dialog",
				"aria-modal": "true",
				"aria-label": __props.title || void 0,
				tabindex: "-1"
			}, [createElementVNode("div", _hoisted_2$6, [
				createElementVNode("span", _hoisted_3$6, toDisplayString(__props.title), 1),
				renderSlot(_ctx.$slots, "head"),
				withDirectives((openBlock(), createElementBlock("button", {
					type: "button",
					class: "wy-icon-btn",
					"aria-label": __props.closeLabel,
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				}, [createVNode(unref(X), { size: 18 })], 8, _hoisted_4$5)), [[unref(vTooltip), __props.closeLabel]])
			]), createElementVNode("div", _hoisted_5$5, [renderSlot(_ctx.$slots, "default")])], 10, _hoisted_1$7)], 32)) : createCommentVNode("", true)]);
		};
	}
});
// src/components/LinkDialog.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$6 = { class: "wy-link-search" };
var _hoisted_2$5 = [
	"aria-expanded",
	"aria-activedescendant",
	"aria-label",
	"placeholder"
];
var _hoisted_3$5 = ["aria-label", "aria-busy"];
var _hoisted_4$4 = {
	key: 0,
	class: "wy-link-status",
	role: "status"
};
var _hoisted_5$4 = {
	key: 1,
	class: "wy-link-status",
	role: "status"
};
var _hoisted_6$3 = [
	"id",
	"aria-selected",
	"onMouseenter",
	"onClick"
];
var _hoisted_7$2 = {
	class: "wy-link-option-icon",
	"aria-hidden": "true"
};
var _hoisted_8$2 = { class: "wy-link-option-text" };
var _hoisted_9$2 = { class: "wy-link-option-title" };
var _hoisted_10$2 = { class: "wy-link-option-detail" };
var _hoisted_11$2 = { class: "wy-field" };
var _hoisted_12$2 = { class: "wy-label" };
var _hoisted_13$2 = ["placeholder"];
var _hoisted_14$1 = { class: "wy-form-actions" };
var _hoisted_15$1 = ["disabled"];
// src/components/LinkDialog.vue
var LinkDialog_default = /* @__PURE__ */ defineComponent({
	__name: "LinkDialog",
	props: {
		open: { type: Boolean },
		href: {},
		text: {},
		hasLink: { type: Boolean }
	},
	emits: [
		"close",
		"apply",
		"remove"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = useEditorContext();
		const t = ctx.t;
		const canSearch = !!ctx.services.searchLinks;
		const query = ref("");
		const text = ref("");
		const hits = ref([]);
		const active = ref(0);
		const searching = ref(false);
		const input = ref(null);
		const list = ref(null);
		let timer = 0;
		let abort = null;
		let enterPending = false;
		const looksLikeUrl = (v) => /^([a-z][a-z0-9+.-]*:|\/|#|www\.)|^[^\s]+\.[a-z]{2,}(\/|$)/i.test(v.trim());
		const address = computed(() => {
			const v = query.value.trim();
			return v && (!canSearch || looksLikeUrl(v)) ? v : "";
		});
		const searchable = computed(() => canSearch && !!query.value.trim() && !address.value);
		/** what Enter can pick: the typed address, or the search results */
		const options = computed(() => address.value ? [{
			href: address.value,
			title: address.value
		}] : searchable.value ? hits.value : []);
		const listId = `wy-link-options-${Math.random().toString(36).slice(2, 8)}`;
		watch(() => props.open, async (open) => {
			if (!open) {
				window.clearTimeout(timer);
				abort?.abort();
				enterPending = false;
				return;
			}
			query.value = props.href;
			text.value = props.text;
			hits.value = [];
			active.value = 0;
			searching.value = false;
			await nextTick();
			input.value?.focus();
			input.value?.select();
		});
		function onInput() {
			window.clearTimeout(timer);
			abort?.abort();
			enterPending = false;
			active.value = 0;
			if (!searchable.value) {
				hits.value = [];
				searching.value = false;
				return;
			}
			searching.value = true;
			timer = window.setTimeout(async () => {
				const ctrl = abort = new AbortController();
				try {
					const found = await ctx.services.searchLinks(query.value.trim(), ctrl.signal);
					if (ctrl.signal.aborted) return;
					hits.value = found.slice(0, 12);
					active.value = 0;
					const first = hits.value[0];
					if (enterPending && first) pick(first);
					enterPending = false;
				} catch {
					if (!ctrl.signal.aborted) hits.value = [];
				} finally {
					if (!ctrl.signal.aborted) searching.value = false;
				}
			}, 250);
		}
		function pick(h) {
			emit("apply", h.href, text.value.trim() || (h.href === h.title ? "" : h.title));
		}
		async function move(step) {
			const n = options.value.length;
			if (!n) return;
			active.value = (active.value + step + n) % n;
			await nextTick();
			list.value?.querySelector("[aria-selected=\"true\"]")?.scrollIntoView({ block: "nearest" });
		}
		function onKey(e) {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				move(e.key === "ArrowDown" ? 1 : -1);
			} else if (e.key === "Enter") {
				e.preventDefault();
				submit();
			}
		}
		function submit() {
			if (searching.value) {
				enterPending = true;
				return;
			}
			const hit = options.value[active.value];
			if (hit) pick(hit);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				open: __props.open,
				title: unref(t)("link.title"),
				"close-label": unref(t)("dialog.close"),
				onClose: _cache[5] || (_cache[5] = ($event) => emit("close"))
			}, {
				default: withCtx(() => [createElementVNode("form", {
					class: "wy-form wy-link-form",
					onSubmit: withModifiers(submit, ["prevent"])
				}, [
					createElementVNode("div", _hoisted_1$6, [withDirectives(createElementVNode("input", {
						ref_key: "input",
						ref: input,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => query.value = $event),
						class: "wy-input",
						type: "text",
						inputmode: "url",
						autocomplete: "off",
						spellcheck: "false",
						role: "combobox",
						"aria-autocomplete": "list",
						"aria-expanded": options.value.length > 0,
						"aria-controls": listId,
						"aria-activedescendant": options.value.length ? `${listId}-${active.value}` : void 0,
						"aria-label": canSearch ? unref(t)("link.searchPlaceholder") : unref(t)("link.url"),
						placeholder: canSearch ? unref(t)("link.searchPlaceholder") : unref(t)("link.urlPlaceholder"),
						onInput,
						onKeydown: onKey
					}, null, 40, _hoisted_2$5), [[vModelText, query.value]]), address.value || searchable.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						id: listId,
						ref_key: "list",
						ref: list,
						class: "wy-link-options",
						role: "listbox",
						"aria-label": unref(t)("link.results"),
						"aria-busy": searching.value || void 0
					}, [searching.value && !hits.value.length ? (openBlock(), createElementBlock("div", _hoisted_4$4, [createVNode(unref(LoaderCircle), {
						class: "wy-spin",
						size: 15,
						"aria-hidden": "true"
					}), createTextVNode(toDisplayString(unref(t)("link.searching")), 1)])) : searchable.value && !hits.value.length ? (openBlock(), createElementBlock("div", _hoisted_5$4, toDisplayString(unref(t)("link.noResults")), 1)) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment$1, null, renderList(options.value, (h, i) => {
						return openBlock(), createElementBlock("button", {
							id: `${listId}-${i}`,
							key: h.href,
							type: "button",
							role: "option",
							tabindex: "-1",
							class: "wy-link-option",
							"aria-selected": i === active.value,
							onMouseenter: ($event) => active.value = i,
							onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["prevent"])),
							onClick: ($event) => pick(h)
						}, [createElementVNode("span", _hoisted_7$2, [h.icon ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [createTextVNode(toDisplayString(h.icon), 1)], 64)) : address.value ? (openBlock(), createBlock(unref(Globe), {
							key: 1,
							size: 16
						})) : (openBlock(), createBlock(unref(FileText), {
							key: 2,
							size: 16
						}))]), createElementVNode("span", _hoisted_8$2, [createElementVNode("span", _hoisted_9$2, toDisplayString(address.value ? unref(t)("link.linkTo") : h.title), 1), createElementVNode("span", _hoisted_10$2, toDisplayString(address.value ? h.href : h.detail || h.href), 1)])], 40, _hoisted_6$3);
					}), 128))], 8, _hoisted_3$5)) : createCommentVNode("", true)]),
					createElementVNode("label", _hoisted_11$2, [createElementVNode("span", _hoisted_12$2, toDisplayString(unref(t)("link.text")), 1), withDirectives(createElementVNode("input", {
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => text.value = $event),
						class: "wy-input",
						type: "text",
						placeholder: unref(t)("link.textPlaceholder")
					}, null, 8, _hoisted_13$2), [[vModelText, text.value]])]),
					createElementVNode("div", _hoisted_14$1, [
						__props.hasLink ? (openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: "wy-btn is-danger",
							onClick: _cache[3] || (_cache[3] = ($event) => emit("remove"))
						}, toDisplayString(unref(t)("link.remove")), 1)) : createCommentVNode("", true),
						_cache[6] || (_cache[6] = createElementVNode("span", { class: "wy-grow" }, null, -1)),
						createElementVNode("button", {
							type: "button",
							class: "wy-btn",
							onClick: _cache[4] || (_cache[4] = ($event) => emit("close"))
						}, toDisplayString(unref(t)("dialog.cancel")), 1),
						createElementVNode("button", {
							type: "submit",
							class: "wy-btn is-primary",
							disabled: !options.value.length && !searching.value
						}, toDisplayString(unref(t)("link.apply")), 9, _hoisted_15$1)
					])
				], 32)]),
				_: 1
			}, 8, [
				"open",
				"title",
				"close-label"
			]);
		};
	}
});
// src/components/LinkHoverCard.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$5 = ["title"];
var _hoisted_2$4 = ["aria-label"];
var _hoisted_3$4 = ["aria-label"];
var _hoisted_4$3 = ["aria-label"];
var _hoisted_5$3 = ["aria-label"];
var SHOW_DELAY = 350;
var HIDE_DELAY$1 = 250;
// src/components/LinkHoverCard.vue
var LinkHoverCard_default = /* @__PURE__ */ defineComponent({
	__name: "LinkHoverCard",
	props: {
		editor: {},
		tick: {},
		readonly: { type: Boolean },
		focused: { type: Boolean }
	},
	emits: ["edit"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = useEditorContext();
		const t = ctx.t;
		const anchor = ref(null);
		const href = ref("");
		/** shown for the pointer (kept while the pointer is on the link or the card), else for the caret */
		let byPointer = false;
		let onCard = false;
		let showTimer = 0;
		let hideTimer = 0;
		function ownLink(target) {
			const link = target instanceof Element ? target.closest("a[href]") : null;
			return link && link.closest(".ProseMirror") === props.editor.view.dom ? link : null;
		}
		function show(link) {
			anchor.value = link;
			href.value = link?.getAttribute("href") ?? "";
		}
		/** the link around an empty caret of a focused, editable editor */
		function caretLink() {
			const e = props.editor;
			const sel = e.state.selection;
			if (props.readonly || e.isDestroyed || !sel.empty || !e.view.hasFocus() || !e.isActive("link")) return null;
			const { node } = e.view.domAtPos(sel.from);
			return ownLink(node instanceof Element ? node : node.parentElement);
		}
		function hideSoon() {
			window.clearTimeout(showTimer);
			window.clearTimeout(hideTimer);
			hideTimer = window.setTimeout(() => {
				if (onCard) return;
				byPointer = false;
				show(caretLink());
			}, HIDE_DELAY$1);
		}
		function onOver(e) {
			const link = ownLink(e.target);
			if (!link) return;
			window.clearTimeout(hideTimer);
			if (link === anchor.value) return;
			window.clearTimeout(showTimer);
			showTimer = window.setTimeout(() => {
				byPointer = true;
				show(link);
			}, SHOW_DELAY);
		}
		function onOut(e) {
			if (ownLink(e.target) && !ownLink(e.relatedTarget)) hideSoon();
		}
		function onCardEnter() {
			onCard = true;
			window.clearTimeout(hideTimer);
		}
		function onCardLeave() {
			onCard = false;
			hideSoon();
		}
		watch(() => [props.tick, props.focused], () => {
			if (byPointer && anchor.value?.isConnected) return;
			byPointer = false;
			show(caretLink());
		});
		let dom = null;
		onMounted(() => {
			dom = props.editor.view.dom;
			dom.addEventListener("mouseover", onOver);
			dom.addEventListener("mouseout", onOut);
		});
		onBeforeUnmount(() => {
			window.clearTimeout(showTimer);
			window.clearTimeout(hideTimer);
			dom?.removeEventListener("mouseover", onOver);
			dom?.removeEventListener("mouseout", onOut);
		});
		/** puts an empty caret inside the link, where the link commands find it */
		function take() {
			const link = anchor.value;
			byPointer = false;
			show(null);
			if (!link?.isConnected) return false;
			props.editor.chain().focus().setTextSelection(props.editor.view.posAtDOM(link, 0) + 1).run();
			return true;
		}
		async function copy() {
			try {
				await navigator.clipboard.writeText(href.value);
				ctx.services.toast?.(t("editor.copied"), "success");
			} catch {}
		}
		function edit() {
			if (take()) emit("edit");
		}
		function remove() {
			if (take()) removeLink(props.editor);
		}
		return (_ctx, _cache) => {
			return anchor.value ? (openBlock(), createBlock(AnchoredPopover_default, {
				key: 0,
				anchor: anchor.value,
				class: "wy-link-card",
				role: "toolbar",
				"aria-label": unref(t)("link.title"),
				onMouseenter: onCardEnter,
				onMouseleave: onCardLeave,
				onEscape: _cache[5] || (_cache[5] = ($event) => show(null))
			}, {
				default: withCtx(() => [
					createElementVNode("span", {
						class: "wy-link-card-url",
						title: href.value
					}, toDisplayString(href.value), 9, _hoisted_1$5),
					withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool is-sm",
						"aria-label": unref(t)("link.open"),
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[1] || (_cache[1] = ($event) => unref(openHref)(unref(ctx).services, href.value, $event))
					}, [createVNode(unref(ExternalLink), { size: 15 })], 40, _hoisted_2$4)), [[unref(vTooltip), unref(t)("link.open")]]),
					withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool is-sm",
						"aria-label": unref(t)("link.copy"),
						onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
						onClick: copy
					}, [createVNode(unref(Copy), { size: 15 })], 40, _hoisted_3$4)), [[unref(vTooltip), unref(t)("link.copy")]]),
					!__props.readonly ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool is-sm",
						"aria-label": unref(t)("link.edit"),
						onMousedown: _cache[3] || (_cache[3] = withModifiers(() => {}, ["prevent"])),
						onClick: edit
					}, [createVNode(unref(Pencil), { size: 15 })], 40, _hoisted_4$3)), [[unref(vTooltip), unref(t)("link.edit")]]), withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool is-sm",
						"aria-label": unref(t)("link.remove"),
						onMousedown: _cache[4] || (_cache[4] = withModifiers(() => {}, ["prevent"])),
						onClick: remove
					}, [createVNode(unref(Unlink), { size: 15 })], 40, _hoisted_5$3)), [[unref(vTooltip), unref(t)("link.remove")]])], 64)) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["anchor", "aria-label"])) : createCommentVNode("", true);
		};
	}
});
// src/components/SaveStatus.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$4 = ["aria-label"];
var _hoisted_2$3 = ["data-status"];
var _hoisted_3$3 = {
	key: 0,
	class: "wy-save-label",
	"aria-hidden": "true"
};
// src/components/SaveStatus.vue
var SaveStatus_default = /* @__PURE__ */ defineComponent({
	__name: "SaveStatus",
	props: {
		status: {},
		dot: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const ctx = useEditorContext();
		const label = computed(() => props.status === "none" ? "" : ctx.t(`draft.${props.status}`));
		return (_ctx, _cache) => {
			return __props.status !== "none" ? withDirectives((openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(["wy-save-status", {
					"is-bad": __props.status === "offline" || __props.status === "error",
					"is-dot": __props.dot
				}]),
				role: "status",
				"aria-label": label.value
			}, [createElementVNode("span", {
				class: "wy-draft-dot",
				"data-status": __props.status,
				"aria-hidden": "true"
			}, null, 8, _hoisted_2$3), !__props.dot ? (openBlock(), createElementBlock("span", _hoisted_3$3, toDisplayString(label.value), 1)) : createCommentVNode("", true)], 10, _hoisted_1$4)), [[unref(vTooltip), __props.dot ? label.value : void 0]]) : createCommentVNode("", true);
		};
	}
});
// src/components/SourceEditor.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$3 = ["value"];
// src/components/SourceEditor.vue
var SourceEditor_default = /* @__PURE__ */ defineComponent({
	__name: "SourceEditor",
	props: { modelValue: {} },
	emits: ["update:modelValue"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const area = ref(null);
		function fit() {
			const el = area.value;
			if (!el) return;
			el.style.height = "auto";
			el.style.height = `${el.scrollHeight + 2}px`;
		}
		watch(() => props.modelValue, () => void nextTick(fit));
		onMounted(fit);
		__expose({ focus: () => area.value?.focus() });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("textarea", {
				ref_key: "area",
				ref: area,
				class: "wy-source-text",
				value: __props.modelValue,
				spellcheck: "false",
				onInput: _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event.target.value))
			}, null, 40, _hoisted_1$3);
		};
	}
});
// src/components/TableControls.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$2 = ["aria-label", "aria-expanded"];
var _hoisted_2$2 = [
	"data-handle",
	"aria-label",
	"aria-expanded"
];
var _hoisted_3$2 = [
	"data-handle",
	"aria-label",
	"aria-expanded"
];
var _hoisted_4$2 = ["aria-label"];
var _hoisted_5$2 = ["aria-label"];
var _hoisted_6$2 = ["aria-checked", "aria-pressed"];
var _hoisted_7$1 = { class: "wy-menu-split" };
var _hoisted_8$1 = { class: "wy-menu-hint" };
var _hoisted_9$1 = ["aria-label"];
var _hoisted_10$1 = [
	"aria-pressed",
	"aria-label",
	"onClick"
];
var _hoisted_11$1 = ["aria-checked", "aria-pressed"];
var _hoisted_12$1 = ["aria-checked", "aria-pressed"];
var _hoisted_13$1 = ["aria-checked", "aria-pressed"];
var HIDE_DELAY = 250;
var DRAG_THRESHOLD = 4;
// src/components/TableControls.vue
var TableControls_default = /* @__PURE__ */ defineComponent({
	__name: "TableControls",
	props: {
		editor: {},
		tick: {}
	},
	setup(__props) {
		const props = __props;
		const t = useEditorContext().t;
		const ALIGNS = [
			{
				value: "left",
				icon: AlignLeft,
				label: "table.alignLeft"
			},
			{
				value: "center",
				icon: AlignCenter,
				label: "table.alignCenter"
			},
			{
				value: "right",
				icon: AlignRight,
				label: "table.alignRight"
			}
		];
		const root = ref(null);
		const hovered = ref(null);
		const hoverCell = shallowRef(null);
		const geo = shallowRef(null);
		const menu = shallowRef(null);
		const drag = shallowRef(null);
		let press = null;
		let suppressClick = false;
		let hideTimer = 0;
		let frame = 0;
		function tableAt(dom) {
			const view = props.editor.view;
			let found = null;
			view.state.doc.descendants((node, pos) => {
				if (found || node.isTextblock) return false;
				if (node.type.name !== "table") return true;
				if (view.nodeDOM(pos) === dom) found = {
					pos,
					node
				};
				return false;
			});
			return found;
		}
		function selectionTableDom() {
			const found = findParentNode((n) => n.type.name === "table")(props.editor.state.selection);
			const dom = found ? props.editor.view.nodeDOM(found.pos) : null;
			return dom instanceof HTMLElement ? dom : null;
		}
		function measure() {
			frame = 0;
			const e = props.editor;
			const base = root.value?.getBoundingClientRect();
			const dom = drag.value ? hovered.value ?? selectionTableDom() : menu.value?.dom ?? hovered.value ?? selectionTableDom();
			const table = base && e.isEditable && !e.isDestroyed && dom?.isConnected ? tableAt(dom) : null;
			const tableEl = dom?.querySelector("table");
			if (!base || !dom || !table || !tableEl) {
				geo.value = null;
				return;
			}
			const clip = dom.getBoundingClientRect();
			const box = tableEl.getBoundingClientRect();
			const left = Math.max(box.left, clip.left);
			const right = Math.min(box.right, clip.right);
			const map = TableMap.get(table.node);
			const sel = findParentNode((n) => n.type.name === "table")(e.state.selection)?.pos === table.pos ? selectedRect(e.state) : null;
			const currentCols = /* @__PURE__ */ new Set();
			const currentRows = /* @__PURE__ */ new Set();
			if (sel) {
				if (map.width === 1 || sel.right - sel.left < map.width) for (let c = sel.left; c < sel.right; c++) currentCols.add(c);
				if (map.height === 1 || sel.bottom - sel.top < map.height) for (let r = sel.top; r < sel.bottom; r++) currentRows.add(r);
			}
			const cellRect = (row, col) => e.view.nodeDOM(table.pos + 1 + map.map[row * map.width + col]).getBoundingClientRect();
			const cols = [];
			for (let c = 0; c < map.width; c++) {
				const r = cellRect(0, c);
				cols.push({
					index: c,
					start: r.left - base.left,
					end: r.right - base.left,
					visible: r.right > left && r.left < right
				});
			}
			const rows = [];
			for (let r = 0; r < map.height; r++) {
				const rr = cellRect(r, 0);
				rows.push({
					index: r,
					start: rr.top - base.top,
					end: rr.bottom - base.top,
					visible: true
				});
			}
			geo.value = {
				table,
				dom,
				cols,
				rows,
				currentCols,
				currentRows,
				caret: sel ? {
					row: sel.top,
					col: sel.left
				} : null,
				header: hasHeaderRow(table.node),
				headerColumn: hasHeaderColumn(table.node),
				left: left - base.left,
				right: right - base.left,
				top: box.top - base.top,
				bottom: box.bottom - base.top
			};
		}
		function cellOf(el) {
			try {
				const $pos = props.editor.view.state.doc.resolve(props.editor.view.posAtDOM(el, 0));
				for (let d = $pos.depth; d > 1; d--) {
					const role = $pos.node(d).type.spec.tableRole;
					if (role !== "cell" && role !== "header_cell") continue;
					const rect = TableMap.get($pos.node(d - 2)).findCell($pos.before(d) - $pos.start(d - 2));
					return {
						row: rect.top,
						col: rect.left
					};
				}
			} catch {}
			return null;
		}
		const active = computed(() => {
			const g = geo.value;
			if (!g) return {
				col: null,
				row: null
			};
			const d = drag.value;
			if (d) return {
				col: d.kind === "col" ? d.from : null,
				row: d.kind === "row" ? d.from : null
			};
			const m = menu.value;
			if (m && m.kind !== "table") return {
				col: m.kind === "col" ? m.index : null,
				row: m.kind === "row" ? m.index : null
			};
			const cell = (hoverCell.value?.dom === g.dom ? hoverCell.value : null) ?? g.caret;
			return cell ? {
				col: cell.col,
				row: cell.row
			} : {
				col: null,
				row: null
			};
		});
		const colHandle = computed(() => {
			const g = geo.value;
			const line = g && active.value.col !== null ? g.cols[active.value.col] : void 0;
			if (!g || !line?.visible) return null;
			const x = Math.min(Math.max((line.start + line.end) / 2, g.left + 12), g.right - 12);
			return {
				index: line.index,
				x,
				y: g.top,
				current: g.currentCols.has(line.index)
			};
		});
		const rowHandle = computed(() => {
			const g = geo.value;
			const line = g && active.value.row !== null ? g.rows[active.value.row] : void 0;
			if (!g || !line) return null;
			return {
				index: line.index,
				x: g.left,
				y: (line.start + line.end) / 2,
				current: g.currentRows.has(line.index),
				fixed: line.index === 0 && g.header
			};
		});
		const dropLine = computed(() => {
			const g = geo.value;
			const d = drag.value;
			if (!g || !d) return null;
			const lines = d.kind === "col" ? g.cols : g.rows;
			const at = d.gap < lines.length ? lines[d.gap].start : lines[lines.length - 1].end;
			return d.kind === "col" ? {
				left: `${at}px`,
				top: `${g.top}px`,
				height: `${g.bottom - g.top}px`
			} : {
				left: `${g.left}px`,
				top: `${at}px`,
				width: `${g.right - g.left}px`
			};
		});
		function schedule() {
			if (!frame) frame = requestAnimationFrame(measure);
		}
		function cancelHide() {
			window.clearTimeout(hideTimer);
			hideTimer = 0;
		}
		function scheduleHide() {
			if (!hovered.value || hideTimer) return;
			hideTimer = window.setTimeout(() => {
				hideTimer = 0;
				hovered.value = null;
				hoverCell.value = null;
			}, HIDE_DELAY);
		}
		function onMove(e) {
			const target = e.target;
			if (!target || root.value?.contains(target)) {
				cancelHide();
				return;
			}
			const wrapper = target.closest?.(".tableWrapper");
			if (wrapper instanceof HTMLElement && props.editor.view.dom.contains(wrapper)) {
				cancelHide();
				if (hovered.value !== wrapper) hovered.value = wrapper;
				const el = target.closest("td, th");
				const cell = el && wrapper.contains(el) ? cellOf(el) : null;
				const prev = hoverCell.value;
				if (cell && (prev?.dom !== wrapper || prev.row !== cell.row || prev.col !== cell.col)) hoverCell.value = {
					...cell,
					dom: wrapper
				};
				return;
			}
			scheduleHide();
		}
		function onLeave() {
			if (!drag.value) scheduleHide();
		}
		function open(kind, index, ev) {
			if (suppressClick) {
				suppressClick = false;
				return;
			}
			const g = geo.value;
			if (!g) return;
			if (kind !== "table") selectLine(props.editor, g.table, kind, index);
			props.editor.view.focus();
			menu.value = {
				kind,
				index,
				dom: g.dom,
				anchor: ev.currentTarget
			};
		}
		function onGripDown(kind, index, e) {
			const g = geo.value;
			suppressClick = false;
			if (e.button !== 0 || !g || kind === "row" && index === 0 && g.header) return;
			press = {
				kind,
				index,
				x: e.clientX,
				y: e.clientY,
				id: e.pointerId
			};
			e.currentTarget.setPointerCapture(e.pointerId);
		}
		function onGripMove(e) {
			if (!press || e.pointerId !== press.id) return;
			const g = geo.value;
			if (!g) return;
			if (!drag.value) {
				if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD) return;
				close();
				selectLine(props.editor, g.table, press.kind, press.index);
				drag.value = {
					kind: press.kind,
					from: press.index,
					gap: press.index,
					table: g.table
				};
				document.documentElement.classList.add("wy-dragging-table");
				window.addEventListener("keydown", onDragKey, true);
			}
			const d = drag.value;
			const base = root.value.getBoundingClientRect();
			const v = d.kind === "col" ? e.clientX - base.left : e.clientY - base.top;
			let gap = 0;
			for (const l of d.kind === "col" ? g.cols : g.rows) if (v > (l.start + l.end) / 2) gap = l.index + 1;
			if (d.kind === "row" && g.header) gap = Math.max(gap, 1);
			if (gap !== d.gap) drag.value = {
				...d,
				gap
			};
		}
		function endDrag(apply) {
			const d = drag.value;
			press = null;
			if (!d) return;
			drag.value = null;
			document.documentElement.classList.remove("wy-dragging-table");
			window.removeEventListener("keydown", onDragKey, true);
			suppressClick = true;
			const to = d.gap > d.from ? d.gap - 1 : d.gap;
			if (apply && to !== d.from) moveLine(props.editor, d.table, d.kind, d.from, to);
			props.editor.view.focus();
		}
		function onGripUp(e) {
			if (press && e.pointerId === press.id) endDrag(true);
		}
		function onDragKey(e) {
			if (e.key !== "Escape") return;
			e.preventDefault();
			e.stopPropagation();
			endDrag(false);
		}
		function close() {
			menu.value = null;
		}
		function run(action) {
			const g = geo.value;
			close();
			if (g) runTableAction(props.editor, g.table, action);
		}
		function append(action) {
			const g = geo.value;
			if (g) runTableAction(props.editor, g.table, {
				kind: "table",
				action
			});
		}
		const columnAlign = computed(() => {
			const m = menu.value;
			return (m?.kind === "col" ? geo.value?.table.node.firstChild?.maybeChild(m.index) : null)?.attrs.align ?? null;
		});
		function onDocDown(e) {
			const target = e.target;
			if (target.closest?.(".wy-table-menu") || root.value?.contains(target)) return;
			close();
		}
		watch(menu, (m, prev) => {
			if (m && !prev) document.addEventListener("mousedown", onDocDown, true);
			else if (!m) document.removeEventListener("mousedown", onDocDown, true);
		});
		watch(() => [
			props.tick,
			hovered.value,
			menu.value,
			drag.value === null
		], schedule);
		watch(geo, async () => {
			const m = menu.value;
			if (!m) return;
			if (!geo.value) {
				close();
				return;
			}
			await nextTick();
			const el = root.value?.querySelector(`[data-handle="${m.kind}-${m.index}"]`);
			if (el && el !== m.anchor) menu.value = {
				...m,
				anchor: el
			};
		});
		const resize = new ResizeObserver(schedule);
		let zone = null;
		onMounted(() => {
			zone = root.value?.parentElement ?? null;
			zone?.addEventListener("mousemove", onMove);
			zone?.addEventListener("mouseleave", onLeave);
			window.addEventListener("scroll", schedule, {
				capture: true,
				passive: true
			});
			window.addEventListener("resize", schedule);
			resize.observe(props.editor.view.dom);
		});
		onBeforeUnmount(() => {
			cancelHide();
			cancelAnimationFrame(frame);
			zone?.removeEventListener("mousemove", onMove);
			zone?.removeEventListener("mouseleave", onLeave);
			window.removeEventListener("scroll", schedule, { capture: true });
			window.removeEventListener("resize", schedule);
			document.removeEventListener("mousedown", onDocDown, true);
			window.removeEventListener("keydown", onDragKey, true);
			document.documentElement.classList.remove("wy-dragging-table");
			resize.disconnect();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "root",
				ref: root,
				class: "wy-table-controls",
				contenteditable: "false"
			}, [geo.value ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [
				withDirectives((openBlock(), createElementBlock("button", {
					type: "button",
					class: "wy-table-corner",
					"data-handle": "table-0",
					style: normalizeStyle({
						left: `${geo.value.left}px`,
						top: `${geo.value.top}px`
					}),
					"aria-label": unref(t)("table.menu"),
					"aria-haspopup": "menu",
					"aria-expanded": menu.value?.kind === "table",
					onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[1] || (_cache[1] = ($event) => open("table", 0, $event))
				}, [createVNode(unref(Ellipsis), { size: 14 })], 44, _hoisted_1$2)), [[unref(vTooltip), unref(t)("table.menu")]]),
				colHandle.value ? withDirectives((openBlock(), createElementBlock("button", {
					key: `c${colHandle.value.index}`,
					type: "button",
					class: normalizeClass(["wy-table-handle is-col", {
						"is-current": colHandle.value.current,
						"is-dragging": drag.value?.kind === "col"
					}]),
					"data-handle": `col-${colHandle.value.index}`,
					style: normalizeStyle({
						left: `${colHandle.value.x}px`,
						top: `${colHandle.value.y}px`
					}),
					"aria-label": unref(t)("table.column", { n: colHandle.value.index + 1 }),
					"aria-haspopup": "menu",
					"aria-expanded": menu.value?.kind === "col" && menu.value.index === colHandle.value.index,
					onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
					onPointerdown: _cache[3] || (_cache[3] = ($event) => onGripDown("col", colHandle.value.index, $event)),
					onPointermove: onGripMove,
					onPointerup: onGripUp,
					onPointercancel: _cache[4] || (_cache[4] = ($event) => endDrag(false)),
					onClick: _cache[5] || (_cache[5] = ($event) => open("col", colHandle.value.index, $event))
				}, [createVNode(unref(GripHorizontal), { size: 14 })], 46, _hoisted_2$2)), [[unref(vTooltip), `${unref(t)("table.column", { n: colHandle.value.index + 1 })}. ${unref(t)("table.dragHint")}`]]) : createCommentVNode("", true),
				rowHandle.value ? withDirectives((openBlock(), createElementBlock("button", {
					key: `r${rowHandle.value.index}`,
					type: "button",
					class: normalizeClass(["wy-table-handle is-row", {
						"is-current": rowHandle.value.current,
						"is-dragging": drag.value?.kind === "row",
						"is-fixed": rowHandle.value.fixed
					}]),
					"data-handle": `row-${rowHandle.value.index}`,
					style: normalizeStyle({
						left: `${rowHandle.value.x}px`,
						top: `${rowHandle.value.y}px`
					}),
					"aria-label": unref(t)("table.row", { n: rowHandle.value.index + 1 }),
					"aria-haspopup": "menu",
					"aria-expanded": menu.value?.kind === "row" && menu.value.index === rowHandle.value.index,
					onMousedown: _cache[6] || (_cache[6] = withModifiers(() => {}, ["prevent"])),
					onPointerdown: _cache[7] || (_cache[7] = ($event) => onGripDown("row", rowHandle.value.index, $event)),
					onPointermove: onGripMove,
					onPointerup: onGripUp,
					onPointercancel: _cache[8] || (_cache[8] = ($event) => endDrag(false)),
					onClick: _cache[9] || (_cache[9] = ($event) => open("row", rowHandle.value.index, $event))
				}, [createVNode(unref(GripVertical), { size: 14 })], 46, _hoisted_3$2)), [[unref(vTooltip), rowHandle.value.fixed ? unref(t)("table.row", { n: 1 }) : `${unref(t)("table.row", { n: rowHandle.value.index + 1 })}. ${unref(t)("table.dragHint")}`]]) : createCommentVNode("", true),
				dropLine.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(["wy-table-drop", drag.value?.kind === "col" ? "is-col" : "is-row"]),
					style: normalizeStyle(dropLine.value),
					"aria-hidden": "true"
				}, null, 6)) : createCommentVNode("", true),
				withDirectives((openBlock(), createElementBlock("button", {
					type: "button",
					class: "wy-table-add is-col",
					style: normalizeStyle({
						left: `${geo.value.right}px`,
						top: `${geo.value.top}px`,
						height: `${geo.value.bottom - geo.value.top}px`
					}),
					"aria-label": unref(t)("table.addColumn"),
					onMousedown: _cache[10] || (_cache[10] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[11] || (_cache[11] = ($event) => append("addCol"))
				}, [createVNode(unref(Plus), { size: 14 })], 44, _hoisted_4$2)), [[vShow, !drag.value], [unref(vTooltip), unref(t)("table.addColumn")]]),
				withDirectives((openBlock(), createElementBlock("button", {
					type: "button",
					class: "wy-table-add is-row",
					style: normalizeStyle({
						left: `${geo.value.left}px`,
						top: `${geo.value.bottom}px`,
						width: `${geo.value.right - geo.value.left}px`
					}),
					"aria-label": unref(t)("table.addRow"),
					onMousedown: _cache[12] || (_cache[12] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[13] || (_cache[13] = ($event) => append("addRow"))
				}, [createVNode(unref(Plus), { size: 14 })], 44, _hoisted_5$2)), [[vShow, !drag.value], [unref(vTooltip), unref(t)("table.addRow")]])
			], 64)) : createCommentVNode("", true), menu.value ? (openBlock(), createBlock(AnchoredPopover_default, {
				key: `${menu.value.kind}-${menu.value.index}`,
				anchor: menu.value.anchor,
				side: menu.value.kind === "row" ? "right" : "bottom",
				class: "wy-menu wy-table-menu",
				role: "menu",
				onEscape: close
			}, {
				default: withCtx(() => [menu.value.kind === "col" ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						onMousedown: _cache[14] || (_cache[14] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[15] || (_cache[15] = ($event) => run({
							kind: "col",
							index: menu.value.index,
							action: "before"
						}))
					}, [createVNode(unref(BetweenVerticalStart), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.insertLeft")), 1)], 32),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						onMousedown: _cache[16] || (_cache[16] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[17] || (_cache[17] = ($event) => run({
							kind: "col",
							index: menu.value.index,
							action: "after"
						}))
					}, [createVNode(unref(BetweenVerticalEnd), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.insertRight")), 1)], 32),
					menu.value.index === 0 ? (openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: "wy-menu-item",
						role: "menuitemcheckbox",
						"aria-checked": geo.value?.headerColumn,
						"aria-pressed": geo.value?.headerColumn,
						onMousedown: _cache[18] || (_cache[18] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[19] || (_cache[19] = ($event) => run({
							kind: "col",
							index: 0,
							action: "header"
						}))
					}, [createVNode(unref(Heading$1), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.headerColumn")), 1)], 40, _hoisted_6$2)) : createCommentVNode("", true),
					createElementVNode("div", _hoisted_7$1, [createElementVNode("span", _hoisted_8$1, toDisplayString(unref(t)("table.align")), 1), createElementVNode("div", {
						class: "wy-seg",
						role: "group",
						"aria-label": unref(t)("table.align")
					}, [(openBlock(), createElementBlock(Fragment$1, null, renderList(ALIGNS, (a) => {
						return withDirectives((openBlock(), createElementBlock("button", {
							key: a.value,
							type: "button",
							"aria-pressed": (columnAlign.value ?? "left") === a.value,
							"aria-label": unref(t)(a.label),
							onMousedown: _cache[20] || (_cache[20] = withModifiers(() => {}, ["prevent"])),
							onClick: ($event) => run({
								kind: "col",
								index: menu.value.index,
								action: a.value
							})
						}, [(openBlock(), createBlock(resolveDynamicComponent(a.icon), { size: 14 }))], 40, _hoisted_10$1)), [[unref(vTooltip), unref(t)(a.label)]]);
					}), 64))], 8, _hoisted_9$1)]),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item is-danger",
						role: "menuitem",
						onMousedown: _cache[21] || (_cache[21] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[22] || (_cache[22] = ($event) => run({
							kind: "col",
							index: menu.value.index,
							action: "delete"
						}))
					}, [createVNode(unref(Trash2), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.deleteColumn")), 1)], 32)
				], 64)) : menu.value.kind === "row" ? (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						onMousedown: _cache[23] || (_cache[23] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[24] || (_cache[24] = ($event) => run({
							kind: "row",
							index: menu.value.index,
							action: "before"
						}))
					}, [createVNode(unref(BetweenHorizontalStart), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.insertAbove")), 1)], 32),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitem",
						onMousedown: _cache[25] || (_cache[25] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[26] || (_cache[26] = ($event) => run({
							kind: "row",
							index: menu.value.index,
							action: "after"
						}))
					}, [createVNode(unref(BetweenHorizontalEnd), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.insertBelow")), 1)], 32),
					menu.value.index === 0 ? (openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: "wy-menu-item",
						role: "menuitemcheckbox",
						"aria-checked": geo.value?.header,
						"aria-pressed": geo.value?.header,
						onMousedown: _cache[27] || (_cache[27] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[28] || (_cache[28] = ($event) => run({
							kind: "row",
							index: 0,
							action: "header"
						}))
					}, [createVNode(unref(Heading$1), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.headerRow")), 1)], 40, _hoisted_11$1)) : createCommentVNode("", true),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item is-danger",
						role: "menuitem",
						onMousedown: _cache[29] || (_cache[29] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[30] || (_cache[30] = ($event) => run({
							kind: "row",
							index: menu.value.index,
							action: "delete"
						}))
					}, [createVNode(unref(Trash2), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.deleteRow")), 1)], 32)
				], 64)) : (openBlock(), createElementBlock(Fragment$1, { key: 2 }, [
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitemcheckbox",
						"aria-checked": geo.value?.header,
						"aria-pressed": geo.value?.header,
						onMousedown: _cache[31] || (_cache[31] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[32] || (_cache[32] = ($event) => run({
							kind: "row",
							index: 0,
							action: "header"
						}))
					}, [createVNode(unref(Heading$1), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.headerRow")), 1)], 40, _hoisted_12$1),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item",
						role: "menuitemcheckbox",
						"aria-checked": geo.value?.headerColumn,
						"aria-pressed": geo.value?.headerColumn,
						onMousedown: _cache[33] || (_cache[33] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[34] || (_cache[34] = ($event) => run({
							kind: "col",
							index: 0,
							action: "header"
						}))
					}, [createVNode(unref(Heading$1), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.headerColumn")), 1)], 40, _hoisted_13$1),
					createElementVNode("button", {
						type: "button",
						class: "wy-menu-item is-danger",
						role: "menuitem",
						onMousedown: _cache[35] || (_cache[35] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[36] || (_cache[36] = ($event) => run({
							kind: "table",
							action: "delete"
						}))
					}, [createVNode(unref(Trash2), {
						class: "wy-menu-icon",
						size: 16
					}), createTextVNode(toDisplayString(unref(t)("table.deleteTable")), 1)], 32)
				], 64))]),
				_: 1
			}, 8, ["anchor", "side"])) : createCommentVNode("", true)], 512);
		};
	}
});
// src/components/Toolbar.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1$1 = ["aria-label"];
var _hoisted_2$1 = { class: "wy-toolbar-scroll" };
var _hoisted_3$1 = { class: "wy-group" };
var _hoisted_4$1 = ["aria-label", "disabled"];
var _hoisted_5$1 = ["aria-label", "disabled"];
var _hoisted_6$1 = [
	"aria-label",
	"aria-expanded",
	"disabled"
];
var _hoisted_7 = [
	"value",
	"aria-label",
	"disabled"
];
var _hoisted_8 = { value: "p" };
var _hoisted_9 = ["value"];
var _hoisted_10 = {
	key: 0,
	value: "code"
};
var _hoisted_11 = { class: "wy-group" };
var _hoisted_12 = [
	"aria-label",
	"aria-expanded",
	"disabled",
	"onClick"
];
var _hoisted_13 = {
	role: "menu",
	class: "wy-menu-row"
};
var _hoisted_14 = [
	"aria-label",
	"aria-checked",
	"aria-pressed",
	"onClick"
];
var _hoisted_15 = { class: "wy-group" };
var _hoisted_16 = [
	"aria-label",
	"aria-pressed",
	"disabled"
];
var _hoisted_17 = [
	"aria-label",
	"aria-pressed",
	"disabled"
];
var _hoisted_18 = [
	"aria-label",
	"aria-expanded",
	"disabled",
	"onClick"
];
var _hoisted_19 = ["aria-label"];
var _hoisted_20 = { class: "wy-menu-heading" };
var _hoisted_21 = ["aria-checked", "onClick"];
var _hoisted_22 = {
	class: "wy-menu-sample",
	"aria-hidden": "true"
};
var _hoisted_23 = { class: "wy-menu-heading" };
var _hoisted_24 = ["aria-checked", "onClick"];
var _hoisted_25 = {
	class: "wy-menu-sample",
	"aria-hidden": "true"
};
var _hoisted_26 = { class: "wy-menu-heading" };
var _hoisted_27 = ["onSubmit"];
var _hoisted_28 = ["aria-label", "aria-invalid"];
var _hoisted_29 = {
	type: "submit",
	class: "wy-btn is-sm"
};
var _hoisted_30 = {
	key: 0,
	class: "wy-menu-hint is-danger"
};
var _hoisted_31 = [
	"aria-label",
	"aria-pressed",
	"disabled"
];
var _hoisted_32 = [
	"aria-label",
	"aria-pressed",
	"disabled"
];
var _hoisted_33 = [
	"aria-label",
	"aria-pressed",
	"disabled"
];
var _hoisted_34 = { class: "wy-group" };
var _hoisted_35 = [
	"aria-label",
	"aria-expanded",
	"onClick"
];
var _hoisted_36 = { class: "wy-tool-text" };
var _hoisted_37 = { class: "wy-menu-heading" };
var _hoisted_38 = [
	"aria-disabled",
	"title",
	"onClick"
];
var _hoisted_39 = ["aria-label", "aria-pressed"];
var _hoisted_40 = ["aria-label"];
var _hoisted_41 = ["aria-label"];
var _hoisted_42 = [
	"aria-label",
	"aria-pressed",
	"disabled",
	"onClick"
];
var _hoisted_43 = { class: "wy-toolbar-end" };
var _hoisted_44 = {
	key: 0,
	class: "wy-group wy-toolbar-actions"
};
var _hoisted_45 = { class: "wy-group" };
var _hoisted_46 = ["aria-label", "aria-pressed"];
var _hoisted_47 = ["aria-label", "aria-pressed"];
// src/components/Toolbar.vue
var Toolbar_default = /* @__PURE__ */ defineComponent({
	__name: "Toolbar",
	props: {
		editor: {},
		tick: {},
		mode: {},
		blockMenuOpen: { type: Boolean },
		fullscreen: { type: Boolean },
		showFocus: { type: Boolean },
		showSource: { type: Boolean },
		serverUndo: { type: Boolean },
		serverRedo: { type: Boolean }
	},
	emits: [
		"link",
		"block-menu",
		"toggle-fullscreen",
		"set-mode"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const ctx = useEditorContext();
		const t = ctx.t;
		const b = ctx.config.base;
		const canUpload = !!ctx.services.upload;
		function innermostList(e) {
			const $from = e.state.selection.$from;
			for (let d = $from.depth; d > 0; d--) {
				const n = $from.node(d);
				if (n.type.name === "taskList") return null;
				if (n.type.name === "bulletList" || n.type.name === "orderedList") return {
					pos: $from.before(d),
					node: n,
					kind: n.type.name === "orderedList" ? "ordered" : "bullet"
				};
			}
			return null;
		}
		const state = computed(() => {
			props.tick;
			const e = props.editor;
			const level = b.headings.find((l) => e.isActive("heading", { level: l })) ?? 0;
			const list = b.listStyles ? innermostList(e) : null;
			const align = [
				"center",
				"right",
				"justify"
			].find((a) => e.isActive({ textAlign: a })) ?? "left";
			return {
				block: e.isActive("codeBlock") ? "code" : level ? `h${level}` : "p",
				link: e.isActive("link"),
				bulletList: e.isActive("bulletList"),
				orderedList: e.isActive("orderedList"),
				taskList: e.isActive("taskList"),
				blockquote: e.isActive("blockquote"),
				callout: e.isActive("callout"),
				align,
				inCell: isInCell(e.state.selection.$from),
				undo: e.can().undo() || props.serverUndo,
				redo: e.can().redo() || props.serverRedo,
				list: list && {
					kind: list.kind,
					style: list.node.attrs.listStyle ?? (list.kind === "ordered" ? "decimal" : "disc"),
					marker: list.node.attrs.marker ?? ""
				}
			};
		});
		const markerInput = ref("");
		const markerInvalid = ref(false);
		const LIST_SAMPLES = {
			decimal: "1.",
			"lower-alpha": "a.",
			"upper-alpha": "A.",
			"lower-roman": "i.",
			"upper-roman": "I.",
			disc: "•",
			circle: "◦",
			square: "▪",
			dash: "–",
			arrow: "→"
		};
		const ALIGNS = [
			{
				id: "left",
				icon: AlignLeft,
				label: "toolbar.alignLeft"
			},
			{
				id: "center",
				icon: AlignCenter,
				label: "toolbar.alignCenter"
			},
			{
				id: "right",
				icon: AlignRight,
				label: "toolbar.alignRight"
			},
			{
				id: "justify",
				icon: AlignJustify,
				label: "toolbar.alignJustify"
			}
		];
		function setListStyle(kind, style, marker = null) {
			const e = props.editor;
			const list = innermostList(e);
			if (!list) return;
			const listStyle = style === "decimal" || style === "disc" ? null : style;
			const type = e.schema.nodes[kind === "ordered" ? "orderedList" : "bulletList"];
			const attrs = kind === "ordered" ? {
				start: list.kind === "ordered" ? list.node.attrs.start : 1,
				listStyle
			} : {
				listStyle,
				marker
			};
			e.chain().focus().command(({ tr }) => {
				tr.setNodeMarkup(list.pos, type, attrs);
				return true;
			}).run();
		}
		function applyMarker(close) {
			const v = markerInput.value.trim();
			markerInvalid.value = !validChar(v);
			if (markerInvalid.value) return;
			setListStyle("bullet", null, v);
			close();
		}
		const groups = computed(() => {
			const ids = [];
			for (const i of ctx.slashItems) if (!ids.includes(i.group)) ids.push(i.group);
			return ids.map((g) => ({
				group: g,
				label: groupLabel(ctx.config, g, ctx.text),
				items: ctx.slashItems.filter((i) => i.group === g)
			}));
		});
		function setBlock(ev) {
			const v = ev.target.value;
			const c = props.editor.chain().focus();
			if (v === "p") c.setParagraph().run();
			else if (v === "code") c.setCodeBlock().run();
			else c.setHeading({ level: Number(v.slice(1)) }).run();
		}
		function toggleCallout() {
			const e = props.editor;
			if (e.isActive("callout")) e.chain().focus().lift("callout").run();
			else e.chain().focus().wrapIn("callout", {
				type: b.callouts[0],
				title: ""
			}).run();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: "wy-toolbar",
				role: "toolbar",
				"aria-label": unref(t)("toolbar.label")
			}, [createElementVNode("div", _hoisted_2$1, [__props.mode === "visual" ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [
				createElementVNode("div", _hoisted_3$1, [
					withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.undo"),
						disabled: !state.value.undo,
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[1] || (_cache[1] = ($event) => __props.editor.chain().focus().historyUndo().run())
					}, [createVNode(unref(Undo2), { size: 18 })], 40, _hoisted_4$1)), [[unref(vTooltip), {
						text: unref(t)("toolbar.undo"),
						keys: "Mod-z"
					}]]),
					withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.redo"),
						disabled: !state.value.redo,
						onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[3] || (_cache[3] = ($event) => __props.editor.chain().focus().historyRedo().run())
					}, [createVNode(unref(Redo2), { size: 18 })], 40, _hoisted_5$1)), [[unref(vTooltip), {
						text: unref(t)("toolbar.redo"),
						keys: "Mod-Shift-z"
					}]]),
					withDirectives((openBlock(), createElementBlock("button", {
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("blockMenu.label"),
						"aria-haspopup": "menu",
						"aria-expanded": __props.blockMenuOpen,
						disabled: state.value.inCell,
						onMousedown: _cache[4] || (_cache[4] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[5] || (_cache[5] = ($event) => emit("block-menu", $event.currentTarget))
					}, [createVNode(unref(MoreHorizontal), { size: 18 })], 40, _hoisted_6$1)), [[unref(vTooltip), unref(t)("blockMenu.label")]])
				]),
				unref(b).headings.length || unref(b).codeBlocks ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [_cache[36] || (_cache[36] = createElementVNode("span", { class: "wy-sep" }, null, -1)), createElementVNode("select", {
					class: "wy-select",
					value: state.value.block,
					"aria-label": unref(t)("toolbar.textStyle"),
					disabled: state.value.inCell,
					onMousedown: _cache[6] || (_cache[6] = withModifiers(() => {}, ["stop"])),
					onChange: setBlock
				}, [
					createElementVNode("option", _hoisted_8, toDisplayString(unref(t)("toolbar.paragraph")), 1),
					(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(b).headings, (l) => {
						return openBlock(), createElementBlock("option", {
							key: l,
							value: `h${l}`
						}, toDisplayString(unref(t)("toolbar.heading", { n: l })), 9, _hoisted_9);
					}), 128)),
					unref(b).codeBlocks ? (openBlock(), createElementBlock("option", _hoisted_10, toDisplayString(unref(t)("toolbar.codeBlock")), 1)) : createCommentVNode("", true)
				], 40, _hoisted_7)], 64)) : createCommentVNode("", true),
				_cache[38] || (_cache[38] = createElementVNode("span", { class: "wy-sep" }, null, -1)),
				createElementVNode("div", _hoisted_11, [
					createVNode(MarkButtons_default, {
						editor: __props.editor,
						tick: __props.tick
					}, null, 8, ["editor", "tick"]),
					unref(b).color || unref(b).highlight ? (openBlock(), createBlock(ColorTool_default, {
						key: 0,
						editor: __props.editor,
						tick: __props.tick
					}, null, 8, ["editor", "tick"])) : createCommentVNode("", true),
					unref(b).textAlign ? (openBlock(), createBlock(Dropdown_default, { key: 1 }, {
						trigger: withCtx(({ open, toggle }) => [withDirectives((openBlock(), createElementBlock("button", {
							type: "button",
							class: "wy-tool",
							"aria-label": unref(t)("toolbar.align"),
							"aria-haspopup": "menu",
							"aria-expanded": open,
							disabled: state.value.inCell,
							onMousedown: _cache[7] || (_cache[7] = withModifiers(() => {}, ["prevent"])),
							onClick: toggle
						}, [(openBlock(), createBlock(resolveDynamicComponent(ALIGNS.find((a) => a.id === state.value.align)?.icon ?? unref(AlignLeft)), { size: 18 }))], 40, _hoisted_12)), [[unref(vTooltip), unref(t)("toolbar.align")]])]),
						default: withCtx(({ close }) => [createElementVNode("div", _hoisted_13, [(openBlock(), createElementBlock(Fragment$1, null, renderList(ALIGNS, (a) => {
							return withDirectives((openBlock(), createElementBlock("button", {
								key: a.id,
								type: "button",
								class: "wy-tool",
								role: "menuitemradio",
								"aria-label": unref(t)(a.label),
								"aria-checked": state.value.align === a.id,
								"aria-pressed": state.value.align === a.id,
								onMousedown: _cache[8] || (_cache[8] = withModifiers(() => {}, ["prevent"])),
								onClick: ($event) => (__props.editor.chain().focus().setTextAlign(a.id).run(), close())
							}, [(openBlock(), createBlock(resolveDynamicComponent(a.icon), { size: 18 }))], 40, _hoisted_14)), [[unref(vTooltip), unref(t)(a.label)]]);
						}), 64))])]),
						_: 1
					})) : createCommentVNode("", true)
				]),
				unref(b).lists || unref(b).taskLists || unref(b).blockquote || unref(b).callouts.length ? (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [_cache[37] || (_cache[37] = createElementVNode("span", { class: "wy-sep" }, null, -1)), createElementVNode("div", _hoisted_15, [
					unref(b).lists ? withDirectives((openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.bulletList"),
						"aria-pressed": state.value.bulletList,
						disabled: state.value.inCell,
						onMousedown: _cache[9] || (_cache[9] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[10] || (_cache[10] = ($event) => __props.editor.chain().focus().toggleBulletList().run())
					}, [createVNode(unref(List), { size: 18 })], 40, _hoisted_16)), [[unref(vTooltip), unref(t)("toolbar.bulletList")]]) : createCommentVNode("", true),
					unref(b).lists ? withDirectives((openBlock(), createElementBlock("button", {
						key: 1,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.orderedList"),
						"aria-pressed": state.value.orderedList,
						disabled: state.value.inCell,
						onMousedown: _cache[11] || (_cache[11] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[12] || (_cache[12] = ($event) => __props.editor.chain().focus().toggleOrderedList().run())
					}, [createVNode(unref(ListOrdered), { size: 18 })], 40, _hoisted_17)), [[unref(vTooltip), unref(t)("toolbar.orderedList")]]) : createCommentVNode("", true),
					unref(b).listStyles && unref(b).lists ? (openBlock(), createBlock(Dropdown_default, {
						key: 2,
						"panel-class": "wy-list-style-panel",
						onOpen: _cache[17] || (_cache[17] = ($event) => (markerInput.value = state.value.list?.marker ?? "", markerInvalid.value = false))
					}, {
						trigger: withCtx(({ open, toggle }) => [withDirectives((openBlock(), createElementBlock("button", {
							type: "button",
							class: "wy-tool is-narrow",
							"aria-label": unref(t)("toolbar.listStyle"),
							"aria-haspopup": "menu",
							"aria-expanded": open,
							disabled: !state.value.list,
							onMousedown: _cache[13] || (_cache[13] = withModifiers(() => {}, ["prevent"])),
							onClick: toggle
						}, [createVNode(unref(ChevronDown), { size: 14 })], 40, _hoisted_18)), [[unref(vTooltip), unref(t)("toolbar.listStyle")]])]),
						default: withCtx(({ close }) => [state.value.list ? (openBlock(), createElementBlock("div", {
							key: 0,
							role: "menu",
							"aria-label": unref(t)("toolbar.listStyle")
						}, [
							createElementVNode("div", _hoisted_20, toDisplayString(unref(t)("listStyle.numbering")), 1),
							(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(ORDERED_STYLES), (s) => {
								return openBlock(), createElementBlock("button", {
									key: s,
									type: "button",
									class: "wy-menu-item",
									role: "menuitemradio",
									"aria-checked": state.value.list.kind === "ordered" && state.value.list.style === s,
									onMousedown: _cache[14] || (_cache[14] = withModifiers(() => {}, ["prevent"])),
									onClick: ($event) => (setListStyle("ordered", s), close())
								}, [createElementVNode("span", _hoisted_22, toDisplayString(LIST_SAMPLES[s]), 1), createTextVNode(toDisplayString(unref(t)(`listStyle.styles.${s}`)), 1)], 40, _hoisted_21);
							}), 128)),
							createElementVNode("div", _hoisted_23, toDisplayString(unref(t)("listStyle.bullets")), 1),
							(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(BULLET_STYLES), (s) => {
								return openBlock(), createElementBlock("button", {
									key: s,
									type: "button",
									class: "wy-menu-item",
									role: "menuitemradio",
									"aria-checked": state.value.list.kind === "bullet" && !state.value.list.marker && state.value.list.style === s,
									onMousedown: _cache[15] || (_cache[15] = withModifiers(() => {}, ["prevent"])),
									onClick: ($event) => (setListStyle("bullet", s), close())
								}, [createElementVNode("span", _hoisted_25, toDisplayString(LIST_SAMPLES[s]), 1), createTextVNode(toDisplayString(unref(t)(`listStyle.styles.${s}`)), 1)], 40, _hoisted_24);
							}), 128)),
							createElementVNode("div", _hoisted_26, toDisplayString(unref(t)("listStyle.custom")), 1),
							createElementVNode("form", {
								class: "wy-menu-form",
								onSubmit: withModifiers(($event) => applyMarker(close), ["prevent"])
							}, [withDirectives(createElementVNode("input", {
								"onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => markerInput.value = $event),
								class: "wy-input is-sm",
								maxlength: "16",
								spellcheck: "false",
								"aria-label": unref(t)("listStyle.custom"),
								"aria-invalid": markerInvalid.value || void 0
							}, null, 8, _hoisted_28), [[vModelText, markerInput.value]]), createElementVNode("button", _hoisted_29, toDisplayString(unref(t)("listStyle.apply")), 1)], 40, _hoisted_27),
							markerInvalid.value ? (openBlock(), createElementBlock("p", _hoisted_30, toDisplayString(unref(t)("listStyle.customHint")), 1)) : createCommentVNode("", true)
						], 8, _hoisted_19)) : createCommentVNode("", true)]),
						_: 1
					})) : createCommentVNode("", true),
					unref(b).taskLists ? withDirectives((openBlock(), createElementBlock("button", {
						key: 3,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.taskList"),
						"aria-pressed": state.value.taskList,
						disabled: state.value.inCell,
						onMousedown: _cache[18] || (_cache[18] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[19] || (_cache[19] = ($event) => __props.editor.chain().focus().toggleTaskList().run())
					}, [createVNode(unref(ListTodo), { size: 18 })], 40, _hoisted_31)), [[unref(vTooltip), unref(t)("toolbar.taskList")]]) : createCommentVNode("", true),
					unref(b).blockquote ? withDirectives((openBlock(), createElementBlock("button", {
						key: 4,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.quote"),
						"aria-pressed": state.value.blockquote,
						disabled: state.value.inCell,
						onMousedown: _cache[20] || (_cache[20] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[21] || (_cache[21] = ($event) => __props.editor.chain().focus().toggleBlockquote().run())
					}, [createVNode(unref(Quote), { size: 18 })], 40, _hoisted_32)), [[unref(vTooltip), unref(t)("toolbar.quote")]]) : createCommentVNode("", true),
					unref(b).callouts.length ? withDirectives((openBlock(), createElementBlock("button", {
						key: 5,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.callout"),
						"aria-pressed": state.value.callout,
						disabled: state.value.inCell,
						onMousedown: _cache[22] || (_cache[22] = withModifiers(() => {}, ["prevent"])),
						onClick: toggleCallout
					}, [createVNode(unref(MessageSquareQuote), { size: 18 })], 40, _hoisted_33)), [[unref(vTooltip), unref(t)("toolbar.callout")]]) : createCommentVNode("", true)
				])], 64)) : createCommentVNode("", true),
				_cache[39] || (_cache[39] = createElementVNode("span", { class: "wy-sep" }, null, -1)),
				createElementVNode("div", _hoisted_34, [
					unref(ctx).slashItems.length ? (openBlock(), createBlock(Dropdown_default, {
						key: 0,
						"panel-class": "wy-insert-panel"
					}, {
						trigger: withCtx(({ open, toggle }) => [withDirectives((openBlock(), createElementBlock("button", {
							type: "button",
							class: "wy-tool is-wide",
							"aria-label": unref(t)("toolbar.insert"),
							"aria-haspopup": "menu",
							"aria-expanded": open,
							onMousedown: _cache[23] || (_cache[23] = withModifiers(() => {}, ["prevent"])),
							onClick: toggle
						}, [
							createVNode(unref(Plus), { size: 18 }),
							createElementVNode("span", _hoisted_36, toDisplayString(unref(t)("toolbar.insert")), 1),
							createVNode(unref(ChevronDown), { size: 14 })
						], 40, _hoisted_35)), [[unref(vTooltip), unref(t)("toolbar.insert")]])]),
						default: withCtx(({ close }) => [(openBlock(true), createElementBlock(Fragment$1, null, renderList(groups.value, (g) => {
							return openBlock(), createElementBlock("div", {
								key: g.group,
								role: "group"
							}, [createElementVNode("div", _hoisted_37, toDisplayString(g.label), 1), (openBlock(true), createElementBlock(Fragment$1, null, renderList(g.items, (a) => {
								return openBlock(), createElementBlock("button", {
									key: a.id,
									type: "button",
									class: "wy-menu-item",
									role: "menuitem",
									"aria-disabled": state.value.inCell && !a.inline || !a.enabled(__props.editor) || void 0,
									title: state.value.inCell && !a.inline ? unref(t)("editor.inlineOnly") : void 0,
									onMousedown: _cache[24] || (_cache[24] = withModifiers(() => {}, ["prevent"])),
									onClick: ($event) => (!state.value.inCell || a.inline) && a.enabled(__props.editor) && (a.run(__props.editor), close())
								}, [a.icon ? (openBlock(), createBlock(resolveDynamicComponent(a.icon), {
									key: 0,
									class: "wy-menu-icon",
									size: 16,
									"aria-hidden": "true"
								})) : createCommentVNode("", true), createTextVNode(toDisplayString(a.label), 1)], 40, _hoisted_38);
							}), 128))]);
						}), 128))]),
						_: 1
					})) : createCommentVNode("", true),
					unref(b).links ? withDirectives((openBlock(), createElementBlock("button", {
						key: 1,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.link"),
						"aria-pressed": state.value.link,
						onMousedown: _cache[25] || (_cache[25] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[26] || (_cache[26] = ($event) => emit("link"))
					}, [createVNode(unref(Link$1), { size: 18 })], 40, _hoisted_39)), [[unref(vTooltip), {
						text: unref(t)("toolbar.link"),
						keys: "Mod-k"
					}]]) : createCommentVNode("", true),
					unref(b).images && canUpload ? withDirectives((openBlock(), createElementBlock("button", {
						key: 2,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.image"),
						onMousedown: _cache[27] || (_cache[27] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[28] || (_cache[28] = ($event) => unref(ctx).files.pick("image"))
					}, [createVNode(unref(Image$1), { size: 18 })], 40, _hoisted_40)), [[unref(vTooltip), unref(t)("toolbar.image")]]) : createCommentVNode("", true),
					unref(b).files && canUpload ? withDirectives((openBlock(), createElementBlock("button", {
						key: 3,
						type: "button",
						class: "wy-tool",
						"aria-label": unref(t)("toolbar.file"),
						onMousedown: _cache[29] || (_cache[29] = withModifiers(() => {}, ["prevent"])),
						onClick: _cache[30] || (_cache[30] = ($event) => unref(ctx).files.pick("file"))
					}, [createVNode(unref(Paperclip), { size: 18 })], 40, _hoisted_41)), [[unref(vTooltip), unref(t)("toolbar.file")]]) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment$1, null, renderList(unref(ctx).toolbar, (item) => {
						return withDirectives((openBlock(), createElementBlock("button", {
							key: item.id,
							type: "button",
							class: "wy-tool",
							"aria-label": unref(ctx).text(item.label),
							"aria-pressed": item.active?.(__props.editor) ?? void 0,
							disabled: item.enabled ? !item.enabled(__props.editor) : false,
							onMousedown: _cache[31] || (_cache[31] = withModifiers(() => {}, ["prevent"])),
							onClick: ($event) => item.run(__props.editor, unref(ctx).services)
						}, [(openBlock(), createBlock(resolveDynamicComponent(item.icon), { size: 18 }))], 40, _hoisted_42)), [[unref(vTooltip), {
							text: unref(ctx).text(item.label),
							keys: item.shortcut
						}]]);
					}), 128))
				])
			], 64)) : createCommentVNode("", true)]), createElementVNode("div", _hoisted_43, [
				renderSlot(_ctx.$slots, "status"),
				__props.fullscreen && _ctx.$slots.actions ? (openBlock(), createElementBlock("div", _hoisted_44, [renderSlot(_ctx.$slots, "actions")])) : createCommentVNode("", true),
				createElementVNode("div", _hoisted_45, [__props.showSource ? withDirectives((openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: "wy-tool",
					"aria-label": unref(t)("toolbar.source"),
					"aria-pressed": __props.mode === "source",
					onMousedown: _cache[32] || (_cache[32] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[33] || (_cache[33] = ($event) => emit("set-mode", __props.mode === "source" ? "visual" : "source"))
				}, [createVNode(unref(FileCode), { size: 18 })], 40, _hoisted_46)), [[unref(vTooltip), __props.mode === "source" ? unref(t)("toolbar.visual") : unref(t)("toolbar.source")]]) : createCommentVNode("", true), __props.showFocus ? withDirectives((openBlock(), createElementBlock("button", {
					key: 1,
					type: "button",
					class: "wy-tool",
					"aria-label": __props.fullscreen ? unref(t)("toolbar.exitFocus") : unref(t)("toolbar.focus"),
					"aria-pressed": __props.fullscreen,
					onMousedown: _cache[34] || (_cache[34] = withModifiers(() => {}, ["prevent"])),
					onClick: _cache[35] || (_cache[35] = ($event) => emit("toggle-fullscreen"))
				}, [__props.fullscreen ? (openBlock(), createBlock(unref(Minimize2), {
					key: 0,
					size: 18
				})) : (openBlock(), createBlock(unref(Maximize2), {
					key: 1,
					size: 18
				}))], 40, _hoisted_47)), [[unref(vTooltip), __props.fullscreen ? unref(t)("toolbar.exitFocus") : unref(t)("toolbar.focus")]]) : createCommentVNode("", true)])
			])], 8, _hoisted_1$1);
		};
	}
});
// src/components/WysiwygEditor.vue?vue&type=script&setup=true&lang.ts
var _hoisted_1 = {
	key: 1,
	class: "wy-surface wy-source"
};
var _hoisted_2 = {
	key: 2,
	class: "wy-statusbar",
	role: "status"
};
var _hoisted_3 = ["aria-label"];
var _hoisted_4 = ["aria-label", "aria-pressed"];
var _hoisted_5 = ["aria-label"];
var _hoisted_6 = ["aria-label"];
// src/components/WysiwygEditor.vue
var WysiwygEditor_default = /* @__PURE__ */ defineComponent({
	name: "WysiwygEditor",
	__name: "WysiwygEditor",
	props: {
		modelValue: {},
		format: { default: "markdown" },
		size: { default: "full" },
		extensions: { default: void 0 },
		base: { default: void 0 },
		placeholder: { default: void 0 },
		readonly: {
			type: Boolean,
			default: false
		},
		autofocus: {
			type: [Boolean, String],
			default: false
		},
		services: { default: void 0 },
		locale: { default: void 0 },
		messages: { default: void 0 },
		minRows: { default: 3 },
		inline: {
			type: Boolean,
			default: false
		},
		expandable: {
			type: Boolean,
			default: true
		},
		expandTitle: { default: void 0 },
		focusMode: {
			type: Boolean,
			default: false
		},
		sourceMode: {
			type: Boolean,
			default: false
		},
		gutter: {
			type: Boolean,
			default: true
		},
		draft: { default: null },
		collaboration: { default: null },
		shortcuts: { default: () => [] },
		trailingNewline: {
			type: Boolean,
			default: void 0
		},
		contentClass: { default: "" },
		toolbar: { default: "fixed" }
	},
	emits: [
		"update:modelValue",
		"focus",
		"blur",
		"submit",
		"save",
		"shortcut",
		"pending",
		"ready"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const parent = inject(EDITOR_CONTEXT, null);
		const defaults = inject(WYSIWYG_DEFAULTS, {});
		const inherited = parent?.inherit ?? defaults;
		const extensions = props.extensions ?? inherited.extensions ?? defaults.extensions ?? NO_EXTENSIONS;
		const base = props.base ?? inherited.base ?? defaults.base;
		const services = props.services ?? inherited.services ?? defaults.services ?? {};
		const locale = props.locale ?? inherited.locale ?? defaults.locale ?? "en";
		const overrides = props.messages ?? inherited.messages ?? defaults.messages;
		setKatexLoader(services.katex);
		const shared = toRaw(props.collaboration)?.extensions ?? null;
		const activeDraft = computed(() => shared ? null : props.draft);
		const config = resolveConfig(props.format, base, extensions);
		const markdown = markdownFor(config);
		const html = props.format === "html";
		const full = props.size === "full";
		const isInline = props.inline && !full;
		const trailing = props.trailingNewline ?? full;
		const trees = [
			overrides,
			...config.extensions.map((e) => e.messages?.[locale]),
			...config.extensions.map((e) => e.messages?.en),
			MESSAGES[locale],
			MESSAGES.en
		];
		const t = createTranslator(trees);
		const has = (key) => hasMessage(trees, key);
		const text = (label, key) => {
			return (typeof label === "function" ? label() : label) || (key && has(key) ? t(key) : "");
		};
		const instance = getCurrentInstance();
		const listens = (name) => !!instance.vnode.props?.[`on${name[0].toUpperCase()}${name.slice(1)}`];
		const uploads = ref({
			count: 0,
			fraction: null
		});
		const files = createFileController({
			editor: () => editor.value,
			config,
			services,
			t,
			locale,
			progress: (count, fraction) => uploads.value = {
				count,
				fraction
			}
		});
		onBeforeUnmount(() => files.dispose());
		const ctx = {
			config,
			markdown,
			convert: convertRegistry(config, markdown),
			services,
			t,
			locale,
			size: props.size,
			inline: isInline,
			slashItems: [],
			toolbar: config.extensions.flatMap((e) => e.toolbar ?? []).sort((a, b) => (a.rank ?? 100) - (b.rank ?? 100)),
			bubble: config.extensions.flatMap((e) => e.bubble ?? []).sort((a, b) => (a.rank ?? 100) - (b.rank ?? 100)),
			codeBlock: config.extensions.flatMap((e) => e.codeBlock ? [e.codeBlock] : []),
			figure: config.extensions.flatMap((e) => e.figure ? [e.figure] : []),
			math: config.extensions.flatMap((e) => e.math ? [e.math] : []),
			files,
			text,
			has,
			field: instance.type,
			inherit: {
				extensions,
				base,
				services,
				locale,
				messages: overrides
			},
			zoom: (image) => zoomed.value = image
		};
		ctx.slashItems = isInline ? [] : slashCatalog(config, files, services, text);
		provide(EDITOR_CONTEXT, ctx);
		const readonlyBubble = ctx.bubble.some((item) => item.readonly);
		const zoomed = ref(null);
		const floatingBar = ref(null);
		const root = ref(null);
		const mode = ref("visual");
		const fullscreen = ref(false);
		const focused = ref(false);
		const expanded = ref(false);
		const tick = ref(0);
		const linkOpen = ref(false);
		const linkInitial = ref({
			href: "",
			text: "",
			hasLink: false
		});
		let lastEmitted = props.modelValue;
		let unsent = false;
		const idle = debounced(() => void flush(), 250, 2e3);
		const deferred = full && !html;
		function parse(e, value, from = props.format) {
			if (from === "html") return createDocument(value, e.schema, { preserveWhitespace: false });
			return isInline ? markdown.parseInline(value, e.schema) : markdown.parse(value, e.schema);
		}
		function serialize(e, as = props.format) {
			const doc = e.state.doc;
			if (as === "text") return doc.textBetween(0, doc.content.size, "\n\n", "\n");
			if (as === "html") return e.isEmpty ? "" : e.getHTML();
			if (isInline) return markdown.serializeInline(doc);
			const md = markdown.serialize(doc);
			if (md === "\n") return "";
			return trailing ? md : md.replace(/\n$/, "");
		}
		/** with `history` it is one local undo step (AI edits), otherwise it stays out of the history */
		function load(e, value, history = false) {
			setUnsent(false);
			try {
				const doc = parse(e, value);
				if (history) e.commands.setContent(doc.toJSON(), { emitUpdate: false });
				else replaceDocument(e, doc);
			} catch {
				if (!html && full) {
					services.toast?.(t("editor.parseFailed"), "error");
					mode.value = "source";
				} else e.commands.setContent(value, { emitUpdate: false });
			}
		}
		function setUnsent(v) {
			if (unsent === v) return;
			unsent = v;
			activeDraft.value?.pending(v);
			emit("pending", v);
		}
		function flush(history = false) {
			idle.cancel();
			const e = editor.value;
			let value = null;
			if ((unsent || history) && e && mode.value === "visual") {
				value = serialize(e);
				if (value !== lastEmitted) {
					lastEmitted = value;
					if (history && activeDraft.value) activeDraft.value.historyStep(value);
					emit("update:modelValue", value);
				}
			}
			setUnsent(false);
			return value;
		}
		function bridge() {
			const draft = activeDraft.value;
			if (!draft) return null;
			const apply = (value) => {
				const e = editor.value;
				if (value === null || value === lastEmitted || !e) return;
				lastEmitted = value;
				if (mode.value === "visual") load(e, value);
			};
			return {
				canUndo: () => draft.canUndo.value,
				canRedo: () => draft.canRedo.value,
				undo: async () => apply(await draft.undo()),
				redo: async () => apply(await draft.redo())
			};
		}
		function hostKeys() {
			const keys = {};
			if (listens("submit")) keys["Mod-Enter"] = () => {
				flush();
				emit("submit");
				return true;
			};
			keys["Mod-s"] = () => {
				if (!listens("save")) return false;
				flush();
				emit("save");
				return true;
			};
			keys["Mod-k"] = () => {
				if (!config.base.links) return false;
				openLink();
				return true;
			};
			keys["Alt-F10"] = () => floatingBar.value?.focusFirst() ?? false;
			for (const k of props.shortcuts) keys[k] = () => {
				emit("shortcut", k);
				return true;
			};
			return keys;
		}
		const blockMenu = shallowRef(null);
		const menuAnchor = ref(null);
		function anchorAt(rect) {
			const el = menuAnchor.value;
			const box = el?.parentElement?.getBoundingClientRect();
			if (!el || !box) return null;
			el.style.left = `${rect.left - box.left}px`;
			el.style.top = `${rect.top - box.top}px`;
			el.style.height = `${rect.bottom - rect.top}px`;
			return el;
		}
		function openGripMenu(pos, grip) {
			const e = editor.value;
			if (blockMenu.value?.anchor === grip && blockMenu.value.run.from === pos) {
				blockMenu.value = null;
				return;
			}
			const run = e && nodeRun(e.state, pos);
			blockMenu.value = run ? {
				run,
				anchor: grip,
				convertOnly: false,
				selectAll: false
			} : null;
		}
		function openCaretMenu(button) {
			if (button && blockMenu.value?.anchor === button) {
				blockMenu.value = null;
				return;
			}
			const e = editor.value;
			const run = e && selectionRun(e.state);
			const anchor = button ?? (e && anchorAt(e.view.coordsAtPos(e.state.selection.from)));
			blockMenu.value = run && anchor ? {
				run,
				anchor,
				convertOnly: false,
				selectAll: !e.state.selection.empty
			} : null;
		}
		function openConvertMenu(button) {
			const e = editor.value;
			const run = e && selectionRun(e.state);
			const anchor = anchorAt(button.getBoundingClientRect());
			blockMenu.value = run && anchor ? {
				run,
				anchor,
				convertOnly: true,
				selectAll: true
			} : null;
		}
		function insertAfter(pos) {
			editor.value?.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).insertContent("/").run();
		}
		const editor = useEditor({
			editable: !props.readonly,
			extensions: editorExtensions(ctx, {
				placeholder: props.placeholder ?? (isInline ? "" : t("editor.placeholder")),
				gutter: full && props.gutter ? {
					onInsertAfter: insertAfter,
					onMenu: openGripMenu,
					menuOpen: () => blockMenu.value !== null
				} : null,
				bridge,
				hostKeys,
				collaboration: shared
			}),
			editorProps: {
				attributes: {
					class: `wy-prose wy-content${isInline ? " is-inline" : ""}${props.contentClass ? ` ${props.contentClass}` : ""}`,
					spellcheck: "true"
				},
				handlePaste: (_view, event) => !isInline && !!event.clipboardData?.files.length && files.insert(Array.from(event.clipboardData.files), null),
				handleDrop: (view, event, _slice, moved) => {
					if (isInline || moved || !event.dataTransfer?.files.length) return false;
					return files.insert(Array.from(event.dataTransfer.files), view.posAtCoords({
						left: event.clientX,
						top: event.clientY
					})?.pos ?? null);
				}
			},
			onCreate: ({ editor: e }) => {
				if (!shared) load(e, props.modelValue);
				lastEmitted = props.modelValue;
				if (props.autofocus) e.commands.focus(props.autofocus === "start" ? "start" : "end");
				emit("ready", handle);
			},
			onUpdate: ({ transaction }) => {
				if (transaction.getMeta("history$")) {
					flush(true);
					return;
				}
				setUnsent(true);
				if (deferred) idle.schedule();
				else flush();
			},
			onFocus: ({ event }) => {
				focused.value = true;
				registry?.activate(handle);
				emit("focus", event);
			},
			onBlur: ({ editor: e, event }) => {
				flush();
				if (!root.value?.contains(event.relatedTarget)) focused.value = false;
				const sel = e.state.selection;
				if (sel instanceof NodeSelection && sel.node.isInline) e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, sel.to)));
				emit("blur", event);
			},
			onTransaction: ({ transaction }) => {
				tick.value++;
				if (transaction.docChanged) blockMenu.value = null;
			}
		});
		watch(() => props.modelValue, (value) => {
			if (shared || mode.value === "source" || value === lastEmitted || !editor.value) return;
			lastEmitted = value;
			load(editor.value, value);
		});
		watch(() => props.readonly, (ro) => editor.value?.setEditable(!ro));
		let detach = null;
		watch(() => activeDraft.value, (d) => {
			detach?.();
			detach = d ? d.attach(() => void flush()) : null;
		}, { immediate: true });
		onBeforeUnmount(() => {
			flush();
			detach?.();
		});
		function setMode(next) {
			if (next === mode.value) return;
			flush();
			blockMenu.value = null;
			if (next === "visual" && editor.value) {
				lastEmitted = props.modelValue;
				load(editor.value, props.modelValue);
				editor.value.commands.focus();
			}
			mode.value = next;
		}
		function onSourceInput(value) {
			lastEmitted = value;
			emit("update:modelValue", value);
		}
		let bodyOverflow = "";
		function setFullscreen(on) {
			fullscreen.value = on;
			if (on) bodyOverflow = document.body.style.overflow;
			document.body.style.overflow = on ? "hidden" : bodyOverflow;
			if (on && mode.value === "visual") editor.value?.commands.focus();
		}
		function onKeydown(e) {
			if (!editor.value?.view.dom.contains(e.target)) return;
			if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === "/" && full) {
				e.preventDefault();
				openCaretMenu();
			}
			if (e.defaultPrevented) e.stopPropagation();
		}
		function onEscape(e) {
			if (e.key !== "Escape" || !fullscreen.value) return;
			if (e.target?.closest(".wy-block-frame.is-editing") || root.value?.querySelector("[aria-expanded=\"true\"]")) return;
			e.preventDefault();
			e.stopPropagation();
			setFullscreen(false);
		}
		onBeforeUnmount(() => {
			if (fullscreen.value) document.body.style.overflow = bodyOverflow;
		});
		function openLink() {
			const e = editor.value;
			if (!e) return;
			linkInitial.value = linkAtSelection(e);
			linkOpen.value = true;
		}
		function onApplyLink(href, label) {
			linkOpen.value = false;
			if (editor.value) applyLink(editor.value, href, label);
		}
		function onRemoveLink() {
			linkOpen.value = false;
			if (editor.value) removeLink(editor.value);
		}
		const linkActive = computed(() => {
			tick.value;
			return !!editor.value?.isActive("link");
		});
		const minHeight = computed(() => isInline || full ? void 0 : `${Math.max(1, props.minRows) * 1.6 + 1}rem`);
		function toMath() {
			const e = editor.value;
			if (!e) return;
			const { from, to } = e.state.selection;
			insertFresh(e, "mathInline", { tex: e.state.doc.textBetween(from, to, " ").trim() }, {
				from,
				to
			});
		}
		function onExpandedInput(value) {
			if (value === lastEmitted) return;
			lastEmitted = value;
			emit("update:modelValue", value);
			if (editor.value) load(editor.value, value);
		}
		function onFieldMouseDown(e) {
			if (e.target === e.currentTarget && editor.value && !props.readonly) {
				e.preventDefault();
				editor.value.commands.focus("end");
			}
		}
		const draftStatus = computed(() => activeDraft.value?.status.value ?? "none");
		function selectionAs(e) {
			const { from, to, empty } = e.state.selection;
			const fragment = e.state.selection.content().content;
			const text = e.state.doc.textBetween(from, to, "\n");
			let md = "";
			try {
				md = empty ? "" : fragmentMarkdown(markdown, fragment, e.schema);
			} catch {
				md = text;
			}
			return {
				empty,
				from,
				to,
				text,
				markdown: md,
				html: fragmentHtml(fragment, e.schema)
			};
		}
		const handle = {
			get editor() {
				return editor.value ?? null;
			},
			format: props.format,
			getContent(as = props.format) {
				const fresh = flush();
				const e = editor.value;
				if (mode.value === "source" || !e) return props.modelValue;
				if (as === props.format) return fresh ?? serialize(e);
				return serialize(e, as);
			},
			setContent(value, opts = {}) {
				const e = editor.value;
				const from = opts.format ?? props.format;
				if (!e || mode.value === "source") {
					if (from === props.format) onSourceInput(value);
					return;
				}
				const doc = from === props.format ? null : parse(e, value, from);
				if (doc) {
					if (opts.undoable) e.commands.setContent(doc.toJSON());
					else replaceDocument(e, doc);
					setUnsent(true);
					flush();
					return;
				}
				lastEmitted = value;
				emit("update:modelValue", value);
				load(e, value, opts.undoable);
			},
			insertAtCursor(value, opts = {}) {
				const e = editor.value;
				const from = opts.format ?? props.format;
				if (!e || mode.value === "source") {
					if (!html) onSourceInput(props.modelValue.replace(/\s*$/, "") + "\n\n" + value.trim() + "\n");
					return;
				}
				const doc = parse(e, value, from);
				e.chain().focus().insertContent(isInline ? doc.firstChild?.content.toJSON() ?? [] : doc.content.toJSON()).run();
			},
			getSelection() {
				const e = editor.value;
				return e ? selectionAs(e) : {
					empty: true,
					from: 0,
					to: 0,
					text: "",
					markdown: "",
					html: ""
				};
			},
			focus(where = "end") {
				editor.value?.commands.focus(where);
			},
			isEmpty() {
				const e = editor.value;
				return e ? e.isEmpty : !props.modelValue.trim();
			},
			flush() {
				flush();
			}
		};
		const registry = parent ? null : useHandleRegistry();
		let unregister = null;
		onMounted(() => {
			unregister = registry?.register(handle) ?? null;
		});
		onBeforeUnmount(() => unregister?.());
		__expose(handle);
		return (_ctx, _cache) => {
			const _component_WysiwygEditor = resolveComponent("WysiwygEditor", true);
			return openBlock(), createElementBlock("div", {
				ref_key: "root",
				ref: root,
				class: normalizeClass(["wy-editor", [
					`is-${__props.size}`,
					`is-${__props.format}`,
					{
						"is-fullscreen": fullscreen.value,
						"is-focused": focused.value,
						"is-readonly": __props.readonly,
						"is-inline": unref(isInline)
					}
				]]),
				style: normalizeStyle({ minHeight: minHeight.value }),
				onKeydown,
				onKeydownCapture: onEscape
			}, [
				full ? (openBlock(), createElementBlock(Fragment$1, { key: 0 }, [
					renderSlot(_ctx.$slots, "header"),
					unref(editor) && !__props.readonly && __props.toolbar !== "floating" ? (openBlock(), createBlock(Toolbar_default, {
						key: 0,
						editor: unref(editor),
						tick: tick.value,
						mode: mode.value,
						fullscreen: fullscreen.value,
						"block-menu-open": !!blockMenu.value && !blockMenu.value.convertOnly,
						"show-focus": __props.focusMode,
						"show-source": __props.sourceMode && !html && !unref(shared),
						"server-undo": activeDraft.value?.canUndo.value ?? false,
						"server-redo": activeDraft.value?.canRedo.value ?? false,
						onLink: openLink,
						onBlockMenu: openCaretMenu,
						onToggleFullscreen: _cache[0] || (_cache[0] = ($event) => setFullscreen(!fullscreen.value)),
						onSetMode: setMode
					}, createSlots({
						status: withCtx(() => [renderSlot(_ctx.$slots, "status", {}, () => [activeDraft.value ? (openBlock(), createBlock(SaveStatus_default, {
							key: 0,
							status: draftStatus.value
						}, null, 8, ["status"])) : createCommentVNode("", true)])]),
						_: 2
					}, [_ctx.$slots.actions ? {
						name: "actions",
						fn: withCtx(() => [renderSlot(_ctx.$slots, "actions")]),
						key: "0"
					} : void 0]), 1032, [
						"editor",
						"tick",
						"mode",
						"fullscreen",
						"block-menu-open",
						"show-focus",
						"show-source",
						"server-undo",
						"server-redo"
					])) : createCommentVNode("", true),
					withDirectives(createElementVNode("div", { class: normalizeClass(["wy-surface", { "has-gutter": __props.gutter && !__props.readonly }]) }, [
						createVNode(unref(EditorContent), {
							editor: unref(editor),
							class: "wy-host"
						}, null, 8, ["editor"]),
						unref(editor) && (!__props.readonly || unref(readonlyBubble)) ? withDirectives((openBlock(), createBlock(FloatingToolbar_default, {
							key: 0,
							ref_key: "floatingBar",
							ref: floatingBar,
							editor: unref(editor),
							tick: tick.value,
							readonly: __props.readonly,
							full: __props.toolbar !== "fixed",
							onLink: openLink,
							onConvert: openConvertMenu
						}, null, 8, [
							"editor",
							"tick",
							"readonly",
							"full"
						])), [[vShow, mode.value === "visual"]]) : createCommentVNode("", true),
						unref(editor) && unref(config).base.links && mode.value === "visual" ? (openBlock(), createBlock(LinkHoverCard_default, {
							key: 1,
							editor: unref(editor),
							tick: tick.value,
							readonly: __props.readonly,
							focused: focused.value,
							onEdit: openLink
						}, null, 8, [
							"editor",
							"tick",
							"readonly",
							"focused"
						])) : createCommentVNode("", true),
						unref(editor) && !__props.readonly && unref(config).base.tables ? (openBlock(), createBlock(TableControls_default, {
							key: 2,
							editor: unref(editor),
							tick: tick.value
						}, null, 8, ["editor", "tick"])) : createCommentVNode("", true),
						createElementVNode("span", {
							ref_key: "menuAnchor",
							ref: menuAnchor,
							class: "wy-menu-anchor",
							"aria-hidden": "true"
						}, null, 512),
						unref(editor) && blockMenu.value ? (openBlock(), createBlock(BlockActionsMenu_default, {
							key: `${blockMenu.value.run.from}-${blockMenu.value.convertOnly}`,
							editor: unref(editor),
							run: blockMenu.value.run,
							anchor: blockMenu.value.anchor,
							"convert-only": blockMenu.value.convertOnly,
							"select-all": blockMenu.value.selectAll,
							onClose: _cache[1] || (_cache[1] = ($event) => blockMenu.value = null)
						}, null, 8, [
							"editor",
							"run",
							"anchor",
							"convert-only",
							"select-all"
						])) : createCommentVNode("", true)
					], 2), [[vShow, mode.value === "visual"]]),
					mode.value === "source" ? (openBlock(), createElementBlock("div", _hoisted_1, [(openBlock(), createBlock(resolveDynamicComponent(unref(services).sourceEditor ?? SourceEditor_default), {
						"model-value": __props.modelValue,
						"aria-label": unref(t)("source.label"),
						"onUpdate:modelValue": onSourceInput
					}, null, 8, ["model-value", "aria-label"]))])) : createCommentVNode("", true),
					uploads.value.count ? (openBlock(), createElementBlock("div", _hoisted_2, toDisplayString(uploads.value.fraction === null ? unref(t)("editor.uploading", { n: uploads.value.count }) : unref(t)("editor.uploadingProgress", {
						n: uploads.value.count,
						percent: Math.round(uploads.value.fraction * 100)
					})), 1)) : createCommentVNode("", true),
					renderSlot(_ctx.$slots, "footer")
				], 64)) : (openBlock(), createElementBlock(Fragment$1, { key: 1 }, [
					createElementVNode("div", {
						class: "wy-field-body",
						onMousedown: onFieldMouseDown
					}, [createVNode(unref(EditorContent), {
						editor: unref(editor),
						class: "wy-host"
					}, null, 8, ["editor"])], 32),
					withDirectives(createElementVNode("div", {
						class: "wy-field-tools",
						role: "toolbar",
						"aria-label": unref(t)("field.tools"),
						onMousedown: _cache[3] || (_cache[3] = withModifiers(() => {}, ["prevent"]))
					}, [
						unref(editor) ? (openBlock(), createBlock(MarkButtons_default, {
							key: 0,
							editor: unref(editor),
							tick: tick.value,
							small: ""
						}, null, 8, ["editor", "tick"])) : createCommentVNode("", true),
						unref(editor) && (unref(config).base.color || unref(config).base.highlight) ? (openBlock(), createBlock(ColorTool_default, {
							key: 1,
							editor: unref(editor),
							tick: tick.value,
							small: ""
						}, null, 8, ["editor", "tick"])) : createCommentVNode("", true),
						unref(config).base.links ? withDirectives((openBlock(), createElementBlock("button", {
							key: 2,
							type: "button",
							class: "wy-tool is-sm",
							"aria-label": unref(t)("toolbar.link"),
							"aria-pressed": linkActive.value,
							onClick: openLink
						}, [createVNode(unref(Link$1), { size: 15 })], 8, _hoisted_4)), [[unref(vTooltip), {
							text: unref(t)("toolbar.link"),
							keys: "Mod-k"
						}]]) : createCommentVNode("", true),
						unref(config).base.math ? withDirectives((openBlock(), createElementBlock("button", {
							key: 3,
							type: "button",
							class: "wy-tool is-sm",
							"aria-label": unref(t)("slash.items.mathInline.label"),
							onClick: toMath
						}, [createVNode(unref(SquareFunction), { size: 15 })], 8, _hoisted_5)), [[unref(vTooltip), unref(t)("slash.items.mathInline.label")]]) : createCommentVNode("", true),
						__props.expandable && !unref(isInline) && !unref(shared) ? withDirectives((openBlock(), createElementBlock("button", {
							key: 4,
							type: "button",
							class: "wy-tool is-sm",
							"aria-label": unref(t)("field.expand"),
							onClick: _cache[2] || (_cache[2] = ($event) => expanded.value = true)
						}, [createVNode(unref(Maximize2), { size: 15 })], 8, _hoisted_6)), [[unref(vTooltip), unref(t)("field.expand")]]) : createCommentVNode("", true)
					], 40, _hoisted_3), [[vShow, focused.value && !__props.readonly && __props.toolbar !== "floating"]]),
					unref(editor) && __props.toolbar !== "fixed" && (!__props.readonly || unref(readonlyBubble)) ? (openBlock(), createBlock(FloatingToolbar_default, {
						key: 0,
						ref_key: "floatingBar",
						ref: floatingBar,
						editor: unref(editor),
						tick: tick.value,
						readonly: __props.readonly,
						full: false,
						onLink: openLink
					}, null, 8, [
						"editor",
						"tick",
						"readonly"
					])) : createCommentVNode("", true),
					unref(editor) && unref(config).base.links ? (openBlock(), createBlock(LinkHoverCard_default, {
						key: 1,
						editor: unref(editor),
						tick: tick.value,
						readonly: __props.readonly,
						focused: focused.value,
						onEdit: openLink
					}, null, 8, [
						"editor",
						"tick",
						"readonly",
						"focused"
					])) : createCommentVNode("", true),
					activeDraft.value ? (openBlock(), createBlock(SaveStatus_default, {
						key: 2,
						class: "wy-field-status",
						status: draftStatus.value,
						dot: ""
					}, null, 8, ["status"])) : createCommentVNode("", true),
					!unref(isInline) && !unref(shared) ? (openBlock(), createBlock(Modal_default, {
						key: 3,
						open: expanded.value,
						size: "lg",
						title: __props.expandTitle ?? unref(t)("field.expandTitle"),
						"close-label": unref(t)("field.close"),
						onClose: _cache[4] || (_cache[4] = ($event) => expanded.value = false)
					}, {
						default: withCtx(() => [expanded.value ? (openBlock(), createBlock(_component_WysiwygEditor, {
							key: 0,
							"model-value": __props.modelValue,
							format: __props.format,
							size: "full",
							extensions: unref(extensions),
							base: unref(base),
							services: unref(services),
							locale: unref(locale),
							messages: unref(overrides),
							draft: activeDraft.value,
							"trailing-newline": unref(trailing),
							placeholder: __props.placeholder,
							toolbar: __props.toolbar,
							autofocus: "end",
							"onUpdate:modelValue": onExpandedInput
						}, null, 8, [
							"model-value",
							"format",
							"extensions",
							"base",
							"services",
							"locale",
							"messages",
							"draft",
							"trailing-newline",
							"placeholder",
							"toolbar"
						])) : createCommentVNode("", true)]),
						_: 1
					}, 8, [
						"open",
						"title",
						"close-label"
					])) : createCommentVNode("", true)
				], 64)),
				createVNode(LinkDialog_default, {
					open: linkOpen.value,
					href: linkInitial.value.href,
					text: linkInitial.value.text,
					"has-link": linkInitial.value.hasLink,
					onClose: _cache[5] || (_cache[5] = ($event) => linkOpen.value = false),
					onApply: onApplyLink,
					onRemove: onRemoveLink
				}, null, 8, [
					"open",
					"href",
					"text",
					"has-link"
				]),
				createVNode(ImageLightbox_default, {
					image: zoomed.value,
					"close-label": unref(t)("dialog.close"),
					onClose: _cache[6] || (_cache[6] = ($event) => zoomed.value = null)
				}, null, 8, ["image", "close-label"])
			], 38);
		};
	}
});
// src/blocks/useFenceSync.ts
function useFenceSync(source, emit, reload) {
	const read = () => {
		const v = toValue(source);
		return [v.attrs, v.body];
	};
	const [attrs0, body0] = read();
	let last = {
		attrs: attrs0,
		body: body0
	};
	const isLast = (attrs, body) => {
		const keys = Object.keys(attrs);
		return body === last.body && keys.length === Object.keys(last.attrs).length && keys.every((k) => attrs[k] === last.attrs[k]);
	};
	watch(read, ([attrs, body]) => {
		if (isLast(attrs, body)) return;
		last = {
			attrs,
			body
		};
		reload(attrs, body);
	});
	return function publish(attrs, body) {
		if (isLast(attrs, body)) return;
		last = {
			attrs,
			body
		};
		emit(attrs, body);
	};
}
function moveItem(list, i, d) {
	const j = i + d;
	if (j < 0 || j >= list.length) return;
	[list[i], list[j]] = [list[j], list[i]];
}
// src/extension.ts
function defineEditorExtension(extension) {
	return extension;
}
function readAttrs(dom) {
	let v;
	try {
		v = JSON.parse(dom.getAttribute("data-attrs") || "{}");
	} catch {
		return {};
	}
	if (!v || typeof v !== "object" || Array.isArray(v)) return {};
	const valid = (e) => /^[^\s"=`]+$/.test(e[0]) && typeof e[1] === "string" && !/[\r\n]/.test(e[1]);
	return Object.fromEntries(Object.entries(v).filter(valid));
}
/** never `draggable` (the gutter grip drags blocks), so the caret can enter inputs of its node view. */
function fenceAtom(name, kind) {
	return Node$1.create({
		name,
		group: "block",
		atom: true,
		draggable: false,
		selectable: true,
		addAttributes() {
			return {
				attrs: {
					default: {},
					parseHTML: readAttrs,
					renderHTML: (a) => ({ "data-attrs": JSON.stringify(a.attrs ?? {}) })
				},
				body: {
					default: "",
					parseHTML: (dom) => dom.getAttribute("data-body") ?? "",
					renderHTML: (a) => ({ "data-body": a.body ?? "" })
				}
			};
		},
		parseHTML() {
			return [{ tag: `div[data-fence="${kind}"]` }];
		},
		renderHTML({ HTMLAttributes }) {
			return [
				"div",
				mergeAttributes({ "data-fence": kind }, HTMLAttributes),
				kind
			];
		}
	});
}
/** parse and serialize keep fence attributes and body byte for byte. */
function defineFenceBlock(options) {
	const name = options.node ?? `${options.kind}Block`;
	const slash = options.slash;
	return {
		name,
		formats: options.formats,
		tiptap: [fenceAtom(name, options.kind)],
		nodeViews: options.view ? { [name]: options.view } : void 0,
		markdown: { fences: [{
			kind: options.kind,
			node: name,
			match: options.match,
			ensureId: options.ensureId
		}] },
		slash: slash ? [{
			...slash,
			id: slash.id ?? options.kind,
			label: slash.label,
			run: (ctx) => ctx.insert(name, {
				attrs: {
					...options.ensureId ? { id: newBlockId() } : {},
					...slash.attrs ?? {}
				},
				body: slash.body ?? ""
			})
		}] : void 0,
		convert: options.convert,
		messages: options.messages
	};
}
// src/draft/useDraft.ts
function time(v) {
	if (v === null || v === void 0 || v === "") return null;
	const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : new Date(v).getTime();
	return Number.isFinite(n) ? n : null;
}
function useDraft(adapter, opts) {
	const status = ref("none");
	const canUndo = ref(false);
	const canRedo = ref(false);
	const restored = ref(false);
	const delay = opts.delay ?? 500;
	const scope = computed(() => unref(opts.scope));
	let timer = null;
	let lastSent = "";
	let suppressNext = false;
	let inflight = null;
	let ready = false;
	let gen = 0;
	let exists = false;
	let cursor = -1;
	const known = /* @__PURE__ */ new Map();
	let source = null;
	const editorPending = ref(false);
	const shown = computed(() => editorPending.value && status.value === "saved" ? "idle" : status.value);
	const snapshot = () => JSON.stringify([
		opts.content.value,
		opts.title?.value ?? "",
		opts.summary?.value ?? ""
	]);
	function applyCursor(s) {
		if (!s || s.cursor === void 0) return;
		cursor = s.cursor;
		canUndo.value = !!s.canUndo && !!adapter.undo;
		canRedo.value = !!s.canRedo && !!adapter.redo;
	}
	function forget() {
		exists = false;
		cursor = -1;
		known.clear();
		canUndo.value = false;
		canRedo.value = false;
		restored.value = false;
	}
	function cancelTimer() {
		clearTimeout(timer ?? void 0);
		timer = null;
	}
	function pull() {
		const before = opts.content.value;
		source?.();
		const changed = opts.content.value !== before;
		if (changed && ready) suppressNext = true;
		return changed;
	}
	function failed(e) {
		const offline = adapter.isOffline ? adapter.isOffline(e) : typeof navigator !== "undefined" && !navigator.onLine;
		status.value = offline || typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error";
	}
	async function push() {
		const s = scope.value;
		if (!s) return;
		pull();
		const sent = snapshot();
		if (sent === lastSent) {
			if (status.value !== "offline" && status.value !== "error") status.value = "saved";
			return;
		}
		const g = gen;
		if (!opts.content.value.trim() && !opts.title?.value.trim() && !opts.summary?.value.trim()) {
			if (!exists) {
				lastSent = sent;
				status.value = "saved";
				return;
			}
			status.value = "saving";
			try {
				await adapter.remove(s);
				if (g !== gen) return;
				forget();
				lastSent = sent;
				status.value = "saved";
			} catch (e) {
				if (g === gen) failed(e);
			}
			return;
		}
		status.value = "saving";
		const content = opts.content.value;
		try {
			const state = await adapter.save(s, {
				content,
				title: opts.title?.value,
				summary: opts.summary?.value,
				baseRevision: opts.baseRevision?.value ?? null
			});
			if (g !== gen) return;
			exists = true;
			lastSent = sent;
			if (state) {
				for (const k of known.keys()) if (k >= state.cursor) known.delete(k);
				known.set(state.cursor, content);
				applyCursor(state);
			}
			status.value = sent === snapshot() ? "saved" : "idle";
		} catch (e) {
			if (g === gen) failed(e);
		}
	}
	function queue() {
		if (status.value !== "offline" || typeof navigator === "undefined" || navigator.onLine) status.value = "idle";
		cancelTimer();
		timer = setTimeout(() => {
			timer = null;
			inflight = push().finally(() => inflight = null);
		}, delay);
	}
	function schedule() {
		if (!scope.value || !ready) return;
		if (suppressNext) {
			suppressNext = false;
			return;
		}
		queue();
	}
	async function flush() {
		cancelTimer();
		if (inflight) await inflight;
		await push();
	}
	async function shouldRestore(d) {
		if (opts.onRestore) return opts.onRestore(d);
		const after = time(unref(opts.newerThan));
		const at = time(d.updatedAt);
		return after === null || at === null || at > after;
	}
	async function load() {
		const s = scope.value;
		if (!s) {
			status.value = "none";
			return null;
		}
		ready = true;
		const before = snapshot();
		try {
			const draft = await adapter.load(s);
			if (scope.value !== s) return null;
			if (!draft) {
				exists = false;
				lastSent = before;
				status.value = "saved";
				if (snapshot() !== before) queue();
				return null;
			}
			exists = true;
			known.clear();
			if (draft.cursor !== void 0) known.set(draft.cursor, draft.content);
			applyCursor(draft);
			if ((draft.content !== opts.content.value || opts.title && draft.title !== void 0 && draft.title !== opts.title.value || opts.summary && draft.summary !== void 0 && draft.summary !== opts.summary.value) && await shouldRestore(draft)) {
				if (scope.value !== s) return null;
				suppressNext = true;
				opts.content.value = draft.content;
				if (opts.baseRevision && draft.baseRevision !== null && draft.baseRevision !== void 0) opts.baseRevision.value = draft.baseRevision;
				if (opts.title && draft.title !== void 0) opts.title.value = draft.title;
				if (opts.summary && draft.summary !== void 0) opts.summary.value = draft.summary;
				lastSent = snapshot();
				restored.value = true;
			} else lastSent = draft.content === opts.content.value ? JSON.stringify([
				draft.content,
				draft.title ?? "",
				draft.summary ?? ""
			]) : "";
			status.value = "saved";
			return draft;
		} catch (e) {
			if (scope.value === s) failed(e);
			return null;
		}
	}
	async function request(dir) {
		const s = scope.value;
		const fn = dir === "undo" ? adapter.undo : adapter.redo;
		if (!s || !fn) return null;
		const g = gen;
		try {
			const res = await fn.call(adapter, s);
			if (!res || scope.value !== s || g !== gen) return null;
			applyCursor(res);
			known.set(res.cursor, res.content);
			return res;
		} catch {
			return null;
		}
	}
	async function step(dir) {
		if (!scope.value) return null;
		await flush();
		if (dir === "undo" ? !canUndo.value : !canRedo.value) return null;
		const res = await request(dir);
		if (!res) return null;
		if (res.content !== opts.content.value) suppressNext = true;
		opts.content.value = res.content;
		lastSent = snapshot();
		status.value = "saved";
		return res.content;
	}
	async function historyStep(content) {
		const s = scope.value;
		if (!ready || !s) return;
		if (opts.content.value !== content) suppressNext = true;
		cancelTimer();
		if (inflight) await inflight;
		if (scope.value !== s) return;
		const dir = adapter.undo && known.get(cursor - 1) === content ? "undo" : adapter.redo && known.get(cursor + 1) === content ? "redo" : null;
		if (!dir) {
			queue();
			return;
		}
		status.value = "saving";
		const res = await request(dir);
		if (!res) {
			queue();
			return;
		}
		lastSent = JSON.stringify([
			res.content,
			opts.title?.value ?? "",
			opts.summary?.value ?? ""
		]);
		if (snapshot() !== lastSent) queue();
		else if (!timer) status.value = "saved";
	}
	async function discard() {
		cancelTimer();
		const s = scope.value;
		if (!s) return;
		if (inflight) await inflight;
		gen++;
		try {
			await adapter.remove(s);
		} catch {}
		if (scope.value !== s) return;
		forget();
		lastSent = snapshot();
		status.value = "saved";
	}
	function reset(content) {
		cancelTimer();
		const s = scope.value;
		const pending = inflight;
		gen++;
		if (pending && s) pending.then(() => adapter.remove(s)).catch(() => void 0);
		if (opts.content.value !== content && s && ready) suppressNext = true;
		opts.content.value = content;
		forget();
		lastSent = snapshot();
		status.value = s ? "saved" : "none";
	}
	function attach(flushEditor) {
		source = flushEditor;
		return () => {
			if (source !== flushEditor) return;
			source = null;
			editorPending.value = false;
		};
	}
	watch(opts.content, schedule);
	if (opts.title) watch(opts.title, schedule);
	if (opts.summary) watch(opts.summary, schedule);
	watch(scope, (s, old) => {
		if (old !== void 0) {
			cancelTimer();
			gen++;
			ready = false;
			suppressNext = false;
			lastSent = "";
			forget();
		}
		status.value = s ? "saved" : "none";
	}, { immediate: true });
	function onOffline() {
		if (scope.value) status.value = "offline";
	}
	function onOnline() {
		if (scope.value && ready && (status.value === "offline" || status.value === "error")) queue();
	}
	if (typeof window !== "undefined") {
		window.addEventListener("offline", onOffline);
		window.addEventListener("online", onOnline);
	}
	if (getCurrentScope()) onScopeDispose(() => {
		if (typeof window !== "undefined") {
			window.removeEventListener("offline", onOffline);
			window.removeEventListener("online", onOnline);
		}
		if (pull() && ready || timer) {
			cancelTimer();
			push();
		}
	});
	return {
		status: shown,
		canUndo,
		canRedo,
		restored,
		flush,
		undo: () => step("undo"),
		redo: () => step("redo"),
		historyStep,
		discard,
		load,
		reset,
		attach,
		pending: (on) => void (editorPending.value = on)
	};
}
// src/editor/carets.ts
/** up to two letters: first and last word of the name */
function initials(name) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	return (([...words[0] ?? ""][0] ?? "") + (words.length > 1 ? [...words[words.length - 1]][0] ?? "" : "")).toUpperCase();
}
function badge(name) {
	const el = document.createElement("span");
	el.className = "collaboration-carets__initials";
	el.setAttribute("aria-hidden", "true");
	el.textContent = initials(name);
	return el;
}
function collaborationCaret(user) {
	const caret = document.createElement("span");
	caret.className = "collaboration-carets__caret";
	caret.style.borderColor = user.color;
	const label = document.createElement("div");
	label.className = "collaboration-carets__label";
	label.style.backgroundColor = user.color;
	if (user.avatar) {
		const img = document.createElement("img");
		img.className = "collaboration-carets__avatar";
		img.alt = "";
		img.referrerPolicy = "no-referrer";
		img.addEventListener("error", () => img.replaceWith(badge(user.name)), { once: true });
		img.src = user.avatar;
		label.append(img);
	}
	label.append(document.createTextNode(user.name));
	caret.append(label);
	return caret;
}
// src/convert.ts
var registries = /* @__PURE__ */ new WeakMap();
function registry(options) {
	const config = resolveConfig(options.format ?? "markdown", options.base, options.extensions);
	let reg = registries.get(config);
	if (!reg) registries.set(config, reg = convertRegistry(config, markdownFor(config)));
	return reg;
}
function convertTargets(blocks, options = {}) {
	if (!blocks.length) return [];
	return convertTargets$1(registry(options), blocks, blocks[0].type.schema).map((t) => t.id);
}
function convertBlocks(blocks, target, options = {}) {
	if (!blocks.length) return null;
	return convertBlocks$1(registry(options), blocks, target, blocks[0].type.schema);
}
// src/index.ts
function markdownToHtml(md, extensions, base) {
	return createMarkdown(extensions, { base }).toHtml(md);
}
export { AnchoredPopover_default as AnchoredPopover, BLOCK_EDIT_EVENT, BlockFrame_default as BlockFrame, BlockMenu_default as BlockMenu, CODE_LANGUAGES, EMBED_PROVIDERS, HTML_CALLOUTS, MARKDOWN_CALLOUTS, MESSAGES, PALETTE, PageSearch_default as PageSearch, SaveStatus_default as SaveStatus, SuggestionList_default as SuggestionList, WysiwygEditor_default as WysiwygEditor, blockBody, blockStopEvent, cleanPastedHtml, clipboardText, collaborationCaret, contextOf, convertBlocks, convertTargets, createMarkdown, createWysiwyg, defineEditorExtension, defineFenceBlock, embedFor, escapeHtml, fenceAtom, fenceClose, fenceFor, fenceOpen, formatBytes, formatInfo, highlightCode, insertFresh, isBgToken, isColorToken, isImageSrc, isInCell, isTextToken, joinSections, looksLikeMarkdown, markFresh, markdownToHtml, mediaKind, mentionMarkdown, moveItem, newBlockId, normalizeHref, parseInfo, parseMentionTarget, pasteAsMarkdown, registerCodeLanguage, renderMath, splitSections, takeFresh, tokenCss, useBlockNode, useDraft, useEditorContext, useEditorHandle, useFenceSync, vTooltip };
