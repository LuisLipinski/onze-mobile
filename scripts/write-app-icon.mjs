import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_BYTES = 5736;
const EXPECTED_SHA256 = '3ce8fd4ffbc6801ee3a91beb6a2c34c6b146b339d434f3380d58fd3c196aa158';

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

const football = Buffer.from(readFileSync('assets/football.b64', 'utf8').trim(), 'base64');
const footballHash = createHash('sha256').update(football).digest('hex');
if (footballHash !== '264cadf1950754e3f4329d089c9d843513475a8d5549cebbb6c0e388047905e4') {
  throw new Error('Opening football asset failed integrity check');
}
writeFileSync('assets/football.png', football);
