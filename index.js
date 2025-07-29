const client = require('./client.js');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const Poll = require('whatsapp-web.js').Poll;
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const chalk = require('chalk');
const moment = require('moment-timezone');
const config = require('./dono/config.json');
const { obterHorarioAtual, buscarHorarios, verificarHorariosEEnviarMensagens } = require('./func/bet.js');
const { processTikTokMedia, processKwaiMedia, downloadVideoFromYouTube, downloadAudioFromYouTube } = require('./func/downloader.js');
const os = require('os');
const ping = require('ping');
const ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
const { spawn } = require('child_process');
const sharp = require('sharp');
const ffmpegPath = 'ffmpeg';
const { exec } = require('child_process');
const BodyForm = require('form-data');
const usuariosRespondidos = new Set();




const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = config.portaexpres;
const siteapi = config.siteapi;
const apikeysite = config.apikeysite;
const nomedoBot = config.nomeBot;
const numerobot = config.numeroBot


const { startAdProcessing } = require('./func/ads.js');

const {
  obterConfiguracaoGrupo,
  criarConfiguracaoGrupo,
  alterarFuncaoGrupo,
  obterDadosBoasVindasESaida,
  antilink,
  antilinkhard,
  abrirOuFecharGp,
  antilinkgp,
  antifake,
  simi1,
  autoresposta,
  checkIfBotAdmin,
  alterarBemVindo,
  checkIfAdmin,
  upload,
  verificarAluguelAtivo,
  abrirConversa
} = require('./func/funcoes.js');
const {
  criarMetadadoGrupo,
  atualizarMembrosGrupo,
  consultarMetadadoGrupo
} = require('./func/metadados.js');
const textos = require('./db/textos/global.json');
const {
  criarSorteio,
  adicionarParticipante,
  removerParticipante,
  finalizarSorteio,
  verificarSorteioAtivo,
  carregarSorteios,
  verificarSorteiosAtivos,
  iniciarVerificacaoSorteiosAtivos
} = require('./func/sorteio.js');

