import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ScanLine } from 'lucide-react';
import {
  AnatomicalLayerId,
  FLASHCARD_MARKERS,
  INTERNAL_ORGANS,
  PetSpeciesId,
} from '../data/anatomyData.ts';
import {
  computeLayerRenderDescriptors,
  LayerVisibilityMap,
  matchFiducialMatrix,
} from '../utils/anatomyState.ts';
import {
  buildPetAnatomyScene,
  BuiltPetAnatomyScene,
} from '../three/petAnatomyBuilder.ts';

interface WebARViewportProps {
  speciesId: PetSpeciesId;
  layerVisibility: LayerVisibilityMap;
  explosionFactor: number;
  xrayCutawayEnabled: boolean;
  selectedOrganId: string | null;
  markerTracked: boolean;
  cameraStreamActive: boolean;
  cameraResetTrigger: number;
  onSelectOrgan: (organId: string | null) => void;
  onProjectedOrganMove: (pos: { x: number; y: number } | null) => void;
  onViewportResize: (size: { width: number; height: number }) => void;
  onOpticalMarkerDetected: (speciesId: PetSpeciesId, code: string) => void;
  onReacquireMarker: () => void;
  onCameraError: (message: string) => void;
}

// Pre-allocated module-scope math objects (Zero GC in render loop)
const _scratchWorldPos = new THREE.Vector3();
const _scratchProjected = new THREE.Vector3();
const _scratchTargetScale = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
_raycaster.layers.set(1); // Restrict raycasting exclusively to Internal Organs layer
const _pointerNdc = new THREE.Vector2();

