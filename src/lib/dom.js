// Small DOM helpers shared by all features.

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, value);
  }
  return node;
}

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(pointer: fine)').matches;

// Run one feature; if it fails, log it and keep the rest of the page working
export function safe(fn, ...args) {
  try {
    return fn(...args);
  } catch (err) {
    console.error('[schrankgold]', fn.name, err);
    return undefined;
  }
}

// Give the browser a chance to paint and handle input between bigger chunks of work
export const breathe = () => new Promise(resolve => setTimeout(resolve, 0));
