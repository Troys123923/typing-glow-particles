"use strict";

const {
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting
} = require("obsidian");

const DEFAULT_SETTINGS = {
  enabled: true,
  particleCount: 14,
  particleSize: 1.1,
  spread: 22,
  duration: 620,
  colorMode: "aurora",
  customColor: "#8ffcff",
  glowStrength: 1,
  triggerOnEnter: true,
  triggerOnDelete: false,
  respectReducedMotion: true
};

const COLOR_PRESETS = {
  aurora: ["#8ffcff", "#b99cff", "#ffd56f", "#fff8c7"],
  cyan: ["#7df9ff", "#a8fff3", "#e8ffff"],
  warm: ["#ffd36b", "#ff9f7a", "#fff1b8"],
  violet: ["#c9a7ff", "#86d7ff", "#ffe7ff"]
};

const TEXT_INPUT_TYPES = new Set([
  "insertText",
  "insertCompositionText",
  "insertFromComposition"
]);

class TypingGlowParticlesPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.layer = new ParticleLayer(this);
    this.lastEmitAt = 0;

    this.addRibbonIcon("sparkles", "Toggle Typing Glow Particles", () => {
      this.settings.enabled = !this.settings.enabled;
      this.saveSettings();
      new Notice(this.settings.enabled ? "Typing particles enabled" : "Typing particles disabled");
    });

    this.addCommand({
      id: "toggle-typing-glow-particles",
      name: "Toggle typing glow particles",
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new Notice(this.settings.enabled ? "Typing particles enabled" : "Typing particles disabled");
      }
    });

    this.addCommand({
      id: "preview-typing-glow-particles",
      name: "Preview typing glow particles at cursor",
      editorCallback: (editor) => {
        const point = getCaretPoint(editor, document.activeElement);
        if (point) {
          this.layer.burst(point.x, point.y, this.settings, 2.2);
        }
      }
    });

    this.registerDomEvent(document, "input", (event) => this.handleInput(event), true);
    this.registerDomEvent(window, "blur", () => this.layer.clear());
    this.addSettingTab(new TypingGlowParticlesSettingTab(this.app, this));
  }

  onunload() {
    this.layer.destroy();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  handleInput(event) {
    if (!this.settings.enabled || this.shouldRespectReducedMotion()) {
      return;
    }

    const inputType = event.inputType || "";
    const isTextInput = TEXT_INPUT_TYPES.has(inputType);
    const isEnter = this.settings.triggerOnEnter && inputType === "insertParagraph";
    const isDelete = this.settings.triggerOnDelete && inputType.startsWith("delete");

    if (!isTextInput && !isEnter && !isDelete) {
      return;
    }

    if (isTextInput && event.data && event.data.length > 8) {
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !this.isEditorTarget(event.target, view)) {
      return;
    }

    const now = performance.now();
    if (now - this.lastEmitAt < 14) {
      return;
    }
    this.lastEmitAt = now;

    requestAnimationFrame(() => {
      const point = getCaretPoint(view.editor, event.target);
      if (point) {
        this.layer.burst(point.x, point.y, this.settings, isEnter ? 1.35 : 1);
      }
    });
  }

  shouldRespectReducedMotion() {
    return this.settings.respectReducedMotion
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  isEditorTarget(target, view) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const editorRoot = target.closest(".cm-editor, .CodeMirror, .markdown-source-view");
    if (!editorRoot) {
      return false;
    }

    if (!view.containerEl.contains(target)) {
      return false;
    }

    const editableControl = target.closest("input, textarea, select");
    return !editableControl || Boolean(editableControl.closest(".cm-editor, .CodeMirror"));
  }
}

class ParticleLayer {
  constructor(plugin) {
    this.plugin = plugin;
    this.particles = [];
    this.frame = 0;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "typing-glow-particles-canvas";
    this.ctx = this.canvas.getContext("2d");
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);

