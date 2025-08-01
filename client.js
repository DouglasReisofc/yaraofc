const { Client, LocalAuth } = require('whatsapp-web.js');
const os = require('os');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const qrcode = require('qrcode-terminal'); // Biblioteca para imprimir QR Code no terminal
const config = require('./dono/config.json');



let chromePath = '/usr/bin/chromium-browser';
let userDataDir = null;

if (os.platform() === 'win32') {
    // Usa o executável do Chrome no Windows
    chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

} else {
    // Em Linux, tenta primeiro o Google Chrome, depois o Chromium
    if (fs.existsSync('/usr/bin/google-chrome')) {
        chromePath = '/usr/bin/google-chrome';
    } else if (fs.existsSync('/usr/bin/chromium-browser')) {
        chromePath = '/usr/bin/chromium-browser';
    }
    // Configura perfil do Chromium, se existir
    if (fs.existsSync('/home/douglas/.config/chromium')) {
        userDataDir = '/home/douglas/.config/chromium';
    }
}


const sessionPath = path.join(__dirname, '.wwebjs_auth');
const sessionExists = fs.existsSync(sessionPath);
console.log(sessionExists ? '🔄 Sessão encontrada, tentando restaurar...' : '⚡ Nenhuma sessão encontrada, escaneie o QR Code.');

const clientId = config.nomeBot || 'default-bot';

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: clientId
    }),
    puppeteer: {
        executablePath: chromePath,
        headless: false,
        userDataDir: userDataDir || undefined,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-session-crashed-bubble",
            "--disable-infobars",
            "--disable-features=site-per-process,TranslateUI",
            "--disable-blink-features=AutomationControlled",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--single-process",
            `--proxy-bypass-list=<-loopback>`
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: null
    }
});




// 📌 Exibir QR Code no terminal
client.on('qr', qr => {
    console.log(chalk.yellow('📲 Escaneie o QR Code abaixo para conectar-se ao bot:'));
    qrcode.generate(qr, { small: true });
});

// 📌 Indica que a sessão foi restaurada com sucesso
client.on('ready', async () => {
    console.log(chalk.green(`🚀 Bot '${config.nomeBot || 'Bot'}' iniciado com sucesso e pronto para uso!`));
    if (config.numeroDono) {
        await client.sendMessage(
            config.numeroDono + '@c.us',
            `✅ O bot '${config.nomeBot || 'Bot'}' está ativo e pronto para uso!`
        );
    }
});

// 📌 Lida com falhas de autenticação e reinicia o bot
client.on('auth_failure', async () => {
    console.error('❌ Falha na autenticação! Reiniciando cliente...');
    await client.sendMessage(
        config.numeroDono + '@c.us',
        '⚠️ Falha na autenticação. O bot será reiniciado.'
    );
    process.exit(1);
});

// 📌 Reinicia automaticamente caso seja desconectado
client.on('disconnected', async (reason) => {
    console.error(`🔌 Conexão perdida (${reason}). Reiniciando cliente...`);
    await client.sendMessage(
        config.numeroDono + '@c.us',
        `⚠️ O bot foi desconectado (${reason}). Reiniciando...`
    );
    process.exit(1);
});

// 📌 Detecta mudanças no estado da sessão e reinicia se necessário
client.on('change_state', async (state) => {
    console.log(`🔄 Estado atualizado: ${state}`);
    if (['CONFLICT', 'UNPAIRED', 'UNLAUNCHED', 'BANNED'].includes(state)) {
        console.warn('⚠️ Sessão pode estar inválida. Reiniciando...');
        await client.sendMessage(
            config.numeroDono + '@c.us',
            '⚠️ A sessão foi detectada como inválida. O bot será reiniciado.'
        );
        process.exit(1);
    }
});

client.initialize();


module.exports = client;
