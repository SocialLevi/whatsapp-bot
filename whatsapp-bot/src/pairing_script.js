const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function connectWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({ auth: state });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("Scan this QR code to connect:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log("✅ WhatsApp bot connected successfully!");
        }

        if (connection === 'close') {
            console.log("❌ Connection closed. Reconnecting...");
            connectWhatsApp();
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectWhatsApp();
