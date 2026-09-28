import assert from 'node:assert/strict';
import { createHash, timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');

test('Nginx protege web, assets y API; solo health/live es público', async () => {
  const nginx = await readFile(join(root, 'infra/docker/nginx.conf'), 'utf8');
  const compose = await readFile(join(root, 'compose.yml'), 'utf8');
  assert.match(nginx, /^  auth_basic "Viva Inteligencia Comercial";$/m);
  assert.match(nginx, /^  auth_basic_user_file \/run\/secrets\/viva_basic_auth;$/m);
  assert.equal((nginx.match(/auth_basic off;/g) || []).length, 1);
  assert.match(nginx, /location = \/health\/live \{\s+auth_basic off;/);
  assert.match(compose, /127\.0\.0\.1:\$\{WEB_PORT:-8080\}:8080/);
  assert.match(compose, /file: \$\{VIVA_BASIC_AUTH_FILE:-\.\/infra\/docker\/deny-all\.htpasswd\}/);
});

test('el generador crea una contraseña aleatoria y no reemplaza el archivo', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'viva-auth-test-'));
  const script = join(root, 'tools/security/create-demo-credentials.mjs');
  try {
    const output = execFileSync(process.execPath, [script, 'viva-demo'], {
      cwd: temporary,
      encoding: 'utf8',
    });
    const password = output.match(/Contraseña \(se muestra una sola vez\): (\S+)/)?.[1];
    assert.ok(password && password.length >= 40);
    const file = await readFile(join(temporary, 'infra/docker/.htpasswd.local'), 'utf8');
    assert.ok(!file.includes(password));
    const [username, stored] = file.trim().split(':');
    assert.equal(username, 'viva-demo');
    assert.ok(stored.startsWith('{SSHA}'));
    const bytes = Buffer.from(stored.slice(6), 'base64');
    const digest = createHash('sha1')
      .update(Buffer.concat([Buffer.from(password), bytes.subarray(20)]))
      .digest();
    assert.ok(timingSafeEqual(digest, bytes.subarray(0, 20)));
    assert.throws(() => execFileSync(process.execPath, [script, 'viva-demo'], {
      cwd: temporary,
      stdio: 'ignore',
    }));
  } finally {
    await unlink(join(temporary, 'infra/docker/.htpasswd.local'));
    await rmdir(join(temporary, 'infra/docker'));
    await rmdir(join(temporary, 'infra'));
    await rmdir(temporary);
  }
});
