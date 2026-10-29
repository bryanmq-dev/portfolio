# Auditoría UI/UX del portafolio

Base: skills `ui-ux-pro-max`, `impeccable`, `design-taste-frontend` y `ui-styling`.
Método: lectura de `src/` + sitio corriendo en local (escritorio 1440, móvil 390, tema oscuro y claro) + cálculo de contraste con las fórmulas WCAG.
Lo marcado **(verificado)** se midió o se vio en pantalla; **(código)** se deduce de leer el código y falta confirmarlo en pantalla.

## Resumen

El concepto es fuerte y poco común: un grafo three.js que se deshace y forma una figura distinta por sección. Eso es el "wow" del sitio y hay que protegerlo. Lo que baja la nota es lo que rodea al grafo: las vistas de contenido son paneles de texto genéricos sobre fondo negro, y hay deuda de accesibilidad en contraste y foco.

| Prioridad de la skill | Estado | Nota |
|---|---|---|
| 1 Accesibilidad | Media | Contraste falla (corregido), sin foco al cambiar de sección, sin `<main>` |
| 2 Táctil e interacción | Buena | Botones del contador de 32 px (corregido en táctil), tooltip solo con hover (corregido) |
| 3 Rendimiento | Media | Render continuo del grafo en secciones de lectura |
| 4 Estilo | Alta | Un solo lenguaje (mono + rojo + grafo); formas repetidas entre secciones |
| 7 Animación | Alta | Transiciones con significado; `prefers-reduced-motion` respetado |

## Correcciones ya aplicadas

1. **Sobre mí rediseñado.** Antes: foto + un panel de texto, y un recuadro gris vacío si no hay foto. Ahora: retrato con marcas de esquina (como un nodo seleccionado del grafo), ficha en bento con cabecera, tarjeta `$ cat bio.md` con cursor, cifras que cuentan (proyectos, eventos y skills salen de la base, no son inventadas), estudios, enlaces con su logo y un bloque de llamada a contacto. Cada tarjeta entra en cascada y su borde se ilumina donde está el puntero. Sin foto muestra un monograma, no un hueco. La silueta del grafo sigue formándose sobre `.foto-marco`, igual que antes.
2. **Proyectos con forma: martillo sobre teclado mecánico.** El martillo gira alrededor de la muñeca y cae sobre el teclado; la onda del golpe recorre las teclas (cada una se hunde según su distancia al impacto y destella en rojo). El reloj de la forma arranca con el morph, así el primer golpe cae siempre a 1.2 s y se ven dos golpes antes de pasar al riel de tarjetas. Dura 1.5 s a la vista (las demás formas, 0.5 s). Con `prefers-reduced-motion` se omite, como el resto.
3. **Contraste (verificado).** `--gris-3` daba 3.88:1 en oscuro y 3.20:1 en claro; el acento como texto daba 3.04:1 en oscuro. Ahora 5.98 / 4.96 / 4.89. Se añadió `--accent-t` para el acento usado como texto; los botones rojos con texto blanco no cambian (6.58:1).
4. **Teclado y táctil.** El tooltip del dock aparece también con foco de teclado; los botones del contador pasan a 44 px en pantallas táctiles.
5. **Sobre mí, semántica.** El nombre pasa a `h3` (antes había dos `h2`) y se quitó el guion largo del texto.

## Pendiente, por prioridad (resuelto en la segunda ronda, ver abajo)

### P1 (alto impacto)

- **Formas repetidas.** Experiencia = teclado, Skills = puño con martillo, Proyectos = martillo sobre teclado. Tres de cinco secciones comparten motivo y se leen como la misma idea. Propuesta: Experiencia pasa a una línea de tiempo que se dibuja (hitos de cada cargo); Skills conserva el martillo + bicho de Claude Code. No lo cambié porque no lo pediste.
- **El detalle de cada entrada es solo texto.** `Entrada.astro` no muestra la portada en grande; solo aparece en la tarjeta pequeña. Propuesta: cabecera con la portada a ancho completo, tecnologías con su logo (ya existe `icono()`) y para experiencia una línea de tiempo vertical.
- **Cambio de sección no mueve el foco (código).** Tras `ir()`, el foco queda en el hub que ya no se ve; un lector de pantalla no anuncia nada. Propuesta: enfocar el `h2` de la sección (`tabindex="-1"`) al terminar el morph.
- **Sin `<main>` ni enlace "saltar al contenido" (código).** Las secciones son `section[aria-label]` sueltas.
- **Skills: el color de marca solo aparece con `:hover` (código).** En móvil nunca se ve. Propuesta: `@media (hover: none)` con el color de marca visible, comprobando que logos oscuros (GitHub, Next.js) no desaparezcan en tema oscuro.

### P2

- **Render continuo (código).** El grafo (1400 nodos) se dibuja siempre, también en secciones de lectura. Propuesta: bajar a ~30 fps o pausar cuando la deriva es 0 y no hay morph.
- **Experiencia y Soft skills usan el mismo dock de iniciales.** Funciona, pero es el menos expresivo de las vistas; el dock con foto de portada ayuda cuando hay portada.
- **Guiones largos en el contenido** (`Entrada.astro` en "Cómo usé IA aquí", datos de ejemplo en `seed.ts`).
- **Móvil usa 380 nodos (código):** la forma del teclado pierde detalle; probar 500-600 si el rendimiento lo permite.

