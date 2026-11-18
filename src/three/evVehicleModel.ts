import * as THREE from 'three';

export interface EvModelOptions {
  bodyStyle?: 'suv' | 'sedan';
  paintColor?: string;
  isSoftwareGl?: boolean;
  contactShadowTexture: THREE.Texture;
}

export interface EvModelRig {
  root: THREE.Group;
  bodyPaintMaterial: THREE.MeshPhysicalMaterial;
  wheels: THREE.Group[];
  setExplodeFactor: (factor: number) => void;
  spinWheels: (distanceDelta: number) => void;
  dispose: () => void;
}

export function resolveColorHex(label: string): string {
  const lower = (label || '').toLowerCase();
  if (lower.startsWith('#')) return label;
  if (lower.includes('teal') || lower.includes('emerald')) return '#14B8A6';
  if (lower.includes('white') || lower.includes('glacier') || lower.includes('pearl'))
    return '#E2E8F0';
  if (lower.includes('silver') || lower.includes('nocturne')) return '#94A3B8';
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('glaze'))
    return '#DC2626';
  if (lower.includes('gold') || lower.includes('amber')) return '#D97706';
  if (lower.includes('blue') || lower.includes('cobalt') || lower.includes('ocean'))
    return '#2563EB';
  return '#272C35';
}

