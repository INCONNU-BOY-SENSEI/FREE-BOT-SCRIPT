const {
    proto,
    downloadContentFromMessage,
    getContentType
} = require('baileys')
const fs = require('fs').promises
const path = require('path')

const generateUniqueFilename = (baseFilename, ext) => {
    if (!baseFilename) {
        return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
    }
    return `${baseFilename}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
}

const streamToBuffer = async (stream) => {
    const chunks = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

const downloadMediaMessage = async (m, filename) => {
    try {
        if (m.type === 'viewOnceMessage') {
            m.type = m.msg.type
        }

        if (!m.msg) {
            console.error('Invalid message object: m.msg is undefined')
            return null
        }

        const stream = await downloadContentFromMessage(m.msg, m.type.replace('Message', ''))
        const buffer = await streamToBuffer(stream)

        if (!buffer || buffer.length === 0) {
            console.error('Downloaded buffer is empty')
            return null
        }

        if (m.type === 'imageMessage') {
            const fileName = generateUniqueFilename(filename, 'jpg')
            await fs.writeFile(fileName, buffer)
            return buffer
        } else if (m.type === 'videoMessage') {
            const fileName = generateUniqueFilename(filename, 'mp4')
            await fs.writeFile(fileName, buffer)
            return buffer
        } else if (m.type === 'audioMessage') {
            const fileName = generateUniqueFilename(filename, 'mp3')
            await fs.writeFile(fileName, buffer)
            return buffer
        } else if (m.type === 'stickerMessage') {
            const fileName = generateUniqueFilename(filename, 'webp')
            await fs.writeFile(fileName, buffer)
            return buffer
        } else if (m.type === 'documentMessage') {
            let ext = 'bin'
            if (m.msg.fileName) {
                ext = (m.msg.fileName.split('.').pop() || 'bin').toLowerCase()
                    .replace('jpeg', 'jpg')
                    .replace('png', 'jpg')
                    .replace('m4a', 'mp3')
            }
            const fileName = generateUniqueFilename(filename, ext)
            await fs.writeFile(fileName, buffer)
            return buffer
        } else {
            console.warn(`Unsupported media type: ${m.type}`)
            return buffer
        }
    } catch (error) {
        console.error('Error downloading media:', error.message)
        return null
    }
}

const sms = (conn, m) => {
    try {
        if (m.key) {
            m.id = m.key.id
            m.chat = m.key.remoteJid
            m.fromMe = m.key.fromMe
            m.isGroup = m.chat.endsWith('@g.us')
            m.sender = m.fromMe 
                ? conn.user.id.split(':')[0] + '@s.whatsapp.net' 
                : m.isGroup 
                    ? m.key.participant 
                    : m.key.remoteJid
        }

        if (m.message) {
            m.type = getContentType(m.message)
            m.msg = (m.type === 'viewOnceMessage') 
                ? m.message[m.type].message[getContentType(m.message[m.type].message)] 
                : m.message[m.type]

            if (m.msg) {
                if (m.type === 'viewOnceMessage') {
                    m.msg.type = getContentType(m.message[m.type].message)
                }

                const quotedMention = m.msg.contextInfo?.participant || ''
                const tagMention = m.msg.contextInfo?.mentionedJid || []
                const mention = typeof tagMention === 'string' ? [tagMention] : tagMention
                const allMentions = mention ? [...mention, quotedMention] : [quotedMention]
                m.mentionUser = allMentions.filter(x => x && x.trim())

                m.body = (m.type === 'conversation') 
                    ? m.msg 
                    : (m.type === 'extendedTextMessage') 
                        ? m.msg.text 
                        : (m.type === 'imageMessage' && m.msg.caption) 
                            ? m.msg.caption 
                            : (m.type === 'videoMessage' && m.msg.caption) 
                                ? m.msg.caption 
                                : (m.type === 'audioMessage' && m.msg.ptt)
                                    ? 'Audio (PTT)'
                                    : (m.type === 'audioMessage')
                                        ? 'Audio'
                                        : (m.type === 'stickerMessage')
                                            ? 'Sticker'
                                            : (m.type === 'documentMessage' && m.msg.fileName)
                                                ? m.msg.fileName
                                                : ''

                m.quoted = m.msg.contextInfo?.quotedMessage || null
                if (m.quoted) {
                    m.quoted.type = getContentType(m.quoted)
                    m.quoted.id = m.msg.contextInfo.stanzaId
                    m.quoted.sender = m.msg.contextInfo.participant
                    m.quoted.fromMe = m.quoted.sender
                        .split('@')[0]
                        .includes(conn.user.id.split(':')[0])
                    m.quoted.msg = (m.quoted.type === 'viewOnceMessage') 
                        ? m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] 
                        : m.quoted[m.quoted.type]

                    if (m.quoted.type === 'viewOnceMessage') {
                        m.quoted.msg.type = getContentType(m.quoted[m.quoted.type].message)
                    }

                    const quoted_quotedMention = m.quoted.msg?.contextInfo?.participant || ''
                    const quoted_tagMention = m.quoted.msg?.contextInfo?.mentionedJid || []
                    const quoted_mention = typeof quoted_tagMention === 'string' ? [quoted_tagMention] : quoted_tagMention
                    const quoted_allMentions = quoted_mention ? [...quoted_mention, quoted_quotedMention] : [quoted_quotedMention]
                    m.quoted.mentionUser = quoted_allMentions.filter(x => x && x.trim())

                    m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
                        key: {
                            remoteJid: m.chat,
                            fromMe: m.quoted.fromMe,
                            id: m.quoted.id,
                            participant: m.quoted.sender
                        },
                        message: m.quoted
                    })

                    m.quoted.download = (filename) => downloadMediaMessage(m.quoted, filename)
                    m.quoted.delete = () => conn.sendMessage(m.chat, {
                        delete: m.quoted.fakeObj.key
                    })
                    m.quoted.react = (emoji) => conn.sendMessage(m.chat, {
                        react: {
                            text: emoji,
                            key: m.quoted.fakeObj.key
                        }
                    })
                }
            }

            m.download = (filename) => downloadMediaMessage(m, filename)
        }

        m.reply = (teks, id = m.chat, option = { mentions: [m.sender] }) => 
            conn.sendMessage(id, {
                text: teks,
                contextInfo: {
                    mentionedJid: option.mentions
                }
            }, {
                quoted: m
            })

        m.replyS = (stik, id = m.chat, option = { mentions: [m.sender] }) => 
            conn.sendMessage(id, {
                sticker: stik,
                contextInfo: {
                    mentionedJid: option.mentions
                }
            }, {
                quoted: m
            })

        m.replyImg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => 
            conn.sendMessage(id, {
                image: img,
                caption: teks,
                contextInfo: {
                    mentionedJid: option.mentions
                }
            }, {
                quoted: m
            })

        m.replyVid = (vid, teks, id = m.chat, option = { mentions: [m.sender], gif: false }) => 
            conn.sendMessage(id, {
                video: vid,
                caption: teks,
                gifPlayback: option.gif,
                contextInfo: {
                    mentionedJid: option.mentions
                }
            }, {
                quoted: m
            })

        m.replyAud = (aud, id = m.chat, option = { mentions: [m.sender], ptt: false }) => 
            conn.sendMessage(id, {
                audio: aud,
                ptt: option.ptt,
                mimetype: 'audio/mpeg',
                contextInfo: {
                    mentionedJid: option.mentions
                }
            }, {
                quoted: m
            })

        m.replyDoc = (doc, id = m.chat, option = { mentions: [m.sender], filename: 'document.pdf', mimetype: 'application/pdf' }) => 
            conn.sendMessage(id, {
                document: doc,
                mimetype: option.mimetype,
                fileName: option.filename,
                contextInfo: {
                    mentionedJid: option.mentions
                }
            }, {
                quoted: m
            })

        m.replyContact = (name, info, number) => {
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${info};\nTEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`
            conn.sendMessage(m.chat, {
                contacts: {
                    displayName: name,
                    contacts: [{
                        vcard
                    }]
                }
            }, {
                quoted: m
            })
        }

        m.react = (emoji) => conn.sendMessage(m.chat, {
            react: {
                text: emoji,
                key: m.key
            }
        })

        return m
    } catch (error) {
        console.error('Error in sms function:', error.message)
        return m
    }
}

module.exports = {
    sms,
    downloadMediaMessage
}
