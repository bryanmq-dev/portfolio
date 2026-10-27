import type { Disposicion } from './grafo.ts';

// Todas las coordenadas salen en "mundo": px CSS con origen al centro de la pantalla, y hacia arriba.
const W = () => innerWidth;
const H = () => innerHeight;
const mundo = (x: number, y: number): [number, number] => [x - W() / 2, H() / 2 - y];

/** PRNG con semilla: el mismo layout sale igual al redimensionar. */
function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());

function vacia(n: number, anim = 0, pivote: [number, number] = [0, 0]): Disposicion {
  return { pos: new Float32Array(n * 2), tam: new Float32Array(n), tag: new Float32Array(n * 2), aristas: [], anim, pivote };
}

/**
 * k vecinos más cercanos (grilla espacial, O(n)) sin aristas repetidas. `desde` deja fuera
 * los primeros índices (los hubs, que se conectan aparte).
 */
export function vecinos(pos: Float32Array, n: number, k: number, maxD: number, desde = 0): number[] {
  const celda = maxD;
  const grilla = new Map<string, number[]>();
  const clave = (x: number, y: number) => `${Math.floor(x / celda)},${Math.floor(y / celda)}`;
  for (let i = desde; i < n; i++) {
    const c = clave(pos[i * 2], pos[i * 2 + 1]);
    (grilla.get(c) ?? grilla.set(c, []).get(c)!).push(i);
  }
  const vistas = new Set<number>();
  const aristas: number[] = [];
  for (let i = desde; i < n; i++) {
    const x = pos[i * 2], y = pos[i * 2 + 1];
    const cx = Math.floor(x / celda), cy = Math.floor(y / celda);
    const cand: [number, number][] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const j of grilla.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (j === i) continue;
          const d = Math.hypot(pos[j * 2] - x, pos[j * 2 + 1] - y);
          if (d > 0.5 && d < maxD) cand.push([d, j]);
        }
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, j] of cand.slice(0, k)) {
      const id = i < j ? i * n + j : j * n + i;
      if (vistas.has(id)) continue;
      vistas.add(id);
      aristas.push(i, j);
    }
  }
  return aristas;
}

// --- Layouts ---------------------------------------------------------------------------------

/** Grafo de inicio: los hubs (índices 0..HUBS-1) en elipse + el centro (índice HUBS, el nombre), cúmulos, filamentos y polvo. */
export function inicio(n: number, HUBS: number): Disposicion {
  const d = vacia(n);
  const r = azar(7);
  const movil = W() < 700;
  // Lo más abierto posible sin que un hub (círculo + etiqueta) se salga de la pantalla.
  const rx = Math.min(W() * (movil ? 0.36 : 0.38), W() / 2 - (movil ? 52 : 120));
  const ry = Math.min(H() * 0.36, H() / 2 - 96);
  const hubs: [number, number][] = [];
  if (movil) {
    // Móvil: dos filas (arriba y abajo del nombre + CTA), en arco suave; nada en la franja central.
    const arriba = Math.ceil(HUBS / 2);
    for (let i = 0; i < HUBS; i++) {
      const fila = i < arriba ? 0 : 1;
      const cant = fila ? HUBS - arriba : arriba;
      const j = fila ? i - arriba : i;
      const f = cant === 1 ? 0 : j / (cant - 1) - 0.5; // -0.5 … 0.5
      // Ancladas a los bordes (no al centro): en pantallas bajas no tocan el bloque del nombre.
      const y = fila ? -(H() / 2 - 125) : H() / 2 - 95 - Math.abs(f) * 24;
      hubs.push([f * W() * (cant === 2 ? 0.5 : 0.66), y]);
    }
  } else
    for (let i = 0; i < HUBS; i++) {
      const a = Math.PI / 2 - (i / HUBS) * Math.PI * 2 + 0.3;
      hubs.push([Math.cos(a) * rx, Math.sin(a) * ry]);
    }
  hubs.push([0, 0]);
  hubs.forEach(([x, y], i) => {
    d.pos.set([x, y], i * 2);
    d.tam[i] = i === HUBS ? 0.01 : 20; // el centro es el texto del nombre, no un punto visible
  });
  const nodos = HUBS + 1;
  const pares: [number, number][] = [];
  for (let i = 0; i < HUBS; i++) pares.push([i, (i + 1) % HUBS], [i, HUBS], [i, (i + 2) % HUBS]);

  for (let i = nodos; i < n; i++) {
    const t = r();
    let x: number, y: number;
    if (t < 0.4) {
      const [hx, hy] = hubs[Math.floor(r() * HUBS)];
      x = hx + gauss(r) * (movil ? 40 : 75);
      y = hy + gauss(r) * (movil ? 34 : 60);
    } else if (t < 0.75) {
      const [a, b] = pares[Math.floor(r() * pares.length)];
      const f = r();
      x = hubs[a][0] + (hubs[b][0] - hubs[a][0]) * f + gauss(r) * 14;
      y = hubs[a][1] + (hubs[b][1] - hubs[a][1]) * f + gauss(r) * 14;
    } else {
      x = (r() - 0.5) * W() * 1.05;
      y = (r() - 0.5) * H() * 1.05;
    }
    d.pos.set([x, y], i * 2);
    d.tam[i] = 1.6 + r() * 2.2;
  }
  d.aristas = vecinos(d.pos, n, movil ? 1 : 2, movil ? 40 : 52, nodos);
  for (const [a, b] of pares) if (b !== HUBS) d.aristas.push(a, b); // el centro queda sin aristas propias: lo cubre el texto
  return d;
}

