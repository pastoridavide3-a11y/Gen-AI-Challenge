"use client";

import { useState, type ReactNode } from "react";
import { useProfile } from "@/lib/profile-context";
import { INDUSTRY_LABELS, COMPANY_SIZE_LABELS, WORK_STYLE_LABELS } from "@/lib/labels";
import { IndustryEnum, CompanySizeEnum, WorkStyleEnum } from "@/lib/types";
import type { SurveyData, Industry, CompanySize, WorkStyle } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  GraduationCap,
  Briefcase,
  Target,
  MapPin,
  Settings,
  Pencil,
  Check,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EditingSection = "education" | "industry" | "goals" | "constraints" | "preferences" | null;

type EducationForm = {
  university: string;
  course: string;
  year: string;
  gpa: string;
};

// Shared label styling: matches the original muted, normal-weight field labels
// (the Label primitive defaults to font-medium, which we override here).
const FIELD_LABEL = "text-sm font-normal text-muted-foreground";
const CHIP_DASHED =
  "inline-flex items-center gap-1 rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The Modifica / Annulla+Salva control shared by every section. */
function SectionEditBar({
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mb-4 flex justify-end">
      {editing ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" /> Annulla
          </Button>
          <Button size="sm" onClick={onSave}>
            <Check className="mr-1 h-4 w-4" /> Salva
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-1 h-4 w-4" /> Modifica
        </Button>
      )}
    </div>
  );
}

