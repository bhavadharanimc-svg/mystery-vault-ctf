# 🔐 Mystery Vault CTF

> A full-stack immersive Capture The Flag platform for college competitions. Enter the secret hacker facility. Capture the flags. Conquer the vault.

![Mystery Vault CTF]

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm

### 1. Install Dependencies

```bash
# Server dependencies
cd server
npm install
cd ..

# Client dependencies
cd client
npm install
cd ..
```

### 2. Start the Server

```bash
cd server
node index.js
```

Server runs on **http://0.0.0.0:5000** (accessible across the college network)

### 3. Start the Client (new terminal)

```bash
cd client
npm run dev
```

Client runs on **http://localhost:5173**

---

## 🔑 Default Credentials

| Role  | Name    | PIN  |
|-------|---------|------|
| Admin | `admin` | `admin` |

> ⚠️ Change the admin PIN immediately after setup via the Admin Panel.

---

## 🌐 Network Access

Students can access the platform by navigating to your machine's IP address:
```
http://<your-ip>:5173
```

To find your IP: `ipconfig` (Windows) or `ip addr` (Linux)

---

## 🎮 Game Structure

| Round | Difficulty | Challenges | Points Each | Time Limit |
|-------|-----------|------------|-------------|------------|
| 1     | Easy      | 3          | 50 pts      | 20 min     |
| 2     | Medium    | 3          | 100 pts     | 30 min     |
| 3     | Hard      | 3          | 200 pts     | 40 min     |

### Bonuses
- **First Blood**: +50 pts (first team to solve a challenge)
- **Speed Bonus**: +20 pts (solved within 5 minutes of round start)

### Round Unlocking
- Complete Easy round + score ≥ 100 pts → Medium unlocks
- Complete Medium round + score ≥ 250 pts → Hard unlocks

---

## 🛡️ Admin Panel

Access at `/admin` with admin credentials.

### Features
- **Overview**: Live stats (teams, submissions, correct flags)
- **Teams**: Create teams, generate PINs, delete teams
- **Challenges**: Full CRUD with file attachments
- **Config**: Edit timers, qualifying scores, bonuses
- **Leaderboard**: Live view, freeze/unfreeze, export CSV

---

## 🏆 Challenge Categories (Default)

| # | Round | Title | Category |
|---|-------|-------|---------|
| 1 | Easy | Shadow Initiation | Cryptography |
| 2 | Easy | Digital Phantom | Steganography |
| 3 | Easy | Port Scanner's Creed | Networking |
| 4 | Medium | The Cipher Labyrinth | Cryptography |
| 5 | Medium | SQL Shadow | Web Exploitation |
| 6 | Medium | Memory Forensics | Forensics |
| 7 | Hard | Zero-Day Phantom | Binary Exploitation |
| 8 | Hard | Reverse the Architect | Reverse Engineering |
| 9 | Hard | The Final Protocol | Network Forensics |

---

## 🎖️ Achievements

| Badge | How to Earn |
|-------|-------------|
| 🩸 First Blood | First team to solve a challenge |
| 🎯 Perfect Round | Zero wrong flags in an entire round |
| 🔱 Master Hacker | Complete all 3 rounds |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT |
| Real-time | Socket.io |
| Animations | Canvas (Matrix rain, Particles) + CSS |

---

## 📁 Project Structure

```
mystery-vault-ctf/
├── server/
│   ├── db/schema.js          # SQLite schema + 9 seeded challenges
│   ├── middleware/auth.js     # JWT auth + admin middleware
│   ├── routes/
│   │   ├── auth.js           # Login endpoints
│   │   ├── challenges.js     # Flag submission + timers
│   │   ├── teams.js          # Team profile + score
│   │   ├── leaderboard.js    # Live rankings
│   │   └── admin.js          # Admin CRUD + config
│   ├── uploads/              # Team-uploaded files
│   └── index.js              # Express + Socket.io server
└── client/
    └── src/
        ├── components/
        │   ├── MatrixRain.tsx      # Canvas matrix animation
        │   ├── ParticleField.tsx   # Canvas particle network
        │   ├── VaultDoor.tsx       # Login vault animation
        │   ├── ChallengeCard.tsx   # Glowing challenge cards
        │   ├── RoundTimer.tsx      # Countdown timer
        │   ├── TerminalText.tsx    # Typing text effect
        │   ├── AchievementBadge.tsx
        │   └── Navbar.tsx
        ├── pages/
        │   ├── LoginPage.tsx       # Vault door login
        │   ├── DashboardPage.tsx   # Round overview
        │   ├── ChallengePage.tsx   # Flag submission
        │   ├── LeaderboardPage.tsx # Live rankings
        │   ├── AdminPage.tsx       # Admin control center
        │   └── EndScreen.tsx       # Mission complete
        └── context/
            ├── AuthContext.tsx
            └── SocketContext.tsx
```
