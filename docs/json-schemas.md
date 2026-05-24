# JSON Schemas — Phase 0

Definizioni dei 5 JSON blob che vivono nel DB:

1. `surveys.data` — preferenze, obiettivi, vincoli (NON estratti dal CV)
2. `cvs.parsed_data` — output dello structuring del CV
3. `analyses.formal_evaluation` — output Call 1
4. `analyses.gap_analysis` — output Call 2
5. `analyses.learning_path` — output Call 3

Tutti gli output testuali generati da LLM sono **in italiano**.

Convenzioni:
- `schema_version: "1.0"` in ogni blob — futuro-proofing a costo zero
- `snake_case` per le chiavi (coerente col DB)
- Date come `"YYYY-MM"` (mese precisione) o `"YYYY-MM-DD"` quando serve il giorno
- `null` esplicito per opzionali non valorizzati negli output LLM (non omessi), così lo structured output è prevedibile
- Ogni campo è annotato con **chi lo compila**:
  - `[LLM]` — generato da una call OpenAI (parsing o analisi)
  - `[user]` — inserito dall'utente via form (o seed nei mock profile)
  - `[code]` — derivato in codice TS (timestamp, id, slug, score aggregato)

---

## Convenzioni trasversali

### Enum: `target_role`

```ts
type TargetRole = "data_analyst" | "digital_marketing" | "software_developer"
```

Hardcoded nel client (dropdown) e validato server-side. Le label UI ("Data Analyst", "Digital Marketing", "Software Developer") sono mappate nel codice frontend, non nel DB.

### Enum: `industry`

```ts
type Industry =
  | "tech"
  | "finance"
  | "consulting"
  | "marketing_advertising"
  | "manufacturing"
  | "energy"
  | "healthcare"
  | "retail_ecommerce"
  | "luxury"
  | "fashion"
  | "food_beverage"
```

Multi-select nella survey. 11 valori coprono lo spettro tipico degli studenti italiani, inclusi i settori made-in-Italy (luxury, fashion, food & beverage).

### Enum: dimensioni del radar

```ts
type ScoreDimension =
  | "completeness"    // Call 1
  | "action_impact"   // Call 1
  | "clarity"         // Call 1
  | "market_fit"      // Call 2
  | "relevance"       // Call 2
```

Le 5 chiavi sono fisse e identiche tra Call 1 e Call 2 — il radar le concatena.

### Calcolo dell'`overall_score` (lato TS, non LLM)

```ts
const WEIGHTS = {
  completeness: 0.15,
  action_impact: 0.20,
  clarity: 0.15,
  market_fit: 0.30,   // più pesato: è il segnale più importante per uno studente
  relevance: 0.20,
}

function computeOverallScore(formal, gap) {
  // Se gap è null (Call 2 fallita), usa solo le 3 dimensioni di Call 1
  // normalizzando i pesi sul subset disponibile.
  // ...
}
```

I pesi sono modificabili in un punto solo (`lib/scoring.ts`).

---

## Education: dove vive?

Decisione: **tutta** l'education (corrente + passata) sta in `cvs.parsed_data.education` come array, estratta dal CV. Su `profiles` duplichiamo solo i campi più recenti/in corso (`university`, `course`, `year`) come "anagrafica visibile" mostrata in header e sidebar anche quando il CV non è ancora stato caricato/parsato.

In pratica:
- **`profiles.{university, course, year}`** — `[user]` (compilati a mano o seed), usati nella UI shell. Possono essere riconciliati col CV ma non sono fonte di verità per l'analisi.
- **`cvs.parsed_data.education[]`** — `[LLM]`, fonte di verità per l'analisi. Include tutti i titoli di studio del candidato (master in corso, bachelor concluso, eventuali altri).

---

## 1. `surveys.data`

Tutto ciò che NON si estrae dal CV: preferenze, obiettivi, vincoli. Compilato dall'utente (o seed nei mock profile).

### Schema