/** Puntos sueltos y tenues por toda la pantalla: el fondo de las secciones de lectura. */
export function fondo(n: number): Disposicion {
  const d = vacia(n);
  const r = azar(11);
  for (let i = 0; i < n; i++) {
    d.pos.set([(r() - 0.5) * W(), (r() - 0.5) * H()], i * 2);
    d.tam[i] = 1 + r() * 1.6;
  }
  d.aristas = vecinos(d.pos, n, 1, 70);
  return d;
}

/**
 * Dock: el grafo se vuelve una línea que pasa por los botones del dock (centros en px de
 * pantalla). Índices 0..k-1 son los nodos de cada entrada; el resto se reparte sobre la línea.
 */
export function dock(n: number, centros: [number, number][]): Disposicion {
  const d = vacia(n);
  const r = azar(23);
  if (!centros.length) return fondo(n);
  const pts = centros.map(([x, y]) => mundo(x, y));
  const k = pts.length;
  pts.forEach(([x, y], i) => {
    d.pos.set([x, y], i * 2);
    d.tam[i] = 12;
  });
  // La línea se extiende un poco más allá del primer y último nodo.
  const [x0, y0] = pts[0], [x1, y1] = pts[k - 1];
  const vert = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
  const ruta: [number, number][] = [vert ? [x0, H() / 2 - 70] : [-W() / 2 + 20, y0], ...pts, vert ? [x1, -H() / 2 + 70] : [W() / 2 - 20, y1]];
  const largos = ruta.slice(1).map((p, i) => Math.hypot(p[0] - ruta[i][0], p[1] - ruta[i][1]));
  const total = largos.reduce((a, b) => a + b, 0) || 1;
  const enLinea = Math.min(n - k, Math.floor(total / 2.2)); // ~1 punto cada 2 px: línea densa, no mancha
  for (let i = k; i < n; i++) {
    if (i - k < enLinea) {
      let t = ((i - k) / enLinea) * total, s = 0;
      while (s < largos.length - 1 && t > largos[s]) t -= largos[s++];
      const f = t / (largos[s] || 1);
      const [ax, ay] = ruta[s], [bx, by] = ruta[s + 1];
      d.pos.set([ax + (bx - ax) * f + gauss(r) * 3, ay + (by - ay) * f + gauss(r) * 3], i * 2);
      d.tam[i] = 1.4 + r() * 1.4;
    } else {
      d.pos.set([(r() - 0.5) * W(), (r() - 0.5) * H()], i * 2); // un poco de polvo de fondo
      d.tam[i] = 0.8 + r();
    }
  }
  d.aristas = vecinos(d.pos, n, 2, 24, k);
  for (let i = 0; i + 1 < k; i++) d.aristas.push(i, i + 1);
  return d;
}

