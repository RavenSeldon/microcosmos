import { defineConfig } from 'vite';
// One page: the game. `base: './'` keeps every asset path relative, so the build works under any
// hosting path (for example /microcosmos/) without a rebuild.
export default defineConfig({ root: 'web3d', base: './', build: { outDir: '../dist', emptyOutDir: true, target: 'es2020' } });
