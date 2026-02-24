# Despliegue en Amazon Lightsail usando Docker

Este proyecto ya quedó preparado para ejecutarse con Docker en un servidor Linux de Amazon Lightsail.

## 1) Requisitos en Lightsail

- Instancia Linux (Ubuntu recomendado)
- Puertos abiertos en el firewall de Lightsail:
  - `22` (SSH)
  - `80` y/o `443` (si usas proxy)
  - `8080` (si publicarás directo la API)

## 2) Instalar Docker y Docker Compose plugin

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 3) Subir el proyecto al servidor

Opciones típicas:

- `git clone` del repositorio directamente en Lightsail, o
- copiar el código con `scp/rsync`.

## 4) Configurar variables de entorno

1. Crear `.env` desde el ejemplo:

```bash
cp .env.example .env
```

2. Editar `.env` con tus credenciales reales.

## 5) Construir y levantar contenedor

```bash
docker compose up -d --build
```

Verificar:

```bash
docker compose ps
docker compose logs -f
curl http://localhost:8080/health
```

## 6) Actualizar a futuro

```bash
git pull
docker compose up -d --build
```

## Archivos Docker incluidos

- `Dockerfile`: imagen de producción para Node + Puppeteer.
- `docker-compose.yml`: servicio `scraper` y mapeo de puerto `8080:8080`.
- `.dockerignore`: minimiza contexto de build.

## Recomendación para producción

Si expondrás públicamente, coloca Nginx o un balanceador delante del puerto 8080 para TLS (`https`) y rate limiting.
