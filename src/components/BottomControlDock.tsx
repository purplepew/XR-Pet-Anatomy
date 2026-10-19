import React from 'react';
import {
  Eye,
  EyeOff,
  Focus,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Scan,
} from 'lucide-react';
import {
  ANATOMICAL_LAYERS,
  AnatomicalLayerId,
  FLASHCARD_MARKERS,
  INTERNAL_ORGANS,
  PetSpeciesId,
} from '../data/anatomyData.ts';
import {
  isLayerSolelyIsolated,
  LayerVisibilityMap,
} from '../utils/anatomyState.ts';

interface BottomControlDockProps {
  speciesId: PetSpeciesId;
  layerVisibility: LayerVisibilityMap;
  explosionFactor: number;
  xrayCutawayEnabled: boolean;
  selectedOrganId: string | null;
  markerTracked: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleLayer: (layerId: AnatomicalLayerId) => void;
  onIsolateLayer: (layerId: AnatomicalLayerId) => void;
  onRevealAllLayers: () => void;
  onExposeOrgansPreset: () => void;
  onChangeExplosion: (value: number) => void;
  onToggleXray: () => void;
  onSelectOrgan: (organId: string) => void;
  onSwitchSpecies: (species: PetSpeciesId) => void;
  onToggleMarkerTracking: () => void;
  onResetCamera: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  speciesId,
  layerVisibility,
  explosionFactor,
  xrayCutawayEnabled,
  selectedOrganId,
  markerTracked,
  isCollapsed,
  onToggleCollapse,
  onToggleLayer,
  onIsolateLayer,
  onRevealAllLayers,
  onExposeOrgansPreset,
  onChangeExplosion,
  onToggleXray,
  onSelectOrgan,
  onSwitchSpecies,
  onToggleMarkerTracking,
  onResetCamera,
}) => {
  const activeMarker = FLASHCARD_MARKERS[speciesId];
  const visibleCount = Object.values(layerVisibility).filter(Boolean).length;

  return (
    <section
      aria-label="Anatomical layers and WebAR controls"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className="pointer-events-none fixed bottom-2 left-1/2 z-30 w-[96vw] max-w-[940px] -translate-x-1/2"
    >
      {/* Top Collapse / Expand Handle + Active Marker Readout */}
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <div className="pointer-events-auto flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/95 px-2.5 py-1.5 text-xs text-slate-300 shadow-lg">
          <span className="font-mono-tabular font-semibold text-sky-400 whitespace-nowrap shrink-0">
            {activeMarker.markerCode}
          </span>
          <span aria-hidden="true" className="shrink-0">·</span>
          <span className="truncate font-medium text-white whitespace-nowrap">
            {activeMarker.commonName}
          </span>
          <span className="hidden text-slate-400 md:inline shrink-0" aria-hidden="true">
            ·
          </span>
          <span className="hidden italic text-slate-400 md:inline whitespace-nowrap shrink-0">
            {activeMarker.scientificName}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onResetCamera}
            aria-label="Reset 3D camera angle"
            className="flex min-h-[34px] items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/95 px-2.5 py-1 text-xs font-medium text-slate-200 shadow-lg transition-colors hover:border-slate-700 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset View</span>
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Show anatomy controls' : 'Hide anatomy controls'}
            className="flex min-h-[34px] items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/95 px-2.5 py-1 text-xs font-semibold text-slate-100 shadow-lg transition-colors hover:border-slate-600 hover:text-white whitespace-nowrap shrink-0"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="h-4 w-4 text-sky-400" />
                <span>Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 text-sky-400" />
                <span>Hide Controls</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Collapsible Dock Container */}
      {!isCollapsed && (
        <div className="pointer-events-auto rounded-2xl border border-slate-800/95 bg-slate-950/95 p-2.5 shadow-2xl sm:p-3.5">
          {/* Row 1: All Species, Mode, and Slider Controls 100% Visible (Zero Horizontal Clipping) */}
          <div className="flex flex-col gap-2 border-b border-slate-800/90 pb-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:justify-start">
              {/* Species Target Selector */}
              <div
                role="group"
                aria-label="Flashcard species target"
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => onSwitchSpecies('dog')}
                  aria-pressed={speciesId === 'dog'}
                  className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    speciesId === 'dog'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Dog (Canis)
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchSpecies('cat')}
                  aria-pressed={speciesId === 'cat'}
                  className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    speciesId === 'cat'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Cat (Felis)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onExposeOrgansPreset}
                  className="min-h-[32px] rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-sky-400 hover:text-white whitespace-nowrap shrink-0"
                >
                  Peel to Organs
                </button>

                <button
                  type="button"
                  onClick={onRevealAllLayers}
                  disabled={visibleCount === 4}
                  className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Reveal All</span>
                </button>
              </div>
            </div>

            {/* Layer Separation Slider + X-Ray Ghosting + Marker Test */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="explosion-slider"
                  className="text-[11px] sm:text-xs font-medium text-slate-300 whitespace-nowrap"
                >
                  Layer Separation:{' '}
                  <span className="font-mono-tabular text-sky-400">
                    {Math.round(explosionFactor * 100)}%
                  </span>
                </label>
                <input
                  id="explosion-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(explosionFactor * 100)}
                  onChange={(e) => onChangeExplosion(Number(e.target.value) / 100)}
                  className="h-2 w-24 cursor-pointer accent-sky-400 sm:w-28"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleXray}
                  aria-pressed={xrayCutawayEnabled}
                  className={`min-h-[32px] rounded-xl border px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    xrayCutawayEnabled
                      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  X-Ray: {xrayCutawayEnabled ? 'On' : 'Off'}
                </button>

                <button
                  type="button"
                  onClick={onToggleMarkerTracking}
                  aria-pressed={!markerTracked}
                  className={`flex min-h-[32px] items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    markerTracked
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                      : 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  }`}
                >
                  <Scan className="h-3.5 w-3.5" />
                  <span>{markerTracked ? 'Rescan' : 'Lock'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: 4 Separable Anatomical Layer Cards (Hide / Reveal + Isolate) */}
          <div
            role="group"
            aria-label="Anatomical layer visibility and isolation controls"
            className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2"
          >
            {ANATOMICAL_LAYERS.map((layer) => {
              const isVisible = layerVisibility[layer.id];
              const isIsolated = isLayerSolelyIsolated(layerVisibility, layer.id);

              return (
                <div
                  key={layer.id}
                  data-testid={`layer-card-${layer.id}`}
                  data-visible={isVisible ? 'true' : 'false'}
                  className={`flex flex-col justify-between rounded-xl border p-2 transition-colors ${
                    isVisible
                      ? 'border-slate-700/90 bg-slate-900/90'
                      : 'border-slate-800/60 bg-slate-950/60 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: layer.accentHex }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-display text-xs font-semibold text-white">
                        {layer.label}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-[10px] text-slate-400 shrink-0">
                      {isIsolated ? 'ISOLATED' : isVisible ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1">
                    {/* Hide / Reveal Toggle Button */}
                    <button
                      type="button"
                      onClick={() => onToggleLayer(layer.id)}
                      aria-pressed={isVisible}
                      aria-label={`${isVisible ? 'Hide' : 'Reveal'} ${layer.label}`}
                      className={`flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        isVisible
                          ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isVisible ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-sky-400" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                          <span>Reveal</span>
                        </>
                      )}
                    </button>

                    {/* Isolate Layer Button */}
                    <button
                      type="button"
                      onClick={() => onIsolateLayer(layer.id)}
                      aria-pressed={isIsolated}
                      aria-label={`Isolate ${layer.label}`}
                      className={`flex min-h-[34px] items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        isIsolated
                          ? 'border-sky-400 bg-sky-500 text-slate-950'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <Focus className="h-3.5 w-3.5" />
                      <span>Isolate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 3: All 8 Internal Organs Visible in 4x2 Grid on Mobile (Zero Horizontal Clipping) */}
          <div className="mt-2 border-t border-slate-800/90 pt-2">
            <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
              {INTERNAL_ORGANS.map((organ) => {
                const isSelected = selectedOrganId === organ.id;
                return (
                  <button
                    key={organ.id}
                    type="button"
                    onClick={() => onSelectOrgan(organ.id)}
                    aria-pressed={isSelected}
                    aria-label={`Inspect ${organ.name}`}
                    className={`flex min-h-[32px] items-center justify-center sm:justify-start gap-1.5 rounded-lg border px-2 py-1 text-[11px] sm:text-xs font-medium transition-colors truncate ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/20 text-white font-semibold'
                        : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-xs"
                      style={{ backgroundColor: organ.highlightHex }}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {organ.id === 'intestines' ? 'Intestines' : organ.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