    document.body.appendChild(this.canvas);
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("scroll", this.resize, true);
  }

  resize() {
    const dpr = getDevicePixelRatio();
    const width = Math.ceil(window.innerWidth * dpr);
    const height = Math.ceil(window.innerHeight * dpr);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  burst(x, y, settings, multiplier) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const colors = getColors(settings);
    const count = Math.max(1, Math.round(settings.particleCount * multiplier));
    const microCount = Math.max(2, Math.round(count * 0.45));
    const originX = clamp(x, 0, window.innerWidth);
    const originY = clamp(y, 0, window.innerHeight);

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(0.18, 0.95) * (settings.spread / 22);
      const size = randomBetween(0.45, settings.particleSize * 1.35);
      const life = randomBetween(settings.duration * 0.62, settings.duration * 1.08);

      this.particles.push({
        x: originX + randomBetween(-3.5, 3.5),
        y: originY + randomBetween(-2, 2),
        vx: Math.cos(angle) * speed + randomBetween(-0.08, 0.08),
        vy: Math.sin(angle) * speed - randomBetween(0.02, 0.26),
        size,
        life,
        maxLife: life,
        color: colors[i % colors.length],
        twinkle: randomBetween(0.55, 1),
        spin: randomBetween(-0.06, 0.06)
      });
    }

    for (let i = 0; i < microCount; i += 1) {
      const angle = randomBetween(-Math.PI * 0.92, Math.PI * 0.12);
      const speed = randomBetween(0.12, 0.54) * (settings.spread / 22);
      const life = randomBetween(settings.duration * 0.35, settings.duration * 0.7);

      this.particles.push({
        x: originX + randomBetween(-2, 2),
        y: originY + randomBetween(-1.5, 1.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(0.03, 0.18),
        size: randomBetween(0.28, Math.max(0.5, settings.particleSize * 0.75)),
        life,
        maxLife: life,
        color: colors[(i + 1) % colors.length],
        twinkle: randomBetween(0.65, 1),
        spin: randomBetween(-0.08, 0.08)
      });
    }

    if (!this.frame) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  tick() {
    this.frame = 0;
    const ctx = this.ctx;
    const settings = this.plugin.settings;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (this.particles.length === 0) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const nextParticles = [];
    for (const particle of this.particles) {
      particle.life -= 16.67;
      if (particle.life <= 0) {
        continue;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.982;
      particle.vy = particle.vy * 0.982 + 0.006;
      particle.spin += 0.018;

      const progress = 1 - particle.life / particle.maxLife;
      const fade = Math.pow(1 - progress, 1.65);
      const pulse = 0.74 + Math.sin((progress * 10 + particle.twinkle) * Math.PI) * 0.12;
      const alpha = clamp(fade * pulse * settings.glowStrength, 0, 1);
      const radius = particle.size * (1 + progress * 0.28);
      const glowRadius = radius * randomStableGlow(particle.twinkle, settings.glowStrength);

      drawGlow(ctx, particle.x, particle.y, radius, glowRadius, particle.color, alpha);
      nextParticles.push(particle);
    }

    ctx.restore();
    this.particles = nextParticles;

    if (this.particles.length > 0) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  destroy() {
    this.clear();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("scroll", this.resize, true);
    this.canvas.remove();
  }
}

class TypingGlowParticlesSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Typing Glow Particles" });

    new Setting(containerEl)
      .setName("Enable particles")
      .setDesc("Emit tiny glowing particles near the cursor while typing.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Particle count")
      .setDesc("How many particles are emitted per typing event.")
      .addSlider((slider) => slider
        .setLimits(4, 30, 1)
        .setValue(this.plugin.settings.particleCount)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.particleCount = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Particle size")
      .setDesc("Lower values create finer, more delicate particles.")
      .addSlider((slider) => slider
        .setLimits(0.4, 2.4, 0.1)
        .setValue(this.plugin.settings.particleSize)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.particleSize = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Spread")
      .setDesc("Controls how far particles drift away from the cursor.")
      .addSlider((slider) => slider
        .setLimits(8, 42, 1)
        .setValue(this.plugin.settings.spread)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.spread = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Duration")
      .setDesc("How long particles take to fade out, in milliseconds.")
      .addSlider((slider) => slider
        .setLimits(260, 1200, 20)
        .setValue(this.plugin.settings.duration)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.duration = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Glow strength")
      .setDesc("Controls the brightness of the particle glow.")
      .addSlider((slider) => slider
        .setLimits(0.4, 1.8, 0.1)
        .setValue(this.plugin.settings.glowStrength)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.glowStrength = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Color style")
      .setDesc("Choose the particle color palette.")
      .addDropdown((dropdown) => dropdown
        .addOption("aurora", "Aurora")
        .addOption("cyan", "Cyan glow")
        .addOption("warm", "Warm sparks")
        .addOption("violet", "Violet dust")
        .addOption("custom", "Custom color")
        .setValue(this.plugin.settings.colorMode)
        .onChange(async (value) => {
          this.plugin.settings.colorMode = value;
          await this.plugin.saveSettings();
          this.display();
        }));

    if (this.plugin.settings.colorMode === "custom") {
      new Setting(containerEl)
        .setName("Custom color")
        .setDesc("Enter a hex color, for example #8ffcff.")
        .addText((text) => text
          .setPlaceholder("#8ffcff")
          .setValue(this.plugin.settings.customColor)
          .onChange(async (value) => {
            this.plugin.settings.customColor = normalizeColor(value, "#8ffcff");
            await this.plugin.saveSettings();
          }));
    }

    new Setting(containerEl)
      .setName("Trigger on Enter")
      .setDesc("Emit a lighter burst when pressing Enter.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.triggerOnEnter)
        .onChange(async (value) => {
          this.plugin.settings.triggerOnEnter = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Trigger on Delete")
      .setDesc("Emit particles when deleting text. Disabled by default so the effect feels tied to typing.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.triggerOnDelete)
        .onChange(async (value) => {
          this.plugin.settings.triggerOnDelete = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Respect reduced motion")
      .setDesc("Disable particle animation when the system reduced motion preference is enabled.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.respectReducedMotion)
        .onChange(async (value) => {
          this.plugin.settings.respectReducedMotion = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Preview")
      .setDesc("Emit a sample burst at the current cursor position.")
      .addButton((button) => button
        .setButtonText("Preview")
        .onClick(() => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          const point = view ? getCaretPoint(view.editor, document.activeElement) : null;
          if (point) {
            this.plugin.layer.burst(point.x, point.y, this.plugin.settings, 2);
          } else {
            new Notice("Place the cursor in a Markdown note first.");
          }
        }));
  }
}

function getCaretPoint(editor, target) {
  const cursor = safely(() => editor.getCursor());
  const fromEditor = cursor ? getPointFromEditorCoords(editor, cursor) : null;
  if (fromEditor) {
    return fromEditor;
  }

  const fromSelection = getPointFromSelection();
  if (fromSelection) {
    return fromSelection;
  }

  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    if (isUsableRect(rect)) {
      return {
        x: rect.left + Math.min(rect.width, 18),
        y: rect.top + rect.height / 2
      };
    }
  }

  return null;
}

function getPointFromEditorCoords(editor, cursor) {
  const direct = safely(() => typeof editor.coordsAtPos === "function"
    ? editor.coordsAtPos(cursor)
    : null);
  const point = pointFromRect(direct);
  if (point) {
    return point;
  }

  const cm = editor.cm;
  const offset = safely(() => typeof editor.posToOffset === "function"
    ? editor.posToOffset(cursor)
    : null);

  const cm6 = safely(() => cm && typeof cm.coordsAtPos === "function" && offset !== null
    ? cm.coordsAtPos(offset)
    : null);
  const cm6Point = pointFromRect(cm6);
  if (cm6Point) {
    return cm6Point;
  }

  const cm5 = safely(() => cm && typeof cm.cursorCoords === "function"
    ? cm.cursorCoords(cursor, "window")
    : null);
  return pointFromRect(cm5);
}

function getPointFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);
  return pointFromRect(range.getBoundingClientRect());
}

function pointFromRect(rect) {
  if (!isUsableRect(rect)) {
    return null;
  }

  const left = Number.isFinite(rect.right) ? rect.right : rect.left;
  const top = Number.isFinite(rect.top) ? rect.top : rect.y;
  const bottom = Number.isFinite(rect.bottom) ? rect.bottom : top + rect.height;

  return {
    x: clamp(left, 0, window.innerWidth),
    y: clamp((top + bottom) / 2, 0, window.innerHeight)
  };
}

function isUsableRect(rect) {
  const bottom = rect && Number.isFinite(rect.bottom) ? rect.bottom : null;
  return rect
    && Number.isFinite(rect.left)
    && Number.isFinite(rect.top)
    && bottom !== null
    && Math.abs(bottom - rect.top) > 0.1
    && Math.abs(rect.left) < 100000
    && Math.abs(rect.top) < 100000;
}

function drawGlow(ctx, x, y, radius, glowRadius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  gradient.addColorStop(0, hexToRgba(color, alpha));
  gradient.addColorStop(0.34, hexToRgba(color, alpha * 0.42));
  gradient.addColorStop(1, hexToRgba(color, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hexToRgba("#ffffff", Math.min(0.92, alpha * 0.88));
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.22, radius * 0.52), 0, Math.PI * 2);
  ctx.fill();
}

function getColors(settings) {
  if (settings.colorMode === "custom") {
    return [normalizeColor(settings.customColor, DEFAULT_SETTINGS.customColor)];
  }
  return COLOR_PRESETS[settings.colorMode] || COLOR_PRESETS.aurora;
}

function normalizeColor(value, fallback) {
  const trimmed = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback;
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeColor(hex, "#ffffff").slice(1);
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

function randomStableGlow(seed, strength) {
  return (4.5 + seed * 4.2) * Math.max(0.65, strength);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDevicePixelRatio() {
  return Math.min(2, Math.max(1, window.devicePixelRatio || 1));
}

function safely(fn) {
  try {
    return fn();
  } catch (error) {
    return null;
  }
}

module.exports = TypingGlowParticlesPlugin;
