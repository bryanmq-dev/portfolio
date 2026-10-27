import { Grafo, type Disposicion } from './grafo.ts';
import { DIBUJOS, centro, dock, fondo, inicio, muestrear, riel } from './formas.ts';

const $ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => raiz.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(s)];
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Móvil: menos de un tercio de los nodos; con más, la pantalla chica se satura de aristas.
const N = innerWidth < 700 ? 380 : 1400;
const body = document.body;
const grafo = new Grafo($<HTMLCanvasElement>('#grafo'), N);
// Deriva por estado: amplia en el inicio, casi nula en las formas (si no, se pierden las teclas y los píxeles).
const DERIVA = { inicio: 14, forma: 1.5, seccion: 6 };
const derivar = (k: keyof typeof DERIVA) => (grafo.deriva = quieto ? 0 : DERIVA[k]);
derivar('inicio');

const hubs = $$<HTMLAnchorElement>('.hub');
const seccionEl = (id: string) => $(`.seccion[data-seccion="${id}"]`);
const esDock = (id: string) => !!seccionEl(id)?.querySelector('.dock, .rail');
const items = (sec: ParentNode) => $$<HTMLButtonElement>('[data-item]', sec);
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
const movil = () => innerWidth <= 760;
const MS = (ms: number) => (quieto ? 0 : ms);
// Duraciones: cada morph dura DUR; la forma intermedia queda a la vista FORMA_VISIBLE.
const DUR = 1000;
const FORMA_VISIBLE = 500;

// --- Formas intermedias (≤ 0.5 s a la vista, se leen como pantalla de carga) ------------------
let silueta: Promise<HTMLImageElement | null> | null = null;
const cargarSilueta = () =>
  (silueta ??= new Promise((r) => {
    const url = body.dataset.silueta;
    if (!url) return r(null);
    const img = new Image();
    img.onload = () => r(img);
    img.onerror = () => r(null);
    img.src = url;
  }));

const rectDe = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
};

const FORMA: Record<string, () => Promise<Disposicion> | Disposicion> = {
  // La silueta se dibuja justo donde va a aparecer la foto real: el cambio es un crossfade en el lugar.
  'sobre-mi': async () => muestrear(N, (await cargarSilueta()) ?? DIBUJOS.busto, rectDe($('.foto-marco', seccionEl('sobre-mi')))),
  experiencia: () => muestrear(N, DIBUJOS.teclado, centro(0.5)),
  'soft-skills': () => muestrear(N, DIBUJOS.personas, centro(0.5)),
  skills: () => muestrear(N, DIBUJOS.martillo, centro(0.6)),
  contacto: () => muestrear(N, DIBUJOS.sobre, centro(0.45)),
};

const activoDe = (sec: ParentNode) => Math.max(0, items(sec).findIndex((b) => b.getAttribute('aria-current') === 'true'));

/** Rail: dónde cae cada tarjeta, con la misma fórmula del CSS (.tarjeta) y no midiendo,
 *  porque cuando cambia la activa las tarjetas están en plena transición. */
function anclasRail(sec: HTMLElement) {
  const r = sec.querySelector('.pila')!.getBoundingClientRect(), u = rem();
  const i = activoDe(sec);
  return items(sec).map((_, k) => {
    const o = k - i, a = Math.abs(o);
    const tam = a > 2 ? 5 : 12; // las tarjetas casi invisibles dejan un nodo chico
    return movil()
      ? { x: r.x + r.width / 2 + o * 8.6 * u, y: r.y - 12, tam }
      : { x: r.x + u - a * 0.5 * u - 16, y: r.y + r.height / 2 + o * 7.6 * u, tam };
  });
}

const noExiste = () => muestrear(N, DIBUJOS.noExiste, centro(movil() ? 0.4 : 0.5));

