#!/bin/bash
# Simple local web server to avoid CORS issues
# Run: bash serve.sh or chmod +x serve.sh && ./serve.sh
# Then open: http://localhost:8000/

PORT=8000

if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT --bind 0.0.0.0
elif command -v python &> /dev/null; then
    python -m http.server $PORT --bind 0.0.0.0
elif command -v php &> /dev/null; then
    php -S localhost:$PORT
elif command -v node &> /dev/null; then
    npx http-server -p $PORT -c-1 --cors
else
    echo "No suitable server found. Please install Python, PHP, or Node.js"
    exit 1
fi


