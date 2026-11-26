<script lang="ts">
  import { onMount } from 'svelte';

  interface Idea {
    id: number;
    name: string;
    href: string;
  }
  let { ideas }: { ideas: Idea[] } = $props();

  const R = 100;
  const D = Math.PI / 180;
  const CX = 200;
  const CY = 165;
  type P3 = [number, number, number];

  // Three outlines in three planes. Viewed along each axis one reads as a circle, a triangle or a square.
  const sub = (pts: P3[], n: number): P3[] =>
    pts.flatMap((a, i) => {
      const b = pts[(i + 1) % pts.length]!;
      return Array.from({ length: n }, (_, k): P3 => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
    });
  const circle: P3[] = Array.from({ length: 72 }, (_, i): P3 => [R * Math.cos((i / 72) * 2 * Math.PI), R * Math.sin((i / 72) * 2 * Math.PI), 0]);
  const square: P3[] = sub([[-R, 0, -R], [R, 0, -R], [R, 0, R], [-R, 0, R]], 10);
  const triangle: P3[] = sub([[0, -R, -R], [0, -R, R], [0, R, 0]], 14);
  const loops = [circle, square, triangle]; // index = idea index: circle, square, triangle
  const views = [
    { yaw: 0, pitch: 0 }, // circle
    { yaw: 0, pitch: -90 * D }, // square
    { yaw: 90 * D, pitch: 0 }, // triangle
  ];

  let yaw = $state(0);
  let pitch = $state(0);
  let target = { yaw: 0, pitch: 0 };
  let hostEl = $state<HTMLElement>();
  let interacting = false;
  let lastInput = 0;
  let reduce = false;

  const project = ([x, y, z]: P3) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    return { x: CX + x1, y: CY - y2, z: z2 };
  };

  const dist = (v: { yaw: number; pitch: number }) => Math.hypot(yaw - v.yaw, pitch - v.pitch);
  const active = $derived(views.findIndex((v) => dist(v) < 14 * D));

  const segs = $derived(
    loops.map((pts, li) => {
      const q = pts.map(project);
      return q.map((a, i) => {
        const b = q[(i + 1) % q.length]!;
        const depth = (a.z + b.z) / 2;
        const o = 0.22 + 0.78 * Math.min(1, Math.max(0, (depth + R) / (2 * R)));
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, o };
      });
    }),
  );

  const nodes = $derived(
    [[circle[0]!, circle[18]!, circle[36]!, circle[54]!], [[-R, 0, -R], [R, 0, -R], [R, 0, R], [-R, 0, R]] as P3[], [[0, -R, -R], [0, -R, R], [0, R, 0]] as P3[]].map((pts) =>
      pts.map(project),
    ),
  );

  // Filled outline of each shape, used to highlight the one currently facing the viewer.
  const faces = $derived(loops.map((pts) => pts.map(project).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')));

  function setView(i: number) {
    interacting = true;
    lastInput = performance.now();
    const v = views[i]!;
    target = { yaw: v.yaw, pitch: v.pitch };
    if (reduce) { yaw = v.yaw; pitch = v.pitch; }
  }

  function onMove(e: PointerEvent) {
    if (!hostEl) return;
    // Over the idea labels, the label decides the view; the pointer position must not override it.
    if ((e.target as HTMLElement | null)?.closest?.('.views')) return;
    const r = hostEl.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    interacting = true;
    lastInput = performance.now();
    target = { yaw: (nx - 0.5) * 2 * 90 * D, pitch: -ny * 90 * D };
    if (reduce) { yaw = target.yaw; pitch = target.pitch; }
  }

  function release() {
    interacting = false;
    lastInput = performance.now();
  }

  onMount(() => {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      // Idle: drift through the three views, a few seconds each (not at all if reduced motion).
      if (!reduce && !interacting && now - lastInput > 1500) {
        const v = views[Math.floor(now / 4200) % 3]!;
        target = { yaw: v.yaw, pitch: v.pitch };
      }
      if (!reduce) {
        const k = 1 - Math.exp(-dt * 5);
        yaw += (target.yaw - yaw) * k;
        pitch += (target.pitch - pitch) * k;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="shape" data-active={active >= 0 ? active + 1 : ''} bind:this={hostEl} onpointermove={onMove} onpointerleave={release} role="presentation">
  <svg viewBox="0 0 400 330" aria-hidden="true">
    {#each segs as loop, li}
      <g class="loop" class:on={active === li}>
        <polygon class="face" points={faces[li]} />
        {#each loop as s}
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} style:stroke-opacity={s.o} />
        {/each}
        {#each nodes[li]! as n}
          <circle cx={n.x} cy={n.y} r={2.6 + (n.z + R) / 90} />
        {/each}
      </g>
    {/each}
  </svg>
  <p class="sr">An object made of a circle, a triangle and a square in three planes. Seen from one angle it is a circle, from another a triangle, from another a square: three views of one thing.</p>
  <ul class="views">
    {#each ideas as idea, i}
      <li>
        <a href={idea.href} class:on={active === i} onmouseenter={() => setView(i)} onfocus={() => setView(i)} onmouseleave={release} onblur={release}>
          <svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">
            {#if i === 0}<circle cx="8" cy="8" r="6" />{:else if i === 1}<rect x="2.5" y="2.5" width="11" height="11" />{:else}<path d="M8 2 L14.5 14 H1.5 Z" />{/if}
          </svg>
          <span class="num">0{idea.id}</span> {idea.name}
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .shape { display: block; width: 100%; max-width: 30rem; margin-inline: auto; touch-action: pan-y; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  .loop line { stroke: var(--mut); stroke-width: 1.4; stroke-linecap: round; transition: stroke 0.25s; }
  .loop circle { fill: var(--surface); stroke: var(--mut); stroke-width: 1.2; transition: fill 0.25s, stroke 0.25s; }
  .loop.on line { stroke: var(--accent); stroke-width: 2.8; filter: drop-shadow(0 0 5px var(--accent)); }
  .loop.on circle { fill: var(--accent); stroke: var(--accent2); }
  .face { fill: none; transition: fill 0.3s; }
  .loop.on .face { fill: var(--accent); fill-opacity: 0.14; }
  /* when one shape faces you, the other two step back */
  .shape:has(.loop.on) .loop:not(.on) { opacity: 0.4; }
  .glyph { display: inline-block; vertical-align: -2px; width: 0.95rem; height: 0.95rem; margin-right: 0.35rem; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
  .views a.on .glyph { fill: var(--accent); stroke: var(--accent); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .views { list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem 1.4rem; padding: 0; margin: 0.5rem 0 0; }
  .views a { display: inline-block; padding: 0.35rem 0.1rem; color: var(--mut); text-decoration: none; font-size: 0.85rem; letter-spacing: 0.04em; border-bottom: 1px solid transparent; }
  .views a:hover, .views a:focus-visible, .views a.on { color: var(--fg); border-bottom-color: var(--accent); }
  .num { color: var(--accent); font-weight: 600; letter-spacing: 0.14em; margin-right: 0.35rem; }
</style>