export const WebARViewport: React.FC<WebARViewportProps> = ({
  speciesId,
  layerVisibility,
  explosionFactor,
  xrayCutawayEnabled,
  selectedOrganId,
  markerTracked,
  cameraStreamActive,
  cameraResetTrigger,
  onSelectOrgan,
  onProjectedOrganMove,
  onViewportResize,
  onOpticalMarkerDetected,
  onReacquireMarker,
  onCameraError,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Store mutable React state in refs so WebGLRenderer lifecycle never tears down
  const speciesIdRef = useRef<PetSpeciesId>(speciesId);
  const visibilityRef = useRef<LayerVisibilityMap>(layerVisibility);
  const explosionRef = useRef<number>(explosionFactor);
  const xrayRef = useRef<boolean>(xrayCutawayEnabled);
  const selectedOrganRef = useRef<string | null>(selectedOrganId);
  const hoveredOrganRef = useRef<string | null>(null);
  const markerTrackedRef = useRef<boolean>(markerTracked);

  const onSelectOrganRef = useRef(onSelectOrgan);
  const onProjectedOrganMoveRef = useRef(onProjectedOrganMove);
  const onViewportResizeRef = useRef(onViewportResize);
  const onOpticalMarkerDetectedRef = useRef(onOpticalMarkerDetected);

  speciesIdRef.current = speciesId;
  visibilityRef.current = layerVisibility;
  explosionRef.current = explosionFactor;
  xrayRef.current = xrayCutawayEnabled;
  selectedOrganRef.current = selectedOrganId;
  markerTrackedRef.current = markerTracked;
  onSelectOrganRef.current = onSelectOrgan;
  onProjectedOrganMoveRef.current = onProjectedOrganMove;
  onViewportResizeRef.current = onViewportResize;
  onOpticalMarkerDetectedRef.current = onOpticalMarkerDetected;

  const builtScenesRef = useRef<Record<PetSpeciesId, BuiltPetAnatomyScene> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Camera reset trigger
  useEffect(() => {
    if (cameraResetTrigger === 0) return;
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(2.45, 2.15, 2.65);
      controlsRef.current.target.set(0, 0.48, 0.05);
      controlsRef.current.update();
    }
  }, [cameraResetTrigger]);

  // Hardware WebRTC Camera initialization (`getUserMedia`) + Optical Fiducial Scanner
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let scanInterval: number | null = null;

    const stopStream = () => {
      if (scanInterval !== null) {
        window.clearInterval(scanInterval);
        scanInterval = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!cameraStreamActive) {
      stopStream();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onCameraError(
          'Browser camera API unavailable in this environment. Running Optical AR Simulation mode.'
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Optical 4x4 fiducial frame sampler
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 64;
        sampleCanvas.height = 64;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

        scanInterval = window.setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !sampleCtx) return;
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const cropSize = Math.min(vw, vh) * 0.5;
          sampleCtx.drawImage(
            video,
            (vw - cropSize) * 0.5,
            (vh - cropSize) * 0.5,
            cropSize,
            cropSize,
            0,
            0,
            64,
            64
          );
          const imgData = sampleCtx.getImageData(0, 0, 64, 64).data;
          const grid: number[][] = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ];
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
              const px = Math.floor(12 + c * 10 + 5);
              const py = Math.floor(12 + r * 10 + 5);
              const idx = (py * 64 + px) * 4;
              const lum =
                0.299 * imgData[idx] +
                0.587 * imgData[idx + 1] +
                0.114 * imgData[idx + 2];
              grid[r][c] = lum < 115 ? 1 : 0;
            }
          }
          const match = matchFiducialMatrix(grid);
          if (match.detected && match.speciesId && match.markerCode) {
            onOpticalMarkerDetectedRef.current(match.speciesId, match.markerCode);
          }
        }, 650);
      } catch {
        onCameraError(
          'Physical camera access was declined or unavailable. Using Optical AR Tabletop Simulator.'
        );
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [cameraStreamActive, onCameraError]);

  // Main Three.js WebGLRenderer & Scene Lifecycle (Mounted Once)
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;
    onViewportResizeRef.current({ width, height });

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d16, 0.045);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(2.45, 2.15, 2.65);
    camera.layers.enable(0);
    camera.layers.enable(1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    // Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.85);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    keyLight.position.set(3.5, 5.5, 3.2);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      const d = 2.4;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-3.2, 2.8, -2.8);
    scene.add(rimLight);

    // Subtle AR Spatial Reference Tabletop Grid below Flashcard
    const arFloorGrid = new THREE.GridHelper(10, 24, 0x0284c7, 0x1e293b);
    arFloorGrid.position.y = -0.032;
    scene.add(arFloorGrid);

    // Build both Canine and Feline multi-layer 3D anatomy scenes upfront
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const dogScene = buildPetAnatomyScene('dog', maxAnisotropy);
    const catScene = buildPetAnatomyScene('cat', maxAnisotropy);
    builtScenesRef.current = { dog: dogScene, cat: catScene };

    scene.add(dogScene.rootGroup);
    scene.add(catScene.rootGroup);

    // 3D Organ Selection Beacon Ring inside the 3D scene
    const beaconGeo = new THREE.TorusGeometry(0.14, 0.008, 12, 36);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    const organBeaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    organBeaconMesh.renderOrder = 99;
    organBeaconMesh.visible = false;
    scene.add(organBeaconMesh);

    // OrbitControls for 360-degree touch & mouse inspection
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.25;
    controls.maxDistance = 6.5;
    controls.target.set(0, 0.48, 0.05);
    controls.update();
    controlsRef.current = controls;

    // Pre-warm shaders once
    renderer.compile(scene, camera);

    // -------------------------------------------------------------------------
    // Touch & Pointer Raycasting for Exposed Internal Organs
    // -------------------------------------------------------------------------
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastHoverTime = 0;

    const computeNdcFromEvent = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickOrganAtPointer = (): string | null => {
      if (!markerTrackedRef.current || !visibilityRef.current.organs) {
        return null;
      }
      const activeBuilt = builtScenesRef.current?.[speciesIdRef.current];
      if (!activeBuilt) return null;

      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(activeBuilt.organMeshes, false);
      if (hits.length > 0) {
        const hitOrganId = hits[0].object.userData?.organId;
        if (typeof hitOrganId === 'string') {
          return hitOrganId;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      // Only treat as a tap if pointer moved less than 8px (not an orbit drag)
      if (dx * dx + dy * dy > 64) return;

      computeNdcFromEvent(e.clientX, e.clientY);
      const hitOrganId = pickOrganAtPointer();
      if (hitOrganId) {
        onSelectOrganRef.current(hitOrganId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 50) return; // Throttle to 20Hz max
      lastHoverTime = now;

      computeNdcFromEvent(e.clientX, e.clientY);
      const hitOrganId = pickOrganAtPointer();
      hoveredOrganRef.current = hitOrganId;
      renderer.domElement.style.cursor = hitOrganId ? 'pointer' : 'grab';
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointermove', onPointerMove);

    const handleResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      onViewportResizeRef.current({ width: w, height: h });
    };
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------------------
    // Animation Loop (Exponential Damping + Physiological Organ Motion)
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let animFrameId = 0;
    let lastFrameTimestamp = 0;
    let lastProjectedUpdate = 0;

    const animate = (timestamp: number) => {
      animFrameId = requestAnimationFrame(animate);

      // Throttle headless software WebGL rendering to ~15fps so screenshots never stall
      if (isHeadless && timestamp - lastFrameTimestamp < 65) {
        return;
      }
      lastFrameTimestamp = timestamp;

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      controls.update();

      const activeSpecies = speciesIdRef.current;
      const isTracked = markerTrackedRef.current;
      const scenes = builtScenesRef.current;

      if (scenes) {
        scenes.dog.rootGroup.visible = isTracked && activeSpecies === 'dog';
        scenes.cat.rootGroup.visible = isTracked && activeSpecies === 'cat';

        const currentScene = scenes[activeSpecies];

        // Smoothly damp overall anchor scale when marker locks in
        const targetAnchorScale = isTracked ? 1.0 : 0.01;
        _scratchTargetScale.set(targetAnchorScale, targetAnchorScale, targetAnchorScale);
        currentScene.petAnchorGroup.scale.lerp(
          _scratchTargetScale,
          1 - Math.exp(-10 * delta)
        );

        // Compute target opacities and exploded offsets for the 4 anatomical layers
        const descriptors = computeLayerRenderDescriptors(
          visibilityRef.current,
          explosionRef.current,
          xrayRef.current
        );

        const layerIds: AnatomicalLayerId[] = ['skin', 'muscle', 'skeleton', 'organs'];
        for (const layerId of layerIds) {
          const desc = descriptors[layerId];
          const lGroup = currentScene.layerGroups[layerId];
          const lMats = currentScene.layerMaterials[layerId];

          // Smoothly damp layer exploded position
          lGroup.position.x = THREE.MathUtils.damp(
            lGroup.position.x,
            desc.explodedVector[0],
            8,
            delta
          );
          lGroup.position.y = THREE.MathUtils.damp(
            lGroup.position.y,
            desc.explodedVector[1],
            8,
            delta
          );
          lGroup.position.z = THREE.MathUtils.damp(
            lGroup.position.z,
            desc.explodedVector[2],
            8,
            delta
          );

          for (const mat of lMats) {
            mat.opacity = THREE.MathUtils.damp(
              mat.opacity,
              desc.targetOpacity,
              10,
              delta
            );
            mat.depthWrite = mat.opacity > 0.82;
          }
          lGroup.visible = desc.visible || lMats.some((m) => m.opacity > 0.03);
        }

        // Physiological systolic heart pulse & respiratory lung excursion
        if (currentScene.heartGroup) {
          const bpm = activeSpecies === 'cat' ? 2.6 : 1.6;
          const pulse = 1 + Math.pow(Math.sin(elapsed * Math.PI * bpm), 4) * 0.09;
          currentScene.heartGroup.scale.setScalar(pulse);
        }
        if (currentScene.lungsGroup) {
          const breath = 1 + Math.sin(elapsed * 2.1) * 0.045;
          currentScene.lungsGroup.scale.set(breath, 1, breath);
        }

        // Highlight selected or hovered internal organ & project 3D coordinate to 2D screen
        const selId = selectedOrganRef.current;
        const hovId = hoveredOrganRef.current;

        for (const organ of INTERNAL_ORGANS) {
          const mat = currentScene.organMaterials[organ.id];
          if (!mat) continue;
          const isSelected = selId === organ.id;
          const isHovered = hovId === organ.id;
          if (isSelected) {
            mat.emissive.set(organ.highlightHex);
            mat.emissiveIntensity = 0.55;
          } else if (isHovered) {
            mat.emissive.set(organ.highlightHex);
            mat.emissiveIntensity = 0.3;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }

        if (selId && isTracked && currentScene.organGroups[selId]) {
          const targetOrganGroup = currentScene.organGroups[selId];
          targetOrganGroup.getWorldPosition(_scratchWorldPos);

          organBeaconMesh.visible = true;
          organBeaconMesh.position.copy(_scratchWorldPos);
          organBeaconMesh.lookAt(camera.position);

          const organMeta = INTERNAL_ORGANS.find((o) => o.id === selId);
          if (organMeta) {
            beaconMat.color.set(organMeta.highlightHex);
          }

          if (timestamp - lastProjectedUpdate > 60) {
            lastProjectedUpdate = timestamp;
            _scratchProjected.copy(_scratchWorldPos).project(camera);
            const w = mountEl.clientWidth || window.innerWidth;
            const h = mountEl.clientHeight || window.innerHeight;
            const screenX = ((_scratchProjected.x + 1) * 0.5) * w;
            const screenY = ((-_scratchProjected.y + 1) * 0.5) * h;
            onProjectedOrganMoveRef.current({ x: screenX, y: screenY });
          }
        } else {
          organBeaconMesh.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      dogScene.dispose();
      catScene.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  const currentMarkerSpec = FLASHCARD_MARKERS[speciesId];

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      {/* Live Mobile Camera Feed Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-label="Device camera AR background feed"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          cameraStreamActive ? 'opacity-65' : 'opacity-0'
        }`}
      />

      {/* Simulated Optical AR Environment Backdrop when Hardware Camera is Off */}
      {!cameraStreamActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#1e293b_0%,#090d16_72%)]"
        />
      )}

      {/* Corner Optical AR Camera Frame Reticles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 z-0 sm:inset-6"
      >
        <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-sky-400/40" />
        <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-sky-400/40" />
        <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-sky-400/40" />
        <div className="absolute right-0 bottom-0 h-6 w-6 border-r-2 border-b-2 border-sky-400/40" />
      </div>

      {/* Dedicated Empty Container for Three.js WebGL Canvas */}
      <div
        ref={canvasMountRef}
        data-testid="webar-canvas-mount"
        data-species={speciesId}
        data-tracked={markerTracked ? 'true' : 'false'}
        className="relative z-10 h-full w-full"
      />

      {/* Optical Fiducial Search Reticle Overlay when Marker is Unanchored / Searching */}
      {!markerTracked && (
        <div
          role="region"
          aria-label="Optical flashcard scanner searching state"
          className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/75 p-6 text-center"
        >
          <div className="relative flex h-56 w-56 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-400/70 bg-slate-900/90 p-6 shadow-2xl">
            <ScanLine className="h-12 w-12 text-sky-400" aria-hidden="true" />
            <p className="mt-3 font-display text-base font-semibold text-white">
              Searching for Fiducial Marker
            </p>
            <p className="mt-1 font-mono-tabular text-xs text-slate-400">
              Target: {currentMarkerSpec.markerCode}
            </p>
          </div>

          <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-300">
            Align the physical <strong>{currentMarkerSpec.commonName}</strong> flashcard within the optical reticle or lock the marker below to anchor the 3D anatomical specimen.
          </p>

          <button
            type="button"
            onClick={onReacquireMarker}
            className="mt-5 flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg transition-colors hover:bg-sky-400 whitespace-nowrap"
          >
            <span>Lock Flashcard Marker ({currentMarkerSpec.markerCode})</span>
          </button>
        </div>
      )}
    </div>
  );
};
