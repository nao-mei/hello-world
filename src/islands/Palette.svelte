<script lang="ts">
  import { tick } from 'svelte';

  interface Item {
    id: string;
    label: string;
    hint?: string;
    href: string;
    external?: boolean;
    output?: string; // quick answers: shown instead of navigating
    art?: boolean | undefined; // output is ASCII art
    link?: string | undefined; // an "Open" link shown with the answer
    action?: 'ask'; // opens the "ask me something" terminal window
  }
  interface Typed {
    names: string[]; // already normalised
    keywords: string[]; // extra words that should lead to this answer
    label: string;
    output: string;
    art?: boolean | undefined;
    link?: string | undefined;
  }

  let { items, ask = [], more = [], typed = [] }: { items: Item[]; ask?: Item[]; more?: Item[]; typed?: Typed[] } = $props();

  const GREETING = "Not a chatbot, just prepared answers. Tap a question below, or type a command (try cv, ideas or help).";
  const FALLBACK = "No answer for that one. I only know the questions below, so tap one, or type help for the commands.";

  // Words that carry no meaning when matching a free-typed question to a prepared answer.
  const STOP = new Set('a an the you your yours i me my we our do does did is are was were be to of and or in on for with about tell what whats how can could would please any some it this that there here from at by as if so'.split(' '));
  const stem = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
  const words = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

  let dialog = $state<HTMLDialogElement>();
  let input = $state<HTMLInputElement>();
  let termInput = $state<HTMLInputElement>();
  let logEl = $state<HTMLElement>();
  let query = $state('');
  let termQuery = $state('');
  let active = $state(0);
  let mode = $state<'search' | 'ask'>('search');
  let ran = $state<{ name: string; output: string; art?: boolean; link?: string } | null>(null);
  let log = $state<{ cmd?: string; out: string; art?: boolean; link?: string }[]>([{ out: GREETING }]);
  let showMore = $state(false);

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  // Precomputed word sets for loose matching of free-typed questions.
  const index = $derived(typed.map((t) => ({ t, set: new Set(words([...t.names, ...t.keywords].join(' '))) })));

  function best(raw: string): Typed | undefined {
    const q = words(raw);
    if (!q.length) return undefined;
    let top: Typed | undefined;
    let score = 0;
    for (const { t, set } of index) {
      const s = q.filter((w) => set.has(w)).length;
      if (s > score) { score = s; top = t; }
    }
    return top;
  }

  // Search mode: substring matching. An exact typed phrase (including the hidden ones) is offered first.
  const filtered = $derived.by(() => {
    const q = norm(query);
    const found = items.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(q));
    const secret = q ? typed.find((t) => t.names.includes(q)) : undefined;
    return secret ? [{ id: 'typed', label: secret.label, hint: 'answer', href: '', output: secret.output, art: secret.art, link: secret.link }, ...found] : found;
  });

  async function enterAsk() {
    mode = 'ask';
    showMore = false;
    log = [{ out: GREETING }];
    termQuery = '';
    await tick();
    termInput?.focus();
  }

  async function backToSearch() {
    mode = 'search';
    query = '';
    active = 0;
    ran = null;
    await tick();
    input?.focus();
  }

  function open() {
    mode = 'search';
    query = '';
    active = 0;
    ran = null;
    dialog?.showModal();
    input?.focus();
  }

  function close() {
    dialog?.close();
  }

  function go(item: Item) {
    if (item.action === 'ask') return void enterAsk();
    if (item.output !== undefined) {
      ran = { name: item.label, output: item.output, art: item.art, link: item.link };
      return;
    }
    close();
    if (item.external) window.open(item.href, '_blank', 'noopener,noreferrer');
    else window.location.assign(item.href);
  }

  async function say(cmd: string, out: string, art?: boolean, link?: string) {
    log = [...log, { cmd, out, art, link }];
    await tick();
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const raw = termQuery.trim();
    const q = norm(raw);
    termQuery = '';
    if (!q) return;
    if (q === 'clear') { log = []; return; }
    if (q === 'back') return void backToSearch();
    // Exact phrase first (this is how the hidden ones work), then a loose match on the words used.
    const hit = typed.find((t) => t.names.includes(q)) ?? best(raw);
    void say(raw, hit?.output ?? FALLBACK, hit?.art, hit?.link);
  }

  function onGlobalKey(e: KeyboardEvent) {
    if (dialog?.open) return;
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open();
    } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = filtered.length ? (active + 1) % filtered.length : 0;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = filtered.length ? (active - 1 + filtered.length) % filtered.length : 0;
    } else if (e.key === 'Enter') {
      const item = filtered[active];
      if (item) {
        e.preventDefault();
        go(item);
      }
    }
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === dialog) close();
  }
