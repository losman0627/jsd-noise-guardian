(() => {
  'use strict';

  const GAS_HOST = 'script.google.com';
  const GAS_PATH_PREFIX = '/macros/s/';
  const PROXY_PATH = '/api/backend';
  let enabled = false;

  function isAppsScriptUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.hostname === GAS_HOST &&
        url.pathname.startsWith(GAS_PATH_PREFIX) &&
        url.pathname.endsWith('/exec');
    } catch (_) {
      return false;
    }
  }

  function toProxyUrl(value) {
    const source = new URL(String(value), location.href);
    const target = new URL(PROXY_PATH, location.origin);
    for (const [key, val] of source.searchParams.entries()) {
      target.searchParams.append(key, val);
    }
    target.searchParams.set('_ts', String(Date.now()));
    return target.toString();
  }

  async function probeProxy() {
    const callback = `jsd_bridge_probe_${Date.now()}`;
    const url = new URL(PROXY_PATH, location.origin);
    url.searchParams.set('action', 'health');
    url.searchParams.set('callback', callback);
    url.searchParams.set('_ts', String(Date.now()));

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const text = await response.text();
      const contentType = response.headers.get('content-type') || '';
      enabled = response.ok &&
        /javascript|text\/plain/i.test(contentType) &&
        text.trim().startsWith(`${callback}(`) &&
        /["']?ok["']?\s*:\s*true/.test(text);
    } catch (_) {
      enabled = false;
    }
    return enabled;
  }

  const originalAppendChild = Node.prototype.appendChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  function rewriteScript(node) {
    if (!enabled || !(node instanceof HTMLScriptElement)) return node;
    const original = node.src;
    if (!isAppsScriptUrl(original)) return node;
    node.dataset.jsdOriginalBackend = original;
    node.src = toProxyUrl(original);
    return node;
  }

  Node.prototype.appendChild = function patchedAppendChild(node) {
    return originalAppendChild.call(this, rewriteScript(node));
  };

  Node.prototype.insertBefore = function patchedInsertBefore(node, referenceNode) {
    return originalInsertBefore.call(this, rewriteScript(node), referenceNode);
  };

  window.JSDBackendBridge = {
    ready: probeProxy(),
    isEnabled: () => enabled,
    proxyPath: PROXY_PATH
  };
})();
