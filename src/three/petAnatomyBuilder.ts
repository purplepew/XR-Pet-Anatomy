import * as THREE from 'three';
import {
  AnatomicalLayerId,
  FLASHCARD_MARKERS,
  INTERNAL_ORGANS,
  PetSpeciesId,
} from '../data/anatomyData.ts';

export interface BuiltPetAnatomyScene {
  rootGroup: THREE.Group;
  flashcardGroup: THREE.Group;
  petAnchorGroup: THREE.Group;
  layerGroups: Record<AnatomicalLayerId, THREE.Group>;
  layerMaterials: Record<AnatomicalLayerId, THREE.MeshStandardMaterial[]>;
  organGroups: Record<string, THREE.Group>;
  organMeshes: THREE.Mesh[];
  organMaterials: Record<string, THREE.MeshStandardMaterial>;
  heartGroup: THREE.Group | null;
  lungsGroup: THREE.Group | null;
  dispose: () => void;
}

/**
 * Generates a procedural tileable grayscale bump texture for organic micro-relief
 * (fur coat follicles or striated skeletal muscle fibers).
 */
function createOrganicBumpTexture(mode: 'fur' | 'muscle'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    if (mode === 'muscle') {
      for (let y = 0; y < 256; y += 3) {
        const shade = 110 + Math.floor(Math.sin(y * 0.35) * 35);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(0, y, 256, 2);
      }
      for (let i = 0; i < 180; i++) {
        const x = (i * 47) % 256;
        const y = (i * 83) % 256;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(x, y, 36, 1);
      }
    } else {
      for (let i = 0; i < 600; i++) {
        const x = (i * 73) % 256;
        const y = (i * 41) % 256;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(220,220,220,0.22)' : 'rgba(40,40,40,0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8, y + 3);
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Generates a high-contrast physical AR Flashcard texture with a real 4x4 fiducial marker,
 * corner registration brackets, and taxonomic typography.
 */
export function createFlashcardMarkerTexture(
  speciesId: PetSpeciesId,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const spec = FLASHCARD_MARKERS[speciesId];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Card matte base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 720);

    // Outer technical frame
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 976, 672);

    // Inner subtle grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 2;
    for (let x = 64; x < 960; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 28);
      ctx.lineTo(x, 692);
      ctx.stroke();
    }
    for (let y = 64; y < 680; y += 64) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(996, y);
      ctx.stroke();
    }

    // Corner optical L-brackets
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 12;
    const bLen = 58;
    const corners: Array<[number, number, number, number]> = [
      [44, 44, 1, 1],
      [980, 44, -1, 1],
      [44, 676, 1, -1],
      [980, 676, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * bLen);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * bLen, cy);
      ctx.stroke();
    }

    // Left zone: High-contrast 4x4 Fiducial Marker inside quiet zone
    const markerX = 82;
    const markerY = 140;
    const markerSize = 440;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(markerX - 20, markerY - 20, markerSize + 40, markerSize + 40);

    // Black fiducial border
    ctx.fillStyle = '#020617';
    ctx.fillRect(markerX, markerY, markerSize, markerSize);

    const cellSize = (markerSize - 80) / 4;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const bit = spec.fiducialMatrix[r][c];
        ctx.fillStyle = bit === 1 ? '#020617' : '#ffffff';
        ctx.fillRect(
          markerX + 40 + c * cellSize,
          markerY + 40 + r * cellSize,
          cellSize,
          cellSize
        );
      }
    }

    // Right zone: Flashcard Taxonomic Header & Anatomical Key
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 24px "IBM Plex Mono", monospace';
    ctx.fillText(`FIDUCIAL ID: ${spec.markerCode}`, 570, 165);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 50px "Outfit", sans-serif';
    ctx.fillText(spec.commonName.toUpperCase(), 570, 235);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(spec.scientificName, 570, 282);

    // Divider line
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(570, 312, 370, 3);

    // Vital specs on card
    ctx.font = '500 22px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`HR: ${spec.restingHeartRateBpm}`, 570, 365);
    ctx.fillText(`RR: ${spec.respiratoryRateBpm}`, 570, 405);
    ctx.fillText(`TEMP: ${spec.bodyTempCelsius}`, 570, 445);
    ctx.fillText(`SPINE: ${spec.vertebralFormula}`, 570, 485);

    // Anchor target crosshair at center-right
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(755, 565, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(715, 565);
    ctx.lineTo(795, 565);
    ctx.moveTo(755, 525);
    ctx.lineTo(755, 605);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the complete multi-layered 3D Pet Anatomy Scene (Flashcard Base + Exterior Skin +
 * Muscular System + Skeletal Structure + 8 Raycastable Internal Organs).
 */
export function buildPetAnatomyScene(
  speciesId: PetSpeciesId,
  maxAnisotropy = 4
): BuiltPetAnatomyScene {
  const isCat = speciesId === 'cat';
  const scaleY = isCat ? 0.84 : 1.0;
  const scaleZ = isCat ? 0.88 : 1.0;
  const scaleX = isCat ? 0.86 : 1.0;

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const rootGroup = new THREE.Group();
  rootGroup.name = `AnimarRoot_${speciesId}`;

  // ---------------------------------------------------------------------------
  // 1. PHYSICAL AR FLASHCARD BASE (Y = 0 plane)
  // ---------------------------------------------------------------------------
  const flashcardGroup = new THREE.Group();
  flashcardGroup.name = 'FlashcardAnchorBase';
  rootGroup.add(flashcardGroup);

  const cardTex = track(createFlashcardMarkerTexture(speciesId, maxAnisotropy));
  const cardGeo = track(new THREE.BoxGeometry(2.8, 0.03, 1.98));
  const cardTopMat = track(
    new THREE.MeshStandardMaterial({
      map: cardTex,
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.1,
    })
  );
  const cardEdgeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
    })
  );
  const cardMesh = new THREE.Mesh(cardGeo, [
    cardEdgeMat,
    cardEdgeMat,
    cardTopMat,
    cardEdgeMat,
    cardEdgeMat,
    cardEdgeMat,
  ]);
  cardMesh.position.set(0, -0.015, 0);
  cardMesh.receiveShadow = true;
  flashcardGroup.add(cardMesh);

  // Corner AR tracking brackets floating slightly above the card
  const bracketMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.5,
    })
  );
  const bracketCorners: Array<[number, number]> = [
    [-1.32, -0.91],
    [1.32, -0.91],
    [-1.32, 0.91],
    [1.32, 0.91],
  ];
  for (const [bx, bz] of bracketCorners) {
    const cornerPost = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.025, 0.14)),
      bracketMat
    );
    cornerPost.position.set(bx, 0.018, bz);
    flashcardGroup.add(cornerPost);
  }

  // Soft radial contact shadow disc on top of flashcard (disjoint Y + 0.012, depthWrite: false)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.68)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const contactShadowTex = track(new THREE.CanvasTexture(shadowCanvas));
  const contactShadowMat = track(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const contactShadowMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(2.1, 1.35)),
    contactShadowMat
  );
  contactShadowMesh.rotation.x = -Math.PI / 2;
  contactShadowMesh.position.set(0, 0.008, 0);
  flashcardGroup.add(contactShadowMesh);

  // Holographic base ring around the anchored specimen
  const ringGeo = track(new THREE.RingGeometry(0.95, 1.01, 64));
  const ringMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.set(0, 0.012, 0);
  flashcardGroup.add(ringMesh);

  // ---------------------------------------------------------------------------
  // 2. PET ANATOMY ANCHOR GROUP (4 Separable Anatomical Layers)
  // ---------------------------------------------------------------------------
  const petAnchorGroup = new THREE.Group();
  petAnchorGroup.name = 'PetAnchorGroup';
  rootGroup.add(petAnchorGroup);

  const layerGroups: Record<AnatomicalLayerId, THREE.Group> = {
    skin: new THREE.Group(),
    muscle: new THREE.Group(),
    skeleton: new THREE.Group(),
    organs: new THREE.Group(),
  };
  layerGroups.skin.name = 'Layer_Skin';
  layerGroups.muscle.name = 'Layer_Muscle';
  layerGroups.skeleton.name = 'Layer_Skeleton';
  layerGroups.organs.name = 'Layer_Organs';

  petAnchorGroup.add(layerGroups.skin);
  petAnchorGroup.add(layerGroups.muscle);
  petAnchorGroup.add(layerGroups.skeleton);
  petAnchorGroup.add(layerGroups.organs);

  const layerMaterials: Record<AnatomicalLayerId, THREE.MeshStandardMaterial[]> = {
    skin: [],
    muscle: [],
    skeleton: [],
    organs: [],
  };

  // ===========================================================================
  // LAYER 1: EXTERIOR SKIN (Integumentary Coat, Head, Ears, Limbs, Tail)
  // ===========================================================================
  const furBump = track(createOrganicBumpTexture('fur'));
  const skinPrimaryMat = track(
    new THREE.MeshPhysicalMaterial({
      color: isCat ? 0x64748b : 0xd97706, // Russian Blue-Gray Feline vs Golden Amber Canine
      roughness: 0.72,
      metalness: 0.04,
      sheen: 0.45,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(isCat ? 0xcbd5e1 : 0xfef3c7),
      bumpMap: furBump,
      bumpScale: 0.015,
      transparent: true,
      opacity: 1.0,
      side: THREE.FrontSide,
    })
  );
  const skinAccentMat = track(
    new THREE.MeshStandardMaterial({
      color: isCat ? 0x334155 : 0x78350f, // Darker muzzle/ear/paw trim
      roughness: 0.48,
      metalness: 0.08,
      transparent: true,
      opacity: 1.0,
    })
  );
  const noseEyesMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.18,
      metalness: 0.2,
      transparent: true,
      opacity: 1.0,
    })
  );
  layerMaterials.skin.push(skinPrimaryMat, skinAccentMat, noseEyesMat);

  // Sculpted Torso & Chest (Primary Silhouette)
  const skinThorax = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(0.36 * scaleX, 0.72 * scaleZ, 16, 24)),
    skinPrimaryMat
  );
  skinThorax.rotation.x = Math.PI / 2;
  skinThorax.position.set(0, 0.96 * scaleY, 0.08 * scaleZ);
  skinThorax.scale.set(1.0, 1.0, 1.12);
  skinThorax.castShadow = true;
  layerGroups.skin.add(skinThorax);

  const skinAbdomen = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.32 * scaleX, 24, 18)),
    skinPrimaryMat
  );
  skinAbdomen.scale.set(0.95, 0.92, 1.45);
  skinAbdomen.position.set(0, 0.94 * scaleY, -0.34 * scaleZ);
  layerGroups.skin.add(skinAbdomen);

  // Neck & Cranium
  const skinNeck = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(0.22 * scaleX, 0.34 * scaleY, 12, 18)),
    skinPrimaryMat
  );
  skinNeck.position.set(0, 1.24 * scaleY, 0.56 * scaleZ);
  skinNeck.rotation.x = -0.45;
  layerGroups.skin.add(skinNeck);

  const skinHead = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.25 * scaleX, 24, 20)),
    skinPrimaryMat
  );
  skinHead.scale.set(1.0, 0.96, isCat ? 1.05 : 1.18);
  skinHead.position.set(0, 1.45 * scaleY, 0.78 * scaleZ);
  layerGroups.skin.add(skinHead);

  // Muzzle & Rhinarium (Nose)
  const muzzleLen = isCat ? 0.14 : 0.26;
  const skinMuzzle = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(0.11 * scaleX, muzzleLen, 12, 16)),
    skinAccentMat
  );
  skinMuzzle.rotation.x = Math.PI / 2 + 0.12;
  skinMuzzle.position.set(0, 1.39 * scaleY, (isCat ? 0.96 : 1.04) * scaleZ);
  layerGroups.skin.add(skinMuzzle);

  const skinNose = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.048 * scaleX, 14, 14)),
    noseEyesMat
  );
  skinNose.position.set(0, 1.42 * scaleY, (isCat ? 1.06 : 1.20) * scaleZ);
  layerGroups.skin.add(skinNose);

  // Left & Right Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.036 * scaleX, 14, 14)),
      noseEyesMat
    );
    eye.position.set(side * 0.12 * scaleX, 1.49 * scaleY, 0.93 * scaleZ);
    layerGroups.skin.add(eye);

    // Pinnae (Ears)
    const earGeo = track(new THREE.ConeGeometry(0.085 * scaleX, isCat ? 0.22 : 0.24, 12));
    const ear = new THREE.Mesh(earGeo, skinAccentMat);
    ear.position.set(side * 0.16 * scaleX, 1.68 * scaleY, 0.74 * scaleZ);
    ear.rotation.z = side * (isCat ? -0.22 : -0.45);
    ear.rotation.x = 0.18;
    layerGroups.skin.add(ear);
  }

  // Four Limbs & Grounded Paws (y = 0 on flashcard surface)
  const limbCoords: Array<[number, number, boolean]> = [
    [-0.21 * scaleX, 0.42 * scaleZ, true],
    [0.21 * scaleX, 0.42 * scaleZ, true],
    [-0.22 * scaleX, -0.52 * scaleZ, false],
    [0.22 * scaleX, -0.52 * scaleZ, false],
  ];
  for (const [lx, lz, isFront] of limbCoords) {
    const upperLimb = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.105 * scaleX, 0.42 * scaleY, 10, 16)),
      skinPrimaryMat
    );
    upperLimb.position.set(lx, 0.64 * scaleY, lz);
    upperLimb.rotation.x = isFront ? 0.06 : -0.14;
    layerGroups.skin.add(upperLimb);

    const lowerLimb = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.075 * scaleX, 0.38 * scaleY, 10, 16)),
      skinPrimaryMat
    );
    lowerLimb.position.set(lx, 0.26 * scaleY, lz + (isFront ? 0.02 : -0.04));
    layerGroups.skin.add(lowerLimb);

    const paw = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14 * scaleX, 0.08 * scaleY, 0.19 * scaleZ)),
      skinAccentMat
    );
    paw.position.set(lx, 0.04 * scaleY, lz + (isFront ? 0.06 : 0.01));
    layerGroups.skin.add(paw);
  }

  // Curved Tail via TubeGeometry
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.02 * scaleY, -0.66 * scaleZ),
    new THREE.Vector3(0, 1.14 * scaleY, -0.94 * scaleZ),
    new THREE.Vector3(0, (isCat ? 1.36 : 1.28) * scaleY, -1.14 * scaleZ),
  ]);
  const skinTail = new THREE.Mesh(
    track(new THREE.TubeGeometry(tailCurve, 16, 0.055 * scaleX, 10, false)),
    skinAccentMat
  );
  layerGroups.skin.add(skinTail);

  // ===========================================================================
  // LAYER 2: MUSCULAR SYSTEM (Striated Myology & Tendon Aponeuroses)
  // ===========================================================================
  const muscleBump = track(createOrganicBumpTexture('muscle'));
  const muscleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xbe123c, // Deep myoglobin striated crimson
      roughness: 0.46,
      metalness: 0.08,
      bumpMap: muscleBump,
      bumpScale: 0.022,
      transparent: true,
      opacity: 1.0,
    })
  );
  const tendonMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Fibrous white fascia/aponeurosis
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 1.0,
    })
  );
  layerMaterials.muscle.push(muscleMat, tendonMat);

  // Latissimus dorsi & External oblique muscle sheath
  const muscleTorso = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(0.31 * scaleX, 0.68 * scaleZ, 14, 20)),
    muscleMat
  );
  muscleTorso.rotation.x = Math.PI / 2;
  muscleTorso.position.set(0, 0.96 * scaleY, 0.05 * scaleZ);
  muscleTorso.scale.set(0.96, 1.0, 1.08);
  layerGroups.muscle.add(muscleTorso);

  // Thoracolumbar fascia saddle
  const fasciaSaddle = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.29 * scaleX, 18, 14)),
    tendonMat
  );
  fasciaSaddle.scale.set(0.92, 0.45, 1.35);
  fasciaSaddle.position.set(0, 1.15 * scaleY, -0.12 * scaleZ);
  layerGroups.muscle.add(fasciaSaddle);

  // Brachiocephalicus & Sternocephalicus cervical muscles
  const muscleNeck = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(0.18 * scaleX, 0.32 * scaleY, 10, 16)),
    muscleMat
  );
  muscleNeck.position.set(0, 1.22 * scaleY, 0.54 * scaleZ);
  muscleNeck.rotation.x = -0.45;
  layerGroups.muscle.add(muscleNeck);

  // Temporalis & Masseter cranial muscles
  const muscleCranium = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.21 * scaleX, 18, 16)),
    muscleMat
  );
  muscleCranium.scale.set(0.95, 0.92, 1.12);
  muscleCranium.position.set(0, 1.44 * scaleY, 0.77 * scaleZ);
  layerGroups.muscle.add(muscleCranium);

  // Deltoideus, Triceps brachii, Biceps femoris & Gastrocnemius limb muscle bellies
  for (const [lx, lz, isFront] of limbCoords) {
    const upperMuscle = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.088 * scaleX, 0.36 * scaleY, 10, 14)),
      muscleMat
    );
    upperMuscle.position.set(lx, 0.66 * scaleY, lz);
    upperMuscle.rotation.x = isFront ? 0.06 : -0.14;
    layerGroups.muscle.add(upperMuscle);

    const lowerTendon = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.055 * scaleX, 0.34 * scaleY, 8, 12)),
      tendonMat
    );
    lowerTendon.position.set(lx, 0.27 * scaleY, lz + (isFront ? 0.02 : -0.04));
    layerGroups.muscle.add(lowerTendon);
  }

  // ===========================================================================
  // LAYER 3: SKELETAL STRUCTURE (Skull, Vertebral Column, 9-Pair Ribcage, Pelvis, Limbs)
  // ===========================================================================
  const boneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Mineralized ivory cortical bone
      roughness: 0.38,
      metalness: 0.06,
      transparent: true,
      opacity: 1.0,
    })
  );
  const cartilageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Costal cartilage & intervertebral discs
      roughness: 0.55,
      metalness: 0.04,
      transparent: true,
      opacity: 1.0,
    })
  );
  layerMaterials.skeleton.push(boneMat, cartilageMat);

  // Neurocranium & Maxilla/Mandible
  const skullDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.175 * scaleX, 18, 16)),
    boneMat
  );
  skullDome.scale.set(0.92, 0.88, 1.18);
  skullDome.position.set(0, 1.45 * scaleY, 0.78 * scaleZ);
  layerGroups.skeleton.add(skullDome);

  const skullRostrum = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.13 * scaleX, 0.10 * scaleY, (isCat ? 0.18 : 0.28) * scaleZ)),
    boneMat
  );
  skullRostrum.position.set(0, 1.39 * scaleY, (isCat ? 0.92 : 0.98) * scaleZ);
  layerGroups.skeleton.add(skullRostrum);

  // Articulated Vertebral Column (Cervical + Thoracic + Lumbar + Sacral)
  const spineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.40 * scaleY, 0.68 * scaleZ),
    new THREE.Vector3(0, 1.24 * scaleY, 0.48 * scaleZ),
    new THREE.Vector3(0, 1.18 * scaleY, 0.15 * scaleZ),
    new THREE.Vector3(0, 1.16 * scaleY, -0.25 * scaleZ),
    new THREE.Vector3(0, 1.08 * scaleY, -0.58 * scaleZ),
    new THREE.Vector3(0, 1.18 * scaleY, -0.95 * scaleZ),
  ]);
  const spineTube = new THREE.Mesh(
    track(new THREE.TubeGeometry(spineCurve, 28, 0.032 * scaleX, 8, false)),
    cartilageMat
  );
  layerGroups.skeleton.add(spineTube);

  // Individual spinous processes along the vertebral column
  const vertebraGeo = track(new THREE.BoxGeometry(0.075 * scaleX, 0.095 * scaleY, 0.042 * scaleZ));
  for (let i = 1; i <= 18; i++) {
    const t = i / 20;
    const pt = spineCurve.getPointAt(t);
    const vMesh = new THREE.Mesh(vertebraGeo, boneMat);
    vMesh.position.copy(pt);
    vMesh.position.y += 0.025 * scaleY;
    layerGroups.skeleton.add(vMesh);
  }

  // Sternum (Sternebrae)
  const sternum = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(0.028 * scaleX, 0.52 * scaleZ, 8, 12)),
    cartilageMat
  );
  sternum.rotation.x = Math.PI / 2 - 0.08;
  sternum.position.set(0, 0.78 * scaleY, 0.20 * scaleZ);
  layerGroups.skeleton.add(sternum);

  // 9 Pairs of Curved Thoracic Ribs encapsulating the Heart, Lungs, and Liver
  for (let r = 0; r < 9; r++) {
    const zPos = (0.42 - r * 0.062) * scaleZ;
    const ribWidth = (0.22 + Math.sin((r / 8) * Math.PI) * 0.08) * scaleX;
    const ribBottomY = (0.79 + (r > 5 ? (r - 5) * 0.03 : 0)) * scaleY;

    for (const side of [-1, 1]) {
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.17 * scaleY, zPos),
        new THREE.Vector3(side * ribWidth * 0.75, 1.08 * scaleY, zPos),
        new THREE.Vector3(side * ribWidth, 0.94 * scaleY, zPos - 0.02 * scaleZ),
        new THREE.Vector3(side * ribWidth * 0.45, ribBottomY, zPos),
      ]);
      const ribMesh = new THREE.Mesh(
        track(new THREE.TubeGeometry(ribCurve, 12, 0.015 * scaleX, 6, false)),
        boneMat
      );
      layerGroups.skeleton.add(ribMesh);
    }
  }

  // Scapula (Shoulder blades) & Pelvic Girdle (Ilium/Ischium)
  for (const side of [-1, 1]) {
    const scapula = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.028 * scaleX, 0.28 * scaleY, 0.14 * scaleZ)),
      boneMat
    );
    scapula.position.set(side * 0.19 * scaleX, 1.02 * scaleY, 0.40 * scaleZ);
    scapula.rotation.x = 0.28;
    layerGroups.skeleton.add(scapula);

    const pelvisWing = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.035 * scaleX, 0.22 * scaleY, 0.20 * scaleZ)),
      boneMat
    );
    pelvisWing.position.set(side * 0.16 * scaleX, 1.04 * scaleY, -0.50 * scaleZ);
    pelvisWing.rotation.x = -0.35;
    layerGroups.skeleton.add(pelvisWing);
  }

  // Appendicular Long Bones (Humerus, Radius/Ulna, Femur, Tibia/Fibula)
  for (const [lx, lz, isFront] of limbCoords) {
    const upperBone = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.028 * scaleX, 0.022 * scaleX, 0.42 * scaleY, 10)),
      boneMat
    );
    upperBone.position.set(lx, 0.66 * scaleY, lz);
    upperBone.rotation.x = isFront ? 0.08 : -0.15;
    layerGroups.skeleton.add(upperBone);

    const jointSphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.038 * scaleX, 10, 10)),
      cartilageMat
    );
    jointSphere.position.set(lx, 0.45 * scaleY, lz + (isFront ? 0.02 : -0.03));
    layerGroups.skeleton.add(jointSphere);

    const lowerBone = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.022 * scaleX, 0.018 * scaleX, 0.40 * scaleY, 10)),
      boneMat
    );
    lowerBone.position.set(lx, 0.24 * scaleY, lz + (isFront ? 0.02 : -0.04));
    layerGroups.skeleton.add(lowerBone);
  }

  // ===========================================================================
  // LAYER 4: INTERNAL ORGANS (8 Distinct Raycastable Viscera on Layer 1)
  // ===========================================================================
  const organGroups: Record<string, THREE.Group> = {};
  const organMeshes: THREE.Mesh[] = [];
  const organMaterials: Record<string, THREE.MeshStandardMaterial> = {};
  let heartGroup: THREE.Group | null = null;
  let lungsGroup: THREE.Group | null = null;

  const registerOrganMesh = (organId: string, mesh: THREE.Mesh, group: THREE.Group) => {
    mesh.userData.organId = organId;
    mesh.layers.enable(1); // Dedicated raycasting layer 1
    group.add(mesh);
    organMeshes.push(mesh);
  };

  for (const organ of INTERNAL_ORGANS) {
    const group = new THREE.Group();
    group.name = `Organ_${organ.id}`;
    const [ox, oy, oz] = organ.relativePosition[speciesId];
    group.position.set(ox, oy, oz);
    organGroups[organ.id] = group;
    layerGroups.organs.add(group);

    const mat = track(
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(organ.colorHex),
        roughness: 0.28,
        metalness: 0.05,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
        transparent: true,
        opacity: 1.0,
      })
    );
    organMaterials[organ.id] = mat;
    layerMaterials.organs.push(mat);

    switch (organ.id) {
      case 'heart': {
        heartGroup = group;
        // Ventricular cone + atrial auricles + aortic arch
        const ventricles = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.095 * scaleX, 18, 16)),
          mat
        );
        ventricles.scale.set(0.88, 1.22, 0.92);
        ventricles.rotation.x = 0.45;
        registerOrganMesh(organ.id, ventricles, group);

        const aortaCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.06 * scaleY, 0),
          new THREE.Vector3(0, 0.13 * scaleY, 0.02 * scaleZ),
          new THREE.Vector3(0, 0.11 * scaleY, -0.07 * scaleZ),
        ]);
        const aorta = new THREE.Mesh(
          track(new THREE.TubeGeometry(aortaCurve, 10, 0.022 * scaleX, 8, false)),
          mat
        );
        registerOrganMesh(organ.id, aorta, group);
        break;
      }

      case 'lungs': {
        lungsGroup = group;
        // Paired left and right multilobed pulmonary parenchyma + trachea
        for (const side of [-1, 1]) {
          const cranialLobe = new THREE.Mesh(
            track(new THREE.CapsuleGeometry(0.078 * scaleX, 0.16 * scaleZ, 12, 16)),
            mat
          );
          cranialLobe.rotation.x = Math.PI / 2 - 0.15;
          cranialLobe.position.set(side * 0.115 * scaleX, 0, 0.04 * scaleZ);
          registerOrganMesh(organ.id, cranialLobe, group);

          const caudalLobe = new THREE.Mesh(
            track(new THREE.SphereGeometry(0.092 * scaleX, 16, 14)),
            mat
          );
          caudalLobe.scale.set(0.82, 1.05, 1.25);
          caudalLobe.position.set(side * 0.12 * scaleX, 0.02 * scaleY, -0.08 * scaleZ);
          registerOrganMesh(organ.id, caudalLobe, group);
        }
        // Trachea windpipe extending cranially
        const trachea = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.022 * scaleX, 0.022 * scaleX, 0.28 * scaleZ, 10)),
          mat
        );
        trachea.rotation.x = Math.PI / 2 - 0.35;
        trachea.position.set(0, 0.08 * scaleY, 0.22 * scaleZ);
        registerOrganMesh(organ.id, trachea, group);
        break;
      }

      case 'brain': {
        // Left & right cerebral hemispheres + caudal cerebellum + olfactory bulbs
        for (const side of [-1, 1]) {
          const hemisphere = new THREE.Mesh(
            track(new THREE.SphereGeometry(0.082 * scaleX, 16, 14)),
            mat
          );
          hemisphere.scale.set(0.75, 0.85, 1.25);
          hemisphere.position.set(side * 0.042 * scaleX, 0.01 * scaleY, 0.02 * scaleZ);
          registerOrganMesh(organ.id, hemisphere, group);
        }
        const cerebellum = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.062 * scaleX, 14, 12)),
          mat
        );
        cerebellum.position.set(0, -0.02 * scaleY, -0.075 * scaleZ);
        registerOrganMesh(organ.id, cerebellum, group);
        break;
      }

      case 'liver': {
        // Multi-lobed hepatic cradle behind the diaphragm
        const leftLobe = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.11 * scaleX, 16, 14)),
          mat
        );
        leftLobe.scale.set(1.15, 1.18, 0.62);
        leftLobe.position.set(0.04 * scaleX, 0.02 * scaleY, 0.02 * scaleZ);
        registerOrganMesh(organ.id, leftLobe, group);

        const rightLobe = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.105 * scaleX, 16, 14)),
          mat
        );
        rightLobe.scale.set(1.1, 1.12, 0.65);
        rightLobe.position.set(-0.05 * scaleX, 0, -0.02 * scaleZ);
        registerOrganMesh(organ.id, rightLobe, group);
        break;
      }

      case 'stomach': {
        // J-shaped gastric fundus, body, and pyloric antrum
        const gastricCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.04 * scaleX, 0.06 * scaleY, 0.04 * scaleZ),
          new THREE.Vector3(0.05 * scaleX, 0.01 * scaleY, 0),
          new THREE.Vector3(0.02 * scaleX, -0.06 * scaleY, -0.04 * scaleZ),
          new THREE.Vector3(-0.06 * scaleX, -0.03 * scaleY, -0.05 * scaleZ),
        ]);
        const stomachTube = new THREE.Mesh(
          track(new THREE.TubeGeometry(gastricCurve, 16, 0.065 * scaleX, 12, false)),
          mat
        );
        registerOrganMesh(organ.id, stomachTube, group);

        const fundus = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.078 * scaleX, 14, 14)),
          mat
        );
        fundus.position.set(0.03 * scaleX, 0.02 * scaleY, 0.01 * scaleZ);
        registerOrganMesh(organ.id, fundus, group);
        break;
      }

      case 'kidneys': {
        // Paired left and right retroperitoneal bean-shaped kidneys
        for (const side of [-1, 1]) {
          const kidney = new THREE.Mesh(
            track(new THREE.CapsuleGeometry(0.045 * scaleX, 0.055 * scaleZ, 10, 14)),
            mat
          );
          kidney.rotation.x = Math.PI / 2;
          kidney.position.set(
            side * 0.095 * scaleX,
            0,
            (side === -1 ? 0.03 : -0.02) * scaleZ // Right kidney slightly more cranial
          );
          registerOrganMesh(organ.id, kidney, group);
        }
        break;
      }

      case 'spleen': {
        // Elongated falciform spleen along the left abdominal wall
        const spleenMesh = new THREE.Mesh(
          track(new THREE.CapsuleGeometry(0.036 * scaleX, 0.16 * scaleY, 10, 14)),
          mat
        );
        spleenMesh.rotation.z = 0.28;
        spleenMesh.rotation.x = 0.35;
        registerOrganMesh(organ.id, spleenMesh, group);
        break;
      }

      case 'intestines': {
        // Coiled small & large intestinal loops via sinusoidal CatmullRomCurve3
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 18; i++) {
          const t = i / 18;
          const x = Math.sin(t * Math.PI * 5) * 0.095 * scaleX;
          const y = Math.cos(t * Math.PI * 3) * 0.055 * scaleY;
          const z = (0.14 - t * 0.28) * scaleZ;
          pts.push(new THREE.Vector3(x, y, z));
        }
        const gutCurve = new THREE.CatmullRomCurve3(pts);
        const gutTube = new THREE.Mesh(
          track(new THREE.TubeGeometry(gutCurve, 44, 0.036 * scaleX, 10, false)),
          mat
        );
        registerOrganMesh(organ.id, gutTube, group);
        break;
      }
    }
  }

  const dispose = () => {
    for (const item of disposables) {
      item.dispose();
    }
  };

  return {
    rootGroup,
    flashcardGroup,
    petAnchorGroup,
    layerGroups,
    layerMaterials,
    organGroups,
    organMeshes,
    organMaterials,
    heartGroup,
    lungsGroup,
    dispose,
  };
}
