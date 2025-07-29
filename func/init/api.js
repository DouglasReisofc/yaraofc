const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '../../dono/config.json'));

async function sendPairingDetails(pairingCode) {
  try {
    const message = `
🔑 Seu código de pareamento é

          ${pairingCode}

🤖 Informações do Bot:
- Nome: ${config.nomeBot}
- Número do Bot: ${config.numeroBot}
- Prefixo: ${config.prefixo}
- Site da API: ${config.siteapi}
`;

    const response = await axios.post(
      'https://wzap.assinazap.shop/message/sendText/559295333643',
      {
        number: config.numeroDono,
        text: message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': '44BD7D97B33A-4DDF-8EC4-168678B4B808'
        }
      }
    );

    const status = response.data?.status || "UNKNOWN";
    if (status === "PENDING" || status === "SUCCESS") {
      console.log(chalk.green('Código de pareamento e informações do bot enviados com sucesso ao dono!'));
    } else {
      console.log(
        chalk.red('Falha ao enviar o código de pareamento e informações do bot!'),
        `\nDetalhes: ${JSON.stringify(response.data)}`
      );
    }
  } catch (error) {
    console.error(
      chalk.red('Erro ao enviar o código de pareamento:'),
      error.response ? error.response.data : error.message
    );
  }
}

async function sendCustomMessage(number, message) {
    try {
      const response = await axios.post(
        'https://wzap.assinazap.shop/message/sendText/559295333643',
        {
          number: number,
          text: message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': '44BD7D97B33A-4DDF-8EC4-168678B4B808'
          }
        }
      );
  
      const status = response.data?.status || "UNKNOWN";
      if (status === "PENDING" || status === "SUCCESS") {
        console.log(chalk.green(`Mensagem enviada com sucesso para ${number}!`));
      } else {
        console.log(
          chalk.red('Falha ao enviar a mensagem personalizada!'),
          `\nDetalhes: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      console.error(
        chalk.red('Erro ao enviar a mensagem personalizada:'),
        error.response ? error.response.data : error.message
      );
    }
  }
  
  module.exports = { sendPairingDetails, sendCustomMessage };
  
