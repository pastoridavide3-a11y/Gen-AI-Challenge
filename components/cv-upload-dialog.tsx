"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProfile } from "@/lib/profile-context";
import { TARGET_ROLE_LABELS } from "@/lib/labels";
import type { ParsedCv, TargetRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Plus, Trash2 } from "lucide-react";

// Item shapes derived from the parsed_data schema so the editors stay in sync.
type WorkItem = ParsedCv["work_experience"][number];
type WorkType = NonNullable<WorkItem["type"]>;

const emptyEducation = (): ParsedCv["education"][number] => ({
  institution: "",
  location: null,
  degree: "",
  field_of_study: null,
  start_date: null,
  end_date: null,
  expected: false,
  gpa: null,
  honors: [],
  relevant_courses: [],
});

const emptyWork = (): WorkItem => ({
  role: "",
  company: "",
  location: null,
  start_date: null,
  end_date: null,
  is_current: false,
  type: null,
  bullets: [],
});

const emptyProject = (): ParsedCv["projects"][number] => ({
  name: "",
  context: null,
  location: null,
  start_date: null,
  end_date: null,
  is_current: false,
  technologies: [],
  url: null,
  bullets: [],
});

const emptyExtra = (): ParsedCv["extracurriculars"][number] => ({
  title: "",
  organization: null,
  start_date: null,
  end_date: null,
  bullets: [],
});

const emptyLanguage = (): ParsedCv["additional_info"]["languages"][number] => ({
  name: "",
  level: null,
});

const emptyCert = (): ParsedCv["additional_info"]["certifications"][number] => ({
  name: "",
  issuer: null,
  date: null,
});

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: "internship", label: "Stage" },
  { value: "full_time", label: "Tempo pieno" },
  { value: "part_time", label: "Part-time" },
  { value: "freelance", label: "Freelance" },
  { value: "contract", label: "Contratto" },
];

type Phase = "select" | "parsing" | "review";

