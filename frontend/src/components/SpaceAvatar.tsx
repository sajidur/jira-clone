'use client';

import React from 'react';
import { Project } from '@/types/jira';
import { Icons } from './Icons';

export interface SpaceColorPalette {
  id: string;
  name: string;
  gradient: string;
  solid: string;
  ring: string;
  hex: string;
}

export const SPACE_COLOR_PALETTES: SpaceColorPalette[] = [
  { id: 'blue', name: 'Atlassian Blue', gradient: 'from-[#0052cc] to-[#172B4D]', solid: 'bg-[#0052cc]', ring: 'ring-[#0052cc]', hex: '#0052cc' },
  { id: 'purple', name: 'Amethyst Purple', gradient: 'from-purple-600 to-indigo-800', solid: 'bg-purple-600', ring: 'ring-purple-600', hex: '#6554c0' },
  { id: 'teal', name: 'Teal Lagoon', gradient: 'from-teal-500 to-cyan-700', solid: 'bg-teal-600', ring: 'ring-teal-600', hex: '#00875a' },
  { id: 'emerald', name: 'Emerald Green', gradient: 'from-emerald-500 to-teal-800', solid: 'bg-emerald-600', ring: 'ring-emerald-600', hex: '#36b37e' },
  { id: 'amber', name: 'Warm Amber', gradient: 'from-amber-500 to-orange-600', solid: 'bg-amber-500', ring: 'ring-amber-500', hex: '#ffab00' },
  { id: 'orange', name: 'Sunset Orange', gradient: 'from-orange-500 to-red-600', solid: 'bg-orange-600', ring: 'ring-orange-600', hex: '#ff5630' },
  { id: 'rose', name: 'Berry Magenta', gradient: 'from-pink-500 to-rose-600', solid: 'bg-pink-600', ring: 'ring-pink-600', hex: '#e91e63' },
  { id: 'crimson', name: 'Ruby Crimson', gradient: 'from-red-600 to-rose-700', solid: 'bg-red-600', ring: 'ring-red-600', hex: '#de350b' },
  { id: 'violet', name: 'Electric Violet', gradient: 'from-violet-500 to-fuchsia-600', solid: 'bg-violet-600', ring: 'ring-violet-600', hex: '#8738fd' },
  { id: 'cyan', name: 'Ocean Cyan', gradient: 'from-cyan-500 to-blue-600', solid: 'bg-cyan-600', ring: 'ring-cyan-600', hex: '#00b8d9' },
  { id: 'lime', name: 'Fresh Lime', gradient: 'from-lime-500 to-emerald-600', solid: 'bg-lime-600', ring: 'ring-lime-600', hex: '#57d9a3' },
  { id: 'slate', name: 'Charcoal Slate', gradient: 'from-slate-700 to-slate-900', solid: 'bg-slate-700', ring: 'ring-slate-700', hex: '#42526e' }
];

export interface SpaceIconOption {
  id: string;
  name: string;
  icon?: React.FC<{ className?: string }>;
}

export const SPACE_ICON_LIST: SpaceIconOption[] = [
  { id: 'initials', name: 'Space Key (Letters)' },
  { id: 'rocket', name: 'Rocket', icon: Icons.Rocket },
  { id: 'briefcase', name: 'Briefcase', icon: Icons.Briefcase },
  { id: 'code', name: 'Engineering', icon: Icons.Code },
  { id: 'sparkles', name: 'AI / Innovation', icon: Icons.Sparkles },
  { id: 'folder', name: 'Folder', icon: Icons.Folder },
  { id: 'box', name: 'Package', icon: Icons.Box },
  { id: 'bug', name: 'Bug Tracker', icon: Icons.Bug },
  { id: 'target', name: 'Target', icon: Icons.Target },
  { id: 'zap', name: 'Velocity', icon: Icons.Zap },
  { id: 'globe', name: 'Web', icon: Icons.Globe },
  { id: 'flame', name: 'Priority', icon: Icons.Flame },
  { id: 'layers', name: 'Architecture', icon: Icons.Layers },
  { id: 'shield', name: 'Security', icon: Icons.Shield },
  { id: 'database', name: 'Database', icon: Icons.Database },
  { id: 'cpu', name: 'Core Engine', icon: Icons.Cpu },
  { id: 'compass', name: 'Discovery', icon: Icons.Compass },
  { id: 'users', name: 'Team', icon: Icons.Users },
  { id: 'chart', name: 'Analytics', icon: Icons.BarChart }
];

