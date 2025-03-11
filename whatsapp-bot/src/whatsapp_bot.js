const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

let userWarnings = {};
const MAX_WARNINGS = 2;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({ auth: state });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ WhatsApp Bot is now connected!");
        }
        if (connection === 'close') {
            console.log("❌ Connection closed, reconnecting...");
            startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe) {
            const sender = msg.key.remoteJid;
            const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

            if (/\bbms\b|\banswers\b/i.test(messageText)) {
                await sock.sendMessage(sender, { text: "🤖 Message my Creator" });
                return;
            }

            if (msg.key.remoteJid.includes("@g.us")) {
                const wordsCount = messageText.split(/\s+/).length;
                if (wordsCount > 100) {
                    try {
                        const groupInfo = await sock.groupMetadata(msg.key.remoteJid);
                        const isBotAdmin = groupInfo.participants.find(
                            (member) => member.id === sock.user.id && member.admin
                        );

                        if (isBotAdmin) {
                            const userId = msg.key.participant;
                            userWarnings[userId] = (userWarnings[userId] || 0) + 1;

                            if (userWarnings[userId] >= MAX_WARNINGS) {
                                await sock.sendMessage(msg.key.remoteJid, { text: `🚨 @${userId.split('@')[0]}, you have been removed after exceeding warnings!`, mentions: [userId] });
                                await sock.groupParticipantsUpdate(msg.key.remoteJid, [userId], "remove");
                            } else {
                                await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ @${userId.split('@')[0]}, your message is too long! Warning ${userWarnings[userId]}/${MAX_WARNINGS}.`, mentions: [userId] });
                            }
                        }
                    } catch (error) {
                        console.error("Error warning user:", error);
                    }
                }
            }
        }
    });
}

startBot();
