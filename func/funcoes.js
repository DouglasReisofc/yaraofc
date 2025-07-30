
const client = require('../client.js'); const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const config = require('../dono/config.json');
const chalk = require('chalk');
const gruposPath = './db/grupos/';
const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');
const axios = require('axios');
const API_BASE_URL = config.siteapi;

const TelegramBot = require('node-telegram-bot-api');
const BOT_TOKEN = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"; const CHANNEL_ID = "-1002270297437";
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

async function obterConfiguracaoGrupo(groupId) {
    try {
        const apiUrl = `${API_BASE_URL}/group-settings/${groupId}?apikey=teste`;
        const response = await axios.get(apiUrl);

        if (response.status === 200) {

            return response.data;
        } else {

            return null;
        }
    } catch (error) {
        return null;
    }
}

async function verificarAluguelAtivo(groupId) {
    try {
        const apiUrl = `${API_BASE_URL}/groups/${groupId}?apikey=teste`;
        const response = await axios.get(apiUrl);
        if (response.status === 200) {
            const dadosGrupo = response.data;

            if (dadosGrupo.message && dadosGrupo.message.includes("Grupo não encontrado")) {
                return { ativo: false, validade: '\nSem plano ativo\nCompre seu plano direto no site' };
            }

            const validadePlano = dadosGrupo.user?.will_expire || 'N/A';
            if (validadePlano !== 'N/A') {
                const validadeDate = new Date(validadePlano); const dataAtual = new Date();
                if (validadeDate > dataAtual) {
                    return { ativo: true, validade: moment(validadePlano).format('DD/MM/YYYY HH:mm') };
                } else {
                    return { ativo: false, validade: moment(validadePlano).format('DD/MM/YYYY HH:mm') };
                }
            } else {
                return { ativo: false, validade: 'Não disponível' };
            }
        } else if (response.status === 404) {
            return { ativo: false, validade: '\nGrupo não encontrado. Sem plano ativo.' };
        } else {
            throw new Error(`Erro desconhecido ao acessar os dados do grupo: ${response.status}`);
        }
    } catch (error) {
        return { ativo: false, validade: '\nSem plano ativo\nCompre seu plano direto no site' };
    }
}

async function checkIfAdmin(groupId, userId) {
    try {
        const chat = await client.getChatById(groupId);
        const isAdmin = chat.groupMetadata.participants.some(participant => participant.id._serialized === userId && participant.isAdmin);
        return isAdmin;
    } catch (error) {
        return false;
    }
}

async function checkIfBotAdmin(groupId) {
    try {
        const chat = await client.getChatById(groupId);
        const isBotAdmin = chat.groupMetadata.participants.some(participant => participant.id._serialized === client.info.wid._serialized && participant.isAdmin);
        return isBotAdmin;
    } catch (error) {
        return false;
    }
}

async function antilinkhard(message) {
    const { from, author, links } = message;

    try {
        const configuracaoResponse = await obterConfiguracaoGrupo(from);
        const configuracao = configuracaoResponse ? configuracaoResponse.data : null;

        if (configuracao && Number(configuracao.antilinkhard) === 1) {
            if (links && links.length > 0) {

                const isGroup = from.endsWith('@g.us'); const donoComSuFixo = `${config.numeroDono}@c.us`;
                const isDono = (isGroup && author === donoComSuFixo) || (!isGroup && author === donoComSuFixo);
                const isGroupAdmins = isGroup ? await checkIfAdmin(from, author) : false;
                const isBotAdmin = isGroup ? await checkIfBotAdmin(from) : false;


                let userType = 'Membro Comum'; if (isDono) userType = 'Dono';
                else if (isGroupAdmins) userType = 'Admin';

                let messageText = '';
                let mentionIds = [];
                let displayName = author;
                if (isDono || isGroupAdmins) {
                    messageText = `*${author.replace('@c.us', '')}*, você não pode ser banido do grupo porque é um ${userType}.`;
                    mentionIds = [author];
                } else {
                    messageText = `*${author.replace('@c.us', '')}*, você está sendo punido por quebrar as regras desse grupo ao enviar um link. *Avadakedavra!*`;
                    mentionIds = [author];
                }

                if (!isBotAdmin && Number(configuracao.antilinkhard) === 1) {
                    const group = await client.getChatById(from);
                    const admins = group.groupMetadata.participants.filter(p => p.isAdmin).map(p => p.id._serialized);
                    const adminsMessage = `*ATENÇÃO:* O bot não tem permissão para banir usuários, por favor, verifique se ele é um administrador do grupo.`;
                    await client.sendMessage(from, adminsMessage, { mentions: admins });
                    return;
                }

                if (!(isDono || isGroupAdmins)) {
                    await message.delete(true);
                }


                if (!(isDono || isGroupAdmins)) {
                    try {
                        const group = await client.getChatById(from);
                        await group.removeParticipants([author]);
                        console.log(`Usuário ${author} banido do grupo ${from}.`);
                    } catch (error) {
                        console.error(`Erro ao banir o usuário ${author}:`, error.message);
                    }
                }
            } else {
            }
        } else {
        }
    } catch (error) {
    }
}


