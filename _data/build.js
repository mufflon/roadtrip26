// Build timestamp. Used to version the service-worker cache so every deploy
// replaces the previous offline cache and the app is never served stale — the
// mitigation for the reason a service worker was originally out of scope.
export default { time: new Date().toISOString().replace(/[:.]/g, "-") };
