const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

// Try to load database instance (safe fallback if missing)
let dbInstance = null;
try {
  dbInstance = require('./db/instance');
  console.log('[Levanter] Database instance loaded successfully.');
} catch (err) {
  console.warn('[Levanter] Warning: Database instance not found. Running without DB support.');
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    logger: P({ level: 'info' }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[Levanter] Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('[Levanter] Connected successfully.');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Example DB usage (only if available)
  if (dbInstance && typeof dbInstance.connect === 'function') {
    try {
      await dbInstance.connect();
      console.log('[Levanter] Database connected.');
    } catch (err) {
      console.warn('[Levanter] Failed to connect to database:', err.message);
    }
  }
}

startBot();