const mimeTypes = [
  { formato: 'pdf', link: 'application/pdf' },
  { formato: 'xml', link: 'application/octet-stream' },
  { formato: 'zip', link: 'application/zip' },
  { formato: 'js', link: 'application/octet-stream' },
  { formato: 'json', link: 'application/octet-stream' },
  { formato: 'jpg', link: 'image/jpeg' },
  { formato: 'ppt', link: 'application/vnd.ms-powerpoint' },
  { formato: 'pptx', link: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { formato: 'apk', link: 'application/vnd.android.package-archive' },
  { formato: 'txt', link: 'text/plain' },
  { formato: 'aac', link: 'audio/aac' },
  { formato: 'm4a', link: 'audio/mp4' },
  { formato: 'mp4', link: 'video/mp4' },
  { formato: 'mp3', link: 'audio/mpeg' },
  { formato: 'gif', link: 'image/gif' },
  { formato: 'svg', link: 'image/svg+xml' },
  { formato: 'png', link: 'image/png' }
];

function getMimeFromExtension(ext) {
  const found = mimeTypes.find(mt => mt.formato === ext.toLowerCase());
  return found ? found.link : null;
}

app.use(fileUpload());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const modosoadm = "Somente Admins podem Realizar comandos ";
const msgsogrupo = "Este comando só pode ser usado em grupos";
const msgsodono = "Este comando é de uso exclusivo do Dono";
const msgadmin = "Você precisa ser admin do Grupo para realizar esse comando";



client.on('ready', () => {
  iniciarVerificacaoSorteiosAtivos();
  verificarHorariosEEnviarMensagens();
  startAdProcessing();
  abrirOuFecharGp();
});



client.on('message', async (msg) => {

  if (msg.body === '!updatebot' && msg.hasMedia) {

    const media = await msg.downloadMedia();

    if (media.mimetype === 'application/javascript') { // Verifica se é um arquivo .js
      const filePath = './index.js'; // Caminho do arquivo no servidor
      fs.writeFile(filePath, media.data, 'base64', (err) => {
        if (err) {
          msg.reply('❌ Erro ao atualizar o bot!');
          console.error(err);
        } else {
          msg.reply('✅ Bot atualizado com sucesso! Recarregando...');
          recarregarBot();
        }
      });
    } else {
      msg.reply('⚠️ Envie um arquivo válido (`index.js`)!');
    }
  }
});

// Função para recarregar o bot via PM2
function recarregarBot() {
  exec('pm2 reload yara', (err, stdout, stderr) => {
    if (err) {
      console.error(`Erro ao recarregar: ${err}`);
    }
    console.log(`Bot recarregado: ${stdout}`);
  });
}

client.on('group_participants.update', async (update) => {
  try {
    const grupoId = update.id; // Ex: 12036...@g.us
    const action = update.action;
    const participantes = update.participants;

    // Apenas quando alguém for adicionado
    if (action === 'add') {
      // Consulta no banco usando o ID com @g.us (coluna correta é 'groupId')
      const configGrupo = await db('groups').where({ groupId: grupoId }).first();

      // Verifica se o AutoBan está ativado para esse grupo
      if (configGrupo?.autoban === 1) {
        for (const participante of participantes) {
          const numero = participante.replace('@c.us', '');

          // Verifica se o número é da Indonésia
          if (numero.startsWith('62')) {
            try {
              // Remove o participante do grupo
              await client.groupParticipantsUpdate(grupoId, [participante], 'remove');
              console.log(`[AutoBan] Indonésio removido do grupo ${grupoId}`);
            } catch (error) {
              console.error(`[AutoBan] Erro ao banir ${participante}:`, error.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[AutoBan] Erro geral no evento:', err.message);
  }
});

client.on('group_update', (notification) => {
  console.log('Group Update:', notification);
  if (notification.announcement) {
    console.log(`O grupo foi fechado: ${notification.announcement}`);
  }
  if (notification.description) {
    console.log(`Descrição do grupo foi alterada: ${notification.description}`);
  }
  if (notification.restrict) {
    console.log(`O grupo foi configurado para apenas administradores enviar mensagens: ${notification.restrict}`);
  }
});

client.on('group_admin_changed', (notification) => {
  console.log('Group Admin Changed:', notification);
});


client.on('group_join', async (notification) => {
  await antifake(notification);

  const groupId = notification.id.remote;
  const participant = notification.recipientIds[0];

  try {

    const chat = await client.getChatById(groupId);
    const groupName = chat.name;
    const configuracaoGrupo = await obterDadosBoasVindasESaida(groupId);

    if (!configuracaoGrupo) {

      return;
    }

    const { bemvindo1, legendabv1, fundobemvindo1 } = configuracaoGrupo;

    if (bemvindo1) {
      const mensagemBoasVindas = legendabv1
        .replace('#tempo#', moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm'))
        .replace('#numerodele#', participant.split('@')[0])
        .replace('#nomedogp#', groupName);

      const mention = participant;

      if (fundobemvindo1 && fundobemvindo1.startsWith('http')) {

        try {
          const media = await MessageMedia.fromUrl(fundobemvindo1);


          await client.sendMessage(groupId, media, {
            caption: mensagemBoasVindas,
            mentions: [mention],
          });


        } catch (imageError) {
          console.error('Erro ao carregar a imagem:', imageError.message);
          await client.sendMessage(groupId, mensagemBoasVindas, {
            mentions: [mention],
          });

        }
      } else {
        await client.sendMessage(groupId, mensagemBoasVindas, {
          mentions: [mention],
        });

      }
    } else {

    }
  } catch (error) {
    console.error('Erro ao processar evento de entrada no grupo:', error.message);
  }
});





client.on('group_leave', (notification) => {
  console.log('Group Leave:', notification);
});

client.on('change_state', (state) => {
  console.log('Change State:', state);
});

app.post('/send-group-message', async (req, res) => {
  console.log('Solicitação recebida:', JSON.stringify(req.body, null, 2));

  const { groupId, message, mark_all, image_url, video_url, caption } = req.body;

  console.log('Parâmetros recebidos:');
  console.log('groupId:', groupId);
  console.log('message:', message);
  console.log('mark_all:', mark_all);
  console.log('image_url:', image_url);
  console.log('video_url:', video_url);
  console.log('caption:', caption);

  if (!groupId || (!message && !image_url && !video_url)) {
    return res.status(400).json({
      message: 'ID do grupo, mensagem, imagem ou vídeo são necessários.',
    });
  }

  try {
    const chat = await client.getChatById(groupId);

    if (chat.isGroup) {
      const participants = chat.participants;

      let media = null;
      if (image_url || video_url) {
        let mediaUrl = image_url || video_url; let mimeType = null;

        const urlParts = mediaUrl.split('.');
        const extension = urlParts[urlParts.length - 1].toLowerCase();
        mimeType = getMimeFromExtension(extension);

        console.log(`Tipo MIME da mídia: ${mimeType}`);

        media = await MessageMedia.fromUrl(mediaUrl, {
          unsafeMime: true,
          filename: `file.${extension}`
        });

        if (media) {
          let mentions = [];
          if (mark_all) {
            mentions = participants.filter(p => p.id.user).map(p => `${p.id.user}@c.us`);
          }

          await chat.sendMessage(media, {
            caption: caption || message,
            mentions: mentions
          });
          console.log(`Mídia enviada para o grupo ${groupId}: ${mediaUrl} com legenda: ${caption || message}`);
        } else {
          console.error(`Erro ao carregar a mídia da URL: ${mediaUrl}`);
        }
      } else {
        let mentions = [];
        if (mark_all) {
          mentions = participants.filter(p => p.id.user).map(p => `${p.id.user}@c.us`);
        }

        await chat.sendMessage(message, {
          mentions: mentions
        });
        console.log(`Mensagem enviada para o grupo ${groupId}: ${message}`);
      }

      return res.json({
        message: 'Mensagem enviada com sucesso!',
        groupId: groupId,
        sentMessage: message || caption,
        mark_all: mark_all,
        image_url: image_url,
        video_url: video_url,
        caption: caption,
      });
    } else {
      return res.status(400).json({
        message: 'Este ID não pertence a um grupo.',
      });
    }

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return res.status(500).json({
      message: 'Erro ao enviar mensagem.',
      error: error.message,
    });
  }
});


app.post('/groups/join-and-info', async (req, res) => {
  const { inviteLink, groupId } = req.body;

  if (!inviteLink && !groupId) {
    return res.status(400).json({
      message: 'Link de convite ou ID do grupo são necessários.',
    });
  }

  try {
    let finalGroupId;

    if (inviteLink) {
      try {
        finalGroupId = await client.acceptInvite(extractCodeFromInviteLink(inviteLink));
        console.log(`Grupo aceito com sucesso! ID do grupo: ${finalGroupId}`);
      } catch (acceptError) {
        if (groupId) {
          finalGroupId = groupId;
        } else {
          throw new Error('Falha ao aceitar o convite e nenhum ID de grupo fornecido.');
        }
      }
    } else if (groupId) {
      finalGroupId = groupId;
    }
    const groupInfo = await client.getChatById(finalGroupId);
    const groupProfilePicUrl = await client.getProfilePicUrl(finalGroupId);

    const response = {
      message: "Bot entrou no grupo com sucesso!",
      groupInfo: {
        id: groupInfo.id._serialized,
        nome: groupInfo.name || 'Sem nome',
        descricao: groupInfo.description || 'Sem descrição',
        imagemGrupo: groupProfilePicUrl || null,
        dataCriacao: groupInfo.createdAt
          ? moment(groupInfo.createdAt).format('YYYY-MM-DD HH:mm:ss')
          : 'Sem data',
        participantes: groupInfo.participants.length || 0,
      }
    };

    return res.json(response);

  } catch (error) {
    console.error('Erro ao tentar entrar no grupo ou obter informações:', error);
    return res.status(500).json({
      message: 'Erro ao tentar entrar no grupo ou obter informações.',
      error: error.message,
    });
  }
});

function extractCodeFromInviteLink(link) {
  const regex = /(?:https:\/\/chat\.whatsapp\.com\/)([A-Za-z0-9_-]+)/;
  const match = link.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error('Código de convite não encontrado no link.');
}



client.on('message', async (message) => {
  if (!message.from) {
    return;
  }

  const remetente = message.from;
  const isGroup = remetente.endsWith("@g.us");
  const isPrivate = remetente.endsWith("@c.us");

  // Se a mensagem estiver vazia, ignorar
  if (!message.body) {
    return;
  }

  console.log(chalk.blueBright('┌─────────────────────────────────────────┐'));
  console.log(chalk.blueBright('│               DETALHES DA MENSAGEM      │'));
  console.log(chalk.blueBright('├─────────────────────────────────────────┤'));
  console.log(chalk.yellowBright(`│ BOT: ${nomedoBot}`));
  console.log(chalk.yellowBright(`│ Tipo: ${message.type || 'Desconhecido'}`));

  if (isGroup) {
    console.log(chalk.yellowBright(`│ Tipo de Mensagem: Grupo`));
    console.log(chalk.yellowBright(`│ ID do Grupo: ${remetente}`));
  } else {
    console.log(chalk.yellowBright(`│ Tipo de Mensagem: Privado`));
    console.log(chalk.yellowBright(`│ Número do Remetente: ${remetente}`));

    // 📌 Responder apenas uma vez no privado
    if (!usuariosRespondidos.has(remetente)) {
      let respostaPadrao = "🔹 Olá! Sou um robô automatizado para administração de grupos no WhatsApp.\n\n⚠️ Não sou responsável por nenhuma ação tomada no grupo, apenas obedeço comandos programados para auxiliar na moderação.\n\n📌 Se precisar de suporte ou resolver alguma questão, entre em contato com um administrador do grupo.\n\n🔹 Obrigado pela compreensão!";

      try {
        await client.sendMessage(remetente, respostaPadrao);
        usuariosRespondidos.add(remetente);
        console.log(chalk.greenBright(`✅ Resposta enviada para ${remetente}`));
      } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${remetente}:`, error);
      }
    }
  }

  console.log(chalk.greenBright(`│ Conteúdo: ${message.body.slice(0, 50)}`));
  console.log(chalk.blueBright('└─────────────────────────────────────────┘'));

  // 📌 Processar comandos apenas se a mensagem começar com "!"
  if (message.body.startsWith("!")) {
    let command = message.body.split(" ")[0].toLowerCase();

    if (isGroup) {
      switch (command) {
        case '!exemplo':
          await client.sendMessage(message.chatId, "Este é um exemplo de comando funcionando!");
          break;

        // Adicione outros comandos aqui

        default:
          // Não exibir nada se o comando não for reconhecido (apenas ignora)
          break;
      }
    }
  }
});

client.on('message', async (message) => {
  const { body, from, author, timestamp, type, links } = message;

  const donoComSuFixo = `${config.numeroDono}@c.us`;
  const isGroup = from.endsWith('@g.us');

  const chat = await client.getChatById(from);

  await chat.sendSeen();



  const isDono = (isGroup && author === donoComSuFixo) || (!isGroup && from === donoComSuFixo);
  const isGroupAdmins = isGroup ? await checkIfAdmin(from, author) : false;
  const aluguelStatus = await verificarAluguelAtivo(from);
  const isSoadm = await obterConfiguracaoGrupo(from).then(response => {
    if (response && response.success) {
      const soadmValue = response.data.soadm;
      return soadmValue;
    }
    return null;
  });

  // 🔹 Função para obter o ID interno do grupo

  async function obterIdInternoDoGrupo(gus) {

    try {
      console.log(`Buscando ID interno para o grupo: ${gus}`);
      const response = await axios.get(`https://bottechwpp.com/api/obter-id/${gus}`);

      if (response.status === 200 && response.data.id) {
        console.log(`ID interno encontrado: ${response.data.id}`);
        return response.data.id; // Retorna o ID interno correto
      } else {
        console.error("Grupo não encontrado no banco.");
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar ID interno:", error);
      return null;
    }
  }

  // 🔹 Função para buscar a mensagem da tabela
  // 🔹 Função para obter a mensagem da tabela
  async function obterMensagemTabela(grupoId) {
    try {
      console.log(`🔎 Buscando mensagem para o grupo: ${grupoId}`);

      const response = await axios.get(`https://bottechwpp.com/api/tabela/${grupoId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log("✅ Resposta da API:", response.data);

      // Garante que response.data é um objeto e contém a chave 'mensagem'
      if (response.data && typeof response.data === 'object' && 'mensagem' in response.data) {
        return response.data.mensagem;
      } else {
        return "⚠ Nenhuma mensagem encontrada.";
      }
    } catch (error) {
      console.error("❌ Erro ao obter a mensagem:", error.response ? error.response.data : error.message);
      return "🚨 Erro ao obter a mensagem.";
    }
  }

  // 🔹 Função para atualizar a mensagem no banco de dados
  async function atualizarMensagemTabela(grupoId, novaMensagem) {
    try {
      console.log("📤 Enviando atualização para API...");
      console.log("🆔 Grupo ID:", grupoId);
      console.log("✉️ Mensagem enviada:", novaMensagem);

      // Verifica se a mensagem ultrapassa o limite de caracteres
      const limiteCaracteres = 1500;
      if (novaMensagem.length > limiteCaracteres) {
        return `⚠️ Sua mensagem ultrapassa o limite de ${limiteCaracteres} caracteres! ✂️\n\n📏 Tente reduzir o tamanho.`;
      }

      const response = await axios.post('https://bottechwpp.com/api/tabela', {
        group_id: grupoId, // Agora está correto
        mensagem_tabela: novaMensagem
      });

      console.log("✅ Resposta da API:", response.data);

      if (response.status === 200) {
        return "✅ Mensagem atualizada com sucesso! 🎉";
      } else {
        return "⚠️ Falha ao atualizar a mensagem. Tente novamente! 🔄";
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar a mensagem:", error.response ? error.response.data : error.message);

      // Se a API retornar erro de caracteres, envia um aviso específico
      if (error.response && error.response.data && error.response.data.detalhes?.includes("must not be greater than")) {
        return `🚨 Sua mensagem é muito grande! O limite é de 1500 caracteres. 📝\n\n⚠️ Reduza o tamanho e tente novamente!`;
      }

      return "❌ Erro ao atualizar a mensagem. Verifique a conexão e tente novamente. 🔄";
    }
  }

  console.log(chalk.blueBright('┌─────────────────────────────────────────┐'));
  console.log(chalk.blueBright('│               DETALHES DA MENSAGEM      │'));
  console.log(chalk.blueBright('├─────────────────────────────────────────┤'));
  console.log(chalk.yellowBright(`│ BOT: ${nomedoBot}`));
  console.log(chalk.yellowBright(`│ Tipo: ${type || 'Desconhecido'}`));
  console.log(chalk.yellowBright(`│ Links: ${links && links.length > 0 ? links.map(link => link.link).join(', ') : ' '}`));

  if (isGroup) {
    console.log(chalk.yellowBright(`│ Tipo de Mensagem: Grupo`));
    console.log(chalk.yellowBright(`│ ID do Grupo: ${from}`));
    let metadados = consultarMetadadoGrupo(from);

    if (!metadados) {
      console.log(chalk.yellow(`Metadados não encontrados para o grupo ${from}, criando...`));
      const groupName = chat.name;
      const groupAdmins = chat.groupMetadata ? chat.groupMetadata.participants.filter(p => p.isAdmin).map(admin => admin.id._serialized) : [];
      const groupMembers = chat.participants.map(participant => participant.id._serialized);

      const novosMetadados = {
        groupId: from,
        groupName: groupName,
        admins: groupAdmins,
        membros: groupMembers,
      };

      criarMetadadoGrupo(from, groupName, groupMembers, groupAdmins);
      metadados = novosMetadados;
      console.log(chalk.greenBright(`Metadados criados para o grupo: ${JSON.stringify(novosMetadados)}`));
    } else {
      console.log(chalk.greenBright(`│ Nome do Grupo: ${metadados.groupName || 'Sem nome'}`));
      console.log(chalk.greenBright(`│ Membros do Grupo: ${metadados.membros.length}`));
      console.log(chalk.greenBright(`│ Administradores do Grupo: ${metadados.admins.length}`));
    }

    let userType = 'Membro Comum';
    if (isDono) {
      userType = 'Dono';
    } else if (isGroupAdmins) {
      userType = 'Admin';
    }

    console.log(chalk.yellowBright(`│ Tipo de Usuário: ${userType}`));

    let configuracaoGrupo = obterConfiguracaoGrupo(from);
    if (!configuracaoGrupo) {
      const groupName = chat.name;
      criarConfiguracaoGrupo(from, groupName);
      configuracaoGrupo = obterConfiguracaoGrupo(from);
    }

    console.log(chalk.yellowBright(`│ Número do Remetente: ${author || 'Desconhecido'}`));
  } else {
    console.log(chalk.yellowBright(`│ Tipo de Mensagem: Privado`));
    console.log(chalk.yellowBright(`│ Número do Remetente: ${from || 'Desconhecido'}`));
  }
  const formattedTimestamp = new Date(timestamp * 1000).toLocaleString();
  console.log(chalk.greenBright(`│ Timestamp: ${formattedTimestamp}`));
  console.log(chalk.greenBright(`│ Conteúdo: ${body.slice(0, 50)}`));
  console.log(chalk.blueBright('└─────────────────────────────────────────┘'));

  if (isGroup) {
    await antilink(message);
    await antilinkhard(message);
    await antilinkgp(message);
    await simi1(message);
    await autoresposta(message);
  }

  if (!body.startsWith(config.prefixo)) return;

  chat.sendStateTyping();

  const prefixo = config.prefixo;
  const q = body.slice(config.prefixo.length).trim().split(' ');
  const cmd = q[0].toLowerCase();
  const args = body.slice(config.prefixo.length).trim().split(' ');


  const msgaluguel = `乂ALUGUEL VENCIDO乂
  ━━━━━━━━━━━━━━━━━━
  ╭──────────────
  ┇     ${aluguelStatus.validade}  
  ╰────────────── 
  ━━━━━━━━━━━━━━━━━━`;

  switch (cmd) {
    case 'menu':
      if (!isGroup) {
        await message.reply("Este comando só pode ser usado em grupos.");
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const txtmenu = `
      ╭──────────────
      ┇   *乂 M E N U  P R I N C I P A L 乂*\n  
      ╰──────────────  
        
  𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒\n
  ${prefixo}id — _exibe o id do grupo_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}ban — _Responda a mensagem do usuário com o comando_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}ativarbv 1 — _Use 1 para ativar o bem-vindo ou 0 para desativar_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}legendabv — _Coloque seu texto e responda a mensagem com o comando_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}fundobv — envie uma mensagem e responda ela com esse comando para trocar a imagem de bem-vindo
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}addads\n adicionar anuncios automaticos no grupo
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}listads\n Listar os anuncios criados
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}rmads\n apagar anuncios criados
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}allg\n Menciona todos do grupo com sua mensagem, pode usar imagens videos e etc tmbm
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}sorteio _Descrição e tempo_ \n
  _Exemplo:_\n
  ${prefixo}sorteio uma casa|10m\n
  _Pode usar s, m, h simbolizando segundos, minutos ou horas_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}sorteio2 — _Sorteia alguem aletório do grupo_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}banextremo — _Bane qualquer usuário que não seja admin, se colocar qualquer link no grupo_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}banlinkgp — _Bane somente quem colocar link de grupos_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}antilinkgp — _Só apaga links de usuários que enviam links de grupos, mas não bane_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}antilink — _Só apaga os links , mas não bane_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}botinterage — _Bot começa a interagir a qualquer mensagem no grupo, use ${prefixo}botinterage 1 para ativar e 0 para desativar _\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}autoresposta — _Responde somente a algumas mensagens como , boa tarde, bom dia use ${prefixo}autoresposta 1 para ativar  ou 0 para desativar_\n
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}abrirgp - abre o grupo
  ${prefixo}fechargp - fecha o grupo
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}addhorapg ativa sistema de notificações de horarios pagantes
  ${prefixo}conselhos
  ${prefixo}conselhos2
  ${prefixo}piada
  ${prefixo}sorte
  ━━━━━━━━━━━━━━━━━━━
  ${prefixo}play
  ${prefixo}ytmp3 
  ${prefixo}ytmp4
  ${prefixo}tiktok
  ${prefixo}kwai`;

      await message.reply(txtmenu);
      break;

    case 'serverip':
    case 'meuip':
      if (!isGroup) {
        await message.reply("Este comando só pode ser usado em grupos.");
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const ipApiUrl = 'https://api.ipify.org?format=json';

      try {
        const response = await axios.get(ipApiUrl);
        const ipData = response.data;

        await message.reply(`🌐 *IP Público do Servidor:* ${ipData.ip || 'N/A'}`);
      } catch (error) {
        console.error('Erro ao buscar o IP público do servidor:', error);
        await message.reply("❌ Não foi possível obter o IP público do servidor. Tente novamente mais tarde.");
      }
      break;

    case '!updatebot':
      if (msg.hasMedia) {
        const media = await msg.downloadMedia();

        if (media.mimetype === 'application/javascript') { // Verifica se é um arquivo .js
          const filePath = './index.js'; // Caminho do arquivo no servidor
          fs.writeFile(filePath, media.data, 'base64', (err) => {
            if (err) {
              msg.reply('❌ Erro ao atualizar o bot!');
              console.error(err);
            } else {
              msg.reply('✅ Bot atualizado com sucesso! Recarregando...');
              reiniciarBot();
            }
          });
        } else {
          msg.reply('⚠️ Envie um arquivo válido (`index.js`)!');
        }
      } else {
        msg.reply('⚠️ Você precisa anexar um arquivo `index.js` para atualizar o bot!');
      }
      break;

    case 'id':
      if (!isGroup) {
        await message.reply("Este comando só pode ser usado em grupos.");
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      await message.reply(from);
      break;


    case 'listads':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      try {
        const iddogrupo = from; const response = await axios.get(`https://bottechwpp.com/ads/${iddogrupo}`);

        const ads = response.data.ads;
        if (ads && ads.length > 0) {
          let replyMessage = '📢 *Anúncios encontrados:* 📢\n\n';

          ads.forEach(ad => {
            const limitedMessage = ad.message.split(' ').slice(0, 2).join(' ');

            replyMessage += `🟢 *ID:* ${ad.id}\n`;
            replyMessage += `⏰ *Intervalo:* ${ad.interval}\n`;
            replyMessage += `💬 *Mensagem:* ${limitedMessage}\n`;
            replyMessage += '━━━━━━━━━━━━━━━━━━\n';
          });

          await message.reply(replyMessage);
        } else {
          await message.reply("❌ *Nenhum anúncio encontrado no momento.*");
        }
      } catch (error) {
        console.error(error);
        await message.reply("⚠️ *Erro:* Não tem nenhum anúncio ativo no momento.");
      }
      break;


    case 'rmads':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2) {
        await message.reply("Por favor, forneça o ID do anúncio para excluir. Exemplo: !rmads <ID_do_Anuncio>");
        return;
      }

      const adId = args[1];
      try {
        const response = await axios.get(`https://bottechwpp.com/ads/${from}`);

        if (response.status === 200) {
          const groupId = response.data.group_id;
          const ad = response.data.ads.find(a => a.id === parseInt(adId));

          if (ad) {
            if (groupId === from) {
              const deleteResponse = await axios.get(`https://bottechwpp.com/ads/delete/${adId}`);

              if (deleteResponse.status === 200) {
                await message.reply(`Anúncio com ID ${adId} excluído com sucesso.`);
              } else {
                await message.reply("Não foi possível excluir o anúncio. Tente novamente mais tarde.");
              }
            } else {
              await message.reply("Este anúncio não pertence a este grupo, portanto não pode ser excluído.");
            }
          } else {
            await message.reply("Anúncio não encontrado. Verifique o ID e tente novamente.");
          }
        } else {
          await message.reply("Não foi possível encontrar o anúncio. Tente novamente mais tarde.");
        }
      } catch (error) {
        console.error(error);
        await message.reply("Houve um erro ao tentar excluir o anúncio. Tente novamente mais tarde.");
      }
      break;




    case 'ativarbv':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      if (args.length < 2) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!ativarbv 1`");
        return;
      }

      console.log('Argumentos da mensagem:', args);

      const ativarBV = args[1] === '1';
      const sucessoBV = alterarBemVindo(from, { bemvindo1: ativarBV });

      if (sucessoBV) {
        await message.reply(`Funcionalidade de boas-vindas ${ativarBV ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração. Por favor, verifique os logs.");
      }
      break;



    case 'legendabv':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      const novoTexto = args.join(" "); alterarBemVindo(from, { legendabv1: novoTexto }); await message.reply(`Texto de boas-vindas alterado para: ${novoTexto}`);
      break;



    case 'fundobv':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();

        if (quotedMsg.hasMedia) {
          try {
            const media = await quotedMsg.downloadMedia();
            const imageUrl = await upload(media); alterarBemVindo(from, { fundobemvindo: imageUrl });

            await client.sendMessage(from, media, { caption: "Fundo de boas-vindas alterado com sucesso!" });

          } catch (error) {
            await message.reply(`Erro ao tentar fazer o upload da imagem: ${error.message}`);
          }
        } else {
          await message.reply("A mensagem citada não contém mídia.");
        }
      } else {
        await message.reply("Você precisa responder a uma mensagem com mídia para usar este comando.");
      }
      break;



    case 'fundosaiu':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();

        if (quotedMsg.hasMedia) {
          try {
            const media = await quotedMsg.downloadMedia();
            const imageUrl = await upload(media); alterarBemVindo(from, { fundosaiu: imageUrl });

            await client.sendMessage(from, media, { caption: "Fundo de saída alterado com sucesso!" });

          } catch (error) {
            await message.reply(`Erro ao tentar fazer o upload da imagem: ${error.message}`);
          }
        } else {
          await message.reply("A mensagem citada não contém mídia.");
        }
      } else {
        await message.reply("Você precisa responder a uma mensagem com mídia para usar este comando.");
      }
      break;

    case 'legendasaiu':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();

        if (quotedMsg.body) {
          const novaLegenda = quotedMsg.body.trim();
          alterarBemVindo(from, { legendasaiu: novaLegenda });

          await message.reply(`Legenda de saída alterada para: "${novaLegenda}"`);

        } else {
          await message.reply("A mensagem citada não contém texto.");
        }
      } else {
        await message.reply("Você precisa responder a uma mensagem com um texto para usar este comando e definir a legenda");
      }
      break;

    case 'statuslegendasaiu':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      const ativacaoLegendaSaiu = args[0] === '1';
      alterarBemVindo(from, { statuslegendasaiu: ativacaoLegendaSaiu });

      await message.reply(`A legenda de saída foi ${ativacaoLegendaSaiu ? 'ativada' : 'desativada'} com sucesso.`);
      break;




    case 'antilinkhard':
    case 'banextremo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!antilinkhard 1`");
        return;
      }

      const ativarAntilinkHard = args[1] === '1';
      const sucessoAntilinkHard = await alterarFuncaoGrupo(from, 'ativarlinkhard', ativarAntilinkHard);

      if (sucessoAntilinkHard) {
        await message.reply(`Funcionalidade de Antilink Hard ${ativarAntilinkHard ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração. Por favor, verifique os logs.");
      }
      break;


    case 'antilink':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!antilink 1`");
        return;
      }


      const ativarAntilink = args[1] === '1';


      const sucessoAntilink = await alterarFuncaoGrupo(from, 'ativarlink', ativarAntilink);


      if (sucessoAntilink) {
        await message.reply(`Funcionalidade de Antilink ${ativarAntilink ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração. Por favor, verifique os logs.");
      }
      break;

    case 'autoban':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }

      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      const parametros = message.body.split(' ');

      if (parametros.length < 2 || !['0', '1'].includes(parametros[1])) {
        await message.reply("Por favor, use `!autoban 1` para ativar ou `!autoban 0` para desativar.\nExemplo: `!autoban 1`");
        return;
      }

      const ativarAutoBan = parametros[1] === '1' ? 1 : 0;
      const sucessoAutoBan = await alterarFuncaoGrupo(from, 'autoban', ativarAutoBan);

      if (sucessoAutoBan) {
        await message.reply(`AutoBan da Indonésia ${ativarAutoBan ? 'ativado' : 'desativado'}.`);
      } else {
        await message.reply("Houve um erro ao salvar a configuração. Verifique os logs ou o banco de dados.");
      }
      break;

    case 'ativarantifake':
    case 'antifake':
    case 'bangringo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      const params = message.body.split(' ');

      if (params.length < 2 || !['0', '1'].includes(params[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!ativarantifake 1`");
        return;
      }

      const ativarAntifake = params[1] === '1';
      const sucessoAntifake = alterarFuncaoGrupo(from, 'ativarantifake', ativarAntifake);

      if (sucessoAntifake) {
        await message.reply(`Funcionalidade de Antifake ${ativarAntifake ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração. Por favor, verifique os logs.");
      }
      break;

    case 'antilinkgp':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!antilinkgp 1`");
        return;
      }

      const ativarAntilinkgp = args[1] === '1';
      const sucessoAntilinkgp = await alterarFuncaoGrupo(from, 'ativarantilinkgp', ativarAntilinkgp);

      if (sucessoAntilinkgp) {
        await message.reply(`Funcionalidade autoresposta ${ativarAntilinkgp ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração");
      }
      break;


    case 'simi':
    case 'botinterage':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!simi1 1`");
        return;
      }

      const ativarsimi1 = args[1] === '1';
      const sucessosimi1 = await alterarFuncaoGrupo(from, 'ativarsimi1', ativarsimi1);

      if (sucessosimi1) {
        await message.reply(`Funcionalidade de botinterage ${ativarsimi1 ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração");
      }
      break;



    case 'autoresposta':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!autoresposta 1`");
        return;
      }

      const ativarautoresposta = args[1] === '1';
      const sucessoautoresposta = await alterarFuncaoGrupo(from, 'ativarautoresposta', ativarautoresposta);

      if (sucessoautoresposta) {
        await message.reply(`Funcionalidade autoresposta ${ativarautoresposta ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração");
      }
      break;


    case 'apagar':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      if (message.hasQuotedMsg) {
        try {
          const quotedMsg = await message.getQuotedMessage();


          const quotedMessageId = quotedMsg.id._serialized;

          await quotedMsg.delete(true);
        } catch (error) {
        }
      }
      break;

    case 'ban':
    case 'mban':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (message.hasQuotedMsg) {
        try {
          const quotedMsg = await message.getQuotedMessage();
          const quotedAuthor = quotedMsg.author || quotedMsg.from;

          if (quotedAuthor) {
            console.log(`Banindo o participante ${quotedAuthor}`);

            const group = await message.getChat();
            await group.removeParticipants([quotedAuthor]);

            await message.reply(`O participante ${quotedAuthor.replace('@c.us', '')} foi banido do grupo por motivos justos!`);

            const quotedMessageId = quotedMsg.id._serialized;
            await quotedMsg.delete(true);
          } else {
            await message.reply('Não foi possível identificar o participante citado para o banimento.');
          }
        } catch (error) {
          console.error('Erro ao tentar processar o banimento:', error);
          await message.reply('Ocorreu um erro ao tentar banir o participante.');
        }

      } else if (message.mentionedIds.length > 0) {
        try {
          const mentionedUser = message.mentionedIds[0]; console.log(`Banindo o participante ${mentionedUser}`);

          const group = await message.getChat();
          await group.removeParticipants([mentionedUser]);

          await message.reply(`O participante ${mentionedUser.replace('@c.us', '')} foi banido do grupo por motivos justos!`);

          await message.delete(true);
        } catch (error) {
          console.error('Erro ao tentar banir o participante mencionado:', error);
          await message.reply('Ocorreu um erro ao tentar banir o participante mencionado.');
        }

      } else if (message.body.match(/^\d{11,15}$/)) {
        try {
          const userNumber = message.body.replace(/\D/g, ''); console.log(`Banindo o participante ${userNumber}`);

          const group = await message.getChat();
          await group.removeParticipants([`${userNumber}@c.us`]);

          await message.reply(`O participante ${userNumber} foi banido do grupo por motivos justos!`);

          await message.delete(true);
        } catch (error) {
          console.error('Erro ao tentar banir o participante pelo número:', error);
          await message.reply('Ocorreu um erro ao tentar banir o participante pelo número.');
        }

      } else {
        await message.reply('Por favor, responda a uma mensagem, mencione um participante ou forneça o número para banir!');
      }
      break;




    case 'sorteio':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }

      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length === 1) {
        await message.reply("Para utilizar o comando !sorteio, você deve especificar a descrição, o tempo de duração, o número de ganhadores e, opcionalmente, o número de participantes. Exemplo:\n\n!sorteio <Descrição> | <Duração> | <Número de Ganhadores> | <Limite de Participantes>\n\nExemplo: !sorteio 'Sorteio de 10 Casas de Luxo' | 10m | 1 | 50\n\nOnde:\n- <Descrição>: Título ou descrição do sorteio.\n- <Duração>: Tempo de duração do sorteio (ex: 10s para 10 segundos, 5m para 5 minutos, 1h para 1 hora).\n- <Número de Ganhadores>: Quantos ganhadores o sorteio terá (opcional, padrão é 1).\n- <Limite de Participantes>: Limite de participantes (opcional, padrão é 0, sem limite).");
        return;
      }

      const sorteioArgs = args.slice(1).join(' ').trim().split('|');
      if (sorteioArgs.length < 2) {
        await message.reply("Para utilizar o comando !sorteio, você deve especificar a descrição, o tempo de duração, o número de ganhadores e, opcionalmente, o número de participantes. Exemplo:\n\n!sorteio <Descrição> | <Duração> | <Número de Ganhadores> | <Limite de Participantes>\n\nExemplo: !sorteio 'Sorteio de 10 Casas de Luxo' | 10m | 1 | 50\n\nOnde:\n- <Descrição>: Título ou descrição do sorteio.\n- <Duração>: Tempo de duração do sorteio (ex: 10s para 10 segundos, 5m para 5 minutos, 1h para 1 hora).\n- <Número de Ganhadores>: Quantos ganhadores o sorteio terá (opcional, padrão é 1).\n- <Limite de Participantes>: Limite de participantes (opcional, padrão é 0, sem limite).");
        return;
      }

      const tituloSorteio = sorteioArgs[0].trim();
      const duracaoStr = sorteioArgs[1].trim();
      const numGanhadores = sorteioArgs[2] ? parseInt(sorteioArgs[2].trim(), 10) : 1; const limiteParticipantes = sorteioArgs[3] ? parseInt(sorteioArgs[3].trim(), 10) : 0;
      const converterDuracao = (duracao) => {
        const regex = /(\d+)([smh])/;
        const match = duracao.match(regex);
        if (!match) return 0;

        const quantidade = parseInt(match[1], 10);
        const unidade = match[2];

        switch (unidade) {
          case 's': return quantidade;
          case 'm': return quantidade * 60;
          case 'h': return quantidade * 60 * 60;
          default: return 0;
        }
      };

      const duracaoSorteio = converterDuracao(duracaoStr);
      if (duracaoSorteio <= 0) {
        await client.sendMessage(from, "A duração fornecida não é válida. Use o formato: <Número><s/m/h>, por exemplo: 10s para 10 segundos, 5m para 5 minutos ou 1h para 1 hora.");
        return;
      }

      const sorteioAtivo = await verificarSorteioAtivo(from);
      if (sorteioAtivo) {
        await message.reply("Já existe um sorteio ativo neste grupo. Aguarde a finalização do sorteio atual.");
        return;
      }

      const sorteio = criarSorteio(from, tituloSorteio, duracaoSorteio, numGanhadores, limiteParticipantes);

      const options = ["Participar ❤️", "Não Participar 😬"];

      if (chat.isGroup) {
        const participants = chat.participants;
        const pollMessage = await client.sendMessage(from, new Poll(tituloSorteio, options), {
          mentions: participants.map(p => `${p.id.user}@c.us`),
        });

        sorteio.idMensagem = pollMessage.id._serialized;
        criarSorteio(from, tituloSorteio, duracaoSorteio, numGanhadores, limiteParticipantes, pollMessage.id._serialized);
        await abrirConversa(from);

        setTimeout(async () => {
          const sorteioAtual = carregarSorteios().find(s => s.idMensagem === pollMessage.id._serialized);

        }, duracaoSorteio * 1000);
      }
      break;


    case 'sorteio2':
      if (!isGroup) {
        await message.reply(msgsogrupo); return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm); return;
      }

      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin); return;
      }

      const participants = chat.participants;

      if (participants.length === 0) {
        await message.reply("Este grupo não tem participantes!");
        return;
      }

      const vencedor = participants[Math.floor(Math.random() * participants.length)];

      const mentionIds = [vencedor.id._serialized];
      const mensagemSorteio = `🎉 O sorteio foi realizado! 🎉\n\n🏆 *Vencedor:* @${vencedor.id.user} 🏆\n\nParabéns!`;

      await client.sendMessage(from, mensagemSorteio, { mentions: mentionIds });

      break;





    case 'play':
    case 'ytmp3':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }

      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }



      if (args.length === 1) {
        await message.reply("Por favor, forneça o nome ou link do vídeo. Exemplo: !play2 <nome do vídeo ou link>");
        return;
      }

      const videoRequest = args.slice(1).join(' ').trim();

      const isValidUrl = (str) => {
        const regex = /(https?:\/\/[^\s]+)/g;
        return regex.test(str);
      };

      const videoTitle = videoRequest;
      if (isValidUrl(videoTitle)) {
        await downloadAudioFromYouTube(videoTitle, from);
      } else {
        await downloadAudioFromYouTube(videoTitle, from);
      }
      break;

    case 'ytmp4':
    case 'playmp4':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }

      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }


      if (args.length === 1) {
        await message.reply("Por favor, forneça o nome ou link do vídeo. Exemplo: !ytmp4 <nome do vídeo ou link>");
        return;
      }

      const videoQuery = args.slice(1).join(' ').trim();

      const isValidUrll = (str) => {
        const regex = /(https?:\/\/[^\s]+)/g;
        return regex.test(str);
      };

      let searchTitle = videoQuery; let videoUrl = searchTitle;
      if (!isValidUrll(searchTitle)) {
        const searchResults = await yts(searchTitle);
        if (searchResults.videos.length === 0) {
          await message.reply('❌ Nenhum vídeo encontrado para a pesquisa fornecida.');
          return;
        }
        videoUrl = searchResults.videos[0].url;
      }

      await downloadVideoFromYouTube(videoUrl, from);
      break;







      function chunkArray(array, chunk_size) {
        const results = [];
        for (let i = 0; i < array.length; i += chunk_size) {
          results.push(array.slice(i, i + chunk_size));
        }
        return results;
      }

    case 'all':
    case 'allg':
    case 'hidetag':
    case 'marcar':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      try {

        if (chat.isGroup) {
          const participants = chat.participants;

          if (participants.length > 0) {
            const messageText = message.body.slice(5).trim();
            const groupId = chat.id._serialized;
            const mediaFolder = `./midia/${groupId}`;
            const jsonPath = `${mediaFolder}/info.json`;

            if (!fs.existsSync(mediaFolder)) {
              fs.mkdirSync(mediaFolder, { recursive: true });
            }

            async function sendInBatches(content, options) {
              const mentions = participants
                .filter(p => p.id.user)
                .map(p => `${p.id.user}@c.us`);
              const batches = chunkArray(mentions, 500);

              for (const batch of batches) {
                await chat.sendMessage(content, {
                  ...options,
                  mentions: batch,
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }

            if (message.hasQuotedMsg) {
              const quotedMsg = await message.getQuotedMessage();
              if (quotedMsg) {
                if (quotedMsg.hasMedia) {
                  const quotedMedia = await quotedMsg.downloadMedia();
                  const timestamp = Date.now();
                  let fileExt = quotedMedia.mimetype.split('/')[1]; let fileName = `${timestamp}.${fileExt}`;
                  if (quotedMedia.mimetype === 'application/vnd.android.package-archive') {
                    fileExt = 'apk'; fileName = `${timestamp}.${fileExt}`;
                  }

                  const filePath = `${mediaFolder}/${fileName}`;

                  if (fs.existsSync(jsonPath)) {
                    const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    const oldFilePath = `${mediaFolder}/${savedData.filename}`;
                    if (fs.existsSync(oldFilePath)) {
                      fs.unlinkSync(oldFilePath);
                      console.log('Arquivo anterior removido.');
                    }
                  }

                  fs.writeFileSync(filePath, quotedMedia.data, 'base64');

                  const attachmentData = {
                    filename: fileName,
                    mimetype: quotedMedia.mimetype,
                    data: quotedMedia.data.length,
                    message: messageText || quotedMsg.body,
                    path: filePath,
                  };

                  fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));

                  await sendInBatches(quotedMedia, {
                    caption: messageText || quotedMsg.body,
                    mimetype: quotedMedia.mimetype,
                  });
                  console.log('Mídia citada enviada com sucesso em batches.');
                } else {
                  await sendInBatches(quotedMsg.body, {
                  });
                  console.log('Texto citado enviado com sucesso em batches.');
                }
              }
              return;
            }

            if (message.hasMedia) {
              const media = await message.downloadMedia();
              const timestamp = Date.now();
              let fileExt = media.mimetype.split('/')[1]; let fileName = `${timestamp}.${fileExt}`;
              if (media.mimetype === 'application/vnd.android.package-archive') {
                fileExt = 'apk'; fileName = `${timestamp}.${fileExt}`;
              }

              const filePath = `${mediaFolder}/${fileName}`;

              if (fs.existsSync(jsonPath)) {
                const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                const oldFilePath = `${mediaFolder}/${savedData.filename}`;
                if (fs.existsSync(oldFilePath)) {
                  fs.unlinkSync(oldFilePath);
                  console.log('Arquivo anterior removido.');
                }
              }

              fs.writeFileSync(filePath, media.data, 'base64');

              const attachmentData = {
                filename: fileName,
                mimetype: media.mimetype, data: media.data.length,
                message: messageText,
                path: filePath,
              };

              fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));

              await sendInBatches(media, {
                caption: messageText,
                mimetype: media.mimetype,
              });
              console.log('Mídia e texto enviados com sucesso em batches.');
            } else if (messageText) {
              if (fs.existsSync(jsonPath)) {
                const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                const oldFilePath = `${mediaFolder}/${savedData.filename}`;
                if (fs.existsSync(oldFilePath)) {
                  fs.unlinkSync(oldFilePath);
                  console.log('Arquivo anterior removido.');
                }
              }

              const attachmentData = {
                message: messageText,
                path: null,
              };

              fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));

              await sendInBatches(messageText, {
              });
              console.log('Texto enviado com sucesso em batches e mídia apagada.');
            } else {
              if (fs.existsSync(jsonPath)) {
                const attachmentData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

                if (attachmentData.path && fs.existsSync(attachmentData.path)) {
                  const media = await MessageMedia.fromFilePath(attachmentData.path);
                  const mimeType = attachmentData.mimetype || 'application/octet-stream';
                  await sendInBatches(media, {
                    caption: attachmentData.message,
                    mimetype: mimeType,
                  });
                  console.log('Mídia salva enviada com sucesso em batches.');
                } else {
                  if (attachmentData.message) {
                    await sendInBatches(attachmentData.message, {
                    });
                    console.log('Texto salvo enviado com sucesso em batches.');
                  } else {
                    await chat.sendMessage('Nenhuma mídia ou texto salvo para este grupo.');
                    console.log('Nenhum conteúdo encontrado para enviar.');
                  }
                }
              } else {
                await chat.sendMessage('Nenhuma mídia ou texto salvo para este grupo.');
                console.log('Nenhum conteúdo encontrado para enviar.');
              }
            }
          } else {
            await chat.sendMessage('Este grupo não tem participantes!');
            console.log('Grupo sem participantes.');
          }
        }
      } catch (error) {
        console.error('Erro ao tentar enviar a mensagem para todos:', error);
        console.log('Erro ao tentar processar o envio.');
      }
      break;

    case 'all2':
    case 'allg2':
    case 'hidetag2':
    case 'marcar2':
    case 'cita2':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      try {

        if (!chat.isGroup) {
          await message.reply('Este comando só pode ser usado em grupos.');
          break;
        }

        const groupId = chat.id._serialized;
        const groupName = chat.name;
        const groupAdmins = chat.groupMetadata
          ? chat.groupMetadata.participants.filter(p => p.isAdmin).map(admin => admin.id._serialized)
          : [];
        const groupMembers = chat.participants.map(participant => participant.id._serialized);

        const metadadoExistente = consultarMetadadoGrupo(groupId);
        if (metadadoExistente) {
          await atualizarMembrosGrupo(groupId, groupMembers, groupAdmins);
        } else {
          await criarMetadadoGrupo(groupId, groupName, groupMembers, groupAdmins);
        }

        const membersData = consultarMetadadoGrupo(groupId);
        if (!membersData || !membersData.membros) {
          console.error('Não foi possível recuperar os membros armazenados.');
          await message.reply('Erro ao recuperar os membros do grupo.');
          break;
        }

        const MAX_MENTIONS_PER_MESSAGE = 500; const totalMembros = membersData.membros.length;
        const chunks = [];

        for (let i = 0; i < totalMembros; i += MAX_MENTIONS_PER_MESSAGE) {
          chunks.push(membersData.membros.slice(i, i + MAX_MENTIONS_PER_MESSAGE));
        }

        for (const chunk of chunks) {
          const mentionText = chunk.map(id => `@${id.split('@')[0]}`).join(' ');
          const mentions = chunk.map(id => id);

          console.log(`Enviando ${mentions.length} menções: ${mentionText}`);

          await chat.sendMessage(
            `⚠️ ATENÇÃO GRUPO, OLHEM A ÚLTIMA MENSAGEM FIXADA PELO ADMIN ⚠️\n${mentionText.trim()}`,
            { mentions }
          );

          await new Promise(resolve => setTimeout(resolve, 500));
        }


        const mediaFolder = `./midia/${groupId}`;
        const jsonPath = `${mediaFolder}/info.json`;

        if (!fs.existsSync(mediaFolder)) {
          fs.mkdirSync(mediaFolder, { recursive: true });
        }

        if (fs.existsSync(jsonPath)) {
          const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          if (savedData.pinnedMessageId) {
            const msgToUnpin = await client.getMessageById(savedData.pinnedMessageId);
            if (msgToUnpin) {
              await msgToUnpin.unpin();
            }
          }
        }

        const firstSpace = message.body.indexOf(' ');
        let messageText = '';
        if (firstSpace !== -1) {
          messageText = message.body.slice(firstSpace + 1).trim();
        }
        const cleanMessageText = messageText.trim();

        const clearOldMedia = () => {
          if (fs.existsSync(jsonPath)) {
            const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (savedData.filename) {
              const oldFilePath = `${mediaFolder}/${savedData.filename}`;
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
              }
            }
          }
        };

        let pinnedMessage;

        if (message.hasQuotedMsg) {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg) {
            if (quotedMsg.hasMedia) {
              const quotedMedia = await quotedMsg.downloadMedia();
              const timestamp = Date.now();
              let fileExt = quotedMedia.mimetype.split('/')[1];
              let fileName = `${timestamp}.${fileExt}`;
              if (quotedMedia.mimetype === 'application/vnd.android.package-archive') {
                fileExt = 'apk';
                fileName = `${timestamp}.${fileExt}`;
              }
              const filePath = `${mediaFolder}/${fileName}`;
              clearOldMedia();
              fs.writeFileSync(filePath, quotedMedia.data, 'base64');
              const attData = {
                filename: fileName,
                mimetype: quotedMedia.mimetype,
                dataLength: quotedMedia.data.length,
                message: cleanMessageText || quotedMsg.body.trim(),
                path: filePath,
                pinnedMessageId: null
              };
              pinnedMessage = await chat.sendMessage(quotedMedia, {
                caption: attData.message.trim(),
                mimetype: attData.mimetype
              });
              attData.pinnedMessageId = pinnedMessage.id._serialized;
              fs.writeFileSync(jsonPath, JSON.stringify(attData, null, 2));
            } else {
              const cleanQuotedText = quotedMsg.body.trim();
              pinnedMessage = await chat.sendMessage(cleanQuotedText);
              const attData = {
                filename: null,
                mimetype: null,
                dataLength: null,
                message: cleanQuotedText,
                path: null,
                pinnedMessageId: pinnedMessage.id._serialized
              };
              fs.writeFileSync(jsonPath, JSON.stringify(attData, null, 2));
            }
          }
          if (pinnedMessage) {
            await pinnedMessage.pin();
          }
          break;
        }

        if (message.hasMedia) {
          const media = await message.downloadMedia();
          const timestamp = Date.now();
          let fileExt = media.mimetype.split('/')[1];
          let fileName = `${timestamp}.${fileExt}`;
          if (media.mimetype === 'application/vnd.android.package-archive') {
            fileExt = 'apk';
            fileName = `${timestamp}.${fileExt}`;
          }
          const filePath = `${mediaFolder}/${fileName}`;
          clearOldMedia();
          fs.writeFileSync(filePath, media.data, 'base64');
          const attData = {
            filename: fileName,
            mimetype: media.mimetype,
            dataLength: media.data.length,
            message: cleanMessageText,
            path: filePath,
            pinnedMessageId: null
          };
          pinnedMessage = await chat.sendMessage(media, {
            caption: cleanMessageText,
            mimetype: media.mimetype
          });
          attData.pinnedMessageId = pinnedMessage.id._serialized;
          fs.writeFileSync(jsonPath, JSON.stringify(attData, null, 2));
        } else if (cleanMessageText) {
          clearOldMedia();
          const attData = {
            filename: null,
            mimetype: null,
            dataLength: null,
            message: cleanMessageText,
            path: null,
            pinnedMessageId: null
          };
          pinnedMessage = await chat.sendMessage(cleanMessageText);
          attData.pinnedMessageId = pinnedMessage.id._serialized;
          fs.writeFileSync(jsonPath, JSON.stringify(attData, null, 2));
        } else {
          if (fs.existsSync(jsonPath)) {
            const sData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (sData.path && fs.existsSync(sData.path)) {
              const media = await MessageMedia.fromFilePath(sData.path);
              pinnedMessage = await chat.sendMessage(media, {
                caption: (sData.message || '').trim(),
                mimetype: sData.mimetype
              });
              sData.pinnedMessageId = pinnedMessage.id._serialized;
              fs.writeFileSync(jsonPath, JSON.stringify(sData, null, 2));
            } else if (sData.message) {
              pinnedMessage = await chat.sendMessage(sData.message.trim());
              sData.pinnedMessageId = pinnedMessage.id._serialized;
              fs.writeFileSync(jsonPath, JSON.stringify(sData, null, 2));
            } else {
              await chat.sendMessage('Nenhuma mídia ou texto salvo para este grupo.');
            }
          } else {
            await chat.sendMessage('Nenhuma mídia ou texto salvo para este grupo.');
          }
        }

        if (pinnedMessage) {
          await pinnedMessage.pin();
        }
      } catch (error) {
        console.error('Erro ao tentar mencionar todos os participantes:', error);
        await message.reply('Ocorreu um erro ao tentar mencionar todos os participantes.');
      }
      break;


    case 'fixar':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      try {


        if (!chat.isGroup) {
          await message.reply('Este comando só pode ser usado em grupos.');
          return;
        }

        const pinText = message.body.slice(6).trim();

        if (!pinText) {
          await message.reply('Por favor, forneça o texto que deseja fixar.');
          return;
        }

        const pinnedMessage = await chat.sendMessage(`📌 *Mensagem Fixada:*\n\n${pinText}`);

        await pinnedMessage.pin();

        await message.reply('Mensagem fixada com sucesso!');
        console.log('Mensagem fixada com sucesso!');
      } catch (error) {
        console.error('Erro ao tentar fixar a mensagem:', error);
        await message.reply('Houve um erro ao tentar fixar a mensagem.');
      }
      break;

    case 'desfixar':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      try {


        if (!chat.isGroup) {
          await message.reply('Este comando só pode ser usado em grupos.');
          return;
        }

        if (message.hasQuotedMsg) {
          const quotedMessage = await message.getQuotedMessage();

          if (quotedMessage) {
            const result = await quotedMessage.unpin();

            if (result) {
              await chat.sendMessage('📌 A mensagem fixada foi desfixada com sucesso.');
              console.log('Mensagem desfixada com sucesso!');
            } else {
              await message.reply('Não foi possível desfixar a mensagem.');
              console.log('Falha ao desfixar a mensagem.');
            }
          } else {
            await message.reply('Por favor, responda à mensagem fixada para desfixá-la.');
          }
        } else {
          const pinnedMessages = await chat.fetchPinnedMessages();

          if (pinnedMessages.length === 0) {
            await message.reply('Não há mensagens fixadas neste grupo.');
            return;
          }

          const pinnedMessage = pinnedMessages[0];
          const result = await pinnedMessage.unpin();

          if (result) {
            await chat.sendMessage('📌 A mensagem fixada foi desfixada com sucesso.');
            console.log('Mensagem desfixada com sucesso!');
          } else {
            await message.reply('Não foi possível desfixar a mensagem.');
            console.log('Falha ao desfixar a mensagem.');
          }
        }
      } catch (error) {
        console.error('Erro ao tentar desfixar a mensagem:', error);
        await message.reply('Houve um erro ao tentar desfixar a mensagem.');
      }
      break;




    case 'mediainfo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      if (message.hasMedia) {
        const media = await message.downloadMedia();
        await message.reply(`
                *Media Info:*
                MimeType: ${media.mimetype}
                Filename: ${media.filename}
                Data (length): ${media.data.length}
            `);
      } else {
        await message.reply("Você não enviou nenhum arquivo de mídia.");
      }
      break;

    case 'quoteinfo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        await message.reply(`
                *Info da mensagem citada:*
                ID: ${quotedMsg.id._serialized}
                Tipo: ${quotedMsg.type}
                Autor: ${quotedMsg.author || quotedMsg.from}
                Timestamp: ${quotedMsg.timestamp}
                Possui Mídia? ${quotedMsg.hasMedia}
            `);
      } else {
        await message.reply("Você precisa responder a uma mensagem para usar este comando.");
      }
      break;

    case 'resendmedia':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (quotedMsg.hasMedia) {
          const media = await quotedMsg.downloadMedia();
          await client.sendMessage(message.from, media, { caption: 'Aqui está a mídia solicitada.' });
        } else {
          await message.reply("A mensagem citada não contém mídia.");
        }
      } else {
        await message.reply("Você precisa responder a uma mensagem com mídia para usar este comando.");
      }
      break;



    case 'visuunica':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (quotedMsg.hasMedia) {
          const media = await quotedMsg.downloadMedia();
          await client.sendMessage(message.from, media, { isViewOnce: true });
          await message.reply("A mídia foi enviada como visualização única.");
        } else {
          await message.reply("A mensagem citada não contém mídia.");
        }
      } else {
        await message.reply("Você precisa responder a uma mensagem com mídia para usar este comando.");
      }
      break;

    case 'tourl':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();

        if (quotedMsg.hasMedia) {
          try {
            const media = await quotedMsg.downloadMedia();

            const imageUrl = await upload(media);

            await message.reply(`${imageUrl}`);
          } catch (error) {
            console.error(error);
            await message.reply(`Erro ao tentar fazer o upload da imagem: ${error.message}`);
          }
        } else {
          await message.reply("A mensagem citada não contém mídia.");
        }
      } else {
        await message.reply("Você precisa responder a uma mensagem com mídia para usar este comando.");
      }
      break;
    case 'tourl2':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      console.log('Comando \'tourl2\' iniciado');
      try {
        if (message.hasQuotedMsg) {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg && quotedMsg.hasMedia) {
            const quotedMedia = await quotedMsg.downloadMedia();
            const timestamp = Date.now();
            let fileExt = quotedMedia.mimetype.split('/')[1]; let fileName = `${timestamp}.${fileExt}`;
            const mediaFolder = `./midia/${message.from}`;
            const filePath = `${mediaFolder}/${fileName}`;

            if (!fs.existsSync(mediaFolder)) {
              fs.mkdirSync(mediaFolder, { recursive: true });
            }

            fs.writeFileSync(filePath, quotedMedia.data, 'base64');
            console.log(`Arquivo salvo em: ${filePath}`);

            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath)); const response = await axios.post('https://bottechwpp.com/arq', formData, {
              headers: formData.getHeaders(),
            });

            if (response.data.url) {
              console.log('Arquivo enviado com sucesso. URL:', response.data.url);

              await message.reply(`Arquivo enviado! Acesse o link: ${response.data.url}`);
            } else {
              console.log('Erro ao obter a URL do arquivo');
            }

            fs.unlinkSync(filePath);
            console.log('Arquivo temporário excluído.');

          } else {
            console.log('Nenhuma mídia encontrada na mensagem citada.');
          }
        } else {
          console.log('Não há mensagem citada.');
        }
      } catch (error) {
        console.error('Erro durante o upload:', error);
      }
      break;


    case 'addads':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      try {
        const storeArgs = args.slice(1).join(' ').trim().split('|');
        if (storeArgs.length < 2) {
          await message.reply("Por favor, forneça o texto e o intervalo no formato: !addads Atenção gRupo | 1h");
          return;
        }

        const textoAnuncio = storeArgs[0].trim();
        const intervaloAnuncio = storeArgs[1].trim();

        const mediaFolder = `./midia/${message.from}`;
        const jsonPath = `${mediaFolder}/info.json`;

        if (!fs.existsSync(mediaFolder)) fs.mkdirSync(mediaFolder, { recursive: true });

        let attachmentData = {};

        if (message.hasQuotedMsg) {
          const quotedMsg = await message.getQuotedMessage();

          if (quotedMsg && quotedMsg.hasMedia) {
            const quotedMedia = await quotedMsg.downloadMedia();
            const timestamp = Date.now();
            let mimeType = quotedMedia.mimetype;
            let fileExt = mimeType.split('/')[1];
            let fileName = `${timestamp}.${fileExt}`;
            let filePath = `${mediaFolder}/${fileName}`;

            if (mimeType === 'application/vnd.android.package-archive') {
              fileExt = 'apk'; fileName = `${timestamp}.${fileExt}`;
              filePath = `${mediaFolder}/${fileName}`;
            }

            fs.writeFileSync(filePath, quotedMedia.data, 'base64');
            console.log(`Arquivo salvo em: ${filePath}`);

            attachmentData = {
              filename: fileName,
              mimetype: mimeType,
              data: quotedMedia.data.length,
              message: textoAnuncio || quotedMsg.body, path: filePath,
            };

            fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));
          } else {
            attachmentData = {
              message: textoAnuncio || quotedMsg.body, path: null,
            };

            fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));
          }
        } else {
          if (message.hasMedia) {
            const media = await message.downloadMedia();
            const timestamp = Date.now();
            let mimeType = media.mimetype;
            let fileExt = mimeType.split('/')[1];
            let fileName = `${timestamp}.${fileExt}`;
            let filePath = `${mediaFolder}/${fileName}`;

            if (mimeType === 'application/vnd.android.package-archive') {
              fileExt = 'apk'; fileName = `${timestamp}.${fileExt}`;
              filePath = `${mediaFolder}/${fileName}`;
            }

            fs.writeFileSync(filePath, media.data, 'base64');
            console.log(`Arquivo de mídia salvo em: ${filePath}`);

            attachmentData = {
              filename: fileName,
              mimetype: mimeType,
              data: media.data.length,
              message: textoAnuncio,
              path: filePath,
            };

            fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));
          } else {
            attachmentData = {
              message: textoAnuncio,
              path: null,
            };

            fs.writeFileSync(jsonPath, JSON.stringify(attachmentData, null, 2));
          }
        }

        const formData = new FormData();
        formData.append('message', textoAnuncio);
        formData.append('interval', intervaloAnuncio);

        if (attachmentData.path) {
          formData.append('type', attachmentData.mimetype);
          formData.append('media_url', fs.createReadStream(attachmentData.path));
        } else {
          formData.append('type', 'text/plain');
        }

        try {
          const response = await axios.post(`https://bottechwpp.com/group/${message.from}/ads`, formData, {
            headers: formData.getHeaders(),
            validateStatus: function (status) {
              return status >= 200 && status < 500;
            }
          });

          if (response.status === 400 && response.data && response.data.message) {
            await message.reply(response.data.message);
            return;
          }

          console.log('Anúncio enviado com sucesso para a API!');



          if (attachmentData.path) {
            const media = await MessageMedia.fromFilePath(attachmentData.path);
            await chat.sendMessage(media, {
              caption: `Anúncio criado!\nIntervalo: ${intervaloAnuncio}\n\n${attachmentData.message}\n`,
            });
          } else {
            await chat.sendMessage(attachmentData.message, {});
          }

        } catch (error) {
          console.error('Erro ao tentar enviar os dados para a API:', error);
          await message.reply("Ocorreu um erro ao tentar criar o anúncio.");
        }

      } catch (error) {
        console.error('Erro no comando addads:', error);
        await message.reply("Ocorreu um erro inesperado. Tente novamente.");
      }
      break;










    case 'horapg':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }


      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!horapg 1`");
        return;
      }


      const ativarNotificacoes = args[1] === '1';


      const grupoIdAtivar = message.from;

      const horariosPathAtivar = './db/bet/horarios.json';

      if (!fs.existsSync(horariosPathAtivar)) {
        console.error("Arquivo de horários não encontrado.");
        return;
      }


      let horariosGruposAtivar = JSON.parse(fs.readFileSync(horariosPathAtivar, "utf-8"));


      if (!horariosGruposAtivar[grupoIdAtivar]) {
        horariosGruposAtivar[grupoIdAtivar] = {
          horarios: [],
          ultimaNotificacao: null,
          ativado: true
        };
      }


      horariosGruposAtivar[grupoIdAtivar].ativado = ativarNotificacoes;


      const horarioAtualCorrigido = moment.tz('America/Sao_Paulo').subtract(2, 'hours').toISOString();


      horariosGruposAtivar[grupoIdAtivar].ultimaNotificacao = horarioAtualCorrigido;


      fs.writeFileSync(horariosPathAtivar, JSON.stringify(horariosGruposAtivar, null, 2), 'utf-8');

      await client.sendMessage(grupoIdAtivar, `✅ Notificações ${ativarNotificacoes ? 'ativadas' : 'desativadas'} para este grupo.\nUse o comando ${prefixo}addhorapg 5m para adicionar o intervalo de tempo que cada horario será enviado.`);
      break;


    case 'addhorapg':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      const intervaloArgumento = args[1];
      if (!intervaloArgumento || !/^(\d+)([mh])$/.test(intervaloArgumento)) {
        await message.reply("Por favor, forneça um intervalo válido no formato `h` (horas) ou `m` (minutos). Exemplo: `1h` ou `30m`.");
        return;
      }

      const grupoIdHorarios = message.from;

      const caminhoArquivoHorarios = './db/bet/horarios.json';
      if (!fs.existsSync(caminhoArquivoHorarios)) {
        console.error("Arquivo de horários não encontrado.");
        return;
      }

      let dadosHorariosGrupos = JSON.parse(fs.readFileSync(caminhoArquivoHorarios, "utf-8"));
      if (!dadosHorariosGrupos[grupoIdHorarios]) {
        dadosHorariosGrupos[grupoIdHorarios] = {
          intervalo: null,
          ultimaNotificacao: null,
          ativado: true
        };
      }

      dadosHorariosGrupos[grupoIdHorarios].intervalo = intervaloArgumento;

      fs.writeFileSync(caminhoArquivoHorarios, JSON.stringify(dadosHorariosGrupos, null, 2), 'utf-8');

      await client.sendMessage(grupoIdHorarios, `✅ Intervalo de notificações ajustado para ${intervaloArgumento}. Para ativar ou desativar as notificações automáticas, use ${prefixo}horapg`);
      break;





    case 'horarios':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }

      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const horarioAtual = obterHorarioAtual();

      const horarios = buscarHorarios(horarioAtual);

      const imagensConfig = require('./db/bet/imagens.json');

      const groupJid = message.from;

      const imagemUrl = imagensConfig[groupJid] ? imagensConfig[groupJid].imagem : imagensConfig.default.imagem;

      try {

        const media = await MessageMedia.fromUrl(imagemUrl);

        if (horarios) {
          await client.sendMessage(message.from, media, {
            caption: `Horário Atual: ${horarioAtual}\n\n${horarios}`
          });
        } else {
          await client.sendMessage(message.from, "❗️ Não há horários configurados no momento.");
        }
      } catch (err) {
        await message.reply(`❌ Erro ao enviar a mídia: ${err.message}`);
      }
      break;



    case 'imagem-horarios':
      let imageHorarios;

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (!quotedMsg.hasMedia) {
          await message.reply("A mensagem citada não contém mídia.");
          return;
        }
        imageHorarios = await quotedMsg.downloadMedia();
      } else if (message.hasMedia) {
        imageHorarios = await message.downloadMedia();
      } else {
        await message.reply("Responda a uma mensagem com uma imagem ou envie uma imagem para usar este comando.");
        return;
      }

      try {
        const fileLink = await upload(imageHorarios);
        const jsonFilePath = './db/bet/imagens.json';
        let imagensConfig = {};

        if (fs.existsSync(jsonFilePath)) {
          imagensConfig = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        } else {
          imagensConfig = {
            "default": {
              "imagem": "https://raw.githubusercontent.com/DouglasReisofc/imagensplataformas/refs/heads/main/global.jpeg"
            }
          };
          fs.writeFileSync(jsonFilePath, JSON.stringify(imagensConfig, null, 2));
        }
        const groupJid = message.from;
        imagensConfig[groupJid] = { imagem: fileLink };
        fs.writeFileSync(jsonFilePath, JSON.stringify(imagensConfig, null, 2));
        const mediaMessage = await MessageMedia.fromUrl(fileLink);
        await client.sendMessage(message.from, mediaMessage, {
          caption: `Nova imagem do comando ${prefixo}horarios  foi definida`
        });

      } catch (err) {
        await message.reply(`❌ Erro ao fazer upload da imagem: ${err.message}`);
      }
      break;


    case 'editartabela':

      if (!isGroup) {

        await message.reply("Este comando só pode ser usado em grupos.");
        return;
      }

      if (!args.length) {
        await message.reply("Você precisa fornecer uma nova mensagem para a tabela.");
        return;
      }

      // Remove o comando da mensagem para salvar apenas o conteúdo desejado
      novaMensagem = args.join(" ").replace(/^editartabela\s*/i, '').trim();

      // Obtém o ID interno do grupo
      const idGrupoInternoEditar = await obterIdInternoDoGrupo(from);

      if (!idGrupoInternoEditar) {
        await message.reply("Erro: Grupo não encontrado.");
        return;
      }

      console.log("ID interno retornado:", idGrupoInternoEditar);
      console.log("Mensagem sendo salva:", novaMensagem);

      // Atualiza a mensagem no banco de dados
      const resultadoEdicao = await atualizarMensagemTabela(idGrupoInternoEditar, novaMensagem);

      await message.reply(resultadoEdicao);
      break;

    case 'tabela':
      if (!isGroup) {
        await message.reply("Este comando só pode ser usado em grupos.");
        return;
      }

      const idGrupoInternoConsulta = await obterIdInternoDoGrupo(from);

      if (!idGrupoInternoConsulta) {
        await message.reply("Erro: Grupo não encontrado.");
        return;
      }


      const mensagemTabela = await obterMensagemTabela(idGrupoInternoConsulta);
      await message.reply(mensagemTabela);
      break;




    case 'dadosgrupo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      try {
        const groupId = message.from;

        const apiUrl = `https://bottechwpp.com/groups/${groupId}?apikey=teste`;

        const axios = require('axios');
        const response = await axios.get(apiUrl);

        if (response.status === 200) {
          const dadosGrupo = response.data;

          const validadePlano = dadosGrupo.user?.will_expire || 'N/A';

          let aluguelAtivo = false;

          if (validadePlano !== 'N/A') {
            const validadeDate = new Date(validadePlano);
            const dataAtual = new Date();
            if (validadeDate > dataAtual) {
              aluguelAtivo = true;
            }
            const validadeFormatada = moment(validadePlano).format('DD/MM/YYYY HH:mm');
            const detalhesGrupo = `
*乂 Informações do Grupo 乂*
📛 *Nome:* ${dadosGrupo.name}
🆔 *ID do Grupo:* ${dadosGrupo.groupId}
👤 *Dono:* ${dadosGrupo.user?.name || 'N/A'}
📞 *Contato do Dono:* ${dadosGrupo.user?.phone || 'N/A'}
💳 *Plano do Dono:* ${dadosGrupo.user?.plan?.title || 'N/A'}
🕒 *Validade do Plano:* ${validadeFormatada}
🎨 *Descrição:* ${dadosGrupo.description || 'Sem descrição'}
            
*Status do Aluguel:* ${aluguelAtivo ? 'Ativo' : 'Expirado'}
`;
            await client.sendMessage(message.from, detalhesGrupo);
          } else {
            const detalhesGrupo = `
*乂 Informações do Grupo 乂*
📛 *Nome:* ${dadosGrupo.name}
🆔 *ID do Grupo:* ${dadosGrupo.groupId}
👤 *Dono:* ${dadosGrupo.user?.name || 'N/A'}
📞 *Contato do Dono:* ${dadosGrupo.user?.phone || 'N/A'}
💳 *Plano do Dono:* ${dadosGrupo.user?.plan?.title || 'N/A'}
🕒 *Validade do Plano:* Não disponível
🎨 *Descrição:* ${dadosGrupo.description || 'Sem descrição'}
            
*Status do Aluguel:* Expirado
`;

            await client.sendMessage(message.from, detalhesGrupo);
          }
        } else {
          await message.reply("❗ Erro ao obter os dados. Verifique a API ou o ID do grupo.");
        }
      } catch (error) {
        console.error("Erro ao acessar a API:", error.message);
        await message.reply("❗ Ocorreu um erro ao tentar acessar os dados da API.");
      }
      break;


    case 'sistema':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono)) {
        await message.reply(msgadmin);
        return;
      }

      const verificarPing = async () => {
        try {
          const host = 'google.com';
          const res = await ping.promise.probe(host);
          return res.time + 'ms';
        } catch (error) {
          return 'Erro ao verificar o ping';
        }
      };
      const obterUsoCpu = () => {
        const cpus = os.cpus();
        let totalUsage = 0;

        cpus.forEach(cpu => {
          const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
          const usage = (cpu.times.user + cpu.times.nice + cpu.times.sys) / total * 100;
          totalUsage += usage;
        });

        return (totalUsage / cpus.length).toFixed(2) + '%';
      };


      const obterUsoMemoria = () => {
        const totalMemoria = os.totalmem();
        const memoriaUsada = totalMemoria - os.freemem();
        const porcentagemUso = (memoriaUsada / totalMemoria * 100).toFixed(2);

        return `${porcentagemUso}% (${(memoriaUsada / (1024 * 1024 * 1024)).toFixed(2)} GB de ${(totalMemoria / (1024 * 1024 * 1024)).toFixed(2)} GB)`;
      };

      const obterCargaSistema = () => {
        const load = os.loadavg(); return `${load[0].toFixed(2)} (1 min), ${load[1].toFixed(2)} (5 min), ${load[2].toFixed(2)} (15 min)`;
      };

      const obterUptimeSistema = () => {
        const uptimeSegundos = os.uptime();
        const horas = Math.floor(uptimeSegundos / 3600);
        const minutos = Math.floor((uptimeSegundos % 3600) / 60);
        return `${horas}h ${minutos}m`;
      };

      const pingResult = await verificarPing();
      const cpuUsage = obterUsoCpu();
      const memoriaUsage = obterUsoMemoria();
      const cargaSistema = obterCargaSistema();
      const uptime = obterUptimeSistema();

      await message.reply(`乂 Informações do Sistema 乂:

Ping: ${pingResult}

Uso da CPU: ${cpuUsage}

Memória: ${memoriaUsage}

Carga do Sistema: ${cargaSistema}

Tempo ativo: ${uptime}
      `);
      break;

      const ping = require('ping');
    case 'ping':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      const sentMessage = await message.reply("Pong... Calculando o ping...");

      const start = Date.now();
      const pingTime = Date.now() - start;

      await sentMessage.edit(`🏓 O ping do bot é: ${pingTime}ms`);
      break;




    case 'abrirgrupo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      try {

        await chat.setMessagesAdminsOnly(false); await message.reply("✅ O grupo foi aberto para todos!");
      } catch (error) {
        console.error("Erro ao tentar abrir o grupo:", error);
        await message.reply("❌ Não foi possível abrir o grupo. Tente novamente mais tarde.");
      }
      break;

    case 'abrirgp':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }


      if (args.length < 2) {
        await message.reply("Por favor, forneça o horário no formato HH:MM ou `0` para limpar.\nExemplo: `!abrirgp 08:00` ou `!abrirgp 0`");
        return;
      }


      const horarioAbrir = (args[1] === '0') ? '' : args[1];


      const sucessoAbrir = await alterarFuncaoGrupo(from, 'setabrirgp', horarioAbrir);

      if (sucessoAbrir) {
        if (horarioAbrir === '') {

          await message.reply("Horário de abertura automático do grupo removido");
        } else {
          await message.reply(`Horário de abertura configurado para: ${horarioAbrir}.`);
        }
      } else {
        await message.reply("Houve um erro ao alterar a configuração do horário de abertura.");
      }
      break;



    case 'fechargrupo':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }
      try {

        await chat.setMessagesAdminsOnly(true);
        await message.reply("✅ O grupo foi fechado. Somente administradores podem enviar mensagens agora.");
      } catch (error) {

        await message.reply("❌ Não foi possível fechar o grupo. Tente novamente mais tarde.");
      }
      break;

    case 'fechargp':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2) {
        await message.reply("Por favor, forneça o horário no formato HH:MM ou `0` para limpar.\nExemplo: `!fechargp 20:00` ou `!fechargp 0`");
        return;
      }

      const horarioFechar = (args[1] === '0') ? '' : args[1];

      const sucessoFechar = await alterarFuncaoGrupo(from, 'setfechargp', horarioFechar);

      if (sucessoFechar) {
        if (horarioFechar === '') {
          await message.reply("Horário de fechamento automatico do grupo removido");
        } else {
          await message.reply(`Horário de fechamento configurado para: ${horarioFechar}.`);
        }
      } else {
        await message.reply("Houve um erro ao alterar a configuração do horário de fechamento.");
      }
      break;





    case 'soadm':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }
      if (!(isDono || isGroupAdmins)) {
        await message.reply(msgadmin);
        return;
      }

      if (args.length < 2 || !['0', '1'].includes(args[1])) {
        await message.reply("Por favor, forneça um parâmetro válido: `1` para ativar ou `0` para desativar.\nExemplo: `!soadm 1`");
        return;
      }
      const ativarSoadm = args[1] === '1';

      const sucessoSoadm = await alterarFuncaoGrupo(from, 'ativarsoadm', ativarSoadm);

      if (sucessoSoadm) {
        await message.reply(`Funcionalidade soadm ${ativarSoadm ? 'ativada' : 'desativada'}.`);
      } else {
        await message.reply("Houve um erro ao alterar a configuração");
      }
      break;



    case 'reiniciar':
      if (!isDono) {
        await message.reply("Você precisa ser o dono ou administrador para usar este comando.");
        return;
      }

      await message.reply("Reiniciando o bot e limpando o cache...");
      try {
        exec('rm -rf ./.wwebjs_cache', (err) => {
          if (err) {
            console.error("Erro ao limpar o cache:", err);
            message.reply("Houve um erro ao limpar o cache.");
            return;
          }
          console.log("Cache limpo com sucesso.");
          exec('pm2 reload all', (pm2Err) => {
            if (pm2Err) {
              console.error("Erro ao reiniciar o bot com PM2:", pm2Err);
              message.reply("Houve um erro ao reiniciar o bot.");
              return;
            }

            console.log("Bot reiniciado com sucesso.");
            message.reply("Bot reiniciado com sucesso!");
          });
        });
      } catch (error) {
        console.error("Erro ao executar o comando reiniciar:", error);
        await message.reply("Ocorreu um erro inesperado ao tentar reiniciar o bot.");
      }
      break;


    case 'reload':
      if (!isDono) {
        await message.reply("Você precisa ser o dono ou administrador para usar este comando.");
        return;
      }

      const processName = args[1];
      if (!processName) {
        await message.reply("Por favor, informe o nome do processo do PM2 que deseja reiniciar. Exemplo: `!reiniciarprocesso outrobot`");
        return;
      }

      await message.reply(`Reiniciando o processo PM2: ${processName}...`);

      exec(`pm2 reload ${processName}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`Erro ao reiniciar o processo ${processName}:`, err);
          message.reply(`Erro ao reiniciar o processo: ${processName}. Verifique o nome e tente novamente.`);
          return;
        }

        console.log(`Processo ${processName} reiniciado com sucesso.`);
        console.log("Saída:", stdout);
        console.error("Erros:", stderr);

        message.reply(`Processo ${processName} reiniciado com sucesso!`);
      });
      break;


    case 'pm2list':
      if (!isDono) {
        await message.reply("Você precisa ser o dono ou administrador para usar este comando.");
        return;
      }

      await message.reply("Obtendo a lista de processos do PM2...");

      exec('pm2 jlist', (err, stdout, stderr) => {
        if (err) {
          console.error("Erro ao listar os processos do PM2:", err);
          message.reply("Erro ao listar os processos do PM2. Verifique o console para mais detalhes.");
          return;
        }

        try {
          const processes = JSON.parse(stdout);

          if (processes.length === 0) {
            message.reply("Nenhum processo do PM2 encontrado.");
            return;
          }

          const processList = processes.map(proc => {
            const name = proc.name || "Desconhecido";
            const status = proc.pm2_env.status || "Desconhecido";
            return `- ${name}: ${status}`;
          }).join('\n');

          message.reply(`Lista de processos PM2:\n\n${processList}`);
        } catch (parseError) {
          console.error("Erro ao processar os dados do PM2:", parseError);
          message.reply("Erro ao processar os dados do PM2. Verifique o console para mais detalhes.");
        }

        if (stderr) {
          console.error("Erro padrão:", stderr);
        }
      });
      break;




    case 'sorte':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const sorte = Math.floor(Math.random() * 101);
      let mensagem;
      if (sorte >= 80) {
        mensagem = `🍀 Uau! Sua sorte hoje está ótima! Você tem **${sorte}%** de sorte! 🍀`;
      } else if (sorte >= 50) {
        mensagem = `🍀 Sua sorte está boa! Você tem **${sorte}%** de sorte hoje! 🍀`;
      } else if (sorte >= 20) {
        mensagem = `🍀 Sua sorte está razoável! Você tem **${sorte}%** de sorte, mas pode melhorar! 🍀`;
      } else {
        mensagem = `🍀 Hmm, a sorte não está ao seu lado hoje... Apenas **${sorte}%** de sorte. Não desista! 🍀`;
      }

      await message.reply(mensagem);

      break;

    case 'nivelsapatao':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      const nivelSapatao = Math.floor(Math.random() * 101);
      let mensagemSapatao;
      if (nivelSapatao <= 25) {
        mensagemSapatao = `🌈 Você está no começo da jornada! Bora ouvir mais MPB e aumentar esse nível! 🎶`;
      } else if (nivelSapatao <= 50) {
        mensagemSapatao = `💬 Metade sapatão, metade curiosa! Já pode começar a montar os móveis! 🛠️😅`;
      } else if (nivelSapatao <= 75) {
        mensagemSapatao = `🔥 Nível sapatão avançado! Só falta adotar um gato para fechar o pacote! 🐾🐈`;
      } else {
        mensagemSapatao = `💥 Parabéns! Você atingiu o ápice do sapatonismo! Já pode abrir sua oficina de marcenaria! 😎🛠️`;
      }
      await message.reply(`Seu nível sapatão é *${nivelSapatao}%*!
${mensagemSapatao}`);
      break;

    case 'nivelgado':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const nivelGado = Math.floor(Math.random() * 101);
      let mensagemGado;
      if (nivelGado <= 25) {
        mensagemGado = `🥲 "Nível gado baixíssimo! Você mal manda um ‘bom dia’ e já some. Bora treinar uns elogios primeiro!" 😂`;
      } else if (nivelGado <= 50) {
        mensagemGado = `🤨 "Meio termo… Você manda uns ‘oi sumida’, mas ainda corre atrás menos que deveria. Ajusta essa estratégia!" 📲`;
      } else if (nivelGado <= 75) {
        mensagemGado = `😏 "Nível gado avançado! Você já manda ‘dorme bem, princesa’ e ainda responde rápido. Cuidado pra não cair na friendzone!" 👀`;
      } else {
        mensagemGado = `🐮💘 "Parabéns! Você atingiu o ápice do gado supremo! Se a pessoa postar ‘queria um açaí’, você já chega perguntando ‘com ou sem leite condensado?’" 🤡`;
      }
      await message.reply(`Seu nível gado é *${nivelGado}%*!
${mensagemGado}`);
      break;

    case 'nivelgay':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const nivelGay = Math.floor(Math.random() * 101);
      let mensagemGay;
      if (nivelGay <= 25) {
        mensagemGay = `🌈 "Você tem um pezinho no arco-íris! Bora assistir RuPaul para subir essa porcentagem!" 💅✨`;
      } else if (nivelGay <= 50) {
        mensagemGay = `💃 "Metade gay, metade hétero confundido! Já canta Lady Gaga no chuveiro, mas ainda esconde a playlist." 🎤`;
      } else if (nivelGay <= 75) {
        mensagemGay = `🔥 "Você já brilhou muito na balada, sabe todas as coreografias de divas pop e tem um amigo chamado Carlos!" 💖`;
      } else {
        mensagemGay = `💥 "Parabéns! Você desbloqueou o nível supremo! Sua existência já vem com glitter, close certo e uma dose extra de drama!" 💅🌈✨`;
      }
      await message.reply(`Seu nível gay é *${nivelGay}%*!
${mensagemGay}`);
      break;

    case 'nivelgostoso':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      const nivelGostoso = Math.floor(Math.random() * 101);
      let mensagemGostoso;
      if (nivelGostoso <= 25) {
        mensagemGostoso = `😬 "Nível gostoso? Meu anjo, tá mais pra nível simpático… Mas não desiste, um bom corte de cabelo já ajuda!" 💇‍♂️😂`;
      } else if (nivelGostoso <= 50) {
        mensagemGostoso = `😏 "Meio termo entre ‘bonitinho’ e ‘arrasador’! Já dá pra soltar um sorrisinho e conquistar uns corações." 💘`;
      } else if (nivelGostoso <= 75) {
        mensagemGostoso = `🔥 "Você já tá no nível ‘todo mundo te olha quando entra no rolê’. Só falta aprender a ignorar os ex!" 😎`;
      } else {
        mensagemGostoso = `💥 "ABSURDAMENTE GOSTOSO! Se fosse um prato, seria o favorito do chef! Proibido sair na rua sem aviso prévio!" 😏🔥`;
      }
      await message.reply(`Seu nível gostoso é *${nivelGostoso}%*!
${mensagemGostoso}`);
      break;

    case "config":
      console.log(`O usuário solicitou as configurações completas do grupo: ${from}`);

      const configuracao = await obterConfiguracaoGrupo(from);

      if (!configuracao) {
        return await message.reply("❌ Não foi possível obter as configurações do grupo.");
      }

      const configFormatada = JSON.stringify(configuracao, null, 2);
      console.log("🔍 Configuração completa do grupo:", configuracao);
      await message.reply(`📢 *Configurações completas do Grupo* 📢\n\n\`\`\`${configFormatada}\`\`\``);
      break;


    case 'conselhos':
    case 'conselho':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }
      try {
        const apiKey = 'xxx';

        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        const requestBody = {
          model: 'llama3-8b-8192', messages: [{
            role: 'user',
            content: 'Dê-me um conselho motivacional curto e inspirador para o meu dia. mas quero só o conselho e não use inicias como "aqui esta um conselho" '
          }]
        };

        const response = await axios.post(apiUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        const conselho = response.data.choices[0].message.content;

        await message.reply(`━━━━━━━━━━━━━━━━━━\n✨ MOTIVAÇÃO DIÁRIA ✨\n━━━━━━━━━━━━━━━━━━\n\n${conselho}`);

      } catch (error) {
        console.error('Erro ao obter conselho:', error.message);
        await message.reply('❌ Ocorreu um erro ao tentar pegar um conselho. Tente novamente mais tarde!');
      }

      break;

    case 'conselhos2':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      try {
        const apiKey = 'xxxxx';

        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        const requestBody = {
          model: 'llama3-8b-8192', messages: [{
            role: 'user',
            content: `Dê-me um conselho sarcástico e engraçado mas que sejafácil de entender, de preferência curto e direto. Algo como "Se a vida te der limões, aproveite que o suco vai ser ácido." ou como ""💭 Se o mundo tá caindo, deite e veja o espetáculo."

"Não desanime, a próxima humilhação pode ser ainda melhor."

" Se a vida te derruba, aproveita que o chão é confortável. Não use iniciais como "Aqui vai um conselho" mas nao fale nada alem da frase .`
          }]
        };

        const response = await axios.post(apiUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        const conselho = response.data.choices[0].message.content;

        await message.reply(`\n💬 CONSELHO DO DIA 💬\n\n${conselho}`);

      } catch (error) {
        console.error('Erro ao obter conselho:', error.message);
        await message.reply('❌ Ocorreu um erro ao tentar pegar um conselho. Tente novamente mais tarde!');
      }

      break;


    case 'piada':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      try {
        const apiKey = 'xxx';

        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        const requestBody = {
          model: 'llama3-8b-8192', messages: [{
            role: 'user',
            content: `Gerar uma piada humorística bem conhecida e fácil de entender em Português Brasileiro, apelando para um público jovem. Use emoji se desejar, mas mantenha a piada concisa e independente, sem saudações ou referências personalizadas`
          }]
        };

        const response = await axios.post(apiUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        const conselho = response.data.choices[0].message.content;

        await message.reply(`${conselho}`);

      } catch (error) {
        console.error('Erro ao obter conselho:', error.message);
        await message.reply('❌ Ocorreu um erro ao tentar pegar um conselho. Tente novamente mais tarde!');
      }

      break;



    case 'sticker':
    case 's':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      try {

        const from = message.from;


        const tempFolder = './temp_sticker';
        if (!fs.existsSync(tempFolder)) {
          fs.mkdirSync(tempFolder, { recursive: true });
        }

        async function convertBufferToWebP(buffer) {
          try {
            return await sharp(buffer)
              .resize(512, 512, { fit: 'contain' })
              .webp({ quality: 80 })
              .toBuffer();
          } catch (err) {
            throw new Error('Sharp Conversion Error: ' + err.message);
          }
        }

        function convertVideoToWebP(videoPath, outputPath) {
          return new Promise((resolve, reject) => {
            const command = `ffmpeg -i "${videoPath}" -vcodec libwebp -an -q:v 50 -preset default -loop 0 -vsync 0 -s 512x512 -filter:v "fps=15" "${outputPath}"`;
            exec(command, (error, stdout, stderr) => {
              if (error) {
                return reject(new Error(`FFmpeg Error: ${stderr}`));
              }
              resolve(outputPath);
            });
          });
        }

        async function processAndSendSticker(media) {
          const mimeType = media.mimetype;

          if (mimeType.startsWith('image')) {

            const imageBuffer = Buffer.from(media.data, 'base64');

            const webpBuffer = await convertBufferToWebP(imageBuffer);

            const stickerMedia = new MessageMedia('image/webp', webpBuffer.toString('base64'), 'sticker.webp');


            await client.sendMessage(from, stickerMedia, { sendMediaAsSticker: true });

          } else if (mimeType.startsWith('video')) {
            const videoBuffer = Buffer.from(media.data, 'base64');
            const videoPath = `${tempFolder}/temp_video_${Date.now()}.mp4`;

            fs.writeFileSync(videoPath, videoBuffer);

            try {

              const videoMedia = new MessageMedia('video/mp4', videoBuffer.toString('base64'), 'sticker.mp4');
              await client.sendMessage(from, videoMedia, { sendMediaAsSticker: true });

            } catch (err) {

              await client.sendMessage(from, '❌ Ocorreu um erro ao enviar o sticker animado.');
            } finally {
              if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            }
          } else {
            await client.sendMessage(from, '❌ Tipo de mídia não suportado. Por favor, envie uma imagem ou vídeo.');
          }
        }

        async function handleQuotedMessage() {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg && quotedMsg.hasMedia) {
            const quotedMedia = await quotedMsg.downloadMedia();
            await processAndSendSticker(quotedMedia);
          } else {
            await message.reply('❌ A mensagem citada não contém mídia válida.');
          }
        }


        if (message.hasQuotedMsg) {
          await handleQuotedMessage();
        } else if (message.hasMedia) {

          const media = await message.downloadMedia();
          await processAndSendSticker(media);
        } else {

          await message.reply('❌ Nenhuma mídia encontrada para enviar como sticker.');
        }
      } catch (error) {

        await message.reply('❌ Ocorreu um erro ao tentar enviar o sticker.');
      }
      break;

    case 'tiktok':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      try {

        const messageText = message.body.slice(7).trim(); const tiktokUrl = messageText.startsWith('http') ? messageText : null;

        if (!tiktokUrl) {
          await message.reply("❌ Por favor, envie um link válido do TikTok. Exemplo: !tiktok https://www.tiktok.com/...");
          return;
        }

        await message.reply("🔄 Processando seu link do TikTok, aguarde só um momento...");

        await processTikTokMedia(tiktokUrl, message.from);
      } catch (error) {
        console.error(`❌ Erro ao processar o comando TikTok: ${error.message}`);
        await message.reply("❌ Ocorreu um erro ao processar o comando TikTok. Tente novamente.");
      }
      break;

    case 'kwai':
      if (!aluguelStatus.ativo) {
        await message.reply(msgaluguel);
        return;
      }
      if (!isGroup) {
        await message.reply(msgsogrupo);
        return;
      }

      if ((isSoadm === '1' || isSoadm === 1) && !isGroupAdmins && !isDono) {
        await message.reply(modosoadm);
        return;
      }

      try {

        const messageText = message.body.slice(5).trim(); const kwaiUrl = messageText.startsWith('http') ? messageText : null;

        if (!kwaiUrl) {
          await message.reply("❌ Por favor, envie um link válido do Kwai. Exemplo: !kwai https://www.kwai.com/...");
          return;
        }

        await message.reply("🔄 Processando seu link do Kwai, aguarde só um momento...");

        await processKwaiMedia(kwaiUrl, message.from);
      } catch (error) {
        console.error(`❌ Erro ao processar o comando Kwai: ${error.message}`);
        await message.reply("❌ Ocorreu um erro ao processar o comando Kwai. Tente novamente.");
      }
      break;





    case 'telegram':
      let media;
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (!quotedMsg.hasMedia) {
          await message.reply("A mensagem citada não contém mídia.");
          return;
        }
        media = await quotedMsg.downloadMedia();
      } else if (message.hasMedia) {
        media = await message.downloadMedia();
      } else {
        await message.reply("Responda a uma mensagem com mídia ou envie uma mídia para usar este comando.");
        return;
      }
      try {
        const fileLink = await upload(media);
        const mediaMessage = await MessageMedia.fromUrl(fileLink);
        await client.sendMessage(message.from, mediaMessage);
      } catch (err) {
        await message.reply(`❌ Erro ao enviar mídia: ${err.message}`);
      }
      break;










    default:
      const dataAtual = new Date();
      const dia = String(dataAtual.getDate()).padStart(2, '0');
      const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
      const ano = dataAtual.getFullYear();

      const dataFormatada = `${dia}/${mes}/${ano}`;

      const chatDefault = await message.getChat(); const nomeGrupoDefault = chatDefault.isGroup ? chatDefault.name : 'Não é um grupo';
      const idGrupoDefault = chatDefault.isGroup ? chatDefault.id._serialized : 'Não é um grupo';

      await client.sendMessage(from,
        `╭━━━[ *COMANDO INVALIDO* ]━━━╮
    |Data: *${dataFormatada}*
    |Grupo: *${nomeGrupoDefault}* 
    | ID:(${from})
    |        
    |*Número: ${author}*
    |        
    |Prefixo: *${config.prefixo}*
    |Exemplo: *${config.prefixo}menu*
    ╰━━━━━━━━━━━━━━━━━━━━╯`
      );
      break;
  }
});



server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
