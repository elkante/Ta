import React, { useState, useMemo, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lock,
  MessageCircle,
  Palette,
  Phone,
  Plus,
  Save,
  Share2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Type,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Product, PromoBannerSlot, Store, StorefrontCustomization, StoreThemeId } from '../../types';
import { dbSaveStore } from '../../utils/supabase';
import { getStoreDisplayUrl, getStoreUrl } from '../../utils/storage';

export interface ThemeTemplate {
  id: StoreThemeId;
  name: string;
  category: string;
  description: string;
  colors: string[];
  font: string;
  badge?: string;
  previewBg: string;
}

export const STORE_THEMES: ThemeTemplate[] = [
  {
    id: 'classic',
    name: 'Tá.shop Classic (Signature)',
    category: 'Original Social Commerce',
    description: 'The signature Tá.shop storefront: dark cinematic cover banner, left-aligned store avatar, quick WhatsApp floating bar, and trusted community badges.',
    colors: ['#0f172a', '#f59e0b', '#ffffff'],
    font: 'Plus Jakarta Sans',
    badge: 'Signature',
    previewBg: 'bg-slate-900',
  },
  {
    id: 'mercato',
    name: 'Mercato',
    category: 'Modern Boutique & Apparel',
    description: 'Clean modern marketplace layout with a sticky header bar, crisp product grid, and warm neutral undertones.',
    colors: ['#0f172a', '#3b82f6', '#f8fafc'],
    font: 'Modern Sans',
    badge: 'Popular',
    previewBg: 'bg-slate-900',
  },
  {
    id: 'margaux',
    name: 'Margaux',
    category: 'Editorial Luxe Couture',
    description: 'Deep navy, warm gold accents, and serif headings tailored for premium fashion, bespoke tailoring, and couture.',
    colors: ['#0f172a', '#d97706', '#fef3c7'],
    font: 'Playfair Display',
    badge: 'Luxury',
    previewBg: 'bg-[#0f172a]',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    category: 'Mainstream Commerce',
    description: 'Vibrant cobalt blue on crisp white with high-contrast action buttons and straightforward catalog shopping.',
    colors: ['#1d4ed8', '#2563eb', '#ffffff'],
    font: 'Plus Jakarta Sans',
    badge: 'High Conversion',
    previewBg: 'bg-blue-600',
  },
  {
    id: 'arena',
    name: 'Arena',
    category: 'Monochrome Streetwear',
    description: 'Stark black-and-white contrast, bold punchy headings, and urban edge for streetwear and sneakers.',
    colors: ['#000000', '#22c55e', '#ffffff'],
    font: 'Space Grotesk',
    badge: 'Urban',
    previewBg: 'bg-black',
  },
  {
    id: 'colette',
    name: 'Colette',
    category: 'Magazine Boutique & Beauty',
    description: 'Soft rose & blush tones, warm gentle borders, and editorial poise for beauty, skincare, and fragrance.',
    colors: ['#881337', '#f43f5e', '#fff1f2'],
    font: 'Cormorant Garamond',
    badge: 'Beauty & Glow',
    previewBg: 'bg-rose-950',
  },
  {
    id: 'galactic',
    name: 'Galactic',
    category: 'Dark Obsidian Catalogue',
    description: 'Moody obsidian midnight theme with indigo highlights for electronics, leather goods, and high-tech gadgets.',
    colors: ['#020617', '#6366f1', '#1e1b4b'],
    font: 'Outfit / Sans',
    badge: 'Dark Mode',
    previewBg: 'bg-slate-950',
  },
  {
    id: 'maison',
    name: 'Maison',
    category: 'Quiet Luxury Fashion House',
    description: 'Subtle slate borders, warm sandstone undertones, and generous whitespace for minimalist elegance.',
    colors: ['#334155', '#b45309', '#f8fafc'],
    font: 'Cinzel / Serif',
    badge: 'Quiet Luxury',
    previewBg: 'bg-stone-800',
  },
  {
    id: 'aurum',
    name: 'Aurum',
    category: "Jeweller's Boutique at Night",
    description: 'Near-black backdrop with metallic champagne gold and shimmer accents for fine jewelry & watches.',
    colors: ['#171717', '#f59e0b', '#fef08a'],
    font: 'Playfair Display',
    badge: 'Gold & Jewelry',
    previewBg: 'bg-[#121212]',
  },
];

