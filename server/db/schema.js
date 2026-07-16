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
    ['easy_qualify_score', '100'],
    ['medium_qualify_score', '250'],
    ['easy_time_minutes', '20'],
    ['medium_time_minutes', '30'],
    ['hard_time_minutes', '40'],
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

  // Seed sample challenges
  const challengeCount = db.prepare(`SELECT COUNT(*) as count FROM challenges`).get();
  if (challengeCount.count === 0) {
    const challenges = [
      // Round 1 - Easy
      {
        title: 'Shadow Initiation',
        description: 'Decode the secret message hidden in plain sight. The vault masters have left a trail for new initiates.',
        story: 'You receive a cryptic note slipped under your door at 3AM. It reads: "The truth is encoded in the base of all digital knowledge." A string of characters follows: `ZmxhZ3toM2xsb193MHJsZH0=`',
        hints: JSON.stringify(['Think about common encoding schemes', 'Base64 is widely used in the digital world', 'Use an online decoder or Python: base64.b64decode()']),
        flag: 'flag{h3llo_w0rld}',
        points: 50,
        difficulty: 'easy',
        category: 'Cryptography',
        round_number: 1,
        order_in_round: 1,
      },
      {
        title: 'Digital Phantom',
        description: 'Something is hidden inside this image. Find what the phantom left behind.',
        story: 'An encrypted photo arrives from an unknown agent. "Look deeper than what the eye can see," the message says. "The phantom hides in the metadata." Check the image carefully — the flag is embedded within.',
        hints: JSON.stringify(['Try using steganography tools', 'exiftool can reveal hidden metadata', 'strings command might help on Linux']),
        flag: 'flag{ph4nt0m_1n_th3_b1ts}',
        points: 50,
        difficulty: 'easy',
        category: 'Steganography',
        round_number: 1,
        order_in_round: 2,
      },
      {
        title: 'Port Scanner\'s Creed',
        description: 'A service is running on a mysterious server. Find the open port and the secret it guards.',
        story: 'Your handler sends coordinates: "Target IP: 10.0.0.1". Your mission is to discover what secrets lie behind its open ports. Run a scan. Listen carefully. The vault sends its greetings on port 1337.',
        hints: JSON.stringify(['Use nmap to scan open ports', 'nc (netcat) can connect to open ports', 'Try: nmap -sV -p- target_ip']),
        flag: 'flag{p0rts_t3ll_s3cr3ts}',
        points: 50,
        difficulty: 'easy',
        category: 'Networking',
        round_number: 1,
        order_in_round: 3,
      },
      // Round 2 - Medium
      {
        title: 'The Cipher Labyrinth',
        description: 'Multiple layers of encryption protect this secret. Peel them one by one to reach the flag.',
        story: 'Deep in the vault archives lies a message triple-encrypted by the ghost of a paranoid cryptographer. Your analyst notes: "First layer: Caesar. Second: Vigenère with key \'VAULT\'. Third: ROT13." The ciphertext awaits.',
        hints: JSON.stringify(['Caesar cipher shifts by a fixed number — try brute force', 'Vigenère needs the key: VAULT', 'ROT13 is its own inverse', 'Use CyberChef for multi-step decryption']),
        flag: 'flag{labyR1nth_0f_c1ph3rs}',
        points: 100,
        difficulty: 'medium',
        category: 'Cryptography',
        round_number: 2,
        order_in_round: 1,
      },
      {
        title: 'SQL Shadow',
        description: 'A login form guards a secret database. Shadows of injected queries may reveal the truth.',
        story: 'You discover an old admin portal at shadow.vault.local. The login looks familiar... too familiar. "Never trust user input," your mentor once said. The admin\'s password holds the flag.',
        hints: JSON.stringify(['SQL injection is the key', "Try: ' OR '1'='1", 'The flag is stored in the users table', "UNION SELECT might help: ' UNION SELECT flag FROM secrets--"]),
        flag: 'flag{sql_1nj3ct10n_m4st3r}',
        points: 100,
        difficulty: 'medium',
        category: 'Web Exploitation',
        round_number: 2,
        order_in_round: 2,
      },
      {
        title: 'Memory Forensics',
        description: 'A memory dump from a compromised machine holds crucial evidence. Dig through the digital mind.',
        story: 'An agent was compromised. Before the machine was destroyed, a memory dump was captured. Volatility is your scalpel. The flag lives somewhere in process memory — find it before the trail goes cold.',
        hints: JSON.stringify(['Use Volatility framework for memory forensics', 'Start with: volatility -f dump.mem imageinfo', 'Try: volatility cmdline or volatility pslist', 'strings dump.mem | grep flag{ might work too']),
        flag: 'flag{m3m0ry_n3v3r_l13s}',
        points: 100,
        difficulty: 'medium',
        category: 'Forensics',
        round_number: 2,
        order_in_round: 3,
      },
      // Round 3 - Hard
      {
        title: 'Zero-Day Phantom',
        description: 'A vulnerable binary awaits. Exploit the buffer overflow to gain control and retrieve the flag.',
        story: 'The final guardian of the vault is a 32-bit binary compiled without stack canaries. "Overflow the buffer. Control the instruction pointer. Redirect execution to the secret function." This is the last test of a true vault master.',
        hints: JSON.stringify(['Use gdb or pwndbg to analyze the binary', 'Find the offset with a cyclic pattern', 'Identify the win() function address', 'Python pwntools makes exploitation elegant']),
        flag: 'flag{buff3r_0v3rfl0w_g0d}',
        points: 200,
        difficulty: 'hard',
        category: 'Binary Exploitation',
        round_number: 3,
        order_in_round: 1,
      },
      {
        title: 'Reverse the Architect',
        description: 'A compiled binary holds a secret algorithm. Reverse engineer it to find the valid input that produces the flag.',
        story: 'The vault architect left behind a custom verification program. It checks an input and either prints the flag or denies you. No source code exists. Only the binary. Disassemble. Understand. Conquer.',
        hints: JSON.stringify(['Use Ghidra or IDA for static analysis', 'Look for strcmp or custom comparison functions', 'Dynamic analysis with gdb can reveal the check', 'The algorithm is a simple XOR with a static key']),
        flag: 'flag{r3v3rs3_3ng1n33r1ng_pr0}',
        points: 200,
        difficulty: 'hard',
        category: 'Reverse Engineering',
        round_number: 3,
        order_in_round: 2,
      },
      {
        title: 'The Final Protocol',
        description: 'Decrypt the intercepted network traffic. The vault\'s master key is buried in the packets.',
        story: 'You intercept the final transmission between the vault master and their handler. A PCAP file captures the encrypted exchange. Break the weak encryption. Reconstruct the session. The flag is the vault\'s ultimate secret — the master key that unlocks everything.',
        hints: JSON.stringify(['Use Wireshark to analyze the PCAP', 'Look for TLS handshakes and exported keys', 'Follow TCP streams to reassemble sessions', 'The encryption is RC4 with a 4-digit key — brute force it']),
        flag: 'flag{m4st3r_k3y_unl0ck3d}',
        points: 200,
        difficulty: 'hard',
        category: 'Network Forensics',
        round_number: 3,
        order_in_round: 3,
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