/** A pill that can carry an accessible remove button while editing. */
function RemovableChip({
  className,
  removable,
  onRemove,
  removeLabel,
  children,
}: {
  className?: string;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-mr-1 ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:text-destructive hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/** "+ Aggiungi" for fixed-vocabulary fields: a menu of the not-yet-picked options. */
function EnumChipAdder<T extends string>({
  options,
  selected,
  labels,
  onAdd,
  triggerClassName,
}: {
  options: readonly T[];
  selected: readonly T[];
  labels: Record<T, string>;
  onAdd: (value: T) => void;
  triggerClassName?: string;
}) {
  const remaining = options.filter((opt) => !selected.includes(opt));
  if (remaining.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(CHIP_DASHED, triggerClassName)}>
          <Plus className="h-3 w-3" /> Aggiungi
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {remaining.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={() => onAdd(opt)}>
            {labels[opt]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "+ Aggiungi" for free-text lists: reveals an inline input that commits on Enter/blur. */
function TextChipAdder({
  onAdd,
  placeholder,
  triggerClassName,
}: {
  onAdd: (value: string) => void;
  placeholder: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setOpen(false);
  };

  if (open) {
    return (
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        onBlur={commit}
        className="h-7 w-40 rounded-full px-3 text-xs"
      />
    );
  }

  return (
    <button type="button" onClick={() => setOpen(true)} className={cn(CHIP_DASHED, triggerClassName)}>
      <Plus className="h-3 w-3" /> Aggiungi
    </button>
  );
}

export function ProfilePage() {
  const { current } = useProfile();
  const profile = current.profile;
  const survey = current.survey;
  // Education is anagrafica: it lives on the profile, while GPA is read off the
  // active CV's parsed data (the survey schema has no education block).
  const initialEducation: EducationForm = {
    university: profile.university ?? "",
    course: profile.course ?? "",
    year: profile.year ?? "",
    gpa: current.activeCv?.cv.parsed_data?.education[0]?.gpa ?? "",
  };

  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [showRegenerateBanner, setShowRegenerateBanner] = useState(false);

  // Local state for form editing (mock - doesn't actually persist)
  const [formData, setFormData] = useState<SurveyData | null>(survey);
  const [eduForm, setEduForm] = useState<EducationForm>(initialEducation);

  const handleSave = () => {
    setEditingSection(null);
    setShowRegenerateBanner(true);
  };

  const handleCancel = () => {
    setFormData(survey);
    setEduForm(initialEducation);
    setEditingSection(null);
  };

  if (!formData) {
    return (
      <div className="text-muted-foreground">Nessun questionario di profilo disponibile.</div>
    );
  }

  // Local list editors. Edits live in component state and reset on Annulla or
  // profile switch, mirroring how the text fields above behave.
  const addIndustry = (value: Industry) =>
    setFormData({ ...formData, industry_interests: [...formData.industry_interests, value] });
  const removeIndustry = (index: number) =>
    setFormData({
      ...formData,
      industry_interests: formData.industry_interests.filter((_, i) => i !== index),
    });

  const addLocation = (value: string) =>
    setFormData({
      ...formData,
      constraints: {
        ...formData.constraints,
        geographic_availability: [...formData.constraints.geographic_availability, value],
      },
    });
  const removeLocation = (index: number) =>
    setFormData({
      ...formData,
      constraints: {
        ...formData.constraints,
        geographic_availability: formData.constraints.geographic_availability.filter(
          (_, i) => i !== index,
        ),
      },
    });

  const addCompanySize = (value: CompanySize) =>
    setFormData({
      ...formData,
      work_preferences: {
        ...formData.work_preferences,
        company_size: [...formData.work_preferences.company_size, value],
      },
    });
  const removeCompanySize = (index: number) =>
    setFormData({
      ...formData,
      work_preferences: {
        ...formData.work_preferences,
        company_size: formData.work_preferences.company_size.filter((_, i) => i !== index),
      },
    });

  const addLanguage = (value: string) =>
    setFormData({
      ...formData,
      work_preferences: {
        ...formData.work_preferences,
        work_languages: [...formData.work_preferences.work_languages, value],
      },
    });
  const removeLanguage = (index: number) =>
    setFormData({
      ...formData,
      work_preferences: {
        ...formData.work_preferences,
        work_languages: formData.work_preferences.work_languages.filter((_, i) => i !== index),
      },
    });

  const setWorkStyle = (value: WorkStyle | null) =>
    setFormData({
      ...formData,
      work_preferences: { ...formData.work_preferences, work_style: value },
    });

  const editingIndustry = editingSection === "industry";
  const editingConstraints = editingSection === "constraints";
  const editingPreferences = editingSection === "preferences";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profilo</h1>
        <p className="mt-1 text-muted-foreground">
          Le tue preferenze e i tuoi obiettivi di carriera. Questi dati alimentano i nostri consigli personalizzati.
        </p>
      </div>

      {/* Regenerate Banner */}
      {showRegenerateBanner && (
        <Card className="flex flex-col gap-3 border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
            <div>
              <div className="font-medium text-foreground">Profilo aggiornato</div>
              <div className="text-sm text-muted-foreground">
                Rigenera l&apos;analisi per vedere consigli aggiornati in base alle tue modifiche.
              </div>
            </div>
          </div>
          <Button className="w-full shrink-0 sm:w-auto" onClick={() => setShowRegenerateBanner(false)}>
            Rigenera analisi
          </Button>
        </Card>
      )}

      {/* Profile Sections */}
      <Accordion type="multiple" defaultValue={["education", "industry", "goals", "constraints", "preferences"]} className="space-y-4">
        {/* Education */}
        <AccordionItem value="education" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cat-1/10">
                <GraduationCap className="h-5 w-5 text-cat-1" />
              </div>
              <span className="font-semibold">Formazione</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionEditBar
              editing={editingSection === "education"}
              onEdit={() => setEditingSection("education")}
              onCancel={handleCancel}
              onSave={handleSave}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edu-university" className={FIELD_LABEL}>Università</Label>
                {editingSection === "education" ? (
                  <Input
                    id="edu-university"
                    className="mt-1"
                    value={eduForm.university}
                    onChange={(e) => setEduForm({ ...eduForm, university: e.target.value })}
                  />
                ) : (
                  <div className="mt-1 font-medium break-words text-foreground">{eduForm.university || "—"}</div>
                )}
              </div>
              <div>
                <Label htmlFor="edu-course" className={FIELD_LABEL}>Corso</Label>
                {editingSection === "education" ? (
                  <Input
                    id="edu-course"
                    className="mt-1"
                    value={eduForm.course}
                    onChange={(e) => setEduForm({ ...eduForm, course: e.target.value })}
                  />
                ) : (
                  <div className="mt-1 font-medium break-words text-foreground">{eduForm.course || "—"}</div>
                )}
              </div>
              <div>
                <Label htmlFor="edu-year" className={FIELD_LABEL}>Anno</Label>
                {editingSection === "education" ? (
                  <Input
                    id="edu-year"
                    className="mt-1"
                    value={eduForm.year}
                    onChange={(e) => setEduForm({ ...eduForm, year: e.target.value })}
                  />
                ) : (
                  <div className="mt-1 font-medium break-words text-foreground">{eduForm.year || "—"}</div>
                )}
              </div>
              {eduForm.gpa && (
                <div>
                  <Label htmlFor="edu-gpa" className={FIELD_LABEL}>GPA</Label>
                  {editingSection === "education" ? (
                    <Input
                      id="edu-gpa"
                      className="mt-1"
                      value={eduForm.gpa}
                      onChange={(e) => setEduForm({ ...eduForm, gpa: e.target.value })}
                    />
                  ) : (
                    <div className="mt-1 font-medium break-words text-foreground">{eduForm.gpa}</div>
                  )}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Industry Interests */}
        <AccordionItem value="industry" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cat-2/10">
                <Briefcase className="h-5 w-5 text-cat-2" />
              </div>
              <span className="font-semibold">Settori di interesse</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionEditBar
              editing={editingIndustry}
              onEdit={() => setEditingSection("industry")}
              onCancel={handleCancel}
              onSave={handleSave}
            />
            <div role="group" aria-label="Settori di interesse" className="flex flex-wrap gap-2">
              {formData.industry_interests.length === 0 && !editingIndustry && (
                <span className="text-sm text-muted-foreground">Nessun settore selezionato.</span>
              )}
              {formData.industry_interests.map((industry, i) => (
                <RemovableChip
                  key={industry}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium",
                    editingIndustry
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                  removable={editingIndustry}
                  onRemove={() => removeIndustry(i)}
                  removeLabel={`Rimuovi ${INDUSTRY_LABELS[industry]}`}
                >
                  {INDUSTRY_LABELS[industry]}
                </RemovableChip>
              ))}
              {editingIndustry && (
                <EnumChipAdder
                  options={IndustryEnum.options}
                  selected={formData.industry_interests}
                  labels={INDUSTRY_LABELS}
                  onAdd={addIndustry}
                  triggerClassName="px-3 py-1.5 text-sm"
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Career Goals */}
        <AccordionItem value="goals" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cat-3/10">
                <Target className="h-5 w-5 text-cat-3" />
              </div>
              <span className="font-semibold">Obiettivi di carriera</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionEditBar
              editing={editingSection === "goals"}
              onEdit={() => setEditingSection("goals")}
              onCancel={handleCancel}
              onSave={handleSave}
            />
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-one-year" className={FIELD_LABEL}>Obiettivo a 1 anno</Label>
                {editingSection === "goals" ? (
                  <Textarea
                    id="goal-one-year"
                    className="mt-1"
                    rows={2}
                    value={formData.career_goals.one_year_goal}
                    onChange={(e) => setFormData({
                      ...formData,
                      career_goals: { ...formData.career_goals, one_year_goal: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 break-words text-foreground">{formData.career_goals.one_year_goal || "—"}</div>
                )}
              </div>
              <div>
                <Label htmlFor="goal-three-year" className={FIELD_LABEL}>Obiettivo a 3 anni</Label>
                {editingSection === "goals" ? (
                  <Textarea
                    id="goal-three-year"
                    className="mt-1"
                    rows={2}
                    value={formData.career_goals.three_year_goal}
                    onChange={(e) => setFormData({
                      ...formData,
                      career_goals: { ...formData.career_goals, three_year_goal: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 break-words text-foreground">{formData.career_goals.three_year_goal || "—"}</div>
                )}
              </div>
              <div>
                <Label htmlFor="goal-avoid" className={FIELD_LABEL}>Cosa non voglio</Label>
                {editingSection === "goals" ? (
                  <Textarea
                    id="goal-avoid"
                    className="mt-1"
                    rows={2}
                    value={formData.career_goals.what_i_dont_want ?? ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      career_goals: { ...formData.career_goals, what_i_dont_want: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 break-words text-foreground">{formData.career_goals.what_i_dont_want ?? "—"}</div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Constraints */}
        <AccordionItem value="constraints" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cat-4/10">
                <MapPin className="h-5 w-5 text-cat-4" />
              </div>
              <span className="font-semibold">Vincoli</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionEditBar
              editing={editingConstraints}
              onEdit={() => setEditingSection("constraints")}
              onCancel={handleCancel}
              onSave={handleSave}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label id="constraints-geo-label" className={FIELD_LABEL}>Disponibilità geografica</Label>
                <div
                  role="group"
                  aria-labelledby="constraints-geo-label"
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {formData.constraints.geographic_availability.length === 0 && !editingConstraints && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {formData.constraints.geographic_availability.map((loc, i) => (
                    <RemovableChip
                      key={i}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      removable={editingConstraints}
                      onRemove={() => removeLocation(i)}
                      removeLabel={`Rimuovi ${loc}`}
                    >
                      {loc}
                    </RemovableChip>
                  ))}
                  {editingConstraints && (
                    <TextChipAdder
                      onAdd={addLocation}
                      placeholder="Aggiungi località"
                      triggerClassName="px-2.5 py-1 text-xs"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="constraints-hours" className={FIELD_LABEL}>Ore di studio settimanali</Label>
                {editingConstraints ? (
                  <Input
                    id="constraints-hours"
                    className="mt-1"
                    value={formData.constraints.weekly_study_hours ?? ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      constraints: { ...formData.constraints, weekly_study_hours: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium break-words text-foreground">{formData.constraints.weekly_study_hours ?? "—"}</div>
                )}
              </div>
              <div>
                <Label htmlFor="constraints-budget" className={FIELD_LABEL}>Budget per la formazione</Label>
                {editingConstraints ? (
                  <Input
                    id="constraints-budget"
                    className="mt-1"
                    value={formData.constraints.training_budget ?? ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      constraints: { ...formData.constraints, training_budget: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium break-words text-foreground">{formData.constraints.training_budget ?? "—"}</div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Preferences */}
        <AccordionItem value="preferences" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cat-5/10">
                <Settings className="h-5 w-5 text-cat-5" />
              </div>
              <span className="font-semibold">Preferenze di lavoro</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionEditBar
              editing={editingPreferences}
              onEdit={() => setEditingSection("preferences")}
              onCancel={handleCancel}
              onSave={handleSave}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label id="prefs-size-label" className={FIELD_LABEL}>Dimensione azienda</Label>
                <div
                  role="group"
                  aria-labelledby="prefs-size-label"
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {formData.work_preferences.company_size.length === 0 && !editingPreferences && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {formData.work_preferences.company_size.map((size, i) => (
                    <RemovableChip
                      key={size}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      removable={editingPreferences}
                      onRemove={() => removeCompanySize(i)}
                      removeLabel={`Rimuovi ${COMPANY_SIZE_LABELS[size]}`}
                    >
                      {COMPANY_SIZE_LABELS[size]}
                    </RemovableChip>
                  ))}
                  {editingPreferences && (
                    <EnumChipAdder
                      options={CompanySizeEnum.options}
                      selected={formData.work_preferences.company_size}
                      labels={COMPANY_SIZE_LABELS}
                      onAdd={addCompanySize}
                      triggerClassName="px-2.5 py-1 text-xs"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label id="prefs-lang-label" className={FIELD_LABEL}>Lingue di lavoro</Label>
                <div
                  role="group"
                  aria-labelledby="prefs-lang-label"
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {formData.work_preferences.work_languages.length === 0 && !editingPreferences && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {formData.work_preferences.work_languages.map((lang, i) => (
                    <RemovableChip
                      key={i}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      removable={editingPreferences}
                      onRemove={() => removeLanguage(i)}
                      removeLabel={`Rimuovi ${lang}`}
                    >
                      {lang}
                    </RemovableChip>
                  ))}
                  {editingPreferences && (
                    <TextChipAdder
                      onAdd={addLanguage}
                      placeholder="Aggiungi lingua"
                      triggerClassName="px-2.5 py-1 text-xs"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="prefs-workstyle" className={FIELD_LABEL}>Modalità di lavoro</Label>
                {editingPreferences ? (
                  <Select
                    value={formData.work_preferences.work_style ?? "flexible"}
                    onValueChange={(v) => setWorkStyle(v === "flexible" ? null : (v as WorkStyle))}
                  >
                    <SelectTrigger id="prefs-workstyle" className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flessibile</SelectItem>
                      {WorkStyleEnum.options.map((ws) => (
                        <SelectItem key={ws} value={ws}>
                          {WORK_STYLE_LABELS[ws]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 font-medium text-foreground">
                    {formData.work_preferences.work_style
                      ? WORK_STYLE_LABELS[formData.work_preferences.work_style]
                      : "Flessibile"}
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
