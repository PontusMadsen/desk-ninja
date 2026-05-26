#!/bin/bash
set -e
echo "Installing Little Gamers Ninja Pi service..."
cd "$(dirname "$0")/.."
npm install
echo "Done. Run 'npm start' to launch."
