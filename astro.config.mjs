// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// Detrás de Cloudflare Tunnel el TLS termina en el proxy: Astro vería http:// y su checkOrigin
// rechazaría todo POST. El middleware compara Origin con SITE_ORIGIN y exige CSRF en cada escritura.
// .env en dev (en el contenedor no existe: las variables llegan por compose/Coolify).
try {
  process.loadEnvFile();
} catch {}

const origen = process.env.SITE_ORIGIN ? new URL(process.env.SITE_ORIGIN) : null;

export default defineConfig({
  site: process.env.SITE_ORIGIN ?? 'https://bryanmq.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }), // server.mjs lo monta con los estáticos comprimidos
  security: {
    checkOrigin: false,
    allowedDomains: origen ? [{ hostname: origen.hostname, protocol: origen.protocol.replace(':', '') }] : [],
  },
  vite: { plugins: [tailwindcss()] },
});