```json
{
  "schema_version": "1.0",
  "industry_interests": ["tech", "finance", "consulting", "marketing_advertising", "manufacturing", "energy", "healthcare", "retail_ecommerce"],
  "career_goals": {
    "one_year_goal": "string",
    "three_year_goal": "string",
    "what_i_dont_want": "string | null"
  },
  "constraints": {
    "geographic_availability": ["string"],
    "weekly_study_hours": "string | null",
    "training_budget": "string | null",
    "other_constraints": "string | null"
  },
  "work_preferences": {
    "company_size": ["startup", "scale_up", "large_enterprise", "consulting_firm", "agency"],
    "work_languages": ["string"],
    "work_style": "remote | hybrid | onsite | null",
    "other_preferences": "string | null"
  }
}
```

### Note sui campi

- **`industry_interests`** — `[user]` array dall'enum chiusa. UI: chips multi-select.
- **`career_goals.one_year_goal`** — `[user]` frase breve sull'obiettivo professionale a 1 anno.
- **`career_goals.three_year_goal`** — `[user]` frase breve sull'obiettivo a 3 anni.
- **`career_goals.what_i_dont_want`** — `[user]` opzionale, ruoli/ambiti che l'utente esclude esplicitamente. Utile come segnale negativo per Call 2 e per il mentor.
- **`constraints.geographic_availability`** — `[user]` array di città/regioni/etichette tipo `["Milano", "Remote (Italia)"]`. Testo libero.
- **`constraints.weekly_study_hours`** — `[user]` testo libero (`"15 ore"`). Non numero, per allinearci alla UI mock.
- **`constraints.training_budget`** — `[user]` testo libero (`"€200/mese"`).
- **`constraints.other_constraints`** — `[user]` opzionale: visto, mobilità, salute, esami in corso, ecc.
- **`work_preferences.company_size`** — `[user]` enum di 5 valori, multi-select.
- **`work_preferences.work_languages`** — `[user]` array testo libero. Lingue *di lavoro* desiderate, non i livelli CEFR del CV.
- **`work_preferences.work_style`** — `[user]` singolo valore. `null` se l'utente è flessibile.
- **`work_preferences.other_preferences`** — `[user]` opzionale: cose tipo "preferenza per team internazionali", "lavoro per progetti vs continuativo".

---

## 2. `cvs.parsed_data`

Output del structuring (LLM Phase 2 del parsing). Riproduce fedelmente la struttura del CV-tipo.

**Principio guida:** lo structuring è una trasformazione *meccanica* da testo a JSON. Non normalizza, non valuta, non integra. Tutto ciò che è scritto nel CV → struttura. Ciò che non c'è → `null` o `[]`.

### Schema

```json
{
  "schema_version": "1.0",
  "personal_info": {
    "full_name": "string",
    "email": "string | null",
    "phone": "string | null",
    "location": "string | null",
    "linkedin_url": "string | null",
    "github_url": "string | null",
    "portfolio_url": "string | null"
  },
  "education": [
    {
      "institution": "string",
      "location": "string | null",
      "degree": "string",
      "field_of_study": "string | null",
      "start_date": "string | null",
      "end_date": "string | null",
      "expected": "boolean",
      "gpa": "string | null",
      "honors": ["string"],
      "relevant_courses": ["string"]
    }
  ],
  "work_experience": [
    {
      "role": "string",
      "company": "string",
      "location": "string | null",
      "start_date": "string | null",
      "end_date": "string | null",
      "is_current": "boolean",
      "type": "internship | full_time | part_time | freelance | contract | null",
      "bullets": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "context": "string | null",
      "location": "string | null",
      "start_date": "string | null",
      "end_date": "string | null",
      "is_current": "boolean",
      "technologies": ["string"],
      "url": "string | null",
      "bullets": ["string"]
    }
  ],
  "extracurriculars": [
    {
      "title": "string",
      "organization": "string | null",
      "start_date": "string | null",
      "end_date": "string | null",
      "bullets": ["string"]
    }
  ],
  "additional_info": {
    "technical_skills": ["string"],
    "languages": [
      {
        "name": "string",
        "level": "string | null"
      }
    ],
    "certifications": [
      {
        "name": "string",
        "issuer": "string | null",
        "date": "string | null"
      }
    ],
    "interests": ["string"]
  }
}
```

### Note sui campi

Tutti i campi sono `[LLM]` (output dello structuring), salvo dove specificato.

