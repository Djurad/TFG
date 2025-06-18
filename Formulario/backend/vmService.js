const axios = require('axios');

// Dirección del watcher ejecutándose en el host
const WATCHER_URL = 'http://192.168.1.50:5000';

async function crearVmParaUsuario(email) {
  try {
    console.log(`Enviando petición para crear VM con email: ${email}`);
    const res = await axios.post(`${WATCHER_URL}/crear-vm`, { email });
    console.log('Respuesta recibida del watcher:', res.data);
    return res.data; // { nombreVm, ipVm }
  } catch (error) {
    console.error('Error al crear VM desde vmService:', error.message);
    throw error;
  }
}

async function borrarVmDeUsuario(email) {
  try {
    console.log(`Enviando petición para borrar VM con email: ${email}`);
    await axios.post(`${WATCHER_URL}/borrar-vm`, { email });
    console.log('VM borrada correctamente');
  } catch (error) {
    console.error('Error al borrar VM desde vmService:', error.message);
    throw error;
  }
}

module.exports = {
  crearVmParaUsuario,
  borrarVmDeUsuario,
};