/** Distinct SVG wireframe previews for each theme — rendered as mini layout thumbnails */
const THEME_PREVIEWS: Record<StoreThemeId, React.ReactElement> = {
  // Dark cinematic: full-width dark header + avatar circle left + horizontal pills + 3-col grid
  classic: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#0f172a" />
      {/* header bar */}
      <rect x="0" y="0" width="200" height="28" fill="#1e293b" />
      {/* logo pill */}
      <rect x="8" y="8" width="48" height="12" rx="6" fill="#f59e0b" />
      {/* nav dots right */}
      <rect x="148" y="10" width="18" height="8" rx="3" fill="#334155" />
      <rect x="170" y="10" width="18" height="8" rx="3" fill="#334155" />
      {/* avatar circle */}
      <circle cx="30" cy="52" r="16" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="30" cy="47" r="6" fill="#64748b" />
      <ellipse cx="30" cy="62" rx="10" ry="6" fill="#64748b" />
      {/* store name bar */}
      <rect x="54" y="42" width="72" height="8" rx="2" fill="#f59e0b" opacity="0.9" />
      <rect x="54" y="54" width="52" height="5" rx="2" fill="#475569" />
      {/* pill buttons */}
      <rect x="8" y="76" width="38" height="10" rx="5" fill="#f59e0b" />
      <rect x="50" y="76" width="38" height="10" rx="5" fill="#334155" />
      <rect x="92" y="76" width="38" height="10" rx="5" fill="#334155" />
      {/* 3-col product grid */}
      <rect x="8"  y="94" width="56" height="38" rx="4" fill="#1e293b" />
      <rect x="72" y="94" width="56" height="38" rx="4" fill="#1e293b" />
      <rect x="136" y="94" width="56" height="38" rx="4" fill="#1e293b" />
      {/* product shimmer lines */}
      <rect x="14" y="118" width="30" height="4" rx="2" fill="#334155" />
      <rect x="78" y="118" width="30" height="4" rx="2" fill="#334155" />
      <rect x="142" y="118" width="30" height="4" rx="2" fill="#334155" />
      <rect x="14" y="124" width="20" height="3" rx="1.5" fill="#f59e0b" opacity="0.6" />
      <rect x="78" y="124" width="20" height="3" rx="1.5" fill="#f59e0b" opacity="0.6" />
      <rect x="142" y="124" width="20" height="3" rx="1.5" fill="#f59e0b" opacity="0.6" />
    </svg>
  ),

  // Light market: white header center logo + search bar + 2×3 product grid
  mercato: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#f8fafc" />
      {/* header */}
      <rect x="0" y="0" width="200" height="30" fill="#ffffff" />
      <rect x="0" y="29" width="200" height="1" fill="#e2e8f0" />
      {/* centered logo */}
      <rect x="76" y="9" width="48" height="12" rx="4" fill="#0f172a" />
      {/* nav icons left */}
      <rect x="8" y="11" width="22" height="8" rx="3" fill="#e2e8f0" />
      {/* cart icon right */}
      <rect x="170" y="11" width="22" height="8" rx="3" fill="#3b82f6" />
      {/* search bar */}
      <rect x="16" y="36" width="168" height="14" rx="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="30" cy="43" r="4" fill="#cbd5e1" />
      <rect x="38" y="40" width="60" height="5" rx="2.5" fill="#e2e8f0" />
      {/* 2-row × 3-col product cards */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={8 + i * 64} y="56" width="58" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x={8 + i * 64} y="56" width="58" height="20" rx="6" fill="#e2e8f0" />
          <rect x={14 + i * 64} y="80" width="32" height="4" rx="2" fill="#cbd5e1" />
          <rect x={14 + i * 64} y="86" width="20" height="3" rx="1.5" fill="#3b82f6" opacity="0.7" />
        </g>
      ))}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={8 + i * 64} y="98" width="58" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x={8 + i * 64} y="98" width="58" height="20" rx="6" fill="#e2e8f0" />
          <rect x={14 + i * 64} y="122" width="32" height="4" rx="2" fill="#cbd5e1" />
          <rect x={14 + i * 64} y="128" width="20" height="3" rx="1.5" fill="#3b82f6" opacity="0.7" />
        </g>
      ))}
    </svg>
  ),

  // Editorial: tall text-heavy left/right split header, then wide product banner
  margaux: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#0f172a" />
      {/* top thin gold bar */}
      <rect x="0" y="0" width="200" height="3" fill="#d97706" />
      {/* nav row */}
      <rect x="8" y="8" width="30" height="7" rx="2" fill="#d97706" opacity="0.8" />
      <rect x="148" y="8" width="18" height="7" rx="2" fill="#334155" />
      <rect x="170" y="8" width="18" height="7" rx="2" fill="#334155" />
      {/* left editorial text block */}
      <rect x="8" y="24" width="85" height="10" rx="2" fill="#fef3c7" opacity="0.95" />
      <rect x="8" y="38" width="65" height="6" rx="2" fill="#fef3c7" opacity="0.6" />
      <rect x="8" y="48" width="75" height="6" rx="2" fill="#fef3c7" opacity="0.4" />
      <rect x="8" y="58" width="55" height="6" rx="2" fill="#fef3c7" opacity="0.3" />
      {/* serif style decorative line */}
      <rect x="8" y="68" width="40" height="2" fill="#d97706" />
      {/* right image placeholder */}
      <rect x="108" y="18" width="84" height="62" rx="4" fill="#1e293b" />
      <rect x="118" y="28" width="64" height="42" rx="3" fill="#334155" />
      <circle cx="150" cy="49" r="12" fill="#1e293b" opacity="0.6" />
      {/* wide product banner */}
      <rect x="8" y="90" width="184" height="42" rx="4" fill="#1e293b" />
      <rect x="16" y="98" width="40" height="26" rx="3" fill="#334155" />
      <rect x="62" y="98" width="40" height="26" rx="3" fill="#334155" />
      <rect x="108" y="98" width="40" height="26" rx="3" fill="#334155" />
      <rect x="154" y="98" width="30" height="26" rx="3" fill="#d97706" opacity="0.3" />
      {/* gold price tags */}
      <rect x="62" y="126" width="24" height="4" rx="2" fill="#d97706" opacity="0.8" />
      <rect x="16" y="126" width="24" height="4" rx="2" fill="#d97706" opacity="0.8" />
    </svg>
  ),

  // Bold e-commerce: bright blue bar, white body, 4-col tight grid
  cobalt: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#ffffff" />
      {/* bold blue top bar */}
      <rect x="0" y="0" width="200" height="32" fill="#1d4ed8" />
      {/* logo */}
      <rect x="8" y="10" width="40" height="12" rx="3" fill="#ffffff" opacity="0.95" />
      {/* search center */}
      <rect x="58" y="10" width="84" height="12" rx="6" fill="#3b82f6" />
      <circle cx="70" cy="16" r="3.5" fill="#93c5fd" />
      {/* cart + user right */}
      <rect x="154" y="11" width="16" height="10" rx="3" fill="#60a5fa" />
      <rect x="174" y="11" width="16" height="10" rx="3" fill="#60a5fa" />
      {/* 3 big CTA buttons */}
      <rect x="8" y="38" width="56" height="16" rx="4" fill="#1d4ed8" />
      <rect x="72" y="38" width="56" height="16" rx="4" fill="#1d4ed8" />
      <rect x="136" y="38" width="56" height="16" rx="4" fill="#2563eb" />
      {/* label lines inside buttons */}
      <rect x="14" y="43" width="36" height="5" rx="2.5" fill="#93c5fd" />
      <rect x="78" y="43" width="36" height="5" rx="2.5" fill="#93c5fd" />
      <rect x="142" y="43" width="36" height="5" rx="2.5" fill="#93c5fd" />
      {/* 4-col product grid */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={8 + i * 47} y="60" width="42" height="32" rx="3" fill="#f1f5f9" />
          <rect x={8 + i * 47} y="60" width="42" height="18" rx="3" fill="#e2e8f0" />
          <rect x={12 + i * 47} y="82" width="26" height="4" rx="2" fill="#cbd5e1" />
          <rect x={12 + i * 47} y="88" width="16" height="3" rx="1.5" fill="#1d4ed8" opacity="0.7" />
        </g>
      ))}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={8 + i * 47} y="98" width="42" height="32" rx="3" fill="#f1f5f9" />
          <rect x={8 + i * 47} y="98" width="42" height="18" rx="3" fill="#e2e8f0" />
          <rect x={12 + i * 47} y="120" width="26" height="4" rx="2" fill="#cbd5e1" />
          <rect x={12 + i * 47} y="126" width="16" height="3" rx="1.5" fill="#1d4ed8" opacity="0.7" />
        </g>
      ))}
    </svg>
  ),

  // Streetwear: full-black header, huge bold text overlay, 2-col asymmetric grid
  arena: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#000000" />
      {/* full-width hero area */}
      <rect x="0" y="0" width="200" height="72" fill="#111111" />
      {/* nav bar */}
      <rect x="0" y="0" width="200" height="20" fill="#000000" />
      <rect x="8" y="6" width="28" height="8" rx="2" fill="#22c55e" />
      <rect x="160" y="6" width="12" height="8" rx="2" fill="#333333" />
      <rect x="176" y="6" width="12" height="8" rx="2" fill="#333333" />
      {/* huge bold text */}
      <rect x="8" y="26" width="120" height="14" rx="2" fill="#ffffff" opacity="0.95" />
      <rect x="8" y="44" width="90" height="10" rx="2" fill="#ffffff" opacity="0.6" />
      {/* green accent CTA */}
      <rect x="8" y="58" width="50" height="11" rx="3" fill="#22c55e" />
      <rect x="14" y="61" width="30" height="5" rx="2.5" fill="#000000" opacity="0.5" />
      {/* divider */}
      <rect x="0" y="72" width="200" height="1" fill="#222222" />
      {/* 2-col asymmetric grid */}
      <rect x="8" y="78" width="110" height="54" rx="4" fill="#111111" />
      <rect x="124" y="78" width="68" height="25" rx="4" fill="#1a1a1a" />
      <rect x="124" y="107" width="68" height="25" rx="4" fill="#1a1a1a" />
      {/* labels */}
      <rect x="14" y="116" width="50" height="5" rx="2.5" fill="#333333" />
      <rect x="14" y="123" width="30" height="4" rx="2" fill="#22c55e" opacity="0.7" />
      <rect x="130" y="96" width="36" height="4" rx="2" fill="#333333" />
      <rect x="130" y="116" width="36" height="4" rx="2" fill="#333333" />
    </svg>
  ),

  // Beauty: pink/rose gradient header, centered circular avatar, masonry product layout
  colette: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="colette-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#881337" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      {/* bg */}
      <rect width="200" height="140" fill="#fff1f2" />
      {/* gradient header */}
      <rect x="0" y="0" width="200" height="56" fill="url(#colette-grad)" />
      {/* centered avatar */}
      <circle cx="100" cy="44" r="20" fill="#fff1f2" stroke="#f43f5e" strokeWidth="2" />
      <circle cx="100" cy="38" r="8" fill="#fda4af" />
      <ellipse cx="100" cy="56" rx="13" ry="8" fill="#fda4af" />
      {/* brand text */}
      <rect x="70" y="8" width="60" height="8" rx="3" fill="#ffffff" opacity="0.9" />
      <rect x="80" y="18" width="40" height="5" rx="2.5" fill="#ffffff" opacity="0.6" />
      {/* masonry product layout */}
      {/* col 1: tall card */}
      <rect x="8" y="62" width="56" height="70" rx="5" fill="#ffffff" stroke="#fecdd3" strokeWidth="1" />
      <rect x="8" y="62" width="56" height="44" rx="5" fill="#fecdd3" />
      <rect x="14" y="112" width="36" height="5" rx="2.5" fill="#cbd5e1" />
      <rect x="14" y="119" width="24" height="4" rx="2" fill="#f43f5e" opacity="0.6" />
      {/* col 2: short + short */}
      <rect x="72" y="62" width="56" height="32" rx="5" fill="#ffffff" stroke="#fecdd3" strokeWidth="1" />
      <rect x="72" y="62" width="56" height="18" rx="5" fill="#fda4af" opacity="0.6" />
      <rect x="72" y="100" width="56" height="32" rx="5" fill="#ffffff" stroke="#fecdd3" strokeWidth="1" />
      <rect x="72" y="100" width="56" height="18" rx="5" fill="#fda4af" opacity="0.4" />
      {/* col 3: medium */}
      <rect x="136" y="62" width="56" height="42" rx="5" fill="#ffffff" stroke="#fecdd3" strokeWidth="1" />
      <rect x="136" y="62" width="56" height="26" rx="5" fill="#fecdd3" opacity="0.7" />
      <rect x="136" y="110" width="56" height="22" rx="5" fill="#ffffff" stroke="#fecdd3" strokeWidth="1" />
    </svg>
  ),

  // Dark catalog: near-black bg, indigo accent, sidebar nav, product rows
  galactic: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#020617" />
      {/* top nav */}
      <rect x="0" y="0" width="200" height="24" fill="#0f0f23" />
      <rect x="8" y="7" width="36" height="10" rx="3" fill="#6366f1" />
      <rect x="156" y="8" width="14" height="8" rx="2" fill="#1e1b4b" />
      <rect x="174" y="8" width="14" height="8" rx="2" fill="#1e1b4b" />
      {/* left sidebar */}
      <rect x="0" y="24" width="44" height="116" fill="#0a0a1e" />
      {/* sidebar nav items */}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x="6" y={32 + i * 18} width="32" height="10" rx="3" fill={i === 0 ? '#6366f1' : '#1e1b4b'} />
      ))}
      <rect x="6" y="116" width="32" height="10" rx="3" fill="#1e1b4b" />
      {/* main content area: product rows */}
      <rect x="52" y="28" width="140" height="8" rx="2" fill="#6366f1" opacity="0.4" />
      {/* row 1 */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={52 + i * 48} y="42" width="42" height="28" rx="3" fill="#0f172a" />
          <rect x={52 + i * 48} y="42" width="42" height="16" rx="3" fill="#1e1b4b" />
          <rect x={56 + i * 48} y="62" width="24" height="4" rx="2" fill="#334155" />
          <rect x={56 + i * 48} y="68" width="16" height="3" rx="1.5" fill="#6366f1" opacity="0.8" />
        </g>
      ))}
      {/* row 2 */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={52 + i * 48} y="78" width="42" height="28" rx="3" fill="#0f172a" />
          <rect x={52 + i * 48} y="78" width="42" height="16" rx="3" fill="#1e1b4b" />
          <rect x={56 + i * 48} y="98" width="24" height="4" rx="2" fill="#334155" />
          <rect x={56 + i * 48} y="104" width="16" height="3" rx="1.5" fill="#6366f1" opacity="0.8" />
        </g>
      ))}
      {/* row 3 */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={52 + i * 48} y="114" width="42" height="20" rx="3" fill="#0f172a" />
          <rect x={52 + i * 48} y="114" width="42" height="11" rx="3" fill="#1e1b4b" />
        </g>
      ))}
    </svg>
  ),

  // Minimal luxury: white, thin borders, generous whitespace, centered 2-col gallery
  maison: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#f8fafc" />
      {/* thin top border */}
      <rect x="0" y="0" width="200" height="1.5" fill="#334155" />
      {/* slim header */}
      <rect x="0" y="1" width="200" height="26" fill="#ffffff" />
      <rect x="0" y="27" width="200" height="0.8" fill="#e2e8f0" />
      {/* centered minimal logo */}
      <rect x="78" y="8" width="44" height="10" rx="2" fill="#334155" />
      {/* tiny left nav */}
      <rect x="8" y="10" width="28" height="6" rx="1.5" fill="#e2e8f0" />
      {/* thin right links */}
      <rect x="162" y="10" width="12" height="6" rx="1.5" fill="#e2e8f0" />
      <rect x="178" y="10" width="12" height="6" rx="1.5" fill="#e2e8f0" />
      {/* editorial heading centered */}
      <rect x="50" y="36" width="100" height="10" rx="2" fill="#334155" opacity="0.85" />
      <rect x="70" y="50" width="60" height="5" rx="2.5" fill="#94a3b8" opacity="0.7" />
      {/* thin gold underline accent */}
      <rect x="88" y="58" width="24" height="1.5" fill="#b45309" />
      {/* 2-col gallery, generous spacing */}
      <rect x="16" y="68" width="80" height="62" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
      <rect x="104" y="68" width="80" height="62" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
      {/* image areas */}
      <rect x="16" y="68" width="80" height="40" rx="3" fill="#f1f5f9" />
      <rect x="104" y="68" width="80" height="40" rx="3" fill="#f1f5f9" />
      {/* product labels */}
      <rect x="24" y="114" width="50" height="5" rx="2.5" fill="#cbd5e1" />
      <rect x="24" y="121" width="32" height="4" rx="2" fill="#b45309" opacity="0.6" />
      <rect x="112" y="114" width="50" height="5" rx="2.5" fill="#cbd5e1" />
      <rect x="112" y="121" width="32" height="4" rx="2" fill="#b45309" opacity="0.6" />
    </svg>
  ),

  // Jewellers: charcoal black, gold accent bars top/bottom, spotlight single-product hero
  aurum: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* bg */}
      <rect width="200" height="140" fill="#171717" />
      {/* top gold accent bar */}
      <rect x="0" y="0" width="200" height="4" fill="#f59e0b" />
      {/* nav */}
      <rect x="0" y="4" width="200" height="24" fill="#1c1c1c" />
      <rect x="8" y="10" width="36" height="11" rx="3" fill="#fef08a" opacity="0.15" />
      <rect x="82" y="11" width="36" height="9" rx="2" fill="#f59e0b" opacity="0.9" />
      <rect x="166" y="11" width="24" height="9" rx="3" fill="#292929" />
      {/* spotlight hero product */}
      <rect x="38" y="36" width="124" height="70" rx="6" fill="#1c1c1c" />
      {/* radial spotlight effect */}
      <ellipse cx="100" cy="71" rx="48" ry="30" fill="#2a2410" opacity="0.7" />
      {/* product silhouette */}
      <ellipse cx="100" cy="65" rx="22" ry="26" fill="#292929" />
      <ellipse cx="100" cy="65" rx="14" ry="18" fill="#333333" />
      {/* gem sparkles */}
      <circle cx="100" cy="52" r="3" fill="#f59e0b" opacity="0.9" />
      <circle cx="88" cy="62" r="2" fill="#fef08a" opacity="0.7" />
      <circle cx="112" cy="62" r="2" fill="#fef08a" opacity="0.7" />
      {/* product name + price */}
      <rect x="62" y="112" width="76" height="7" rx="2" fill="#fef08a" opacity="0.12" />
      <rect x="74" y="114" width="52" height="4" rx="2" fill="#f59e0b" opacity="0.8" />
      {/* bottom row: 3 small thumbnails */}
      <rect x="16" y="116" width="32" height="18" rx="3" fill="#1c1c1c" />
      <rect x="52" y="116" width="32" height="18" rx="3" fill="#1c1c1c" />
      {/* already covered by product detail area; shift down */}
      {/* bottom gold bar */}
      <rect x="0" y="136" width="200" height="4" fill="#f59e0b" />
      {/* tiny thumbnails row at bottom */}
      <rect x="8"  y="120" width="24" height="14" rx="2" fill="#292929" />
      <rect x="36" y="120" width="24" height="14" rx="2" fill="#292929" />
      <rect x="64" y="120" width="24" height="14" rx="2" fill="#292929" />
      {/* price tag right */}
      <rect x="140" y="120" width="52" height="14" rx="3" fill="#f59e0b" opacity="0.15" />
      <rect x="146" y="123" width="36" height="6" rx="2" fill="#f59e0b" opacity="0.8" />
    </svg>
  ),

  // default: same as classic
  default: (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="140" fill="#0f172a" />
      <rect x="0" y="0" width="200" height="28" fill="#1e293b" />
      <rect x="8" y="8" width="48" height="12" rx="6" fill="#f59e0b" />
      <rect x="148" y="10" width="18" height="8" rx="3" fill="#334155" />
      <rect x="170" y="10" width="18" height="8" rx="3" fill="#334155" />
      <circle cx="30" cy="52" r="16" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="30" cy="47" r="6" fill="#64748b" />
      <ellipse cx="30" cy="62" rx="10" ry="6" fill="#64748b" />
      <rect x="54" y="42" width="72" height="8" rx="2" fill="#f59e0b" opacity="0.9" />
      <rect x="54" y="54" width="52" height="5" rx="2" fill="#475569" />
      <rect x="8"  y="76" width="38" height="10" rx="5" fill="#f59e0b" />
      <rect x="50" y="76" width="38" height="10" rx="5" fill="#334155" />
      <rect x="92" y="76" width="38" height="10" rx="5" fill="#334155" />
      <rect x="8"  y="94" width="56" height="38" rx="4" fill="#1e293b" />
      <rect x="72" y="94" width="56" height="38" rx="4" fill="#1e293b" />
      <rect x="136" y="94" width="56" height="38" rx="4" fill="#1e293b" />
      <rect x="14" y="118" width="30" height="4" rx="2" fill="#334155" />
      <rect x="78" y="118" width="30" height="4" rx="2" fill="#334155" />
      <rect x="142" y="118" width="30" height="4" rx="2" fill="#334155" />
    </svg>
  ),
};

