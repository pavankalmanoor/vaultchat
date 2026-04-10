// Empty shim for onnxruntime-node in browser/worker contexts.
// @xenova/transformers imports this package but the browser field in its
// package.json is supposed to replace it with false. Vite does not apply
// the browser field when building Web Workers, so we alias it here instead.
export default {};
