#!/bin/bash
set -e

echo "Building web app..."
npm run build

echo "Deploying to Vercel..."
vercel deploy dist --prod --alias lavie-reading-web.vercel.app

echo "✅ Deployed to https://lavie-reading-web.vercel.app"
