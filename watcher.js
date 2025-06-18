const express = require('express');
const { exec } = require('child_process');
const app = express();
app.use(express.json());

function ejecutar(cmd) {
  return new Promise((res, rej) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return rej(stderr || err.message);
      res(stdout.trim());
    });
  });
}

app.post('/crear-vm', async (req, res) => {
  const email = req.body.email;
  const nombreBase = email.split('@')[0];
  const nombreVm = `vm-${nombreBase}`;
  try {
    await ejecutar(`virt-clone --original molde --name ${nombreVm} --auto-clone`);
    await ejecutar(`virsh start ${nombreVm}`);
    await new Promise(r => setTimeout(r, 30000));
    const ip = await ejecutar(`virsh qemu-agent-command ${nombreVm} '{"execute":"guest-network-get-interfaces"}' --pretty | jq -r '.return[] | select(.name=="enp1s0") | .["ip-addresses"][] | select(."ip-address-type"=="ipv4") | .["ip-address"]'`);

    res.json({ nombreVm, ipVm: ip });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

app.post('/borrar-vm', async (req, res) => {
  const email = req.body.email;
  const nombreBase = email.split('@')[0];
  const nombreVm = `vm-${nombreBase}`;
  try {
    await ejecutar(`virsh destroy ${nombreVm} || true`);
    await ejecutar(`virsh undefine ${nombreVm} --remove-all-storage`);
    res.send('OK');
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

app.listen(5000, () => {
  console.log('Watcher activo en http://localhost:5000');
});
