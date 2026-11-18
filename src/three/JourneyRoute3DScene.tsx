import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { TimelineEvent } from '../types';
import { createChargingStationModel } from './chargingStationModel';
import { createProceduralEvModel } from './evVehicleModel';
import { createContactShadowTexture, createTopographicGridTexture } from './proceduralTextures';

interface JourneyRoute3DSceneProps {
  events: TimelineEvent[];
  vehicleModel?: string;
  vehicleColour?: string;
  heightClass?: string;
}

const _posVec = new THREE.Vector3();
const _tanVec = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

function sampleTerrainHeight(x: number, z: number): number {
  const ridge1 = Math.sin(x * 0.24 + 0.5) * Math.cos(z * 0.22) * 1.1;
  const ridge2 = Math.sin((x + z) * 0.14) * 0.85;
  const valleyDip = Math.exp(-(x * x + z * z) * 0.015) * -0.35;
  return Math.max(-0.4, ridge1 + ridge2 + valleyDip + 0.45);
}

export function JourneyRoute3DScene({
  events,
  vehicleModel = 'Q8 e-tron',
  vehicleColour = '#2DD4BF',
  heightClass = 'h-[420px]',
}: JourneyRoute3DSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selectedStop, setSelectedStop] = useState<TimelineEvent | null>(null);
  const [webglError, setWebglError] = useState(false);

  const playingRef = useRef(false);
  const progressRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const validEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          e.coordinates &&
          Number.isFinite(e.coordinates.lat) &&
          Number.isFinite(e.coordinates.lng) &&
          (e.coordinates.lat !== 0 || e.coordinates.lng !== 0)
      ),
    [events]
  );

  const eventsKey = JSON.stringify(
    validEvents.map((e) => ({
      id: e._id,
      c: e.coordinates,
      t: e.type,
    }))
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container || validEvents.length === 0) return;

    progressRef.current = 0;
    setPlaying(false);
    setSelectedStop(validEvents[0]);

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
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
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 420;
    renderer.setSize(w, h);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d12);
    scene.fog = new THREE.FogExp2(0x080d12, 0.025);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 140);
    camera.position.set(11.5, 9.2, 12.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.target.set(0, 0.8, 0);
    controls.update();

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(10, 14, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -12;
      keyLight.shadow.camera.right = 12;
      keyLight.shadow.camera.top = 12;
      keyLight.shadow.camera.bottom = -12;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.72);
    scene.add(hemi);

    // Topographic Terrain Mesh
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const topoTex = createTopographicGridTexture(maxAniso);
    const contactShadowTex = createContactShadowTexture();

    const terrainGeo = new THREE.PlaneGeometry(42, 42, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i += 1) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, sampleTerrainHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: topoTex,
      roughness: 0.86,
      metalness: 0.12,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    // Normalize Lat/Lng waypoints onto the 14x14 center plateau
    const lats = validEvents.map((e) => e.coordinates.lat);
    const lngs = validEvents.map((e) => e.coordinates.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(0.05, maxLat - minLat);
    const lngSpan = Math.max(0.05, maxLng - minLng);

    const routePoints: THREE.Vector3[] = validEvents.map((ev, idx) => {
      if (validEvents.length === 1) {
        const y = sampleTerrainHeight(0, 0) + 0.18;
        return new THREE.Vector3(0, y, 0);
      }
      const nx = ((ev.coordinates.lng - minLng) / lngSpan - 0.5) * 12;
      const nz = -((ev.coordinates.lat - minLat) / latSpan - 0.5) * 12;
      const ny = sampleTerrainHeight(nx, nz) + 0.22 + (idx % 2 === 0 ? 0.02 : 0.04);
      return new THREE.Vector3(nx, ny, nz);
    });

    const disposables: Array<{ dispose: () => void }> = [];

    // Elevated Glowing Route Curve
    let curve: THREE.CatmullRomCurve3 | null = null;
    if (routePoints.length >= 2) {
      curve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.45);
      const tubeGeo = new THREE.TubeGeometry(curve, 96, 0.1, 10, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x00e5c3,
        emissive: 0x00e5c3,
        emissiveIntensity: 1.4,
        roughness: 0.25,
        metalness: 0.5,
      });
      disposables.push(tubeGeo, tubeMat);
      const routeRibbon = new THREE.Mesh(tubeGeo, tubeMat);
      routeRibbon.castShadow = !isSoftwareGl;
      scene.add(routeRibbon);
    }

    // Waypoint Beacons & Raycast Targets
    const clickableMeshes: THREE.Object3D[] = [];
    const baseGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.14, 16);
    const spireGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.9, 12);
    const orbGeo = new THREE.OctahedronGeometry(0.22, 0);
    disposables.push(baseGeo, spireGeo, orbGeo);

    validEvents.forEach((ev, idx) => {
      const pt = routePoints[idx];
      const groundY = sampleTerrainHeight(pt.x, pt.z);

      if (ev.type === 'Charging stop') {
        const charger = createChargingStationModel(contactShadowTex, isSoftwareGl);
        charger.root.scale.setScalar(0.55);
        charger.root.position.set(pt.x, groundY, pt.z);
        charger.statusRingMaterial.color.setHex(0xfbbf24);
        charger.statusRingMaterial.emissive.setHex(0xfbbf24);
        charger.root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.userData.eventItem = ev;
            clickableMeshes.push(child);
          }
        });
        scene.add(charger.root);
        disposables.push({ dispose: charger.dispose });
      } else {
        const colorHex =
          ev.type === 'Starting point'
            ? 0x2dd4bf
            : ev.type === 'Destination'
            ? 0xfafafa
            : 0x60a5fa;
        const beaconGroup = new THREE.Group();
        beaconGroup.position.set(pt.x, groundY, pt.z);

        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.9,
          roughness: 0.3,
          metalness: 0.65,
        });
        disposables.push(mat);

        const base = new THREE.Mesh(baseGeo, terrainMat);
        base.position.y = 0.07;
        const spire = new THREE.Mesh(spireGeo, mat);
        spire.position.y = 0.55;
        const orb = new THREE.Mesh(orbGeo, mat);
        orb.position.y = 1.18;

        [base, spire, orb].forEach((m) => {
          m.userData.eventItem = ev;
          clickableMeshes.push(m);
          beaconGroup.add(m);
        });
        scene.add(beaconGroup);
      }
    });

    // Miniature Composite EV Rover riding the route spline
    const isSedan =
      vehicleModel.toLowerCase().includes('ioniq 6') ||
      vehicleModel.toLowerCase().includes('model 3');
    const miniEv = createProceduralEvModel({
      bodyStyle: isSedan ? 'sedan' : 'suv',
      paintColor: vehicleColour,
      isSoftwareGl,
      contactShadowTexture: contactShadowTex,
    });
    miniEv.root.scale.setScalar(0.32);
    miniEv.root.position.copy(routePoints[0]);
    if (curve) {
      curve.getTangentAt(0, _tanVec);
      _lookTarget.copy(routePoints[0]).add(_tanVec);
      miniEv.root.lookAt(_lookTarget);
      miniEv.root.rotateY(-Math.PI / 2);
    }
    scene.add(miniEv.root);

    // Raycast click-to-inspect stop
    const raycaster = new THREE.Raycaster();
    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const hitEv = hits[0].object.userData.eventItem as TimelineEvent | undefined;
        if (hitEv) setSelectedStop(hitEv);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const handleResize = () => {
      if (!container) return;
      const rw = container.clientWidth || 800;
      const rh = container.clientHeight || 420;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

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

      if (playingRef.current && curve) {
        progressRef.current += dt * 0.14;
        if (progressRef.current >= 1) {
          progressRef.current = 1;
          setPlaying(false);
        }
        curve.getPointAt(progressRef.current, _posVec);
        curve.getTangentAt(progressRef.current, _tanVec);
        miniEv.root.position.copy(_posVec);
        _lookTarget.copy(_posVec).add(_tanVec);
        miniEv.root.lookAt(_lookTarget);
        miniEv.root.rotateY(-Math.PI / 2);
        miniEv.spinWheels(dt * 4.5);
      }

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
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      miniEv.dispose();
      disposables.forEach((d) => d.dispose());
      terrainGeo.dispose();
      terrainMat.dispose();
      topoTex.dispose();
      contactShadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [eventsKey, vehicleModel, vehicleColour]);

  if (validEvents.length === 0) {
    return (
      <div
        className={`w-full ${heightClass} rounded-xl border border-[var(--border)] bg-[#080D12] flex flex-col items-center justify-center text-center px-6`}
      >
        <p className="text-sm font-medium text-white">No GPS waypoints to render in 3D</p>
        <p className="mt-1 text-xs text-zinc-400">
          Add coordinates to your stops to generate the 3D topographic route diorama.
        </p>
      </div>
    );
  }

  if (webglError) {
    return (
      <div
        className={`w-full ${heightClass} rounded-xl border border-[var(--border)] bg-[#080D12] flex items-center justify-center text-xs text-zinc-400`}
      >
        WebGL2 context unavailable for 3D terrain route. Switch back to 2D Map above.
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${heightClass} overflow-hidden rounded-xl border border-[var(--border)] bg-[#080D12]`}
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* Bottom Floating Controls (Solid RGBA, Zero Backdrop Blur) */}
      <div className="pointer-events-none absolute left-3 right-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
        <div
          className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5"
          style={{ backgroundColor: 'rgba(8, 13, 18, 0.9)' }}
        >
          {validEvents.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                if (progressRef.current >= 1) progressRef.current = 0;
                setPlaying((p) => !p);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E5C3] px-2.5 py-1 text-[11px] font-semibold text-[#062322]"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{playing ? 'Pause 3D' : '3D Flythrough'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              progressRef.current = 0;
            }}
            aria-label="Reset 3D flythrough"
            className="p-1 text-zinc-300 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Drag to orbit · Click any 3D beacon
          </span>
        </div>

        {selectedStop && (
          <div
            className="pointer-events-auto rounded-xl border border-white/15 px-3 py-1.5 text-[11px] text-white max-w-[260px] truncate"
            style={{ backgroundColor: 'rgba(8, 13, 18, 0.9)' }}
          >
            <span className="text-[#00E5C3] font-medium">{selectedStop.type}</span>
            <span className="text-zinc-400"> · </span>
            <span>{selectedStop.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}
