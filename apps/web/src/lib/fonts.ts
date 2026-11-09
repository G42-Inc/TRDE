// Font management system - Pre-installed fonts

export interface FontInfo {
  id: string;
  name: string;
  family: string;
  displayName: string;
  files: {
    normal: string;
    italic?: string;
    bold?: string;
    boldItalic?: string;
  };
}

// Pre-installed fonts
export const availableFonts: FontInfo[] = [
  {
    id: 'inter',
    name: 'Inter',
    family: 'Inter',
    displayName: 'Inter',
    files: {
      normal: '/fonts/inter/Inter-Regular.woff2',
    },
  },
  {
    id: 'anita-semi-square',
    name: 'Anita Semi Square',
    family: 'Anita Semi Square',
    displayName: 'Anita Semi Square',
    files: {
      normal: '/fonts/anita_semi_square/AnitaSemiSquare.ttf',
    },
  },
  {
    id: 'dogica',
    name: 'Dogica',
    family: 'Dogica',
    displayName: 'Dogica',
    files: {
      normal: '/fonts/dogica/dogica.ttf',
      bold: '/fonts/dogica/dogicabold.ttf',
    },
  },
  {
    id: 'sansumi',
    name: 'Sansumi',
    family: 'Sansumi',
    displayName: 'Sansumi',
    files: {
      normal: '/fonts/sansumi/Sansumi-Regular.ttf',
      bold: '/fonts/sansumi/Sansumi-Bold.ttf',
    },
  },
  {
    id: 'nordica',
    name: 'Nordica',
    family: 'Nordica',
    displayName: 'Nordica',
    files: {
      normal: '/fonts/nordica/NordicaRegular.otf',
      bold: '/fonts/nordica/NordicaBlack.otf',
    },
  },
  {
    id: 'jura',
    name: 'Jura',
    family: 'Jura',
    displayName: 'Jura',
    files: {
      normal: '/fonts/jura/JuraBook.ttf',
      bold: '/fonts/jura/JuraDemiBold.ttf',
    },
  },
  {
    id: 'generica',
    name: 'Generica',
    family: 'Generica',
    displayName: 'Generica',
    files: {
      normal: '/fonts/generica/Generica.otf',
      bold: '/fonts/generica/Generica Bold.otf',
    },
  },
  {
    id: 'plat-nomor',
    name: 'Plat Nomor',
    family: 'Plat Nomor',
    displayName: 'Plat Nomor',
    files: {
      normal: '/fonts/plat_nomor/PlatNomor.otf',
    },
  },
  {
    id: 'garet',
    name: 'Garet',
    family: 'Garet',
    displayName: 'Garet',
    files: {
      normal: '/fonts/garet/Garet-Book.woff2',
      bold: '/fonts/garet/Garet-Heavy.woff2',
    },
  },
  {
    id: 'zt-nature',
    name: 'ZT Nature',
    family: 'ZT Nature',
    displayName: 'ZT Nature',
    files: {
      normal: '/fonts/zt_nature/ZTNature-Medium.ttf',
      italic: '/fonts/zt_nature/ZTNature-MediumItalic.ttf',
      bold: '/fonts/zt_nature/ZTNature-Black.ttf',
      boldItalic: '/fonts/zt_nature/ZTNature-BlackItalic.ttf',
    },
  },
  {
    id: 'alpha-prota',
    name: 'Alpha Prota',
    family: 'Alpha Prota',
    displayName: 'Alpha Prota',
    files: {
      normal: '/fonts/alpha_prota/AlphaProta-Regular.ttf',
      italic: '/fonts/alpha_prota/AlphaProta-Italic.ttf',
    },
  },
];

const SELECTED_FONT_KEY = 'trde:selectedFont';

// Get selected font ID
export function getSelectedFont(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SELECTED_FONT_KEY) || 'inter'; // Default to Inter
  } catch {
    return 'inter';
  }
}

// Set selected font
export function setSelectedFont(fontId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SELECTED_FONT_KEY, fontId);
  applyFont(fontId);
}

// Apply font to the document
export function applyFont(fontId: string | null): void {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (!fontId) {
    fontId = 'inter'; // Default to Inter
  }
  
  const font = availableFonts.find(f => f.id === fontId);
  
  if (!font) {
    root.style.setProperty('--font-family', 'var(--font-inter)');
    root.setAttribute('data-font', 'inter');
    return;
  }
  
  // Set CSS variable for font family
  root.style.setProperty('--font-family', `"${font.family}", sans-serif`);
  
  // Set data attribute for font-specific styling
  root.setAttribute('data-font', font.id);
  
  // Inject @font-face rules if not already present
  injectFontFace(font);
}

// Inject @font-face rules for a font
function injectFontFace(font: FontInfo): void {
  // Skip Inter - it's loaded via next/font/google in layout.tsx
  // Don't inject @font-face for Inter to avoid 404 errors
  if (font.id === 'inter') {
    return;
  }
  
  const styleId = `font-face-${font.id}`;
  
  // Remove existing style if present
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }
  
  // Create new style element
  const style = document.createElement('style');
  style.id = styleId;
  
  let css = '';
  
  // Helper function to determine format from URL
  const getFormat = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes('.woff2')) return 'woff2';
    if (lower.includes('.woff')) return 'woff';
    if (lower.includes('.ttf')) return 'truetype';
    if (lower.includes('.otf')) return 'opentype';
    return 'woff2'; // default
  };

  if (font.files.normal) {
    const format = getFormat(font.files.normal);
    css += `@font-face {
      font-family: "${font.family}";
      src: url("${font.files.normal}") format("${format}");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }\n`;
  }
  
  if (font.files.italic) {
    const format = getFormat(font.files.italic);
    css += `@font-face {
      font-family: "${font.family}";
      src: url("${font.files.italic}") format("${format}");
      font-weight: 400;
      font-style: italic;
      font-display: swap;
    }\n`;
  }
  
  if (font.files.bold) {
    const format = getFormat(font.files.bold);
    css += `@font-face {
      font-family: "${font.family}";
      src: url("${font.files.bold}") format("${format}");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }\n`;
  }
  
  if (font.files.boldItalic) {
    const format = getFormat(font.files.boldItalic);
    css += `@font-face {
      font-family: "${font.family}";
      src: url("${font.files.boldItalic}") format("${format}");
      font-weight: 700;
      font-style: italic;
      font-display: swap;
    }\n`;
  }
  
  style.textContent = css;
  document.head.appendChild(style);
}

// Initialize font on page load
export function initFont(): void {
  if (typeof window === 'undefined') return;
  const selectedFontId = getSelectedFont();
  applyFont(selectedFontId);
}
