const fs = require('fs');
const path = require('path');

// Caminho para armazenar os metadados
const dbPath = './db/metadados';

// Função para criar o arquivo de metadados inicial
function criarMetadadoGrupo(groupId, groupName, membros, admins) {
  const dadosIniciais = {
    groupId: groupId,  // O ID do grupo está aqui
    groupName: groupName,  // Apenas o nome do grupo (como string, não como objeto)
    membros: membros,  // Lista de membros
    admins: admins  // Lista de administradores
  };

  const filePath = path.join(dbPath, `${groupId}.json`);
  
  // Verifica se o arquivo já existe
  if (fs.existsSync(filePath)) {
    console.log('Metadados já existem para este grupo.');
    return;
  }

  // Cria o arquivo com os dados iniciais
  fs.writeFileSync(filePath, JSON.stringify(dadosIniciais, null, 2));
  console.log(`Metadados criados para o grupo: ${groupName}`);
}

// Função para atualizar os membros e admins de um grupo
function atualizarMembrosGrupo(groupId, membros, admins) {
  const filePath = path.join(dbPath, `${groupId}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log('Grupo não encontrado, criando novos metadados...');
    return; // Cria os metadados iniciais se o arquivo não existir
  }

  // Lê o arquivo JSON
  const dadosGrupo = JSON.parse(fs.readFileSync(filePath));

  // Atualiza os membros e admins
  dadosGrupo.membros = membros;
  dadosGrupo.admins = admins;

  // Escreve os dados atualizados no arquivo
  fs.writeFileSync(filePath, JSON.stringify(dadosGrupo, null, 2));
  console.log(`Metadados do grupo ${groupId} atualizados.`);
}

// Função para consultar se os metadados já existem para o grupo
function consultarMetadadoGrupo(groupId) {
  const filePath = path.join(dbPath, `${groupId}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log('Metadados não encontrados para este grupo.');
    return null;
  }

  // Retorna os dados do grupo
  const dadosGrupo = JSON.parse(fs.readFileSync(filePath));
  return dadosGrupo;
}

// Exportando as funções para uso em outros arquivos
module.exports = {
  criarMetadadoGrupo,
  atualizarMembrosGrupo,
  consultarMetadadoGrupo
};
