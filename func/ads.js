const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const axios = require('axios');
const moment = require('moment-timezone');
const path = require('path');

// Inicialização do cliente WhatsApp
const client = require('../client.js'); // Verifique se o caminho está correto
const config = require('../dono/config.json'); // Verifique se o caminho está correto
const AD_FILE_PATH = path.join(__dirname, '../db/ads/ads.json');

const numerobot = config.numeroBot;

// Definição do fuso horário
const TIMEZONE = "America/Sao_Paulo";

// Flag para evitar execuções concorrentes
let isProcessing = false;

// Função para parsear intervalos (1h, 30m, 10s) com extra texto
function parseInterval(intervalStr) {
    // Use regex para extrair o número e a unidade do início da string
    const regex = /^(\d+)\s*([hdms])/i;
    const match = intervalStr.match(regex);
    if (!match) throw new Error('Intervalo inválido: ' + intervalStr);

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'h': return moment.duration(value, 'hours');
        case 'd': return moment.duration(value, 'days');
        case 'm': return moment.duration(value, 'minutes');
        case 's': return moment.duration(value, 'seconds');
        default: throw new Error('Unidade de intervalo desconhecida: ' + unit);
    }
}

// Função para carregar os anúncios do arquivo JSON
function loadAds() {
    if (fs.existsSync(AD_FILE_PATH)) {
        const data = fs.readFileSync(AD_FILE_PATH, 'utf-8');
        try {
            const parsed = JSON.parse(data);
            if (!parsed.ads || !Array.isArray(parsed.ads)) {
                //console.log(`[${moment().tz(TIMEZONE).format()}] A estrutura do JSON está incorreta. Retornando lista vazia.`);
                return { ads: [] };
            }
            return parsed;
        } catch (error) {
            //console.log(`[${moment().tz(TIMEZONE).format()}] Erro ao ler o arquivo de anúncios. Retornando lista vazia. Erro: ${error.message}`);
            return { ads: [] };
        }
    }
    //console.log(`[${moment().tz(TIMEZONE).format()}] Arquivo de anúncios não encontrado. Retornando lista vazia.`);
    return { ads: [] };
}

// Função para salvar os anúncios no arquivo JSON
function saveAds(adsObj) {
    fs.writeFileSync(AD_FILE_PATH, JSON.stringify(adsObj, null, 2));
    //console.log(`[${moment().tz(TIMEZONE).format()}] Anúncios salvos no arquivo. Total de anúncios: ${adsObj.ads.length}`);
}

// Função para atualizar 'last_sent_at' na API
async function updateAdLastSentAtInAPI(adId, lastSentAt) {
    try {
        await axios.put(`https://bottechwpp.com/ads/${adId}/update-last-sent`, {
            last_sent_at: lastSentAt
        });
        //console.log(`[${moment().tz(TIMEZONE).format()}] 'last_sent_at' atualizado na API para o anúncio ID ${adId}.`);
    } catch (error) {
        //console.error(`[${moment().tz(TIMEZONE).format()}] Erro ao atualizar 'last_sent_at' na API para o anúncio ID ${adId}:`, error.message);
    }
}

// Função para verificar se o anúncio está elegível para envio
function canSendAd(ad) {
    const now = moment.tz(TIMEZONE);
    const lastSentAt = ad.last_sent_at ? moment.tz(ad.last_sent_at, TIMEZONE) : null;
    let duration;

    try {
        duration = parseInterval(ad.interval);
    } catch (error) {
        //console.error(`[${now.format()}] Anúncio ID ${ad.id} possui intervalo inválido: "${ad.interval}". Erro: ${error.message}`);
        return { eligible: false, remainingTime: null };
    }

    if (!lastSentAt) {
        //console.log(`[${now.format()}] Anúncio ID ${ad.id} nunca foi enviado. Está elegível para envio.`);
        return { eligible: true, remainingTime: null };
    }

    const diff = now.diff(lastSentAt, 'milliseconds');
    if (diff >= duration.asMilliseconds()) {
        //console.log(`[${now.format()}] Anúncio ID ${ad.id} está elegível para envio. Intervalo "${ad.interval}" cumprido.`);
        return { eligible: true, remainingTime: null };
    } else {
        const remainingTime = moment.duration(duration.asMilliseconds() - diff);
        //console.log(`[${now.format()}] Anúncio ID ${ad.id} não está elegível para envio. Faltam ${remainingTime.minutes()}m ${remainingTime.seconds()}s.`);
        return { eligible: false, remainingTime };
    }
}

