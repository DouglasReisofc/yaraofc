const axios = require("axios");
const config = require("../dono/config.json");
const moment = require('moment-timezone');
const fs = require('fs');
const client = require('../client.js');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const siteapi = config.siteapi;
const numerobot = config.numeroBot;

async function fetchHorapgFromAPI() {
    try {
        const response = await axios.get(`${siteapi}/horapg/bot/${numerobot}`);
        if (response.data && Array.isArray(response.data.horapg)) {
            return response.data.horapg;
        }
    } catch (error) {
        // erro silencioso
    }
    return [];
}

async function storeHorapg(groupId, data = {}) {
    try {
        await axios.post(`${siteapi}/group/${groupId}/horapg`, data);
        return true;
    } catch (err) {
        return false;
    }
}

async function updateLastSent(groupId, lastSentAt) {
    try {
        await axios.patch(`${siteapi}/group/${groupId}/horapg/last-sent`, {
            last_sent_at: lastSentAt,
        });
    } catch (err) {
        // erro silencioso
    }
}

async function deleteHorapg(groupId) {
    try {
        await axios.delete(`${siteapi}/group/${groupId}/horapg`);
    } catch (err) {
        // erro silencioso
    }
}


function obterHorarioAtual() {
    const agora = moment.tz('America/Sao_Paulo');
    agora.subtract(0, 'hours');

    const hora = agora.hours();
    const minuto = agora.minutes().toString().padStart(2, '0');
    const horarioAtual = `${hora.toString().padStart(2, '0')}:${minuto}`;



    return horarioAtual;
}


function gerarHorariosAleatorios(horaBase, minIntervalo = 0, maxIntervalo = 59) {
    function gerarHorarioAleatorio(minutosInicio, minutosFim) {
        const minutoAleatorio = Math.floor(Math.random() * (minutosFim - minutosInicio + 1)) + minutosInicio;
        return `${horaBase}:${minutoAleatorio.toString().padStart(2, '0')}`;
    }

    const plataformas = [
        "🐯 FORTUNE TIGER", "🐉 DRAGON LUCK", "🐰 FORTUNE RABBIT", "🐭 FORTUNE MOUSE",
        "🐘 GANESHA GOLD", "👙 BIKINI", "🥊 MUAY THAI", "🎪 CIRCUS", "🐂 FORTUNE OX",
        "💰 DOUBLE FORTUNE", "🐉🐅 DRAGON TIGER LUCK", "🧞 GENIE'S WISHES(GENIO)",
        "🌳🌲 JUNGLE DELIGHT", "🐷 PIGGY GOLD", "👑 MIDAS FORTUNE", "🌞🌛 SUN & MOON",
        "🦹‍♂️ WILD BANDITO", "🔥🕊️ PHOENIX RISES", "🛒 SUPERMARKET SPREE",
        "🚢👨‍✈️ CAPTAIN BOUNTY", "🎃 MISTER HOLLOWEEN", "🍀💰 LEPRECHAUN RICHES"
    ];

    const horarios = plataformas.map(plataforma => ({
        name: plataforma,
        times: Array.from({ length: 7 }, () => {
            const primeiroHorario = gerarHorarioAleatorio(minIntervalo, maxIntervalo);
            const segundoHorario = gerarHorarioAleatorio(minIntervalo, maxIntervalo);
            return `${primeiroHorario} - ${segundoHorario}`;
        })
    }));

    return horarios;
}


function compararHorarios(horario1, horario2) {
    const [hora1, minuto1] = horario1.split(':').map(Number);
    const [hora2, minuto2] = horario2.split(':').map(Number);

    if (hora1 > hora2) return 1;
    if (hora1 < hora2) return -1;
    if (minuto1 > minuto2) return 1;
    if (minuto1 < minuto2) return -1;
    return 0;
}


function buscarHorarios(horarioAtual) {
    try {
        const horaBase = horarioAtual.split(':')[0];
        const horariosGerados = gerarHorariosAleatorios(horaBase, 0, 59);
        let mensagem = `🍀 *SUGESTÃO DE HORÁRIOS PAGANTES DAS ${horaBase}* 💰\n\n`;
        horariosGerados.forEach(section => {
            mensagem += `${section.name}\n`;
            section.times.forEach(time => {
                mensagem += `   ${time}\n`;
            });
            mensagem += '\n';
        });
        mensagem += `\nDica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!\n🔞NÃO INDICADO PARA MENORES🔞\nLembrando a todos!\nHorários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...`;
        mensagem += `\n\nSistema By: Aurora\nCreat: Aurora Bot Oficial`;

        return mensagem;
    } catch (err) {
        return null;
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function converterIntervaloParaMs(intervalo) {
    const regex = /^(\d+)([hm])$/;
    const match = intervalo.match(regex);
    if (!match) return null;

    const quantidade = parseInt(match[1], 10);
    const unidade = match[2];

    if (unidade === 'h') {
        return quantidade * 60 * 60 * 1000;
    } else if (unidade === 'm') {
        return quantidade * 60 * 1000;
    }
    return null;
}

async function verificarHorariosEEnviarMensagens() {
    const timestampAtual = moment.tz('America/Sao_Paulo').valueOf();
    const imagensPath = "./db/bet/imagens.json";

    if (!fs.existsSync(imagensPath)) {
        return;
    }

    let imagensConfig;
    try {
        imagensConfig = JSON.parse(fs.readFileSync(imagensPath, "utf-8"));
    } catch (err) {
        return;
    }

    const registros = await fetchHorapgFromAPI();

    for (const registro of registros) {
        const grupoId = registro.group_identifier;
        if (!grupoId) continue;

        if (registro.ativado && registro.intervalo) {
            const intervaloMs = converterIntervaloParaMs(registro.intervalo);
            if (intervaloMs === null) continue;

            const ultimaNotificacao = registro.last_sent_at
                ? moment.tz(registro.last_sent_at, 'America/Sao_Paulo').valueOf()
                : null;

            if (!ultimaNotificacao || (timestampAtual - ultimaNotificacao) >= intervaloMs) {
                const horarioAtual = obterHorarioAtual();
                const mensagem = buscarHorarios(horarioAtual);

                const defaultImage = "https://raw.githubusercontent.com/DouglasReisofc/imagensplataformas/refs/heads/main/global.jpeg";
                const imagemUrl = imagensConfig[grupoId]?.imagem || defaultImage;

                if (mensagem) {
                    try {
                        const media = await MessageMedia.fromUrl(imagemUrl);
                        await client.sendMessage(grupoId, media, { caption: mensagem });
                    } catch (err) {
                        try {
                            const media = await MessageMedia.fromUrl(defaultImage);
                            await client.sendMessage(grupoId, media, { caption: mensagem });
                        } catch (fallbackErr) {
                            // falha silenciosa
                        }
                    }
                } else {
                    try {
                        await client.sendMessage(grupoId, "_❲❗❳   Desculpe, Sem Horário Atualmente_");
                    } catch (err) {
                        // erro silencioso
                    }
                }

                const nowIso = moment.tz('America/Sao_Paulo').toISOString();
                await updateLastSent(grupoId, nowIso);

                await sleep(2000);
            }
        }
    }
}


setInterval(verificarHorariosEEnviarMensagens, 60000);


const fileName = path.basename(__filename);
const file = require.resolve(__filename);
let timeout;
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        delete require.cache[file];
        require(file);
    }, 2000);
});

module.exports = {
    obterHorarioAtual,
    buscarHorarios,
    verificarHorariosEEnviarMensagens,
    fetchHorapgFromAPI,
    storeHorapg,
    updateLastSent,
    deleteHorapg
};
