import type { TargetRole } from '@/lib/types'

// Static, curated knowledge about what the Italian job market expects for each
// target role. Embedded in the Call 2 (gap analysis) system prompt. In Phase 1
// this is the seam where retrieved chunks (ESCO competences, real job ads, CV
// benchmarks) augment or replace the static text — the call site does not change,
// only the knowledge fed into it. Keep concise and concrete.
export const ROLE_KNOWLEDGE: Record<TargetRole, string> = {
  data_analyst: `RUOLO TARGET: Data Analyst (mercato italiano)

Cosa cercano le aziende italiane per un Data Analyst entry/junior:
- Hard skills core: SQL (imprescindibile), Excel avanzato, almeno uno tra
  Python (pandas, numpy) o R per l'analisi.
- Visualizzazione e BI: Tableau, Power BI o Looker/Data Studio. Power BI è molto
  diffuso nelle aziende italiane e nelle società di consulenza.
- Statistica di base e capacità di tradurre i dati in insight di business.
- Plus: nozioni di data warehouse/modellazione, dbt, Git, cenni di ML.
- Soft signal: capacità di comunicare risultati a stakeholder non tecnici,
  storytelling con i dati, attenzione al dettaglio.
Segnali forti nel CV: progetti con dataset reali, dashboard pubblicate (es.
Tableau Public), competizioni (Kaggle), stage in ruoli analitici, metriche di
impatto ("ridotto il tempo di reporting del 40%").
Certificazioni apprezzate: Google Data Analytics, Microsoft PL-300 (Power BI),
Tableau Desktop Specialist.`,

  digital_marketing: `RUOLO TARGET: Digital Marketing (mercato italiano)

Cosa cercano le aziende italiane per un profilo Digital Marketing entry/junior:
- Performance/advertising: Google Ads, Meta Ads (Facebook/Instagram), gestione
  campagne e budget.
- Analytics: Google Analytics 4, lettura di metriche (CTR, CPA, ROAS, tasso di
  conversione), reportistica.
- SEO/SEM: ottimizzazione on-page, keyword research, strumenti come SEMrush o
  Ahrefs.
- Content e social: copywriting, gestione editoriale, email marketing
  (Mailchimp/HubSpot), CMS (WordPress).
- Soft signal: creatività unita a mentalità data-driven, conoscenza del mercato
  italiano e delle sue specificità (es. brand made-in-Italy, e-commerce, retail).
Segnali forti nel CV: campagne reali con risultati misurabili, gestione di
account/profili social con crescita documentata, progetti di personal branding,
stage in agenzia o reparto marketing.
Certificazioni apprezzate: Google Ads, Google Analytics (GA4), Meta Blueprint,
HubSpot.`,

  software_developer: `RUOLO TARGET: Software Developer (mercato italiano)

Cosa cercano le aziende italiane per uno sviluppatore entry/junior:
- Almeno un linguaggio solido: Java, Python, JavaScript/TypeScript o C#. Java e
  .NET sono molto richiesti in aziende enterprise e di consulenza italiane.
- Fondamenti: strutture dati e algoritmi, OOP, principi di clean code, testing.
- Web/full-stack: un framework frontend (React/Angular/Vue) e/o backend (Spring,
  Node, .NET). Database SQL e cenni di NoSQL.
- Tooling: Git, controllo di versione, basi di CI/CD, Docker, cloud (AWS/Azure).
- Soft signal: capacità di lavorare in team agile/scrum, problem solving,
  apprendimento continuo.
Segnali forti nel CV: progetti personali o open source con repository GitHub
attivo, contributi documentati, hackathon, stage di sviluppo, deploy di
applicazioni reali, metriche tecniche concrete.
Certificazioni apprezzate (plus, non determinanti): Oracle Java, AWS/Azure
fundamentals, certificazioni cloud associate.`,
}
