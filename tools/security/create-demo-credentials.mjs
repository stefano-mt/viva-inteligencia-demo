import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const username = process.argv[2] || 'viva-demo';
if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
  throw new Error('El usuario debe tener entre 3 y 32 caracteres alfanuméricos, _ o -.');
}

const output = resolve('infra/docker/.htpasswd.local');
const password = randomBytes(32).toString('base64url');
const salt = randomBytes(16);
const digest = createHash('sha1')
  .update(Buffer.concat([Buffer.from(password, 'utf8'), salt]))
  .digest();
const hash = `{SSHA}${Buffer.concat([digest, salt]).toString('base64')}`;

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${username}:${hash}\n`, { flag: 'wx', mode: 0o600 });
console.log(`Usuario: ${username}`);
console.log(`Contraseña (se muestra una sola vez): ${password}`);
console.log(`Archivo local: ${output}`);
console.log('Configure VIVA_BASIC_AUTH_FILE=./infra/docker/.htpasswd.local en .env o en el entorno.');
