#!/bin/bash
# Create simple placeholder images using ImageMagick or Python
# If neither is available, we'll create empty files and update app.json

# Try ImageMagick first
if command -v convert &> /dev/null; then
  convert -size 1024x1024 xc:white -pointsize 200 -fill black -gravity center -annotate +0+0 "TRDE" icon.png
  convert -size 2048x2048 xc:white splash.png
  convert -size 1024x1024 xc:white adaptive-icon.png
  convert -size 32x32 xc:white favicon.png
  echo "Assets created with ImageMagick"
# Try Python PIL
elif python3 -c "from PIL import Image" 2>/dev/null; then
  python3 << PYTHON
from PIL import Image, ImageDraw, ImageFont
# Icon
img = Image.new('RGB', (1024, 1024), color='white')
img.save('icon.png')
# Splash
splash = Image.new('RGB', (2048, 2048), color='white')
splash.save('splash.png')
# Adaptive icon
adaptive = Image.new('RGB', (1024, 1024), color='white')
adaptive.save('adaptive-icon.png')
# Favicon
favicon = Image.new('RGB', (32, 32), color='white')
favicon.save('favicon.png')
PYTHON
  echo "Assets created with Python PIL"
else
  echo "ImageMagick or PIL not found. Creating empty files..."
  touch icon.png splash.png adaptive-icon.png favicon.png
fi
