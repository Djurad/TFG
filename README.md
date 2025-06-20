#  Sistema de Gestión de Entornos Virtualizados para Prácticas de Ciberseguridad

**Trabajo Fin de Grado – Universidad Politécnica de Madrid**  
**Autor:** Diego Ramiro Jurado Reyna · 2025

---

##  Descripción general

Este proyecto permite al profesorado desplegar máquinas virtuales aisladas para cada alumno, listas para acceder desde el navegador. Está pensado para prácticas de ciberseguridad, ofreciendo un entorno sencillo de usar.

La solución está diseñada para ejecutarse sobre sistemas operativos Linux con soporte para virtualización mediante KVM/QEMU. 

En caso de ejecutarse desde una máquina virtual, es imprescindible que el equipo físico tenga habilitada la **virtualización anidada**.La virtualización anidada se puede activar desde la BIOS de su dispositivo. **NOTA:** No todos los dispositivos permiten activar esta opción.

Este trabajo ha sido desplegado y probado sobre una máquina virtual con **Ubuntu 24.04 LTS**, utilizando **VMware Workstation 17 Pro** como hipervisor, en modo bridge.
A la hora de activar el modo bridge en VMware resulta útil el siguiente tutorial: https://youtu.be/4f-5D4D2MQ0?si=aJa5Mr6N8xc5azO-


##  Funcionalidades principales

- Creación automática de VMs para cada alumno
- Acceso vía escritorio remoto desde el navegador
- Interfaz web para registro y gestión de alumnos
- Red aislada entre alumnos 
- Componentes desplegados con Docker 

---

##  Tecnologías utilizadas

- **Docker**, **Docker Compose**
- **Node.js**
- **MySQL**
- **Apache Guacamole**
- **QEMU/KVM**, **virt-manager**
- **iptables**, **nmcli**
- **TigerVNC**, **XFCE**

---

##  Estructura del proyecto

```
TFG/
├── Formulario/               → Formulario
│   ├── backend/              → Carpeta con la lógica del proyecto
│   ├── public/               → Archivos HTML (registro, login, panel de administración)
│   └── docker-compose.yml    → Archivo con backend y MySQL dockerizados
├── Guacamole/                 → Apache Guacamole 
│   └── docker-compose.yml    → Archivo de Guacamole dockerizado
├── watcher.js                → Componente que lanza máquinas virtuales desde el host
├── bridge/                   → Configuraciones de red tipo bridge dentro de la Vm padre, para crear puente con las Vms hijas
├── configXfecVnc/            → Configuración de escritorio XFCE + servicio VNC dentro de las Vms hijas
├── seguridad/                → Configuración de red y aislamiento dentro de las Vms hijas
```

---
## Requisitos previos y preparación del entorno

Antes de desplegar el sistema, es necesario realizar una serie de pasos previos en la máquina anfitriona (VM padre).

### 1. Crear el puente de red `br0`

Este puente permitirá que las máquinas virtuales hijas se conecten directamente a la red local:

```bash
# Creación del puente de red llamado br0
sudo nmcli connection add type bridge con-name br0 ifname br0

# Configuración de br0 con dirección IP estática y parámetros de red
sudo nmcli connection modify br0 \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8 8.8.4.4" \
  bridge.stp no \
  bridge.forward-delay 0 \
  ipv6.method ignore

# Asociación de la interfaz física ens33 como esclava del puente br0
sudo nmcli connection add type bridge-slave \
  ifname ens33 \
  master br0 \
  con-name ens33-slave

# Desactivación de la conexión original de ens33 (evita conflictos)
sudo nmcli connection down ens33 || true

# Activación de la interfaz esclava y del puente br0
sudo nmcli connection up ens33-slave
sudo nmcli connection up br0
```

> Este procedimiento está disponible en el archivo `bridge`.

---

### 2. Tener disponible una VM molde

Puedes usar directamente una VM ya preparada descargando los siguientes archivos:

