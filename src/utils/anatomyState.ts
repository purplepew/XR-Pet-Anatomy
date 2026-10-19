import {
  ANATOMICAL_LAYERS,
  FLASHCARD_MARKERS,
} from '../data/anatomyData.ts';
import type {
  AnatomicalLayerId,
  PetSpeciesId,
} from '../data/anatomyData.ts';

export type LayerVisibilityMap = Record<AnatomicalLayerId, boolean>;

export interface LayerRenderDescriptor {
  id: AnatomicalLayerId;
  visible: boolean;
  targetOpacity: number;
  targetScaleOffset: number;
  explodedVector: [number, number, number];
  isIsolated: boolean;
}

export interface MarkerDetectionResult {
  detected: boolean;
  speciesId: PetSpeciesId | null;
  markerCode: string | null;
  confidence: number;
  hammingDistance: number;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibilityMap = {
  skin: true,
  muscle: true,
  skeleton: true,
  organs: true,
};

/**
 * Toggles a single anatomical layer's visibility while guaranteeing at least one
 * layer remains active or allowing full user toggle control.
 */
export function toggleLayerVisibility(
  current: LayerVisibilityMap,
  layerId: AnatomicalLayerId
): LayerVisibilityMap {
  return {
    ...current,
    [layerId]: !current[layerId],
  };
}

/**
 * Isolates a specific anatomical layer (hides all other layers).
 * If the specified layer is already the ONLY visible layer, reveals all layers.
 */
export function isolateAnatomicalLayer(
  current: LayerVisibilityMap,
  layerId: AnatomicalLayerId
): LayerVisibilityMap {
  const isAlreadyIsolated = isLayerSolelyIsolated(current, layerId);
  if (isAlreadyIsolated) {
    return revealAllAnatomicalLayers();
  }
  return {
    skin: layerId === 'skin',
    muscle: layerId === 'muscle',
    skeleton: layerId === 'skeleton',
    organs: layerId === 'organs',
  };
}

/**
 * Returns true if `layerId` is the sole visible anatomical layer.
 */
export function isLayerSolelyIsolated(
  current: LayerVisibilityMap,
  layerId: AnatomicalLayerId
): boolean {
  const activeIds = ANATOMICAL_LAYERS.map((l) => l.id).filter((id) => current[id]);
  return activeIds.length === 1 && activeIds[0] === layerId;
}

/**
 * Reveals all 4 anatomical layers simultaneously.
 */
export function revealAllAnatomicalLayers(): LayerVisibilityMap {
  return {
    skin: true,
    muscle: true,
    skeleton: true,
    organs: true,
  };
}

/**
 * Peels back Exterior Skin and Muscular System so Skeletal Structure & Internal Organs
 * are directly exposed for touch raycasting.
 */
export function exposeInternalVisceraPreset(): LayerVisibilityMap {
  return {
    skin: false,
    muscle: false,
    skeleton: true,
    organs: true,
  };
}

/**
 * Computes the effective opacity and exploded-view spatial offset for each of the 4 layers.
 * When X-Ray Cutaway mode is active and deeper layers are also enabled, outer layers
 * automatically become semi-translucent so deeper structures remain visible inside.
 */
export function computeLayerRenderDescriptors(
  visibility: LayerVisibilityMap,
  explosionFactor: number,
  xrayCutawayEnabled: boolean
): Record<AnatomicalLayerId, LayerRenderDescriptor> {
  const clampedExplosion = Math.max(0, Math.min(1, explosionFactor));

  const hasDeeperThanSkin = visibility.muscle || visibility.skeleton || visibility.organs;
  const hasDeeperThanMuscle = visibility.skeleton || visibility.organs;

  const skinOpacity = !visibility.skin
    ? 0
    : xrayCutawayEnabled && hasDeeperThanSkin
      ? 0.22
      : 1.0;

  const muscleOpacity = !visibility.muscle
    ? 0
    : xrayCutawayEnabled && hasDeeperThanMuscle
      ? 0.36
      : 1.0;

  const skeletonOpacity = !visibility.skeleton ? 0 : 1.0;
  const organsOpacity = !visibility.organs ? 0 : 1.0;

  return {
    skin: {
      id: 'skin',
      visible: visibility.skin,
      targetOpacity: skinOpacity,
      targetScaleOffset: 1 + clampedExplosion * 0.04,
      explodedVector: [-clampedExplosion * 0.85, clampedExplosion * 0.28, 0],
      isIsolated: isLayerSolelyIsolated(visibility, 'skin'),
    },
    muscle: {
      id: 'muscle',
      visible: visibility.muscle,
      targetOpacity: muscleOpacity,
      targetScaleOffset: 1 + clampedExplosion * 0.02,
      explodedVector: [-clampedExplosion * 0.32, clampedExplosion * 0.14, 0],
      isIsolated: isLayerSolelyIsolated(visibility, 'muscle'),
    },
    skeleton: {
      id: 'skeleton',
      visible: visibility.skeleton,
      targetOpacity: skeletonOpacity,
      targetScaleOffset: 1.0,
      explodedVector: [clampedExplosion * 0.32, clampedExplosion * 0.14, 0],
      isIsolated: isLayerSolelyIsolated(visibility, 'skeleton'),
    },
    organs: {
      id: 'organs',
      visible: visibility.organs,
      targetOpacity: organsOpacity,
      targetScaleOffset: 1.0,
      explodedVector: [clampedExplosion * 0.85, clampedExplosion * 0.28, 0],
      isIsolated: isLayerSolelyIsolated(visibility, 'organs'),
    },
  };
}

/**
 * Compares a sampled 4x4 binary fiducial grid against known flashcard marker matrices
 * (Canine AR-MK-CANIS-01 and Feline AR-MK-FELIS-02) using Hamming distance.
 */
export function matchFiducialMatrix(sampledGrid: number[][]): MarkerDetectionResult {
  if (
    !sampledGrid ||
    sampledGrid.length !== 4 ||
    sampledGrid.some((row) => !row || row.length !== 4)
  ) {
    return {
      detected: false,
      speciesId: null,
      markerCode: null,
      confidence: 0,
      hammingDistance: 16,
    };
  }

  let bestSpecies: PetSpeciesId | null = null;
  let bestCode: string | null = null;
  let minDistance = 16;

  const speciesList: PetSpeciesId[] = ['dog', 'cat'];
  for (const speciesId of speciesList) {
    const spec = FLASHCARD_MARKERS[speciesId];
    let distance = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const expected = spec.fiducialMatrix[r][c] ? 1 : 0;
        const actual = sampledGrid[r][c] ? 1 : 0;
        if (expected !== actual) {
          distance++;
        }
      }
    }
    if (distance < minDistance) {
      minDistance = distance;
      bestSpecies = speciesId;
      bestCode = spec.markerCode;
    }
  }

  // Allow up to 2 bit errors out of 16 for optical noise tolerance
  const detected = minDistance <= 2 && bestSpecies !== null;
  const confidence = detected ? Number(((16 - minDistance) / 16).toFixed(2)) : 0;

  return {
    detected,
    speciesId: detected ? bestSpecies : null,
    markerCode: detected ? bestCode : null,
    confidence,
    hammingDistance: minDistance,
  };
}