// Simple deterministic hash for default colors
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface ParsedSpaceAvatar {
  type: 'image' | 'preset';
  imageUrl?: string;
  iconId: string;
  colorId: string;
}

export function parseSpaceAvatar(
  avatarUrl: string | undefined,
  fallbackKey: string = 'SP',
  fallbackId: number = 1
): ParsedSpaceAvatar {
  if (avatarUrl) {
    const trimmed = avatarUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
      return { type: 'image', imageUrl: trimmed, iconId: 'initials', colorId: 'blue' };
    }

    if (trimmed.startsWith('preset:')) {
      const parts = trimmed.split(':');
      const iconId = parts[1] || 'initials';
      const colorId = parts[2] || 'blue';
      return { type: 'preset', iconId, colorId };
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        return {
          type: obj.type === 'image' ? 'image' : 'preset',
          imageUrl: obj.imageUrl,
          iconId: obj.icon || 'initials',
          colorId: obj.color || 'blue'
        };
      } catch {}
    }
  }

  // Deterministic default color based on Space Key
  const colorIndex = hashString(fallbackKey || String(fallbackId)) % SPACE_COLOR_PALETTES.length;
  const defaultColor = SPACE_COLOR_PALETTES[colorIndex]?.id || 'blue';
  return { type: 'preset', iconId: 'initials', colorId: defaultColor };
}

export function encodeSpaceAvatar(iconId: string, colorId: string, imageUrl?: string): string {
  if (imageUrl && imageUrl.trim()) {
    return imageUrl.trim();
  }
  return `preset:${iconId}:${colorId}`;
}

