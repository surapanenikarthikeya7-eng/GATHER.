import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL;

test('API health endpoint', { skip: !base }, async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { status: 'ok' } });
});