async function antilink(message) {
    const { from, author, links } = message;

    try {
        const configuracaoResponse = await obterConfiguracaoGrupo(from);
        const configuracao = configuracaoResponse ? configuracaoResponse.data : null;

        if (configuracao && Number(configuracao.antilink) === 1) {
            if (links && links.length > 0) {
                const linksDetectados = links
                    .map(link => link.link);
                if (linksDetectados.length > 0) {
                    const isGroup = from.endsWith('@g.us'); const donoComSuFixo = `${config.numeroDono}@c.us`;
                    const isDono = (isGroup && author === donoComSuFixo) || (!isGroup && author === donoComSuFixo);
                    const isGroupAdmins = isGroup ? await checkIfAdmin(from, author) : false;
                    const isBotAdmin = isGroup ? await checkIfBotAdmin(from) : false;

                    let userType = 'Membro Comum'; if (isDono) userType = 'Dono';
                    else if (isGroupAdmins) userType = 'Admin';

                    let messageText = '';
                    let mentionIds = [];
                    let displayName = author;
                    if (isDono || isGroupAdmins) {
                        messageText = `*${author.replace('@c.us', '')}*, Não vou apagar sua mensagem, meu ${userType}.`;
                        mentionIds = [author];
                    } else {
                        messageText = `*${author.replace('@c.us', '')}*, Não envie links aqui, não é permitido, cara poxa!`;
                        mentionIds = [author];
                    }

                    if (!isBotAdmin && Number(configuracao.antilink) === 1) {
                        const group = await client.getChatById(from);
                        const admins = group.groupMetadata.participants.filter(p => p.isAdmin).map(p => p.id._serialized);
                        const adminsMessage = `*ATENÇÃO:* O bot não tem permissão para excluir mensagens. Por favor, verifique se ele é um administrador do grupo.`;
                        await client.sendMessage(from, adminsMessage, { mentions: admins });
                        return;
                    }

                    if (!(isDono || isGroupAdmins)) {
                        await message.delete(true);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao verificar antilink para o grupo ${from}:`, error.message);
    }
}


async function antilinkgp(message) {
    const { from, author, links } = message;

    try {
        const configuracaoResponse = await obterConfiguracaoGrupo(from);
        const configuracao = configuracaoResponse ? configuracaoResponse.data : null;

        if (configuracao && Number(configuracao.antilinkgp) === 1) {
            if (links && links.length > 0) {
                const linksWhatsApp = links
                    .map(link => link.link).filter(link => link.startsWith('https://chat.whatsapp.com/'));
                if (linksWhatsApp.length > 0) {
                    const isGroup = from.endsWith('@g.us'); const donoComSuFixo = `${config.numeroDono}@c.us`;
                    const isDono = (isGroup && author === donoComSuFixo) || (!isGroup && author === donoComSuFixo);
                    const isGroupAdmins = isGroup ? await checkIfAdmin(from, author) : false;
                    const isBotAdmin = isGroup ? await checkIfBotAdmin(from) : false;

                    let userType = 'Membro Comum'; if (isDono) userType = 'Dono';
                    else if (isGroupAdmins) userType = 'Admin';

                    let messageText = '';
                    let mentionIds = [];
                    let displayName = author;
                    if (isDono || isGroupAdmins) {
                        messageText = `*${author.replace('@c.us', '')}*, Não vou apagar sua mensagem, meu ${userType}.`;
                        mentionIds = [author];
                    } else {
                        messageText = `*${author.replace('@c.us', '')}*, Não envie links de grupos aqui, não é permitido, cara poxa!`;
                        mentionIds = [author];
                    }

                    if (!isBotAdmin && Number(configuracao.antilinkgp) === 1) {
                        const group = await client.getChatById(from);
                        const admins = group.groupMetadata.participants.filter(p => p.isAdmin).map(p => p.id._serialized);
                        const adminsMessage = `*ATENÇÃO:* O bot não tem permissão para excluir mensagens. Por favor, verifique se ele é um administrador do grupo.`;
                        await client.sendMessage(from, adminsMessage, { mentions: admins });
                        return;
                    }

                    if (!(isDono || isGroupAdmins)) {
                        await message.delete(true);
                    }
                }
            } else {

            }
        }
    } catch (error) {
        console.error(`Erro ao verificar antilinkgp para o grupo ${from}:`, error.message);
    }
}


async function simi1(message) {
    const { from, author, body, links } = message;

    try {
        if (!body || body.trim().length === 0) return;
        if (body.startsWith(config.prefixo)) return;
        if (links && links.length > 0) return;

        const configuracaoResponse = await obterConfiguracaoGrupo(from);
        const configuracao = configuracaoResponse ? configuracaoResponse.data : null;

        if (configuracao && Number(configuracao.simi1) === 1) {
            if (author !== client.info.wid._serialized) {
                const chat = await message.getChat(); chat.sendStateTyping(); await chat.sendSeen();
                const apiKey = 'xxxxxxxxxxxxxxxxxx';

                if (!apiKey) {
                    return await client.sendMessage(message.from, '❌ Ocorreu um erro na configuração do bot.');
                }

                const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
                const requestBody = {
                    model: 'llama3-8b-8192',
                    messages: [{
                        role: 'user',
                        content: `me responda com mensagem curta em português br sobre isso pode ser vulgar se quiser e não responda com texto inicial personalizado do tipo "aqui vai uma resposta" ou algo assim "eu entendi que você.." apenas me responda algo sobre isso: ${body}`
                    }]
                };

                const response = await axios.post(apiUrl, requestBody, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });

                if (response.data && response.data.choices && response.data.choices.length > 0) {
                    const resposta = response.data.choices[0].message.content;
                    await client.sendMessage(message.from, resposta);
                } else {
                    await client.sendMessage(message.from, 'Desculpe, não consegui processar sua mensagem.');
                }
            }
        }
    } catch (error) {
        await client.sendMessage(message.from, '❌ Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde!');
    }
}






async function autoresposta(message) {
    const { from, body, links } = message;

    try {
        if (links && links.length > 0) {
            return;
        }

        const configuracaoResponse = await obterConfiguracaoGrupo(from);
        const configuracao = configuracaoResponse ? configuracaoResponse.data : null;

        if (configuracao && Number(configuracao.autoresposta) === 1) {
            const mensagemEmMinusculo = body.toLowerCase();
            const nomeBot = config.nomeBot.toLowerCase();
            if (mensagemEmMinusculo.includes('bot') || mensagemEmMinusculo.includes(nomeBot)) {
                const frasesBot = [
                    `Oi delícia😏, me chamou? Para usar meus comandos, meu prefixo é ${config.prefixo}`,
                    `Oi amor da minha vida🤎, meu prefixo para você é ${config.prefixo}. Como posso te ajudar?`,
                    `Oi princesa do meu coração! Estou aqui para te servir, use meu prefixo ${config.prefixo}`,
                    `O que se quer? 😎 Estou aqui, use o prefixo ${config.prefixo} para comandos`,
                    `Diga pessoa mais linda como posso ajudar? Meu prefixo é ${config.prefixo}`,
                    `Estou de folga, atrapalha não 🌴🏖, mas se precisar, use meu prefixo ${config.prefixo}`,
                    `No momento estou sem sinal, deixe seu recado após o bip...BIP📞. Use o prefixo ${config.prefixo}`
                ];

                const respostaAleatoriaBot = frasesBot[Math.floor(Math.random() * frasesBot.length)];
                await client.sendMessage(message.from, respostaAleatoriaBot);
                return;
            }

            if (mensagemEmMinusculo.includes('boa tarde')) {
                const frasesBoaTarde = [
                    "Boa tarde! Que a sua tarde seja tão brilhante quanto o seu sorriso. 😄☀️",
                    "Que a energia positiva continue com você pelo resto do dia. Boa tarde! 🌞✨",
                    "Boa tarde! Continue firme nos seus objetivos. Você está indo muito bem! 💪🌟",
                    "Que a sua tarde seja produtiva e cheia de realizações. Boa tarde! 📝🏆",
                    "Boa tarde! Nunca é tarde para recomeçar e fazer a diferença. 🌻💫",
                    "Desejo uma tarde maravilhosa e repleta de bons momentos. Boa tarde! 🌺😊",
                    "Boa tarde! Que a paz e a felicidade te acompanhem pelo resto do dia. 🕊️💖",
                    "Continue espalhando sua luz e alegria. Boa tarde! 🌟😊",
                    "Boa tarde! Que a sua tarde seja leve e cheia de boas surpresas. 🌼🌈",
                    "Desejo uma tarde produtiva e inspiradora para você. Boa tarde! ✨💼"
                ];

                const fraseAleatoria = frasesBoaTarde[Math.floor(Math.random() * frasesBoaTarde.length)];
                await client.sendMessage(message.from, fraseAleatoria);
                return;
            }

            if (mensagemEmMinusculo.includes('bom dia')) {
                const frasesBomDia = [
                    "Bom dia! Que hoje você encontre força e inspiração para realizar todos os seus sonhos. 🌟💪",
                    "Cada novo dia é uma nova chance para ser melhor. Bom dia! 🌅✨",
                    "Que o seu dia seja tão brilhante quanto o seu sorriso. Bom dia!",
                    "Bom dia! Acorde com determinação e vá dormir com satisfação. 🌞💼",
                    "Que seu dia seja repleto de boas energias e conquistas. Bom dia! 🌻🏆",
                    "Hoje é um novo dia, um novo começo. Aproveite ao máximo! Bom dia! 🌄🌈",
                    "Bom dia! Que você tenha muitas razões para sorrir hoje. 😊🌺",
                    "Comece o dia com gratidão e grandes expectativas. Bom dia! 🙏🌸",
                    "Que hoje você se sinta abençoado e inspirado. Bom dia! 🌞✨",
                    "Bom dia! Que seus sonhos se tornem realidade hoje. 🌟🌼",
                    "Desejo um dia cheio de sucesso e realizações. Bom dia! 🏆🌺",
                    "Aproveite cada momento do seu dia. Bom dia! ⏰💖",
                    "Que seu dia seja leve e cheio de alegria. Bom dia! 🌼",
                    "Bom dia! Que a felicidade seja sua companheira hoje. 😊🌞",
                    "Que você tenha um dia maravilhoso e produtivo. Bom dia! 🌟📝",
                    "Comece o dia acreditando que tudo é possível. Bom dia! 🌄💫",
                    "Bom dia! Que a positividade esteja presente em cada instante. 🌻✨",
                    "Acorde com um sorriso e espalhe alegria. Bom dia! 😄🌼",
                    "Que o seu dia seja incrível e abençoado. Bom dia! 🙏🌟",
                    "Bom dia! Que a paz e o amor estejam com você hoje. 🕊️💖"
                ];

                const fraseAleatoria = frasesBomDia[Math.floor(Math.random() * frasesBomDia.length)];
                await client.sendMessage(message.from, fraseAleatoria);
                return;
            }

            if (mensagemEmMinusculo.includes('boa noite')) {
                const frasesBoaNoite = [
                    "Boa noite! Que seu descanso seja tranquilo e seus sonhos maravilhosos. 🌙✨",
                    "Que a paz e a serenidade te envolvam esta noite. Boa noite! 🕊️🌟",
                    "Boa noite! Que as estrelas iluminem seu caminho até o sono. ⭐💤",
                    "Desejo uma noite de paz e tranquilidade para você. Boa noite! 🌜🌸",
                    "Boa noite! Que você acorde revigorado e cheio de energia. 🌛✨",
                    "Que a sua noite seja de sonhos lindos e revigorantes. Boa noite! 🌠😴",
                    "Boa noite! Que os anjos cuidem do seu sono. 💤🌟",
                    "Descanse bem e tenha uma noite maravilhosa. Boa noite! 🌙💫",
                    "Boa noite! Que a escuridão traga a calmaria necessária para o seu descanso. 🌜🌼",
                    "Que você tenha um sono tranquilo e revigorante. Boa noite! 🌛💤"
                ];

                const fraseAleatoria = frasesBoaNoite[Math.floor(Math.random() * frasesBoaNoite.length)];
                await client.sendMessage(message.from, fraseAleatoria);
                return;
            }

            if (mensagemEmMinusculo.includes('dono')) {
                const numeroDono = config.numeroDono;
                await client.sendMessage(message.from, `Aqui está o número do meu dono: \nhttps://wa.me/${numeroDono}`);
                return;
            }

            if (mensagemEmMinusculo.includes('prefixo')) {
                const prefixo = config.prefixo;
                await client.sendMessage(message.from, `Esse é meu prefixo: ${prefixo}`);
                return;
            }
        }
    } catch (error) {
    }
}

function abrirOuFecharGp() {
    setInterval(async () => {
        try {
            const agora = moment().tz('America/Sao_Paulo').format('HH:mm');
            const urlHorarios = `${API_BASE_URL}/horarios?apikey=teste`;
            const response = await axios.get(urlHorarios);

            if (response.status !== 200 || !response.data.success) {
                return;
            }

            const listaGrupos = response.data.horarios;
            for (const grupo of listaGrupos) {
                const groupId = grupo.group_id;
                const abrirgp = grupo.abrirgp;
                const fechargp = grupo.fechargp;


                const horaAbrir = abrirgp ? abrirgp.slice(0, 5) : null;
                const horaFechar = fechargp ? fechargp.slice(0, 5) : null;

                if (horaAbrir && horaAbrir === agora) {
                    try {
                        const chat = await client.getChatById(groupId);
                        await chat.setMessagesAdminsOnly(false);
                        console.log(`[${agora}] Grupo ${groupId} ABERTO automaticamente.`);
                    } catch (err) {
                        console.error(`Erro ao abrir grupo ${groupId}:`, err);
                    }
                }
                if (horaFechar && horaFechar === agora) {
                    try {
                        const chat = await client.getChatById(groupId);
                        await chat.setMessagesAdminsOnly(true);
                    } catch (err) {
                    }
                }
            }

        } catch (error) {
            console.error('Erro ao verificar horários para abrir/fechar grupos:', error);
        }
    }, 60 * 1000);
    return { success: true, message: 'Monitoramento iniciado.' };
}


async function antifake(notification) {
    const { participant } = notification.id;
    const groupId = notification.id.remote;

    try {

        const configuracaoResponse = await obterConfiguracaoGrupo(groupId);
        const configuracao = configuracaoResponse ? configuracaoResponse.data : null;

        if (configuracao) {
        }


        const antifakeEnabled = configuracao && Number(configuracao.antifake) === 1;

        if (antifakeEnabled) {
            if (!participant.startsWith('55')) {
                try {

                    const groupChat = await client.getChatById(groupId);
                    await groupChat.removeParticipants([participant]);
                    await client.sendMessage(groupId, `O usuário ${participant.replace('@c.us', '')} foi banido por usar um número não brasileiro.`);

                } catch (error) {

                }
            } else {

            }
        } else {
        }
    } catch (error) {
    }
}


async function upload(media) {
    try {
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        let ext = 'jpg'; if (media.mimetype && media.mimetype.includes('/')) {
            ext = media.mimetype.split('/')[1];
        }
        const filename = `${Date.now()}.${ext}`;
        const filePath = path.join(tempDir, filename);

        fs.writeFileSync(filePath, media.data, 'base64');

        let sentMessage;

        if (media.mimetype.startsWith("image/")) {
            sentMessage = await bot.sendPhoto(CHANNEL_ID, filePath);
        } else if (media.mimetype.startsWith("video/")) {
            sentMessage = await bot.sendVideo(CHANNEL_ID, filePath);
        } else if (media.mimetype.startsWith("audio/")) {
            sentMessage = await bot.sendAudio(CHANNEL_ID, filePath);
        } else if (media.mimetype.startsWith("application/")) {
            sentMessage = await bot.sendDocument(CHANNEL_ID, filePath);
        } else {
            sentMessage = await bot.sendDocument(CHANNEL_ID, filePath);
        }

        fs.unlinkSync(filePath);

        const fileId = sentMessage.photo ? sentMessage.photo[sentMessage.photo.length - 1].file_id :
            sentMessage.document ? sentMessage.document.file_id :
                sentMessage.video ? sentMessage.video.file_id :
                    sentMessage.audio ? sentMessage.audio.file_id : null;

        const fileLink = await bot.getFileLink(fileId);

        return fileLink;

    } catch (error) {
        console.error(`Erro ao enviar mídia para o Telegram: ${error.message}`);
        throw new Error(`Erro ao enviar mídia para o Telegram: ${error.message}`);
    }
}



async function obterDadosBoasVindasESaida(groupId) {
    try {
        const configuracao = await obterConfiguracaoGrupo(groupId);

        if (configuracao && configuracao.data) {
            const dadosBoasVindas = configuracao.data;


            return {
                bemvindo1: dadosBoasVindas.bemvindo1,
                legendabv1: dadosBoasVindas.legendabv1,
                legendasaiu1: dadosBoasVindas.legendasaiu1,
                fundobemvindo1: dadosBoasVindas.fundobemvindo1,
                fundosaiu1: dadosBoasVindas.fundosaiu1
            };
        } else {

            return null;
        }
    } catch (error) {

        return null;
    }
}

async function alterarBemVindo(groupId, newBemVindoData) {
    try {
        const apiUrl = `${API_BASE_URL}/group-settings/${groupId}?apikey=teste`;

        const response = await axios.get(apiUrl);
        const configuracao = response.data;
        console.log(`Configurações antes da alteração de boas-vindas para o grupo ${groupId}:`, configuracao);

        if (configuracao && configuracao.data) {
            if (newBemVindoData && newBemVindoData.legendabv1) {
                configuracao.data.legendabv1 = newBemVindoData.legendabv1;
                console.log(`Nova legenda de boas-vindas para o grupo ${groupId}:`, configuracao.data.legendabv1);
            }

            const updateResponse = await axios.put(apiUrl, configuracao.data);

            if (updateResponse.status === 200) {
                console.log(`Dados de boas-vindas atualizados para o grupo ${groupId}.`);
                return true;
            } else {
                console.error(`Falha ao atualizar os dados de boas-vindas para o grupo ${groupId}.`);
                return false;
            }
        } else {
            return false;
        }
    } catch (error) {
        console.error(`Erro ao alterar dados de boas-vindas para o grupo ${groupId}:`, error.message);
        return false;
    }
}



async function alterarFuncaoGrupo(groupId, funcIdentifier, value) {
    try {
        const apiUrl = `${API_BASE_URL}/group-settings/${groupId}?apikey=teste`;
        console.log(`Alterando função '${funcIdentifier}' para '${value}' no grupo ${groupId} via API.`);

        const response = await axios.get(apiUrl);
        const configuracao = response.data;
        console.log('Configurações atuais antes da alteração:', configuracao);

        if (!configuracao) {
            console.log(`Configuração para o grupo ${groupId} não encontrada.`);
            return false;
        }

        const funcMap = {
            'ativarbv': 'wellcome[0].bemvindo1',
            'ativarlinkhard': 'antilinkhard',
            'ativarlink': 'antilink',
            'ativarantispam': 'antispam',
            'ativarantifake': 'antifake',
            'ativarsoadm': 'soadm',
            'ativarantilinkgp': 'antilinkgp',
            'ativarsimi1': 'simi1',
            'ativarautoresposta': 'autoresposta',

            'setabrirgp': 'abrirgp',
            'setfechargp': 'fechargp',
            'autoban': 'autoban'
        };

        const propPath = funcMap[funcIdentifier];
        if (!propPath) {
            console.log(`Identificador de função '${funcIdentifier}' não mapeado.`);
            return false;
        }

        function setProperty(obj, path, value) {
            const parts = path.split('.');
            let current = obj;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
                if (arrayMatch) {
                    const arrayName = arrayMatch[1];
                    const index = parseInt(arrayMatch[2], 10);
                    if (!current[arrayName] || !Array.isArray(current[arrayName])) {
                        return false;
                    }
                    current = current[arrayName][index];
                } else {
                    current = current[part];
                }

                if (current === undefined) {
                    return false;
                }
            }

            const lastPart = parts[parts.length - 1];
            current[lastPart] = value;
            return true;
        }

        const success = setProperty(configuracao, propPath, value);
        if (!success) {
            console.log(`Falha ao alterar a propriedade '${propPath}' para o grupo ${groupId}.`);
            return false;
        }

        const updateResponse = await axios.put(apiUrl, configuracao);

        if (updateResponse.status === 200) {
            console.log(`Propriedade '${propPath}' atualizada com sucesso para o grupo ${groupId}.`);
            return true;
        } else {
            console.log(`Falha ao atualizar a configuração. Status: ${updateResponse.status}`);
            return false;
        }

    } catch (error) {
        console.error('Erro na função alterarFuncaoGrupo:', error);
        return false;
    }
}

async function abrirConversa(chatId) {
    if (!chatId) {
        console.error('abrirConversa: chatId indefinido');
        return;
    }
    try {
        const chat = await client.getChatById(chatId);
        if (client.interface && typeof client.interface.openChatWindow === 'function') {
            await client.interface.openChatWindow(chatId);
        } else if (chat && typeof chat.sendSeen === 'function') {
            await chat.sendSeen();
        }
    } catch (error) {
        console.error(`Erro ao abrir conversa do grupo ${chatId}:`, error);
    }
}

/**
 * Tenta obter a mensagem citada sem interromper o fluxo em caso de erro.
 * @param {import('whatsapp-web.js').Message} message Mensagem de origem
 * @returns {Promise<import('whatsapp-web.js').Message|null>} Mensagem citada ou null
 */
async function getQuotedMessageSafe(message) {
    if (!message || !message.hasQuotedMsg) return null;
    try {
        return await message.getQuotedMessage();
    } catch (err) {
        console.error('Erro ao recuperar mensagem citada:', err);
        return null;
    }
}

/**
 * Envia uma mensagem garantindo que o chat esteja acessível.
 * Reabre a conversa e tenta novamente em caso de erro de serialização.
 * @param {import('whatsapp-web.js').Client} client Cliente do WhatsApp
 * @param {string} chatId ID do chat de destino
 * @param {string} content Conteúdo da mensagem
 * @param {import('whatsapp-web.js').MessageSendOptions} [options]
 */
async function sendMessageReliable(client, chatId, content, options = {}) {
    try {
        const state = await client.getState().catch(() => null);
        if (state !== 'CONNECTED') {
            console.warn('Cliente não conectado, mensagem não enviada.');
            return;
        }
        const result = await client.sendMessage(chatId, content, options);
        console.log('sendMessageReliable result:', result);
    } catch (err) {
        if (err.message && err.message.includes('serialize')) {
            try {
                await abrirConversa(chatId);
                const retryResult = await client.sendMessage(chatId, content, options);
                console.log('sendMessageReliable retry result:', retryResult);
                return;
            } catch (err2) {
                console.error('Falha ao reabrir o chat e reenviar mensagem:', err2);
            }
        }
        console.error(`Erro ao enviar mensagem para ${chatId}:`, err);
    }
}





module.exports = {
    verificarAluguelAtivo,
    antilink,
    antilinkhard,
    abrirOuFecharGp,
    antilinkgp,
    simi1,
    autoresposta,
    checkIfAdmin,
    checkIfBotAdmin,
    antifake,
    upload,
    obterDadosBoasVindasESaida,
    alterarFuncaoGrupo,
    alterarBemVindo,
    obterConfiguracaoGrupo,
    abrirConversa,
    getQuotedMessageSafe,
    sendMessageReliable,
};
