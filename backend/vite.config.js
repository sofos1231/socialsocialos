"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
exports.default = (0, vite_1.defineConfig)({
    root: 'dashboards_bundle',
    server: {
        port: 5173,
        strictPort: true,
        open: false,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    },
    build: {
        outDir: '../dist-dashboards',
        emptyOutDir: true,
    },
});
//# sourceMappingURL=vite.config.js.map