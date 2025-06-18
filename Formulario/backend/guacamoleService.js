const axios = require('axios');

const GUAC_URL = 'http://192.168.1.50:8080';
const ADMIN_USER = 'guacadmin';
const ADMIN_PASS = 'guacadmin';
const VNC_PORT = '5901';
const VNC_PASS = 'vncpassword';

async function crearUsuarioGuacamole(email, password,ipvm) {
  const username = email.trim().toLowerCase();
  const baseUsername = username.split('@')[0];
  const connectionName = `${baseUsername}-PracticaWifi`;

  try {
    const tokenResponse = await axios.post(`${GUAC_URL}/guacamole/api/tokens`, null, {
      params: { username: ADMIN_USER, password: ADMIN_PASS }
    });
    const token = tokenResponse.data.authToken;

    try {
      await axios.post(`${GUAC_URL}/guacamole/api/session/data/mysql/users?token=${token}`, {
        username,
        password,
        attributes: { disabled: false, expired: false }
      });
      console.log('Usuario creado');
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.warn(`Usuario ${username} ya existe en Guacamole. Continuando...`);
      } else {
        throw error;
      }
    }

    await axios.post(`${GUAC_URL}/guacamole/api/session/data/mysql/connections?token=${token}`, {
      name: connectionName,
      protocol: 'vnc',
      parameters: {
        hostname: ipvm,
        port: VNC_PORT,
        password: VNC_PASS
      },
      attributes: {}
    });

    const connectionsResponse = await axios.get(`${GUAC_URL}/guacamole/api/session/data/mysql/connections?token=${token}`);
    const conexiones = Object.entries(connectionsResponse.data).map(([id, conn]) => ({
      identifier: id,
      ...conn
    }));

    const connection = conexiones.find(c => c.name === connectionName);

    if (!connection) {
      throw new Error(`Conexión '${connectionName}' no encontrada`);
    }

    const connectionId = connection.identifier;

    await axios.patch(`${GUAC_URL}/guacamole/api/session/data/mysql/users/${username}/permissions?token=${token}`, [
      { op: 'add', path: `/connectionPermissions/${connectionId}`, value: 'READ' },
      { op: 'add', path: '/systemPermissions', value: 'CREATE_CONNECTION' }
    ]);

    console.log(`Usuario ${username} y conexión ${connectionName} creados en Guacamole.`);
  } catch (error) {
    console.error('Error creando usuario en Guacamole:', error.response?.data || error.message);
    throw error;
  }
}

async function eliminarUsuarioGuacamole(email) {
  const username = email.trim().toLowerCase();
  const baseUsername = username.split('@')[0];
  const connectionName = `${baseUsername}-PracticaWifi`;

  // Evitar eliminar el usuario guacadmin
  if (username === 'guacadmin') {
    console.log('No se puede eliminar al usuario guacadmin');
    return;  // No hacemos nada si es guacadmin
  }

  try {
    const tokenResponse = await axios.post(`${GUAC_URL}/guacamole/api/tokens`, null, {
      params: { username: ADMIN_USER, password: ADMIN_PASS }
    });
    const token = tokenResponse.data.authToken;

    const connectionsRes = await axios.get(`${GUAC_URL}/guacamole/api/session/data/mysql/connections?token=${token}`);
    const conexiones = Object.entries(connectionsRes.data).map(([id, conn]) => ({ id, ...conn }));
    const conn = conexiones.find(c => c.name === connectionName);

    if (conn) {
      await axios.delete(`${GUAC_URL}/guacamole/api/session/data/mysql/connections/${conn.id}?token=${token}`);
      console.log(`Conexión ${connectionName} eliminada`);
    } else {
      console.warn(`Conexión ${connectionName} no encontrada`);
    }

    await axios.delete(`${GUAC_URL}/guacamole/api/session/data/mysql/users/${username}?token=${token}`);
    console.log(`Usuario ${username} eliminado`);
  } catch (error) {
    console.error('Error eliminando usuario en Guacamole:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { crearUsuarioGuacamole, eliminarUsuarioGuacamole };
