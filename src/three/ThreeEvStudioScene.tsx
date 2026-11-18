import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ChevronDown, ChevronUp, Compass, Pause, Play, RotateCcw, Sun, Zap } from 'lucide-react';
import type { Vehicle } from '../types';
import { createChargingStationModel } from './chargingStationModel';
import { createProceduralEvModel, resolveColorHex, type EvModelRig } from './evVehicleModel';
import {
  createAsphaltTextures,
  createContactShadowTexture,
  createShowroomFloorTexture,
} from './proceduralTextures';

interface ThreeEvStudioSceneProps {
  vehicles?: Vehicle[];
  initialVehicleId?: string;
}

type StudioAtmosphere = 'night' | 'dawn' | 'dusk';
type CameraPreset = 'hero' | 'side' | 'battery' | 'top';

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  hero: { pos: [5.4, 2.35, 5.1], target: [0.2, 0.75, 0], label: 'Hero 3/4' },
  side: { pos: [0.1, 1.35, 6.8], target: [0, 0.85, 0], label: 'Side Profile' },
  battery: { pos: [3.2, 1.35, 4.6], target: [0, 0.45, 0.4], label: 'Battery View' },
  top: { pos: [0.01, 8.2, 1.2], target: [0, 0.4, 0], label: 'Top-Down' },
};

const PAINT_SWATCHES = [
  { name: 'Chronos Charcoal', hex: '#272C35' },
  { name: 'Electric Teal', hex: '#14B8A6' },
  { name: 'Glacier White', hex: '#E2E8F0' },
  { name: 'Nocturne Silver', hex: '#94A3B8' },
  { name: 'Crimson', hex: '#DC2626' },
];

const ATMOSPHERES: Record<
  StudioAtmosphere,
  {
    label: string;
    sky: number;
    fogDensity: number;
    keyColor: number;
    keyIntensity: number;
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
  }
> = {
  night: {
    label: 'Night Studio',
    sky: 0x080d12,
    fogDensity: 0.026,
    keyColor: 0xfff1dc,
    keyIntensity: 2.3,
    hemiSky: 0x38bdf8,
    hemiGround: 0x0f172a,
    hemiIntensity: 0.65,
  },
  dawn: {
    label: 'Alpine Dawn',
    sky: 0x1e293b,
    fogDensity: 0.022,
    keyColor: 0xfde68a,
    keyIntensity: 2.8,
    hemiSky: 0x93c5fd,
    hemiGround: 0x1e293b,
    hemiIntensity: 0.95,
  },
  dusk: {
    label: 'Coastal Dusk',
    sky: 0x111822,
    fogDensity: 0.024,
    keyColor: 0xfdba74,
    keyIntensity: 2.5,
    hemiSky: 0x67e8f9,
    hemiGround: 0x111827,
    hemiIntensity: 0.78,
  },
};

// Pre-allocated scratch math helpers (zero GC inside animation loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

