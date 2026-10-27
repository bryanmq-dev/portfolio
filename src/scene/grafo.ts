import * as THREE from 'three';

/**
 * Una disposición es dónde está cada punto del grafo: un layout (inicio, dock, fondo) o una
 * forma muestreada (teclado, personas…). Coordenadas de mundo = px CSS con origen al centro.
 */
export type Disposicion = {
  pos: Float32Array; // n*2
  tam: Float32Array; // n — diámetro en px; ≥ 8 es un "hub" (no lo empuja el puntero, deriva menos)
  tag: Float32Array; // n*2 — (grupo, id) para la animación propia de la forma
  aristas: number[]; // pares de índices
  anim: number; // 0 nada · 1 teclado · 2 personas · 3 martillo · 4 texto (404)
  pivote: [number, number];
};

const VERT = /* glsl */ `
attribute vec2 aFrom; attribute vec2 aTo;
attribute float aTamFrom; attribute float aTamTo;
attribute vec2 aTagFrom; attribute vec2 aTagTo;
attribute float aSeed; attribute float aIdx;
uniform float uP, uT, uDrift, uPx, uHover, uActivo;
uniform int uAnimFrom, uAnimTo;
uniform vec2 uPivFrom, uPivTo, uMouse;
uniform vec3 uFg, uAccent, uClaude;
varying vec3 vColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec2 anim(vec2 p, vec2 tag, int k, vec2 piv, float t, inout float s) {
  if (k == 1 && tag.y > 0.5) { // teclado: cada tecla (id) se hunde en su turno
    float on = step(fract(hash(tag.y) + t * 2.2), 0.13);
    s *= 1.0 - on * 0.4;
    return vec2(0.0, -3.0 * on);
  }
  if (k == 2 && tag.x > 0.5) { // personas: ondas de voz que salen de la boca
    float w = sin(distance(p, piv) * 0.13 - t * 9.0);
    s *= 0.4 + 0.9 * max(w, 0.0);
  }
  if (k == 3) {
    if (tag.x > 0.5 && tag.x < 1.5) { // martillo: golpe alrededor del codo
      float a = -0.45 * pow(max(sin(t * 6.5), 0.0), 4.0); // negativo = horario en pantalla: el golpe baja
      vec2 r = p - piv;
      return vec2(r.x * cos(a) - r.y * sin(a), r.x * sin(a) + r.y * cos(a)) + piv - p;
    }
    if (tag.x > 1.5) return vec2(0.0, abs(sin(t * 5.0)) * 5.0); // el bicho de Claude Code salta
  }
  return vec2(0.0);
}

void main() {
  float p = clamp(uP * 1.35 - aSeed * 0.35, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  float sF = aTamFrom, sT = aTamTo;
  vec2 a = aFrom + anim(aFrom, aTagFrom, uAnimFrom, uPivFrom, uT, sF);
  vec2 b = aTo + anim(aTo, aTagTo, uAnimTo, uPivTo, uT, sT);
  vec2 d = b - a;
  // los puntos viajan en arco, no en línea recta
  vec2 pos = mix(a, b, p) + vec2(-d.y, d.x) * sin(3.14159 * p) * (aSeed - 0.5) * 0.35;
  float s = mix(sF, sT, p);
  float hub = step(8.0, s);
  pos += vec2(sin(uT * 0.6 + aSeed * 40.0) + 0.5 * sin(uT * 1.3 + aSeed * 9.0), cos(uT * 0.5 + aSeed * 70.0) + 0.5 * cos(uT * 1.1 + aSeed * 13.0)) * uDrift * (1.0 - hub * 0.6);
  vec2 dm = pos - uMouse;
  pos += (1.0 - hub) * dm / max(length(dm), 1.0) * 28.0 * smoothstep(120.0, 0.0, length(dm));

  float hi = max(step(abs(aIdx - uHover), 0.5), step(abs(aIdx - uActivo), 0.5));
  s *= 1.0 + hi * 0.7;
  float grupo = mix(aTagFrom.x, aTagTo.x, p);
  // grupo 1 va en rojo en las ondas de voz y en el "Not Found"; el brazo del martillo, no.
  float voz = step(0.5, grupo) * step(grupo, 1.5) * float(uAnimTo == 2 || uAnimFrom == 2 || uAnimTo == 4 || uAnimFrom == 4);
  vColor = mix(uFg, uAccent, max(hi, step(aSeed, 0.06) + voz));
  vColor = mix(vColor, uClaude, step(1.5, grupo));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
#ifdef PUNTOS
  gl_PointSize = s * uPx;
#endif
}`;

