# Fuente automática para inteligencia competitiva

Estado: evaluación del 25 de septiembre de 2026. Este documento orienta la siguiente integración; no concede derechos de uso ni activa una fuente de datos.

## Decisión actual

La primera prueba con datos reales debe empezar por las reseñas de la ficha propia autorizada mediante Google Business Profile OAuth. Para competidores, no se debe reactivar Google Places ni almacenar sus reseñas como atajo: las [condiciones para el EEE](https://cloud.google.com/terms/maps-platform/eea) y la [lista de usos permitidos](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses) no proporcionan una base clara para el histórico y los insights competitivos previstos.

La primera candidata comercial a evaluar es [Trustpilot Data Solutions Insights API](https://developers.trustpilot.com/data-solutions-get-started). Documenta búsqueda de negocios, puntuación, volumen y acceso a reseñas completas, y [Trustpilot presenta el producto para inteligencia competitiva](https://business.trustpilot.com/datasolutions). Requiere contacto comercial. Su cobertura se organiza principalmente por dominio o Business Unit; todavía no sabemos si incluye suficientes negocios y sucursales locales del piloto.

No se implementará un adaptador ni se persistirá contenido competitivo hasta confirmar por escrito que el acuerdo permite a ReviewFlow consultar competidores, analizar textos, conservar métricas y derivados históricos, y mostrar el resultado a cada cliente. También hay que acordar duración, atribución y eliminación. Si se muestran reseñas, la [guía de caché](https://developers.trustpilot.com/ds-caching-best-practices/) exige refrescar el contenido mostrado cada 24 horas; la [API de eliminaciones](https://developers.trustpilot.com/deletions-api/) contempla sincronizar retiradas al menos cada 28 días cuando se almacena contenido.

## Alternativas examinadas

| Fuente | Motivo para evaluarla | Límite actual |
| --- | --- | --- |
| [Yelp Insights](https://docs.developer.yelp.com/docs/yelp-insights) | API o feed para datos estructurados de negocios. | El acceso depende de un contrato de partner y de la cobertura local real. La [API Yelp Places ordinaria](https://docs.developer.yelp.com/docs/places-faq) solo permite caché de 24 horas; no la usaremos para generar un histórico competitivo. |
| [Tripadvisor Terra](https://docs.terra.tripadvisor.com/docs/overview) | Cobertura potencial de restaurantes, hoteles y atracciones. | Sus [términos](https://docs.terra.tripadvisor.com/docs/api-master-terms) y [política de caché](https://docs.terra.tripadvisor.com/docs/caching-policy) requieren una revisión contractual específica para el análisis y almacenamiento previstos. |

## Prueba de aceptación antes de integrar

1. Elegir un negocio piloto real y dos competidores concretos, con ciudad, sector y sus identificadores oficiales en la fuente propuesta.
2. Verificar que los tres existen en el proveedor y que hay suficientes reseñas fechadas y con texto para responder una pregunta útil del propietario. Si solo existen perfiles de dominio sin sucursal, no presentar resultados como locales.
3. Obtener un acuerdo que especifique: acceso a datos de terceros; análisis automático y derivados; retención de texto y métricas; presentación a clientes de ReviewFlow; atribución; bajas o correcciones; región de tratamiento; cuotas y coste.
4. Con una cuenta de prueba contractual, importar **un** negocio y **dos** competidores, registrar origen y fecha de observación, comprobar paginación y eliminaciones, y validar un insight con textos verificables. Solo entonces programar capturas periódicas y email.

Hasta superar esos criterios, la interfaz debe distinguir relaciones guardadas de competidores de monitorización activa.
