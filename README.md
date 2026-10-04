# Turnos Jefes de Servicio

Versión simple del proyecto de turnos para 3 Jefes de Servicio.

## Archivos

- `.gitignore`
- `app.js`
- `index.html`
- `README.md`
- `styles.css`

No usa React, TypeScript, Node, npm ni dependencias externas.

## Reglas actuales

- 3 Jefes de Servicio.
- Cobertura diaria desde 07:00 hasta 24:00.
- No realizan turno noche.
- Jornada objetivo: 42 horas semanales.
- 5 días trabajados y 2 libres por semana.
- Máximo 6 días consecutivos trabajados.
- Turnos:
  - M = 07:00–15:00 (8 h)
  - T = 15:00–24:00 (9 h)
  - R = 10:00–17:00 (7 h)
  - L = Libre
- Rotación continua de domingos libres.
- Validación de cierre a las 24:00 seguido de apertura a las 07:00.
- Proyección configurable entre 1 y 52 semanas.
- Exportación CSV.

## Uso

Abrir `index.html` directamente en el navegador.

También puede usarse con un servidor local simple, por ejemplo con Visual Studio Code y Live Server.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Initial JS schedule planner"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

## Estructura

```text
/
├── .gitignore
├── app.js
├── index.html
├── README.md
└── styles.css
```
