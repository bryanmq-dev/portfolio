# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Las fechas son AAAA-MM-DD.

## [Sin publicar]

### Añadido
- **Proyectos:** forma de transición propia, un martillo que cae sobre un teclado mecánico. La onda del golpe recorre las teclas, que se hunden y destellan en rojo; la forma queda 1.5 s a la vista (dos golpes).
- **Experiencia:** forma de línea de tiempo con cuatro hitos y un pulso que la recorre de arriba abajo.
- **Sobre mí:** rediseño en mosaico con retrato y marcas de esquina, tarjeta `$ cat bio.md`, cifras que cuentan (proyectos, eventos y skills tomados de la base de datos), estudios, enlaces con logo y llamada a contacto. El borde de cada tarjeta se ilumina bajo el puntero.
- **Entradas:** portada a todo el ancho; sin foto se genera un mini grafo propio a partir del slug (`MiniGrafo.astro`, `portada.ts`), también en las tarjetas del riel. Tecnologías con su logo. En Experiencia, periodo, cargo y empresa forman una línea de tiempo vertical.
- **Paneles de lectura:** vidrio casi transparente con desenfoque (se ve el grafo detrás), reflejo suave en los bordes y un marco de nodos y aristas de borde irregular (~10 %), que se dibuja la primera vez que se muestra.
- **Accesibilidad:** `<main>`, enlace "Saltar al contenido" y foco al título de la sección al navegar.
- `docs/auditoria-ui.md`: reporte de la auditoría de UI/UX con lo corregido y lo pendiente.

### Cambiado
- **Ancho completo:** desde 1000 px las entradas van en dos columnas (texto a la izquierda, portada y galería a la derecha) y Contacto en dos (intro y formulario); Sobre mí y Skills se adaptan al ancho y al alto. Ninguna vista necesita scroll en 16:9 de 1234×617 en adelante.
- **Grafo en secciones de lectura:** se dibuja a ~24 fps (pleno durante un morph y tras mover el puntero). En móvil sube de 380 a 520 nodos.
- **Skills:** el color de marca se ve siempre en pantallas sin puntero; los logos casi negros o casi blancos se ajustan por tema.
- Márgenes de sección más justos (68 px arriba, 28 px abajo).
- Guiones largos fuera de la ficha de IA y de los datos de ejemplo.

### Corregido
- **Contraste (WCAG AA):** `--gris-3` pasa de 3.88:1 a 5.98:1 en oscuro y de 3.20:1 a 4.96:1 en claro; el acento usado como texto (`--accent-t`) pasa de 3.04:1 a 4.89:1 en oscuro.
- El tooltip del dock aparece también con foco de teclado; los botones del contador miden 44 px en pantallas táctiles.
- Sobre mí sin foto muestra un monograma en vez de un recuadro vacío.

### Eliminado
- La forma de teclado de Experiencia (reemplazada por la línea de tiempo) y su rama del shader.

### Pendiente
- Recapturar `docs/formas.jpg` del README: aún muestra el teclado de Experiencia.

## [1.0.0] - 2026-10-27

### Añadido
- Base del proyecto: Astro SSR, PostgreSQL y Docker Compose.
- Panel de administración con 2FA, subida de media, solicitudes de contacto y SMTP.
- Sitio público: grafo three.js que se transforma en una forma distinta en cada sección.
- SEO: sitemap, robots, imagen para compartir y healthcheck.
- README con capturas, arquitectura y guía de despliegue.
