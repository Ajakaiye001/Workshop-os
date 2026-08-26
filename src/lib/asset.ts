/**
 * Resolve a file in /public against the deployment base path.
 *
 * Vite rewrites asset URLs it can see (imports, index.html), but a string
 * like "/img/hero.jpg" written inside a component is opaque to it. On GitHub
 * Pages the site is served from /Workshop-os/, so those would 404 without
 * this. BASE_URL is "/" in dev and always ends with a slash.
 */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
