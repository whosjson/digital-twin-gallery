import * as THREE from "three";
import normalizeWheel from "normalize-wheel";

const portraitVertShader = `
varying vec2 vUv;
varying float vDepth;
void main() {
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vDepth = -mv.z;
}
`;

const portraitFragShader = `
varying vec2 vUv;
varying float vDepth;
uniform sampler2D uMap;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uGlow;
void main() {
  vec4 c = texture2D(uMap, vUv);
  // lift brightness so portraits read clearly against the bright cyberspace
  c.rgb *= 1.0;
  float fogF = smoothstep(uFogNear, uFogFar, vDepth);
  c.rgb = mix(c.rgb, uFogColor, fogF);
  // hover highlight rim
  float ex = abs(vUv.x - 0.5) * 2.0;
  float ey = abs(vUv.y - 0.5) * 2.0;
  float e = max(ex, ey);
  float rim = smoothstep(0.82, 0.97, e) * (1.0 - smoothstep(0.97, 1.0, e));
  c.rgb += vec3(0.95, 0.80, 0.50) * rim * uGlow * 0.8;
  gl_FragColor = c;
}
`;

export interface VirtualItem {
  src: string;
  title: string;
  en?: string;
  note?: string;
}

interface Slot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  index: number; // image index
  side: number;  // -1 left, +1 right
  z: number;
  x: number;
  y: number;
}

const HALL_LEN = 160;      // total corridor length
const HALL_W = 3.6;        // half width (portrait plane x)
const PORTRAIT_W = 1.7;
const PORTRAIT_H = 2.15;
const ROW_SPACING = 3.2;   // depth between rows
const EYE_Y = 1.6;

export default class VirtualCorridor {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  slots: Slot[] = [];
  items: VirtualItem[] = [];
  textures: THREE.Texture[] = [];

  scrollTarget = 0;
  scrollCurrent = 0;
  autoSpeed = 0.012;
  paused = false;
  motionScale = 1;

  private disposed = false;
  private fogColor = new THREE.Color(0xe8ddf2);
  private bgTexture: THREE.Texture | null = null;

  constructor(canvas: HTMLCanvasElement, items: VirtualItem[]) {
    this.items = items;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8ddf2);

    // Anime-style dreamy sky backdrop (Makoto Shinkai style)
    new THREE.TextureLoader().load("/images/virtual_anime_bg.jpg", (tex) => {
      if (this.disposed) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.bgTexture = tex;
      this.scene.background = tex;
      (this.scene as unknown as { backgroundIntensity: number }).backgroundIntensity = 1.0;
      // A glowing end-wall so the corridor has real depth, not a void
      const geo = new THREE.PlaneGeometry(HALL_W * 2.4, 5.0);
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const endWall = new THREE.Mesh(geo, mat);
      endWall.position.set(0, 2.4, -HALL_LEN + 24);
      this.scene.add(endWall);
    });

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(0, EYE_Y, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (err) {
      console.error("WebGL unavailable:", err);
      throw new Error("WEBGL_UNAVAILABLE");
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

    this.setupEvents();
    this.init();
  }

  async init() {
    await this.loadTextures();
    this.buildHall();
    this.buildPortraits();
    this.render();
  }

  async loadTextures() {
    const loader = new THREE.TextureLoader();
    const load = (src: string) =>
      new Promise<THREE.Texture>((resolve) => {
        loader.load(
          src,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            resolve(t);
          },
          undefined,
          () => resolve(this.blankTexture())
        );
      });
    this.textures = await Promise.all(this.items.map((i) => load(i.src)));
  }

  blankTexture() {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 5;
    const g = c.getContext("2d")!;
    g.fillStyle = "#14161c";
    g.fillRect(0, 0, 4, 5);
    return new THREE.CanvasTexture(c);
  }