function final(id: string): Disposicion {
  if (id === 'inicio') return inicio(N, hubs.length);
  if (id === '404') return noExiste();
  if (!esDock(id)) return fondo(N);
  const sec = seccionEl(id);
  if (sec.querySelector('.pila')) return riel(N, anclasRail(sec), activoDe(sec) * (movil() ? 8.6 : 7.6) * rem(), !movil());
  const centros = items(sec).map((b) => {
    const r = b.getBoundingClientRect(); // scale no mueve el centro: el hover no lo altera
    return [r.x + r.width / 2, r.y + r.height / 2] as [number, number];
  });
  return dock(N, centros);
}

// --- Navegación ------------------------------------------------------------------------------
let turno = 0;
let actual = body.dataset.seccion ?? 'inicio';

const url = (id: string, slug?: string) => (id === 'inicio' ? '/' : slug ? `/${id}/${slug}` : `/${id}`);

async function ir(id: string, slug?: string, push = true) {
  const t = ++turno;
    actual = id;
  if (push) history.pushState(null, '', url(id, slug));
  document.title = id === 'inicio' ? `${$('.firma .escribe').getAttribute('aria-label') ?? 'bryanmq-dev'} · bryanmq-dev` : `${seccionEl(id)?.getAttribute('aria-label')} · bryanmq-dev`;
  body.dataset.seccion = id;
  grafo.hover = -1;
  grafo.activo = -1;
  for (const s of $$('.seccion')) {
    s.classList.remove('visible');
    s.inert = true;
  }
  if (id === 'inicio') {
    $('.nombre').hidden = false; // venía oculto si se entró por un 404
    derivar('inicio');
    await grafo.morph(inicio(N, hubs.length), MS(DUR));
    return;
  }

  const sec = seccionEl(id);
  if (!quieto && FORMA[id]) {
    const forma = await FORMA[id]();
    if (t !== turno) return;
    derivar('forma');
    await grafo.morph(forma, DUR);
    if (t !== turno) return;
    await espera(FORMA_VISIBLE);
    if (t !== turno) return;
  }
  sec.scrollTop = 0;
  if (esDock(id)) elegir(id, slug ?? sec.querySelector<HTMLElement>('[data-item][aria-current="true"]')?.dataset.slug, false);
  sec.classList.add('visible');
  sec.inert = false;
  derivar('seccion');
  await grafo.morph(final(id), MS(DUR));
  if (t === turno && esDock(id)) grafo.activo = activoDe(sec);
}

/** Muestra una entrada del dock/rail, acomoda la pila de tarjetas y mueve la línea del grafo. */
function elegir(id: string, slug: string | undefined, push = true) {
  const sec = seccionEl(id);
  const lista = items(sec);
  const i = Math.max(0, lista.findIndex((b) => b.dataset.slug === slug));
  if (!lista[i]) return;
  const antes = lista.findIndex((b) => b.getAttribute('aria-current') === 'true');
  lista.forEach((b, k) => {
    b.setAttribute('aria-current', String(i === k));
    if (!b.classList.contains('tarjeta')) return;
    const o = k - i;
    b.style.setProperty('--o', String(o));
    b.style.setProperty('--a', String(Math.abs(o)));
    b.style.pointerEvents = Math.abs(o) > 2 ? 'none' : '';
    b.tabIndex = o === 0 ? 0 : -1;
  });
  const n = sec.querySelector('[data-n]');
  if (n) n.textContent = String(i + 1);
  sec.querySelectorAll<HTMLButtonElement>('[data-paso]').forEach((b) => (b.disabled = i + Number(b.dataset.paso) < 0 || i + Number(b.dataset.paso) >= lista.length));
  for (const a of $$<HTMLElement>('.entrada', sec)) a.hidden = a.dataset.slug !== lista[i].dataset.slug;
  if (push) history.replaceState(null, '', url(id, lista[i].dataset.slug));
  if (id !== actual || !sec.classList.contains('visible')) return;
  // En el rail la línea sigue a las tarjetas; en el dock solo cambia el nodo marcado.
  grafo.activo = i; // índice de la tarjeta = índice de su nodo
  if (sec.querySelector('.pila') && antes !== i) void grafo.morph(final(id), MS(800));
}

