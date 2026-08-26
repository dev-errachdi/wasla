#!/bin/bash

set -e

WASLA_ROOT="$HOME/wasla"
AI_DIR="$WASLA_ROOT/local-ai"
LLAMA_DIR="$AI_DIR/llama.cpp"
MODEL_DIR="$AI_DIR/models/qwen2.5-3b"
MODEL_FILE="Qwen2.5-3B-Instruct-Q4_K_M.gguf"
HF_REPO="bartowski/Qwen2.5-3B-Instruct-GGUF"

echo ""
echo "=============================================="
echo "   WASLA LOCAL AI INSTALLER"
echo "   Model: Qwen2.5 3B Instruct Q4_K_M"
echo "=============================================="
echo ""

echo "[1/6] Installing system dependencies..."
sudo apt update
sudo apt install -y \
  build-essential \
  cmake \
  git \
  curl \
  wget \
  python3 \
  python3-pip \
  python3-venv \
  pkg-config \
  libcurl4-openssl-dev

echo ""
echo "[2/6] Preparing directories..."
mkdir -p "$AI_DIR"
mkdir -p "$MODEL_DIR"

echo ""
echo "[3/6] Installing Hugging Face CLI..."
python3 -m pip install --user -U "huggingface_hub[cli]"

export PATH="$HOME/.local/bin:$PATH"

echo ""
echo "[4/6] Cloning llama.cpp..."
if [ ! -d "$LLAMA_DIR" ]; then
  git clone https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
else
  echo "llama.cpp already exists, pulling latest..."
  cd "$LLAMA_DIR"
  git pull
fi

echo ""
echo "[5/6] Building llama.cpp..."
cd "$LLAMA_DIR"
cmake -B build -DLLAMA_BUILD_SERVER=ON
cmake --build build -j

echo ""
echo "[6/6] Downloading Qwen model..."
cd "$MODEL_DIR"

if [ ! -f "$MODEL_FILE" ]; then
  huggingface-cli download "$HF_REPO" "$MODEL_FILE" --local-dir .
else
  echo "Model already exists: $MODEL_FILE"
fi

echo ""
echo "=============================================="
echo "INSTALLATION COMPLETE ✅"
echo "=============================================="
echo "Model path:"
echo "  $MODEL_DIR/$MODEL_FILE"
echo ""
echo "llama.cpp server path:"
echo "  $LLAMA_DIR/build/bin/llama-server"
echo ""
echo "Next step:"
echo "  bash ~/wasla/scripts/run-qwen-local.sh"
echo ""
