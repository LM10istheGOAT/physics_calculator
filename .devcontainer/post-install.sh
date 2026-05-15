#!/bin/bash
# Post-create setup script for GitHub Codespaces
set -e

echo "🔧 Setting up Physics Calculator development environment..."

# Ensure bun is available
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "📦 Installing dependencies with Bun..."
bun install

echo "✅ Setup complete! Run 'bun run dev' to start the dev server."
