import * as THREE from 'three';
import { ProceduralPCBGenerator, type ProceduralPCBTextures } from './proceduralPCB';

export type TextureMode = 'photo' | 'procedural' | 'artwork';

/**
 * PBR materials for the Matrix 1S 5IN1 II board and electronic components.
 */
export class MaterialLibrary {
  // PCB Substrate edge (matte dark epoxy fiberglass / FR4 with subtle brown/dark green tint)
  readonly substrateEdge: THREE.MeshStandardMaterial;

  // Mounting hole exposed copper/gold rings
  readonly goldPlating: THREE.MeshStandardMaterial;

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

  // Procedural PBR Texture Suites (Physically Plausible Layered Model)
  topProcedural: ProceduralPCBTextures | null = null;
  bottomProcedural: ProceduralPCBTextures | null = null;

  private textureMode: 'photo' | 'procedural' = 'procedural';
  private showSchematicOverlay = false;

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
      roughness: 1.0,
      metalness: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.bottomFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Initialize Procedural PBR Textures
    this.rebuildProceduralTextures();
  }

  private disposeProceduralSuite(suite: ProceduralPCBTextures | null) {
    if (!suite) return;
    suite.colorMap.dispose();
    suite.roughnessMap.dispose();
    suite.metalnessMap.dispose();
    suite.bumpMap.dispose();
  }

  /**
   * Generates or updates the procedural PBR textures.
   */
  rebuildProceduralTextures() {
    // Clean up previous CanvasTextures to prevent WebGL memory leak
    this.disposeProceduralSuite(this.topProcedural);
    this.disposeProceduralSuite(this.bottomProcedural);

    this.topProcedural = ProceduralPCBGenerator.generate('top', {
      showSchematicOverlay: this.showSchematicOverlay,
    });
    this.bottomProcedural = ProceduralPCBGenerator.generate('bottom', {
      showSchematicOverlay: this.showSchematicOverlay,
    });
    this.updateTextureMaps();
  }

  loadTextures(onLoad?: () => void) {
    const loader = new THREE.TextureLoader();
    let loaded = 0;
    const checkAll = () => {
      loaded++;
      if (loaded >= 2) {
        this.updateTextureMaps();
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

    this.topPhotoTex = loader.load('./assets/top_photo.jpg', (t) => { configure(t); checkAll(); });
    this.bottomPhotoTex = loader.load('./assets/bottom_photo.jpg', (t) => { configure(t); checkAll(); });
  }

  setTextureMode(mode: TextureMode) {
    this.textureMode = mode === 'photo' ? 'photo' : 'procedural';
    this.updateTextureMaps();
  }

  getTextureMode(): 'photo' | 'procedural' {
    return this.textureMode;
  }

  toggleSchematicOverlay(enabled?: boolean) {
    this.showSchematicOverlay = enabled !== undefined ? enabled : !this.showSchematicOverlay;
    this.rebuildProceduralTextures();
  }

  isSchematicOverlayActive(): boolean {
    return this.showSchematicOverlay;
  }

  private updateTextureMaps() {
    if (this.textureMode === 'photo') {
      // 1. Photographic Mode (Rectified official photos)
      this.topFaceMat.map = this.topPhotoTex;
      this.bottomFaceMat.map = this.bottomPhotoTex;
      this.topFaceMat.roughnessMap = null;
      this.bottomFaceMat.roughnessMap = null;
      this.topFaceMat.metalnessMap = null;
      this.bottomFaceMat.metalnessMap = null;
      this.topFaceMat.bumpMap = null;
      this.bottomFaceMat.bumpMap = null;
      this.topFaceMat.roughness = 0.65;
      this.bottomFaceMat.roughness = 0.65;
      this.topFaceMat.metalness = 0.12;
      this.bottomFaceMat.metalness = 0.12;
    } else {
      // 2. Procedural PCB Mode (Physically Plausible PBR Layered Model)
      if (this.topProcedural && this.bottomProcedural) {
        this.topFaceMat.map = this.topProcedural.colorMap;
        this.topFaceMat.roughnessMap = this.topProcedural.roughnessMap;
        this.topFaceMat.metalnessMap = this.topProcedural.metalnessMap;
        this.topFaceMat.bumpMap = this.topProcedural.bumpMap;
        this.topFaceMat.bumpScale = 0.035;
        this.topFaceMat.roughness = 1.0;
        this.topFaceMat.metalness = 1.0;

        this.bottomFaceMat.map = this.bottomProcedural.colorMap;
        this.bottomFaceMat.roughnessMap = this.bottomProcedural.roughnessMap;
        this.bottomFaceMat.metalnessMap = this.bottomProcedural.metalnessMap;
        this.bottomFaceMat.bumpMap = this.bottomProcedural.bumpMap;
        this.bottomFaceMat.bumpScale = 0.035;
        this.bottomFaceMat.roughness = 1.0;
        this.bottomFaceMat.metalness = 1.0;
      }
    }
    this.topFaceMat.needsUpdate = true;
    this.bottomFaceMat.needsUpdate = true;
  }

  dispose() {
    this.disposeProceduralSuite(this.topProcedural);
    this.disposeProceduralSuite(this.bottomProcedural);
    this.topProcedural = null;
    this.bottomProcedural = null;
    this.topPhotoTex?.dispose();
    this.bottomPhotoTex?.dispose();
    this.topPhotoTex = null;
    this.bottomPhotoTex = null;
    this.substrateEdge.dispose();
    this.goldPlating.dispose();
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