export function CvUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { current } = useProfile();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ParsedCv | null>(null);
  const [rawText, setRawText] = useState("");
  const [targetRole, setTargetRole] = useState<TargetRole | null>(
    current.profile.target_role,
  );
  const [saving, setSaving] = useState(false);

  // Immutable nested updates: clone, mutate, set.
  const update = (mutator: (d: ParsedCv) => void) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });

  const reset = () => {
    setPhase("select");
    setFile(null);
    setDraft(null);
    setRawText("");
    setTargetRole(current.profile.target_role);
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return; // don't close mid-save
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileSelected = async (selected: File) => {
    if (selected.type && selected.type !== "application/pdf") {
      toast.error("Seleziona un file PDF.");
      return;
    }
    setFile(selected);
    setPhase("parsing");
    try {
      const fd = new FormData();
      fd.append("file", selected);
      const res = await fetch("/api/cvs/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Estrazione non riuscita.");
      setRawText(data.raw_text ?? "");
      setDraft(data.parsed_data as ParsedCv);
      setPhase("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile analizzare il CV.");
      reset();
    }
  };

  const handleSave = async () => {
    if (!draft || !file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("profile_id", current.profile.id);
      fd.append("parsed_data", JSON.stringify(draft));
      fd.append("raw_text", rawText);
      if (targetRole) fd.append("target_role", targetRole);

      const res = await fetch("/api/cvs", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Salvataggio non riuscito.");

      toast.success("CV caricato con successo.");
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile salvare il CV.");
      setSaving(false);
    }
  };

  // ---- select / parsing phases ----
  if (phase !== "review") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {phase === "parsing" ? (
            <>
              <DialogHeader>
                <DialogTitle>Analisi del CV in corso…</DialogTitle>
                <DialogDescription>
                  Estrazione e strutturazione dei contenuti. Di solito richiede
                  5-10 secondi.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Spinner className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">{file?.name}</p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Carica nuovo CV</DialogTitle>
                <DialogDescription>
                  Carica il tuo CV in PDF. Estrarremo i dati così potrai
                  rivederli prima di salvare.
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) void handleFileSelected(dropped);
                }}
                className="mt-2 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Trascina qui il tuo CV o clicca per sfogliare
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF fino a 10MB</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) void handleFileSelected(selected);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ---- review phase ----
  if (!draft) return null;
  const pi = draft.personal_info;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-6">
          <DialogTitle>Rivedi i dati estratti</DialogTitle>
          <DialogDescription>
            Correggi ciò che serve prima di salvare. Diventerà il tuo CV attivo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ruolo target</Label>
            <Select
              value={targetRole ?? "none"}
              onValueChange={(v) =>
                setTargetRole(v === "none" ? null : (v as TargetRole))
              }
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Seleziona un ruolo target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {(Object.keys(TARGET_ROLE_LABELS) as TargetRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {TARGET_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Accordion
            type="multiple"
            defaultValue={["personal", "education", "experience", "projects", "extras"]}
            className="space-y-3"
          >
            {/* Personal info */}
            <Section value="personal" title="Dati personali">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo" value={pi.full_name} onChange={(v) => update((d) => { d.personal_info.full_name = v; })} />
                <Field label="Email" value={pi.email ?? ""} onChange={(v) => update((d) => { d.personal_info.email = v || null; })} />
                <Field label="Telefono" value={pi.phone ?? ""} onChange={(v) => update((d) => { d.personal_info.phone = v || null; })} />
                <Field label="Località" value={pi.location ?? ""} onChange={(v) => update((d) => { d.personal_info.location = v || null; })} />
                <Field label="URL LinkedIn" value={pi.linkedin_url ?? ""} onChange={(v) => update((d) => { d.personal_info.linkedin_url = v || null; })} />
                <Field label="URL GitHub" value={pi.github_url ?? ""} onChange={(v) => update((d) => { d.personal_info.github_url = v || null; })} />
                <Field label="URL Portfolio" value={pi.portfolio_url ?? ""} onChange={(v) => update((d) => { d.personal_info.portfolio_url = v || null; })} />
              </div>
            </Section>

            {/* Education */}
            <Section value="education" title={`Formazione (${draft.education.length})`}>
              <div className="space-y-3">
                {draft.education.map((edu, i) => (
                  <EntryCard
                    key={i}
                    title={edu.degree || edu.institution || `Education ${i + 1}`}
                    onRemove={() => update((d) => { d.education.splice(i, 1); })}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Istituto" value={edu.institution} onChange={(v) => update((d) => { d.education[i].institution = v; })} />
                      <Field label="Titolo di studio" value={edu.degree} onChange={(v) => update((d) => { d.education[i].degree = v; })} />
                      <Field label="Campo di studio" value={edu.field_of_study ?? ""} onChange={(v) => update((d) => { d.education[i].field_of_study = v || null; })} />
                      <Field label="Località" value={edu.location ?? ""} onChange={(v) => update((d) => { d.education[i].location = v || null; })} />
                      <Field label="Inizio (AAAA-MM)" value={edu.start_date ?? ""} onChange={(v) => update((d) => { d.education[i].start_date = v || null; })} />
                      <Field label="Fine (AAAA-MM)" value={edu.end_date ?? ""} onChange={(v) => update((d) => { d.education[i].end_date = v || null; })} />
                      <Field label="GPA" value={edu.gpa ?? ""} onChange={(v) => update((d) => { d.education[i].gpa = v || null; })} />
                    </div>
                    <CheckboxRow
                      id={`edu-expected-${i}`}
                      label="In corso / previsto"
                      checked={edu.expected}
                      onChange={(c) => update((d) => { d.education[i].expected = c; })}
                    />
                    <TagListEditor label="Riconoscimenti" items={edu.honors} placeholder="Aggiungi un riconoscimento" onChange={(items) => update((d) => { d.education[i].honors = items; })} />
                    <TagListEditor label="Corsi rilevanti" items={edu.relevant_courses} placeholder="Aggiungi un corso" onChange={(items) => update((d) => { d.education[i].relevant_courses = items; })} />
                  </EntryCard>
                ))}
                <AddButton label="Aggiungi formazione" onClick={() => update((d) => { d.education.push(emptyEducation()); })} />
              </div>
            </Section>

            {/* Work experience */}
            <Section value="experience" title={`Esperienza lavorativa (${draft.work_experience.length})`}>
              <div className="space-y-3">
                {draft.work_experience.map((exp, i) => (
                  <EntryCard
                    key={i}
                    title={exp.role || exp.company || `Experience ${i + 1}`}
                    onRemove={() => update((d) => { d.work_experience.splice(i, 1); })}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Ruolo" value={exp.role} onChange={(v) => update((d) => { d.work_experience[i].role = v; })} />
                      <Field label="Azienda" value={exp.company} onChange={(v) => update((d) => { d.work_experience[i].company = v; })} />
                      <Field label="Località" value={exp.location ?? ""} onChange={(v) => update((d) => { d.work_experience[i].location = v || null; })} />
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select
                          value={exp.type ?? "none"}
                          onValueChange={(v) => update((d) => { d.work_experience[i].type = v === "none" ? null : (v as WorkType); })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {WORK_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Field label="Inizio (AAAA-MM)" value={exp.start_date ?? ""} onChange={(v) => update((d) => { d.work_experience[i].start_date = v || null; })} />
                      <Field label="Fine (AAAA-MM)" value={exp.end_date ?? ""} onChange={(v) => update((d) => { d.work_experience[i].end_date = v || null; })} />
                    </div>
                    <CheckboxRow
                      id={`exp-current-${i}`}
                      label="Attualmente in corso"
                      checked={exp.is_current}
                      onChange={(c) => update((d) => { d.work_experience[i].is_current = c; })}
                    />
                    <BulletsEditor bullets={exp.bullets} onChange={(b) => update((d) => { d.work_experience[i].bullets = b; })} />
                  </EntryCard>
                ))}
                <AddButton label="Aggiungi esperienza" onClick={() => update((d) => { d.work_experience.push(emptyWork()); })} />
              </div>
            </Section>

            {/* Projects */}
            <Section value="projects" title={`Progetti (${draft.projects.length})`}>
              <div className="space-y-3">
                {draft.projects.map((proj, i) => (
                  <EntryCard
                    key={i}
                    title={proj.name || `Project ${i + 1}`}
                    onRemove={() => update((d) => { d.projects.splice(i, 1); })}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nome" value={proj.name} onChange={(v) => update((d) => { d.projects[i].name = v; })} />
                      <Field label="Contesto" value={proj.context ?? ""} onChange={(v) => update((d) => { d.projects[i].context = v || null; })} />
                      <Field label="URL" value={proj.url ?? ""} onChange={(v) => update((d) => { d.projects[i].url = v || null; })} />
                      <Field label="Località" value={proj.location ?? ""} onChange={(v) => update((d) => { d.projects[i].location = v || null; })} />
                      <Field label="Inizio (AAAA-MM)" value={proj.start_date ?? ""} onChange={(v) => update((d) => { d.projects[i].start_date = v || null; })} />
                      <Field label="Fine (AAAA-MM)" value={proj.end_date ?? ""} onChange={(v) => update((d) => { d.projects[i].end_date = v || null; })} />
                    </div>
                    <CheckboxRow
                      id={`proj-current-${i}`}
                      label="In corso"
                      checked={proj.is_current}
                      onChange={(c) => update((d) => { d.projects[i].is_current = c; })}
                    />
                    <TagListEditor label="Tecnologie" items={proj.technologies} placeholder="Aggiungi una tecnologia" onChange={(items) => update((d) => { d.projects[i].technologies = items; })} />
                    <BulletsEditor bullets={proj.bullets} onChange={(b) => update((d) => { d.projects[i].bullets = b; })} />
                  </EntryCard>
                ))}
                <AddButton label="Aggiungi progetto" onClick={() => update((d) => { d.projects.push(emptyProject()); })} />
              </div>
            </Section>

            {/* Skills & extras */}
            <Section value="extras" title="Competenze ed extra">
              <div className="space-y-5">
                <TagListEditor label="Competenze tecniche" items={draft.additional_info.technical_skills} placeholder="Aggiungi una competenza" onChange={(items) => update((d) => { d.additional_info.technical_skills = items; })} />
                <TagListEditor label="Interessi" items={draft.additional_info.interests} placeholder="Aggiungi un interesse" onChange={(items) => update((d) => { d.additional_info.interests = items; })} />

                {/* Languages */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Lingue</Label>
                  {draft.additional_info.languages.map((lang, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="Lingua" value={lang.name} onChange={(e) => update((d) => { d.additional_info.languages[i].name = e.target.value; })} />
                      <Input placeholder="Livello" value={lang.level ?? ""} onChange={(e) => update((d) => { d.additional_info.languages[i].level = e.target.value || null; })} />
                      <RemoveIcon onClick={() => update((d) => { d.additional_info.languages.splice(i, 1); })} />
                    </div>
                  ))}
                  <AddButton label="Aggiungi lingua" onClick={() => update((d) => { d.additional_info.languages.push(emptyLanguage()); })} />
                </div>

                {/* Certifications */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Certificazioni</Label>
                  {draft.additional_info.certifications.map((cert, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="Nome" value={cert.name} onChange={(e) => update((d) => { d.additional_info.certifications[i].name = e.target.value; })} />
                      <Input placeholder="Ente" value={cert.issuer ?? ""} onChange={(e) => update((d) => { d.additional_info.certifications[i].issuer = e.target.value || null; })} />
                      <Input placeholder="Data" value={cert.date ?? ""} onChange={(e) => update((d) => { d.additional_info.certifications[i].date = e.target.value || null; })} />
                      <RemoveIcon onClick={() => update((d) => { d.additional_info.certifications.splice(i, 1); })} />
                    </div>
                  ))}
                  <AddButton label="Aggiungi certificazione" onClick={() => update((d) => { d.additional_info.certifications.push(emptyCert()); })} />
                </div>

                {/* Extracurriculars */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Attività extracurriculari ({draft.extracurriculars.length})
                  </Label>
                  {draft.extracurriculars.map((extra, i) => (
                    <EntryCard
                      key={i}
                      title={extra.title || `Activity ${i + 1}`}
                      onRemove={() => update((d) => { d.extracurriculars.splice(i, 1); })}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Titolo" value={extra.title} onChange={(v) => update((d) => { d.extracurriculars[i].title = v; })} />
                        <Field label="Organizzazione" value={extra.organization ?? ""} onChange={(v) => update((d) => { d.extracurriculars[i].organization = v || null; })} />
                        <Field label="Inizio (AAAA-MM)" value={extra.start_date ?? ""} onChange={(v) => update((d) => { d.extracurriculars[i].start_date = v || null; })} />
                        <Field label="Fine (AAAA-MM)" value={extra.end_date ?? ""} onChange={(v) => update((d) => { d.extracurriculars[i].end_date = v || null; })} />
                      </div>
                      <BulletsEditor bullets={extra.bullets} onChange={(b) => update((d) => { d.extracurriculars[i].bullets = b; })} />
                    </EntryCard>
                  ))}
                  <AddButton label="Aggiungi attività" onClick={() => update((d) => { d.extracurriculars.push(emptyExtra()); })} />
                </div>
              </div>
            </Section>
          </Accordion>
        </div>

        <DialogFooter className="border-t p-4">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Salvataggio…
              </>
            ) : (
              "Salva CV"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- reusable building blocks ----

function Section({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-lg border bg-card px-4">
      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CheckboxRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
    </div>
  );
}

function EntryCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Rimuovi
        </Button>
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Plus className="mr-1 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function RemoveIcon({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0 text-muted-foreground hover:text-destructive"
      onClick={onClick}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Punti elenco</Label>
      {bullets.map((bullet, i) => (
        <div key={i} className="flex gap-2">
          <Textarea
            rows={2}
            className="min-h-0"
            value={bullet}
            onChange={(e) => {
              const next = [...bullets];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <RemoveIcon onClick={() => onChange(bullets.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...bullets, ""])}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Aggiungi punto
      </Button>
    </div>
  );
}

function TagListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const value = input.trim();
    if (!value) return;
    onChange([...items, value]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {item}
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Aggiungi
        </Button>
      </div>
    </div>
  );
}