export function createProceduralEvModel(options: EvModelOptions): EvModelRig {
  const isSuv = options.bodyStyle !== 'sedan';
  const isSoftwareGl = Boolean(options.isSoftwareGl);
  const paintHex = resolveColorHex(options.paintColor || '#272C35');

  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // Shared PBR Materials with deliberate roughness/metalness contrast
  const bodyPaintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paintHex),
    metalness: 0.78,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0B131E'),
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 1.0,
    transmission: isSoftwareGl ? 0 : 0.42,
    transparent: true,
    opacity: isSoftwareGl ? 0.88 : 1,
    ior: 1.52,
  });

  const carbonTrimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#14171D'),
    metalness: 0.15,
    roughness: 0.72,
  });

  const brushedAlloyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#CBD5E1'),
    metalness: 0.92,
    roughness: 0.2,
  });

  const rubberTireMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#121418'),
    metalness: 0.04,
    roughness: 0.88,
  });

  const batteryFrameMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1E293B'),
    metalness: 0.82,
    roughness: 0.32,
  });

  const batteryGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#00E5C3'),
    emissive: new THREE.Color('#00E5C3'),
    emissiveIntensity: 1.35,
    metalness: 0.2,
    roughness: 0.25,
  });

  const drlGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#E0F2FE'),
    emissive: new THREE.Color('#38BDF8'),
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });

  const tailGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FB7185'),
    emissive: new THREE.Color('#E11D48'),
    emissiveIntensity: 1.8,
    roughness: 0.15,
  });

  const caliperMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#00E5C3'),
    metalness: 0.45,
    roughness: 0.35,
  });

  disposables.push(
    bodyPaintMaterial,
    glassMaterial,
    carbonTrimMaterial,
    brushedAlloyMaterial,
    rubberTireMaterial,
    batteryFrameMaterial,
    batteryGlowMaterial,
    drlGlowMaterial,
    tailGlowMaterial,
    caliperMaterial
  );

  // 1. Primary Sculpted Body Shell (ExtrudeGeometry side silhouette rotated into X/Y/Z)
  const bodyGroup = new THREE.Group();
  const bodyShape = new THREE.Shape();
  if (isSuv) {
    bodyShape.moveTo(-2.15, 0.42);
    bodyShape.lineTo(2.12, 0.42);
    bodyShape.lineTo(2.22, 0.72);
    bodyShape.lineTo(1.96, 1.02);
    bodyShape.lineTo(0.88, 1.12);
    bodyShape.lineTo(0.28, 1.56);
    bodyShape.lineTo(-1.42, 1.54);
    bodyShape.lineTo(-2.06, 1.16);
    bodyShape.lineTo(-2.22, 0.68);
    bodyShape.closePath();
  } else {
    // Sleek Aero Sedan profile
    bodyShape.moveTo(-2.22, 0.36);
    bodyShape.lineTo(2.2, 0.36);
    bodyShape.lineTo(2.28, 0.62);
    bodyShape.lineTo(1.88, 0.92);
    bodyShape.lineTo(0.86, 1.02);
    bodyShape.lineTo(0.18, 1.42);
    bodyShape.lineTo(-1.12, 1.4);
    bodyShape.lineTo(-1.98, 1.04);
    bodyShape.lineTo(-2.26, 0.66);
    bodyShape.closePath();
  }

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 1.66,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.08,
    bevelSegments: 4,
  });
  bodyGeo.translate(0, 0, -0.83);
  bodyGeo.computeVertexNormals();
  disposables.push(bodyGeo);

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyPaintMaterial);
  bodyMesh.castShadow = !isSoftwareGl;
  bodyMesh.receiveShadow = !isSoftwareGl;
  bodyGroup.add(bodyMesh);

  // 2. Sculpted Front Hood Accent Ridge
  const hoodGeo = new THREE.BoxGeometry(0.95, 0.07, 1.24);
  disposables.push(hoodGeo);
  const hoodMesh = new THREE.Mesh(hoodGeo, bodyPaintMaterial);
  hoodMesh.position.set(1.38, isSuv ? 1.08 : 0.96, 0);
  hoodMesh.rotation.z = -0.14;
  hoodMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(hoodMesh);

  // 3. Carbon Lower Aero Splitter & Side Skirts
  const skirtGeo = new THREE.BoxGeometry(4.52, 0.14, 1.88);
  disposables.push(skirtGeo);
  const skirtMesh = new THREE.Mesh(skirtGeo, carbonTrimMaterial);
  skirtMesh.position.set(0, isSuv ? 0.38 : 0.33, 0);
  skirtMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(skirtMesh);

  // 4. Rear Brushed Aluminum Diffuser
  const diffuserGeo = new THREE.BoxGeometry(0.24, 0.18, 1.46);
  disposables.push(diffuserGeo);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, brushedAlloyMaterial);
  diffuserMesh.position.set(-2.18, isSuv ? 0.42 : 0.37, 0);
  bodyGroup.add(diffuserMesh);

  // 5. Full-Width Front LED DRL Lightbar (TubeGeometry)
  const frontDrlCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.14, isSuv ? 0.88 : 0.78, -0.78),
    new THREE.Vector3(2.26, isSuv ? 0.89 : 0.79, 0),
    new THREE.Vector3(2.14, isSuv ? 0.88 : 0.78, 0.78),
  ]);
  const frontDrlGeo = new THREE.TubeGeometry(frontDrlCurve, 24, 0.028, 8, false);
  disposables.push(frontDrlGeo);
  const frontDrlMesh = new THREE.Mesh(frontDrlGeo, drlGlowMaterial);
  bodyGroup.add(frontDrlMesh);

  // 6. Full-Width Rear LED Taillight Blade (TubeGeometry)
  const rearLightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.18, isSuv ? 1.02 : 0.92, -0.78),
    new THREE.Vector3(-2.25, isSuv ? 1.04 : 0.94, 0),
    new THREE.Vector3(-2.18, isSuv ? 1.02 : 0.92, 0.78),
  ]);
  const rearLightGeo = new THREE.TubeGeometry(rearLightCurve, 24, 0.028, 8, false);
  disposables.push(rearLightGeo);
  const rearLightMesh = new THREE.Mesh(rearLightGeo, tailGlowMaterial);
  bodyGroup.add(rearLightMesh);

  // 7. Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.22, 0.1, 0.18);
  disposables.push(mirrorGeo);
  [-0.98, 0.98].forEach((zPos) => {
    const mirror = new THREE.Mesh(mirrorGeo, carbonTrimMaterial);
    mirror.position.set(0.66, isSuv ? 1.15 : 1.04, zPos);
    mirror.castShadow = !isSoftwareGl;
    bodyGroup.add(mirror);
  });

  root.add(bodyGroup);

  // 8. Panoramic Glass Canopy Group (lifts separately during Exploded View)
  const canopyGroup = new THREE.Group();
  const canopyShape = new THREE.Shape();
  if (isSuv) {
    canopyShape.moveTo(-1.62, 1.16);
    canopyShape.lineTo(0.84, 1.12);
    canopyShape.lineTo(0.24, 1.59);
    canopyShape.lineTo(-1.38, 1.57);
    canopyShape.closePath();
  } else {
    canopyShape.moveTo(-1.76, 1.05);
    canopyShape.lineTo(0.82, 1.02);
    canopyShape.lineTo(0.14, 1.45);
    canopyShape.lineTo(-1.08, 1.43);
    canopyShape.closePath();
  }
  const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
    depth: 1.42,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  canopyGeo.translate(0, 0, -0.71);
  disposables.push(canopyGeo);

  const canopyMesh = new THREE.Mesh(canopyGeo, glassMaterial);
  canopyMesh.castShadow = !isSoftwareGl;
  canopyGroup.add(canopyMesh);
  root.add(canopyGroup);

  // 9. Skateboard Underfloor Battery Pack (inspectable in Exploded View)
  const batteryGroup = new THREE.Group();
  const packFrameGeo = new THREE.BoxGeometry(2.75, 0.14, 1.42);
  disposables.push(packFrameGeo);
  const packFrame = new THREE.Mesh(packFrameGeo, batteryFrameMaterial);
  packFrame.position.set(-0.02, 0.25, 0);
  packFrame.castShadow = !isSoftwareGl;
  batteryGroup.add(packFrame);

  // Glowing 800V Battery Cell Modules + Busbar Ribs
  const cellGeo = new THREE.BoxGeometry(0.32, 0.05, 1.18);
  disposables.push(cellGeo);
  for (let i = -3; i <= 3; i += 1) {
    const cell = new THREE.Mesh(cellGeo, batteryGlowMaterial);
    cell.position.set(i * 0.36, 0.32, 0);
    batteryGroup.add(cell);
  }
  root.add(batteryGroup);

  // 10. Four Composite Wheel Assemblies (Lathe-style tire + multi-spoke alloy + caliper)
  const wheels: THREE.Group[] = [];
  const wheelOffsets: Array<[number, number, number]> = [
    [1.42, isSuv ? 0.38 : 0.35, 0.92],
    [1.42, isSuv ? 0.38 : 0.35, -0.92],
    [-1.42, isSuv ? 0.38 : 0.35, 0.92],
    [-1.42, isSuv ? 0.38 : 0.35, -0.92],
  ];

  const tireProfile = [
    new THREE.Vector2(0.22, -0.13),
    new THREE.Vector2(0.36, -0.12),
    new THREE.Vector2(0.38, 0),
    new THREE.Vector2(0.36, 0.12),
    new THREE.Vector2(0.22, 0.13),
  ];
  const tireGeo = new THREE.LatheGeometry(tireProfile, 28);
  tireGeo.rotateX(Math.PI / 2);
  const rimBarrelGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.22, 24);
  rimBarrelGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.045, 0.42, 0.05);
  const hubCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 16);
  hubCapGeo.rotateX(Math.PI / 2);
  const caliperGeo = new THREE.BoxGeometry(0.11, 0.15, 0.08);
  disposables.push(tireGeo, rimBarrelGeo, spokeGeo, hubCapGeo, caliperGeo);

  const wheelContainers: Array<{
    group: THREE.Group;
    spinGroup: THREE.Group;
    basePos: [number, number, number];
  }> = [];

  wheelOffsets.forEach(([x, y, z]) => {
    const wheelHolder = new THREE.Group();
    wheelHolder.position.set(x, y, z);

    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, rubberTireMaterial);
    tire.castShadow = !isSoftwareGl;
    tire.receiveShadow = !isSoftwareGl;
    spinGroup.add(tire);

    const rimBarrel = new THREE.Mesh(rimBarrelGeo, carbonTrimMaterial);
    spinGroup.add(rimBarrel);

    // 5 alloy spokes
    for (let s = 0; s < 5; s += 1) {
      const spoke = new THREE.Mesh(spokeGeo, brushedAlloyMaterial);
      spoke.rotation.z = (s * Math.PI) / 5;
      spoke.position.z = z > 0 ? 0.08 : -0.08;
      spinGroup.add(spoke);
    }

    const hub = new THREE.Mesh(hubCapGeo, brushedAlloyMaterial);
    spinGroup.add(hub);

    wheelHolder.add(spinGroup);

    // Non-spinning EV brake caliper
    const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
    caliper.position.set(-0.12, 0.04, z > 0 ? 0.04 : -0.04);
    wheelHolder.add(caliper);

    root.add(wheelHolder);
    wheels.push(spinGroup);
    wheelContainers.push({ group: wheelHolder, spinGroup, basePos: [x, y, z] });
  });

  // 11. Soft Radial Contact Shadow Plane (prevents floating appearance)
  const shadowGeo = new THREE.PlaneGeometry(5.8, 3.1);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: options.contactShadowTexture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  disposables.push(shadowGeo, shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  const setExplodeFactor = (factor: number) => {
    const f = THREE.MathUtils.clamp(factor, 0, 1);
    bodyGroup.position.y = f * 0.62;
    canopyGroup.position.y = f * 1.25;
    batteryGroup.position.y = -f * 0.08;
    batteryGroup.position.z = f * 0.78;
    wheelContainers.forEach(({ group, basePos }) => {
      const sideSign = basePos[2] >= 0 ? 1 : -1;
      group.position.set(basePos[0], basePos[1], basePos[2] + sideSign * f * 0.55);
    });
  };

  const spinWheels = (distanceDelta: number) => {
    const angle = distanceDelta / 0.36;
    wheelContainers.forEach(({ spinGroup }) => {
      spinGroup.rotation.z -= angle;
    });
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    root,
    bodyPaintMaterial,
    wheels,
    setExplodeFactor,
    spinWheels,
    dispose,
  };
}
