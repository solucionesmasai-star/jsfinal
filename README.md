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

## Funcionamiento cíclico

El horario usa un ciclo continuo de 3 semanas. La aplicación permite definir una fecha de inicio del ciclo y proyectar cualquier mes calendario. Cambiar de mes o de año no reinicia la rotación.

La fecha de inicio se normaliza automáticamente al lunes de esa semana.

## Validaciones

- cobertura diaria desde 07:00 hasta 24:00;
- máximo 6 días consecutivos;
- control de cierre 24:00 seguido de apertura 07:00;
- continuidad del ciclo al cruzar meses y años;
- resumen mensual por JS;
- domingos libres;
- exportación CSV del mes seleccionado.

## Uso

No requiere instalación ni dependencias. Abrir `index.html` directamente en el navegador.


## Regla de descanso entre turnos

- Un turno **T (15:00–24:00)** nunca puede ser seguido al día siguiente por un turno **M (07:00–15:00)**.
- Esta regla se valida también entre semanas, meses y años porque el ciclo es continuo.
