#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Render's Native Puppeteer caching mechanism handles Chrome install
npx puppeteer browsers install chrome
