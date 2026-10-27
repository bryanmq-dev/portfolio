// Subidas del admin: el archivo va crudo por PUT (sin multipart) y el servidor devuelve su URL.
// Las fotos grandes se reducen antes en un <canvas>; data-crudo lo evita (la silueta necesita su alpha intacto).
const csrf = document.body.dataset.csrf!;

async function reducir(f: File, lado = 2400): Promise<Blob> {
  if (!f.type.startsWith('image/') || f.type === 'image/gif') return f;
  const img = await createImageBitmap(f, { imageOrientation: 'from-image' });
  if (Math.max(img.width, img.height) <= lado && f.size < 1.5e6) return f;
  const k = Math.min(1, lado / Math.max(img.width, img.height));
  const c = new OffscreenCanvas(Math.round(img.width * k), Math.round(img.height * k));
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.convertToBlob({ type: 'image/webp', quality: 0.86 });
}

async function subir(f: File, crudo: boolean): Promise<{ url: string; tipo: 'imagen' | 'video' }> {
  const r = await fetch('/api/admin/media', { method: 'PUT', headers: { 'x-csrf': csrf }, body: crudo ? f : await reducir(f) });
  const j = await r.json().catch(() => ({ error: `Error ${r.status}` }));
  if (!r.ok) throw new Error(j.error);
  return j;
}

for (const input of document.querySelectorAll<HTMLInputElement>('input[data-subir]')) {
  input.addEventListener('change', async () => {
    const etiqueta = input.closest('label') ?? input;
    etiqueta.classList.add('subiendo');
    try {
      for (const f of input.files ?? []) {
        const { url, tipo } = await subir(f, input.hasAttribute('data-crudo'));
        if (input.dataset.subir === 'media') {
          const li = (document.querySelector<HTMLTemplateElement>('#tpl-media')!.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
          li.querySelector<HTMLInputElement>('[name=media_url]')!.value = url;
          li.querySelector<HTMLInputElement>('[name=media_tipo]')!.value = tipo;
          const vista = document.createElement(tipo === 'video' ? 'video' : 'img');
          vista.src = url;
          li.prepend(vista);
          document.querySelector('#medias')!.append(li);
        } else {
          const campo = input.dataset.subir!;
          document.querySelector<HTMLInputElement>(`input[name="${campo}"]`)!.value = url;
          document.querySelector<HTMLImageElement>(`[data-previa="${campo}"]`)!.src = url;
        }
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      input.value = '';
      etiqueta.classList.remove('subiendo');
    }
  });
}

document.addEventListener('click', (ev) => {
  const b = (ev.target as Element).closest('[data-quitar]');
  if (b) b.closest('li')!.remove();
});
