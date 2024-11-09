import * as esbuild from 'esbuild'
import * as fs from 'fs';
import * as path from 'path';

const wasmInlinePlugin = {
    name: 'wasm-inline',
    setup(build) {
        build.onResolve({ filter: /tree-sitter\.wasm$/ }, args => {
            return {
                path: path.resolve("./node_modules/web-tree-sitter/tree-sitter.wasm"),
                namespace: 'wasm-inline',
            };
        });
        build.onResolve({ filter: /tree-sitter-grammar\.wasm$/ }, args => {
            return {
                path: path.resolve("./build/tree-sitter-http.wasm"),
                namespace: 'wasm-inline',
            };
        });

        build.onLoad({ filter: /.*/, namespace: 'wasm-inline' }, async args => {
            const wasmBuffer = await fs.promises.readFile(args.path);
            const base64 = wasmBuffer.toString('base64');
            const contents = `
          // Inlined WASM module
          const wasmCode = '${base64}';
          const wasmBytes = Uint8Array.from(atob(wasmCode), c => c.charCodeAt(0));
          export default wasmBytes;
        `;
            return {
                contents,
                loader: 'js',
                resolveDir: path.dirname(args.path),
            };
        });
    },
};

const cjs_compat_fix = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`

await esbuild.build({
    entryPoints: ['build/index.js'],
    bundle: true,
    outfile: 'build/bundle.js',
    format: 'esm',
    external: ['node:fs/promises', 'fs', 'path'],
    plugins: [wasmInlinePlugin]
})
await esbuild.build({
    entryPoints: ['build/index.js'],
    bundle: true,
    outfile: 'build/bundle_node.js',
    format: 'esm',
    platform: 'node',
    banner: {
      js: cjs_compat_fix,
    },
    plugins: [wasmInlinePlugin]
})
