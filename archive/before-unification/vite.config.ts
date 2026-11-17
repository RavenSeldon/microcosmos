import { defineConfig } from 'vite';
// The 3D world. `base: './'` keeps every asset path relative, so the build works under any
// hosting path (for example /dark-microcosmos/) without a rebuild.
export default defineConfig({ root: 'web3d', base: './', build: { outDir: '../dist3d', emptyOutDir: true, target: 'es2020',
  rollupOptions: { input: { garden: new URL('./web3d/index.html', import.meta.url).pathname, challenge: new URL('./web3d/challenge.html', import.meta.url).pathname } },
} });