export interface SpaceAvatarProps {
  project?: {
    key?: string;
    id?: number;
    name?: string;
    avatarUrl?: string;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackKey?: string;
}

export const SpaceAvatar: React.FC<SpaceAvatarProps> = ({
  project,
  size = 'sm',
  className = '',
  fallbackKey
}) => {
  const key = project?.key || fallbackKey || 'SP';
  const id = project?.id || 1;
  const parsed = parseSpaceAvatar(project?.avatarUrl, key, id);

  const colorObj =
    SPACE_COLOR_PALETTES.find((c) => c.id === parsed.colorId) ||
    SPACE_COLOR_PALETTES[0];

  const sizeClasses = {
    xs: 'w-5 h-5 rounded text-[10px]',
    sm: 'w-7 h-7 rounded-md text-xs',
    md: 'w-9 h-9 rounded-lg text-sm',
    lg: 'w-12 h-12 rounded-xl text-base',
    xl: 'w-16 h-16 rounded-2xl text-xl'
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }[size];

  if (parsed.type === 'image' && parsed.imageUrl) {
    return (
      <div
        className={`${sizeClasses} overflow-hidden shrink-0 border border-slate-200/80 shadow-2xs bg-slate-100 flex items-center justify-center ${className}`}
      >
        <img
          src={parsed.imageUrl}
          alt={project?.name || key}
          className="w-full h-full object-cover"
          onError={(e) => {
            // fallback if broken image
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Render Preset
  const iconOption = SPACE_ICON_LIST.find((i) => i.id === parsed.iconId);
  const IconComponent = iconOption?.icon;

  return (
    <div
      className={`${sizeClasses} bg-gradient-to-br ${colorObj.gradient} text-white font-black flex items-center justify-center shrink-0 shadow-xs select-none ${className}`}
    >
      {IconComponent && parsed.iconId !== 'initials' ? (
        <IconComponent className={`${iconSizes} text-white`} />
      ) : (
        <span>{key.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
};

// ============================================================================
// Interactive Space Avatar & Color Picker
// ============================================================================
interface SpaceAvatarPickerProps {
  value?: string;
  projectKey: string;
  projectName?: string;
  onChange: (newValue: string) => void;
}

export const SpaceAvatarPicker: React.FC<SpaceAvatarPickerProps> = ({
  value,
  projectKey,
  projectName = 'Space Preview',
  onChange
}) => {
  const parsed = parseSpaceAvatar(value, projectKey);
  const [selectedIcon, setSelectedIcon] = React.useState<string>(parsed.iconId);
  const [selectedColor, setSelectedColor] = React.useState<string>(parsed.colorId);
  const [customImageUrl, setCustomImageUrl] = React.useState<string>(
    parsed.type === 'image' ? parsed.imageUrl || '' : ''
  );
  const [mode, setMode] = React.useState<'preset' | 'custom'>(
    parsed.type === 'image' ? 'custom' : 'preset'
  );

  const handleApplyPreset = (icon: string, color: string) => {
    setSelectedIcon(icon);
    setSelectedColor(color);
    setMode('preset');
    onChange(encodeSpaceAvatar(icon, color));
  };

  const handleApplyCustomUrl = (url: string) => {
    setCustomImageUrl(url);
    if (url.trim()) {
      setMode('custom');
      onChange(url.trim());
    } else {
      setMode('preset');
      onChange(encodeSpaceAvatar(selectedIcon, selectedColor));
    }
  };

  const previewProject = {
    key: projectKey || 'SP',
    name: projectName,
    avatarUrl: mode === 'custom' && customImageUrl ? customImageUrl : encodeSpaceAvatar(selectedIcon, selectedColor)
  };

  return (
    <div className="space-y-4">
      {/* Live Preview Card */}
      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SpaceAvatar project={previewProject} size="lg" />
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>{projectName}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-mono text-slate-600">
                {projectKey || 'KEY'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live preview across Board header, Sidebar, and Space directory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SpaceAvatar project={previewProject} size="md" />
          <SpaceAvatar project={previewProject} size="sm" />
          <SpaceAvatar project={previewProject} size="xs" />
        </div>
      </div>

      {/* Tabs: Choose Icon & Color or Custom Image */}
      <div className="flex items-center border-b border-slate-200 text-xs font-semibold gap-6">
        <button
          type="button"
          onClick={() => {
            setMode('preset');
            onChange(encodeSpaceAvatar(selectedIcon, selectedColor));
          }}
          className={`pb-2 transition cursor-pointer flex items-center gap-1.5 ${
            mode === 'preset'
              ? 'text-[#0052cc] border-b-2 border-[#0052cc]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.Palette className="w-3.5 h-3.5" />
          <span>Icons & Colors</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`pb-2 transition cursor-pointer flex items-center gap-1.5 ${
            mode === 'custom'
              ? 'text-[#0052cc] border-b-2 border-[#0052cc]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.ExternalLink className="w-3.5 h-3.5" />
          <span>Custom Logo URL</span>
        </button>
      </div>

      {mode === 'preset' ? (
        <div className="space-y-4">
          {/* Color Palette Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Color Palette
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {SPACE_COLOR_PALETTES.map((color) => {
                const isSelected = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleApplyPreset(selectedIcon, color.id)}
                    title={color.name}
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color.gradient} transition-transform flex items-center justify-center cursor-pointer shadow-xs ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-[#0052cc] scale-110'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Icons.Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Space Icon / Logo
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-48 overflow-y-auto pr-1">
              {SPACE_ICON_LIST.map((item) => {
                const isSelected = selectedIcon === item.id;
                const IconComp = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleApplyPreset(item.id, selectedColor)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-[#0052cc] bg-blue-50/70 text-[#0052cc] font-semibold ring-1 ring-[#0052cc]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-6 h-6 flex items-center justify-center mb-1">
                      {IconComp ? (
                        <IconComp className="w-4 h-4" />
                      ) : (
                        <span className="font-bold text-xs tracking-tighter">
                          {projectKey.slice(0, 2).toUpperCase() || 'SP'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] truncate w-full">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Custom Logo URL */
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Logo Image URL (HTTPS or Base64 Data URL)
            </label>
            <input
              type="url"
              value={customImageUrl}
              onChange={(e) => handleApplyCustomUrl(e.target.value)}
              placeholder="https://example.com/company-logo.png"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Provide a direct link to a square PNG, SVG, or JPG company icon or product logo.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                handleApplyCustomUrl('');
              }}
              className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
            >
              Clear and reset to Jira preset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
