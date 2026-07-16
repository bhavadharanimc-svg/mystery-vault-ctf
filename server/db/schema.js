const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'ctf.db');

function initializeDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      current_round INTEGER DEFAULT 1,
      challenges_solved INTEGER DEFAULT 0,
      last_submission TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      story TEXT DEFAULT '',
      hints TEXT DEFAULT '[]',
      flag TEXT NOT NULL,
      points INTEGER NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
      category TEXT DEFAULT 'misc',
      attachment_url TEXT DEFAULT NULL,
      attachment_name TEXT DEFAULT NULL,
      round_number INTEGER NOT NULL,
      order_in_round INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL,
      flag_submitted TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      points_awarded INTEGER DEFAULT 0,
      bonus_points INTEGER DEFAULT 0,
      submitted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    );

    CREATE TABLE IF NOT EXISTS solved_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL,
      solved_at TEXT DEFAULT (datetime('now')),
      UNIQUE(team_id, challenge_id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      badge TEXT NOT NULL,
      awarded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS competition_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS round_timers (
      team_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      PRIMARY KEY (team_id, round_number),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );
  `);

  // Seed default config
  const configData = [
    ['first_blood_bonus', '50'],
    ['speed_bonus', '20'],
    ['speed_bonus_minutes', '5'],
    ['leaderboard_frozen', '0'],
    ['competition_active', '1'],
    ['registration_open', '1'],
  ];
  const insertConfig = db.prepare(`INSERT OR IGNORE INTO competition_config (key, value) VALUES (?, ?)`);
  for (const [k, v] of configData) insertConfig.run(k, v);

  // Seed admin team
  const adminExists = db.prepare(`SELECT id FROM teams WHERE name = 'admin'`).get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare(`INSERT INTO teams (name, pin_hash, is_admin) VALUES ('admin', ?, 1)`).run(hash);
  }

  // Seed challenges — clear and re-seed if not exactly 6 (our current set)
  const challengeCount = db.prepare(`SELECT COUNT(*) as count FROM challenges`).get();
  if (challengeCount.count !== 6) {
    db.prepare(`DELETE FROM challenges`).run();

    const challenges = [
      {
        title: 'Warmup: Encoded Not Encrypted',
        description: `Not everything that looks secret is actually encrypted. Some things are just encoded — meaning the "hidden" data can be reversed by anyone who knows the format.\n\nThis is Base64, one of the most common encodings on the internet.\n\nDecode it to find your first flag:\n\n\`Q1RGe2gzbGxvX2NyeXB0MGdyNHBoeX0=\``,
        story: 'The vault door has a simple keypad. A message on the wall reads: "Not everything hidden is truly secret — some doors just need the right decoder."',
        hints: JSON.stringify([
          'Base64 uses characters A-Z, a-z, 0-9, +, / and ends with = padding',
          'Use CyberChef → "From Base64" operation',
          'Or in Python: import base64; base64.b64decode("Q1RGe2gzbGxvX2NyeXB0MGdyNHBoeX0=").decode()',
        ]),
        flag: 'CTF{h3llo_crypt0gr4phy}',
        points: 50,
        difficulty: 'easy',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 1,
      },
      {
        title: 'Shift Happens',
        description: `The Caesar cipher shifts every letter forward by a fixed number in the alphabet. A shift of 1 turns A into B, B into C, and so on. Numbers and symbols stay the same.\n\nThis message was shifted by an unknown amount between 1 and 25. Try each shift until English words appear.\n\n\`HYK{h4jxfw_hnumjwx_xmnky_qjyyjwx}\``,
        story: 'An ancient Roman cipher guards the next vault chamber. Julius Caesar himself would be proud — but modern hackers have better tools.',
        hints: JSON.stringify([
          'There are only 25 possible shifts — try them all (brute force)',
          'Use CyberChef → "ROT13" or "Caesar Cipher Decode" with different offsets',
          'The flag format is CTF{...} — look for that pattern after decoding',
          'Hint: the shift used was 5',
        ]),
        flag: 'CTF{c4esar_ciphers_shift_letters}',
        points: 75,
        difficulty: 'easy',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 2,
      },
      {
        title: 'Base Instincts',
        description: `Hexadecimal represents data using only 0-9 and A-F, with every 2 characters representing one byte (one character of the original text).\n\nConvert this hex string back to readable text:\n\n\`4354467b6865785f69735f6a7573745f616e6f746865725f626173657d\``,
        story: 'A hex dump is displayed on a cracked monitor deep inside the vault. The numbers seem random — but everything has meaning if you know how to read it.',
        hints: JSON.stringify([
          'Every 2 hex characters = 1 ASCII character (e.g., 43 = "C", 54 = "T", 46 = "F")',
          'Use CyberChef → "From Hex" operation',
          'Or in Python: bytes.fromhex("4354467b...").decode()',
        ]),
        flag: 'CTF{hex_is_just_another_base}',
        points: 100,
        difficulty: 'easy',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 3,
      },
      {
        title: 'Two Steps Back',
        description: `One layer of protection is rarely enough. This message went through TWO transformations. Figure out which one was applied last, undo it first, then undo the other.\n\n\`}frjpya_lyh_nupkvjul_mv_zylfhs{MAJ\``,
        story: 'The vault architect was paranoid — one cipher was never enough. You must unpeel each layer carefully, like an onion of secrets.',
        hints: JSON.stringify([
          'Work backwards: the LAST thing applied must be undone FIRST',
          'Notice anything about the string structure? Try reversing it first',
          'After reversing, you should recognise a shifted cipher — try Caesar shifts',
          'The Caesar shift used was 7',
        ]),
        flag: 'CTF{layers_of_encoding_are_tricky}',
        points: 125,
        difficulty: 'medium',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 4,
      },
      {
        title: 'The Keyword',
        description: `Unlike Caesar's single fixed shift, the Vigenere cipher uses a KEYWORD, where each letter of the keyword determines a different shift amount for each letter of the message. This is why it resisted simple brute-forcing for centuries.\n\nKeyword: \`CIPHER\`\n\nDecrypt this message:\n\`EBU{cmxgvtyi_egmsz_e_bgglvvu}\``,
        story: 'A sealed envelope marked "For Your Eyes Only" contains a message. The keyword was whispered to you by a contact at the last dead drop: CIPHER.',
        hints: JSON.stringify([
          'Each letter of the keyword shifts the corresponding message letter by a different amount',
          'C=2, I=8, P=15, H=7, E=4, R=17 (positions in alphabet, 0-indexed)',
          'Use CyberChef → "Vigenere Decode" with key: CIPHER',
          'Or use an online Vigenere decoder: https://www.dcode.fr/vigenere-cipher',
        ]),
        flag: 'CTF{vigenere_needs_a_keyword}',
        points: 150,
        difficulty: 'medium',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 5,
      },
      {
        title: 'The Final Layer',
        description: `Real-world obfuscation often stacks multiple techniques together. This flag went through THREE separate transformations, applied in this order:\n1. Caesar shift\n2. Base64 encoding\n3. Hex encoding\n\nWork backward through all three layers to recover the flag.\n\n\`5231684b65334635634868745833426c59326c325832643259335234633139746431397165584a39\``,
        story: "The vault master's final message is protected by three locks. Only a true cryptographer can peel all three layers and claim the ultimate flag.",
        hints: JSON.stringify([
          'Undo in REVERSE order: hex -> base64 -> Caesar',
          'Step 1: Convert hex to text (use CyberChef "From Hex")',
          'Step 2: Decode the result from Base64 (use CyberChef "From Base64")',
          'Step 3: Try different Caesar shifts on the result until you see CTF{...',
        ]),
        flag: 'CTF{multi_layer_crypto_is_fun}',
        points: 250,
        difficulty: 'hard',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 6,
      },
    ];

    const insertChallenge = db.prepare(`
      INSERT INTO challenges (title, description, story, hints, flag, points, difficulty, category, round_number, order_in_round)
      VALUES (@title, @description, @story, @hints, @flag, @points, @difficulty, @category, @round_number, @order_in_round)
    `);
    for (const c of challenges) insertChallenge.run(c);
  }

  return db;
}

let dbInstance = null;
function getDb() {
  if (!dbInstance) dbInstance = initializeDatabase();
  return dbInstance;
}

module.exports = { getDb, DB_PATH };
