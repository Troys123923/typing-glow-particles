# Typing Glow Particles

Typing Glow Particles is an Obsidian plugin that adds tiny glowing particles around the cursor while you type.

The default effect is intentionally small, refined, and close to the caret, so it can add a little visual delight without getting in the way of long writing sessions.

## Features

- Emits subtle glow particles near the typing cursor
- Works with regular typing and IME composition input
- Adjustable particle count, size, spread, duration, and glow strength
- Built-in color styles: aurora, cyan, warm, violet, and custom single-color mode
- Optional triggers for Enter and Delete
- Respects the system reduced motion preference

## Installation

### Community plugin directory

Once the plugin is approved in the Obsidian Community directory, install it from Obsidian:

1. Open **Settings**.
2. Go to **Community plugins**.
3. Search for **Typing Glow Particles**.
4. Install and enable the plugin.

### Manual installation

1. Copy this folder to your vault:
   `.obsidian/plugins/typing-glow-particles`
2. Restart Obsidian, or reload installed plugins.
3. Enable **Typing Glow Particles** in **Community plugins**.

## Suggested Settings

- For finer particles, set **Particle size** to `0.6` to `0.9`.
- For a smaller area, set **Spread** to `12` to `18`.
- For a brighter effect, set **Glow strength** to around `1.2`.

## Development

```bash
npm run check
```

This plugin is intentionally dependency-free and ships as a single `main.js` file plus `styles.css`.
