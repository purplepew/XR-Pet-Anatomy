import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LAYER_VISIBILITY,
  toggleLayerVisibility,
  isolateAnatomicalLayer,
  revealAllAnatomicalLayers,
  exposeInternalVisceraPreset,
  computeLayerRenderDescriptors,
  matchFiducialMatrix,
  clampCalloutPosition,
} from './anatomyState.ts';
import { FLASHCARD_MARKERS, INTERNAL_ORGANS } from '../data/anatomyData.ts';

test('toggleLayerVisibility hides and reveals individual layers independently', () => {
  const afterHideSkin = toggleLayerVisibility(DEFAULT_LAYER_VISIBILITY, 'skin');
  assert.equal(afterHideSkin.skin, false);
  assert.equal(afterHideSkin.muscle, true);
  assert.equal(afterHideSkin.skeleton, true);
  assert.equal(afterHideSkin.organs, true);

  const afterRestoreSkin = toggleLayerVisibility(afterHideSkin, 'skin');
  assert.equal(afterRestoreSkin.skin, true);
});

test('isolateAnatomicalLayer isolates a single layer and restores all when clicked again', () => {
  const isolatedOrgans = isolateAnatomicalLayer(DEFAULT_LAYER_VISIBILITY, 'organs');
  assert.deepEqual(isolatedOrgans, {
    skin: false,
    muscle: false,
    skeleton: false,
    organs: true,
  });

  const restoredAll = isolateAnatomicalLayer(isolatedOrgans, 'organs');
  assert.deepEqual(restoredAll, revealAllAnatomicalLayers());
});

test('exposeInternalVisceraPreset hides exterior skin and muscle while keeping skeleton and organs visible', () => {
  const preset = exposeInternalVisceraPreset();
  assert.equal(preset.skin, false);
  assert.equal(preset.muscle, false);
  assert.equal(preset.skeleton, true);
  assert.equal(preset.organs, true);
});

test('computeLayerRenderDescriptors computes ghosted X-ray opacity and exploded vectors accurately', () => {
  const descriptors = computeLayerRenderDescriptors(DEFAULT_LAYER_VISIBILITY, 0.5, true);
  assert.equal(descriptors.skin.targetOpacity, 0.22);
  assert.equal(descriptors.muscle.targetOpacity, 0.36);
  assert.equal(descriptors.skeleton.targetOpacity, 1.0);
  assert.equal(descriptors.organs.targetOpacity, 1.0);
  assert.ok(descriptors.skin.explodedVector[0] < 0);
  assert.ok(descriptors.organs.explodedVector[0] > 0);
});

test('matchFiducialMatrix recognizes canine and feline flashcard fiducial patterns', () => {
  const dogResult = matchFiducialMatrix(FLASHCARD_MARKERS.dog.fiducialMatrix);
  assert.equal(dogResult.detected, true);
  assert.equal(dogResult.speciesId, 'dog');
  assert.equal(dogResult.markerCode, 'AR-MK-CANIS-01');
  assert.equal(dogResult.confidence, 1);

  const catResult = matchFiducialMatrix(FLASHCARD_MARKERS.cat.fiducialMatrix);
  assert.equal(catResult.detected, true);
  assert.equal(catResult.speciesId, 'cat');
  assert.equal(catResult.markerCode, 'AR-MK-FELIS-02');
  assert.equal(catResult.confidence, 1);

  // Test single-bit optical noise resilience
  const noisyCat = FLASHCARD_MARKERS.cat.fiducialMatrix.map((row) => [...row]);
  noisyCat[0][0] = noisyCat[0][0] === 1 ? 0 : 1;
  const noisyResult = matchFiducialMatrix(noisyCat);
  assert.equal(noisyResult.detected, true);
  assert.equal(noisyResult.speciesId, 'cat');
  assert.equal(noisyResult.hammingDistance, 1);
});

test('clampCalloutPosition keeps floating organ UI card within mobile and desktop viewports', () => {
  const mobileClamp = clampCalloutPosition(380, 50, 390, 844, 300, 200);
  assert.ok(mobileClamp.cardX >= 12);
  assert.ok(mobileClamp.cardX + 300 <= 390 - 12);
  assert.ok(mobileClamp.cardY >= 60);
  assert.ok(mobileClamp.cardY + 200 <= 844 - 350);

  const desktopClamp = clampCalloutPosition(720, 480, 1440, 900, 340, 230);
  assert.ok(desktopClamp.cardY + 230 <= 900 - 320);

  assert.equal(INTERNAL_ORGANS.length, 8);
});