// --- Formas muestreadas ----------------------------------------------------------------------
// Cada forma se dibuja en un canvas: rojo = grupo 0, verde 128 = grupo 1 (la parte que se anima),
// verde 255 = grupo 2 (el bicho de Claude Code). El azul lleva un id (la tecla del teclado).

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Dibujo = {
  w: number;
  h: number;
  pintar: (c: Ctx) => void;
  anim: number;
  pivote: [number, number];
  /** Puntos fijos (x, y, grupo) en coordenadas del dibujo; van antes que los muestreados. */
  fijos?: [number, number, number][];
};
const G0 = 'rgb(255,0,0)', G1 = 'rgb(255,128,0)', G2 = 'rgb(255,255,0)';

function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function disco(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

const TECLADO: Dibujo = {
  w: 460, h: 190, anim: 1, pivote: [0, 0],
  pintar(c) {
    c.fillStyle = G0;
    c.lineWidth = 4;
    c.strokeStyle = G0;
    c.beginPath();
    c.roundRect(4, 4, 452, 182, 14);
    c.stroke();
    const filas = [14, 14, 13, 12];
    let id = 1;
    filas.forEach((cant, f) => {
      const paso = 436 / cant;
      for (let i = 0; i < cant; i++) {
        c.fillStyle = `rgb(255,0,${id++})`;
        rrect(c, 12 + i * paso + (f % 2) * 6, 16 + f * 34, paso - 10, 25, 5);
      }
    });
    c.fillStyle = `rgb(255,0,${id})`;
    rrect(c, 120, 154, 220, 24, 5); // espacio
  },
};

const PERSONAS: Dibujo = {
  w: 560, h: 260, anim: 2, pivote: [140, 70],
  pintar(c) {
    c.fillStyle = G0;
    const persona = (x: number, y: number, k: number) => {
      disco(c, x, y, 26 * k);
      c.beginPath();
      c.ellipse(x, y + 92 * k, 52 * k, 60 * k, 0, Math.PI, 0);
      c.fill();
    };
    persona(90, 70, 1.15); // quien habla
    persona(310, 118, 0.75);
    persona(410, 108, 0.8);
    persona(510, 122, 0.72);
    c.strokeStyle = G1;
    c.lineWidth = 3;
    for (let i = 1; i <= 4; i++) {
      c.beginPath();
      c.arc(140, 70, 18 * i, -0.55, 0.55);
      c.stroke();
    }
  },
};

const CLAUDE = [
  '..XXXXXXXXXX..',
  '..XXXXXXXXXX..',
  '..XX.XXXX.XX..',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  '..XXXXXXXXXX..',
  '..X.X....X.X..',
  '..X.X....X.X..',
];

const MARTILLO: Dibujo = {
  w: 520, h: 380, anim: 3, pivote: [130, 360],
  pintar(c) {
    // Antebrazo + puño + martillo: todo gira alrededor del codo (pivote) en el golpe.
    c.fillStyle = G1;
    c.save();
    c.translate(130, 360);
    c.rotate(0.32);
    rrect(c, -24, -140, 48, 140, 20); // antebrazo
    rrect(c, -34, -196, 68, 60, 18); // puño
    for (let i = 0; i < 4; i++) rrect(c, -36 + i * 18, -208, 16, 22, 8); // nudillos
    rrect(c, -8, -300, 16, 110, 6); // mango
    rrect(c, -60, -318, 120, 44, 8); // cabeza
    c.restore();
  },
  // El bicho de Claude Code: un nodo por píxel del pixel art, así se lee como grilla.
  fijos: CLAUDE.flatMap((fila, y) => [...fila].flatMap((v, x) => (v === 'X' ? [[328 + x * 13, 214 + y * 13, 2] as [number, number, number]] : []))),
};

/** Contacto: un sobre (contorno + solapa). */
const SOBRE: Dibujo = {
  w: 420, h: 280, anim: 0, pivote: [0, 0],
  pintar(c) {
    c.strokeStyle = G0;
    c.lineWidth = 9;
    c.lineJoin = 'round';
    c.beginPath();
    c.roundRect(10, 10, 400, 260, 18);
    c.moveTo(14, 20);
    c.lineTo(210, 160);
    c.lineTo(406, 20);
    c.stroke();
  },
};

/** 404: el número en el color del grafo y "Not Found" en el grupo 1, que el shader pinta de rojo. */
const NO_EXISTE: Dibujo = {
  w: 640, h: 330, anim: 4, pivote: [0, 0],
  pintar(c) {
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillStyle = G0;
    c.font = '700 210px "JetBrains Mono Variable", ui-monospace, monospace';
    c.fillText('404', 320, 200);
    c.fillStyle = G1;
    c.font = '700 64px "JetBrains Mono Variable", ui-monospace, monospace';
    c.fillText('Not Found', 320, 300);
  },
};

/** Busto genérico: se usa si todavía no hay silueta recortada en el perfil. */
const BUSTO: Dibujo = {
  w: 300, h: 400, anim: 0, pivote: [0, 0],
  pintar(c) {
    c.fillStyle = G0;
    c.beginPath();
    c.ellipse(150, 130, 78, 96, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(150, 400, 150, 150, 0, Math.PI, 0);
    c.fill();
  },
};

export const DIBUJOS = { teclado: TECLADO, personas: PERSONAS, martillo: MARTILLO, noExiste: NO_EXISTE, sobre: SOBRE, busto: BUSTO };

/**
 * Pinta, lee los píxeles y elige n puntos: ~55 % sobre bordes (contorno y, en fotos, cambios
 * fuertes de luz como lentes o pelo) y el resto de relleno; así la forma se lee en medio segundo.
 * `caja` es dónde dibujarla en pantalla (px CSS); se ajusta manteniendo proporción.
 */
export function muestrear(n: number, dibujo: Dibujo | HTMLImageElement, caja: { x: number; y: number; w: number; h: number }): Disposicion {
  const esImg = dibujo instanceof HTMLImageElement;
  const ow = esImg ? dibujo.naturalWidth : dibujo.w;
  const oh = esImg ? dibujo.naturalHeight : dibujo.h;
  const k = Math.min(caja.w / ow, caja.h / oh);
  const cw = Math.max(1, Math.round(ow * k)), ch = Math.max(1, Math.round(oh * k));
  const canvas = new OffscreenCanvas(cw, ch);
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  if (esImg) c.drawImage(dibujo, 0, 0, cw, ch);
  else {
    c.scale(k, k);
    dibujo.pintar(c);
  }
  const px = c.getImageData(0, 0, cw, ch).data;
  const lleno = (x: number, y: number) => x >= 0 && y >= 0 && x < cw && y < ch && px[(y * cw + x) * 4 + 3] > 200;
  const luz = (x: number, y: number) => {
    const i = (y * cw + x) * 4;
    return px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
  };
  const borde: number[] = [], relleno: number[] = [];
  for (let y = 1; y < ch - 1; y++)
    for (let x = 1; x < cw - 1; x++) {
      if (!lleno(x, y)) continue;
      const contorno = !lleno(x + 1, y) || !lleno(x - 1, y) || !lleno(x, y + 1) || !lleno(x, y - 1);
      const detalle = esImg && Math.abs(luz(x + 1, y) - luz(x - 1, y)) + Math.abs(luz(x, y + 1) - luz(x, y - 1)) > 40;
      (contorno || detalle ? borde : relleno).push(y * cw + x);
    }

  const ox = caja.x + (caja.w - cw) / 2, oy = caja.y + (caja.h - ch) / 2;
  const d = vacia(n, esImg ? 0 : dibujo.anim, esImg ? [0, 0] : mundo(ox + dibujo.pivote[0] * k, oy + dibujo.pivote[1] * k));
  const r = azar(5);
  const todos = borde.length + relleno.length;
  if (!todos) return d;
  const fijos = esImg ? [] : (dibujo.fijos ?? []);
  fijos.forEach(([x, y, g], i) => {
    d.pos.set(mundo(ox + x * k, oy + y * k), i * 2);
    d.tam[i] = 5;
    d.tag[i * 2] = g;
  });
  for (let i = fijos.length; i < n; i++) {
    const deBorde = borde.length && (r() < (esImg ? 0.7 : 0.96) || !relleno.length);
    const lista = deBorde ? borde : relleno;
    const p = lista[Math.floor(r() * lista.length)];
    const x = p % cw, y = Math.floor(p / cw);
    d.pos.set(mundo(ox + x + r() - 0.5, oy + y + r() - 0.5), i * 2);
    d.tam[i] = deBorde ? 2.2 + r() : 1.4 + r();
    if (!esImg) {
      const g = px[(p * 4) + 1];
      d.tag[i * 2] = g > 191 ? 2 : g > 64 ? 1 : 0;
      d.tag[i * 2 + 1] = px[p * 4 + 2];
    }
  }
  d.aristas = vecinos(d.pos, n, 2, Math.max(10, Math.sqrt(todos / n) * 2));
  // Grilla de los fijos: cada nodo con sus vecinos de arriba/abajo/costados.
  for (let i = 0; i < fijos.length; i++)
    for (let j = i + 1; j < fijos.length; j++)
      if (Math.hypot(fijos[i][0] - fijos[j][0], fijos[i][1] - fijos[j][1]) < 14) d.aristas.push(i, j);
  return d;
}

/** Caja centrada que ocupa una fracción de la pantalla. */
export const centro = (f = 0.55) => {
  const w = W() * (W() < 700 ? 0.9 : f), h = H() * f;
  return { x: (W() - w) / 2, y: (H() - h) / 2, w, h };
};

/**
 * Rail de tarjetas. Índice i = tarjeta i: su nodo sube y baja con ella. Los puntos de la línea
 * se corren `fase` px por el eje (un paso de tarjeta por cada cambio), así la línea entera se
 * ve recorrerse junto con la pila y no solo cambiar el nodo marcado.
 */
export function riel(n: number, anclas: { x: number; y: number; tam: number }[], fase: number, vertical: boolean): Disposicion {
  const d = vacia(n);
  const r = azar(29);
  const k = Math.min(anclas.length, n);
  for (let i = 0; i < k; i++) {
    d.pos.set(mundo(anclas[i].x, anclas[i].y), i * 2);
    d.tam[i] = anclas[i].tam;
  }
  const cerca = anclas.filter((a) => a.tam >= 8);
  const eje = cerca.reduce((s, a) => s + (vertical ? a.x : a.y), 0) / (cerca.length || 1);
  const largo = vertical ? H() : W();
  const enLinea = Math.min(n - k, Math.floor(largo / 2.2));
  for (let i = k; i < n; i++) {
    if (i - k < enLinea) {
      const t = ((((i - k) / enLinea) * largo - fase) % largo + largo) % largo;
      const lado = eje + gauss(r) * 3;
      d.pos.set(vertical ? mundo(lado, t) : mundo(t, lado), i * 2);
      d.tam[i] = 1.4 + r() * 1.4;
    } else {
      d.pos.set([(r() - 0.5) * W(), (r() - 0.5) * H()], i * 2);
      d.tam[i] = 0.8 + r();
    }
  }
  d.aristas = vecinos(d.pos, n, 2, 24, k);
  for (let i = 0; i + 1 < k; i++) d.aristas.push(i, i + 1);
  return d;
}
