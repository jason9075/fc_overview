import * as THREE from 'three';
/**
 * PBR materials for the Matrix 1S 5IN1 II board and electronic components.
 */
export class MaterialLibrary {
  // PCB Substrate edge (matte dark epoxy fiberglass / FR4 with subtle brown/dark green tint)
  readonly substrateEdge: THREE.MeshStandardMaterial;

  // Mounting hole exposed copper/gold rings
  readonly goldPlating: THREE.MeshStandardMaterial;

  // Flat solder pads need stronger depth bias than the photo face plates.
  readonly solderPadGold: THREE.MeshStandardMaterial;

  // Solder joints / tin plating
  readonly solderTin: THREE.MeshStandardMaterial;

  // Standard black epoxy IC packaging
  readonly icBody: THREE.MeshStandardMaterial;

  // IC silver leads / solder pads
  readonly icLead: THREE.MeshStandardMaterial;

  // Crystal oscillator metallic cans (shiny silver/steel)
  readonly crystalMetal: THREE.MeshStandardMaterial;

  // JST1.25 connector body (slightly yellowish translucent nylon / ivory plastic)
  readonly jstNylon: THREE.MeshStandardMaterial;

  // SH1.0 connector body (matte white/cream thermoplastic)
  readonly shBody: THREE.MeshStandardMaterial;

  // Brass / gold pins inside connectors
  readonly connectorPin: THREE.MeshStandardMaterial;

  // Ceramic antenna / capacitor bodies
  readonly ceramicBody: THREE.MeshStandardMaterial;
  readonly mlccTan: THREE.MeshStandardMaterial;

  // Current sense shunt resistor (dark matte body with large silver terminations)
  readonly shuntBody: THREE.MeshStandardMaterial;

  // Forward arrow material
  readonly forwardArrowMat: THREE.MeshStandardMaterial;

  // Texture materials for top and bottom face plates
  readonly topFaceMat: THREE.MeshStandardMaterial;
  readonly bottomFaceMat: THREE.MeshStandardMaterial;

  // Photographic textures (from official rectified product photos)
  topPhotoTex: THREE.Texture | null = null;
  bottomPhotoTex: THREE.Texture | null = null;

  constructor() {
    this.substrateEdge = new THREE.MeshStandardMaterial({
      color: 0x1b1c18,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.goldPlating = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.92,
    });

    this.solderPadGold = this.goldPlating.clone();
    this.solderPadGold.polygonOffset = true;
    this.solderPadGold.polygonOffsetFactor = -2;
    this.solderPadGold.polygonOffsetUnits = -2;

    this.solderTin = new THREE.MeshStandardMaterial({
      color: 0xd8dde2,
      roughness: 0.3,
      metalness: 0.9,
    });

    this.icBody = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.55,
      metalness: 0.15,
    });

    this.icLead = new THREE.MeshStandardMaterial({
      color: 0xcfd6dc,
      roughness: 0.25,
      metalness: 0.85,
    });

    this.crystalMetal = new THREE.MeshStandardMaterial({
      color: 0xe6e9ec,
      roughness: 0.2,
      metalness: 0.92,
    });

    this.jstNylon = new THREE.MeshStandardMaterial({
      color: 0xf5eed8,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94,
    });

    this.shBody = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.45,
      metalness: 0.05,
    });

    this.connectorPin = new THREE.MeshStandardMaterial({
      color: 0xe5c158,
      roughness: 0.25,
      metalness: 0.9,
    });

    this.ceramicBody = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.mlccTan = new THREE.MeshStandardMaterial({
      color: 0xb58852,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.shuntBody = new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.7,
      metalness: 0.2,
    });

    this.forwardArrowMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0099cc,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.2,
    });

    this.topFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.bottomFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }

  loadTextures(onLoad?: () => void) {
    const loader = new THREE.TextureLoader();
    let loaded = 0;
    const checkAll = () => {
      loaded++;
      if (loaded >= 2) {
        if (onLoad) onLoad();
      }
    };

    const configure = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
    };

    this.topPhotoTex = loader.load('./assets/top_photo.jpg', (t) => {
      configure(t);
      this.topFaceMat.map = t;
      this.topFaceMat.needsUpdate = true;
      checkAll();
    });
    this.bottomPhotoTex = loader.load('./assets/bottom_photo.jpg', (t) => {
      configure(t);
      this.bottomFaceMat.map = t;
      this.bottomFaceMat.needsUpdate = true;
      checkAll();
    });
  }

  dispose() {
    this.topPhotoTex?.dispose();
    this.bottomPhotoTex?.dispose();
    this.topPhotoTex = null;
    this.bottomPhotoTex = null;
    this.substrateEdge.dispose();
    this.goldPlating.dispose();
    this.solderPadGold.dispose();
    this.solderTin.dispose();
    this.icBody.dispose();
    this.icLead.dispose();
    this.crystalMetal.dispose();
    this.jstNylon.dispose();
    this.shBody.dispose();
    this.connectorPin.dispose();
    this.ceramicBody.dispose();
    this.mlccTan.dispose();
    this.shuntBody.dispose();
    this.forwardArrowMat.dispose();
    this.topFaceMat.dispose();
    this.bottomFaceMat.dispose();
  }
}