// Função para buscar anúncios da API principal e atualizar JSON
async function fetchAdsFromAPI() {
    try {
        const fetchTime = moment().tz(TIMEZONE).format();
        //console.log(`[${fetchTime}] Buscando anúncios da API principal...`);
        const response = await axios.get(`https://bottechwpp.com/ads/bot/${numerobot}`);
        if (!response.data || !Array.isArray(response.data.ads)) {
            //console.log(`[${fetchTime}] Nenhum anúncio encontrado na API principal.`);
            return; // Não sobrescrever o JSON com ads vazios
        }

        // Carregar os anúncios existentes do arquivo JSON
        let adsObj = loadAds();
        let localAds = adsObj.ads;

        // Criar um Map para armazenar os anúncios locais (baseado no ID e grupo)
        const adsMap = new Map();
        localAds.forEach(ad => {
            const key = `${ad.id}-${ad.group_identifier}`;
            adsMap.set(key, ad);
        });

        // Obter os anúncios da API
        const adsFromAPI = response.data.ads;

        // Criar um novo Map para os anúncios da API
        const newAdsMap = new Map();
        adsFromAPI.forEach(apiAd => {
            const key = `${apiAd.id}-${apiAd.group_identifier.trim().toLowerCase()}`;
            newAdsMap.set(key, apiAd);
        });

        // Remover os anúncios locais que não estão mais na API
        localAds.forEach(localAd => {
            const key = `${localAd.id}-${localAd.group_identifier}`;
            if (!newAdsMap.has(key)) {
                //console.log(`[${fetchTime}] Removendo anúncio ID ${localAd.id} do JSON, pois não está mais na API.`);
                adsMap.delete(key); // Remove do Map
            }
        });

        // Mesclar os anúncios da API com os anúncios locais
        adsFromAPI.forEach(apiAd => {
            const key = `${apiAd.id}-${apiAd.group_identifier.trim().toLowerCase()}`;

            // Se o anúncio já existe no Map local, mesclamos os dados
            if (adsMap.has(key)) {
                const localAd = adsMap.get(key);
                // Manter o 'last_sent_at' do JSON local
                apiAd.last_sent_at = localAd.last_sent_at;
                // Mesclar outros campos, se necessário
                Object.assign(localAd, apiAd);
                adsMap.set(key, localAd);
            } else {
                // Caso o anúncio não exista, adicionamos ele novo ao Map
                adsMap.set(key, apiAd);
            }
        });

        // Converter o Map de volta para um array
        adsObj.ads = Array.from(adsMap.values());

        // Salvar o JSON atualizado (substituir totalmente os dados)
        saveAds(adsObj);
        //console.log(`[${fetchTime}] Anúncios atualizados e salvos no JSON.`);
    } catch (error) {
        const errorTime = moment().tz(TIMEZONE).format();
        //console.error(`[${errorTime}] Erro ao buscar anúncios da API principal: ${error.message}`);
    }
}

// Função para enviar o anúncio para o grupo
async function sendAdToGroup(ad, adsObj) {
    const sendTime = moment().tz(TIMEZONE).format();

    try {
        //console.log(`[${sendTime}] Enviando anúncio ID ${ad.id} para o grupo ${ad.group_identifier}...`);

        let media = null;
        if (ad.media_url) {
            try {
                media = await MessageMedia.fromUrl(ad.media_url, { timeout: 10000 }); // Ajuste o timeout conforme necessário
            } catch (mediaError) {
                //console.error(`[${sendTime}] Erro ao baixar mídia para o anúncio ID ${ad.id}: ${mediaError.message}`);
                // Neste exemplo, enviaremos a mensagem de texto mesmo se a mídia falhar
            }
        }

        if (media) {
            //console.log(`[${sendTime}] Enviando mídia com legenda: ${ad.message}`);
            await client.sendMessage(ad.group_identifier, media, { caption: ad.message });
        } else {
            //console.log(`[${sendTime}] Enviando mensagem de texto: ${ad.message}`);
            await client.sendMessage(ad.group_identifier, ad.message);
        }

        // Atualiza 'last_sent_at' no JSON
        const now = moment().tz(TIMEZONE).toISOString();
        const adIndex = adsObj.ads.findIndex(a => a.id === ad.id && a.group_identifier === ad.group_identifier);
        if (adIndex !== -1) {
            adsObj.ads[adIndex].last_sent_at = now;
            saveAds(adsObj);
            //console.log(`[${sendTime}] 'last_sent_at' atualizado localmente para o anúncio ID ${ad.id}.`);
        }

        // Atualiza 'last_sent_at' na API
        await updateAdLastSentAtInAPI(ad.id, now);
    } catch (error) {
        //console.error(`[${sendTime}] Erro ao enviar o anúncio para o grupo ${ad.group_identifier}:`, error.message);
    }
}

// Função para processar todos os anúncios no JSON local de forma sequencial
async function processAds() {
    const adsObj = loadAds();
    const ads = adsObj.ads;

    if (!Array.isArray(ads) || ads.length === 0) {
        const noAdsTime = moment().tz(TIMEZONE).format();
        //console.log(`[${noAdsTime}] Nenhum anúncio para processar.`);
        return;
    }

    const processTime = moment().tz(TIMEZONE).format();
    //console.log(`[${processTime}] Iniciando o envio de ${ads.length} anúncios...`);

    for (let ad of ads) {
        // Verificar se todos os campos necessários estão presentes
        if (!ad.id || !ad.group_identifier || !ad.interval || !ad.message) {
            //console.error(`[${moment().tz(TIMEZONE).format()}] Anúncio com dados faltando: ${JSON.stringify(ad)}`);
            continue; // Pular anúncios com dados faltantes
        }

        const eligibility = canSendAd(ad);
        if (eligibility.eligible) {
            await sendAdToGroup(ad, adsObj);
            // Não adicionamos delay entre envios
        }
    }

    //console.log(`[${moment().tz(TIMEZONE).format()}] Processo de envio de anúncios concluído.`);
}

// Função principal de início do processo
async function startAdProcessing() {
    if (isProcessing) {
        //console.log(`[${moment().tz(TIMEZONE).format()}] Processo de envio já está em andamento. Ignorando chamada.`);
        return;
    }

    isProcessing = true;

    try {
        const startTime = moment().tz(TIMEZONE).format();
        //console.log(`[${startTime}] Iniciando o processo de envio de anúncios...`);
        await fetchAdsFromAPI();
        await processAds();
    } catch (error) {
        //console.error(`[${moment().tz(TIMEZONE).format()}] Erro no processo de envio de anúncios:`, error.message);
    } finally {
        isProcessing = false;
    }
}

// Definir intervalo para processar os anúncios a cada 60 segundos
setInterval(startAdProcessing, 60000); // 60 segundos (60000 ms)

// Iniciar imediatamente ao rodar o script
startAdProcessing();

// Exportar a função startAdProcessing
module.exports = { startAdProcessing };
