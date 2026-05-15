#!/bin/bash
set -e

echo "🔧 Setting up Physics Calculator development environment..."

# Ensure bun is available — install it if the devcontainer feature didn't work
if ! command -v bun &> /dev/null; then
    echo "📦 Bun not found in PATH, installing manually..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"

    # Also add to shell profile for future sessions
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
else
    echo "✅ Bun found: $(bun --version)"
fi

# Install dependencies
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install
else
    echo "⚠️ Bun still not available, falling back to npm..."
    npm install
fi

echo ""
echo "✅ Setup complete!"
echo "   Run 'bun run dev' to start the dev server on port 3000"