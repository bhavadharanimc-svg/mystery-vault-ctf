/**
 * Mystery Vault CTF — Load Test
 * Simulates 60 concurrent users: register → fetch challenges → submit flags
 * Run: node loadtest.js [BASE_URL]
 * Example: node loadtest.js http://localhost:5000
 *          node loadtest.js https://mystery-vault-ctf.onrender.com
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const TOTAL_USERS = 60;
const TEST_PIN = '9999';

// ─── Colours for terminal output ────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', white: '\x1b[37m', bold: '\x1b[1m',
};
const log = (color, ...args) => console.log(color + args.join(' ') + C.reset);

// ─── HTTP helper (no external deps) ─────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    };
    const start = Date.now();
    const req = lib.request({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method, headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ms = Date.now() - start;
        try { resolve({ status: res.statusCode, data: JSON.parse(data), ms }); }
        catch { resolve({ status: res.statusCode, data, ms }); }
      });
    });
    req.on('error', err => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Stats tracker ───────────────────────────────────────────────────────────
const stats = {
  register:   { ok: 0, fail: 0, times: [] },
  challenges: { ok: 0, fail: 0, times: [] },
  submit:     { ok: 0, fail: 0, times: [] },
};

function record(bucket, success, ms) {
  stats[bucket][success ? 'ok' : 'fail']++;
  stats[bucket].times.push(ms);
}

function avg(arr) { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; }
function p95(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}
function max(arr) { return arr.length ? Math.max(...arr) : 0; }

// ─── Single virtual user flow ────────────────────────────────────────────────
async function runUser(userId) {
  const teamName = `LoadTest_User_${userId}_${Date.now()}`;
  let token = null;

  // 1. Register
  try {
    const r = await request('POST', '/api/auth/register', { name: teamName, pin: TEST_PIN });
    if (r.status === 201 && r.data.token) {
      token = r.data.token;
      record('register', true, r.ms);
    } else {
      record('register', false, r.ms);
      return { userId, success: false, error: `Register failed: ${r.status}` };
    }
  } catch (e) {
    record('register', false, 0);
    return { userId, success: false, error: `Register error: ${e.message}` };
  }

  // 2. Fetch challenges
  let challenges = [];
  try {
    const r = await request('GET', '/api/challenges', null, token);
    if (r.status === 200 && Array.isArray(r.data.challenges)) {
      challenges = r.data.challenges;
      record('challenges', true, r.ms);
    } else {
      record('challenges', false, r.ms);
    }
  } catch (e) {
    record('challenges', false, 0);
  }

  // 3. Submit the first challenge flag (correct)
  if (challenges.length > 0) {
    const ch = challenges[0];
    // We know flag from the seeded data; submit a wrong one to avoid first-blood skew
    try {
      const r = await request('POST', `/api/challenges/${ch.id}/submit`, { flag: 'CTF{wrong_flag_test}' }, token);
      record('submit', r.status === 200, r.ms);
    } catch (e) {
      record('submit', false, 0);
    }
  }

  return { userId, success: true, team: teamName };
}

// ─── Cleanup test users ───────────────────────────────────────────────────────
async function cleanup() {
  // Login as admin and delete LoadTest_ users
  try {
    const r = await request('POST', '/api/auth/admin', { name: 'admin', pin: 'admin' });
    if (!r.data.token) return;
    const token = r.data.token;
    const teamsRes = await request('GET', '/api/admin/teams', null, token);
    if (!Array.isArray(teamsRes.data)) return;
    const testTeams = teamsRes.data.filter(t => t.name.startsWith('LoadTest_'));
    let deleted = 0;
    for (const t of testTeams) {
      const dr = await request('DELETE', `/api/admin/teams/${t.id}`, null, token);
      if (dr.status === 200) deleted++;
    }
    log(C.cyan, `\n🧹 Cleanup: deleted ${deleted} test teams`);
  } catch (e) {
    log(C.yellow, `⚠️  Cleanup skipped (${e.message})`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log(C.bold + C.cyan, `\n${'═'.repeat(55)}`);
  log(C.bold + C.cyan, `  Mystery Vault CTF — Load Test`);
  log(C.bold + C.cyan, `${'═'.repeat(55)}`);
  log(C.white, `  Target  : ${BASE_URL}`);
  log(C.white, `  Users   : ${TOTAL_USERS} concurrent`);
  log(C.white, `  Flow    : Register → Fetch Challenges → Submit Flag`);
  log(C.bold + C.cyan, `${'═'.repeat(55)}\n`);

  // Health check first
  try {
    const health = await request('GET', '/api/health');
    if (health.status !== 200) throw new Error(`Status ${health.status}`);
    log(C.green, `✅ Server is up — starting load test...\n`);
  } catch (e) {
    log(C.red, `❌ Server not reachable at ${BASE_URL}`);
    log(C.red, `   Make sure the server is running first.\n`);
    process.exit(1);
  }

  const startTime = Date.now();

  // Fire all users concurrently
  process.stdout.write(`  Running ${TOTAL_USERS} users `);
  const progressInterval = setInterval(() => process.stdout.write('.'), 500);

  const results = await Promise.all(
    Array.from({ length: TOTAL_USERS }, (_, i) => runUser(i + 1))
  );

  clearInterval(progressInterval);
  const totalMs = Date.now() - startTime;
  console.log(` done!\n`);

  const failed = results.filter(r => !r.success);

  // ─── Print Report ────────────────────────────────────────────────────────
  log(C.bold + C.cyan, `${'═'.repeat(55)}`);
  log(C.bold + C.cyan, `  RESULTS`);
  log(C.bold + C.cyan, `${'═'.repeat(55)}`);
  log(C.white, `  Total duration    : ${(totalMs / 1000).toFixed(2)}s`);
  log(C.white, `  Concurrent users  : ${TOTAL_USERS}`);
  log(C.white, ``);

  const table = [
    ['Action', 'Success', 'Failed', 'Avg (ms)', 'p95 (ms)', 'Max (ms)'],
    ['─'.repeat(12), '─'.repeat(9), '─'.repeat(8), '─'.repeat(10), '─'.repeat(10), '─'.repeat(10)],
    ...Object.entries(stats).map(([name, s]) => [
      name.padEnd(12),
      String(s.ok).padEnd(9),
      String(s.fail).padEnd(8),
      String(avg(s.times)).padEnd(10),
      String(p95(s.times)).padEnd(10),
      String(max(s.times)).padEnd(10),
    ]),
  ];
  table.forEach(row => log(C.white, '  ' + row.join('  ')));

  log(C.white, ``);
  const successRate = Math.round((results.filter(r => r.success).length / TOTAL_USERS) * 100);
  const color = successRate >= 95 ? C.green : successRate >= 80 ? C.yellow : C.red;
  log(color, `  User success rate  : ${successRate}% (${results.filter(r => r.success).length}/${TOTAL_USERS})`);

  if (failed.length > 0) {
    log(C.red, `\n  Failed users:`);
    failed.slice(0, 5).forEach(f => log(C.red, `    User ${f.userId}: ${f.error}`));
    if (failed.length > 5) log(C.red, `    ... and ${failed.length - 5} more`);
  }

  // ─── Verdict ─────────────────────────────────────────────────────────────
  log(C.bold + C.cyan, `\n${'═'.repeat(55)}`);
  const registerAvg = avg(stats.register.times);
  const challengeAvg = avg(stats.challenges.times);

  if (successRate >= 95 && registerAvg < 2000 && challengeAvg < 1000) {
    log(C.bold + C.green, `  ✅ VERDICT: PASS — Can handle 60 concurrent users`);
  } else if (successRate >= 80) {
    log(C.bold + C.yellow, `  ⚠️  VERDICT: MARGINAL — Some requests are slow or failing`);
    log(C.yellow,          `     Consider upgrading Render to a paid instance`);
  } else {
    log(C.bold + C.red,   `  ❌ VERDICT: FAIL — Server struggling under load`);
    log(C.red,             `     Upgrade server resources or optimize queries`);
  }
  log(C.bold + C.cyan, `${'═'.repeat(55)}\n`);

  // Cleanup test data
  await cleanup();
}

main().catch(err => {
  log(C.red, `\nFatal error: ${err.message}`);
  process.exit(1);
});
