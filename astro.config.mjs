import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Project-page URL for nao-mei/hello-world. Revisit if the repo is renamed or a custom domain is added.
export default defineConfig({
  site: 'https://nao-mei.github.io',
  base: '/hello-world',
  output: 'static',
  integrations: [svelte()],
});
