
// vite.config.js
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [],
    build: {
        outDir: 'client/dist',
        sourcemap: true, // Generate source maps for debugging
        lib: {
            entry: 'client/src/main.js',
            name: 'SilverstripeTiptap',
            fileName: 'silverstripe-tiptap',
            formats: ['iife'] // Immediately Invoked Function Expression for browser
        },
        rollupOptions: {
            output: {
                // Bundle everything into a single file
                inlineDynamicImports: true,
                // Make it available globally as window.SilverstripeTiptap
                globals: {
                    'SilverstripeTiptap': 'SilverstripeTiptap'
                }
            }
        },
        // Don't minify for easier debugging (optional)
        minify: false
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./client/src', import.meta.url)),
        }
    }
});