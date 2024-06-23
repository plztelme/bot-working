const { DisconnectReason } = require("@whiskeysockets/baileys");
const { BufferJSON, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require("@whiskeysockets/baileys").default;
const qrcode = require('qrcode-terminal');  // Import qrcode-terminal

async function connectionLogic() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update || {};

        if (qr) {
            qrcode.generate(qr, { small: true });  // Print QR code to terminal
            // write custom logic for QR handling here
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectionLogic();
            }
        } else if (connection === 'open') {
            // Fetch the group JID for "Bèlièvèrs"
            const groupJid = await getGroupJid(sock, "Bèlièvèrs");
            if (groupJid) {
                await sendMessageToGroupMembers(sock, groupJid, "Hello from the bot!");
            } else {
                console.log('Group "Bèlièvèrs" not found');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    async function getGroupJid(sock, groupName) {
        const groups = await sock.groupFetchAllParticipating();
        for (const groupId in groups) {
            if (groups[groupId].subject === groupName) {
                return groupId;
            }
        }
        return null;
    }

    async function sendMessage(sock, jid, message) {
        await sock.sendMessage(jid, { text: message });
    }

    async function sendMessageToGroupMembers(sock, groupJid, message) {
        const groupMetadata = await sock.groupMetadata(groupJid);
        const participants = groupMetadata.participants;

        for (const participant of participants) {
            await sendMessage(sock, participant.id, message);
        }
    }
}

connectionLogic();
