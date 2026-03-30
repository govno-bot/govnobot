// src/ai/wikipedia.js
// Zero-dependency Wikipedia summary fetcher for GovnoBot
// Uses only built-in Node.js modules (https, url)

const https = require('https');
const { URL } = require('url');

// Simple in-memory cache and rate limiter (zero-dependency)
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_REQUESTS_PER_MIN = 60; // default rate limit per host

const _cache = new Map(); // key -> { value, expires }
let _cacheTtl = DEFAULT_TTL_MS;

// Rate limiter per host using token-bucket algorithm
const _rateLimitConfig = {
    requestsPerMinute: DEFAULT_REQUESTS_PER_MIN
};
const _buckets = new Map(); // host -> { tokens, lastRefill }

function _makeCacheKey(kind, lang, parts) {
    return kind + ':' + String(lang || 'en') + ':' + parts.map(p => String(p)).join(':');
}

function clearWikipediaCache() {
    _cache.clear();
}

function configureWikipedia(options = {}) {
    if (options.ttlMs && Number.isFinite(options.ttlMs)) _cacheTtl = Number(options.ttlMs);
    if (options.requestsPerMinute && Number.isFinite(options.requestsPerMinute)) _rateLimitConfig.requestsPerMinute = Number(options.requestsPerMinute);
}

function getWikipediaCacheStats() {
    const now = Date.now();
    let size = 0;
    for (const [k, v] of _cache.entries()) {
        if (v && v.expires > now) size++;
    }
    return { entries: size };
}

function _refillBucket(host) {
    const cfg = _rateLimitConfig;
    const now = Date.now();
    const capacity = cfg.requestsPerMinute;
    const bucket = _buckets.get(host) || { tokens: capacity, lastRefill: now };
    const elapsed = Math.max(0, now - bucket.lastRefill);
    const refillRatePerMs = capacity / 60000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs);
    bucket.lastRefill = now;
    _buckets.set(host, bucket);
    return bucket;
}

function _consumeToken(host) {
    const bucket = _refillBucket(host);
    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
    }
    return false;
}

/**
 * Fetches the summary of a Wikipedia article for a given query.
 * @param {string} query - The search term.
 * @returns {Promise<{title: string, extract: string, url: string}|null>} Summary object or null if not found.
 */
