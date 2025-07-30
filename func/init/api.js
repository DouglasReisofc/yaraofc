const chalk = require('chalk');
const path = require('path');
const config = require(path.resolve(__dirname, '../../dono/config.json'));

/**
 * Envia ao dono os detalhes de pareamento utilizando o cliente oficial.
 * @param {import('whatsapp-web.js').Client} client Instância do cliente.
 * @param {string} pairingCode Código de pareamento exibido pelo WhatsApp.
 */
async function sendPairingDetails(client, pairingCode) {
  try {
    const state = await client.getState().catch(() => null);
    if (state !== 'CONNECTED') {
      console.warn(chalk.yellow('Cliente não conectado, impossível enviar detalhes de pareamento.'));
      return;
    }

    const message =
      `🔑 Seu código de pareamento é ${pairingCode}\n\n` +
      `🤖 Informações do Bot:\n- Nome: ${config.nomeBot}\n` +
      `- Número do Bot: ${config.numeroBot}\n- Prefixo: ${config.prefixo}\n` +
      `- Site da API: ${config.siteapi}`;

    await client.sendMessage(`${config.numeroDono}@c.us`, message);
    console.log(
      chalk.green(
        'Código de pareamento e informações do bot enviados com sucesso ao dono!'
      )
    );
  } catch (error) {
    console.error(chalk.red('Erro ao enviar o código de pareamento:'), error.message);
  }
}

/**
 * Envia uma mensagem de texto através do cliente oficial.
 * @param {import('whatsapp-web.js').Client} client Instância do cliente.
 * @param {string} number Número destino no formato internacional sem @c.us.
 * @param {string} message Texto a ser enviado.
 */
async function sendCustomMessage(client, number, message) {
  try {
    const state = await client.getState().catch(() => null);
    if (state !== 'CONNECTED') {
      console.warn(chalk.yellow('Cliente não conectado, mensagem não enviada.'));
      return;
    }

    await client.sendMessage(`${number}@c.us`, message);
    console.log(chalk.green(`Mensagem enviada com sucesso para ${number}!`));
  } catch (error) {
    console.error(chalk.red('Erro ao enviar a mensagem personalizada:'), error.message);
  }
}

module.exports = { sendPairingDetails, sendCustomMessage };
