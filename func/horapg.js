const axios = require('axios');
const moment = require('moment-timezone');
const config = require('../dono/config.json');

const siteapi = config.siteapi;
const numerobot = config.numeroBot;

async function fetchHorapgFromAPI() {
  try {
    const response = await axios.get(`${siteapi}/horapg/bot/${numerobot}`);
    if (response.data && Array.isArray(response.data.horapg)) {
      return response.data.horapg;
    }
  } catch (error) {
    //console.error('Erro ao buscar horarios pg:', error.message);
  }
  return [];
}

async function storeHorapg(groupId, data = {}) {
  try {
    await axios.post(`${siteapi}/group/${groupId}/horapg`, data);
    return true;
  } catch (err) {
    //console.error('Erro ao salvar horapg:', err.message);
    return false;
  }
}

async function updateLastSent(groupId, lastSentAt) {
  try {
    await axios.patch(`${siteapi}/group/${groupId}/horapg/last-sent`, {
      last_sent_at: lastSentAt,
    });
  } catch (err) {
    //console.error('Erro ao atualizar last_sent:', err.message);
  }
}

async function deleteHorapg(groupId) {
  try {
    await axios.delete(`${siteapi}/group/${groupId}/horapg`);
  } catch (err) {
    //console.error('Erro ao deletar horapg:', err.message);
  }
}

module.exports = {
  fetchHorapgFromAPI,
  storeHorapg,
  updateLastSent,
  deleteHorapg,
};
