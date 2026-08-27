import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_BYTES = 14563;
const EXPECTED_SHA256 = '0bfad60513e7d23025d7c2a14e487237c62bfb9ec6a5fde2830e0d441d32993d';

const encoded = readFileSync('assets/onze-icon.b64', 'utf8').trim();
const icon = Buffer.from(encoded, 'base64');
const sha256 = createHash('sha256').update(icon).digest('hex');

if (icon.length !== EXPECTED_BYTES || sha256 !== EXPECTED_SHA256) {
  throw new Error(
    `Approved Onze icon failed integrity check: bytes=${icon.length}, sha256=${sha256}`,
  );
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/icon.png', icon);
writeFileSync('assets/adaptive-icon.png', icon);
console.log(`Approved Onze icon ready: ${icon.length} bytes, sha256=${sha256}`);
