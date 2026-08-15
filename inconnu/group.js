const { jidNormalizedUser } = require('baileys');

async function getGroupMetadata(socket, groupJid) {
    return socket.groupMetadata(groupJid);
}

function getParticipants(metadata) {
    return metadata?.participants || [];
}

function isParticipantAdmin(participants, jid) {
    return participants.some(p => p.id === jid && (p.admin === 'admin' || p.admin === 'superadmin'));
}

async function isGroupAdmin(socket, groupJid, userJid) {
    const metadata = await getGroupMetadata(socket, groupJid);
    const participants = getParticipants(metadata);
    return isParticipantAdmin(participants, userJid);
}

async function isBotAdmin(socket, groupJid) {
    const metadata = await getGroupMetadata(socket, groupJid);
    const participants = getParticipants(metadata);
    const botJid = jidNormalizedUser(socket.user.id);
    const botNumber = botJid.split('@')[0];
    return participants.some(p => (p.id === botJid || p.id.split('@')[0] === botNumber) && (p.admin === 'admin' || p.admin === 'superadmin'));
}

function getGroupAdmins(participants) {
    return participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id);
}

function senderJidFromNumber(number) {
    return `${number}@s.whatsapp.net`;
}

module.exports = {
    getGroupMetadata,
    getParticipants,
    isParticipantAdmin,
    isGroupAdmin,
    isBotAdmin,
    getGroupAdmins,
    senderJidFromNumber
};