- **`personal_info.full_name`** — nome completo come appare in cima al CV.
- **`personal_info.email/phone/location/linkedin_url/github_url/portfolio_url`** — estratti se presenti, `null` se non presenti nel CV.
- **`education[]`** — array di **tutti** i titoli di studio menzionati nel CV (master, bachelor, eventuali altri). Uno per riga, ordinati come nel CV (di solito dal più recente).
- **`education[].institution`** — nome dell'università/istituto.
- **`education[].degree`** — titolo del grado (es. "Master of Science", "Bachelor of Science"). Lasciato letterale, non normalizzato.
- **`education[].field_of_study`** — il corso di laurea (es. "Data Science", "Management Engineering"). Separato da `degree` perché spesso il CV li separa.
- **`education[].start_date`, `end_date`** — formato `"YYYY-MM"`. `end_date` è la data prevista anche se `expected: true`.
- **`education[].expected`** — `true` se il titolo è in corso, `false` se concluso.
- **`education[].gpa`** — testo libero (`"27.5/30"`, `"3.8/4.0"`, `"110/110 cum laude"`). `null` se non presente.
- **`education[].honors`** — array di stringhe: borse di studio, premi, menzioni. Una stringa = un honor (intero, descrittivo).
- **`education[].relevant_courses`** — i "Relevant courses" se presenti nel CV. Lista pulita di nomi corso. Alimenta direttamente la gap analysis.
- **`work_experience[]`** — esperienze lavorative remunerate (stage, full-time, part-time, ecc.).
- **`work_experience[].role`** — il ruolo come scritto nel CV ("Data Analyst Intern", "Software Engineer").
- **`work_experience[].company`** — il nome dell'azienda/organizzazione.
- **`work_experience[].is_current`** — `true` se l'esperienza è in corso (`end_date` può essere `null` o futura).
- **`work_experience[].type`** — discriminator: `internship`, `full_time`, `part_time`, `freelance`, `contract`, oppure `null` se non desumibile dal CV.
- **`work_experience[].bullets`** — array delle bullet così come appaiono nel CV. **Testo letterale, non riassunto.** Le Call 1 e Call 2 valutano queste, devono essere preservate verbatim.
- **`projects[]`** — progetti (personali, accademici, hackathon, associazioni studentesche). Separati da `work_experience` perché tipicamente non remunerati ma con output tangibile.
- **`projects[].context`** — descrittore della natura del progetto ("Personal Project", "Hackathon Project", "Academic Project", "Student Association"). Testo libero come nel CV.
- **`projects[].technologies`** — array di tech menzionate nel CV per quel progetto. `[]` se non specificate.
- **`projects[].url`** — link al progetto se presente nel CV (GitHub, demo, ecc.).
- **`projects[].bullets`** — array, testo letterale dal CV.
- **`extracurriculars[]`** — attività non lavorative né progettuali (volontariato, sport agonistico, tutoraggio, lavori stagionali generici, hobby strutturati). Bullets testuali.
- **`additional_info.technical_skills`** — array piatto di stringhe, una per skill/tool, **non categorizzato**. Lo structuring elenca; la categorizzazione la fa eventualmente l'analisi.
- **`additional_info.languages`** — array di oggetti `{name, level}`. `level` testo libero (non normalizziamo a CEFR), così possiamo riportare cose come `"native"`, `"C1"`, `"IELTS 7.5"`, `"Basic"`.
- **`additional_info.certifications`** — array di certificazioni. `[]` se non presenti. Issuer e date sono opzionali.
- **`additional_info.interests`** — array di hobby/interessi così come nel CV.

---

## 3. `analyses.formal_evaluation` (Call 1)

Valutazione formale role-agnostic. Misura: **completeness, action_impact, clarity**. Tutti gli output testuali in italiano.

### Schema

```json
{
  "schema_version": "1.0",
  "dimension_scores": {
    "completeness": {
      "score": "integer 0-100",
      "summary": "string"
    },
    "action_impact": {
      "score": "integer 0-100",
      "summary": "string"
    },
    "clarity": {
      "score": "integer 0-100",
      "summary": "string"
    }
  },
  "strengths": [
    { "title": "string", "detail": "string" }
  ],
  "improvement_suggestions": [
    {
      "title": "string",
      "detail": "string",
      "priority": "high | medium | low",
      "target_section": "personal_info | education | work_experience | projects | extracurriculars | additional_info | overall"
    }
  ],
  "writing_issues": [
    {
      "section": "personal_info | education | work_experience | projects | extracurriculars | additional_info | overall",
      "issue": "string",
      "example": "string | null"
    }
  ]
}
```

