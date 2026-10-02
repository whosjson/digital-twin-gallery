import * as THREE from "three";
import gsap from "gsap";
import normalizeWheel from "normalize-wheel";

const instancedVertexShader = `
#define PI 3.14159265359

attribute float aAngle;
attribute float aHeight;
attribute float aRadius;
attribute float aAspectRatio;
attribute float aSpeed;
attribute vec4 aTextureCoords;
attribute vec2 aImageRes;

varying vec4 vTextureCoords;
varying vec2 vUv;
varying float vAspectRatio;
varying float vDepth;

uniform float uMaxZ;
uniform float uZrange;
uniform float uScrollY;
uniform float uSpeedY;
uniform float uDirection;

vec4 getQuaternionFromAxisAngle(vec3 axis, float angle) {
  float halfAngle = angle * 0.5;
  return vec4(axis.xyz * sin(halfAngle), cos(halfAngle));
}

void main() {
  vec3 scaledPosition = position;
  scaledPosition.y /= aAspectRatio;

  float zPos = aHeight + uScrollY;
  float zRange = uZrange;
  float minZ = (uMaxZ - uZrange);

  zPos = mod(zPos - minZ, zRange) + minZ;

  float theta = aAngle + uSpeedY * 0.3 * aSpeed;

  vec3 instancePosition = vec3(cos(theta) * aRadius, zPos, sin(theta) * aRadius);

  float angle = atan(instancePosition.x, instancePosition.z);

  vec4 rotation = getQuaternionFromAxisAngle(vec3(0.0, 1.0, 0.0), angle);

  vec3 finalPosition = scaledPosition + 2.0 * cross(rotation.xyz, cross(rotation.xyz, scaledPosition) + rotation.w * scaledPosition);

  vec4 modelPosition = modelMatrix * vec4(instancePosition + finalPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  vUv = uv;
  vTextureCoords = aTextureCoords;
  vAspectRatio = aAspectRatio;
  vDepth = -viewPosition.z;
}
`;

const instancedFragmentShader = `
varying vec4 vTextureCoords;
varying vec2 vUv;
varying float vDepth;

uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

void main() {
  float xStart = vTextureCoords.x;
  float xEnd = vTextureCoords.y;
  float yStart = vTextureCoords.z;
  float yEnd = vTextureCoords.w;

  vec2 atlasUV;
  atlasUV.x = mix(xStart, xEnd, vUv.x);
  atlasUV.y = mix(yStart, yEnd, 1.0 - vUv.y);

  vec4 color = texture2D(uAtlas, atlasUV);

  // Fade distant frames into the museum darkness
  float fogF = smoothstep(uFogNear, uFogFar, vDepth);
  color.rgb = mix(color.rgb, uFogColor, fogF);

  gl_FragColor = color;
}
`;

const centeredVertexShader = `
varying vec2 vUv;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
  vUv = uv;
}
`;

const centeredFragmentShader = `
varying vec2 vUv;

uniform sampler2D uAtlas;
uniform vec4 uTextureCoords;

void main() {
  float xStart = uTextureCoords.x;
  float xEnd = uTextureCoords.y;
  float yStart = uTextureCoords.z;
  float yEnd = uTextureCoords.w;

  vec2 atlasUV;
  atlasUV.x = mix(xStart, xEnd, vUv.x);
  atlasUV.y = mix(yStart, yEnd, 1.0 - vUv.y);

  vec4 color = texture2D(uAtlas, atlasUV);
  gl_FragColor = color;
}
`;

