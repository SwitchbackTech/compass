#!/bin/bash

# MongoDB Setup Verification Script for GitHub Copilot
# This script simulates the setup steps to verify MongoDB binaries are available

echo "🔧 Setting up MongoDB binaries for GitHub Copilot..."

# Create cache directory
mkdir -p ~/.cache/mongodb-binaries
echo "✅ MongoDB binary cache directory created"

# Check if binary is already available
BINARY_DIR="~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14"
BINARY_PATH="$BINARY_DIR/bin/mongod"

if [ ! -f ~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14.tgz ]; then
  echo "⬇️  Downloading MongoDB 6.0.14 binary..."
  cd ~/.cache/mongodb-binaries
  curl -o mongodb-linux-x86_64-ubuntu2204-6.0.14.tgz \
    "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-6.0.14.tgz"
  echo "✅ MongoDB binary downloaded successfully"
else
  echo "✅ MongoDB binary already cached"
fi

# Extract if needed
if [ ! -d ~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14 ]; then
  echo "📦 Extracting MongoDB binary..."
  cd ~/.cache/mongodb-binaries
  tar -xzf mongodb-linux-x86_64-ubuntu2204-6.0.14.tgz
  echo "✅ MongoDB binary extracted successfully"
else
  echo "✅ MongoDB binary already extracted"
fi

# Set environment variables
export MONGOMS_DOWNLOAD_DIR=~/.cache/mongodb-binaries
export MONGOMS_DISABLE_DOWNLOAD=true
export MONGOMS_BINARY_PATH=~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14/bin/mongod

echo "🌍 Environment variables set:"
echo "  MONGOMS_DOWNLOAD_DIR=$MONGOMS_DOWNLOAD_DIR"
echo "  MONGOMS_DISABLE_DOWNLOAD=$MONGOMS_DISABLE_DOWNLOAD"
echo "  MONGOMS_BINARY_PATH=$MONGOMS_BINARY_PATH"

# Verify binary is available
if [ -f ~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14/bin/mongod ]; then
  echo "✅ MongoDB binary is available and ready for jest-mongodb"
  ls -la ~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14/bin/mongod
  echo "🚀 Setup complete! You can now run tests without firewall issues."
else
  echo "❌ MongoDB binary not found"
  exit 1
fi