</script>

<svelte:window onkeydown={onGlobalKey} />

<button type="button" class="palette-button" onclick={open} aria-haspopup="dialog">
  Command palette <kbd class="kbd-hint">Ctrl+K</kbd>
</button>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-label="Command palette" onclick={onBackdrop}>
  {#if mode === 'search'}
    <input
      bind:this={input}
      bind:value={query}
      oninput={() => { active = 0; ran = null; }}
      onkeydown={onInputKey}
      type="text"
      role="combobox"
      aria-expanded="true"
      aria-controls="palette-list"
      aria-activedescendant={filtered[active] ? `palette-${filtered[active].id}` : undefined}
      aria-autocomplete="list"
      aria-label="Search pages and links"
      placeholder="Type to search…"
      autocomplete="off"
      spellcheck="false"
    />
    <ul id="palette-list" role="listbox" aria-label="Results">
      {#each filtered as item, i (item.id)}
        <li
          id={`palette-${item.id}`}
          role="option"
          aria-selected={i === active}
          class:active={i === active}
          onclick={() => go(item)}
          onmousemove={() => (active = i)}
        >
          {item.label}
          {#if item.hint}<span class="hint">{item.hint}</span>{/if}
        </li>
      {:else}
        <li class="empty" role="option" aria-selected="false" aria-disabled="true">No matches</li>
      {/each}
    </ul>
    <div class="out" class:art={ran?.art} role="status" aria-live="polite">
      {#if ran}<span class="cmd">{ran.name}</span>{ran.output}{#if ran.link}<a class="open" href={ran.link} target="_blank" rel="noopener noreferrer">Open →</a>{/if}{/if}
    </div>
    <p class="help">↑↓ to move, Enter to open, Esc to close</p>
  {:else}
    <div class="term" role="group" aria-label="Ask me something">
      <div class="bar">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="title">ask · naomei</span>
        <button type="button" class="back" onclick={backToSearch}>← Back</button>
      </div>
      <div class="log" bind:this={logEl} role="log" aria-live="polite">
        {#each log as line}
          {#if line.cmd}<p class="you"><span aria-hidden="true">&gt;</span> {line.cmd}</p>{/if}
          <p class="reply" class:art={line.art}>{line.out}{#if line.link}<a class="open" href={line.link} target="_blank" rel="noopener noreferrer">Open →</a>{/if}</p>
        {/each}
      </div>
      <form class="prompt" onsubmit={submit}>
        <label for="term-input" aria-hidden="true">&gt;</label>
        <input id="term-input" bind:this={termInput} bind:value={termQuery} type="text" aria-label="Ask a question" placeholder="Type a command, or tap a question…" autocomplete="off" spellcheck="false" />
      </form>
      <div class="chips">
        {#each ask as a (a.id)}
          <button type="button" onclick={() => say(a.label, a.output ?? '', a.art, a.link)}>{a.label}</button>
        {/each}
        {#if more.length}
          <button type="button" class="morebtn" aria-expanded={showMore} aria-controls="more-chips" onclick={() => (showMore = !showMore)}>More {showMore ? '▴' : '▾'}</button>
        {/if}
      </div>
      {#if showMore}
        <div class="chips more" id="more-chips">
          {#each more as a (a.id)}
            <button type="button" onclick={() => say(a.label, a.output ?? '', a.art, a.link)}>{a.label}</button>
          {/each}
        </div>
      {/if}
    </div>
    <p class="help">Enter to send. Type clear, or back. Esc closes.</p>
  {/if}
</dialog>

<style>
  .palette-button {
    font: 600 0.85rem var(--font-display);
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--accent);
    border-radius: 2px;
    background: var(--accent);
    color: var(--on-accent);
    cursor: pointer;
  }
  .palette-button:hover {
    background: var(--accent2);
    border-color: var(--accent2);
  }
  @media (pointer: coarse) { .kbd-hint { display: none; } }
  kbd {
    font: inherit;
    font-size: 0.85em;
    font-weight: 500;
  }
  dialog {
    width: min(34rem, calc(100vw - 2rem));
    margin: 12vh auto auto;
    padding: 0.75rem;
    border: 1px solid var(--accent);
    border-radius: 0;
    background: var(--surface);
    color: var(--fg);
    box-shadow: 0 0 40px -12px var(--accent);
  }
  dialog::backdrop {
    background: rgb(5 8 22 / 0.65);
  }
  input {
    width: 100%;
    font: inherit;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 0;
    background: var(--bg);
    color: var(--fg);
  }
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 0;
  }
  ul {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    max-height: 40vh;
    overflow: auto;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.55rem 0.75rem;
    cursor: pointer;
  }
  li.active {
    background: var(--accent);
    color: var(--on-accent);
  }
  li.empty {
    cursor: default;
    color: var(--mut);
  }
  .hint {
    font-size: 0.9em;
  }
  .out:not(:empty) {
    margin-top: 0.5rem;
    padding: 0.6rem 0.75rem;
    border: 1px dashed var(--line);
    font-size: 0.95rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }
  .cmd {
    display: block;
    color: var(--accent);
    font-weight: 600;
  }
  .help {
    margin: 0.5rem 0 0;
    color: var(--mut);
    font-size: 0.85rem;
  }
  .art {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    line-height: 1.25;
  }

  /* the opt-in terminal window */
  .term {
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    border: 1px solid var(--line);
    background: var(--bg);
    font-family: var(--mono);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid var(--line);
    font-size: 0.8rem;
    color: var(--mut);
  }
  .dots { display: inline-flex; gap: 5px; }
  .dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--mut); opacity: 0.5; }
  .title { flex: 1; }
  .back {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .back:hover { border-color: var(--accent); }
  .log {
    max-height: 17rem;
    min-height: 7rem;
    overflow: auto;
    padding: 0.75rem;
    font-size: 0.9rem;
    line-height: 1.55;
  }
  .log p { margin: 0 0 0.6rem; white-space: pre-wrap; }
  .you { color: var(--accent); }
  .reply { color: var(--fg); }
  .prompt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0.75rem 0.75rem;
    padding: 0.35rem 0.5rem;
    border-top: 1px solid var(--line);
  }
  .prompt:focus-within { outline: 2px solid var(--accent); outline-offset: 0; }
  .prompt label { color: var(--accent); font-weight: 700; font-size: 1rem; }
  .prompt input {
    flex: 1;
    min-width: 0;
    font-family: var(--mono);
    font-size: 0.95rem;
    padding: 0.2rem 0;
    border: 0;
    background: transparent;
    color: var(--fg);
    caret-color: var(--accent);
    caret-shape: block; /* where supported; otherwise the normal blinking caret */
  }
  .prompt input:focus-visible { outline: none; }
  .prompt input::placeholder { color: var(--mut); }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0 0.75rem 0.75rem;
  }
  .chips button {
    font: 500 0.8rem var(--font-body);
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
  }
  .chips button:hover { border-color: var(--accent); }
  .chips .morebtn { border-style: dashed; color: var(--accent); }
  .chips.more { padding-top: 0; border-top: 1px dashed var(--line); margin: 0 0.75rem; padding-inline: 0; padding-top: 0.6rem; padding-bottom: 0.75rem; }
  .open { display: inline-block; margin-left: 0.6rem; color: var(--accent); }
</style>
