/**
 * Resolve a file in /public against the deployment base path.
 *
 * Vite rewrites asset URLs it can see (imports, index.html), but a string like
 * "/img/hero.jpg" written inside a component is opaque to it. The app is served
 * from the domain root, so BASE_URL is "/" and this is a pass-through. It stays
 * because it makes a move to a sub-path host a one-line config change rather
 * than a hunt for hard-coded paths.
 */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