/**
 * Clamps a 2D projected world-to-screen callout card coordinate so the floating
 * organ card stays within safe viewport bounds on both mobile (390x844) and desktop (1440x900).
 */
export function clampCalloutPosition(
  projectedX: number,
  projectedY: number,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth = 310,
  cardHeight = 220
): { cardX: number; cardY: number; anchorX: number; anchorY: number } {
  const isMobile = viewportWidth < 640;
  const safeMarginX = isMobile ? 12 : 20;
  const safeTop = isMobile ? 104 : 72;
  // Reserve 320px at bottom on desktop and 340px on mobile for the bottom control dock
  const bottomDockClearance = isMobile ? 340 : 320;
  const safeBottom = Math.max(
    safeTop + cardHeight + 8,
    viewportHeight - bottomDockClearance
  );

  const anchorX = Math.max(0, Math.min(viewportWidth, projectedX));
  const anchorY = Math.max(0, Math.min(viewportHeight, projectedY));

  if (isMobile) {
    // On mobile viewports, center the compact floating card cleanly below the top AR camera bar
    const cardX = Math.max(
      safeMarginX,
      Math.round((viewportWidth - cardWidth) * 0.5)
    );
    const cardY = safeTop;
    return {
      cardX,
      cardY,
      anchorX: Math.round(anchorX),
      anchorY: Math.round(anchorY),
    };
  }

  // On desktop, place the floating card to the right or left of the 3D specimen in the upper viewport
  const desiredX =
    anchorX > viewportWidth * 0.58
      ? anchorX - cardWidth - 48
      : anchorX + 56;
  const desiredY = Math.min(anchorY - cardHeight * 0.5, safeBottom - cardHeight);

  const maxCardX = Math.max(safeMarginX, viewportWidth - cardWidth - safeMarginX);
  const cardX = Math.max(safeMarginX, Math.min(maxCardX, desiredX));
  const cardY = Math.max(safeTop, Math.min(safeBottom - cardHeight, desiredY));

  return {
    cardX: Math.round(cardX),
    cardY: Math.round(cardY),
    anchorX: Math.round(anchorX),
    anchorY: Math.round(anchorY),
  };
}
