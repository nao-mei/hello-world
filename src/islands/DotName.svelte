<script lang="ts">
  import { onMount } from 'svelte';

  // (named `family` inside, because the animation code below keeps a variable called `last` for frame timing)
  let { first = 'Naomei', last: family = 'Cathcart' }: { first?: string; last?: string } = $props();

  let host = $state<HTMLElement>();
  let canvas = $state<HTMLCanvasElement>();
  let revealed = $state(false);

  onMount(() => {
    if (!host || !canvas) return;
    const el = host;
    const cv = canvas;
    const ctx = cv.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FONT = '"Bricolage Grotesque Variable", system-ui, sans-serif';
    const REVEAL_SPEED = 0.6; // px per ms: how fast the first reveal spreads
    const WAVE_SPEED = 0.45; // px per ms: how fast a click's shockwave travels
    const REACH = 54; // px: how far the pointer pushes dots
    const SPRING = 110; // how hard dots are pulled back home
    const DAMP = 13; // how quickly they settle (a little bounce is intended)

    type Dot = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; on: boolean };
    let dots: Dot[] = [];
    let W = 0;
    let H = 0;
    let t0 = -1; // when the reveal started; -1 = not yet
    let origin = { x: 0, y: 0 };
    let pointer: { x: number; y: number } | null = null;
    let waves: { x: number; y: number; t: number }[] = [];
    let sweeps: number[] = []; // start times of idle shimmers
    let last = 0;
    let raf = 0;
    let colors = { mut: '#999', accent: '#4cb8f2', glow: '#a6dcf8' };

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
      colors = { mut: v('--mut', colors.mut), accent: v('--accent', colors.accent), glow: v('--accent2', colors.glow) };
    };

    // One small physics step of h seconds, at clock time tMs.
    function physics(h: number, tMs: number) {
      for (const d of dots) {
        let ax = -SPRING * (d.x - d.hx) - DAMP * d.vx;
        let ay = -SPRING * (d.y - d.hy) - DAMP * d.vy;
        if (pointer) {
          const px = d.hx - pointer.x;
          const py = d.hy - pointer.y;
          const dist = Math.hypot(px, py) || 1;
          if (dist < REACH) {
            const f = (1 - dist / REACH) ** 2 * 700; // dots part gently around the pointer
            ax += (px / dist) * f;
            ay += (py / dist) * f;
          }
        }
        for (const w of waves) {
          const wx = d.hx - w.x;
          const wy = d.hy - w.y;
          const dist = Math.hypot(wx, wy) || 1;
          const delta = Math.abs((tMs - w.t) * WAVE_SPEED - dist);
          if (delta < 26) {
            const f = (1 - delta / 26) * 1500; // the shockwave nudges dots outward
            ax += (wx / dist) * f;
            ay += (wy / dist) * f;
          }
        }
        d.vx += ax * h;
        d.vy += ay * h;
        d.x += d.vx * h;
        d.y += d.vy * h;
      }
    }

    // One animation frame: physics first, then drawing. Returns true while anything is still moving.
    function frame(now: number): boolean {
      const dt = Math.min(0.5, Math.max(0.001, (now - (last || now - 16)) / 1000));
      last = now;
      const radius = t0 < 0 ? -1 : (now - t0) * REVEAL_SPEED;
      const maxR = Math.hypot(W, H) + 60;
      waves = waves.filter((w) => (now - w.t) * WAVE_SPEED < maxR);
      sweeps = sweeps.filter((s) => (now - s) * 0.45 < W + 80);
      let energy = 0;
      let busy = false;
      if (!reduce) {
        // Several small steps keep the motion stable, and in real time even when frames are slow.
        const n = Math.max(1, Math.ceil(dt / (1 / 60)));
        for (let i = 0; i < n; i++) physics(dt / n, now - (n - 1 - i) * (dt / n) * 1000);
      }

      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        energy += Math.abs(d.x - d.hx) + Math.abs(d.y - d.hy) + Math.abs(d.vx) * 0.05 + Math.abs(d.vy) * 0.05;
        let r = d.on ? 1.5 : 1.2; // the name is faintly visible from the start, so it is never a blank grid
        let a = d.on ? 0.62 : 0.34;
        let col = colors.mut;
        if (radius >= 0) {
          const k = Math.min(1, Math.max(0, (radius - Math.hypot(d.hx - origin.x, d.hy - origin.y)) / 70));
          if (k < 1) busy = true;
          if (d.on) { r = 1.5 + 0.9 * k; a = 0.62 + 0.38 * k; if (k > 0) col = colors.accent; }
          else a = 0.34 - 0.2 * k;
        }
        const disp = Math.hypot(d.x - d.hx, d.y - d.hy);
        // Moved dots glow a little; only the name's own dots change colour, so the name stays readable.
        if (disp > 0.6) { r += Math.min(1, disp * 0.08); a = Math.min(1, a + Math.min(0.4, disp * 0.05)); if (d.on) col = colors.glow; }
        for (const s of sweeps) {
          const off = Math.abs(d.hx - (now - s) * 0.45);
          if (off < 34) { const p = 1 - off / 34; if (d.on) { r += 0.7 * p; a = Math.min(1, a + 0.5 * p); col = colors.glow; } else a = Math.min(1, a + 0.18 * p); }
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return busy || energy > 1.5 || waves.length > 0 || sweeps.length > 0 || !!pointer;
    }

    const loop = (now: number) => {
      raf = frame(now) ? requestAnimationFrame(loop) : 0;
      if (!raf) last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    function reveal(x: number, y: number) {
      if (t0 >= 0) return;
      origin = { x, y };
      t0 = reduce ? performance.now() - 1e6 : performance.now();
      revealed = true;
      kick();
    }

    async function build() {
      await document.fonts.load(`700 80px ${FONT}`);
      W = el.clientWidth;
      if (!W) return;
      const probe = document.createElement('canvas').getContext('2d')!;
      probe.font = `700 100px ${FONT}`;
      const em = Math.max(probe.measureText(first).width, probe.measureText(family).width) / 100;
      const fs = Math.min(92, (W * 0.97) / em);
      H = Math.ceil(fs * 2.1);
      const S = W < 420 ? 4 : 5; // dot spacing
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Draw the name off-screen, then sample it on the dot grid: a dot belongs to the name if a letter covers it.
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const o = off.getContext('2d')!;
      o.font = `700 ${fs}px ${FONT}`;
      o.fillStyle = '#000';
      o.fillText(first, 2, fs * 0.92);
      o.fillText(family, 2, fs * 0.92 + fs);
      const px = o.getImageData(0, 0, W, H).data;
      dots = [];
      for (let y = S / 2; y < H; y += S) {
        for (let x = S / 2; x < W; x += S) {
          dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, on: px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3]! > 110 });
        }
      }
      if (t0 >= 0) t0 = performance.now() - 1e6; // already revealed: stay revealed after a resize
      readColors();
      frame(performance.now());
      last = 0;
    }

    const local = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => { pointer = local(e); reveal(pointer.x, pointer.y); kick(); };
    // A click or tap sends a shockwave and plays the reveal again from that spot.
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      pointer = p;
      if (t0 < 0 || reduce) reveal(p.x, p.y);
      else { origin = p; t0 = performance.now(); }
      if (!reduce) waves.push({ x: p.x, y: p.y, t: performance.now() });
      kick();
    };
    const onLeave = () => { pointer = null; kick(); };
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointerleave', onLeave);

    const ro = new ResizeObserver(() => void build());
    ro.observe(el);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { readColors(); frame(performance.now()); last = 0; };
    mq.addEventListener('change', onScheme);
    window.addEventListener('themechange', onScheme);
    // If nobody touches the dots, the name comes out by itself, so it is never missed.
    const auto = window.setTimeout(() => { if (t0 < 0 && W) reveal(W / 2, H / 2); }, reduce ? 0 : 2500);
    // A soft shimmer crosses the name now and then, as a hint that it can be played with.
    const shimmer = window.setInterval(() => {
      if (reduce || t0 < 0 || pointer || document.hidden) return;
      sweeps.push(performance.now());
      kick();
    }, 6500);
    document.documentElement.classList.add('dots-js');

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(auto);
      clearInterval(shimmer);
      ro.disconnect();
      mq.removeEventListener('change', onScheme);
      window.removeEventListener('themechange', onScheme);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointerleave', onLeave);
      document.documentElement.classList.remove('dots-js');
    };
  });
</script>

<div class="dotname" bind:this={host}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  <p class="dothint" aria-hidden="true"><span class="pulse"></span>{revealed ? 'Move through them. Click for a ripple.' : 'Touch the dots'}</p>
</div>

<style>
  .dotname { width: 100%; margin: 0 0 1.25rem; }
  canvas { display: block; width: 100%; touch-action: pan-y; cursor: pointer; }
  .dothint { display: flex; align-items: center; gap: 0.5rem; margin: 0.6rem 0 0; min-height: 1.4rem; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  .pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex: none; }
  @media (prefers-reduced-motion: no-preference) {
    .pulse { animation: pulse 1.8s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(1.6); } }
  }
</style>
