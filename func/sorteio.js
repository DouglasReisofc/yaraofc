const client = require('../client.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { abrirConversa } = require('./funcoes.js');
const chalk = require('chalk');

function formatBox(title, lines) {
  const width = Math.max(...lines.map(l => l.length));
  console.log(chalk.blueBright('┌' + '─'.repeat(width + 2) + '┐'));
  console.log(chalk.blueBright('│ ' + title.padEnd(width) + ' │'));
  console.log(chalk.blueBright('├' + '─'.repeat(width + 2) + '┤'));
  for (const line of lines) {
    console.log(chalk.yellowBright('│ ' + line.padEnd(width) + ' │'));
  }
  console.log(chalk.blueBright('└' + '─'.repeat(width + 2) + '┘'));
}

// Defina o caminho para o arquivo JSON onde os sorteios serão armazenados
const sorteiosPath = path.join(__dirname, '../db/sorteio/sorteio.json');

/**
 * Carrega os sorteios existentes do arquivo JSON.
 * @returns {Array} Array de sorteios.
 */
function carregarSorteios() {
  if (fs.existsSync(sorteiosPath)) {
    try {
      const data = fs.readFileSync(sorteiosPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar sorteios:', error);
      return [];
    }
  } else {
    return [];
  }
}

/**
 * Salva os sorteios no arquivo JSON.
 * @param {Array} sorteios - Array de sorteios a serem salvos.
 */
function salvarSorteios(sorteios) {
  try {
    fs.writeFileSync(sorteiosPath, JSON.stringify(sorteios, null, 2), 'utf8');
    console.log('Sorteios salvos com sucesso.');
  } catch (error) {
    console.error('Erro ao salvar sorteios:', error);
  }
}

/**
 * Extrai apenas o ID da mensagem a partir de um ID serializado completo.
 * @param {string} serializedId ID serializado (ex.: true_120@g.us_abcd1234)
 * @returns {string|null} ID da mensagem ou null
 */
function extrairIdBasico(serializedId) {
  if (typeof serializedId !== 'string') return null;
  const partes = serializedId.split('_');
  if (partes.length >= 3) {
    return partes[2];
  } else if (partes.length === 2) {
    return partes[1];
  }
  return serializedId;
}

/**
 * Obtém de forma resiliente o ID completo de uma mensagem retornada pela API.
 * Alguns métodos podem não expor diretamente o campo `_serialized`.
 * @param {object} msg Mensagem retornada pela API
 * @returns {string|null} ID completo ou null
 */
function obterIdCompleto(msg) {
  if (!msg) return null;

  if (msg.id?._serialized) return msg.id._serialized;
  if (msg._data?.id?._serialized) return msg._data.id._serialized;

  const compose = (obj) => {
    if (!obj) return null;
    const { fromMe, remote, id, participant } = obj;
    if (typeof fromMe !== 'undefined' && remote && id) {
      return (
        `${fromMe ? 'true' : 'false'}_${remote}_${id}` +
        (participant ? `_${participant}` : '')
      );
    }
    return obj.id || null;
  };

  return compose(msg.id) || compose(msg._data?.id) || null;
}

/**
 * Cria ou atualiza um sorteio.
 * @param {string} idGrupo - ID do grupo no WhatsApp.
 * @param {string} titulo - Título do sorteio.
 * @param {number} duracao - Duração do sorteio em segundos.
 * @param {number} ganhadores - Número de ganhadores do sorteio.
 * @param {number} limite - Limite de participantes (0 para sem limite).
 * @param {string|null} idMensagem - ID da mensagem da enquete (opcional).
 * @returns {Object} O sorteio criado ou atualizado.
 */
function criarSorteio(idGrupo, titulo, duracao, ganhadores = 1, limite = 0, idMensagem = null) {
  const sorteios = carregarSorteios();

  if (ganhadores > limite && limite > 0) {
    console.log("Erro: O número de ganhadores não pode ser maior que o limite de participantes.");
    return null;
  }

  let sorteioExistente = sorteios.find(s => s.idGrupo === idGrupo);

  if (sorteioExistente) {
    if (idMensagem) {
      sorteioExistente.idMensagem = idMensagem;
    }
    sorteioExistente.titulo = titulo;
    sorteioExistente.ganhadores = ganhadores;
    sorteioExistente.limite = limite;
    sorteioExistente.dataCriacao = moment().tz('America/Sao_Paulo').toISOString();
    sorteioExistente.dataSorteio = moment().tz('America/Sao_Paulo').add(duracao, 'seconds').toISOString();
    sorteioExistente.dataSorteioFinalizada = false;
    sorteioExistente.enqueteExcluida = false; // Inicializa a flag como falsa
    console.log(`Sorteio atualizado: ${titulo} - Duração: ${duracao} segundos`);
  } else {
    sorteioExistente = {
      idGrupo,
      titulo,
      ganhadores,
      limite,
      dataCriacao: moment().tz('America/Sao_Paulo').toISOString(),
      dataSorteio: moment().tz('America/Sao_Paulo').add(duracao, 'seconds').toISOString(),
      participantes: [],
      idMensagem: idMensagem,
      dataSorteioFinalizada: false,
      enqueteExcluida: false // Inicializa a flag como falsa
    };
    sorteios.push(sorteioExistente);
    console.log(`Sorteio criado: ${titulo} - Duração: ${duracao} segundos`);
  }

  salvarSorteios(sorteios);
  return sorteioExistente;
}

/**
 * Adiciona um participante a um sorteio.
 * @param {string} idGrupo - ID do grupo no WhatsApp.
 * @param {string} participante - ID do participante a ser adicionado.
 */
function logParticipante(idGrupo, participante, acao) {
  const lines = [
    `Grupo: ${idGrupo}`,
    `Votante: ${participante}`,
    `Ação: ${acao}`,
    `Horário (SP): ${moment.tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm')}`
  ];
  formatBox('SORTEIO ATUALIZADO', lines);
}

function adicionarParticipante(idGrupo, participante) {
  const sorteios = carregarSorteios();
  const sorteio = sorteios.find(s => s.idGrupo === idGrupo);

  if (sorteio) {
    if (!sorteio.participantes.includes(participante)) {
      sorteio.participantes.push(participante);
      salvarSorteios(sorteios);
      logParticipante(idGrupo, participante, 'adicionado ao JSON');
    } else {
      console.log(`Participante ${participante} já está no sorteio do grupo ${idGrupo}`);
    }
  } else {
    console.log(`Sorteio não encontrado para o grupo ${idGrupo}`);
  }
}

/**
 * Remove um participante de um sorteio.
 * @param {string} idGrupo - ID do grupo no WhatsApp.
 * @param {string} participante - ID do participante a ser removido.
 */
function removerParticipante(idGrupo, participante) {
  const sorteios = carregarSorteios();
  const sorteio = sorteios.find(s => s.idGrupo === idGrupo);

  if (sorteio) {
    sorteio.participantes = sorteio.participantes.filter(p => p !== participante);
    salvarSorteios(sorteios);
    logParticipante(idGrupo, participante, 'removido do JSON');
  } else {
    console.log(`Sorteio não encontrado para o grupo ${idGrupo}`);
  }
}

/**
 * Finaliza um sorteio, seleciona um ou mais vencedores e remove o sorteio do JSON.
 * @param {string} idGrupo - ID do grupo no WhatsApp.
 * @returns {Array|null} Array de vencedores ou null se não houver vencedores.
 */
async function finalizarSorteio(idGrupo) {
  const sorteios = carregarSorteios();
  const sorteioIndex = sorteios.findIndex(s => s.idGrupo === idGrupo);

  if (sorteioIndex !== -1) {
    const sorteio = sorteios[sorteioIndex];
    await abrirConversa(idGrupo);
    const { participantes, ganhadores } = sorteio;

    if (participantes.length < ganhadores) {
      console.log(`Não há participantes suficientes para o sorteio: ${sorteio.titulo}`);
      sorteio.dataSorteioFinalizada = true;
      salvarSorteios(sorteios);
      sorteios.splice(sorteioIndex, 1);
      salvarSorteios(sorteios);
      return null;
    }

    let vencedores = [];
    while (vencedores.length < ganhadores) {
      const vencedor = participantes[Math.floor(Math.random() * participantes.length)];
      if (!vencedores.includes(vencedor)) {
        vencedores.push(vencedor);
      }
    }

    sorteio.dataSorteioFinalizada = true;
    salvarSorteios(sorteios);
    sorteios.splice(sorteioIndex, 1);
    salvarSorteios(sorteios);

    return vencedores;
  }
  return null;
}

/**
 * Verifica se já existe um sorteio ativo no grupo.
 * @param {string} groupId - ID do grupo no WhatsApp.
 * @returns {Object|null} O sorteio ativo ou null.
 */
function verificarSorteioAtivo(groupId) {
  const sorteios = carregarSorteios();
  const sorteioAtivo = sorteios.find(s => s.idGrupo === groupId && !s.dataSorteioFinalizada);
  return sorteioAtivo || null;
}

/**
 * Verifica todos os sorteios ativos e retorna os que já chegaram ao horário de sorteio.
 * @returns {Array|null} Array de sorteios vencidos ou null.
 */
async function verificarSorteiosAtivos() {
  const sorteios = carregarSorteios();
  const agora = moment.utc();
  const sorteiosVencidos = sorteios.filter(s => {
    const dataSorteio = moment.utc(s.dataSorteio);
    console.log(`Sorteio: ${s.titulo}, dataSorteio (UTC): ${dataSorteio.format()}, finalizada: ${s.dataSorteioFinalizada}`);
    return !s.dataSorteioFinalizada && dataSorteio.isSameOrBefore(agora, 'second');
  });

  if (sorteiosVencidos.length > 0) {
    return sorteiosVencidos;
  }

  return null;
}

/**
 * Inicia a verificação dos sorteios ativos e finaliza os vencidos.
 */
async function iniciarVerificacaoSorteiosAtivos() {
  setInterval(async () => {
    const sorteiosVencidos = await verificarSorteiosAtivos();

    if (sorteiosVencidos && sorteiosVencidos.length > 0) {
      for (let sorteio of sorteiosVencidos) {
        const vencedores = await finalizarSorteio(sorteio.idGrupo);

        let mensagemFinal = '';
        const participantes = sorteio.participantes;

        // Abre a janela do chat do grupo ao encontrar um sorteio ativo
        await abrirConversa(sorteio.idGrupo);

        if (vencedores && vencedores.length > 0) {
          // Exibe os vencedores no console antes de mencioná-los
          console.log('Vencedores a serem mencionados:', vencedores);

          // Formata os IDs para remover o prefixo '@c.us' antes de mencionar
          const mentionIds = vencedores.map(v => v);  // Mantém o formato correto sem usar Contact
          
          // Concatena os vencedores formatados, com uma menção para cada
          const vencedoresFormatados = vencedores.map(v => `@${v.replace('@c.us', '')}`).join('\n');

          // Mensagem dependendo do número de vencedores
          if (vencedores.length === 1) {
            mensagemFinal = `🎉 S O R T E I O   F I N A L I Z A D O 🎉\n\nParabéns!\n🏆 *Vencedor:* \n${vencedoresFormatados} 🏆\n\nDescrição: \n*"${sorteio.titulo}"*\n\nObrigado a todos que participaram! 🎁✨`;
          } else {
            mensagemFinal = `🎉 S O R T E I O   F I N A L I Z A D O 🎉\n\nParabéns!\n🏆 *Vencedores:* \n${vencedoresFormatados} 🏆\n\nDescrição: \n*"${sorteio.titulo}"*\n\nObrigado a todos que participaram! 🎁✨`;
          }

          // Envia a mensagem com menções
          try {
            await client.sendMessage(sorteio.idGrupo, mensagemFinal, { mentions: mentionIds });
          } catch (error) {
            console.error('Erro ao enviar mensagem final do sorteio com menções:', error);
          }
        } else {
          // Mensagem personalizada quando não há vencedores devido à falta de participantes
          mensagemFinal = `乂 S O R T E I O   F I N A L I Z A D O 乂\n\nO sorteio "${sorteio.titulo}" foi finalizado, mas não houve vencedores, pois não havia participantes suficientes. 😔\n\nObrigado a todos que participaram! 🎁✨`;
          try {
            await client.sendMessage(sorteio.idGrupo, mensagemFinal);
          } catch (error) {
            console.error('Erro ao enviar mensagem final do sorteio:', error);
          }
        }

        // Exclui a enquete se o ID da mensagem for válido
        if (sorteio.idMensagem) {
          try {
            let pollMessage = await client.getMessageById(sorteio.idMensagem);
            if (!pollMessage) {
              const chat = await client.getChatById(sorteio.idGrupo);
              const msgs = await chat.fetchMessages({ limit: 50 });
              pollMessage = msgs.find(m => obterIdCompleto(m) === sorteio.idMensagem);
            }
            if (pollMessage) {
              await pollMessage.delete(true);
              console.log(`Enquete excluída com sucesso para o sorteio "${sorteio.titulo}".`);
            } else {
              console.log('Não foi possível localizar a enquete para exclusão.');
            }
          } catch (error) {
            console.error('Erro ao excluir a enquete:', error);
          }
        }
      }
    }
  }, 30000); // Verifica a cada 30 segundos
}



client.on('vote_update', async (vote) => {
  console.log("Evento 'vote_update' acionado!");
  console.log('VOTE UPDATE RAW:', JSON.stringify(vote, null, 2));

  const parent = vote.parentMessage;
  const pollSerialized = obterIdCompleto(parent);
  const pollIdBase = extrairIdBasico(pollSerialized);
  const groupId = parent?.to || parent?._data?.to || null;
  const { voter, selectedOptions } = vote;

  formatBox('VOTE UPDATE DETALHADO', [
    `Grupo: ${groupId}`,
    `Poll ID: ${pollIdBase}`,
    `Votante: ${voter}`,
    `Opções: ${selectedOptions.map(o => `${o.localId}-${o.name}`).join(', ')}`
  ]);

  if (!pollIdBase || !groupId) return;

  const sorteioAtivo = await verificarSorteioAtivo(groupId);
  const sorteioBaseId = extrairIdBasico(sorteioAtivo?.idMensagem);
  if (!sorteioAtivo || pollIdBase !== sorteioBaseId) {
    return;
  }

  if (selectedOptions.length === 0) {
    console.log(`Participante ${voter} removeu o voto no sorteio ${groupId}`);
    removerParticipante(groupId, voter);
  } else {
    const option = selectedOptions[0];
    switch (option.localId) {
      case 0:
        console.log(`Adicionando participante ${voter} ao sorteio ${groupId}`);
        adicionarParticipante(groupId, voter);
        break;
      case 1:
        console.log(`Removendo participante ${voter} do sorteio ${groupId}`);
        removerParticipante(groupId, voter);
        break;
    }
  }

  const atualizado = carregarSorteios().find(s => s.idGrupo === groupId);
  if (atualizado) {
    console.log('Participantes atuais:', atualizado.participantes.join(', '));
  }

  const sorteioAtual = await verificarSorteioAtivo(groupId);
  if (sorteioAtual && sorteioAtual.limite > 0 && sorteioAtual.participantes.length >= sorteioAtual.limite) {
    if (sorteioAtual.idMensagem) {
      let pollMessage = await client.getMessageById(sorteioAtual.idMensagem);
      if (!pollMessage) {
        const chat = await client.getChatById(groupId);
        const msgs = await chat.fetchMessages({ limit: 50 });
        pollMessage = msgs.find(m => obterIdCompleto(m) === sorteioAtual.idMensagem);
      }
      if (pollMessage) {
        await pollMessage.delete(true);
        await client.sendMessage(groupId, 'O limite de participantes foi atingido. O sorteio está encerrado, aguardem o resultado.');
      }
    }
  }
});

client.on('message_reaction', async (reaction) => {
  console.log("Evento 'message_reaction' acionado!");
  console.log('REACTION RAW:', JSON.stringify(reaction, null, 2));

  const serialized = obterIdCompleto(reaction.msgId) || obterIdCompleto(reaction.id);
  const messageId = extrairIdBasico(serialized);
  const groupId = reaction.chatId || reaction.msgId?.remote || reaction.id?.remote || null;
  const participante = reaction.senderId;

  if (!messageId || !groupId || !participante) return;

  const sorteioAtivo = await verificarSorteioAtivo(groupId);
  const sorteioBaseId = extrairIdBasico(sorteioAtivo?.idMensagem);
  if (!sorteioAtivo || messageId !== sorteioBaseId) return;

  if (reaction.reaction) {
    console.log(`Adicionando participante ${participante} ao sorteio ${groupId}`);
    adicionarParticipante(groupId, participante);
  } else {
    console.log(`Removendo participante ${participante} do sorteio ${groupId}`);
    removerParticipante(groupId, participante);
  }

  const atualizado = carregarSorteios().find(s => s.idGrupo === groupId);
  if (atualizado) {
    console.log('Participantes atuais:', atualizado.participantes.join(', '));
  }

  const sorteioAtual = await verificarSorteioAtivo(groupId);
  if (sorteioAtual && sorteioAtual.limite > 0 && sorteioAtual.participantes.length >= sorteioAtual.limite) {
    if (sorteioAtual.idMensagem) {
      const msg = await client.getMessageById(sorteioAtual.idMensagem);
      if (msg) {
        await msg.delete(true);
        await client.sendMessage(groupId, 'O limite de participantes foi atingido. O sorteio está encerrado, aguardem o resultado.');
      }
    }
  }
});

module.exports = {
  criarSorteio,
  adicionarParticipante,
  removerParticipante,
  finalizarSorteio,
  verificarSorteioAtivo,
  iniciarVerificacaoSorteiosAtivos,
  carregarSorteios,
  extrairIdBasico,
  obterIdCompleto
};