export function ThreeEvStudioScene({
  vehicles = [],
  initialVehicleId,
}: ThreeEvStudioSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const defaultVehicle =
    vehicles.find((v) => v._id === initialVehicleId) ||
    vehicles.find((v) => v.isDefault) ||
    vehicles[0] ||
    null;

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    defaultVehicle?._id || 'preset-suv'
  );
  const [paintHex, setPaintHex] = useState<string>(
    defaultVehicle ? resolveColorHex(defaultVehicle.colour) : '#272C35'
  );
  const [explodeTarget, setExplodeTarget] = useState<number>(0);
  const [atmosphere, setAtmosphere] = useState<StudioAtmosphere>('night');
  const [driving, setDriving] = useState<boolean>(true);
  const [autoOrbit, setAutoOrbit] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);

  // Refs synced to Three.js loop so React state never tears down the canvas
  const explodeTargetRef = useRef(0);
  const explodeCurrentRef = useRef(0);
  const drivingRef = useRef(true);
  const autoOrbitRef = useRef(false);
  const paintHexRef = useRef(paintHex);
  const atmosphereRef = useRef<StudioAtmosphere>(atmosphere);
  const bodyStyleRef = useRef<'suv' | 'sedan'>(
    defaultVehicle?.model.toLowerCase().includes('ioniq 6') ||
      defaultVehicle?.model.toLowerCase().includes('model 3') ||
      defaultVehicle?.model.toLowerCase().includes('seal')
      ? 'sedan'
      : 'suv'
  );
  const activeCameraPresetRef = useRef<CameraPreset | null>(null);
  const rebuildVehicleRef = useRef<((style: 'suv' | 'sedan', color: string) => void) | null>(
    null
  );
  const applyAtmosphereRef = useRef<((mode: StudioAtmosphere) => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeTarget;
  }, [explodeTarget]);

  useEffect(() => {
    drivingRef.current = driving;
  }, [driving]);

  useEffect(() => {
    autoOrbitRef.current = autoOrbit;
  }, [autoOrbit]);

  useEffect(() => {
    paintHexRef.current = paintHex;
    rebuildVehicleRef.current?.(bodyStyleRef.current, paintHex);
  }, [paintHex]);

  useEffect(() => {
    atmosphereRef.current = atmosphere;
    applyAtmosphereRef.current?.(atmosphere);
  }, [atmosphere]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId(id);
    const chosen = vehicles.find((v) => v._id === id);
    let nextStyle: 'suv' | 'sedan' = 'suv';
    let nextColor = paintHex;

    if (chosen) {
      const m = chosen.model.toLowerCase();
      nextStyle =
        m.includes('ioniq 6') || m.includes('model 3') || m.includes('seal')
          ? 'sedan'
          : 'suv';
      nextColor = resolveColorHex(chosen.colour);
    } else if (id === 'preset-sedan') {
      nextStyle = 'sedan';
      nextColor = '#94A3B8';
    } else {
      nextStyle = 'suv';
      nextColor = '#272C35';
    }

    bodyStyleRef.current = nextStyle;
    setPaintHex(nextColor);
    rebuildVehicleRef.current?.(nextStyle, nextColor);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL Detection via Renderer String
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // 2. Scene, Fog & Studio RoomEnvironment
    const scene = new THREE.Scene();
    const initialAtmo = ATMOSPHERES[atmosphereRef.current];
    scene.background = new THREE.Color(initialAtmo.sky);
    scene.fog = new THREE.FogExp2(initialAtmo.sky, initialAtmo.fogDensity);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3. Camera & Damped OrbitControls
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 140);
    camera.position.set(...CAMERA_PRESETS.hero.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.2;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.target.set(...CAMERA_PRESETS.hero.target);
    controls.update();

    controls.addEventListener('start', () => {
      // Cancel scripted camera transition immediately on user drag
      activeCameraPresetRef.current = null;
    });

    // 4. Studio 3-Point + Softbox Lighting Rig
    const keyLight = new THREE.DirectionalLight(initialAtmo.keyColor, initialAtmo.keyIntensity);
    keyLight.position.set(7, 11, 6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.camera.left = -9;
      keyLight.shadow.camera.right = 9;
      keyLight.shadow.camera.top = 9;
      keyLight.shadow.camera.bottom = -9;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(
      initialAtmo.hemiSky,
      initialAtmo.hemiGround,
      initialAtmo.hemiIntensity
    );
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x00e5c3, 1.15);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xffffff, 2.2, 6, 1.5);
      softbox.position.set(0, 4.6, 0);
      softbox.lookAt(0, 0, 0);
      scene.add(softbox);
    }

    // 5. Procedural Textures & Grounded Showroom + Roadway + Natural Horizon
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const contactShadowTex = createContactShadowTexture();
    const asphalt = createAsphaltTextures(maxAniso);
    const floorGridTex = createShowroomFloorTexture(maxAniso);

    const showroomFloorGeo = new THREE.CircleGeometry(46, 64);
    const showroomFloorMat = new THREE.MeshStandardMaterial({
      map: floorGridTex,
      roughness: 0.72,
      metalness: 0.18,
    });
    const showroomFloor = new THREE.Mesh(showroomFloorGeo, showroomFloorMat);
    showroomFloor.rotation.x = -Math.PI / 2;
    showroomFloor.receiveShadow = !isSoftwareGl;
    scene.add(showroomFloor);

    // Highway asphalt strip offset +0.015 on Y to eliminate Z-fighting
    const roadGeo = new THREE.PlaneGeometry(58, 5.2);
    const roadMat = new THREE.MeshStandardMaterial({
      map: asphalt.map,
      roughnessMap: asphalt.roughnessMap,
      roughness: 0.85,
      metalness: 0.08,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.rotation.z = Math.PI / 2;
    roadMesh.position.y = 0.015;
    roadMesh.receiveShadow = !isSoftwareGl;
    scene.add(roadMesh);

    // Instanced Roadside Energy Bollards (24 instances -> InstancedMesh with computeBoundingSphere)
    const bollardCount = 24;
    const bollardGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.85, 12);
    const bollardMat = new THREE.MeshStandardMaterial({
      color: 0x00e5c3,
      emissive: 0x00e5c3,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.6,
    });
    const bollards = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCount);
    for (let i = 0; i < bollardCount; i += 1) {
      const side = i % 2 === 0 ? -3.1 : 3.1;
      const xPos = -24 + Math.floor(i / 2) * 4.4;
      _dummyObj.position.set(xPos, 0.425, side);
      _dummyObj.scale.setScalar(1);
      _dummyObj.updateMatrix();
      bollards.setMatrixAt(i, _dummyObj.matrix);
    }
    bollards.instanceMatrix.needsUpdate = true;
    bollards.computeBoundingSphere();
    scene.add(bollards);

    // Natural Distant Mountain Perimeter Ring (prevents empty void)
    const ridgeGroup = new THREE.Group();
    const ridgeGeo = new THREE.ConeGeometry(4.8, 6.5, 6);
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x111a24,
      roughness: 0.94,
      metalness: 0.04,
      flatShading: true,
    });
    const ridgeCount = 28;
    const ridgeInstanced = new THREE.InstancedMesh(ridgeGeo, ridgeMat, ridgeCount);
    for (let i = 0; i < ridgeCount; i += 1) {
      const ang = (i / ridgeCount) * Math.PI * 2;
      const dist = 34 + (i % 3) * 4.5;
      const hScale = 0.7 + ((i * 7) % 10) * 0.12;
      _dummyObj.position.set(Math.cos(ang) * dist, 2.2 * hScale, Math.sin(ang) * dist);
      _dummyObj.rotation.set(0, ang, 0);
      _dummyObj.scale.set(1.3, hScale, 1.3);
      _dummyObj.updateMatrix();
      ridgeInstanced.setMatrixAt(i, _dummyObj.matrix);
    }
    ridgeInstanced.instanceMatrix.needsUpdate = true;
    ridgeInstanced.computeBoundingSphere();
    ridgeGroup.add(ridgeInstanced);
    scene.add(ridgeGroup);

    // 6. Composite DC Hypercharger Station grounded flush at side of bay
    const chargerRig = createChargingStationModel(contactShadowTex, isSoftwareGl);
    chargerRig.root.position.set(-1.6, 0, -3.55);
    scene.add(chargerRig.root);

    // 7. Composite EV Hero Subject
    let evRig: EvModelRig = createProceduralEvModel({
      bodyStyle: bodyStyleRef.current,
      paintColor: paintHexRef.current,
      isSoftwareGl,
      contactShadowTexture: contactShadowTex,
    });
    scene.add(evRig.root);

    rebuildVehicleRef.current = (style: 'suv' | 'sedan', color: string) => {
      scene.remove(evRig.root);
      evRig.dispose();
      evRig = createProceduralEvModel({
        bodyStyle: style,
        paintColor: color,
        isSoftwareGl,
        contactShadowTexture: contactShadowTex,
      });
      evRig.setExplodeFactor(explodeCurrentRef.current);
      scene.add(evRig.root);
    };

    applyAtmosphereRef.current = (mode: StudioAtmosphere) => {
      const cfg = ATMOSPHERES[mode];
      (scene.background as THREE.Color).setHex(cfg.sky);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(cfg.sky);
        scene.fog.density = cfg.fogDensity;
      }
      keyLight.color.setHex(cfg.keyColor);
      keyLight.intensity = cfg.keyIntensity;
      hemiLight.color.setHex(cfg.hemiSky);
      hemiLight.groundColor.setHex(cfg.hemiGround);
      hemiLight.intensity = cfg.hemiIntensity;
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 8. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. Paced 60fps Loop + Software WebGL afterDraw Guard
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Smooth Exploded Battery Cutaway Damping
      const nextExplode = THREE.MathUtils.damp(
        explodeCurrentRef.current,
        explodeTargetRef.current,
        7.5,
        dt
      );
      if (Math.abs(nextExplode - explodeCurrentRef.current) > 0.0004) {
        explodeCurrentRef.current = nextExplode;
        evRig.setExplodeFactor(nextExplode);
      }

      // Highway Drive Simulation
      if (drivingRef.current) {
        const speedMetersPerSec = 5.2;
        evRig.spinWheels(speedMetersPerSec * dt);
        asphalt.map.offset.y -= dt * 0.85;
        asphalt.roughnessMap.offset.y -= dt * 0.85;
      }

      // Smooth Camera Preset Damping
      if (activeCameraPresetRef.current) {
        const preset = CAMERA_PRESETS[activeCameraPresetRef.current];
        _camGoalPos.set(...preset.pos);
        _camGoalTarget.set(...preset.target);
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(_camGoalPos, alpha);
        controls.target.lerp(_camGoalTarget, alpha);
        if (camera.position.distanceTo(_camGoalPos) < 0.04) {
          activeCameraPresetRef.current = null;
        }
      }

      controls.autoRotate = !isSoftwareGl && autoOrbitRef.current;
      controls.autoRotateSpeed = 1.4;
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      evRig.dispose();
      chargerRig.dispose();
      showroomFloorGeo.dispose();
      showroomFloorMat.dispose();
      roadGeo.dispose();
      roadMat.dispose();
      bollardGeo.dispose();
      bollardMat.dispose();
      ridgeGeo.dispose();
      ridgeMat.dispose();
      contactShadowTex.dispose();
      asphalt.map.dispose();
      asphalt.roughnessMap.dispose();
      floorGridTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const activeVehicleLabel =
    vehicles.find((v) => v._id === selectedVehicleId)
      ? `${vehicles.find((v) => v._id === selectedVehicleId)!.brand} ${
          vehicles.find((v) => v._id === selectedVehicleId)!.model
        }`
      : selectedVehicleId === 'preset-sedan'
      ? 'Aero Stream Sedan'
      : 'Touring EV SUV';

  if (webglError) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-[#080D12] text-white p-8 text-center space-y-3">
        <Zap className="h-8 w-8 text-[#00E5C3]" />
        <h2 className="font-serif-display italic text-2xl">
          3D WebGL Viewport Unavailable
        </h2>
        <p className="text-xs text-zinc-400 max-w-md">
          Hardware or software WebGL2 acceleration could not be initialized in this browser session.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080D12] select-none">
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Top-Left Spec Overlay (Static Typography, No Pulsating Dots, No Backdrop Blur) */}
      <div
        className="pointer-events-none absolute top-4 left-4 z-10 rounded-xl px-4 py-2.5 border border-white/10"
        style={{ backgroundColor: 'rgba(8, 13, 18, 0.84)' }}
      >
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#00E5C3]">
          3D EV Studio
        </div>
        <div className="font-serif-display italic text-xl text-white leading-tight">
          {activeVehicleLabel}
        </div>
        <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
          Drag to orbit · Scroll to zoom · H to toggle dock
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Mid-Screen Occlusion, Solid RGBA Surface) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center px-3">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11px] font-medium text-zinc-200 hover:text-[#00E5C3] transition-colors"
          style={{ backgroundColor: 'rgba(8, 13, 18, 0.88)' }}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            className="pointer-events-auto w-full max-w-[940px] rounded-2xl border border-white/15 p-3.5 sm:p-4 text-xs text-white shadow-2xl space-y-3"
            style={{ backgroundColor: 'rgba(10, 15, 22, 0.92)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Garage / Body Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 whitespace-nowrap">EV</span>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => handleSelectVehicle(e.target.value)}
                  aria-label="Select EV model"
                  className="rounded-lg border border-white/15 bg-[#111822] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5C3]"
                >
                  {vehicles.length > 0 ? (
                    vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.brand} {v.model}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="preset-suv">Touring EV SUV</option>
                      <option value="preset-sedan">Aero Stream Sedan</option>
                    </>
                  )}
                </select>
              </div>

              {/* Paint Swatches */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 mr-1">Finish</span>
                {PAINT_SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    onClick={() => setPaintHex(sw.hex)}
                    title={sw.name}
                    aria-label={sw.name}
                    style={{ backgroundColor: sw.hex }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      paintHex.toLowerCase() === sw.hex.toLowerCase()
                        ? 'border-[#00E5C3] scale-110 ring-2 ring-[#00E5C3]/40'
                        : 'border-white/25 hover:scale-105'
                    }`}
                  />
                ))}
              </div>

              {/* Exploded Skateboard Battery Slider */}
              <div className="flex items-center gap-2.5 min-w-[180px]">
                <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                  Battery Cutaway
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={explodeTarget}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setExplodeTarget(val);
                    if (val > 0.3) activeCameraPresetRef.current = 'battery';
                  }}
                  aria-label="Exploded battery pack cutaway slider"
                  className="w-24 accent-[#00E5C3] cursor-pointer"
                />
                <span className="font-mono text-[11px] tabular-nums text-[#00E5C3] w-9 text-right">
                  {Math.round(explodeTarget * 100)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
              {/* Camera Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      activeCameraPresetRef.current = key;
                      if (key === 'battery' && explodeTarget < 0.5) setExplodeTarget(0.85);
                      if (key === 'hero' && explodeTarget > 0) setExplodeTarget(0);
                    }}
                    className="rounded-lg border border-white/10 bg-[#141C26] px-2.5 py-1 text-[11px] text-zinc-200 hover:border-[#00E5C3] hover:text-[#00E5C3] transition-colors whitespace-nowrap"
                  >
                    {CAMERA_PRESETS[key].label}
                  </button>
                ))}
              </div>

              {/* Atmosphere & Simulation Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setAtmosphere((a) =>
                      a === 'night' ? 'dawn' : a === 'dawn' ? 'dusk' : 'night'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#141C26] px-2.5 py-1 text-[11px] text-zinc-200 hover:border-[#00E5C3] whitespace-nowrap"
                >
                  <Sun className="h-3 w-3 text-[#FBBF24]" />
                  <span>{ATMOSPHERES[atmosphere].label}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDriving((d) => !d)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    driving
                      ? 'bg-[#00E5C3] text-[#062322]'
                      : 'border border-white/10 bg-[#141C26] text-zinc-200'
                  }`}
                >
                  {driving ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <span>{driving ? 'Drive Motion' : 'Parked'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutoOrbit((o) => !o)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition-colors whitespace-nowrap ${
                    autoOrbit
                      ? 'border border-[#00E5C3] text-[#00E5C3] bg-[#00E5C3]/10'
                      : 'border border-white/10 bg-[#141C26] text-zinc-300'
                  }`}
                >
                  <Compass className="h-3 w-3" />
                  <span>Orbit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExplodeTarget(0);
                    activeCameraPresetRef.current = 'hero';
                  }}
                  aria-label="Reset camera and assembly"
                  className="rounded-lg border border-white/10 bg-[#141C26] p-1.5 text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
