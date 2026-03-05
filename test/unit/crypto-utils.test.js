// test/unit/crypto-utils.test.js
// TDD/BDD: Unit tests for src/security/crypto-utils.js (no external deps)
const cryptoUtils = require('../../src/security/crypto-utils');

module.exports.run = async function(runner) {
  // randomBytes
  let buf = cryptoUtils.randomBytes(16);
  runner.assert(Buffer.isBuffer(buf), 'randomBytes returns a buffer');
  runner.assertEqual(buf.length, 16, 'randomBytes returns correct length');
  await runner.assertThrows(() => cryptoUtils.randomBytes(0), Error, 'randomBytes throws on size 0');
  await runner.assertThrows(() => cryptoUtils.randomBytes(-1), Error, 'randomBytes throws on negative size');
  await runner.assertThrows(() => cryptoUtils.randomBytes('a'), Error, 'randomBytes throws on non-number');

  // sha256
  let hash = cryptoUtils.sha256('abc');
  runner.assert(Buffer.isBuffer(hash), 'sha256 returns a buffer');
  runner.assertEqual(hash.length, 32, 'sha256 returns 32 bytes');
  runner.assertEqual(hash.toString('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 hash matches');
  hash = cryptoUtils.sha256(Buffer.from('abc'));
  runner.assertEqual(hash.toString('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 hash matches buffer');

  // hmacSha256
  const key = 'secret';
  const data = 'message';
  const hmac = cryptoUtils.hmacSha256(key, data);
  runner.assert(Buffer.isBuffer(hmac), 'hmacSha256 returns a buffer');
  runner.assertEqual(hmac.length, 32, 'hmacSha256 returns 32 bytes');
  // Not checking hex value, as it may differ

  // base64Encode/base64Decode
  const str = 'hello world';
  const b64 = cryptoUtils.base64Encode(str);
  runner.assertEqual(b64, 'aGVsbG8gd29ybGQ=', 'base64Encode encodes string');
  const buf2 = cryptoUtils.base64Decode(b64);
  runner.assertEqual(buf2.toString('utf8'), str, 'base64Decode decodes string');
  const buf3 = Buffer.from([1,2,3,4]);
  const b64b = cryptoUtils.base64Encode(buf3);
  runner.assertEqual(b64b, 'AQIDBA==', 'base64Encode encodes buffer');
  const out = cryptoUtils.base64Decode(b64b);
  runner.assert(out.equals(buf3), 'base64Decode decodes buffer');

  // timingSafeEqual
  const a = Buffer.from('abc');
  const b = Buffer.from('abc');
  runner.assert(cryptoUtils.timingSafeEqual(a, b), 'timingSafeEqual true for equal buffers');
  const c = Buffer.from('abd');
  runner.assert(!cryptoUtils.timingSafeEqual(a, c), 'timingSafeEqual false for different buffers');
  await runner.assertThrows(() => cryptoUtils.timingSafeEqual('abc', 'abc'), Error, 'timingSafeEqual throws if not buffers');
  const d = Buffer.from('abcd');
  runner.assert(!cryptoUtils.timingSafeEqual(a, d), 'timingSafeEqual false if lengths differ');
}
