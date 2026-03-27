"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Upload, X, Check, Type, Image as ImageIcon } from "lucide-react";

export interface BrandKit {
  logoUrl: string | null;
  primaryColor: string;
  companyName: string;
  tagline: string;
}

const DEFAULT_KIT: BrandKit = {
  logoUrl: null,
  primaryColor: "#4263eb",
  companyName: "",
  tagline: "",
};

const BRAND_KIT_KEY = "doccraft_brand_kit";

export default function BrandKitPanel({ onClose }: { onClose: () => void }) {
  const [kit, setKit] = useState<BrandKit>(DEFAULT_KIT);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BRAND_KIT_KEY);
      if (raw) setKit(JSON.parse(raw));
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(kit));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setKit((k) => ({ ...k, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-6 bg-surface-0 glass rounded-2xl border border-surface-3 shadow-card overflow-hidden animate-fade-in-up">
      <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-brand-500" />
          <h3 className="font-display font-semibold text-ink-0 text-[0.95rem]">Brand Kit</h3>
        </div>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-2 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Logo upload */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Company Logo
          </label>
          <div className="flex items-center gap-3">
            {kit.logoUrl ? (
              <div className="w-12 h-12 rounded-lg border border-surface-3 overflow-hidden bg-surface-1 flex items-center justify-center">
                <img src={kit.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-surface-4 flex items-center justify-center">
                <ImageIcon size={16} className="text-ink-4" />
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink-0 bg-surface-1 hover:bg-surface-2 rounded-lg border border-surface-3 transition-colors"
            >
              <Upload size={12} className="inline mr-1" />
              {kit.logoUrl ? "Replace" : "Upload"}
            </button>
            {kit.logoUrl && (
              <button
                onClick={() => setKit((k) => ({ ...k, logoUrl: null }))}
                className="text-xs text-accent-red hover:underline"
              >
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Company name */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Company Name
          </label>
          <input
            value={kit.companyName}
            onChange={(e) => setKit((k) => ({ ...k, companyName: e.target.value }))}
            placeholder="Acme Corp"
            className="w-full px-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-sm text-ink-0
                       placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Tagline <span className="font-normal normal-case text-ink-3">(optional)</span>
          </label>
          <input
            value={kit.tagline}
            onChange={(e) => setKit((k) => ({ ...k, tagline: e.target.value }))}
            placeholder="Building the future of docs"
            className="w-full px-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-sm text-ink-0
                       placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
          />
        </div>

        {/* Brand color */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Brand Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={kit.primaryColor}
              onChange={(e) => setKit((k) => ({ ...k, primaryColor: e.target.value }))}
              className="w-8 h-8 rounded-lg border border-surface-3 cursor-pointer"
            />
            <input
              value={kit.primaryColor}
              onChange={(e) => setKit((k) => ({ ...k, primaryColor: e.target.value }))}
              className="w-24 px-2 py-1.5 rounded-lg border border-surface-3 bg-surface-1 text-xs font-mono text-ink-1
                         focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {/* Preview swatch */}
            <div className="flex-1 h-8 rounded-lg" style={{ background: kit.primaryColor }} />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-xl
                     hover:bg-brand-800 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
        >
          {saved ? <><Check size={14} /> Saved</> : <><Palette size={14} /> Save Brand Kit</>}
        </button>

        <p className="text-[0.65rem] text-ink-3 text-center">
          Your brand kit will be applied to HTML exports automatically.
        </p>
      </div>
    </div>
  );
}

/** Read the saved brand kit from localStorage */
export function getSavedBrandKit(): BrandKit | null {
  try {
    const raw = localStorage.getItem(BRAND_KIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
