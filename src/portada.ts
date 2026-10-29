// Portada de relleno para entradas sin foto: un mini grafo determinista (mismo título, mismo dibujo).
const W = 240, H = 152;

export function miniGrafo(semilla: string): { aristas: string; nodos: [number, number, number][] } {
  let a = [...semilla].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const azar = () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296);
  const nodos = Array.from({ length: 11 }, (): [number, number, number] => [16 + azar() * (W - 32), 14 + azar() * (H - 28), 0.9 + azar() * 1.5]);
  const vistas = new Set<string>();
  let aristas = '';
  nodos.forEach(([x, y], i) => {
    const cerca = nodos
      .map(([bx, by], j) => [Math.hypot(bx - x, by - y), j] as const)
      .filter(([, j]) => j !== i)
      .sort((p, q) => p[0] - q[0])
      .slice(0, 2);
    for (const [, j] of cerca) {
      const id = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (vistas.has(id)) continue;
      vistas.add(id);
      aristas += `M${x.toFixed(1)} ${y.toFixed(1)}L${nodos[j][0].toFixed(1)} ${nodos[j][1].toFixed(1)}`;
    }
  });
  return { aristas, nodos };
}