interface ManageStorefrontTabProps {
  store: Store;
  products?: Product[];
  onUpdateStore: (updatedStore: Store) => void;
  onOpenStorefront: () => void;
}

type SectionModalType =
  | null
  | 'hero'
  | 'about'
  | 'branding'
  | 'theme'
  | 'typography'
  | 'trust'
  | 'promo'
  | 'contact';

const BRAND_COVER_PRESETS = [
  { name: 'Luxury Gold', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Minimal Boutique', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Fashion Chic', url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Dark Velvet', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Modern Tech', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&auto=format&fit=crop&q=80' },
];

export const ManageStorefrontTab: React.FC<ManageStorefrontTabProps> = ({
  store,
  products = [],
  onUpdateStore,
  onOpenStorefront,
}) => {
  const [activeModal, setActiveModal] = useState<SectionModalType>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Published toggle state
  const isPublished = store.isPublished !== false;

  // Customization local working state
  const custom: StorefrontCustomization = store.storefrontCustomization || {};

  // Form states for modals
  const [heroHeadline, setHeroHeadline] = useState(custom.heroHeadline || store.name);
  const [heroSubtitle, setHeroSubtitle] = useState(custom.heroSubtitle || store.tagline || '');
  const [heroCtaText, setHeroCtaText] = useState(custom.heroCtaText || 'Shop Collection');
  const [heroBgColor, setHeroBgColor] = useState(custom.heroBgColor || store.accentColor || '#a84a32');
  const [heroLayout, setHeroLayout] = useState<'editorial' | 'banner' | 'split' | 'classic'>(
    custom.heroLayout || 'editorial'
  );

  // About form states
  const [aboutTitle, setAboutTitle] = useState(custom.aboutTitle || `About ${store.name}`);
  const [aboutTagline, setAboutTagline] = useState(custom.aboutTagline || 'OUR STORY & CRAFT');
  const [aboutStory, setAboutStory] = useState(
    custom.aboutStory !== undefined ? custom.aboutStory : ''
  );
  const [aboutImageUrl, setAboutImageUrl] = useState(custom.aboutImageUrl || '');

  // Theme & layout
  const [themeStyle, setThemeStyle] = useState<Store['themeStyle']>(store.themeStyle || 'luxury');
  const [themeId, setThemeId] = useState<StoreThemeId>(custom.themeId || 'classic');
  const [fontFamily, setFontFamily] = useState<StorefrontCustomization['fontFamily']>(
    custom.fontFamily || 'serif'
  );

  // Trust badges
  const [showTrustBadges, setShowTrustBadges] = useState(custom.showTrustBadges !== false);
  const [badge1Title, setBadge1Title] = useState(custom.trustBadge1Title || 'PACKAGED WITH CARE');
  const [badge1Sub, setBadge1Sub] = useState(custom.trustBadge1Subtitle || 'Carefully inspected before dispatch');
  const [badge2Title, setBadge2Title] = useState(custom.trustBadge2Title || 'AUTHENTIC GUARANTEE');
  const [badge2Sub, setBadge2Sub] = useState(custom.trustBadge2Subtitle || '100% genuine products directly sourced');
  const [badge3Title, setBadge3Title] = useState(custom.trustBadge3Title || 'DIRECT WHATSAPP SUPPORT');
  const [badge3Sub, setBadge3Sub] = useState(custom.trustBadge3Subtitle || 'Fast assistance from our friendly team');
  const [badge4Title, setBadge4Title] = useState(custom.trustBadge4Title || 'SECURE PAYMENTS');
  const [badge4Sub, setBadge4Sub] = useState(custom.trustBadge4Subtitle || 'Bank transfer & instant invoice receipts');

  // Promo banner
  const [promoEnabled, setPromoEnabled] = useState(custom.promoBannerEnabled || false);
  const [promoText, setPromoText] = useState(
    custom.promoBannerText || 'LIMITED TIME: Save big across our latest arrivals!'
  );
  const [promoCta, setPromoCta] = useState(custom.promoBannerCta || 'Shop The Sale →');

  // Branding states (Device file upload only — no raw URLs)
  const [accentColor, setAccentColor] = useState(store.accentColor || '#a84a32');
  const [logoUrl, setLogoUrl] = useState(store.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(store.bannerUrl || '');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
      setIsUploadingLogo(false);
    };
    reader.onerror = () => setIsUploadingLogo(false);
    reader.readAsDataURL(file);
  };

  const handleCoverBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerUrl(reader.result as string);
      setIsUploadingBanner(false);
    };
    reader.onerror = () => setIsUploadingBanner(false);
    reader.readAsDataURL(file);
  };

  // Navigation
  const [showNavLinks, setShowNavLinks] = useState(custom.showNavLinks !== false);
  const [showCollections, setShowCollections] = useState(custom.showCollections !== false);

  // ── ADVANCED SETUP STATES (Orderly-Inspired) ──
  const [expandedAdvancedSection, setExpandedAdvancedSection] = useState<
    'reviews' | 'featured' | 'categories' | 'banners' | 'promobar' | 'why' | null
  >('banners');

  // 1. Customer Reviews
  const [showCustomerReviews, setShowCustomerReviews] = useState(custom.showCustomerReviews !== false);
  const [reviewsQuoteSnippet, setReviewsQuoteSnippet] = useState(custom.reviewsQuoteSnippet || '');

  // 2. Featured Products (up to 4)
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>(custom.featuredProductIds || []);

  // 3. Popular Categories (derived from products or custom saved)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  const [popularCategories, setPopularCategories] = useState<string[]>(
    custom.popularCategories || (availableCategories.length > 0 ? availableCategories : ['All Products'])
  );

  // 4. Promo Banners (3 Slots)
  const DEFAULT_PROMO_BANNERS: PromoBannerSlot[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
      eyebrow: 'New Collection',
      title: 'Shop Latest Drops',
      buttonLabel: 'See more',
      categoryLink: 'All',
      textContrast: 'light',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
      eyebrow: 'Exclusive Deals',
      title: 'Best Sellers',
      buttonLabel: 'Explore now',
      categoryLink: 'All',
      textContrast: 'light',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80',
      eyebrow: 'Limited Edition',
      title: 'Special Selection',
      buttonLabel: 'Order on WhatsApp',
      categoryLink: 'All',
      textContrast: 'light',
    },
  ];

  const [promoBanners, setPromoBanners] = useState<PromoBannerSlot[]>(() => {
    if (custom.promoBanners && custom.promoBanners.length === 3) {
      return custom.promoBanners;
    }
    if (custom.promoBanners && custom.promoBanners.length > 0) {
      const filled = [...custom.promoBanners];
      while (filled.length < 3) {
        filled.push({ ...DEFAULT_PROMO_BANNERS[filled.length] });
      }
      return filled.slice(0, 3);
    }
    return DEFAULT_PROMO_BANNERS;
  });

  const [showPromoCards, setShowPromoCards] = useState<boolean>(
    custom.showPromoCards !== false
  );

  // 5. Why Choose Us (4 Value Promises)
  const DEFAULT_WHY_CHOOSE_US = [
    { title: '⚡ Fast Same-Day Dispatch', subtitle: 'Orders packed and shipped rapidly across Lagos & nationwide' },
    { title: '💎 100% Authentic Guarantee', subtitle: 'Verified products sourced directly with satisfaction assurance' },
    { title: '💬 Direct WhatsApp Concierge', subtitle: 'Real people ready to assist with sizing, questions, and custom orders' },
    { title: '🛡️ Transparent Invoice Receipts', subtitle: 'Instant digital invoice and waybill generation on every order' },
  ];

  const [whyChooseUs, setWhyChooseUs] = useState(
    custom.whyChooseUs && custom.whyChooseUs.length === 4
      ? custom.whyChooseUs
      : DEFAULT_WHY_CHOOSE_US
  );

  // 6. Footer text
  const [footerText, setFooterText] = useState(custom.footerText || '');

  const storeDisplayUrl = getStoreDisplayUrl(store.slug, store.customDomain);
  const fullStoreUrl = getStoreUrl(store.slug, { customDomain: store.customDomain });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullStoreUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const copy = [...promoBanners];
      copy[idx] = { ...copy[idx], imageUrl: dataUrl };
      setPromoBanners(copy);
    };
    reader.readAsDataURL(file);
  };

  const handleAboutFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAboutImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTogglePublished = async () => {
    const updatedStore: Store = {
      ...store,
      isPublished: !isPublished,
    };
    onUpdateStore(updatedStore);
    try {
      await dbSaveStore(updatedStore);
    } catch (e) {}
  };

  const handleSaveCustomization = async () => {
    setIsSaving(true);
    const updatedCustom: StorefrontCustomization = {
      isPublished,
      themeId,
      fontFamily,
      heroHeadline,
      heroSubtitle,
      heroCtaText,
      heroBgColor,
      heroLayout,
      aboutTitle,
      aboutTagline,
      aboutStory,
      aboutImageUrl,
      showTrustBadges,
      trustBadge1Title: badge1Title,
      trustBadge1Subtitle: badge1Sub,
      trustBadge2Title: badge2Title,
      trustBadge2Subtitle: badge2Sub,
      trustBadge3Title: badge3Title,
      trustBadge3Subtitle: badge3Sub,
      trustBadge4Title: badge4Title,
      trustBadge4Subtitle: badge4Sub,
      promoBannerEnabled: promoEnabled,
      promoBannerText: promoText,
      promoBannerCta: promoCta,
      showNavLinks,
      showCollections,
      showPromoCards,
      // Advanced Setup fields
      showCustomerReviews,
      reviewsQuoteSnippet,
      featuredProductIds,
      popularCategories,
      promoBanners,
      whyChooseUs,
      footerText,
    };

    const updatedStore: Store = {
      ...store,
      accentColor,
      logoUrl,
      bannerUrl,
      themeStyle,
      storefrontCustomization: updatedCustom,
    };

    onUpdateStore(updatedStore);

    try {
      await dbSaveStore(updatedStore);
    } catch (e) {
      console.warn('Failed to save store customization:', e);
    }

    setIsSaving(false);
    setActiveModal(null);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed top-5 right-5 z-[300] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Storefront customisation saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Storefront</h2>
        <p className="text-xs text-slate-500 mt-1">
          Customise what customers see when they visit your store — hero style, about story, trust badges &amp; navigation.
        </p>
      </div>

      {/* Top Card: Public URL & Published Switch (Styled like Orderly) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Public URL</span>
              <button
                onClick={handleCopyLink}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <a
              href={fullStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5 truncate mt-0.5 group"
            >
              <span className="truncate">{storeDisplayUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            </a>
          </div>
        </div>

        {/* Published Switch */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl">
          <span
            className={`text-xs font-bold ${
              isPublished ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            {isPublished ? 'Published' : 'Paused'}
          </span>
          <button
            type="button"
            onClick={handleTogglePublished}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPublished ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isPublished ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Sections Grid (8 Cards matching Orderly structure) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">Sections</span>
          <button
            onClick={onOpenStorefront}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview live store</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. Hero & Banner */}
          <button
            type="button"
            onClick={() => setActiveModal('hero')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Hero &amp; Banner</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                The first thing visitors see — title, subtitle, CTA button, and cover background.
              </p>
            </div>
          </button>

          {/* 2. About Us & Story */}
          <button
            type="button"
            onClick={() => setActiveModal('about')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-purple-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>About &amp; Our Story</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Tell your brand story — your journey, founder note, and what makes your store unique.
              </p>
            </div>
          </button>

          {/* 3. Branding & Colors */}
          <button
            type="button"
            onClick={() => setActiveModal('branding')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Branding</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Logo, primary brand colour, cover banner, and visual identity.
              </p>
            </div>
          </button>

          {/* 4. Theme & Layout */}
          <button
            type="button"
            onClick={() => setActiveModal('theme')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Theme &amp; Layout</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Pick a template that fits your store's vibe (Terracotta, Luxury Noir, Clean Minimal).
              </p>
            </div>
          </button>

          {/* 5. Typography */}
          <button
            type="button"
            onClick={() => setActiveModal('typography')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-sky-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Type className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Typography</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Choose the font your whole storefront uses (Serif Editorial, Modern Sans, Grotesk).
              </p>
            </div>
          </button>

          {/* 6. Trust Badges */}
          <button
            type="button"
            onClick={() => setActiveModal('trust')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Trust Guarantees</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Packaging care, quality checks, rapid WhatsApp response, and money-back guarantee.
              </p>
            </div>
          </button>

          {/* 7. Promotional Banner */}
          <button
            type="button"
            onClick={() => setActiveModal('promo')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Promotional Banner</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Highlight a flash sale, seasonal drop, or discount code directly across your store.
              </p>
            </div>
          </button>

          {/* 8. Contact & Socials */}
          <button
            type="button"
            onClick={() => setActiveModal('contact')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Contact &amp; Hours</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Phone, WhatsApp, location, delivery timelines, and social handles.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── ADVANCED SETUP PANEL (Orderly-Inspired Storefront Builder) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Panel Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 to-white">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Advanced Setup</h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Storefront Suite
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Fine-tune customer reviews, featured hero products, promo banners, and category showcases to match your unique brand identity.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleSaveCustomization}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Setup</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Accordion Sections */}
        <div className="divide-y divide-slate-100">
          {/* ── 1. PROMO BANNERS ACCORDION (3 Slots) ── */}
          <div className="p-4 sm:p-6">
            <div className="w-full flex items-center justify-between text-left">
              <button
                type="button"
                onClick={() =>
                  setExpandedAdvancedSection(
                    expandedAdvancedSection === 'banners' ? null : 'banners'
                  )
                }
                className="flex items-center gap-3 flex-1 text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Promo Banner Cards</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        showPromoCards
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {showPromoCards ? 'Visible on Store' : 'Hidden'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {promoBanners.filter((b) => b.imageUrl || b.title).length} / 3 configured
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Highlight up to 3 seasonal drops, collections, or flash deals with custom banner cards.
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                {/* Quick on/off toggle — always visible */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowPromoCards(!showPromoCards); }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    showPromoCards ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={showPromoCards ? 'Hide promo cards' : 'Show promo cards'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showPromoCards ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedAdvancedSection(
                      expandedAdvancedSection === 'banners' ? null : 'banners'
                    )
                  }
                  className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  {expandedAdvancedSection === 'banners' ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {expandedAdvancedSection === 'banners' && (
              <div className="mt-5 space-y-6 pt-2 animate-in fade-in duration-200">
                {/* On / Off Toggle for Promo Banner Cards */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <span>Display Promo Banner Cards on Storefront</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          showPromoCards
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {showPromoCards ? 'Active & Showing' : 'Turned Off (Hidden)'}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Toggle whether the 3 promotional highlight cards show on your buyer storefront. Turn this off if you prefer a direct catalog view.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromoCards(!showPromoCards)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      showPromoCards ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showPromoCards ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {promoBanners.map((slot, idx) => {
                    const hasData = Boolean(slot.imageUrl || slot.title);
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/90 p-4 bg-slate-50/50 space-y-3.5 hover:border-slate-300 transition"
                      >
                        {/* Slot Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Slot {idx + 1}
                          </span>
                          {hasData && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...promoBanners];
                                copy[idx] = {
                                  imageUrl: '',
                                  eyebrow: '',
                                  title: '',
                                  buttonLabel: '',
                                  categoryLink: 'All',
                                  textContrast: 'light',
                                };
                                setPromoBanners(copy);
                              }}
                              className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear</span>
                            </button>
                          )}
                        </div>

                        {/* Banner Live Preview */}
                        <div
                          className="relative h-36 rounded-xl overflow-hidden border border-slate-200 flex flex-col justify-end p-3 shadow-2xs group"
                          style={{
                            backgroundColor: slot.imageUrl ? '#1e293b' : '#f1f5f9',
                          }}
                        >
                          {slot.imageUrl ? (
                            <>
                              <img
                                src={slot.imageUrl}
                                alt={`Slot ${idx + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div
                                className={`absolute inset-0 ${
                                  slot.textContrast === 'dark'
                                    ? 'bg-gradient-to-t from-white/90 via-white/40 to-transparent text-slate-900'
                                    : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white'
                                } p-3 flex flex-col justify-end`}
                              >
                                {slot.eyebrow && (
                                  <span className="text-[9px] font-black uppercase tracking-wider opacity-90 line-clamp-1">
                                    {slot.eyebrow}
                                  </span>
                                )}
                                <h5 className="text-xs font-black leading-tight line-clamp-1">
                                  {slot.title || 'Untitled Banner'}
                                </h5>
                                {slot.buttonLabel && (
                                  <span className="text-[10px] font-bold underline mt-1 flex items-center gap-1">
                                    {slot.buttonLabel} →
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-400">
                              <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                              <span className="text-[10px] font-medium leading-tight">
                                Slot is empty — leave blank and it won't show on the store
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Inputs */}
                        <div className="space-y-2.5 text-xs">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                              Banner Photo (Device Upload)
                            </label>
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`banner-file-${idx}`}
                                className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs group"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 transition" />
                                <span>{slot.imageUrl ? 'Change Photo from Device' : 'Upload Image from Device'}</span>
                              </label>
                              <input
                                type="file"
                                id={`banner-file-${idx}`}
                                accept="image/*"
                                onChange={(e) => handleBannerFileUpload(e, idx)}
                                className="hidden"
                              />
                              {slot.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...promoBanners];
                                    copy[idx] = { ...copy[idx], imageUrl: '' };
                                    setPromoBanners(copy);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 border border-slate-200 rounded-xl hover:bg-red-50 transition cursor-pointer"
                                  title="Remove image"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                              Eyebrow Text
                            </label>
                            <input
                              type="text"
                              value={slot.eyebrow || ''}
                              onChange={(e) => {
                                const copy = [...promoBanners];
                                copy[idx] = { ...copy[idx], eyebrow: e.target.value };
                                setPromoBanners(copy);
                              }}
                              placeholder="e.g. New collection"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                              Title
                            </label>
                            <input
                              type="text"
                              value={slot.title || ''}
                              onChange={(e) => {
                                const copy = [...promoBanners];
                                copy[idx] = { ...copy[idx], title: e.target.value };
                                setPromoBanners(copy);
                              }}
                              placeholder="e.g. Jewelry & Charm rings"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                              Button Label
                            </label>
                            <input
                              type="text"
                              value={slot.buttonLabel || ''}
                              onChange={(e) => {
                                const copy = [...promoBanners];
                                copy[idx] = { ...copy[idx], buttonLabel: e.target.value };
                                setPromoBanners(copy);
                              }}
                              placeholder="e.g. See more"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                              Links to Category
                            </label>
                            <select
                              value={slot.categoryLink || 'All'}
                              onChange={(e) => {
                                const copy = [...promoBanners];
                                copy[idx] = { ...copy[idx], categoryLink: e.target.value };
                                setPromoBanners(copy);
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                            >
                              <option value="All">All Categories (Full Store)</option>
                              {availableCategories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                              Text Contrast
                            </label>
                            <div className="flex gap-2">
                              <label
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
                                  slot.textContrast !== 'dark'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`contrast-${idx}`}
                                  checked={slot.textContrast !== 'dark'}
                                  onChange={() => {
                                    const copy = [...promoBanners];
                                    copy[idx] = { ...copy[idx], textContrast: 'light' };
                                    setPromoBanners(copy);
                                  }}
                                  className="hidden"
                                />
                                <span>Light (White text)</span>
                              </label>

                              <label
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
                                  slot.textContrast === 'dark'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`contrast-${idx}`}
                                  checked={slot.textContrast === 'dark'}
                                  onChange={() => {
                                    const copy = [...promoBanners];
                                    copy[idx] = { ...copy[idx], textContrast: 'dark' };
                                    setPromoBanners(copy);
                                  }}
                                  className="hidden"
                                />
                                <span>Dark (Black text)</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Promo Banners'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. CUSTOMER REVIEWS ACCORDION ── */}
          <div className="p-4 sm:p-6">
            <button
              type="button"
              onClick={() =>
                setExpandedAdvancedSection(
                  expandedAdvancedSection === 'reviews' ? null : 'reviews'
                )
              }
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Customer Reviews</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        showCustomerReviews
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {showCustomerReviews ? 'Visible on Store' : 'Hidden'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Show verified buyer ratings, customer photo feedback, and quote snippet.
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition">
                {expandedAdvancedSection === 'reviews' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {expandedAdvancedSection === 'reviews' && (
              <div className="mt-5 space-y-4 pt-2 max-w-xl animate-in fade-in duration-200">
                <label className="flex items-center gap-2.5 font-bold text-xs text-slate-800 cursor-pointer p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={showCustomerReviews}
                    onChange={(e) => setShowCustomerReviews(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <span>Show Customer Reviews section on public storefront</span>
                </label>

                {showCustomerReviews && (
                  <div>
                    <label className="font-bold text-slate-800 block mb-1 text-xs">
                      Section Headline / Quote Snippet
                    </label>
                    <input
                      type="text"
                      value={reviewsQuoteSnippet}
                      onChange={(e) => setReviewsQuoteSnippet(e.target.value)}
                      placeholder="e.g. Loved by 2,000+ happy shoppers in Lagos & Abuja"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Buyers can view 5-star ratings, read authentic customer reviews, and submit photos of items they received.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Reviews Setup'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 3. FEATURED PRODUCTS ACCORDION (Pin up to 4) ── */}
          <div className="p-4 sm:p-6">
            <button
              type="button"
              onClick={() =>
                setExpandedAdvancedSection(
                  expandedAdvancedSection === 'featured' ? null : 'featured'
                )
              }
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Featured Products</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {featuredProductIds.length} / 4 pinned
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pin up to 4 top products in a showcase shelf right below your hero banner.
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition">
                {expandedAdvancedSection === 'featured' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {expandedAdvancedSection === 'featured' && (
              <div className="mt-5 space-y-4 pt-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Click items to toggle pin status ({featuredProductIds.length}/4 selected)
                  </span>
                  {featuredProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFeaturedProductIds([])}
                      className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {products.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No products added yet. Add products in the Products tab first!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                    {products.map((p) => {
                      const isSelected = featuredProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isSelected) {
                              setFeaturedProductIds(featuredProductIds.filter((id) => id !== p.id));
                            } else {
                              if (featuredProductIds.length >= 4) {
                                alert('You can only pin up to 4 featured products.');
                                return;
                              }
                              setFeaturedProductIds([...featuredProductIds, p.id]);
                            }
                          }}
                          className={`relative p-2.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-2 ring-purple-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2">
                            {p.images && p.images.length > 0 ? (
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{p.name}</h5>
                            <span className="text-[11px] font-black text-slate-700">
                              ₦{p.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Featured Products'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 4. POPULAR CATEGORIES ACCORDION ── */}
          <div className="p-4 sm:p-6">
            <button
              type="button"
              onClick={() =>
                setExpandedAdvancedSection(
                  expandedAdvancedSection === 'categories' ? null : 'categories'
                )
              }
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Popular Categories</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {popularCategories.length} active
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Highlight category navigation pills at the top of your catalog for instant filtering.
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition">
                {expandedAdvancedSection === 'categories' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {expandedAdvancedSection === 'categories' && (
              <div className="mt-5 space-y-4 pt-2 max-w-xl animate-in fade-in duration-200">
                {/* On / Off Collections Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="pr-4">
                    <span className="font-extrabold text-xs text-slate-800 block">
                      Show Collections Section on Storefront
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Display the "Our Collections" gallery tiles. Turn this off if your store doesn't sell apparel/collections and you want a direct catalog.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showCollections}
                      onChange={(e) => setShowCollections(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <span className="text-xs text-slate-500 block">
                  Select which categories appear as primary pills across your storefront:
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Add products with categories to populate this list.
                    </span>
                  ) : (
                    availableCategories.map((cat) => {
                      const isSelected = popularCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setPopularCategories(popularCategories.filter((c) => c !== cat));
                            } else {
                              setPopularCategories([...popularCategories, cat]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                          <span>{cat}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Categories'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 5. WHY CHOOSE US (Value Promises) ── */}
          <div className="p-4 sm:p-6">
            <button
              type="button"
              onClick={() =>
                setExpandedAdvancedSection(
                  expandedAdvancedSection === 'why' ? null : 'why'
                )
              }
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Why Choose Us</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                      4 Brand Promises
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Customize the 4 core trust promises and guarantees displayed to your buyers.
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition">
                {expandedAdvancedSection === 'why' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {expandedAdvancedSection === 'why' && (
              <div className="mt-5 space-y-4 pt-2 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {whyChooseUs.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5"
                    >
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        Promise #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const copy = [...whyChooseUs];
                          copy[idx] = { ...copy[idx], title: e.target.value };
                          setWhyChooseUs(copy);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        placeholder="e.g. ⚡ Fast Same-Day Dispatch"
                      />
                      <input
                        type="text"
                        value={item.subtitle}
                        onChange={(e) => {
                          const copy = [...whyChooseUs];
                          copy[idx] = { ...copy[idx], subtitle: e.target.value };
                          setWhyChooseUs(copy);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-600"
                        placeholder="e.g. Orders packed and shipped rapidly across Nigeria"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Promises'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS FOR EDITING EACH SECTION ── */}

      {/* 1. HERO MODAL */}
      {activeModal === 'hero' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Hero &amp; Banner Customisation</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Headline Text</label>
                <input
                  type="text"
                  value={heroHeadline}
                  onChange={(e) => setHeroHeadline(e.target.value)}
                  placeholder="e.g. Solar Haven"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="e.g. TASTEFUL PIECES FOR EVERY OCCASION"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Call to Action Button Label</label>
                <input
                  type="text"
                  value={heroCtaText}
                  onChange={(e) => setHeroCtaText(e.target.value)}
                  placeholder="e.g. Shop Now"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Hero Background Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={heroBgColor}
                    onChange={(e) => setHeroBgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={heroBgColor}
                    onChange={(e) => setHeroBgColor(e.target.value)}
                    className="flex-1 px-3 py-2 font-mono text-xs border border-slate-200 rounded-xl uppercase"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Presets:</span>
                  {[
                    { name: 'Terracotta', color: '#a84a32' },
                    { name: 'Midnight', color: '#0f172a' },
                    { name: 'Emerald', color: '#064e3b' },
                    { name: 'Warm Amber', color: '#b45309' },
                    { name: 'Plum', color: '#4c1d95' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setHeroBgColor(p.color)}
                      className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer"
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ABOUT US MODAL */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">About Us &amp; Brand Story</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Section Tagline</label>
                <input
                  type="text"
                  value={aboutTagline}
                  onChange={(e) => setAboutTagline(e.target.value)}
                  placeholder="e.g. OUR STORY"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl uppercase font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Section Heading</label>
                <input
                  type="text"
                  value={aboutTitle}
                  onChange={(e) => setAboutTitle(e.target.value)}
                  placeholder={`e.g. About ${store.name}`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Story Narrative</label>
                <textarea
                  rows={5}
                  value={aboutStory}
                  onChange={(e) => setAboutStory(e.target.value)}
                  placeholder="Tell your customers who you are, how the brand started, your values and standards..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl leading-relaxed font-normal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Story Photo (Founder / Workspace / Storefront)</label>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="about-photo-upload"
                    className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-400 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs group"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-600 transition" />
                    <span>{aboutImageUrl ? 'Change Story Photo' : 'Upload Story Photo from Device'}</span>
                  </label>
                  <input
                    type="file"
                    id="about-photo-upload"
                    accept="image/*"
                    onChange={handleAboutFileUpload}
                    className="hidden"
                  />
                  {aboutImageUrl && (
                    <button
                      type="button"
                      onClick={() => setAboutImageUrl('')}
                      className="p-2 text-slate-400 hover:text-red-600 border border-slate-200 rounded-xl hover:bg-red-50 transition cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {aboutImageUrl && (
                  <div className="mt-2 h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={aboutImageUrl} alt="Story preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BRANDING MODAL */}
      {activeModal === 'branding' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Branding &amp; Visual Identity</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* 1. STORE LOGO (Device Upload Only — No URL) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-extrabold text-slate-900 text-xs block">Store Logo / Profile Avatar</label>
                    <p className="text-[11px] text-slate-500">
                      Shows in storefront header, checkout receipts, and WhatsApp catalog.
                    </p>
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Logo Preview */}
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-xs shrink-0 flex items-center justify-center">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Store logo" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-black text-xl"
                        style={{ backgroundColor: accentColor || '#0f172a' }}
                      >
                        {store.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isUploadingLogo ? 'Uploading from device...' : 'Upload Logo from Device'}</span>
                    </button>
                    {logoUrl && logoUrl !== store.logoUrl && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> New logo ready to save
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. COVER BANNER (Device Upload + Presets Only — No URL) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-extrabold text-slate-900 text-xs block">Cover Hero Banner</label>
                    <p className="text-[11px] text-slate-500">
                      The cinematic background image at the top of your buyer storefront.
                    </p>
                  </div>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Banner Preview */}
                <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner flex items-center justify-center">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Store banner" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center text-white/70"
                      style={{ backgroundColor: accentColor || '#0f172a' }}
                    >
                      <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No cover banner set</span>
                    </div>
                  )}
                  {isUploadingBanner && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverBannerUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isUploadingBanner ? 'Uploading from device...' : 'Upload Banner from Device'}</span>
                    </button>
                    {bannerUrl && bannerUrl !== store.bannerUrl && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> New banner selected
                      </span>
                    )}
                  </div>

                  {/* Preset chips */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Or pick a curated look:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {BRAND_COVER_PRESETS.map((preset) => {
                        const isSelected = bannerUrl === preset.url;
                        return (
                          <button
                            type="button"
                            key={preset.name}
                            onClick={() => setBannerUrl(preset.url)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundImage: `url(${preset.url})`, backgroundSize: 'cover' }}
                            />
                            <span>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. PRIMARY ACCENT & BRAND COLOUR */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                <div>
                  <label className="font-extrabold text-slate-900 text-xs block">Primary Brand / Accent Colour</label>
                  <p className="text-[11px] text-slate-500">
                    Controls storefront action buttons, price badges, and WhatsApp checkout highlights.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-2xs"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-32 px-3 py-2 font-mono font-bold text-xs border border-slate-200 rounded-xl uppercase bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {/* Preset swatches */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['#b45309', '#047857', '#1d4ed8', '#be185d', '#0f172a', '#a84a32'].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setAccentColor(c)}
                        className={`w-6 h-6 rounded-full border border-white shadow-xs cursor-pointer transition-transform ${
                          accentColor.toLowerCase() === c.toLowerCase() ? 'scale-125 ring-2 ring-blue-600' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. THEME & LAYOUT MODAL — Orderly-Inspired 8 Boutique Templates */}
      {activeModal === 'theme' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Store Theme &amp; Layout</h3>
                <p className="text-xs text-slate-500">
                  Select a template to instantly customize your storefront’s colors, typography, and mood.
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {STORE_THEMES.map((t) => {
                const isSelected = themeId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setThemeId(t.id);
                      if (t.id === 'classic') {
                        setFontFamily('sans');
                        setThemeStyle('modern');
                      } else if (t.id === 'margaux' || t.id === 'colette' || t.id === 'aurum') {
                        setFontFamily('serif');
                        setThemeStyle('luxury');
                      } else if (t.id === 'arena') {
                        setFontFamily('grotesk');
                        setThemeStyle('bold');
                      } else if (t.id === 'galactic') {
                        setFontFamily('sans');
                        setThemeStyle('minimal');
                      } else {
                        setFontFamily('sans');
                        setThemeStyle('modern');
                      }
                    }}
                    className={`rounded-2xl border-2 cursor-pointer transition overflow-hidden relative group ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Thumbnail — distinct SVG layout wireframe */}
                    <div className="relative h-36 overflow-hidden bg-slate-100">
                      {THEME_PREVIEWS[t.id]}
                      {/* Hover tooltip */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                          <span className="bg-black/70 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                            Select layout
                          </span>
                        </div>
                      )}
                      {/* Selected overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                          <div className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                            ✓ Active
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Bottom label bar */}
                    <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block leading-tight">{t.name}</span>
                        <span className="text-[10px] text-slate-400">{t.category}</span>
                      </div>
                      {t.badge && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 ml-1 shrink-0">
                          {t.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Theme Choice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TYPOGRAPHY MODAL */}
      {activeModal === 'typography' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Storefront Typography</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'serif' as const,
                  title: 'Editorial Serif (Playfair / Georgia)',
                  sample: 'Solar Haven — Curated for Every Occasion',
                  fontClass: 'font-serif',
                },
                {
                  id: 'sans' as const,
                  title: 'Modern Sans (Inter / System)',
                  sample: 'Solar Haven — Modern, Fast & Seamless Shopping',
                  fontClass: 'font-sans',
                },
                {
                  id: 'grotesk' as const,
                  title: 'Grotesk Contemporary',
                  sample: 'SOLAR HAVEN — BOLD URBAN ESSENTIALS',
                  fontClass: 'font-mono font-bold tracking-tight',
                },
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    fontFamily === f.id
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <h5 className="font-bold text-slate-900 text-sm mb-1">{f.title}</h5>
                  <p className={`text-sm text-slate-700 ${f.fontClass}`}>{f.sample}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. TRUST BADGES MODAL */}
      {activeModal === 'trust' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Trust Guarantees Row</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrustBadges}
                  onChange={(e) => setShowTrustBadges(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Display Trust Guarantees row on storefront</span>
              </label>

              {showTrustBadges && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 1</span>
                    <input
                      type="text"
                      value={badge1Title}
                      onChange={(e) => setBadge1Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge1Sub}
                      onChange={(e) => setBadge1Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 2</span>
                    <input
                      type="text"
                      value={badge2Title}
                      onChange={(e) => setBadge2Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge2Sub}
                      onChange={(e) => setBadge2Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 3</span>
                    <input
                      type="text"
                      value={badge3Title}
                      onChange={(e) => setBadge3Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge3Sub}
                      onChange={(e) => setBadge3Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 4</span>
                    <input
                      type="text"
                      value={badge4Title}
                      onChange={(e) => setBadge4Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge4Sub}
                      onChange={(e) => setBadge4Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PROMO MODAL */}
      {activeModal === 'promo' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Promotional Announcement</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoEnabled}
                  onChange={(e) => setPromoEnabled(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Enable promotional highlight section on storefront</span>
              </label>

              {promoEnabled && (
                <div className="space-y-2 pt-2">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Promo Banner Headline</label>
                    <input
                      type="text"
                      value={promoText}
                      onChange={(e) => setPromoText(e.target.value)}
                      placeholder="e.g. Save big across the collection"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Button CTA Text</label>
                    <input
                      type="text"
                      value={promoCta}
                      onChange={(e) => setPromoCta(e.target.value)}
                      placeholder="e.g. Shop The Sale →"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. CONTACT MODAL */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Contact &amp; Store Location</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">WhatsApp Number</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-600">
                    {store.whatsappCountryCode}
                  </span>
                  <input
                    type="text"
                    disabled
                    value={store.whatsappNumber}
                    className="flex-1 px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">To change phone or email, go to Store Settings tab.</p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Store Physical Location</label>
                <input
                  type="text"
                  disabled
                  value={store.location || 'Online only'}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Navigation Links</label>
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={showNavLinks}
                    onChange={(e) => setShowNavLinks(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Show top navigation tabs (HOME, SHOP, ABOUT, REVIEWS, CONTACT)</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
