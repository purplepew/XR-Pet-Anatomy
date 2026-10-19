import React, { useState, useCallback } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import {
  AnatomicalLayerId,
  INTERNAL_ORGANS,
  PetSpeciesId,
} from './data/anatomyData.ts';
import {
  DEFAULT_LAYER_VISIBILITY,
  exposeInternalVisceraPreset,
  isolateAnatomicalLayer,
  LayerVisibilityMap,
  revealAllAnatomicalLayers,
  toggleLayerVisibility,
} from './utils/anatomyState.ts';
import { WebARViewport } from './components/WebARViewport.tsx';
import { OrganFloatingCard } from './components/OrganFloatingCard.tsx';
import { BottomControlDock } from './components/BottomControlDock.tsx';
import { FlashcardModal } from './components/FlashcardModal.tsx';

export function App() {
  const [speciesId, setSpeciesId] = useState<PetSpeciesId>('dog');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityMap>(
    DEFAULT_LAYER_VISIBILITY
  );
  const [explosionFactor, setExplosionFactor] = useState<number>(0);
  const [xrayCutawayEnabled, setXrayCutawayEnabled] = useState<boolean>(true);
  const [selectedOrganId, setSelectedOrganId] = useState<string | null>(null);
  const [projectedOrganPos, setProjectedOrganPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  const [markerTracked, setMarkerTracked] = useState<boolean>(true);
  const [cameraStreamActive, setCameraStreamActive] = useState<boolean>(false);
  const [cameraBannerMessage, setCameraBannerMessage] = useState<string | null>(
    null
  );
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] =
    useState<boolean>(false);
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);

  const handleToggleLayer = useCallback((layerId: AnatomicalLayerId) => {
    setLayerVisibility((prev) => toggleLayerVisibility(prev, layerId));
  }, []);

  const handleIsolateLayer = useCallback((layerId: AnatomicalLayerId) => {
    setLayerVisibility((prev) => isolateAnatomicalLayer(prev, layerId));
    if (layerId !== 'organs') {
      setSelectedOrganId(null);
    }
  }, []);

  const handleRevealAllLayers = useCallback(() => {
    setLayerVisibility(revealAllAnatomicalLayers());
  }, []);

  const handleExposeOrgansPreset = useCallback(() => {
    setLayerVisibility(exposeInternalVisceraPreset());
    setSelectedOrganId((prev) => prev ?? 'heart');
  }, []);

  const handleSelectOrgan = useCallback((organId: string | null) => {
    setSelectedOrganId(organId);
    if (organId) {
      // Ensure Internal Organs layer is visible when inspecting a specific organ
      setLayerVisibility((prev) =>
        prev.organs ? prev : { ...prev, organs: true }
      );
    }
  }, []);

  const handleSwitchSpecies = useCallback((nextSpecies: PetSpeciesId) => {
    setSpeciesId(nextSpecies);
    setMarkerTracked(true);
  }, []);

  const handleOpticalMarkerDetected = useCallback(
    (detectedSpecies: PetSpeciesId) => {
      setSpeciesId(detectedSpecies);
      setMarkerTracked(true);
    },
    []
  );

  const handleCameraError = useCallback((message: string) => {
    setCameraStreamActive(false);
    setCameraBannerMessage(message);
  }, []);

  const selectedOrgan = INTERNAL_ORGANS.find((o) => o.id === selectedOrganId) ?? null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="relative z-30 flex h-13 shrink-0 items-center justify-between gap-8 border-b border-slate-800/90 bg-slate-950/95 px-4 sm:px-6">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setCameraResetTrigger((c) => c + 1);
          }}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Animar
        </a>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav
          aria-label="WebAR quick navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => handleSwitchSpecies('dog')}
            className={`transition-colors hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0 ${
              speciesId === 'dog' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Canine Marker
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSpecies('cat')}
            className={`transition-colors hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0 ${
              speciesId === 'cat' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Feline Marker
          </button>
          <button
            type="button"
            onClick={handleExposeOrgansPreset}
            className="transition-colors hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            Expose Viscera
          </button>
          <button
            type="button"
            onClick={() => setIsFlashcardModalOpen(true)}
            className="transition-colors hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            Flashcard Targets
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Button (Initialize / Toggle Live AR Camera) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCameraBannerMessage(null);
              setCameraStreamActive((prev) => !prev);
            }}
            aria-pressed={cameraStreamActive}
            className={`flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              cameraStreamActive
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {cameraStreamActive ? (
              <>
                <CameraOff className="h-3.5 w-3.5" />
                <span>Stop Camera</span>
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" />
                <span>Live AR Camera</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Optional Non-Intrusive Camera Fallback Notice + Flashcard Modal Trigger on Mobile */}
      {cameraBannerMessage && (
        <div
          role="status"
          className="relative z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-2 text-xs text-slate-300"
        >
          <span>{cameraBannerMessage}</span>
          <button
            type="button"
            onClick={() => setCameraBannerMessage(null)}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Full-Viewport 3D WebAR Stage */}
      <main className="relative flex-1 overflow-hidden">
        <WebARViewport
          speciesId={speciesId}
          layerVisibility={layerVisibility}
          explosionFactor={explosionFactor}
          xrayCutawayEnabled={xrayCutawayEnabled}
          selectedOrganId={selectedOrganId}
          markerTracked={markerTracked}
          cameraStreamActive={cameraStreamActive}
          cameraResetTrigger={cameraResetTrigger}
          onSelectOrgan={handleSelectOrgan}
          onProjectedOrganMove={setProjectedOrganPos}
          onViewportResize={setViewportSize}
          onOpticalMarkerDetected={handleOpticalMarkerDetected}
          onReacquireMarker={() => setMarkerTracked(true)}
          onCameraError={handleCameraError}
        />

        {/* Floating Organ Bio-Card (Displayed when an Exposed Internal Organ is Selected) */}
        {selectedOrgan && markerTracked && layerVisibility.organs && (
          <OrganFloatingCard
            organ={selectedOrgan}
            speciesId={speciesId}
            projectedPos={projectedOrganPos}
            viewportSize={viewportSize}
            onClose={() => setSelectedOrganId(null)}
            onSelectOrgan={(id) => handleSelectOrgan(id)}
          />
        )}

        {/* Unified Bottom Control Dock */}
        <BottomControlDock
          speciesId={speciesId}
          layerVisibility={layerVisibility}
          explosionFactor={explosionFactor}
          xrayCutawayEnabled={xrayCutawayEnabled}
          selectedOrganId={selectedOrganId}
          markerTracked={markerTracked}
          isCollapsed={isDockCollapsed}
          onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
          onToggleLayer={handleToggleLayer}
          onIsolateLayer={handleIsolateLayer}
          onRevealAllLayers={handleRevealAllLayers}
          onExposeOrgansPreset={handleExposeOrgansPreset}
          onChangeExplosion={setExplosionFactor}
          onToggleXray={() => setXrayCutawayEnabled((prev) => !prev)}
          onSelectOrgan={(id) => handleSelectOrgan(id)}
          onSwitchSpecies={handleSwitchSpecies}
          onToggleMarkerTracking={() => setMarkerTracked((prev) => !prev)}
          onResetCamera={() => setCameraResetTrigger((c) => c + 1)}
        />
      </main>

      {/* Physical Flashcard Fiducial Deck Modal */}
      <FlashcardModal
        isOpen={isFlashcardModalOpen}
        activeSpecies={speciesId}
        onSelectSpeciesCard={handleSwitchSpecies}
        onClose={() => setIsFlashcardModalOpen(false)}
      />
    </div>
  );
}

export default App;
