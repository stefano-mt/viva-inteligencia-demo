# Acceso a la demo

## Qué queda protegido

La imagen `web` usa autenticación HTTP Basic en Nginx para la interfaz, los assets y todas las rutas `/api`. Solo `/health/live` queda sin contraseña para el health check. `api` y `ops` no publican puertos en Docker Compose; el puerto web se enlaza por defecto a `127.0.0.1`. Sin archivo de credenciales, la lista vacía `infra/docker/deny-all.htpasswd` impide el acceso.

Esto es una barrera de demostración, no identidad empresarial: una misma cuenta compartida no aporta roles, auditoría individual ni revocación por persona.

## Preparar credenciales locales

1. Ejecutar `npm run auth:generate` desde la raíz. El comando crea `infra/docker/.htpasswd.local`, ignorado por Git, y muestra una contraseña aleatoria **una sola vez**. Si ya existe el archivo, falla en vez de reemplazarlo.
2. Crear un archivo `.env` local con `VIVA_BASIC_AUTH_FILE=./infra/docker/.htpasswd.local`. No versionarlo.
3. Ejecutar `docker compose up -d --build` y entrar a `http://localhost:8080`. El navegador solicitará usuario y contraseña.
4. Para rotar la contraseña, conservar una copia segura, retirar manualmente el archivo antiguo, volver a ejecutar el generador y recrear `web`. No guardar la contraseña en commits, imágenes, URL ni variables de build.

Para un entorno remoto, montar el archivo como secreto de la plataforma OCI, terminar HTTPS **antes** del contenedor y limitar el puerto interno a la red privada. HTTP Basic sobre HTTP remoto transmite credenciales reversibles; el `localhost` de Compose está diseñado solo para pruebas en el equipo. `npm run dev` y `npm run preview` son servidores de desarrollo sin autenticación, ligados a loopback, y no son mecanismos de publicación.

## GitHub Pages

GitHub Pages no ejecuta la validación de contraseña de Nginx. Una pantalla de login implementada solo en JavaScript dejaría los archivos accesibles. El 24 sep. 2026 se retiró el sitio de Pages de `stefano-mt/viva-inteligencia-demo`; GitHub confirmó `has_pages=false` y la URL `https://stefano-mt.github.io/viva-inteligencia-demo/` devolvió 404. No volver a habilitar Pages ni un workflow que lo publique. Si se habilita otra vez, la demo quedará pública aunque el contenedor esté protegido.

Un repositorio público también conserva accesible su código e historial. Si los datos o el código son confidenciales, evaluar convertir el repositorio en privado y revisar forks, clones, Actions y artefactos publicados. Eso es una decisión de visibilidad independiente de la contraseña de la aplicación.