function fetchWikipediaSummary(query, lang = 'en') {
    return new Promise((resolve, reject) => {
        if (!query || typeof query !== 'string') return resolve(null);
        // Normalize language code
        const lc = (typeof lang === 'string' && lang.trim()) ? String(lang).toLowerCase() : 'en';
        const host = `${lc}.wikipedia.org`;
        const apiUrl = new URL(`https://${host}/api/rest_v1/page/summary/` + encodeURIComponent(query.replace(/ /g, '_')));

        // Cache lookup
        const cacheKey = _makeCacheKey('summary', lc, [query]);
        const now = Date.now();
        const existing = _cache.get(cacheKey);
        if (existing && existing.expires > now) return resolve(existing.value);

        // Rate limit check: if token not available, return null to avoid blocking
        if (!_consumeToken(host)) return resolve(null);
        const req = https.get(apiUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 404) return resolve(null);
                    const json = JSON.parse(data);
                    if (json.type === 'disambiguation' || !json.extract) return resolve(null);
                    resolve({
                        title: json.title,
                        extract: json.extract,
                        url: json.content_urls?.desktop?.page || `https://${host}/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`
                    });
                    // store in cache
                    try {
                        _cache.set(cacheKey, { value: { title: json.title, extract: json.extract, url: json.content_urls?.desktop?.page || `https://${host}/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}` }, expires: Date.now() + _cacheTtl });
                    } catch (e) {}
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

/**
 * Fetch a specific section of a Wikipedia article by section title.
 * Returns null if not found.
 * @param {string} query
 * @param {string} sectionTitle
 * @param {string} lang
 */
function fetchWikipediaSection(query, sectionTitle, lang = 'en') {
    return new Promise((resolve) => {
        if (!query || typeof query !== 'string' || !sectionTitle || typeof sectionTitle !== 'string') return resolve(null);
        const lc = (typeof lang === 'string' && lang.trim()) ? String(lang).toLowerCase() : 'en';
        const host = `${lc}.wikipedia.org`;
        const page = encodeURIComponent(query.replace(/ /g, '_'));

        // Cache lookup
        const cacheKey = _makeCacheKey('section', lc, [query, sectionTitle]);
        const now = Date.now();
        const existing = _cache.get(cacheKey);
        if (existing && existing.expires > now) return resolve(existing.value);

        // Rate limit check for sections (two requests may be needed, still count once per function call)
        if (!_consumeToken(host)) return resolve(null);

        // First: get sections list to map title -> index
        const sectionsUrl = `https://${host}/w/api.php?action=parse&page=${page}&prop=sections&format=json`;
        https.get(sectionsUrl, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const secs = json && json.parse && Array.isArray(json.parse.sections) ? json.parse.sections : [];
                    const normalized = String(sectionTitle).trim().toLowerCase();
                    let foundIndex = null;
                    for (const s of secs) {
                        if (s && s.line && String(s.line).trim().toLowerCase() === normalized) {
                            foundIndex = s.index;
                            break;
                        }
                    }
                    // If not found by exact match, try anchor match
                    if (!foundIndex) {
                        for (const s of secs) {
                            if (s && s.anchor && String(s.anchor).trim().toLowerCase() === normalized) {
                                foundIndex = s.index;
                                break;
                            }
                        }
                    }

                    if (!foundIndex) return resolve(null);

                    // Fetch the section HTML
                    const sectionUrl = `https://${host}/w/api.php?action=parse&page=${page}&prop=text&section=${foundIndex}&format=json`;
                    https.get(sectionUrl, (r2) => {
                        let d2 = '';
                        r2.on('data', c2 => d2 += c2);
                        r2.on('end', () => {
                            try {
                                const j2 = JSON.parse(d2);
                                const html = j2 && j2.parse && j2.parse.text && j2.parse.text['*'] ? j2.parse.text['*'] : null;
                                if (!html) return resolve(null);
                                // Very simple HTML-to-text: strip tags and collapse whitespace
                                let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
                                text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
                                text = text.replace(/<[^>]+>/g, '');
                                text = text.replace(/\s+/g, ' ').trim();
                                const sectionAnchor = encodeURIComponent(String(sectionTitle).replace(/ /g, '_'));
                                const url = `https://${host}/wiki/${page}#${sectionAnchor}`;
                                const out = { title: (j2.parse && j2.parse.title) || query, sectionTitle: sectionTitle, extract: text, url };
                                try { _cache.set(cacheKey, { value: out, expires: Date.now() + _cacheTtl }); } catch (e) {}
                                return resolve(out);
                            } catch (e) {
                                return resolve(null);
                            }
                        });
                    }).on('error', () => resolve(null));
                } catch (e) {
                    return resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

/**
 * Search Wikipedia for a query and return top result title (or null)
 * Uses the MediaWiki search API.
 */
function searchWikipedia(query, lang = 'en') {
    return new Promise((resolve) => {
        if (!query || typeof query !== 'string') return resolve(null);
        const lc = (typeof lang === 'string' && lang.trim()) ? String(lang).toLowerCase() : 'en';
        const host = `${lc}.wikipedia.org`;
        const urlStr = `https://${host}/w/api.php?action=query&list=search&srsearch=` + encodeURIComponent(query) + '&format=json&utf8=1&origin=*';
        https.get(urlStr, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const hits = json && json.query && Array.isArray(json.query.search) ? json.query.search : [];
                    if (hits.length === 0) return resolve(null);
                    return resolve(hits[0].title || null);
                } catch (e) {
                    return resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

/**
 * Fetch disambiguation options for a given title.
 * Returns array of { title, url } or empty array on failure.
 */
function fetchWikipediaDisambiguation(query, lang = 'en') {
    return new Promise((resolve) => {
        if (!query || typeof query !== 'string') return resolve([]);
        const lc = (typeof lang === 'string' && lang.trim()) ? String(lang).toLowerCase() : 'en';
        const host = `${lc}.wikipedia.org`;
        const page = encodeURIComponent(query.replace(/ /g, '_'));
        const urlStr = `https://${host}/w/api.php?action=parse&page=${page}&prop=links&format=json`;
        https.get(urlStr, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const links = json && json.parse && Array.isArray(json.parse.links) ? json.parse.links : [];
                    const out = [];
                    for (const l of links) {
                        // Only include main namespace links (ns === 0) and skip meta
                        if (l && (l.ns === 0 || l.ns === '0') && l['*']) {
                            const title = String(l['*']);
                            const url = `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
                            out.push({ title, url });
                            if (out.length >= 12) break; // limit
                        }
                    }
                    return resolve(out);
                } catch (e) {
                    return resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
}

module.exports = {
    fetchWikipediaSummary,
    searchWikipedia,
    fetchWikipediaSection,
    fetchWikipediaDisambiguation,
    clearWikipediaCache,
    configureWikipedia,
    getWikipediaCacheStats
};