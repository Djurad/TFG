#  Sistema de Gestión de Entornos Virtualizados para Prácticas de Ciberseguridad

**Trabajo Fin de Grado – Universidad Politécnica de Madrid**  
**Autor:** Diego Ramiro Jurado Reyna · 2025

---

##  Descripción general

Este proyecto permite al profesorado desplegar máquinas virtuales aisladas para cada alumno, listas para acceder desde el navegador. Está pensado para prácticas de ciberseguridad, ofreciendo un entorno sencillo de usar.

La solución está diseñada para ejecutarse sobre sistemas operativos Linux con soporte para virtualización mediante KVM/QEMU. 
En caso de ejecutarse desde una máquina virtual, es imprescindible que el equipo físico tenga habilitada la **virtualización anidada**.La virtualización anidada se puede activar desde la BIOS de su dispositivo.

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
- **iptables**, **nmcli**, **bridges**
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