### P3

- Fondo de las vistas de contenido: todas son panel translúcido sobre el grafo; una variación de composición por sección (como ahora en Sobre mí) sube la nota de las demás.
- Tarjetas del riel sin foto muestran iniciales sobre rayas; una portada generada por proyecto cerraría el hueco.

## Cómo se verificó

- `pnpm test`: 9/9. `astro check`: 0 errores. Detector de Impeccable sobre `global.css` y `[...ruta].astro`: sin hallazgos.
- Capturas: Sobre mí en escritorio, móvil y tema claro; secuencia del golpe en la forma de Proyectos.
- No probé: lector de pantalla real, Safari/Firefox (`@property` y `mask-composite` están soportados, pero no los vi), ni el rendimiento en un teléfono real.

## Segunda ronda: pendientes resueltos

| Hallazgo | Solución |
|---|---|
| Formas repetidas | Experiencia pasa de teclado a una **línea de tiempo** con cuatro hitos y un pulso rojo que la recorre de arriba abajo. Se eliminó el teclado y su rama del shader. |
| Detalle de entrada solo texto | Portada a todo el ancho (la foto de la entrada, que ya no se repite en la galería) o, sin foto, un **mini grafo** propio generado a partir del slug (`MiniGrafo.astro`). Tecnologías con su logo. En Experiencia, periodo, cargo y empresa forman una línea de tiempo vertical. |
| Tarjetas del riel sin foto | Usan el mismo mini grafo detrás de las iniciales. |
| Foco al cambiar de sección | Al terminar de abrir una sección el foco pasa a su título (y al nombre al volver al inicio); no se hace en la carga inicial. **Verificado** en el navegador. |
| Sin `<main>` ni salto | `<main id="contenido">` envuelve las secciones y hay un enlace "Saltar al contenido" visible con foco. |
| Color de marca solo con hover | Con `@media (hover: none)` el color se ve siempre. Los logos casi negros o casi blancos se ajustan por tema (`light-dark()`), también en hover. |
| Grafo siempre a pleno | En secciones de lectura se dibuja a ~24 fps; vuelve a pleno durante un morph y 0.4 s después de mover el puntero. |
| Móvil con pocos nodos | De 380 a 520. **Sin probar en un teléfono real**: si se nota lento, bajar `N` en `app.ts`. |
| Guiones largos | Fuera de la ficha de IA y de los datos de ejemplo. Se dejó el del `<title>` (decisión de SEO). |

**Contenedor de lectura.** Las entradas (proyectos, experiencia, soft skills) y las categorías de skills van dentro de un contenedor translúcido (`--lectura`: casi transparente, 2-4 %) con desenfoque de 5 px (se ve el grafo suavizado detrás), un reflejo suave en los bordes tipo vidrio líquido (`--vidrio-borde`, `--vidrio-brillo`), un brillo tenue del acento en la esquina superior izquierda y un **marco de nodos y aristas** (zigzag sobre un perímetro irregular: cada nodo se aparta ~10 % de su separación, constante `IRREGULAR` en `marco()`; esquinas en rojo, trazo que se dibuja la primera vez que se muestra; lo genera `marco()` en `app.ts` con el tamaño real del panel). Lo usan las entradas, las categorías de skills y Contacto; las tarjetas de Sobre mí comparten el mismo vidrio: el grafo se ve a través, pero las líneas de detrás quedan borrosas y no cruzan el texto.

Verificación: `pnpm test` 9/9, `astro check` 0 errores, detector sin hallazgos, capturas de Proyectos, Experiencia, Soft skills y Skills, y consola sin errores.
Pendiente de tu lado: `docs/formas.jpg` del README todavía muestra el teclado de Experiencia; hay que recapturarla.

## Tercera ronda: ancho completo y sin scroll forzado en 16:9

Medido a 1321×666 (un 1366×768 con la barra del navegador): todas las vistas desbordaban (Sobre mí +66 px, Proyectos +206, Experiencia +157, Skills +470, Contacto +44). Causa: contenido encajonado en columnas de 640 a 860 px y apilado en vertical.

- **Entradas** (Proyectos, Experiencia, Soft skills): desde 1000 px de ancho, dos columnas: texto a la izquierda; portada y galería a la derecha. Usan hasta 1600 px. Por debajo de 1000 px siguen apiladas (portada, texto, galería).
- **Contacto:** desde 1000 px, intro a la izquierda y formulario a la derecha.
- **Sobre mí:** la ficha ocupa el ancho restante y la foto se achica según la altura de la ventana (`100dvh`) en vez de empujar la ficha.
- **Skills:** celdas que se adaptan al ancho y al alto de la ventana; en pantallas de menos de 720 px de alto se compactan.
- **Márgenes de sección** más justos: 68 px arriba y 28 px abajo (antes 80 y 48); el relleno de los paneles también depende de la altura.

Resultado en reposo: scroll extra de 0 px en las seis vistas a 1321×666 y a 1234×617 (un 1280×720 real), y 0 px a 1874×977. Móvil (390 px) sigue apilado y sin scroll horizontal.
Nota: al llegar por enlace directo a Proyectos, mientras la sección se desliza (≈0.6 s) los elementos fijos del riel cuentan como desborde y pueden asomar una barra de scroll un instante; en reposo desaparece.
