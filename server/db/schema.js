const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ctf.db');

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

  // Seed challenges — clear and re-seed if not exactly 11 (our current set)
  const challengeCount = db.prepare(`SELECT COUNT(*) as count FROM challenges`).get();
  if (challengeCount.count !== 11) {
    db.prepare(`DELETE FROM challenges`).run();

    const challenges = [
      {
        title: 'Warmup: Encoded Not Encrypted',
        description: `Not everything that looks secret is actually encrypted. Some things are just encoded — meaning the "hidden" data can be reversed by anyone who knows the format.\n\nThis is Base64, one of the most common encodings on the internet.\n\nDecode it to find your first flag:\n\n\`Q1RGe2gzbGxvX2NyeXB0MGdyNHBoeX0=\``,
        story: 'The vault door has a simple keypad. A message on the wall reads: "Not everything hidden is truly secret — some doors just need the right decoder."',
        hints: JSON.stringify([]),
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
        hints: JSON.stringify([]),
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
        hints: JSON.stringify([]),
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
        hints: JSON.stringify([]),
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
        hints: JSON.stringify([]),
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
        hints: JSON.stringify([]),
        flag: 'CTF{multi_layer_crypto_is_fun}',
        points: 250,
        difficulty: 'hard',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 6,
      },
      // ── Advanced Challenges ──────────────────────────────────────
      {
        title: 'Crack the Hash',
        description: `Not all hashes are safe. Weak passwords hashed with fast algorithms like MD5 can be cracked using wordlists or online hash-cracking databases.\n\nCrack this MD5 hash to find the original password, then wrap it in the flag format.\n\n\`fac3b6c91a03f0896f369e471b1976e3\``,
        story: 'A leaked database dump lands on your screen. One account stands between you and the vault. The password is hashed — but MD5 was never meant to protect secrets.',
        hints: JSON.stringify([]),
        flag: 'CTF{dragon123}',
        points: 100,
        difficulty: 'easy',
        category: 'Hashing',
        round_number: 1,
        order_in_round: 7,
      },
      {
        title: 'XOR Marks the Spot',
        description: `XOR encryption is reversible if you know the key — and if you know even part of the plaintext, you can recover the key yourself.\n\nYou know the message starts with \`CTF{\` and the key is only 3 bytes long. Use that to work out the full key, then decrypt the rest.\n\nCiphertext (hex):\n\`303125081d0c013a08161c102c1706030002073a0106113c01001516040f0e\``,
        story: 'An agent intercepted a transmission. The encryption looks simple — just XOR — but the key is unknown. Fortunately, you know how every CTF flag starts...',
        hints: JSON.stringify([]),
        flag: 'CTF{xor_keys_repeat_but_reveal}',
        points: 150,
        difficulty: 'medium',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 8,
      },
      {
        title: 'Letter Frequency',
        description: `Every language has a fingerprint. In English, 'E' is the most common letter, followed by T, A, O, I, N... Simple substitution ciphers replace each letter with another, but they can't hide this fingerprint.\n\nUse frequency analysis to break this cipher:\n\n\`wlegraoljgte zd rth gljwrzwh ay dhwclh wappcqzwjrzaq zq rth glhdhqwh ay jibhldjlzhd rth yxjo zd wry ylhv jqjxedzd ualnd\``,
        story: 'A mysterious analyst left behind an encoded message. No tool will crack it automatically — you have to think like a codebreaker from the 1800s.',
        hints: JSON.stringify([]),
        flag: 'CTF{freq_analysis_works}',
        points: 200,
        difficulty: 'medium',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 9,
      },
      {
        title: 'Small Keys, Big Problems',
        description: `RSA security depends on large numbers being hard to factor. This one isn't so large.\n\n\`\`\`\nn = 3233\ne = 17\nciphertext = 2790\n\`\`\`\n\nFactor n into its two prime factors, compute the private key d, and decrypt the ciphertext. The decrypted number IS the flag — wrap it in CTF{}.`,
        story: 'The vault\'s RSA implementation looked secure on paper. But someone chose primes that were far too small. A true cryptanalyst can break this by hand.',
        hints: JSON.stringify([]),
        flag: 'CTF{65}',
        points: 250,
        difficulty: 'hard',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 10,
      },
      {
        title: 'Salt of the Earth',
        description: `Good password storage adds a "salt" — random data mixed into the password before hashing — so identical passwords don't produce identical hashes.\n\nThis hash was generated as: SHA256(password + salt)\n\n\`\`\`\nSalt: k9x2\nHash: 95550de679a815bb2df470cf6ffff7f3500c94fc99cefb2ab2b4d3a98a1ee83c\n\`\`\`\n\nThe password is a common English word (4-8 letters, all lowercase). Write a script to loop through a wordlist, append the salt, hash each, and find the match.`,
        story: 'The vault admin thought adding a salt made it uncrackable. They were wrong — the password itself is still weak. A short script will find it.',
        hints: JSON.stringify([]),
        flag: 'CTF{wizard}',
        points: 200,
        difficulty: 'medium',
        category: 'Hashing',
        round_number: 1,
        order_in_round: 11,
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
