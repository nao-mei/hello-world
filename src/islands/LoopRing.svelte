<script lang="ts">
  import { onMount } from 'svelte';

  interface Step {
    title: string;
    text: string;
  }
  let { steps }: { steps: Step[] } = $props();

  const N = steps.length;
  const SLOT = 45; // degrees round the drum between neighbouring rows
  const RADIUS = 6.2; // rem: the drum's radius, for the vertical position of each row

  let k = $state(0); // absolute slot in front; keeps growing, so the drum always turns the same way
  let rot = $state(0); // eased copy of k
  let touched = false; // once the visitor interacts, it stops turning on its own
  let hovering = false;
  let reduce = false;

  const wrap = (n: number) => ((n % N) + N) % N;
  const active = $derived(wrap(k));
  // A window of absolute slots around the current position; rows are keyed by slot so they glide, not jump.
  const rows = $derived(Array.from({ length: 7 }, (_, d) => Math.round(rot) + d - 3));

  function geo(j: number) {
    const a = (j - rot) * SLOT;
    const c = Math.cos((a * Math.PI) / 180);
    return {
      y: RADIUS * Math.sin((a * Math.PI) / 180),
      scale: 0.45 + 0.55 * Math.max(c, 0),
      opacity: Math.max(c, 0) ** 0.5, // gentle fade, so the neighbouring rows stay readable (contrast) in both themes
      detail: Math.max(0, 1 - Math.abs(a) / 30), // the description only shows at the front
      front: Math.abs(a) < 50, // the back of the drum is out of reach for pointer and keyboard
    };
  }

  function pick(j: number) {
    touched = true;
    k = j;
    if (reduce) rot = k;
  }

  function next() {
    pick(k + 1);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); pick(k + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); pick(k - 1); }
  }

  onMount(() => {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('loop-js');
    let raf = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      if (!reduce) rot += (k - rot) * (1 - Math.exp(-dt * 5));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = window.setInterval(() => {
      if (!touched && !hovering && !reduce && !document.hidden) k += 1;
    }, 3800);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      document.documentElement.classList.remove('loop-js');
    };
  });
</script>

<div class="loop" onpointerenter={() => (hovering = true)} onpointerleave={() => (hovering = false)} onkeydown={onKey} role="group" aria-label="The pattern, as a turning drum. Select a step, or press Next.">
  <div class="reel">
    <span class="spine" aria-hidden="true"></span>
    <span class="window" aria-hidden="true"></span>
    <ol class="rows">
      {#each rows as j (j)}
        {@const g = geo(j)}
        {@const s = steps[wrap(j)]!}
        <li class="row" style:transform="translateY({g.y}rem) scale({g.scale})" style:opacity={g.opacity} inert={!g.front} aria-hidden={!g.front}>
          <button type="button" class="rn" class:on={wrap(j) === active && g.front && Math.abs((j - rot) * SLOT) < 22} aria-current={j === k ? 'step' : undefined} onclick={() => pick(j)} onfocus={() => pick(j)}>
            <span class="num" aria-hidden="true">{wrap(j) + 1}</span>
            <span class="txt">
              <strong>{s.title}</strong>
              <span class="desc" style:opacity={g.detail}>{s.text}</span>
            </span>
          </button>
        </li>
      {/each}
    </ol>
  </div>
  <button type="button" class="next" onclick={next}>Next step ↓</button>
</div>

<style>
  .loop { margin: 1.5rem 0 0.5rem; }
  .reel {
    position: relative; height: 16rem; max-width: 30rem; margin: 0 auto; overflow: hidden;
    -webkit-mask-image: linear-gradient(180deg, transparent, #000 24%, #000 76%, transparent);
    mask-image: linear-gradient(180deg, transparent, #000 24%, #000 76%, transparent);
  }
  .spine { position: absolute; top: 0; bottom: 0; left: 1.6rem; border-left: 1px dashed var(--mut); opacity: 0.7; }
  .window { position: absolute; left: 0; right: 0; top: 50%; height: 5.4rem; transform: translateY(-50%); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .rows { list-style: none; margin: 0; padding: 0; }
  .row { position: absolute; left: 0; right: 0; top: 50%; height: 0; transform-origin: left center; will-change: transform, opacity; }
  .rn { all: unset; box-sizing: border-box; position: absolute; left: 0; right: 0; transform: translateY(-50%); display: flex; align-items: center; gap: 1rem; cursor: pointer; }
  .rn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .num {
    flex: none; width: 3.2rem; height: 3.2rem; display: inline-flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 1.5px solid var(--accent); background: var(--surface); color: var(--accent);
    font: 600 1rem var(--font-display); transition: background 0.3s, color 0.3s, box-shadow 0.3s;
  }
  .rn.on .num { background: var(--accent); color: var(--on-accent); box-shadow: 0 0 22px -4px var(--accent); }
  .txt { display: block; text-align: left; }
  .txt strong { display: block; font: 500 1.1rem var(--font-display); color: var(--fg); }
  .desc { display: block; color: var(--mut); font-size: 0.9rem; line-height: 1.4; max-width: 20rem; }
  .next { display: block; margin: 0.5rem auto 0; font: 500 0.85rem var(--font-body); padding: 0.4rem 0.9rem; border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; }
  .next:hover { border-color: var(--accent); }
</style>
