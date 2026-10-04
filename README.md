# Turnos Jefes de Servicio

Aplicación simple en HTML, CSS y JavaScript puro para proyectar el horario mensual de tres Jefes de Servicio.

## Archivos

- `.gitignore`
- `app.js`
- `index.html`
- `README.md`
- `styles.css`

## Modelo de turnos

- M: 07:00–15:00 (8 h)
- T: 15:00–24:00 (9 h)
- R: 10:00–17:00 (7 h)
- L: Libre

## Reglas principales

- 3 Jefes de Servicio.
- 42 horas semanales por JS.
- 5 días trabajados y 2 libres por semana.
- Máximo 6 días consecutivos.
- Nunca se asigna M al día siguiente de un T.
- De lunes a sábado se mantiene cobertura M + T.
- Cada JS recibe exactamente 2 domingos libres por mes.
- Cada domingo debe trabajar al menos 1 JS.
- Si un domingo trabaja un solo JS, recibe únicamente M o T.
- Si trabajan 2 JS el domingo, se asignan M + T.
- La asignación dominical rota mes a mes para mantener equidad.

## Funcionamiento cíclico

El horario se proyecta por mes calendario, pero las semanas se construyen como un ciclo continuo desde la fecha de inicio configurada. Cambiar de mes no reinicia la continuidad entre turnos.

## Uso

No requiere instalación ni dependencias. Abrir `index.html` directamente en el navegador.
