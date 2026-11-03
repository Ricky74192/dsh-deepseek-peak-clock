/**
 * Host half of the DeepSeek peak/valley clock bundle.
 *
 * The clock is pure presentation: it derives its state from the browser clock,
 * so nothing here needs a Host capability. This file exists so the Loader row
 * has an entry to activate; ./client.js owns the rendering inside the
 * conversation composer dock.
 */
export function apply() {}