  /** Build floor / ceiling with translucent cyberspace surfaces */
  buildHall() {
    // Floor — nearly invisible so the anime sky flows beneath the portraits
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W * 2, HALL_LEN),
      new THREE.MeshBasicMaterial({
        color: 0xf2e9f7,
        transparent: true,
        opacity: 0.22,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -HALL_LEN / 2);
    this.scene.add(floor);

    // Ceiling — even lighter, almost gone
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W * 2, HALL_LEN),
      new THREE.MeshBasicMaterial({
        color: 0xf6eefb,
        transparent: true,
        opacity: 0.12,
      })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 3.4, -HALL_LEN / 2);
    this.scene.add(ceil);

    // Side walls removed so the luminous backdrop shows through; portraits
    // float in the space like holograms.

    // Warm picture-lights along the corridor so portraits read clearly
    for (let i = 0; i < 10; i++) {
      const light = new THREE.PointLight(0xffe6b8, 1.1, 18, 2);
      light.position.set(0, 3.1, -6 - i * 16);
      this.scene.add(light);
    }
    const ambient = new THREE.AmbientLight(0x404050, 1.2);
    this.scene.add(ambient);
  }

  makeSurfaceTexture(kind: "floor" | "wall" | "ceil"): THREE.Texture {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d")!;
    if (kind === "floor") {
      g.fillStyle = "#dfeefb";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "rgba(90,170,235,0.25)";
      g.lineWidth = 2;
      g.strokeRect(2, 2, 252, 252);
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillRect(0, 100, 256, 60);
    } else if (kind === "wall") {
      g.fillStyle = "#d6e9f8";
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = "rgba(120,180,240,0.15)";
      g.fillRect(0, 170, 256, 4);
    } else {
      g.fillStyle = "#e8f3fd";
      g.fillRect(0, 0, 256, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(kind === "wall" ? 20 : 4, kind === "wall" ? 2 : 20);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  buildPortraits() {
    const count = this.items.length;
    // alternate sides, tighter zig-zag so both walls feel alive
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const z = -3.5 - row * ROW_SPACING - (i % 4) * 0.5;
      const x = side * (HALL_W - 0.35);
      const y = EYE_Y - 0.05 + ((i % 3) - 1) * 0.18;

      const mat = new THREE.ShaderMaterial({
        vertexShader: portraitVertShader,
        fragmentShader: portraitFragShader,
        uniforms: {
          uMap: { value: this.textures[i] },
          uFogColor: { value: this.fogColor },
          uFogNear: { value: 8 },
          uFogFar: { value: 60 },
          uGlow: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PORTRAIT_W, PORTRAIT_H), mat);
      mesh.position.set(x, y, z);
      // face the corridor more directly so the art reads clearly
      mesh.rotation.y = side === -1 ? Math.PI / 2 - 0.18 : -Math.PI / 2 + 0.18;
      this.scene.add(mesh);
      this.slots.push({ mesh, mat, index: i, side, z, x, y });
    }
  }

  setupEvents() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener("wheel", (e) => {
      if (this.paused) return;
      const norm = normalizeWheel(e);
      this.scrollTarget += norm.pixelY * 0.02;
      const max = Math.max(0, (Math.ceil(this.items.length / 2)) * ROW_SPACING + 8);
      this.scrollTarget = Math.min(Math.max(this.scrollTarget, 0), max);
    });
  }

  addScrollDelta(d: number) {
    this.scrollTarget += d;
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  render = () => {
    if (this.disposed) return;
    requestAnimationFrame(this.render);

    this.motionScale += ((this.paused ? 0 : 1) - this.motionScale) * 0.06;
    if (this.motionScale > 0.001) {
      this.scrollTarget += this.autoSpeed * this.motionScale;
    }
    const max = Math.max(0, (Math.ceil(this.items.length / 2)) * ROW_SPACING + 8);
    if (this.scrollTarget > max) this.scrollTarget = max;
    this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * 0.08;

    this.camera.position.z = -this.scrollCurrent;

    // subtle sway
    this.camera.position.x = Math.sin(this.scrollCurrent * 0.15) * 0.25;
    this.camera.lookAt(
      Math.sin(this.scrollCurrent * 0.15 + 0.5) * 0.4,
      EYE_Y - 0.05,
      this.camera.position.z - 8
    );

    // fade hover glows
    for (const s of this.slots) {
      s.mat.uniforms.uGlow.value *= 0.9;
    }

    this.renderer.render(this.scene, this.camera);
  };

  /** Hit-test: return item index under cursor, highlight its frame */
  pickAtScreen(clientX: number, clientY: number, rect: DOMRect): number | null {
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    let best: Slot | null = null;
    let bestDist = Infinity;
    for (const s of this.slots) {
      const hits = ray.intersectObject(s.mesh);
      if (hits.length > 0 && hits[0].distance < bestDist) {
        bestDist = hits[0].distance;
        best = s;
      }
    }
    if (best) {
      best.mat.uniforms.uGlow.value = 1;
      return best.index;
    }
    return null;
  }

  destroy() {
    this.disposed = true;
    this.renderer.dispose();
    this.textures.forEach((t) => t.dispose());
    this.bgTexture?.dispose();
  }
}