const FRAG_PUNTOS = /* glsl */ `
uniform float uAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.36, d) * uAlpha);
}`;

const FRAG_LINEAS = /* glsl */ `
uniform float uAlpha, uFade, uLinea;
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor, uLinea * uFade * uAlpha); }`;

const ATRIB: [string, number][] = [
  ['aFrom', 2], ['aTo', 2], ['aTamFrom', 1], ['aTamTo', 1], ['aTagFrom', 2], ['aTagTo', 2], ['aSeed', 1], ['aIdx', 1],
];
const MAX_ARISTAS_POR_PUNTO = 4;

const css = (nombre: string) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(nombre).trim());

export class Grafo {
  readonly n: number;
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.OrthographicCamera();
  private puntos: THREE.Points;
  private lineas: [THREE.LineSegments, THREE.LineSegments]; // [saliente, entrante]
  private aristas: [number[], number[]] = [[], []];
  private comunes: Record<string, THREE.IUniform>;
  private semillas: Float32Array;
  private actual: Disposicion | null = null;
  private inicioMorph = 0;
  private durMorph = 1;
  private finMorph: (() => void) | null = null;
  private reloj = new THREE.Clock();
  deriva = 6;

  constructor(canvas: HTMLCanvasElement, n: number) {
    this.n = n;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.camara.position.z = 10;

    this.semillas = new Float32Array(n).map(() => Math.random());
    this.comunes = {
      uP: { value: 1 },
      uT: { value: 0 },
      uDrift: { value: this.deriva },
      uPx: { value: this.renderer.getPixelRatio() },
      uHover: { value: -1 },
      uActivo: { value: -1 },
      uAnimFrom: { value: 0 },
      uAnimTo: { value: 0 },
      uPivFrom: { value: new THREE.Vector2() },
      uPivTo: { value: new THREE.Vector2() },
      uMouse: { value: new THREE.Vector2(1e5, 1e5) },
      uFg: { value: new THREE.Color() },
      uAccent: { value: new THREE.Color() },
      uClaude: { value: new THREE.Color() },
      uAlpha: { value: 0 },
      uLinea: { value: 0.2 },
    };

    const geo = new THREE.BufferGeometry();
    for (const [nombre, k] of ATRIB) geo.setAttribute(nombre, new THREE.BufferAttribute(new Float32Array(n * k), k));
    (geo.getAttribute('aSeed').array as Float32Array).set(this.semillas);
    (geo.getAttribute('aIdx').array as Float32Array).set(Float32Array.from({ length: n }, (_, i) => i));
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); // three la exige; no se usa
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.puntos = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG_PUNTOS, uniforms: this.comunes, defines: { PUNTOS: '' }, transparent: true, depthTest: false })
    );

    const linea = () => {
      const g = new THREE.BufferGeometry();
      const m = n * MAX_ARISTAS_POR_PUNTO * 2;
      for (const [nombre, k] of ATRIB) g.setAttribute(nombre, new THREE.BufferAttribute(new Float32Array(m * k), k));
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m * 3), 3));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      g.setDrawRange(0, 0);
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG_LINEAS,
        uniforms: { ...this.comunes, uFade: { value: 1 } },
        transparent: true,
        depthTest: false,
      });
      return new THREE.LineSegments(g, mat);
    };
    this.lineas = [linea(), linea()];
    this.escena.add(this.lineas[0], this.lineas[1], this.puntos);

    this.tema();
    this.medir();
    this.renderer.setAnimationLoop(() => this.cuadro());
  }

  /** Colores desde las variables CSS: cambiar el tema cambia también la escena. */
  tema() {
    this.comunes.uFg.value.copy(css('--grafo-fg'));
    this.comunes.uAccent.value.copy(css('--accent'));
    this.comunes.uClaude.value.copy(css('--claude'));
    this.comunes.uLinea.value = Number(getComputedStyle(document.documentElement).getPropertyValue('--grafo-linea')) || 0.2;
  }

  medir() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    Object.assign(this.camara, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
    this.camara.updateProjectionMatrix();
  }

  set alpha(v: number) {
    this.comunes.uAlpha.value = v;
  }
  get alpha() {
    return this.comunes.uAlpha.value;
  }
  set hover(i: number) {
    this.comunes.uHover.value = i;
  }
  set activo(i: number) {
    this.comunes.uActivo.value = i;
  }
  /** Puntero en px de pantalla (o null al salir). */
  puntero(x: number | null, y = 0) {
    this.comunes.uMouse.value.set(x === null ? 1e5 : x - innerWidth / 2, x === null ? 1e5 : innerHeight / 2 - y);
  }

  /** Posición en pantalla (px) del punto i, con su deriva: para que el botón HTML lo siga. */
  enPantalla(i: number): [number, number] {
    const d = this.actual!;
    const t = this.comunes.uT.value, s = this.semillas[i];
    const k = this.comunes.uDrift.value * (d.tam[i] >= 8 ? 0.4 : 1);
    const dx = Math.sin(t * 0.6 + s * 40) + 0.5 * Math.sin(t * 1.3 + s * 9);
    const dy = Math.cos(t * 0.5 + s * 70) + 0.5 * Math.cos(t * 1.1 + s * 13);
    return [innerWidth / 2 + d.pos[i * 2] + dx * k, innerHeight / 2 - d.pos[i * 2 + 1] - dy * k];
  }

  /** Transición a una disposición; ms = 0 la fija sin animar. */
  morph(d: Disposicion, ms: number): Promise<void> {
    const g = this.puntos.geometry;
    const at = (n: string) => g.getAttribute(n).array as Float32Array;
    const p = this.progreso();
    const [from, to, tF, tT, gF, gT] = ['aFrom', 'aTo', 'aTamFrom', 'aTamTo', 'aTagFrom', 'aTagTo'].map(at);
    // El origen es donde se ven los puntos ahora (si se interrumpe un morph, a mitad de camino).
    for (let i = 0; i < this.n * 2; i++) from[i] = from[i] + (to[i] - from[i]) * p;
    for (let i = 0; i < this.n; i++) tF[i] = tF[i] + (tT[i] - tF[i]) * p;
    gF.set(p < 0.5 ? gF : gT);
    to.set(d.pos);
    tT.set(d.tam);
    gT.set(d.tag);
    for (const n of ['aFrom', 'aTo', 'aTamFrom', 'aTamTo', 'aTagFrom', 'aTagTo']) g.getAttribute(n).needsUpdate = true;

    const u = this.comunes;
    u.uAnimFrom.value = this.actual?.anim ?? 0;
    u.uPivFrom.value.copy(u.uPivTo.value);
    u.uAnimTo.value = d.anim;
    u.uPivTo.value.set(...d.pivote);

    this.aristas = [this.aristas[1], d.aristas];
    this.cargarLineas(0, this.aristas[0]);
    this.cargarLineas(1, this.aristas[1]);

    this.actual = d;
    this.finMorph?.();
    this.inicioMorph = performance.now();
    this.durMorph = Math.max(ms, 1);
    u.uP.value = ms ? 0 : 1;
    return new Promise((r) => (this.finMorph = r));
  }

  private progreso() {
    return Math.min((performance.now() - this.inicioMorph) / this.durMorph, 1);
  }

  private cargarLineas(cual: 0 | 1, aristas: number[]) {
    const pg = this.puntos.geometry, lg = this.lineas[cual].geometry;
    const max = this.n * MAX_ARISTAS_POR_PUNTO;
    const m = Math.min(aristas.length / 2, max);
    for (const [nombre, k] of ATRIB) {
      const src = pg.getAttribute(nombre).array as Float32Array;
      const dst = lg.getAttribute(nombre).array as Float32Array;
      for (let e = 0; e < m; e++) {
        for (let v = 0; v < 2; v++) {
          const i = aristas[e * 2 + v];
          for (let c = 0; c < k; c++) dst[(e * 2 + v) * k + c] = src[i * k + c];
        }
      }
      lg.getAttribute(nombre).needsUpdate = true;
    }
    lg.setDrawRange(0, m * 2);
  }

  private cuadro() {
    const u = this.comunes;
    u.uT.value = this.reloj.getElapsedTime();
    u.uDrift.value += (this.deriva - u.uDrift.value) * 0.06; // la deriva cambia suave, sin saltos
    const p = this.progreso();
    u.uP.value = p;
    (this.lineas[0].material as THREE.ShaderMaterial).uniforms.uFade.value = Math.max(1 - p * 2.5, 0);
    (this.lineas[1].material as THREE.ShaderMaterial).uniforms.uFade.value = p ** 3;
    if (p >= 1 && this.finMorph) {
      const f = this.finMorph;
      this.finMorph = null;
      f();
    }
    this.renderer.render(this.escena, this.camara);
  }
}
