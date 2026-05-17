#!/bin/bash
# Post-create setup script for GitHub Codespaces - Physics Calculator
# This script is designed to be resilient - it won't cause the Codespace to stop
# even if individual steps fail.

echo "🔧 Setting up Physics Calculator development environment..."

# ---------------------------------------------------------------------------
# 1. Ensure bun is available — try multiple methods
# ---------------------------------------------------------------------------

# First, check if bun is already available (from devcontainer feature)
if command -v bun &> /dev/null; then
    echo "✅ Bun found at: $(which bun)"
    echo "   Version: $(bun --version)"
else
    echo "📦 Bun not found in PATH, trying to locate it..."
    
    # Try common install locations
    BUN_PATHS="$HOME/.bun/bin /usr/local/bin"
    for p in $BUN_PATHS; do
        if [ -f "$p/bun" ]; then
            echo "   Found bun at $p/bun"
            export PATH="$p:$PATH"
            break
        fi
    done
    
    # If still not found, install manually
    if ! command -v bun &> /dev/null; then
        echo "📦 Installing bun manually..."
        curl -fsSL https://bun.sh/install | bash || {
            echo "⚠️ Bun install failed, will try npm fallback later"
        }
        export PATH="$HOME/.bun/bin:$PATH"
    fi
fi

# ---------------------------------------------------------------------------
# 2. Persist PATH for future terminal sessions
# ---------------------------------------------------------------------------
if command -v bun &> /dev/null; then
    BUN_DIR=$(dirname "$(which bun)")
    BUN_PATH_LINE="export PATH=\"$BUN_DIR:\$PATH\""
    
    for PROFILE in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
        if [ -f "$PROFILE" ] || [ "$PROFILE" = "$HOME/.profile" ]; then
            if ! grep -qF 'bun' "$PROFILE" 2>/dev/null; then
                echo "$BUN_PATH_LINE" >> "$PROFILE"
            fi
        fi
    done
fi

# ---------------------------------------------------------------------------
# 3. Install dependencies (with fallback to npm)
# ---------------------------------------------------------------------------
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install || {
        echo "⚠️ bun install failed, trying with npm..."
        npm install || echo "⚠️ npm install also failed, you may need to install manually"
    }
else
    echo "⚠️ Bun not available, falling back to npm..."
    npm install || echo "⚠️ npm install also failed, you may need to install manually"
fi

echo ""
echo "✅ Setup complete!"
if command -v bun &> /dev/null; then
    echo "   Run 'bun run dev' to start the dev server on port 3000"
else
    echo "   Run 'npm run dev' to start the dev server on port 3000"
fi
