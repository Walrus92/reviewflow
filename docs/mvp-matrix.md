# Matriz del MVP de ReviewFlow

Estado tras preparar el piloto automático de datos propios el 24 de septiembre de 2026. «Parcial» significa que existe lógica o interfaz, pero falta autorización de Google, una fuente con derechos adecuados o una prueba con datos reales.

| Funcionalidad | Estado | Base reutilizada y trabajo pendiente |
| --- | --- | --- |
| 1. Auth / usuarios | Existente y reutilizable | Enlace de email con token de un solo uso y sesión firmada. Falta probar entrega real con remitente verificado. `users` heredada sigue vacía. |
| 2. Alta de negocio | Existente y reutilizable | Perfil por email, nombre declarado por el propietario y configuración. Alta nueva probada localmente. |
| 3. Búsqueda de negocio | Parcialmente implementado | Tras OAuth se listan las fichas gestionadas por la cuenta Google y se elige una. Falta probarlo con una ficha real; la búsqueda genérica por Places se desactivó para este uso. |
| 4. Competidores | Existente y reutilizable | Relaciones por perfil, alta y baja. El alias compartido por Place ID requiere refactor para varios clientes. |
| 5. Snapshots del negocio | Parcialmente implementado | Tabla e histórico conservados; entrada manual con procedencia. La captura automática de totales GBP se retiró del cron por restricciones de almacenamiento. Resolver derechos de persistencia antes de reactivarla. |
| 6. Snapshots de competidores | Parcialmente implementado | Tabla y 80 capturas heredadas conservadas para auditoría; piloto manual limitado a competidores vinculados. Falta fuente automática con licencia y retención adecuadas. |
| 7. Histórico | Existente pero necesita refactor | API y página de lectura con acceso por propietario; ahora muestran solo capturas manuales. La fuente histórica automática requiere permiso de conservación. |
| 8. Detección de cambios | Parcialmente implementado | Diferencias y alertas basadas en capturas manuales comparables del mismo origen; se evita duplicar capturas del mismo día. El análisis de reseñas propias conectadas compara periodos durante la visita, sin guardar derivados. |
| 9. Panel «Qué ha cambiado» | Existente y reutilizable | Hallazgos con evidencia y acción; añade consulta en directo de reseñas propias cuando haya ficha conectada. Las novedades guardadas se marcan explícitamente como vistas. |
| 10. Comparativa competitiva | Parcialmente implementado | Valoración, volumen y crecimiento semanal solo con capturas manuales comparables; falta fuente competitiva automática permitida. |
| 11. Alertas | Parcialmente implementado | Listado e inserción desde capturas manuales. Las alertas procedentes de fuentes Google heredadas quedan fuera de la vista operativa. Falta captura periódica autorizada. |
| 12. Análisis de reseñas | Parcialmente implementado | Consulta OAuth de reseñas propias preparada, hasta 200 por visita, con análisis en memoria y sin persistir texto Google; falta prueba con ficha real y aprobación API. CSV propio opcional y demo ficticia se conservan. Para competidores falta fuente autorizada. |
| 13. Insights generados | Existente y reutilizable | Reglas deterministas sobre métricas permitidas y menciones en reseñas propias. Los cambios de proporción exigen cobertura de ambas ventanas y se omiten cuando la consulta está truncada. No se infiere causalidad ni se guarda el análisis Google. |
| 14. Email semanal | Parcialmente implementado | Plantilla, preferencia, endpoint protegido, flag global y cron de Vercel. Sigue apagado: falta remitente verificado y fuente recurrente con derechos claros. El cron purga diariamente textos CSV propios fuera de la ventana de 90 días aunque el email esté desactivado. |
| 15. Configuración | Existente y reutilizable | Nombre declarado, OAuth para elegir ficha propia, estado de conexión, desconexión y preferencia de email. La captura manual queda en sección opcional. |

## Pospuesto

La landing pública, los contadores de visitas/clics y el campo de WiFi pertenecen al producto anterior. Su código y datos se conservan, pero están fuera de la navegación principal del MVP. No añadir campañas, respuestas automáticas ni funcionalidades de marketing antes de validar el flujo de inteligencia competitiva.