### Note sui campi

Tutti `[LLM]` (output della Call 1).

- **`dimension_scores.completeness.score`** — int 0-100. Misura se il CV copre tutte le sezioni attese (anagrafica, education, esperienze, skill) e se ogni sezione ha la profondità minima. Penalizza sezioni mancanti, bullet vuote, mancanza di summary professionale, ecc.
- **`dimension_scores.completeness.summary`** — 1-2 righe in italiano che giustificano lo score.
- **`dimension_scores.action_impact.score`** — int 0-100. Misura uso di verbi d'azione, presenza di metriche quantitative, capacità di comunicare l'impatto (non solo le mansioni).
- **`dimension_scores.action_impact.summary`** — 1-2 righe.
- **`dimension_scores.clarity.score`** — int 0-100. Misura leggibilità, struttura, lunghezza delle bullet, coerenza dei tempi verbali, assenza di terminologia oscura senza contesto.
- **`dimension_scores.clarity.summary`** — 1-2 righe.
- **`strengths`** — array di 3-5 elementi (il prompt vincola il range; lo schema accetta qualunque cardinalità). Ordinati per importanza decrescente. Sono punti di forza *formali* del CV, non rispetto al ruolo.
- **`strengths[].title`** — titolo breve (3-6 parole) per la card della dashboard.
- **`strengths[].detail`** — 1-2 frasi che spiegano il punto di forza con riferimento concreto al contenuto del CV.
- **`improvement_suggestions`** — array di 3-5 elementi, ordinati per priorità.
- **`improvement_suggestions[].title`** — titolo breve azionabile (verbo all'imperativo).
- **`improvement_suggestions[].detail`** — 1-2 frasi che spiegano cosa fare e perché.
- **`improvement_suggestions[].priority`** — `high` / `medium` / `low`.
- **`improvement_suggestions[].target_section`** — sezione del CV a cui il suggerimento si riferisce. Permette alla UI di linkare/scrollare alla sezione giusta.
- **`writing_issues`** — array di problemi *puntuali* (verbi deboli, mancanza di numeri, bullet troppo lunghe). Più granulare di `improvement_suggestions`. Non mostrato nella dashboard ma utile nel CV detail view.
- **`writing_issues[].section`** — sezione del CV in cui appare il problema.
- **`writing_issues[].issue`** — descrizione del problema.
- **`writing_issues[].example`** — citazione opzionale dal CV che illustra il problema.

---

## 4. `analyses.gap_analysis` (Call 2)

Confronto con il target role. Aggiunge **market_fit, relevance** alle 5 dimensioni del radar. Output testuale in italiano.

### Schema

```json
{
  "schema_version": "1.0",
  "target_role": "data_analyst | digital_marketing | software_developer",
  "dimension_scores": {
    "market_fit": {
      "score": "integer 0-100",
      "summary": "string"
    },
    "relevance": {
      "score": "integer 0-100",
      "summary": "string"
    }
  },
  "match_summary": "string",
  "possessed_skills": [
    {
      "skill": "string",
      "evidence": "string",
      "strength": "strong | moderate | basic"
    }
  ],
  "gaps": [
    {
      "title": "string",
      "detail": "string",
      "priority": "high | medium | low",
      "category": "technical_skill | tool | certification | experience | soft_signal"
    }
  ],
  "reframing_suggestions": [
    {
      "target_section": "education | work_experience | projects | extracurriculars | additional_info",
      "current_text": "string",
      "suggested_text": "string",
      "rationale": "string"
    }
  ]
}
```

### Note sui campi

- **`target_role`** — `[code]` snapshot dal record `analyses` al momento della creazione. Duplicato qui per debug e per "freeze" del contesto in cui è stata generata l'analisi.
- **`dimension_scores.market_fit.score`** — `[LLM]` int 0-100. Misura quanto il profilo nel suo insieme matcha le aspettative del ruolo target sul mercato italiano (skill, esperienze, segnali formativi).
- **`dimension_scores.market_fit.summary`** — `[LLM]` 1-2 righe.
- **`dimension_scores.relevance.score`** — `[LLM]` int 0-100. Misura quanto il *contenuto specifico* del CV (singole bullet, progetti, esperienze) è pertinente al ruolo, vs riempitivo non rilevante.
- **`dimension_scores.relevance.summary`** — `[LLM]` 1-2 righe.
- **`match_summary`** — `[LLM]` paragrafo di 2-3 righe. Sintesi qualitativa del match. È il testo che può comparire in cima al CV detail view nella tab "Match with role".
- **`possessed_skills`** — `[LLM]` array di skill *rilevanti per il ruolo* che il CV mostra. Sottoinsieme delle skill totali del CV: include solo quelle pertinenti.
- **`possessed_skills[].skill`** — nome della skill/competenza (può essere più ampia di un singolo tool: "Python per data analysis", "Comunicazione di insight di business").
- **`possessed_skills[].evidence`** — riferimento concreto a dove appare nel CV (sezione, bullet, corso). Citazione breve.
- **`possessed_skills[].strength`** — `strong` / `moderate` / `basic`, livello di confidenza che il CV dimostra quella skill.
- **`gaps`** — `[LLM]` array di 3-5 elementi, ordinati per priorità.
- **`gaps[].title`** — titolo breve del gap.
- **`gaps[].detail`** — 1-2 frasi che spiegano cosa manca e perché è importante per il ruolo.
- **`gaps[].priority`** — `high` / `medium` / `low`.
- **`gaps[].category`** — discriminator: `technical_skill` (linguaggio/libreria), `tool` (software specifico), `certification` (credenziale), `experience` (tipo di esperienza pratica), `soft_signal` (es. brand di tech company, network).
- **`reframing_suggestions`** — `[LLM]` array di 2-4 suggerimenti di riscrittura di bullet esistenti, in chiave del ruolo target. Diverso da `improvement_suggestions` di Call 1 (che sono generici e formali).
- **`reframing_suggestions[].target_section`** — sezione del CV in cui sta la bullet originale.
- **`reframing_suggestions[].current_text`** — citazione letterale di una bullet del CV.
- **`reframing_suggestions[].suggested_text`** — versione riscritta in italiano in chiave del ruolo target.
- **`reframing_suggestions[].rationale`** — perché la riscrittura è meglio per il target role.

---

## 5. `analyses.learning_path` (Call 3)

Path operativo per colmare i gap. Lista di **azioni eterogenee**: corsi, progetti, certificazioni, altre azioni. Output in italiano.

### Schema

```json
{
  "schema_version": "1.0",
  "intro": "string",
  "actions": [
    {
      "id": "string",
      "type": "course | project | certification | reading | networking | other",
      "title": "string",
      "description": "string",
      "addresses_gaps": ["string"],
      "estimated_effort": "string",
      "estimated_cost": "string | null",
      "priority": "high | medium | low",
      "resources": [
        {
          "label": "string",
          "url": "string | null",
          "note": "string | null"
        }
      ],
      "outcome": "string"
    }
  ]
}
```

### Note sui campi

Tutti `[LLM]` (output Call 3).

- **`intro`** — 2-3 righe in italiano. Personalizza il path al profilo del candidato. È il testo che compare in cima alla sezione "What to Do Next" (o in una vista dedicata "Learning path").
- **`actions`** — array di 4-6 elementi (vincolato nel prompt), ordinati per priorità decrescente. Eterogenei per tipo.
- **`actions[].id`** — slug stabile generato dall'LLM (es. `tableau_fundamentals_coursera`). Serve come chiave React nelle card e per eventuali bookmarks futuri. Lowercase, snake_case.
- **`actions[].type`** — discriminator. La UI può iconare diverso per tipo (book per course, target per project, badge per certification, message per other, ecc.).
- **`actions[].title`** — titolo breve dell'azione, in italiano, all'imperativo.
- **`actions[].description`** — 2-3 frasi che spiegano cosa fare e perché.
- **`actions[].addresses_gaps`** — array di stringhe che sono i `title` dei gap di Call 2 a cui questa azione risponde. Vuoto `[]` se l'azione non è legata a un gap specifico (es. preparazione colloquio). Permette alla UI di mostrare "Risolve: gap X, gap Y".
- **`actions[].estimated_effort`** — testo libero in italiano (`"4 settimane, 3h/settimana"`, `"un weekend"`). Allineato alla UI mock.
- **`actions[].estimated_cost`** — testo libero (`"€49"`, `"gratis"`, `"€200"`). `null` se non applicabile.
- **`actions[].priority`** — `high` / `medium` / `low`.
- **`actions[].resources`** — array di link/riferimenti. In Phase 0 sono suggerimenti dalla conoscenza interna dell'LLM (Coursera, edX, Tableau Public, ecc.). In Phase 1 verranno da pgvector.
- **`actions[].resources[].label`** — descrizione human-readable della risorsa.
- **`actions[].resources[].url`** — link se conosciuto. `null` per risorse senza URL (es. "chat col mentor").
- **`actions[].resources[].note`** — opzionale, una riga che aggiunge contesto sulla risorsa.
- **`actions[].outcome`** — frase singola in italiano: cosa avrà l'utente al termine dell'azione. Aiuta motivazione e dà metrica di successo.

---

## Come si compongono lato UI

Riassunto rapido di come questi blob alimentano le schermate:

**Dashboard:**
- Career score (header card): `computeOverallScore(formal, gap)` in `lib/scoring.ts`
- Score breakdown radar: `[formal.dimension_scores, gap.dimension_scores]` → 5 punti del radar
- Score evolution chart: per ogni `cv.version`, query lo score storico aggregato
- Top strengths (3): `formal.strengths.slice(0, 3)`
- Areas to improve (3): `gap.gaps.slice(0, 3)` (priorità high prima)
- What to Do Next (3): `learning_path.actions.filter(priority === 'high').slice(0, 3)`
- Recent activity: derivato dai timestamp di `cvs`, `analyses`, `mentor_messages`

**My CVs > detail:**
- Formal evaluation tab: `formal_evaluation` completo (dimension_scores + strengths + improvement_suggestions + writing_issues)
- Match with role tab: `gap_analysis` completo (match_summary + possessed_skills + gaps + reframing_suggestions)
- Parsed data tab: `parsed_data` rendered come accordion editabile

**Profile:**
- Education section: `profiles.{university, course, year}` (corrente, duplicato dal CV per visibilità senza CV)
- Industry Interests: `surveys.data.industry_interests`
- Career Goals: `surveys.data.career_goals`
- Constraints: `surveys.data.constraints`
- Work Preferences: `surveys.data.work_preferences`

**Mentor:**
- System prompt include: `profiles` + `parsed_data` del CV attivo + `surveys.data` + `formal_evaluation` + `gap_analysis` + `learning_path` (l'ultimo `analyses` row)
- Tutto questo è il "fixed context" che `gatherContext()` deve assemblare (vedi `architecture.md`)

---

## Open question residue (non bloccanti)

1. **`overall_score` salvato o calcolato?** Lo score complessivo è una pura aggregazione. Due opzioni: (a) salvarlo come colonna `analyses.overall_score` (denormalizzato, ma evita di calcolarlo ad ogni read), (b) calcolarlo on-the-fly in TS. Per la demo (a) è più semplice, per il "score history" su CV multipli è praticamente obbligato.
2. **`overall_score` con risultati parziali.** Se Call 2 fallisce hai solo 3 dimensioni su 5. Strategie: (a) ricalibrare i pesi sul subset disponibile, (b) mostrare lo score "incompleto" con un badge "Partial", (c) non mostrare lo score finché tutte le call non sono complete. Preferenza?
3. **Lingua del CV.** Se il CV caricato è in inglese, estraiamo i campi così come sono (inglese) e l'analisi è in italiano? O traduciamo le bullet durante lo structuring? Proposta: estraiamo letterale (gli LLM funzionano bene cross-lingua), analisi in italiano sopra a CV nella lingua originale.
4. **Sincronizzazione `profiles.{university, course, year}` ↔ CV.** Quando l'utente carica/aggiorna un CV, aggiorniamo automaticamente i 3 campi su `profiles` dal `parsed_data.education[0]`? O li lasciamo manuali, accettando che possano divergere? Proposta: aggiornamento automatico alla prima parsing di ogni CV, con override possibile dal form Profile.
