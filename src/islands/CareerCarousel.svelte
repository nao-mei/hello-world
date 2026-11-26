<script lang="ts">
  import { onMount } from 'svelte';

  interface Item {
    id: string;
    name: string;
    mono: string;
    title?: string;
    years?: string;
    current?: boolean;
    early?: boolean;
    theme?: string | undefined;
    lesson?: string | undefined;
    skills?: string[];
  }
  let { items, earlyRoles = [] }: { items: Item[]; earlyRoles?: string[] } = $props();

  let activeId = $state(items[items.length - 1]!.id);
  let vertical = $state(false);
  // Wide screens: earliest on the left to current on the right. Phones: current at the top, past below.
  const ordered = $derived(vertical ? [...items].reverse() : items);
  const index = $derived(Math.max(0, ordered.findIndex((x) => x.id === activeId)));
  // Skills build up as you move later along the path: new ones at this stop, and those carried from earlier stops.
  const upTo = $derived(items.findIndex((x) => x.id === activeId));
  const active = $derived(items[Math.max(0, upTo)]!);
  const carried = $derived([...new Set(items.slice(0, Math.max(0, upTo)).flatMap((x) => x.skills ?? []))].filter((k) => !(active.skills ?? []).includes(k)));
  let showOld = $state(false);
  let viewport = $state<HTMLElement>();
  let els = $state<HTMLElement[]>([]);
  let shift = $state(0);

  function measure() {
    const el = els[index];
    if (!el || !viewport) return;
    const size = vertical ? viewport.clientHeight : viewport.clientWidth;
    const pos = vertical ? el.offsetTop + el.offsetHeight / 2 : el.offsetLeft + el.offsetWidth / 2;
    shift = size * (vertical ? 0.3 : 0.5) - pos;
  }

  $effect(() => {
    index;
    vertical;
    els.length;
    measure();
  });

  const go = (i: number) => {
    activeId = ordered[Math.min(ordered.length - 1, Math.max(0, i))]!.id;
  };

  function onMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || !viewport) return;
    const r = viewport.getBoundingClientRect();
    const f = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    go(Math.round(f * (ordered.length - 1)));
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(ordered.length - 1); }
  }

  // Wide screens show details for the selected stop and its neighbours; phones show only the selected one.
  const detailed = (i: number) => (vertical ? i === index : Math.abs(i - index) <= 1);

  onMount(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const sync = () => (vertical = mq.matches);
    sync();
    mq.addEventListener('change', sync);
    const ro = new ResizeObserver(measure);
    if (viewport) ro.observe(viewport);
    document.documentElement.classList.add('career-js');
    return () => {
      mq.removeEventListener('change', sync);
      ro.disconnect();
      document.documentElement.classList.remove('career-js');
    };
  });
</script>

