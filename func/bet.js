const moment = require('moment-timezone');
const fs = require('fs');
const client = require('../client.js');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');


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
    const horariosPath = "./db/bet/horarios.json";
    const imagensPath = "./db/bet/imagens.json";


    if (!fs.existsSync(horariosPath)) {
        return;
    }
    if (!fs.existsSync(imagensPath)) {
        return;
    }

    let horariosGrupos, imagensConfig;
    try {
        horariosGrupos = JSON.parse(fs.readFileSync(horariosPath, "utf-8"));
        imagensConfig = JSON.parse(fs.readFileSync(imagensPath, "utf-8"));
    } catch (err) {
        return;
    }

    let atualizado = false;

    for (let grupoId in horariosGrupos) {
        const grupo = horariosGrupos[grupoId];

        if (grupo.ativado && grupo.intervalo) {
            const intervaloMs = converterIntervaloParaMs(grupo.intervalo);
            if (intervaloMs === null) {
                continue;
            }

            const ultimaNotificacao = grupo.ultimaNotificacao
                ? moment.tz(grupo.ultimaNotificacao, 'America/Sao_Paulo').valueOf()
                : null;

            if (!ultimaNotificacao || (timestampAtual - ultimaNotificacao) >= intervaloMs) {
                const horarioAtual = obterHorarioAtual();
                const mensagem = buscarHorarios(horarioAtual);


                const imagemUrl = imagensConfig[grupoId]?.imagem
                    || "https://raw.githubusercontent.com/DouglasReisofc/imagensplataformas/refs/heads/main/global.jpeg";

                if (mensagem) {
                    try {

                        const media = await MessageMedia.fromUrl(imagemUrl);
                        await client.sendMessage(grupoId, media, { caption: mensagem });
                    } catch (err) {
                        console.error(`Erro ao enviar imagem personalizada para grupo ${grupoId}: ${err.message}`);
                        try {

                            const media = await MessageMedia.fromUrl("https://raw.githubusercontent.com/DouglasReisofc/imagensplataformas/refs/heads/main/global.jpeg");
                            await client.sendMessage(grupoId, media, { caption: mensagem });
                        } catch (fallbackErr) {
                            console.error(`Erro ao enviar imagem padrão: ${fallbackErr.message}`);
                        }
                    }
                } else {
                    try {
                        await client.sendMessage(grupoId, "_❲❗❳   Desculpe, Sem Horário Atualmente_");
                    } catch (err) {
                        console.error(`Erro ao enviar mensagem de ausência de horários para grupo ${grupoId}: ${err.message}`);
                    }
                }

                grupo.ultimaNotificacao = moment.tz('America/Sao_Paulo').toISOString();
                atualizado = true;

                await sleep(2000);
            }
        }
    }

    if (atualizado) {
        try {
            fs.writeFileSync(horariosPath, JSON.stringify(horariosGrupos, null, 2), "utf-8");
        } catch (err) {
            console.error(`Erro ao atualizar o arquivo de horários: ${err.message}`);
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
    verificarHorariosEEnviarMensagens
};