function paso(d: number) {
  const lista = items(seccionEl(actual));
  const i = lista.findIndex((b) => b.getAttribute('aria-current') === 'true');
  const sig = lista[Math.min(Math.max(i + d, 0), lista.length - 1)];
  if (!sig || sig === lista[i]) return;
  elegir(actual, sig.dataset.slug);
  seccionEl(actual).scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
  if (document.activeElement?.hasAttribute('data-item')) sig.focus({ preventScroll: true });
}

document.addEventListener('click', (ev) => {
  const a = (ev.target as Element).closest<HTMLElement>('[data-ir]');
  if (a && !(ev as MouseEvent).metaKey && !(ev as MouseEvent).ctrlKey) {
    ev.preventDefault();
    if (a.classList.contains('hub')) {
      a.setAttribute('data-pulso', '');
      setTimeout(() => a.removeAttribute('data-pulso'), 500);
    }
    void ir(a.dataset.ir!, a.dataset.slug);
    return;
  }
  const p = (ev.target as Element).closest<HTMLElement>('[data-paso]');
  if (p) return paso(Number(p.dataset.paso));
  const b = (ev.target as Element).closest<HTMLButtonElement>('[data-item]');
  if (b && deslizado) return void (deslizado = false);
  if (b) {
    elegir(actual, b.dataset.slug);
    b.closest('.seccion')!.scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
  }
});

// Flechas recorren el dock o la pila; Esc vuelve al grafo.
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && actual !== 'inicio') return void ir('inicio');
  if (!(ev.target as Element).closest?.('[data-item]') || !/^Arrow(Up|Down|Left|Right)$/.test(ev.key)) return;
  ev.preventDefault();
  paso(/Up|Left/.test(ev.key) ? -1 : 1);
});

// Rueda y deslizar sobre la pila: un proyecto por gesto.
let ultimaRueda = 0;
let deslizado = false;
for (const pila of $$('.pila')) {
  pila.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const d = Math.abs(ev.deltaY) > Math.abs(ev.deltaX) ? ev.deltaY : ev.deltaX;
      if (Math.abs(d) < 8 || performance.now() - ultimaRueda < 380) return;
      ultimaRueda = performance.now();
      paso(Math.sign(d));
    },
    { passive: false }
  );
  let x0 = 0, y0 = 0;
  pila.addEventListener('pointerdown', (ev) => ((x0 = ev.clientX), (y0 = ev.clientY)));
  pila.addEventListener('pointerup', (ev) => {
    const d = movil() ? ev.clientX - x0 : ev.clientY - y0;
    if (Math.abs(d) < 40) return;
    deslizado = true; // el click que sigue al arrastre no elige la tarjeta de abajo
    paso(d < 0 ? 1 : -1);
  });
}

addEventListener('popstate', () => {
  const [id = 'inicio', slug] = location.pathname.split('/').filter(Boolean);
  if (id === actual && slug) return elegir(id, slug, false);
  void ir(id, slug, false);
});

// --- Hover y puntero -------------------------------------------------------------------------
hubs.forEach((h, i) => {
  h.addEventListener('pointerenter', () => (grafo.hover = i));
  h.addEventListener('pointerleave', () => (grafo.hover = -1));
  h.addEventListener('focus', () => (grafo.hover = i));
  h.addEventListener('blur', () => (grafo.hover = -1));
});
document.addEventListener('pointerover', (ev) => {
  const b = (ev.target as Element).closest<HTMLButtonElement>('.dock [data-item]');
  if (b) grafo.hover = items(b.closest('.seccion')!).indexOf(b);
  else if (!(ev.target as Element).closest('.hub')) grafo.hover = -1;
});
addEventListener('pointermove', (ev) => grafo.puntero(ev.pointerType === 'mouse' ? ev.clientX : null, ev.clientY));
document.documentElement.addEventListener('pointerleave', () => grafo.puntero(null));

// --- Tema ------------------------------------------------------------------------------------
const oscuroSistema = matchMedia('(prefers-color-scheme: dark)');
$('.tema').addEventListener('click', () => {
  const ahora = document.documentElement.dataset.theme ?? (oscuroSistema.matches ? 'dark' : 'light');
  const otro = ahora === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = otro;
  try {
    localStorage.setItem('tema', otro);
  } catch {}
  grafo.tema();
});
oscuroSistema.addEventListener('change', () => grafo.tema());

