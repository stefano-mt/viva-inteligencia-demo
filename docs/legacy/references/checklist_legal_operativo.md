# Checklist legal y operativo para scraping de webs propias

Este checklist no reemplaza revisión legal. Sirve para documentar riesgos antes de ejecutar crawling amplio.

## Por dominio

- [ ] Web oficial confirmada o razonablemente atribuible a la inmobiliaria.
- [ ] `robots.txt` revisado.
- [ ] Reglas relevantes documentadas.
- [ ] Sitemap declarado o probado.
- [ ] Términos de uso revisados si existen.
- [ ] Política de privacidad identificada si existe.
- [ ] No hay login obligatorio para datos objetivo.
- [ ] No hay CAPTCHA o bloqueo activo.
- [ ] No se requiere evadir controles.
- [ ] No se capturan datos personales sensibles.
- [ ] No se scrapean perfiles personales.
- [ ] Se usa user-agent identificable.
- [ ] Se usan rate limits conservadores.
- [ ] Se registra fecha/hora de captura.
- [ ] Se guarda evidencia técnica.

## Flags

Usar estos valores en `legal_operational_flag`:

- `clear_preliminary`: sin hallazgos bloqueantes preliminares.
- `review_required`: requiere revisión humana/legal.
- `robots_disallow_relevant_paths`: robots bloquea rutas relevantes.
- `tos_restrictive`: términos parecen restringir scraping.
- `blocked_access`: CAPTCHA/login/403/bloqueo activo.
- `sensitive_data_risk`: riesgo de datos sensibles.
- `not_official_or_unconfirmed`: dominio no confirmado como oficial.

## Principios de seguridad

- No evadir restricciones.
- No usar credenciales sin autorización.
- No rotar identidades para saltar bloqueos.
- No capturar información no pública.
- No transformar estimaciones públicas en ventas reales.
- No presentar campos no observados como datos reales.
