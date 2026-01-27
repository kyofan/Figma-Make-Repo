import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Mock the figma:react import for local browser preview
            'figma:react': path.resolve(__dirname, './figma-mock.ts'),
        },
    },
});
