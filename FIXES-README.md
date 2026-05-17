# Physics Calculator — phy-calc Branch Fix Report

## Issues Found & Fixes

### 🔴 CRITICAL (Codespace killer)

**1. `.devcontainer/devcontainer.json` — Invalid VS Code extension**
- **Problem**: `"ms-vscode.vscode-typescript-next"` extension is not available in the VS Code marketplace for Codespaces, causing the Codespace to fail during setup.
- **Fix**: Removed the invalid extension. Also removed `js/ts.tsdk.path` setting which references a non-standard config key.

**2. `src/lib/db.ts` — Imports `@prisma/client` which is NOT in dependencies**
- **Problem**: This file does `import { PrismaClient } from '@prisma/client'` but `@prisma/client` is not in `package.json`. When Bun/Next.js tries to compile, it crashes with `Cannot find module '@prisma/client'`.
- **Fix**: Replaced with a placeholder. The project uses static JSON files, not Prisma.

### 🟡 IMPORTANT (Build warnings/errors)

**3. `tailwind.config.ts` — Tailwind v3 config with v4 installed**
- **Problem**: The file uses `tailwindcss-animate` plugin (not in dependencies) and old v3 config patterns. But the project has `tailwindcss: "^4"` and `@tailwindcss/postcss: "^4"`. The `content` paths also miss `src/` prefix. This causes Tailwind to not pick up your classes.
- **Fix**: Simplified config. Tailwind v4 uses CSS-based `@theme` directives (already in `globals.css`), so the JS config just needs correct `content` paths and no v3 plugins.

**4. `package.json` — `mathjs` version `^15.2.0` is untested**
- **Problem**: The project was built and tested with `mathjs@^14`. Version 15 has breaking changes in some APIs.
- **Fix**: Downgraded to `mathjs@^14.0.0`.

**5. `package.json` — `@types/katex` in dependencies instead of devDependencies**
- **Problem**: Type definitions shouldn't be in production dependencies.
- **Fix**: Moved to `devDependencies`.

### 🟢 CLEANUP (Not causing crashes but should be addressed)

**6. Duplicate data directories**: Both `public/data/` and `public/physics_data/` exist with identical files. `formulaEngine.ts` loads from `/physics_data/`. You can safely delete `public/data/`.

**7. `src/store/useStore.ts` is dead code**: The app uses `physicsStore.ts` (imported as `usePhysicsStore`). `useStore.ts` is never imported anywhere and can be deleted.

**8. 40+ unused shadcn/ui components**: Only 7 components are actually imported in the app (card, button, input, badge, scroll-area, separator, tooltip, dialog). The other 40+ component files in `src/components/ui/` can be deleted to reduce bundle size.

---

## How to Apply Fixes

1. Replace these files in your repo:
   - `.devcontainer/devcontainer.json`
   - `.devcontainer/post-install.sh`
   - `package.json`
   - `tailwind.config.ts`
   - `src/lib/db.ts`

2. Delete these unused files (optional but recommended):
   - `src/store/useStore.ts`
   - `public/data/` (entire directory — duplicate of `public/physics_data/`)

3. Delete `bun.lock` (old lockfile may have wrong mathjs version)

4. Commit and push, then recreate the Codespace

5. In the Codespace terminal, run:
   ```bash
   bun install
   bun run dev
   ```