// --- Los botones de los hubs siguen a sus puntos ----------------------------------------------
function seguir() {
  if (actual === 'inicio') hubs.forEach((h, i) => {
    const [x, y] = grafo.enPantalla(i);
    h.style.translate = `${x}px ${y}px`;
  });
  requestAnimationFrame(seguir);
}

let resize = 0;
addEventListener('resize', () => {
  clearTimeout(resize);
  resize = window.setTimeout(() => {
    grafo.medir();
    void grafo.morph(final(actual), 0);
  }, 120);
});

// --- Entrada: polvo invisible → grafo, y el nombre se escribe letra por letra ------------------
async function teclear() {
  const b = $('.firma .escribe');
  const texto = b.textContent!.trim();
  b.setAttribute('aria-label', texto);
  if (quieto) return;
  b.textContent = '';
  await espera(350);
  for (const letra of texto) {
    b.textContent += letra;
    await espera(55 + Math.random() * 70); // ritmo irregular, como alguien tecleando
  }
}

async function arrancar() {
  void teclear();
  void cargarSilueta();
  await grafo.morph(fondo(N), 0);
  const ini = performance.now();
  const sube = () => {
    grafo.alpha = Math.min((performance.now() - ini) / MS(900) || 1, 1);
    if (grafo.alpha < 1) requestAnimationFrame(sube);
  };
  sube();
  requestAnimationFrame(seguir);
  const primera = actual;
  if (primera === '404') {
    // La fuente del canvas tiene que estar cargada antes de muestrear el texto.
    await document.fonts.load('700 100px "JetBrains Mono Variable"').catch(() => {});
    derivar('forma');
    await grafo.morph(noExiste(), MS(1400));
  } else if (primera === 'inicio') {
    await grafo.morph(inicio(N, hubs.length), MS(1400));
  } else {
    // Enlace directo a una sección: se muestra sin pasar por el grafo.
    const slug = body.dataset.entrada || undefined;
    void grafo.morph(inicio(N, hubs.length), 0);
    await ir(primera, slug, false);
  }
  body.dataset.listo = '';
}
void arrancar();

// Solo en `pnpm dev`: congela una forma para revisarla (`await __forma('skills')` en la consola).
if (import.meta.env.DEV)
  Object.assign(window, {
    __forma: async (id: string) => {
      ++turno;
      for (const s of $$('.seccion')) s.classList.remove('visible');
      body.dataset.seccion = id;
      derivar('forma');
      await grafo.morph(await FORMA[id](), 0);
    },
  });

// --- Formulario de contacto: se envía sin recargar; sin JS funciona igual (el endpoint redirige).
const form = document.querySelector<HTMLFormElement>('.formulario');
form?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const error = $('.error-form', form);
  const boton = $<HTMLButtonElement>('button[type=submit]', form);
  if (!form.checkValidity()) {
    const malo = form.querySelector<HTMLInputElement>(':invalid')!;
    error.textContent = malo.name === 'email' ? 'Revisa el correo.' : malo.name === 'telefono' ? 'Revisa el número de teléfono.' : 'Cuéntame un poco más sobre tu solicitud (mínimo 10 caracteres).';
    error.hidden = false;
    malo.focus();
    return;
  }
  boton.disabled = true;
  boton.textContent = 'Enviando…';
  try {
    const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
    const j = await r.json().catch(() => ({ error: 'No se pudo enviar. Intenta de nuevo.' }));
    if (!r.ok) throw new Error(j.error);
    form.hidden = true;
    form.reset();
    const ok = $('.enviado', seccionEl('contacto'));
    ok.hidden = false;
    ok.focus?.();
  } catch (e) {
    error.textContent = (e as Error).message || 'No se pudo enviar. Intenta de nuevo.';
    error.hidden = false;
  } finally {
    boton.disabled = false;
    boton.textContent = 'Enviar solicitud';
  }
});
