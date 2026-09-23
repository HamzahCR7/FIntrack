import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiOrigin } from './config.ts';

test('uses configured api url when provided', () => {
  assert.equal(resolveApiOrigin({ env: { VITE_API_URL: 'https://example.com/api' } }), 'https://example.com/api');
});

test('falls back to the hosted production API for native builds', () => {
  assert.equal(
    resolveApiOrigin({
      env: {},
      location: { origin: 'capacitor://localhost', protocol: 'capacitor:' },
    }),
    'https://fintrack-9in0.onrender.com'
  );
});

test('keeps the hosted backend for Capacitor webviews reporting localhost', () => {
  assert.equal(
    resolveApiOrigin({
      env: {},
      location: { origin: 'https://localhost', protocol: 'https:', hostname: 'localhost' },
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
    }),
    'https://fintrack-9in0.onrender.com'
  );
});
