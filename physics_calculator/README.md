# Physics Calculator

Advanced Physics Calculator built with Next.js, featuring 21 chapters and 205 formulas with multi-directional solving capability.

## Features

- **21 Chapters** — Kinematics, Newtonian Mechanics, Thermodynamics, Electrostatics, Waves, Modern Physics, and more
- **205 Formulas** — Complete variable definitions, units, and constraints
- **Multi-directional Solving** — Solve for ANY variable in a formula
- **Scientific Calculator Popup** — Input scientific notation (e.g., `6.674e-11`) with EXP button and 10 physics constants (G, c, h, k_B, e, m_e, m_p, N_A, R, g)
- **Memory System** — Save results and reuse across formulas
- **Calculation History** — Tracks your last 50 calculations
- **Favorites** — Bookmark frequently used formulas
- **KaTeX Rendering** — Beautiful mathematical notation
- **Constraint Checking** — Validates physical constraints
- **Responsive Design** — Mobile, tablet, and desktop

## Prerequisites

- **Bun** 1.0+ (recommended) — [Install Bun](https://bun.sh/)
- **OR Node.js** 18+ with npm

## Quick Start (with Bun)

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Quick Start (with npm)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Build

```bash
# With Bun
bun run build
bun start

# With npm
npm run build
npm start
```

## GitHub Codespaces

This project includes a `.devcontainer` configuration for GitHub Codespaces with Bun pre-installed.

1. Open the repo in Codespaces
2. The container will auto-install dependencies via `postCreateCommand`
3. The dev server will auto-start via `postStartCommand`
4. Port 3000 is automatically forwarded

## How to Use

1. **Select a Chapter** — Browse the grid of 21 physics chapters
2. **Select a Formula Type** — Choose a category within the chapter
3. **Select a Formula** — Pick the specific formula to calculate
4. **Solve** — Enter known values, select "Solve For" variable, click Calculate
5. **Scientific Notation** — Click the 🔬 icon to open the Scientific Calculator popup with EXP button and physics constants

## Project Structure

```
physics_calculator/
├── .devcontainer/
│   ├── devcontainer.json          # Codespaces config with Bun
│   └── post-install.sh            # Post-create setup script
├── public/
│   └── data/                      # Physics formula database (JSON)
│       ├── chapters_index.json
│       ├── formulas_all.json
│       ├── formulas_*.json
│       ├── types_*.json
│       └── variables_global.json
├── src/
│   ├── app/
│   │   ├── globals.css            # Global styles + Tailwind
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Main page (all views)
│   │   └── katex.d.ts             # KaTeX type declarations
│   ├── components/
│   │   └── physics/
│   │       └── ScientificCalculator.tsx
│   ├── store/
│   │   └── useStore.ts            # Zustand state management
│   └── utils/
│       └── formulaEngine.ts       # Formula evaluation engine
├── bunfig.toml                    # Bun configuration
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── README.md
```

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 | React framework with App Router |
| React | 19 | UI components |
| TypeScript | 5.8 | Type safety |
| Tailwind CSS | 4 | Styling |
| Bun | latest | Runtime & package manager |
| Zustand | 5 | State management with localStorage |
| math.js | 14 | Formula evaluation & scientific notation |
| KaTeX | 0.16 | Mathematical formula rendering |

## Troubleshooting

- **Port 3000 in use**: `bun run dev -- -p 3001`
- **Build errors**: Delete `node_modules` and run `bun install` again
- **Formulas not loading**: Ensure `public/data/` contains all JSON files