<div class="career" class:vertical>
  <div class="viewport" bind:this={viewport} onpointermove={onMove} onkeydown={onKey} role="group" aria-label="Career path. Use arrow keys, or hover, to move along it." tabindex="-1">
    <ol class="track" style:transform={vertical ? `translateY(${shift}px)` : `translateX(${shift}px)`}>
      {#each ordered as it, i (it.id)}
        <li class="item" class:active={i === index} class:now={it.current} style:--d={Math.min(3, Math.abs(i - index))} bind:this={els[i]}>
          <button type="button" class="hit" aria-current={i === index ? 'true' : undefined} onclick={() => go(i)} onfocus={() => go(i)}>
            <span class="node" class:dots={it.early} aria-hidden="true">
              {#if it.early}<i></i><i></i><i></i><i></i>{:else}{it.mono}{/if}
            </span>
            <span class="meta">
              <strong>{it.name}</strong>
              {#if it.title}<span class:sr={!detailed(i)}>{it.title}</span>{/if}
              {#if it.years}<span class="years" class:sr={!detailed(i)}>{it.years}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ol>
  </div>
  <div class="panel" aria-label="About this stop">
    <p class="ptitle"><strong>{active.name}</strong>{#if active.years} <span>{active.years}</span>{/if}</p>
    {#if active.theme}<p class="ptheme">{active.theme}</p>{/if}
    {#if active.lesson}<p class="plesson"><span>What it taught me</span> {active.lesson}</p>{/if}
    {#if (active.skills ?? []).length || carried.length}
      <ul class="chips" aria-label="Skills">
        {#if showOld}{#each carried as k (k)}<li class="old">{k}</li>{/each}{/if}
        {#each active.skills ?? [] as k (k)}<li class="new">{k}</li>{/each}
      </ul>
      {#if carried.length}
        <button type="button" class="more" aria-expanded={showOld} onclick={() => (showOld = !showOld)}>{showOld ? 'Hide' : 'Show'} {carried.length} skills from earlier stops</button>
      {/if}
    {/if}
  </div>
  <div class="ctrl">
    <button type="button" onclick={() => go(index - 1)} disabled={index === 0}>{vertical ? '↑ Newer' : '← Earlier'}</button>
    <button type="button" onclick={() => go(index + 1)} disabled={index === ordered.length - 1}>{vertical ? 'Older ↓' : 'Later →'}</button>
  </div>
  {#if earlyRoles.length}
    <details class="early-roles">
      <summary>Early career roles</summary>
      <ul>{#each earlyRoles as r}<li>{r}</li>{/each}</ul>
    </details>
  {/if}
</div>

<style>
  .career { margin: 2.5rem 0 3rem; }
  .viewport { position: relative; height: 12rem; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
  .vertical .viewport { height: 14rem; -webkit-mask-image: linear-gradient(180deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(180deg, transparent, #000 10%, #000 90%, transparent); }
  .track { position: relative; display: flex; align-items: flex-start; list-style: none; margin: 0; padding: 0; width: max-content; }
  .vertical .track { flex-direction: column; width: 100%; }
  .track::before { content: ''; position: absolute; top: 1.7rem; left: -100vw; right: -100vw; border-top: 1px dashed var(--mut); opacity: 0.7; }
  .vertical .track::before { top: -100vh; bottom: -100vh; left: 1.7rem; right: auto; border-top: 0; border-left: 1px dashed var(--mut); }
  .item { flex: none; width: 16rem; text-align: center; }
  .vertical .item { width: 100%; text-align: left; padding-bottom: 1.1rem; }
  .hit { all: unset; display: block; width: 100%; box-sizing: border-box; cursor: pointer; padding: 0 0.5rem; }
  .vertical .hit { display: flex; gap: 1rem; padding: 0; }
  .hit:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  /* every node is the same size and sits on the same line; distance is shown by opacity only */
  .node {
    position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 3.4rem; height: 3.4rem; flex: none;
    border-radius: 50%; border: 1.5px solid var(--mut); background: var(--surface); color: var(--fg); font: 600 1rem var(--font-display);
    opacity: calc(1 - var(--d) * 0.25);
  }
  .node.dots { display: inline-grid; grid-template-columns: repeat(2, 6px); gap: 5px; justify-content: center; align-content: center; }
  .node i { width: 6px; height: 6px; border-radius: 50%; background: var(--mut); }
  .item.active .node { border-color: var(--accent); box-shadow: 0 0 22px -4px var(--accent); }
  .item.now .node { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .meta { display: block; margin-top: 0.75rem; color: var(--mut); font-size: 0.92rem; line-height: 1.45; }
  .vertical .meta { margin-top: 0.7rem; }
  .meta strong { display: block; color: var(--fg); font: 500 1.1rem var(--font-display); }
  .meta span { display: block; }
  .meta .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .panel { max-width: 40rem; margin: 0.5rem auto 0; padding: 1rem 1.25rem; border: 1px solid var(--line); background: var(--surface); text-align: center; }
  .ptitle { margin: 0; font: 500 1.05rem var(--font-display); } .ptitle span { color: var(--mut); font: 400 0.9rem var(--font-body); margin-left: 0.4rem; }
  .ptheme { margin: 0.35rem 0 0.8rem; color: var(--mut); font-size: 0.95rem; line-height: 1.5; }
  .plesson { margin: 0 0 0.9rem; font-size: 0.97rem; line-height: 1.5; color: var(--fg); } .plesson span { display: block; color: var(--accent); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.15rem; }
  .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; }
  .chips li { font-size: 0.82rem; padding: 0.2rem 0.65rem; border: 1px solid var(--line); border-radius: 999px; color: var(--mut); }
  .chips li.new { border-color: var(--accent); color: var(--fg); background: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
  .more { margin: 0.7rem 0 0; font: 500 0.8rem var(--font-body); color: var(--accent); background: none; border: 0; cursor: pointer; padding: 0.4rem 0.5rem; min-height: 2.25rem; }
  .more:hover { text-decoration: underline; }
  .legend { margin: 0.7rem 0 0; font-size: 0.78rem; color: var(--mut); letter-spacing: 0.03em; }
  .legend i { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--line); margin: 0 0.25rem 0 0.6rem; vertical-align: -1px; } .legend i:first-child { margin-left: 0; }
  .legend i.new { background: var(--accent); border-color: var(--accent); }
  .ctrl { display: flex; justify-content: center; gap: 1rem; margin-top: 0.5rem; }
  .ctrl button { font: 500 0.85rem var(--font-body); padding: 0.4rem 0.8rem; border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; }
  .ctrl button:hover:not(:disabled) { border-color: var(--accent); }
  .ctrl button:disabled { color: var(--mut); cursor: default; opacity: 0.6; }
  .early-roles { margin: 0.9rem auto 0; max-width: 34rem; color: var(--mut); font-size: 0.9rem; text-align: center; }
  .early-roles summary { cursor: pointer; display: inline-block; padding: 0.25rem 0.5rem; }
  .early-roles summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .early-roles ul { list-style: none; margin: 0.4rem 0 0; padding: 0; line-height: 1.5; }
  .early-roles li { margin-bottom: 0.3rem; }
  @media (prefers-reduced-motion: no-preference) {
    .track { transition: transform 0.55s cubic-bezier(0.2, 0.7, 0.2, 1); }
    .node { transition: opacity 0.4s, border-color 0.25s, box-shadow 0.25s; }
    .chips li { transition: background 0.3s, border-color 0.3s, color 0.3s; }
    .chips li.new { animation: chip-in 0.45s ease-out both; }
    @keyframes chip-in { from { opacity: 0; transform: translateY(6px) scale(0.9); } }
  }
</style>
