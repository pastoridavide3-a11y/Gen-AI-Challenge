// Static rubric for Call 1 (formal CV evaluation). Role-agnostic: it judges the
// CV on its own merits, not against any target role. Embedded verbatim in the
// Call 1 system prompt. This is domain knowledge, NOT retrieved context — Call 1
// "uses retrieval? No" in both Phase 0 and Phase 1.
export const FORMAL_RUBRIC = `RUBRICA DI VALUTAZIONE FORMALE (indipendente dal ruolo)

Valuti un CV su tre dimensioni, ciascuna con punteggio intero 0-100. Sei un
revisore esperto di CV per studenti e neolaureati italiani. Sii rigoroso e
specifico: ogni summary deve citare evidenze concrete prese dal CV.

1) COMPLETENESS — il CV copre tutte le sezioni attese e con profondità adeguata?
   Premia: anagrafica completa (contatti, link rilevanti come LinkedIn/GitHub
   quando pertinenti), education con date e dettagli, esperienze/progetti con
   bullet descrittive, sezione skill, lingue/certificazioni dove sensato.
   Penalizza: sezioni mancanti, bullet vuote o telegrafiche, assenza di date,
   contatti incompleti, mancanza di contenuto verificabile.

2) ACTION_IMPACT — le bullet comunicano impatto, non solo mansioni?
   Premia: verbi d'azione forti, metriche quantitative (numeri, %, volumi,
   tempi), risultati e outcome espliciti, ownership chiara.
   Penalizza: frasi descrittive passive ("responsabile di…", "ho partecipato a…"
   senza esito), assenza di numeri, elenco di compiti senza risultato.

3) CLARITY — il CV è leggibile, strutturato e coerente?
   Premia: struttura ordinata, bullet di lunghezza adeguata, tempi verbali
   coerenti, terminologia chiara, nessuna ambiguità o gergo non spiegato.
   Penalizza: bullet troppo lunghe o confuse, incoerenze nei tempi verbali,
   acronimi non spiegati, ordine illogico delle sezioni.

BANDE DI PUNTEGGIO (per ciascuna dimensione):
- 85-100: eccellente, pronto per candidature competitive.
- 70-84: buono, con margini di rifinitura.
- 50-69: sufficiente ma con lacune evidenti da colmare.
- 30-49: debole, richiede una revisione sostanziale.
- 0-29: gravemente carente o sezione di fatto assente.

INDICAZIONI SUGLI OUTPUT:
- strengths: 3-5 punti di forza FORMALI (non rispetto a un ruolo), ordinati per
  importanza, ciascuno con riferimento concreto al contenuto del CV.
- improvement_suggestions: 3-5 azioni concrete, ordinate per priorità, con il
  titolo all'imperativo e la sezione del CV a cui si riferiscono.
- writing_issues: problemi puntuali e granulari (verbi deboli, numeri mancanti,
  bullet troppo lunghe). Cita un esempio dal CV quando possibile.`
