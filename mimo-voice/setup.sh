#!/usr/bin/env bash
# MiMo Voice — Setup Script
# =========================

set -e

echo "🎤 MiMo Voice — Universal Voice Translator"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.10+"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅ Python $PYTHON_VERSION"

# Check API key
if [ -z "$MIMO_API_KEY" ]; then
    echo ""
    echo "⚠️  MIMO_API_KEY not set."
    echo "   Register at: https://platform.xiaomimimo.com"
    echo "   Then: export MIMO_API_KEY=your_key_here"
    echo ""
    read -p "Enter your MiMo API key (or press Enter to skip): " API_KEY
    if [ -n "$API_KEY" ]; then
        export MIMO_API_KEY="$API_KEY"
        echo "export MIMO_API_KEY=$API_KEY" >> ~/.bashrc
        echo "✅ API key saved to ~/.bashrc"
    fi
else
    echo "✅ MIMO_API_KEY set"
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
cd "$(dirname "$0")"
pip3 install -r requirements.txt --quiet

# Create .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    if [ -n "$MIMO_API_KEY" ]; then
        sed -i "s/your_api_key_here/$MIMO_API_KEY/" .env
    fi
    echo "✅ Created .env from template"
fi

# Create translations directory
mkdir -p translations

# Install whisper-streaming
echo ""
echo "🎤 Installing Whisper-Streaming..."
pip3 install git+https://github.com/ufal/whisper_streaming.git --quiet 2>/dev/null || \
    echo "⚠️  Whisper-Streaming install failed (optional, can install later)"

# Install faster-whisper
echo "🎤 Installing faster-whisper..."
pip3 install faster-whisper --quiet 2>/dev/null || \
    echo "⚠️  faster-whisper install failed (optional, can install later)"

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo ""
echo "Quick test:"
echo "  python3 -c \"from api import quick_translate; print(quick_translate('Hello!', 'en', 'ja'))\""
echo ""
echo "Run tests:"
echo "  cd tests && pytest test_api.py -v"
echo ""
echo "Start translating:"
echo "  python3 scripts/demo.py"
