const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { crearUsuarioGuacamole, eliminarUsuarioGuacamole } = require('./guacamoleService');
const { crearVmParaUsuario, borrarVmDeUsuario } = require('./vmService');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta /usuarios debe ir antes de static
app.get('/usuarios', (req, res) => {
  const query = 'SELECT email FROM usuarios';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error al recuperar usuarios' });
    }
    res.json(results);
  });
});

app.use(express.static(__dirname + '/../public'));

const db = mysql.createConnection({
  host: 'db',
  user: 'root',
  password: 'root',
  database: 'ciberseguridad'
});


db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// REGISTRO OPTIMIZADO
app.post('/register', (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password?.trim();

  if (!email || !password) {
    return res.status(400).send('Correo y contraseña son obligatorios');
  }

  const checkQuery = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(checkQuery, [email], (checkErr, results) => {
    if (checkErr) {
      return res.status(500).send('Error al verificar usuario existente');
    }

    if (results.length > 0) {
      console.warn(`Intento de registrar usuario ya existente: ${email}`);
      return res.status(409).send('El usuario ya existe');
    }

    const insertQuery = 'INSERT INTO usuarios (email, password) VALUES (?, ?)';
    db.query(insertQuery, [email, password], (insertErr) => {
      if (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).send('El usuario ya existe');
        }
        return res.status(500).send('Error al registrar usuario');
      }

      // Respondemos rápido al frontend para evitar timeout
      res.status(202).send('Usuario registrado, creando entorno...');

// Creamos la VM y la conexión Guacamole en segundo plano
(async () => {
  try {
    const { nombreVm, ipVm } = await crearVmParaUsuario(email);

    if (!nombreVm || !ipVm) {
      console.warn('Atención: nombreVm o ipVm está vacío o indefinido.');
    }

    await crearUsuarioGuacamole(email, password, ipVm);

    const updateQuery = 'UPDATE usuarios SET ip_vm = ?, nombre_vm = ? WHERE email = ?';
    db.query(updateQuery, [ipVm, nombreVm, email], (updateErr) => {
      if (updateErr) {
        console.error('Error actualizando IP y VM en DB:', updateErr);
      } else {
        console.log('IP y VM guardadas correctamente en la base de datos');
      }
    });

    console.log(`Usuario registrado correctamente: ${email}`);
    console.log(`   └─ VM: ${nombreVm} (${ipVm})`);

  } catch (guacError) {
    console.error(`Error creando entorno para ${email}:`, guacError);
  }
})();

    });
  });
});

app.post('/login', (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password?.trim();

  if (!email || !password) {
    return res.status(400).send('Correo y contraseña son obligatorios');
  }

  if (email === 'admin@upm.es' && password === 'admin') {
    return res.status(200).json({ admin: true });
  }

  const query = 'SELECT * FROM usuarios WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) {
      return res.status(500).send('Error al verificar el usuario');
    }

    if (results.length > 0) {
      return res.status(200).json({ admin: false });
    } else {
      return res.status(404).send('Usuario no encontrado. Por favor, regístrate.');
    }
  });
});

// NUEVA RUTA PARA BORRAR TODOS LOS USUARIOS
app.post('/borrar-todos-los-usuarios', async (req, res) => {
  const queryUsuarios = 'SELECT email FROM usuarios';

  db.query(queryUsuarios, async (err, results) => {
    if (err) {
      console.error('❌ Error al obtener los usuarios:', err);
      return res.status(500).send('Error al obtener los usuarios de la base de datos');
    }

    try {
      for (let usuario of results) {
        const email = usuario.email;

        if (email === 'guacadmin') {
          continue;
        }

        const deleteQuery = 'DELETE FROM usuarios WHERE email = ?';
        await new Promise((resolve, reject) => {
          db.query(deleteQuery, [email], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        await eliminarUsuarioGuacamole(email);
        await borrarVmDeUsuario(email);
      }

      res.status(200).send('Todos los usuarios han sido eliminados correctamente');
    } catch (err) {
      console.error('❌ Error al eliminar usuarios y conexiones:', err);
      res.status(500).send('Error al eliminar usuarios, conexiones o VMs');
    }
  });
});

// NUEVA RUTA PARA BORRAR UN USUARIO
app.post('/borrar-usuario', (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return res.status(400).send('Email requerido');

  const deleteQuery = 'DELETE FROM usuarios WHERE email = ?';
  db.query(deleteQuery, [email], async (err) => {
    if (err) {
      console.error('❌ Error al borrar de la base externa:', err);
      return res.status(500).send('Error al borrar de la base externa');
    }

    try {
      await eliminarUsuarioGuacamole(email);
      await borrarVmDeUsuario(email);
      res.status(200).send('Usuario eliminado de ambas bases y VM eliminada');
    } catch (guacErr) {
      console.error('❌ Error al eliminar de Guacamole o VM:', guacErr);
      res.status(500).send('Usuario eliminado en la base externa, pero error en Guacamole o VM');
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://192.168.1.50:${port}`);
});
