# Matriz del MVP de ReviewFlow

Estado tras la migración incremental del 23 de septiembre de 2026. «Parcial» significa que la interfaz o la lógica existe, pero falta una fuente de datos, una prueba de operación real o un programador.

| Funcionalidad | Estado | Base reutilizada y trabajo pendiente |
| --- | --- | --- |
| 1. Auth / usuarios | Existente y reutilizable | Enlace de email con token de un solo uso y sesión firmada. Falta probar entrega real con remitente verificado. `users` heredada sigue vacía. |
| 2. Alta de negocio | Existente y reutilizable | Perfil por email y página de configuración. Validar el flujo completo con una cuenta nueva. |
| 3. Búsqueda de negocio | Existente y reutilizable | Google Places desde servidor; requiere clave del proyecto. |
| 4. Competidores | Existente y reutilizable | Relaciones por perfil, alta y baja. El alias compartido por Place ID requiere refactor para varios clientes. |
| 5. Snapshots del negocio | Parcialmente implementado | Tabla e histórico conservados; piloto de entrada manual con procedencia e idempotencia diaria. Falta fuente automática autorizada. |
| 6. Snapshots de competidores | Parcialmente implementado | Tabla y 80 capturas heredadas; piloto manual limitado a competidores vinculados. Falta fuente automática autorizada. |
| 7. Histórico | Existente y reutilizable | API y página de lectura con acceso por propietario. Consulta acotada a 100 capturas propias y 500 de competidores. |
| 8. Detección de cambios | Parcialmente implementado | Diferencias y alertas basadas en capturas comparables del mismo origen; se evita duplicar capturas manuales del mismo día. Falta automatización. |
| 9. Panel «Qué ha cambiado» | Existente y reutilizable | Compara con última visita y muestra alertas, métricas e insights. |
| 10. Comparativa competitiva | Existente y reutilizable | Valoración, volumen y crecimiento semanal cuando hay periodo comparable. |
| 11. Alertas | Parcialmente implementado | Listado e inserción desde rutas de captura. Falta captura periódica autorizada e idempotencia persistente. |
| 12. Análisis de reseñas | Parcialmente implementado | Contrato de fuente y análisis temático con reseñas ficticias en `/demo`. Falta fuente licenciada para datos reales. |
| 13. Insights generados | Existente y reutilizable | Reglas deterministas sobre métricas; ampliar solo a partir de preguntas reales de usuarios. |
| 14. Email semanal | Parcialmente implementado | Plantilla, preferencia, endpoint protegido, flag global y cron de Vercel configurado. Falta despliegue y prueba de entrega real. |
| 15. Configuración | Existente y reutilizable | Datos del negocio, Places, Instagram y preferencia de email. Refinar validaciones y mensajes según pruebas de uso. |

## Pospuesto

La landing pública, los contadores de visitas/clics y el campo de WiFi pertenecen al producto anterior. Su código y datos se conservan, pero están fuera de la navegación principal del MVP. No añadir campañas, respuestas automáticas ni funcionalidades de marketing antes de validar el flujo de inteligencia competitiva.
