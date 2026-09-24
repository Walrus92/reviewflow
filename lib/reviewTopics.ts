export function complainsAboutHours(text: string) {
  return /\bcerrad[oa]\b|\bno (?:estaba |estuvo )?abiert[oa]\b|\bno abr[ií]|\bsin abrir\b|\babr(?:ieron|i[oó]) tarde\b|\b(?:mal|p[eé]simo|incorrecto) horario\b|\bhorario.{0,25}(?:incorrecto|equivocado|no se cumple|no coincide)/i.test(text) &&
    !/abierto en horario|abrieron a tiempo|siempre abierto/i.test(text);
}

export function complainsAboutWaiting(text: string) {
  return /\besper[aeéó]|\btard[óoé]|\blent[oa]s?\b|\bdemora/i.test(text) &&
    !/sin espera|sin tener que esperar|no (?:tuve que |tuvimos que )?esperar|no tard[oó]/i.test(text);
}

export function praisesCare(text: string) {
  return /atenci[oó]n|trato|amable|personal|me atendi[oó]|nos atendi[oó]/i.test(text) &&
    !/mala atenci[oó]n|atenci[oó]n (?:fue |era )?(?:mala|p[eé]sima|horrible)|mal trato|trato (?:malo|p[eé]simo|fatal)|nada amable|no (?:fue |era |es )?amable|personal (?:desagradable|grosero)/i.test(text);
}
