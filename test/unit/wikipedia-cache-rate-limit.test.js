const assert = require('assert');
const https = require('https');

async function runTests() {
  console.log('LOADING WIKIPEDIA CACHE & RATE LIMIT TEST');

  const wiki = require('../../src/ai/wikipedia');

  // Save original
  const origGet = https.get;
  let callCount = 0;

  // Stub https.get to simulate Wikipedia API responses based on URL
  https.get = function (url, cb) {
    callCount++;
    // extract path
    const urlStr = (typeof url === 'string') ? url : (url && url.href) ? url.href : '';
    // determine which summary was requested
    let simulated = null;
    try {
      if (urlStr.includes('/api/rest_v1/page/summary/')) {
        const parts = urlStr.split('/api/rest_v1/page/summary/');
        const q = decodeURIComponent(parts[1] || '').replace(/_/g, ' ');
        simulated = JSON.stringify({ title: q, extract: `${q} extract`, content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/${encodeURIComponent(q.replace(/ /g,'_'))}` } } });
      } else if (urlStr.includes('action=parse') && urlStr.includes('prop=sections')) {
        // return a small sections list for any article
        simulated = JSON.stringify({ parse: { sections: [ { index: 1, line: 'History', anchor: 'History' } ], title: 'Test' } });
      } else if (urlStr.includes('prop=text')) {
        simulated = JSON.stringify({ parse: { text: { '*': '<p>Section content</p>' }, title: 'Test' } });
      } else {
        simulated = JSON.stringify({ query: { search: [] } });
      }
    } catch (e) {
      simulated = JSON.stringify({});
    }

    const res = {
      statusCode: 200,
      on: function (ev, fn) {
        if (ev === 'data') {
          // immediate call with data
          fn(simulated);
        }
        if (ev === 'end') {
          // call end next tick
          process.nextTick(fn);
        }
      }
    };
    // call callback synchronously as https.get would
    try { cb(res); } catch (e) {}
    return { on: () => {}, end: () => {} };
  };

  // Test caching: small TTL and clear
  wiki.configureWikipedia({ ttlMs: 60000, requestsPerMinute: 1000 });
  wiki.clearWikipediaCache();
  callCount = 0;
  const a1 = await wiki.fetchWikipediaSummary('Foo');
  assert(a1 && a1.title === 'Foo');
  assert.strictEqual(callCount, 1, 'one network call expected');

  // second call same query should be served from cache -> no extra https.get
  const a2 = await wiki.fetchWikipediaSummary('Foo');
  assert(a2 && a2.title === 'Foo');
  assert.strictEqual(callCount, 1, 'cached result should not trigger network call');

  // Test rate limiting: set low RPM and ensure extra calls are rejected
  wiki.clearWikipediaCache();
  wiki.configureWikipedia({ ttlMs: 0, requestsPerMinute: 2 }); // allow 2 per minute
  callCount = 0;
  const r1 = await wiki.fetchWikipediaSummary('A');
  const r2 = await wiki.fetchWikipediaSummary('B');
  const r3 = await wiki.fetchWikipediaSummary('C');
  // We allowed 2 tokens, so third should be rate-limited (null)
  assert(r1 && r2);
  assert.strictEqual(r3, null);
  // Only two network calls should have been made because the third was blocked by the rate limiter
  assert.strictEqual(callCount, 2, 'two network calls should have been made (third was rate-limited)');

  // Restore https.get
  https.get = origGet;

  console.log('  ✓ test/unit/wikipedia-cache-rate-limit.test.js');
}

module.exports = { run: runTests };