📁 **[VM Molde - XML y .qcow2](https://mega.nz/file/gsJxhIZT#dq6sLpd_EeCLkS_ostibBQo24b8aCsCTmYxb5tRKQw4)**

---

### 3. (Opcional) Crear tu propia VM con XFCE y VNC

Si prefieres crear la VM molde desde cero, sigue los siguientes pasos:

```bash
# 1. Instalación de los paquetes necesarios
sudo apt update
sudo apt install xfce4 xfce4-goodies
sudo apt install tigervnc-standalone-server
sudo apt install dbus-x11

# 2. Preparación de la sesión VNC
vncserver
vncserver -kill :1

# 3. Configuración del archivo de inicio de sesión gráfica
nano ~/.vnc/xstartup
# Contenido
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
chmod +x ~/.vnc/xstartup

# 4. Crear servicio systemd para iniciar VNC automáticamente
sudo nano /etc/systemd/system/vncserver@.service
# Contenido
[Unit]
Description=Start TigerVNC server
After=syslog.target network.target

[Service]
Type=forking
User=alumno
Group=alumno
WorkingDirectory=/home/alumno

PIDFile=/home/alumno/.vnc/%H:%i.pid
ExecStartPre=-/usr/bin/vncserver -kill :%i > /dev/null 2>&1
ExecStart=/usr/bin/vncserver -depth 24 -geometry 1366x768 :%i -localhost no
ExecStop=/usr/bin/vncserver -kill :%i

[Install]
WantedBy=multi-user.target

# 5. Activar el servicio
sudo systemctl daemon-reload
sudo systemctl enable vncserver@1.service
sudo systemctl start vncserver@1.service
```

> Esta configuración se encuentra en `configXfecVnc/`.

---

### 4. (Opcional) Aplicar reglas de aislamiento de red entre VMs hijas

Estas reglas bloquean el tráfico entre VMs hijas y permiten únicamente el acceso desde la VM padre:

```bash
# script de configuración
#!/bin/bash
IPT="/usr/sbin/iptables"
# Limpiar reglas previas
$IPT -F
# Permitir acceso remoto VNC (puerto 5901) solo desde la VM padre
$IPT -A INPUT -p tcp --dport 5901 -s 192.168.1.50 -j ACCEPT
# Bloquear cualquier otro intento de acceso al puerto 5901
$IPT -A INPUT -p tcp --dport 5901 -j DROP
# Permitir  tráfico desde y hacia VM padre
$IPT -A INPUT -s 192.168.1.50 -j ACCEPT
$IPT -A OUTPUT -d 192.168.1.50 -j ACCEPT
# Bloquear  tráfico entre VMs hijas 
$IPT -A INPUT -s 192.168.1.0/24 -m iprange ! --src-range 192.168.1.50-192.168.1.50 -j DROP
$IPT -A OUTPUT -d 192.168.1.0/24 -m iprange ! --dst-range 192.168.1.50-192.168.1.50 -j DROP

# Permisos y ejecución del script
sudo chmod 700 /setup-firewall.sh
sudo /setup-firewall.sh

# Instalación de iptables-persistent para conservar reglas al reiniciar
sudo apt update
sudo apt install iptables-persistent
```

> Este script se encuentra en `seguridad/`.


## Cómo desplegar el sistema

### 1. Clonar el repositorio

```bash
git clone https://github.com/Djurad/TFG.git
cd TFG
```

### 2. Levantar el formulario (backend + base de datos)

```bash
cd Formulario
docker compose up -d
```

### 3. Levantar Apache Guacamole

```bash
cd ../Gucamole
docker compose up -d
```

### 4. Iniciar el Watcher en el host

```bash
cd ..
node watcher.js
```

---

 Una vez desplegado el formulario, accede a la interfaz web desde:  
[http://localhost:3000](http://localhost:3000)

---

##  Licencia MIT

MIT License  
Copyright (c) 2025 Diego Ramiro Jurado Reyna