export default class VortexGallery {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  imageInfos: {
    width: number;
    height: number;
    aspectRatio: number;
    uvs: { xStart: number; xEnd: number; yStart: number; yEnd: number };
    img?: HTMLImageElement;
    drawn: boolean;
  }[] = [];
  atlasTexture: THREE.Texture | null = null;
  instancedMaterial!: THREE.ShaderMaterial;
  centerMaterial!: THREE.ShaderMaterial;
  centerMesh: THREE.Mesh | null = null;
  scrollY = {
    speedTarget: 0,
    speedCurrent: 0,
    target: 0,
    current: 0,
    direction: 1,
  };
  textureIndex = 0;
  private lastRawIndex = -1;
  time = 0;
  paused = false;
  /** 0 = fully paused, 1 = full speed — eased for buttery transitions */
  motionScale = 1;

  instanceData: {
    angles: Float32Array;
    heights: Float32Array;
    radiuses: Float32Array;
    speeds: Float32Array;
    aspectRatios: Float32Array;
    imageIndices: Uint16Array;
  } | null = null;
  instanceCount = 0;
  private uMaxZ = 0;
  private uZrange = 0;

  private disposed = false;

  constructor(canvas: HTMLCanvasElement, imagePaths: string[]) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080c);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.z = 5;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
      });
    } catch (err) {
      console.error("WebGL unavailable:", err);
      throw new Error("WEBGL_UNAVAILABLE");
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

    this.setupEvents();
    this.init(imagePaths);
  }

  async init(imagePaths: string[]) {
    this.loadBackdrop();
    await this.loadTextureAtlas(imagePaths);
    this.buildInstancedMesh();
    this.buildCenterMesh();
    this.render();
  }

  /** Draw every already-loaded image into the atlas and flag it dirty, so
   *  the vortex appears as soon as the first portraits arrive instead of
   *  waiting for the whole collection (a failed image never blanks the page). */
  private refreshAtlas() {
    if (!this.atlasCtx || !this.atlasTexture) return;
    const { ctx, cellW, cellH, cols } = this.atlasCtx;
    this.imageInfos.forEach((info, i) => {
      if (!info.img || info.drawn) return;
      const img = info.img;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const destX = col * cellW;
      const destY = row * cellH;

      const imgAspect = img.width / img.height;
      const cellAspect = cellW / cellH;
      let drawW: number, drawH: number, offsetX: number, offsetY: number;
      if (imgAspect > cellAspect) {
        drawW = cellW;
        drawH = cellW / imgAspect;
        offsetX = 0;
        offsetY = (cellH - drawH) / 2;
      } else {
        drawH = cellH;
        drawW = cellH * imgAspect;
        offsetX = (cellW - drawW) / 2;
        offsetY = 0;
      }
      ctx.drawImage(img, destX + offsetX, destY + offsetY, drawW, drawH);
      info.drawn = true;
    });
    this.atlasTexture.needsUpdate = true;
  }

  private atlasCtx: {
    ctx: CanvasRenderingContext2D;
    cellW: number;
    cellH: number;
    cols: number;
  } | null = null;

  /** Dark museum hall behind the vortex */
  loadBackdrop() {
    new THREE.TextureLoader().load(
      "/images/museum_hall_bg.jpg",
      (tex) => {
        if (this.disposed) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = tex;
        // Keep the hall dim so the portraits stay in the spotlight
        (this.scene as unknown as { backgroundIntensity: number }).backgroundIntensity = 0.85;
      },
      undefined,
      () => {
        // Texture missing — the plain dark color fallback is already set
      }
    );
  }

  async loadTextureAtlas(paths: string[]) {
    const CELL_W = 256;
    const CELL_H = 320;
    const cols = Math.ceil(Math.sqrt(paths.length));
    const rows = Math.ceil(paths.length / cols);
    const atlasWidth = cols * CELL_W;
    const atlasHeight = rows * CELL_H;

    const cvs = document.createElement("canvas");
    cvs.width = atlasWidth;
    cvs.height = atlasHeight;
    const ctx = cvs.getContext("2d")!;
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, atlasWidth, atlasHeight);

    this.atlasCtx = { ctx, cellW: CELL_W, cellH: CELL_H, cols };
    this.atlasTexture = new THREE.CanvasTexture(cvs);
    this.atlasTexture.generateMipmaps = true;
    this.atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.atlasTexture.magFilter = THREE.LinearFilter;
    this.atlasTexture.colorSpace = THREE.SRGBColorSpace;

    // Pre-compute every cell's UVs so instances can be placed immediately;
    // each image drops into its slot as soon as it arrives.
    this.imageInfos = paths.map((path, i) => {
      void path;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const destX = col * CELL_W;
      const destY = row * CELL_H;
      const xStart = destX / atlasWidth;
      const xEnd = (destX + CELL_W) / atlasWidth;
      const yStart = 1 - destY / atlasHeight;
      const yEnd = 1 - (destY + CELL_H) / atlasHeight;
      return {
        width: CELL_W,
        height: CELL_H,
        aspectRatio: CELL_W / CELL_H,
        uvs: { xStart, xEnd, yStart, yEnd },
        img: undefined as HTMLImageElement | undefined,
        drawn: false,
      };
    });

    // Progressive load: resolve as soon as the first portrait lands so the
    // vortex appears fast; the rest keep filling in the background. A single
    // failed image is skipped, never fatal.
    let firstResolved!: () => void;
    const firstDone = new Promise<void>((r) => (firstResolved = r));
    let settled = false;

    await Promise.all(
      paths.map(
        (path, i) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const info = this.imageInfos[i];
              info.img = img;
              info.width = img.width;
              info.height = img.height;
              info.aspectRatio = img.width / img.height;
              if (!settled) {
                settled = true;
                firstResolved();
              }
              resolve();
            };
            img.onerror = () => {
              console.warn("画像加载失败，已跳过:", path);
              if (!settled) {
                settled = true;
                firstResolved();
              }
              resolve();
            };
            img.src = path;
          })
      )
    );

    return firstDone;
  }

  buildInstancedMesh() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 0.075);

    const RADIUS = 6;
    const HEIGHT = 120;
    const COUNT = 600;
    const CIRCLE_COUNT = HEIGHT / 3;
    const CIRCLE_HEIGHT = HEIGHT / CIRCLE_COUNT;

    this.uMaxZ = HEIGHT * 0.5;
    this.uZrange = HEIGHT;
    this.instanceCount = COUNT;

    this.instancedMaterial = new THREE.ShaderMaterial({
      vertexShader: instancedVertexShader,
      fragmentShader: instancedFragmentShader,
      transparent: true,
      uniforms: {
        uAtlas: { value: this.atlasTexture },
        uScrollY: { value: 0 },
        uZrange: { value: HEIGHT },
        uMaxZ: { value: HEIGHT * 0.5 },
        uSpeedY: { value: 0 },
        uDirection: { value: 1 },
        uFogColor: { value: new THREE.Color(0x07080c) },
        uFogNear: { value: 6.0 },
        uFogFar: { value: 42.0 },
      },
    });

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      this.instancedMaterial,
      COUNT
    );

    const aAngles = new Float32Array(COUNT);
    const aHeights = new Float32Array(COUNT);
    const aRadiuses = new Float32Array(COUNT);
    const aAspectRatios = new Float32Array(COUNT);
    const aSpeeds = new Float32Array(COUNT);
    const aTextureCoords = new Float32Array(COUNT * 4);
    const imageIndices = new Uint16Array(COUNT);

    const speeds = new Float32Array(CIRCLE_COUNT).map(
      () => Math.random() * 0.2 + 0.8
    );

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const imgIdx = Math.floor(Math.random() * this.imageInfos.length);
      const { xStart, xEnd, yStart, yEnd } = this.imageInfos[imgIdx].uvs;

      aTextureCoords.set([xStart, xEnd, yStart, yEnd], i * 4);
      aAngles[i] = angle;
      aHeights[i] = (i % CIRCLE_COUNT) * CIRCLE_HEIGHT - HEIGHT / 2;
      aRadiuses[i] = RADIUS;
      aAspectRatios[i] = this.imageInfos[imgIdx].aspectRatio;
      aSpeeds[i] = speeds[i % CIRCLE_COUNT];
      imageIndices[i] = imgIdx;
    }

    this.instanceData = {
      angles: aAngles,
      heights: aHeights,
      radiuses: aRadiuses,
      speeds: aSpeeds,
      aspectRatios: aAspectRatios,
      imageIndices,
    };

    geometry.setAttribute(
      "aAngle",
      new THREE.InstancedBufferAttribute(aAngles, 1)
    );
    geometry.setAttribute(
      "aHeight",
      new THREE.InstancedBufferAttribute(aHeights, 1)
    );
    geometry.setAttribute(
      "aRadius",
      new THREE.InstancedBufferAttribute(aRadiuses, 1)
    );
    geometry.setAttribute(
      "aAspectRatio",
      new THREE.InstancedBufferAttribute(aAspectRatios, 1)
    );
    geometry.setAttribute(
      "aSpeed",
      new THREE.InstancedBufferAttribute(aSpeeds, 1)
    );
    geometry.setAttribute(
      "aTextureCoords",
      new THREE.InstancedBufferAttribute(aTextureCoords, 4)
    );

    this.scene.add(instancedMesh);
  }

  buildCenterMesh() {
    const geometry = new THREE.PlaneGeometry(1.7, 2.3);

    this.centerMaterial = new THREE.ShaderMaterial({
      vertexShader: centeredVertexShader,
      fragmentShader: centeredFragmentShader,
      uniforms: {
        uAtlas: { value: this.atlasTexture },
        uTextureCoords: {
          value: new THREE.Vector4(
            this.imageInfos[0].uvs.xStart,
            this.imageInfos[0].uvs.xEnd,
            this.imageInfos[0].uvs.yStart,
            this.imageInfos[0].uvs.yEnd
          ),
        },
      },
      transparent: true,
    });

    this.centerMesh = new THREE.Mesh(geometry, this.centerMaterial);
    this.scene.add(this.centerMesh);
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
      const fov = this.camera.fov * (Math.PI / 180);
      const height =
        this.camera.position.z * Math.tan(fov / 2) * 2;
      const dir = Math.sign(e.deltaY) || this.scrollY.direction;
      this.scrollY.direction = dir;
      // Dampened so fast flicking doesn't send the wall spinning
      const delta = ((norm.pixelY * height) / window.innerHeight) * 0.45;
      this.scrollY.speedTarget += delta;
      this.scrollY.target += delta;
    });
  }

  addScrollDelta(delta: number) {
    this.scrollY.speedTarget += delta;
    this.scrollY.target += delta;
  }

  render = () => {
    if (this.disposed) return;

    requestAnimationFrame(this.render);

    // Ease motion in/out: pausing (hover or overlay) glides to a gentle
    // stop instead of freezing instantly — much easier on the eyes.
    this.motionScale = gsap.utils.interpolate(
      this.motionScale,
      this.paused ? 0 : 1,
      0.06
    );

    if (this.motionScale > 0.0005) {
      const step = 0.006 * this.scrollY.direction * this.motionScale;
      this.scrollY.target += step;
      this.scrollY.speedTarget += step;
    }

    this.scrollY.current = gsap.utils.interpolate(
      this.scrollY.current,
      this.scrollY.target,
      0.1
    );
    this.scrollY.speedCurrent = gsap.utils.interpolate(
      this.scrollY.speedCurrent,
      this.scrollY.speedTarget,
      0.1
    );

    if (this.instancedMaterial) {
      this.instancedMaterial.uniforms.uScrollY.value = this.scrollY.current;
      this.instancedMaterial.uniforms.uSpeedY.value = this.scrollY.speedCurrent;
      this.instancedMaterial.uniforms.uDirection.value =
        this.scrollY.direction;
    }

    if (this.centerMaterial && this.imageInfos.length > 0) {
      // Random walk: every scroll "tick" draws a new random portrait,
      // never repeating the one currently on the easel.
      const rawIndex = Math.abs(Math.floor(this.scrollY.speedTarget));
      if (rawIndex !== this.lastRawIndex) {
        this.lastRawIndex = rawIndex;
        let next = Math.floor(Math.random() * this.imageInfos.length);
        if (this.imageInfos.length > 1 && next === this.textureIndex) {
          next = (next + 1 + Math.floor(Math.random() * (this.imageInfos.length - 1))) % this.imageInfos.length;
        }
        this.textureIndex = next;
      }
      const uvs = this.imageInfos[this.textureIndex].uvs;
      this.centerMaterial.uniforms.uTextureCoords.value.set(
        uvs.xStart,
        uvs.xEnd,
        uvs.yStart,
        uvs.yEnd
      );
    }

    // Drop newly-arrived portraits into the atlas, then draw
    this.refreshAtlas();
    this.renderer.render(this.scene, this.camera);
  };

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  /**
   * Hit-test a canvas-local point. Returns the index into `imageInfos` of the
   * image under the point, or null if nothing was hit. Checks the center
   * mesh first (largest, always in front), then projects every instance's
   * current world position to screen space and picks the nearest within a
   * small pixel radius. A larger pixelRadius makes hovering forgiving.
   */
  pickAtScreen(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    pixelRadius = 55
  ): number | null {
    const ndcX = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const ndcY = -(((clientY - canvasRect.top) / canvasRect.height) * 2 - 1);

    // 1) Center mesh — raycast
    if (this.centerMesh) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hit = raycaster.intersectObject(this.centerMesh);
      if (hit.length > 0) {
        return this.textureIndex;
      }
    }

    // 2) Instanced images — CPU-side position replay
    if (!this.instanceData) return null;

    const w = canvasRect.width;
    const h = canvasRect.height;
    const clickX = clientX - canvasRect.left;
    const clickY = clientY - canvasRect.top;

    const minZ = this.uMaxZ - this.uZrange;
    const zRange = this.uZrange;
    const scrollY = this.scrollY.current;
    const speedY = this.scrollY.speedCurrent;

    const PIXEL_RADIUS = pixelRadius;
    let bestIdx: number | null = null;
    let bestNdcZ = Infinity;

    const pos = new THREE.Vector3();
    const { angles, heights, radiuses, speeds, imageIndices } = this.instanceData;

    for (let i = 0; i < this.instanceCount; i++) {
      let zPos = heights[i] + scrollY;
      // match shader: mod((zPos - minZ), zRange) + minZ; ensure positive
      const shifted = zPos - minZ;
      zPos = ((shifted % zRange) + zRange) % zRange + minZ;
      const theta = angles[i] + speedY * 0.3 * speeds[i];

      pos.set(Math.cos(theta) * radiuses[i], zPos, Math.sin(theta) * radiuses[i]);
      pos.project(this.camera);

      if (pos.z < -1 || pos.z > 1) continue;
      if (pos.x < -1.2 || pos.x > 1.2 || pos.y < -1.2 || pos.y > 1.2) continue;

      const sx = (pos.x + 1) * 0.5 * w;
      const sy = (1 - pos.y) * 0.5 * h;
      const dx = sx - clickX;
      const dy = sy - clickY;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < PIXEL_RADIUS * PIXEL_RADIUS && pos.z < bestNdcZ) {
        bestNdcZ = pos.z;
        bestIdx = imageIndices[i];
      }
    }

    return bestIdx;
  }

  destroy() {
    this.disposed = true;
    this.renderer.dispose();
    if (this.atlasTexture) this.atlasTexture.dispose();
    if (this.instancedMaterial) this.instancedMaterial.dispose();
    if (this.centerMaterial) this.centerMaterial.dispose();
  }
}
