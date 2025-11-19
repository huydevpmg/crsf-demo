const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super-secret-key';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Database
const users = {
    'user': { password: 'password', balance: 1000 },
    'attacker': { password: 'password', balance: 0 }
};

// Security Config (Dynamic for Demo)
let securityMode = 'NONE'; // NONE, CSRF_TOKEN, SAMESITE, ORIGIN, JWT

// Helper to generate CSRF Token
const generateCsrfToken = () => Math.random().toString(36).substring(2, 15);
const userSessions = {}; // sessionId -> { username, csrfToken }

// Middleware to check auth
const checkAuth = (req, res, next) => {
    if (securityMode === 'JWT') {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, JWT_SECRET, (err, user) => {
                if (err) return res.status(403).json({ error: 'Invalid Token' });
                req.user = user;
                next();
            });
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    } else {
        // Cookie based auth
        const sessionUser = req.cookies.user;
        if (sessionUser && users[sessionUser]) {
            req.user = { username: sessionUser };
            next();
        } else {
            const errorMsg = securityMode === 'SAMESITE' 
                ? 'Unauthorized - SameSite cookie policy blocked cross-site request'
                : 'Unauthorized';
            res.status(401).json({ error: errorMsg });
        }
    }
};

// Routes

// 1. Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users[username];

    if (user && user.password === password) {
        if (securityMode === 'JWT') {
            const token = jwt.sign({ username }, JWT_SECRET);
            res.json({ token, username });
        } else {
            // Cookie based auth
            let cookieOptions = { httpOnly: false };

            if (securityMode === 'SAMESITE') {
                cookieOptions.sameSite = 'Strict';
                cookieOptions.secure = false; // Strict doesn't require secure on localhost usually
            } else {
                // VULNERABLE MODES (NONE, CSRF_TOKEN, ORIGIN)
                // To allow the attack to work (Cross-Site POST), we MUST explicitly allow cross-site cookies.
                // Modern browsers block this by default (Lax).
                // We use SameSite=None; Secure. (Localhost is treated as secure context).
                cookieOptions.sameSite = 'None';
                cookieOptions.secure = true;
            }

            res.cookie('user', username, cookieOptions);

            // CSRF Token generation
            const csrfToken = generateCsrfToken();
            userSessions[username] = { csrfToken };

            res.json({ message: 'Logged in', csrfToken: securityMode === 'CSRF_TOKEN' ? csrfToken : null });
        }
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// 2. Get User Info
app.get('/me', checkAuth, (req, res) => {
    const username = req.user.username;
    res.json({
        username,
        balance: users[username].balance,
        securityMode
    });
});

// 3. Transfer Money
app.post('/transfer', checkAuth, (req, res) => {
    const { to, amount } = req.body;
    const fromUser = req.user.username;

    console.log(`Attempting transfer from ${fromUser} to ${to}: ${amount}. Mode: ${securityMode}`);

    // Security Checks
    if (securityMode === 'SAMESITE') {
        return res.status(403).json({ error: 'Cross-site request blocked by SameSite policy' });
    }

    if (securityMode === 'CSRF_TOKEN') {
        const token = req.body.csrfToken || req.headers['x-csrf-token'];
        const session = userSessions[fromUser];
        if (!token || !session || token !== session.csrfToken) {
            console.log('Blocked by CSRF Token check');
            return res.status(403).json({ error: 'Invalid CSRF Token' });
        }
    }

    if (securityMode === 'ORIGIN') {
        const origin = req.get('Origin');
        const referer = req.get('Referer');
        // Allow only from our own origin
        const allowedOrigin = 'http://localhost:3000';
        if (origin !== allowedOrigin && (!referer || !referer.startsWith(allowedOrigin))) {
            console.log(`Blocked by Origin/Referer check. Origin: ${origin}, Referer: ${referer}`);
            return res.status(403).json({ error: 'Origin/Referer mismatch' });
        }
    }

    // SameSite is handled by the browser (cookie not sent), so we don't check it here explicitly,
    // but if the cookie is missing, checkAuth fails.

    // Perform Transfer
    const amountNum = parseInt(amount);
    if (users[fromUser].balance >= amountNum) {
        users[fromUser].balance -= amountNum;
        if (users[to]) {
            users[to].balance += amountNum;
        }
        console.log('Transfer successful');
        res.json({ message: 'Transfer successful', newBalance: users[fromUser].balance });
    } else {
        res.status(400).json({ error: 'Insufficient funds' });
    }
});

// 4. Admin: Set Security Mode
app.post('/set-security', (req, res) => {
    const { mode } = req.body;
    securityMode = mode;
    console.log(`Security Mode changed to: ${mode}`);
    res.json({ message: `Security Mode set to ${mode}` });
});

// 5. Logout
app.post('/logout', (req, res) => {
    res.clearCookie('user');
    res.json({ message: 'Logged out' });
});

// 6. Reset Balances
app.post('/reset', (req, res) => {
    users['user'].balance = 1000;
    users['attacker'].balance = 0;
    console.log('Balances reset');
    res.json({ message: 'Reset successful' });
});

app.listen(PORT, () => {
    console.log(`Bank Server running on http://localhost:${PORT}`);
});
