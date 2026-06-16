# Deployment

Potion Pop: Brew & Bounce is a static browser game built with plain HTML, CSS, and JavaScript. It does not require a build step, package install, backend server, database, or external runtime dependency.

## Run Locally

Open `index.html` directly in a modern browser, or serve the folder with any static file server.

Example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy with GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch: `main`.
5. Select folder: `/ (root)`.
6. Save.

GitHub Pages will serve `index.html` from the repository root.

## Deployment Notes

- `.nojekyll` is included so GitHub Pages serves the static files directly.
- The game uses only local files: `index.html`, `css/styles.css`, and `js/game.js`.
- No third-party scripts, CDNs, or package dependencies are required.
- Browser best score is saved with `localStorage`; gameplay still works if storage is unavailable.
