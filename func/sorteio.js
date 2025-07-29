const client = require('../client.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

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
    sorteioExistente.idMensagem = idMensagem;
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
function adicionarParticipante(idGrupo, participante) {
  const sorteios = carregarSorteios();
  const sorteio = sorteios.find(s => s.idGrupo === idGrupo);

  if (sorteio) {
    if (!sorteio.participantes.includes(participante)) {
      sorteio.participantes.push(participante);
      salvarSorteios(sorteios);
      console.log(`Participante ${participante} adicionado ao sorteio do grupo ${idGrupo}`);
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
    console.log(`Participante ${participante} removido do sorteio do grupo ${idGrupo}`);
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
        await client.interface.openChatWindow(sorteio.idGrupo);

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
          await client.sendMessage(sorteio.idGrupo, mensagemFinal, { mentions: mentionIds });
        } else {
          // Mensagem personalizada quando não há vencedores devido à falta de participantes
          mensagemFinal = `乂 S O R T E I O   F I N A L I Z A D O 乂\n\nO sorteio "${sorteio.titulo}" foi finalizado, mas não houve vencedores, pois não havia participantes suficientes. 😔\n\nObrigado a todos que participaram! 🎁✨`;
          await client.sendMessage(sorteio.idGrupo, mensagemFinal);
        }

        // Exclui a enquete se o ID da mensagem for válido
        if (sorteio.idMensagem) {
          try {
            const pollMessage = await client.getMessageById(sorteio.idMensagem);
            if (pollMessage) {
              await pollMessage.delete(true);
              console.log(`Enquete excluída com sucesso para o sorteio "${sorteio.titulo}".`);
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

  const pollId = vote.parentMessage.id ? vote.parentMessage.id._serialized : 'Não encontrado';
  const voter = vote.voter;
  const selectedOptions = vote.selectedOptions;

  const sorteioAtivo = await verificarSorteioAtivo(vote.parentMessage.to);

  if (!sorteioAtivo || pollId !== sorteioAtivo.idMensagem) {
    return;
  }

  const groupId = vote.parentMessage.to;

  if (selectedOptions.length === 0) {
    removerParticipante(groupId, voter);
  } else {
    const chosenOption = selectedOptions[0].name;
    if (chosenOption === 'Participar ❤️') {
      adicionarParticipante(groupId, voter);
    } else if (chosenOption === 'Não Participar 😬') {
      removerParticipante(groupId, voter);
    }
  }

  const sorteioAtual = await verificarSorteioAtivo(groupId);
  if (sorteioAtual && sorteioAtual.limite > 0 && sorteioAtual.participantes.length >= sorteioAtual.limite) {
    if (sorteioAtual.idMensagem) {
      const pollMessage = await client.getMessageById(sorteioAtual.idMensagem);
      if (pollMessage) {
        await pollMessage.delete(true);
        await client.sendMessage(groupId, "O limite de participantes foi atingido. O sorteio está encerrado, aguardem o resultado.");
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
  carregarSorteios
};
