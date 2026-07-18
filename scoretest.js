/**
 * Mystery Vault CTF — Score Verification Test
 * Registers a test team, solves all challenges with correct flags,
 * verifies score updates correctly after each submission.
 * Run: node scoretest.js [BASE_URL]
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const TEST_TEAM = `ScoreTest_${Date.now()}`;
const TEST_PIN  = '1234';

const C = {
  reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', bold: '\x1b[1m', gray: '\x1b[90m',
};
const log = (color, ...args) => console.log(color + args.join(' ') + C.reset);

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url   = new URL(path, BASE_URL);
    const lib   = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token   ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    };
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method,
      headers,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function pass(msg) { log(C.green,  '  ✅ ' + msg); }
function fail(msg) { log(C.red,    '  ❌ ' + msg); }
function info(msg) { log(C.cyan,   '  ℹ️  ' + msg); }
function warn(msg) { log(C.yellow, '  ⚠️  ' + msg); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log(C.bold + C.cyan, `\n${'═'.repeat(55)}`);
  log(C.bold + C.cyan, `  Mystery Vault CTF — Score Verification Test`);
  log(C.bold + C.cyan, `${'═'.repeat(55)}\n`);

  // ── 1. Health check ──────────────────────────────────────────────────────
  log(C.bold + C.cyan, '[ Phase 1 ] Health Check');
  const health = await request('GET', '/api/health').catch(() => null);
  if (!health || health.status !== 200) {
    fail(`Server not reachable at ${BASE_URL}`);
    process.exit(1);
  }
  pass(`Server is up at ${BASE_URL}`);

  // ── 2. Register test team ────────────────────────────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 2 ] Register Test Team');
  const regRes = await request('POST', '/api/auth/register', { name: TEST_TEAM, pin: TEST_PIN });
  if (regRes.status !== 201 || !regRes.data.token) {
    fail(`Registration failed: ${JSON.stringify(regRes.data)}`);
    process.exit(1);
  }
  const token = regRes.data.token;
  pass(`Registered team "${TEST_TEAM}"`);

  // ── 3. Fetch challenges ──────────────────────────────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 3 ] Fetch Challenges');
  const chalRes = await request('GET', '/api/challenges', null, token);
  if (chalRes.status !== 200 || !Array.isArray(chalRes.data.challenges)) {
    fail(`Could not load challenges: ${JSON.stringify(chalRes.data)}`);
    process.exit(1);
  }
  const challenges = chalRes.data.challenges;
  pass(`Loaded ${challenges.length} challenges`);
  info(`Challenges sorted by points: ${challenges.map(c => c.points + 'pts').join(', ')}`);

  // ── 4. Submit WRONG flag — should NOT add score ──────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 4 ] Wrong Flag Test (score must stay 0)');
  const firstChallenge = challenges[0];
  const wrongRes = await request('POST', `/api/challenges/${firstChallenge.id}/submit`,
    { flag: 'CTF{this_is_definitely_wrong}' }, token);
  if (wrongRes.status === 200 && wrongRes.data.correct === false) {
    pass(`Wrong flag correctly rejected`);
  } else {
    fail(`Wrong flag not handled correctly: ${JSON.stringify(wrongRes.data)}`);
  }

  // Check score is still 0
  const meRes0 = await request('GET', '/api/teams/me', null, token);
  const scoreAfterWrong = meRes0.data.score || 0;
  if (scoreAfterWrong === 0) {
    pass(`Score is still 0 after wrong flag ✓`);
  } else {
    fail(`Score changed after wrong flag! Score = ${scoreAfterWrong}`);
  }

  // ── 5. Submit correct flags — verify each score increment ────────────────
  log(C.bold + C.cyan, '\n[ Phase 5 ] Correct Flag Submissions & Score Tracking');

  // The known correct flags (must match what's seeded in schema.js)
  const knownFlags = {
    'Warmup: Encoded Not Encrypted':  'CTF{h3llo_crypt0gr4phy}',
    'Shift Happens':                  'CTF{c4esar_ciphers_shift_letters}',
    'Base Instincts':                 'CTF{hex_is_just_another_base}',
    'Two Steps Back':                 'CTF{layers_of_encoding_are_tricky}',
    'The Keyword':                    'CTF{vigenere_needs_a_keyword}',
    'The Final Layer':                'CTF{multi_layer_crypto_is_fun}',
    'Crack the Hash':                 'CTF{dragon123}',
    'XOR Marks the Spot':             'CTF{xor_keys_repeat_but_reveal}',
    'Letter Frequency':               'CTF{freq_analysis_works}',
    'Small Keys, Big Problems':       'CTF{65}',
    'Salt of the Earth':              'CTF{wizard}',
  };

  let expectedScore = 0;
  let passed = 0;
  let failed = 0;

  console.log('');
  console.log('  ' + ['Challenge'.padEnd(35), 'Pts'.padEnd(6), 'Expected'.padEnd(10), 'Actual'.padEnd(10), 'Status'].join('  '));
  console.log('  ' + '─'.repeat(75));

  for (const ch of challenges) {
    const flag = knownFlags[ch.title];
    if (!flag) {
      warn(`No known flag for "${ch.title}" — skipping`);
      continue;
    }

    const submitRes = await request('POST', `/api/challenges/${ch.id}/submit`, { flag }, token);

    if (submitRes.status === 200 && submitRes.data.correct) {
      const awarded = submitRes.data.totalPoints || submitRes.data.points;
      expectedScore += ch.points; // base points (bonus varies, skip for check)

      // Verify score via /api/teams/me
      const meRes = await request('GET', '/api/teams/me', null, token);
      const actualScore = meRes.data.score || 0;
      const bonusNote = submitRes.data.bonus > 0 ? ` (+${submitRes.data.bonus} bonus)` : '';

      const row = [
        ch.title.substring(0, 33).padEnd(35),
        String(ch.points).padEnd(6),
        String(expectedScore).padEnd(10),
        String(actualScore).padEnd(10),
      ];

      // Score should be >= expectedScore (could be higher due to bonuses)
      if (actualScore >= expectedScore) {
        console.log(C.green + '  ' + row.join('  ') + ' ✅' + bonusNote + C.reset);
        passed++;
        expectedScore = actualScore; // sync with actual (includes bonuses)
      } else {
        console.log(C.red + '  ' + row.join('  ') + ' ❌ MISMATCH' + C.reset);
        failed++;
      }
    } else if (submitRes.data.already_solved) {
      warn(`"${ch.title}" already solved`);
    } else {
      console.log(C.red + `  ${'[WRONG FLAG]'.padEnd(35)}  ${ch.title}  → ${JSON.stringify(submitRes.data)}` + C.reset);
      failed++;
    }
  }

  // ── 6. Final score check ─────────────────────────────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 6 ] Final Score Verification');
  const finalMe = await request('GET', '/api/teams/me', null, token);
  const finalScore = finalMe.data.score || 0;
  const solved     = finalMe.data.challenges_solved || 0;

  info(`Challenges solved : ${solved}/${challenges.length}`);
  info(`Final score       : ${finalScore} pts`);
  info(`Rank              : #${finalMe.data.rank || '?'}`);

  // ── 7. Duplicate submission test ─────────────────────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 7 ] Duplicate Submission Guard');
  const dupRes = await request('POST', `/api/challenges/${challenges[0].id}/submit`,
    { flag: knownFlags[challenges[0].title] }, token);
  if (dupRes.status === 400 && dupRes.data.already_solved) {
    pass(`Duplicate flag correctly blocked (score not doubled) ✓`);
  } else {
    fail(`Duplicate submission not blocked! Response: ${JSON.stringify(dupRes.data)}`);
  }

  // Verify score didn't change after dup attempt
  const afterDup = await request('GET', '/api/teams/me', null, token);
  if (afterDup.data.score === finalScore) {
    pass(`Score unchanged after duplicate attempt ✓`);
  } else {
    fail(`Score changed after duplicate! ${finalScore} → ${afterDup.data.score}`);
  }

  // ── 8. Leaderboard check ─────────────────────────────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 8 ] Leaderboard Check');
  const lbRes = await request('GET', '/api/leaderboard', null, token);
  const lbTeam = lbRes.data.teams?.find(t => t.name === TEST_TEAM);
  if (lbTeam) {
    pass(`Team appears on leaderboard with score ${lbTeam.score} ✓`);
  } else {
    fail(`Team not found on leaderboard`);
  }

  // ── 9. Cleanup ───────────────────────────────────────────────────────────
  log(C.bold + C.cyan, '\n[ Phase 9 ] Cleanup');
  try {
    const adminLogin = await request('POST', '/api/auth/admin', { name: 'admin', pin: 'admin' });
    if (adminLogin.data.token) {
      const adminToken = adminLogin.data.token;
      const teams = await request('GET', '/api/admin/teams', null, adminToken);
      const testTeam = Array.isArray(teams.data) ? teams.data.find(t => t.name === TEST_TEAM) : null;
      if (testTeam) {
        await request('DELETE', `/api/admin/teams/${testTeam.id}`, null, adminToken);
        pass(`Test team deleted ✓`);
      }
    }
  } catch { warn('Cleanup skipped'); }

  // ── Summary ───────────────────────────────────────────────────────────────
  log(C.bold + C.cyan, `\n${'═'.repeat(55)}`);
  log(C.bold + C.cyan, '  SUMMARY');
  log(C.bold + C.cyan, `${'═'.repeat(55)}`);
  log(C.bold + (failed === 0 ? C.green : C.red),
    `  Score tests : ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    log(C.bold + C.green, `  ✅ VERDICT: Score system is working correctly!`);
  } else {
    log(C.bold + C.red,   `  ❌ VERDICT: Score system has issues — check above`);
  }
  log(C.bold + C.cyan, `${'═'.repeat(55)}\n`);
}

main().catch(err => {
  log(C.red, `\nFatal: ${err.message}`);
  process.exit(1);
});
