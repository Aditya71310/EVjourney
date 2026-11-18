import * as THREE from 'three';

export interface ChargingStationRig {
  root: THREE.Group;
  statusRingMaterial: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createChargingStationModel(
  contactShadowTexture: THREE.Texture,
  isSoftwareGl = false
): ChargingStationRig {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const plinthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1E242E'),
    roughness: 0.88,
    metalness: 0.08,
  });
  const monolithMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#27303F'),
    roughness: 0.28,
    metalness: 0.76,
    clearcoat: 0.6,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#09131C'),
    emissive: new THREE.Color('#0B3B38'),
    emissiveIntensity: 0.9,
    roughness: 0.12,
    metalness: 0.2,
  });
  const statusRingMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#00E5C3'),
    emissive: new THREE.Color('#00E5C3'),
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0F172A'),
    roughness: 0.75,
    metalness: 0.1,
  });

  disposables.push(plinthMat, monolithMat, screenMat, statusRingMaterial, cableMat);

  // 1. Concrete Plinth (bottom-center flush with y = 0)
  const plinthGeo = new THREE.BoxGeometry(1.05, 0.14, 0.85);
  disposables.push(plinthGeo);
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = 0.07;
  plinth.castShadow = !isSoftwareGl;
  plinth.receiveShadow = !isSoftwareGl;
  root.add(plinth);

  // 2. Beveled Charger Monolith (ExtrudeGeometry)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-0.28, 0);
  bodyShape.lineTo(0.28, 0);
  bodyShape.lineTo(0.24, 2.15);
  bodyShape.lineTo(-0.24, 2.15);
  bodyShape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  bodyGeo.translate(0, 0.14, -0.17);
  disposables.push(bodyGeo);
  const monolith = new THREE.Mesh(bodyGeo, monolithMat);
  monolith.castShadow = !isSoftwareGl;
  root.add(monolith);

  // 3. Recessed Telemetry Screen & Glowing Status Strip
  const screenGeo = new THREE.BoxGeometry(0.32, 0.42, 0.04);
  disposables.push(screenGeo);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 1.48, 0.21);
  root.add(screen);

  const ringGeo = new THREE.BoxGeometry(0.48, 0.05, 0.42);
  disposables.push(ringGeo);
  const statusRing = new THREE.Mesh(ringGeo, statusRingMaterial);
  statusRing.position.set(0, 2.18, 0);
  root.add(statusRing);

  // 4. Cantilevered Canopy Overhang
  const canopyGeo = new THREE.BoxGeometry(0.95, 0.08, 1.15);
  disposables.push(canopyGeo);
  const canopy = new THREE.Mesh(canopyGeo, monolithMat);
  canopy.position.set(0, 2.52, 0.26);
  canopy.castShadow = !isSoftwareGl;
  root.add(canopy);

  // 5. Flexible CCS2 Charging Cable (TubeGeometry catenary)
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.28, 1.55, 0.04),
    new THREE.Vector3(0.55, 1.05, 0.22),
    new THREE.Vector3(0.48, 0.65, 0.32),
    new THREE.Vector3(0.32, 1.15, 0.18),
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 28, 0.028, 8, false);
  disposables.push(cableGeo);
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.castShadow = !isSoftwareGl;
  root.add(cable);

  // 6. Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(1.9, 1.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  disposables.push(shadowGeo, shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.012;
  root.add(contactShadow);

  return {
    root,
    statusRingMaterial,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
