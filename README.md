# Meticulous Force Profile Designer

A Vue 3 + Vite application for sketching power profiles for the Meticulous espresso machine platform. The editor lets you draw piston position vs. force curves, then exports the resulting stages as JSON that you can load onto your machine.

## Features
- Interactive canvas for shaping piston position vs. force curves.
- Adjustable interpolation count with live preview of generated stages.
- Numeric editor for precise point tuning.
- Global pressure limit control applied to every generated stage.
- JSON export with generated UUID identifiers and profile metadata.

## Prerequisites
- [Node.js](https://nodejs.org/) 18 or later
- npm (bundled with Node.js)

## Getting Started
Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Visit the printed local URL (typically <http://localhost:5173/>) to interact with the curve editor.

### Building for Production
Create an optimized production bundle:

```bash
npm run build
```

The compiled site is written to the `dist/` directory and can be deployed to any static host such as GitHub Pages.

## GitHub Pages Deployment
This repository ships with a GitHub Actions workflow that builds the Vite application and deploys it to GitHub Pages whenever commits land on `main`.

1. Enable **GitHub Pages** in the repository settings and choose the "GitHub Actions" source.
2. Push to `main` (or merge a pull request). The workflow will:
   - Install Node dependencies.
   - Run `npm run build` to produce the static site.
   - Upload the `dist/` folder as a Pages artifact and publish it.
3. The published site URL is reported in the workflow summary and appears in the repository settings.

## Contributing
1. Fork the repository and create a feature branch.
2. Run the development server locally to verify changes.
3. Submit a pull request describing your changes. Attach screenshots for UI updates when possible.

## License
Distributed under the [MIT License](./LICENSE).
