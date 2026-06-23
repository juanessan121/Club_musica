const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

const fs = require('fs');
const path = require('path');

// Limpia recursivamente todos los archivos de bloqueo de Chromium
function cleanChromiumLocks() {
    const authDir = path.join(__dirname, '.wwebjs_auth');
    if (!fs.existsSync(authDir)) return;
    const lockNames = new Set(['SingletonLock', 'SingletonSocket', 'SingletonCookie']);
    function sweep(dir) {
        try {
            for (const item of fs.readdirSync(dir)) {
                const full = path.join(dir, item);
                if (lockNames.has(item)) {
                    fs.unlinkSync(full);
                    console.log('[WA] Removed stale lock:', full);
                } else {
                    try { if (fs.statSync(full).isDirectory()) sweep(full); } catch (_) {}
                }
            }
        } catch (_) {}
    }
    sweep(authDir);
}
cleanChromiumLocks();

// Iniciar cliente de WhatsApp con soporte para puppeteer en docker
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer'
        ]
    }
});

let isReady = false;

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Por favor escanea el código QR con WhatsApp para autenticar.');
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isReady = true;
});

client.on('authenticated', () => {
    console.log('WhatsApp Client is authenticated!');
});

client.on('auth_failure', msg => {
    console.error('Authentication failure', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.warn('WhatsApp Client disconnected:', reason);
    isReady = false;
    setTimeout(() => {
        console.log('Intentando reconectar WhatsApp...');
        cleanChromiumLocks();
        client.initialize();
    }, 10000);
});

cleanChromiumLocks();
client.initialize();

// Endpoint para enviar mensajes
app.post('/send', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: "WhatsApp Client is not ready yet" });
    }

    const { number, message } = req.body;
    
    if (!number || !message) {
        return res.status(400).json({ error: "Please provide 'number' and 'message'" });
    }

    try {
        // Parsear número a formato de whatsapp
        const formattedNumber = number.replace(/\D/g, '') + "@c.us";
        
        // Simular un delay aleatorio para evitar bloqueos (Prevención de bloqueo)
        const delay = Math.floor(Math.random() * 3000) + 1000;
        setTimeout(async () => {
            try {
                await client.sendMessage(formattedNumber, message);
                console.log(`Message sent to ${number}`);
            } catch (err) {
                console.error(`Failed to send message to ${number}: ${err.message}`);
            }
        }, delay);
        
        return res.status(200).json({ status: "Message queued for delivery" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.toString() });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: "healthy", whatsappReady: isReady });
});

app.listen(PORT, () => {
    console.log(`WhatsApp Bridge running on port ${PORT}`);
});
