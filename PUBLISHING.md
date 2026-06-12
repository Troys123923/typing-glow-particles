# Publishing to the Obsidian Community Plugin Directory

This plugin is prepared for publishing as **Typing Glow Particles**.

## Plugin Entry

When submitting to `obsidianmd/obsidian-releases`, add this object to `community-plugins.json`.

```json
{
  "id": "typing-glow-particles",
  "name": "Typing Glow Particles",
  "author": "MOBTIS",
  "description": "Adds subtle glowing particles around the cursor while you type.",
  "repo": "Troys123923/typing-glow-particles"
}
```

## Release Checklist

1. Create a public GitHub repository, for example `typing-glow-particles`.
2. Upload the plugin files to the repository:
   - `README.md`
   - `LICENSE`
   - `manifest.json`
   - `versions.json`
   - `package.json`
   - `main.js`
   - `styles.css`
3. Create a GitHub release tagged exactly like the version in `manifest.json`: `1.0.0`.
4. Attach these release assets individually:
   - `manifest.json`
   - `main.js`
   - `styles.css`
5. Fork `https://github.com/obsidianmd/obsidian-releases`.
6. Add the plugin entry above to `community-plugins.json`.
7. Open a pull request to `obsidianmd/obsidian-releases`.

Obsidian reads the plugin listing from `community-plugins.json`, then pulls `manifest.json` and `README.md` from the GitHub repository for the plugin detail page. During installation, Obsidian downloads `manifest.json`, `main.js`, and `styles.css` from the GitHub release whose tag matches the plugin version.
