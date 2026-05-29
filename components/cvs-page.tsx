"use client";

import {
  useEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useProfile } from "@/lib/profile-context";
import {
  targetRoleLabel,
  PRIORITY_LABELS,
  GAP_CATEGORY_LABELS,
  SKILL_STRENGTH_LABELS,
  ACTION_TYPE_LABELS,
  CV_SECTION_LABELS,
} from "@/lib/labels";
import { cvSignedUrl } from "@/lib/db/storage";
import type { CvBundle, AnalysisRow, AnalysisStatus } from "@/lib/db/rows";
import type { ScoreBreakdown } from "@/lib/scoring";
import type {
  GapAnalysis,
  LearningPath,
  Priority,
  ActionType,
  WorkExperienceType,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/score-ring";
import { Reveal } from "@/components/reveal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CvUploadDialog } from "@/components/cv-upload-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Upload,
  FileText,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  GitCompare,
  Target,
  Archive,
  Sparkles,
  Eye,
  Clock,
  Trash2,
  TrendingUp,
  TrendingDown,
  Flag,
  Plus,
  Wallet,
  BookOpen,
  Users,
  Award,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Wrench,
  BadgeCheck,
  Rocket,
  Layers,
  User,
  Lightbulb,
  Languages,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "detail" | "compare";

const DIM_LABELS: Record<keyof ScoreBreakdown, string> = {
  completeness: "Completezza",
  action_impact: "Azione e impatto",
  clarity: "Chiarezza",
  market_fit: "Aderenza al mercato",
  relevance: "Rilevanza",
};

const WORK_TYPE_LABELS: Record<WorkExperienceType, string> = {
  internship: "Stage",
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance",
  contract: "Contratto",
};

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// Tinted tile classes for section-header icons, keyed by semantic tone.
const TONE_TILE: Record<"success" | "warning" | "primary" | "info", string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
};

// Pill styling for priority, kept "actionable" rather than alarming: amber for
// high, blue for medium, neutral for low.
const PRIORITY_STYLES: Record<Priority, string> = {
  high: "border-warning/30 bg-warning/10 text-warning-foreground",
  medium: "border-info/30 bg-info/10 text-info",
  low: "border-border bg-muted text-muted-foreground",
};

// Score band → CSS colour, shared with <ScoreRing> so bars and rings agree.
function bandColor(v: number): string {
  return v >= 75 ? "var(--success)" : v >= 50 ? "var(--primary)" : "var(--warning)";
}

function actionIcon(type: ActionType): LucideIcon {
  switch (type) {
    case "course":
    case "reading":
      return BookOpen;
    case "project":
      return Target;
    case "certification":
      return Award;
    case "networking":
      return Users;
    default:
      return Sparkles;
  }
}

// "2025-06" -> "Giu 2025" (string-only, no Date parsing so it's timezone-safe).
function monthLabel(value: string | null): string | null {
  if (!value) return null;
  const [year, month] = value.split("-");
  const mi = Number.parseInt(month ?? "", 10);
  if (!year || !mi || mi < 1 || mi > 12) return value;
  return `${MONTHS[mi - 1]} ${year}`;
}

function rangeLabel(start: string | null, end: string | null, isCurrent: boolean): string {
  const s = monthLabel(start);
  const e = isCurrent ? "Presente" : monthLabel(end);
  if (s && e) return `${s} - ${e}`;
  return s ?? e ?? "";
}

function eduYear(start: string | null, end: string | null, expected: boolean): string {
  const s = start ? start.split("-")[0] : null;
  const e = end ? end.split("-")[0] : null;
  const tail = expected && e ? `${e} (previsto)` : e;
  if (s && tail) return `${s} - ${tail}`;
  return s ?? tail ?? "";
}

// ISO timestamp -> "12 mag 2025" in Italian. Used for the "analyzed on" hint.
function dayLabel(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: it });
  } catch {
    return null;
  }
}

// ---- Small shared presentational pieces ----

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Icon className="h-4 w-4" />
      {children}
    </h2>
  );
}

function SectionHeader({
  icon: Icon,
  tone,
  title,
  count,
  action,
}: {
  icon: LucideIcon;
  tone: "success" | "warning" | "primary" | "info";
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TONE_TILE[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        {count != null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        PRIORITY_STYLES[priority],
      )}
    >
      <Flag className="h-2.5 w-2.5" />
      Priorità {PRIORITY_LABELS[priority].toLowerCase()}
    </span>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-muted-foreground/70" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

// Grows a bar from 0 to its target width on mount, so score/coverage bars "fill
// in" instead of appearing already complete. Honours prefers-reduced-motion.
function useBarFill(target: number) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setWidth(target);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return width;
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const width = useBarFill(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out-quint"
          style={{ width: `${width}%`, backgroundColor: bandColor(value) }}
        />
      </div>
    </div>
  );
}

// Shows the original uploaded PDF inline in a large overlay. The signed URL is
// minted on click (just before opening), so links stay short-lived and we never
// hold a stale one. Renders nothing when the CV has no stored file (e.g. seeded
// mock CVs without an uploaded PDF). `iconOnly` renders a compact icon trigger
// for use in dense card footers.
function ViewPdfButton({
  filePath,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: {
  filePath: string | null;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!filePath) return null;

  const handleOpen = async (e: MouseEvent) => {
    e.stopPropagation(); // don't trigger an enclosing clickable card
    setUrl(null);
    setError(false);
    setOpen(true);
    try {
      setUrl(await cvSignedUrl(filePath));
    } catch {
      setError(true);
    }
  };

  const iconClass = size === "sm" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4";

  return (
    <>
      {iconOnly ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleOpen}
          title="Visualizza PDF"
          aria-label="Visualizza PDF"
          className="text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant={variant} size={size} onClick={handleOpen}>
          <Eye className={iconClass} />
          Visualizza PDF
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[92vh] flex-col gap-0 p-0 sm:max-w-5xl">
          <DialogHeader className="border-b p-4 text-left">
            <DialogTitle>Anteprima CV</DialogTitle>
            <DialogDescription className="sr-only">
              Anteprima del CV caricato in formato PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="relative flex-1 overflow-hidden rounded-b-lg bg-muted/30">
            {error ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Impossibile aprire il PDF. Riprova.
              </div>
            ) : url ? (
              <iframe src={url} title="Anteprima CV" className="h-full w-full border-0" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Deletes a CV after an explicit confirmation. The DELETE endpoint removes the
// stored PDF, the row, and its analyses (cascade), and promotes the next version
// to active when the active CV is removed; we then router.refresh() to resync
// every screen — the same pattern the upload flow uses. `onDeleted` lets the
// detail view return to the list before the refresh lands.
function DeleteCvButton({
  cv,
  isActive,
  variant = "outline",
  size = "sm",
  iconOnly = false,
  onDeleted,
}: {
  cv: CvBundle;
  isActive: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  iconOnly?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/cvs/${cv.cv.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Eliminazione non riuscita.");
      toast.success(`${cv.title} eliminato.`);
      setOpen(false);
      onDeleted?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile eliminare il CV.");
      setDeleting(false);
    }
  };

  const iconClass = size === "sm" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4";

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Elimina"
            aria-label="Elimina CV"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant={variant}
            size={size}
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className={iconClass} />
            Elimina
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {cv.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? "È il tuo CV attivo. La versione precedente più recente, se esiste, diventerà quella attiva. "
              : ""}
            L&apos;azione è definitiva: verranno rimossi il PDF caricato e tutte le analisi
            collegate.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" disabled={deleting} onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
            {deleting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Eliminazione…
              </>
            ) : (
              "Elimina"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Promotes an archived CV to active. PATCHes the row, then updates client state
// via setActiveCv so the list hero, dashboard and sidebar score reflect the new
// active CV immediately — the same no-refresh pattern AnalyzeCvButton uses.
function SetActiveCvButton({
  cv,
  variant = "outline",
  size = "default",
}: {
  cv: CvBundle;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}) {
  const { current, setActiveCv } = useProfile();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cvs/${cv.cv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Impossibile impostare il CV come attivo.");
      setActiveCv(current.profile.id, cv.cv.id);
      toast.success(`${cv.title} impostato come attivo.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={loading}>
      {loading ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          Impostazione…
        </>
      ) : (
        <>
          <BadgeCheck className="mr-2 h-4 w-4" />
          Imposta come CV attivo
        </>
      )}
    </Button>
  );
}

// ---- CV list (history / version manager) ----

export function CVsPage() {
  const { current } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const activeCv = current.activeCv;
  const archivedCvs = current.cvs.filter((c) => c.cv.status === "archived");

  // View state lives in the URL so that the sidebar "I miei CV" link (which
  // always points to /cvs with no params) naturally resets to the list view,
  // and the browser back button works for free.
  const cvParam = searchParams.get("cv");
  const compareParam = searchParams.get("compare");

  let viewMode: ViewMode = "list";
  let selectedCv: CvBundle | null = null;
  let compareCv: CvBundle | null = null;

  if (compareParam) {
    compareCv = current.cvs.find((c) => c.cv.id === compareParam) ?? null;
    if (compareCv && activeCv) {
      selectedCv = activeCv;
      viewMode = "compare";
    }
  } else if (cvParam) {
    selectedCv = current.cvs.find((c) => c.cv.id === cvParam) ?? null;
    if (selectedCv) viewMode = "detail";
  }

  const handleViewDetail = (cv: CvBundle) => {
    router.push(`/cvs?cv=${cv.cv.id}`);
  };

  const handleCompare = (cv: CvBundle) => {
    if (activeCv && cv.cv.id !== activeCv.cv.id) {
      router.push(`/cvs?compare=${cv.cv.id}`);
    }
  };

  const handleBackToList = () => {
    router.push("/cvs");
  };

  if (viewMode === "detail" && selectedCv) {
    return <CVDetailView cv={selectedCv} onBack={handleBackToList} />;
  }

  if (viewMode === "compare" && selectedCv && compareCv) {
    return (
      <CVCompareView activeCv={selectedCv} compareCv={compareCv} onBack={handleBackToList} />
    );
  }

  const hasAny = Boolean(activeCv) || archivedCvs.length > 0;

  return (
    <div className="space-y-8 duration-300 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">I miei CV</h1>
          <p className="mt-1 text-muted-foreground">
            La cronologia delle versioni del tuo CV, con punteggio e analisi per ciascuna.
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)} className="shadow-sm">
          <Upload className="mr-2 h-4 w-4" />
          Carica nuovo CV
        </Button>
      </div>

      {/* Active CV — prominent hero */}
      {activeCv && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <SectionLabel icon={Sparkles}>CV attivo</SectionLabel>
          <div className="mt-3">
            <ActiveCvCard cv={activeCv} onOpen={() => handleViewDetail(activeCv)} />
          </div>
        </section>
      )}

      {/* Archived versions — compact grid */}
      {archivedCvs.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <SectionLabel icon={Archive}>Versioni precedenti</SectionLabel>
            <span className="text-xs text-muted-foreground">
              {archivedCvs.length} {archivedCvs.length === 1 ? "versione" : "versioni"}
            </span>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {archivedCvs.map((cv, i) => (
              <Reveal key={cv.cv.id} className="h-full" delay={i * 70}>
                <ArchivedCvCard
                  cv={cv}
                  activeScore={activeCv?.score ?? null}
                  onOpen={() => handleViewDetail(cv)}
                  onCompare={() => handleCompare(cv)}
                />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasAny && (
        <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Nessun CV ancora caricato</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Carica il tuo CV per ottenere punteggio, punti di forza e un percorso di crescita
              verso il ruolo target.
            </p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Carica il tuo primo CV
          </Button>
        </Card>
      )}

      {/* Upload + review flow */}
      <CvUploadDialog open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
    </div>
  );
}

function ActiveCvCard({ cv, onOpen }: { cv: CvBundle; onOpen: () => void }) {
  const role = targetRoleLabel(cv.cv.target_role);
  const analysed = dayLabel(cv.analysis?.updated_at ?? null);
  const match = cv.analysis?.gap_analysis?.dimension_scores.market_fit.score ?? null;

  return (
    <Card
      onClick={onOpen}
      className="group relative cursor-pointer gap-0 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-0 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      {/* top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-success/70" />

      <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        {/* identity */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/20">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">{cv.title}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                CV attivo
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{cv.uploadedLabel}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <MetaItem icon={Target} label="Ruolo" value={role} />
              {analysed && <MetaItem icon={Sparkles} label="Analisi" value={analysed} />}
            </div>
          </div>
        </div>

        {/* score + match */}
        <div className="flex items-center gap-6 sm:gap-8">
          <ScoreRing value={cv.score} size={108} label="Punteggio" />
          {match !== null && (
            <div className="border-l border-border/70 pl-6 sm:pl-8">
              <div className="text-3xl font-semibold tabular-nums text-foreground">{match}%</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Match con {role}</div>
            </div>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-6 py-3 sm:px-7">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          Apri analisi
          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <ViewPdfButton filePath={cv.cv.file_path} />
          <DeleteCvButton cv={cv} isActive />
        </div>
      </div>
    </Card>
  );
}

function ArchivedCvCard({
  cv,
  activeScore,
  onOpen,
  onCompare,
}: {
  cv: CvBundle;
  activeScore: number | null;
  onOpen: () => void;
  onCompare: () => void;
}) {
  const role = targetRoleLabel(cv.cv.target_role);
  // This version's score relative to the active CV: positive = higher than active.
  const delta = activeScore != null && cv.score != null ? cv.score - activeScore : null;

  return (
    <Card className="group flex h-full flex-col gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-start justify-between gap-3 p-5 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Archive className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{cv.title}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Archiviato
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{cv.uploadedLabel}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {cv.score ?? "—"}
          </span>
          {delta != null && delta !== 0 ? (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                delta > 0 ? "text-success" : "text-destructive",
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta > 0 ? "+" : "−"}
              {Math.abs(delta)} vs attivo
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Punteggio</span>
          )}
        </div>
      </button>

      <div className="px-5 pb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          {role}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/70 bg-muted/20 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <GitCompare className="mr-1.5 h-3.5 w-3.5" />
          Confronta
        </Button>
        <div className="flex items-center gap-0.5">
          <ViewPdfButton filePath={cv.cv.file_path} iconOnly />
          <DeleteCvButton cv={cv} isActive={false} iconOnly />
        </div>
      </div>
    </Card>
  );
}

const ANALYSIS_STEPS: {
  key: keyof Pick<
    AnalysisRow,
    "formal_evaluation_status" | "gap_analysis_status" | "learning_path_status"
  >;
  label: string;
}[] = [
  { key: "formal_evaluation_status", label: "Valutazione formale" },
  { key: "gap_analysis_status", label: "Gap Analysis" },
  { key: "learning_path_status", label: "Learning Path" },
];

// Per-step badges read straight from the persisted analysis statuses. The DB row
// is the only source of truth — there are no client-side timers or fake progress.
function AnalysisStepBadges({ analysis }: { analysis: AnalysisRow }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Passaggi dell&apos;analisi:</span>
      {ANALYSIS_STEPS.map(({ key, label }) => (
        <StepBadge key={key} label={label} status={analysis[key]} />
      ))}
    </div>
  );
}

function StepBadge({ label, status }: { label: string; status: AnalysisStatus }) {
  const config = {
    success: { Icon: Check, className: "bg-success/10 text-success" },
    failed: { Icon: X, className: "bg-destructive/10 text-destructive" },
    pending: { Icon: Clock, className: "bg-muted text-muted-foreground" },
  }[status];
  const { Icon, className } = config;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// The five user-facing steps shown while the (synchronous) request is in flight.
// This is an ESTIMATED visual progression — it never asserts that a backend step
// finished. The real per-step outcome comes from the returned row's statuses.
const PROGRESS_STEPS = [
  "Preparazione del contesto del CV",
  "Valutazione della struttura del CV",
  "Confronto con il ruolo target",
  "Generazione del Learning Path",
  "Salvataggio dei risultati",
] as const;

type AnalyzePhase = "idle" | "running" | "done" | "error";

function summarizeStatuses(a: AnalysisRow) {
  const statuses = [
    a.formal_evaluation_status,
    a.gap_analysis_status,
    a.learning_path_status,
  ];
  const ok = statuses.filter((s) => s === "success").length;
  const failed = statuses.filter((s) => s === "failed").length;
  return {
    ok,
    failed,
    allOk: failed === 0 && ok === statuses.length,
    allFailed: ok === 0,
  };
}

// Owns the "Analyze CV" action: a button plus a progress modal. The POST runs the
// whole pipeline synchronously; on return we update client state via applyAnalysis
// (no router.refresh()) and show the real, persisted result.
function AnalyzeCvButton({ cv }: { cv: CvBundle }) {
  const { current, applyAnalysis } = useProfile();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<AnalyzePhase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<AnalysisRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveRole = cv.cv.target_role ?? current.profile.target_role;
  const hasAnalysis = cv.analysis !== null;

  // Visual-only ticker while running. Advances through the estimated steps but
  // stops short of the final "Saving results" step until the response arrives.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 2));
    }, 1800);
    return () => clearInterval(id);
  }, [phase]);

  const start = async () => {
    if (!effectiveRole) {
      toast.error("Imposta un ruolo target per questo CV prima di analizzarlo.");
      return;
    }
    setResult(null);
    setErrorMsg(null);
    setActiveStep(0);
    setPhase("running");
    setOpen(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: current.profile.id,
          cv_id: cv.cv.id,
          target_role: effectiveRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");

      const analysis = data.analysis as AnalysisRow;
      setActiveStep(PROGRESS_STEPS.length - 1);
      applyAnalysis(analysis); // robust client-state update — no router.refresh()
      setResult(analysis);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not analyze the CV.");
      setPhase("error");
    }
  };

  // Block closing while the request is in flight; reset to idle once closed.
  const handleOpenChange = (next: boolean) => {
    if (!next && phase === "running") return;
    setOpen(next);
    if (!next) setPhase("idle");
  };

  return (
    <>
      <Button onClick={start}>
        <Sparkles className="mr-2 h-4 w-4" />
        {hasAnalysis ? "Rianalizza" : "Analizza CV"}
      </Button>
      <AnalysisProgressDialog
        open={open}
        onOpenChange={handleOpenChange}
        phase={phase}
        activeStep={activeStep}
        result={result}
        errorMsg={errorMsg}
        onRetry={start}
      />
    </>
  );
}

function AnalysisProgressDialog({
  open,
  onOpenChange,
  phase,
  activeStep,
  result,
  errorMsg,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: AnalyzePhase;
  activeStep: number;
  result: AnalysisRow | null;
  errorMsg: string | null;
  onRetry: () => void;
}) {
  const running = phase === "running";
  const summary = result ? summarizeStatuses(result) : null;

  // Estimated while running (capped at 90% so it never claims completion early);
  // pinned to 100% once the request resolves.
  const pct = running ? Math.round(((activeStep + 1) / PROGRESS_STEPS.length) * 90) : 100;

  const title = running
    ? "Analisi del CV in corso…"
    : phase === "error"
      ? "Analisi non riuscita"
      : summary?.allOk
        ? "Analisi completata"
        : summary?.allFailed
          ? "Analisi non riuscita"
          : "Analisi parzialmente completata";

  const description = running
    ? "Avanzamento stimato — non chiudere questa finestra. Di solito richiede 10–30 secondi."
    : phase === "error"
      ? "Non è stato possibile completare l'analisi. Nessun risultato è stato salvato per questa esecuzione."
      : "I risultati sono stati salvati. Gli esiti dei passaggi qui sotto provengono dal server.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!running}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {running && (
          <div className="space-y-4 py-2">
            <Progress value={pct} />
            <ul className="space-y-2.5">
              {PROGRESS_STEPS.map((label, i) => {
                const isActive = i === activeStep;
                const isPast = i < activeStep;
                return (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    {isActive ? (
                      <Spinner className="h-4 w-4 text-primary" />
                    ) : (
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isPast ? "bg-primary/60" : "bg-muted-foreground/30",
                        )}
                      />
                    )}
                    <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {phase === "done" && result && (
          <div className="space-y-3 py-1">
            <AnalysisStepBadges analysis={result} />
            {summary && !summary.allOk && (
              <p className="text-sm text-muted-foreground">
                {summary.allFailed
                  ? "Nessun passaggio completato — i risultati precedenti sono stati mantenuti."
                  : `${summary.ok} di 3 passaggi completati, ${summary.failed} non riusciti. I risultati parziali sono stati mantenuti.`}
              </p>
            )}
          </div>
        )}

        {phase === "error" && <p className="py-1 text-sm text-destructive">{errorMsg}</p>}

        <DialogFooter>
          {running ? (
            <Button variant="outline" disabled>
              <Spinner className="mr-2 h-4 w-4" />
              Elaborazione…
            </Button>
          ) : phase === "error" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Chiudi
              </Button>
              <Button onClick={onRetry}>Riprova</Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Vedi i risultati</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- CV analysis detail ----

function CVDetailView({ cv: cvProp, onBack }: { cv: CvBundle; onBack: () => void }) {
  const { current } = useProfile();
  // Resolve the live bundle from context by id, so a just-run analysis (merged in
  // via applyAnalysis) or a freshly promoted active status (via setActiveCv) shows
  // here even though the parent passed a snapshot. Derive isActive from the live
  // row too, so the "Attivo" badge and "Imposta come CV attivo" button stay in
  // sync after promotion without the parent re-passing a prop.
  const cv = current.cvs.find((c) => c.cv.id === cvProp.cv.id) ?? cvProp;
  const isActive = cv.cv.status === "active";
  const breakdown = cv.scoreBreakdown;
  const formal = cv.analysis?.formal_evaluation ?? null;
  const gap = cv.analysis?.gap_analysis ?? null;
  const learningPath = cv.analysis?.learning_path ?? null;
  const parsed = cv.cv.parsed_data;
  const roleLabel = targetRoleLabel(cv.cv.target_role);
  const analysed = dayLabel(cv.analysis?.updated_at ?? null);

  const radarData = breakdown
    ? (Object.keys(DIM_LABELS) as (keyof ScoreBreakdown)[]).map((key) => ({
        dimension: DIM_LABELS[key],
        value: breakdown[key],
      }))
    : [];

  const matchScore = gap?.dimension_scores.market_fit.score ?? null;
  const hasAnalysis = Boolean(formal || gap || learningPath);

  return (
    <div className="space-y-6 duration-300 animate-in fade-in slide-in-from-bottom-1">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0" aria-label="Indietro">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {cv.title}
              </h1>
              {isActive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Attivo
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ruolo target {roleLabel}
              {analysed ? ` · Analisi del ${analysed}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{cv.uploadedLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewPdfButton filePath={cv.cv.file_path} size="default" />
          {!isActive && <SetActiveCvButton cv={cv} />}
          <DeleteCvButton cv={cv} isActive={isActive} size="default" onDeleted={onBack} />
          <AnalyzeCvButton cv={cv} />
        </div>
      </div>

      {cv.analysis && <AnalysisStepBadges analysis={cv.analysis} />}

      {!hasAnalysis ? (
        <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Questo CV non è ancora stato analizzato
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Avvia l&apos;analisi per ottenere il punteggio, i punti di forza, i gap rispetto al
              ruolo target e il percorso di crescita.
            </p>
          </div>
          <AnalyzeCvButton cv={cv} />
        </Card>
      ) : (
        <>
          {/* Score overview */}
          <Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Overall score + dimension bars */}
            <Card className="flex flex-col p-6">
              <div className="text-sm font-medium text-muted-foreground">Punteggio complessivo</div>
              <div className="my-4 flex justify-center">
                <ScoreRing value={cv.score} size={132} />
              </div>
              {breakdown ? (
                <div className="space-y-2.5">
                  {(Object.keys(DIM_LABELS) as (keyof ScoreBreakdown)[]).map((key) => (
                    <DimensionBar key={key} label={DIM_LABELS[key]} value={breakdown[key]} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Dettaglio non disponibile.
                </p>
              )}
            </Card>

            {/* Radar */}
            <Card className="p-6">
              <div className="text-sm font-medium text-muted-foreground">Profilo per dimensione</div>
              <div className="mt-2 h-60">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    Analisi non ancora disponibile.
                  </div>
                )}
              </div>
            </Card>

            {/* Role match */}
            <Card className="p-6">
              <div className="text-sm font-medium text-muted-foreground">Match con il ruolo</div>
              <div className="mt-4 flex items-center gap-4">
                <ScoreRing value={matchScore} size={96} suffix="%" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{roleLabel}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quanto il CV è allineato al ruolo target.
                  </p>
                </div>
              </div>
              {gap && gap.gaps.length > 0 && (
                <div className="mt-5">
                  <div className="text-xs font-medium text-muted-foreground">Gap prioritari</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {gap.gaps.slice(0, 4).map((g, i) => (
                      <span
                        key={i}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium",
                          PRIORITY_STYLES[g.priority],
                        )}
                      >
                        {g.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
          </Reveal>

          {/* Match summary callout */}
          {gap?.match_summary && (
            <Reveal>
            <Card className="border-l-4 border-l-primary bg-primary/[0.03] p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Sintesi del match con {roleLabel}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {gap.match_summary}
                  </p>
                </div>
              </div>
            </Card>
            </Reveal>
          )}

          {/* Strengths + improvement suggestions */}
          <Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Strengths */}
            <Card className="p-6">
              <SectionHeader
                icon={BadgeCheck}
                tone="success"
                title="Punti di forza"
                count={formal?.strengths.length}
              />
              <ul className="mt-5 space-y-4">
                {(formal?.strengths ?? []).map((strength, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <Check className="h-3.5 w-3.5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{strength.title}</div>
                      {strength.detail && strength.detail !== strength.title && (
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {strength.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
                {(formal?.strengths.length ?? 0) === 0 && (
                  <li className="text-sm text-muted-foreground">Nessun punto di forza rilevato.</li>
                )}
              </ul>
            </Card>

            {/* Improvements */}
            <Card className="p-6">
              <SectionHeader
                icon={Lightbulb}
                tone="warning"
                title="Suggerimenti di miglioramento"
                count={formal?.improvement_suggestions.length}
              />
              <ul className="mt-5 space-y-3">
                {(formal?.improvement_suggestions ?? []).map((item, i) => (
                  <li key={i} className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Layers className="h-3 w-3" />
                      Sezione: {CV_SECTION_LABELS[item.target_section]}
                    </div>
                  </li>
                ))}
                {(formal?.improvement_suggestions.length ?? 0) === 0 && (
                  <li className="text-sm text-muted-foreground">Nessun suggerimento disponibile.</li>
                )}
              </ul>
            </Card>
          </div>
          </Reveal>

          {/* Skills match */}
          {gap && (
            <Reveal>
              <SkillsMatch gap={gap} roleLabel={roleLabel} />
            </Reveal>
          )}

          {/* Learning path */}
          {learningPath && learningPath.actions.length > 0 && (
            <Reveal>
              <LearningPathTimeline path={learningPath} roleLabel={roleLabel} />
            </Reveal>
          )}
        </>
      )}

      {/* Parsed CV data */}
      {parsed && (
        <Reveal>
          <ParsedCvSummary parsed={parsed} />
        </Reveal>
      )}
    </div>
  );
}

function SkillsMatch({ gap, roleLabel }: { gap: GapAnalysis; roleLabel: string }) {
  const possessed = gap.possessed_skills;
  const missing = gap.gaps.filter((g) =>
    ["technical_skill", "tool", "certification"].includes(g.category),
  );

  if (possessed.length === 0 && missing.length === 0) return null;

  const total = possessed.length + missing.length;
  const ratio = total > 0 ? Math.round((possessed.length / total) * 100) : 0;
  const coverageWidth = useBarFill(ratio);

  return (
    <Card className="p-6">
      <SectionHeader icon={Wrench} tone="primary" title={`Competenze per ${roleLabel}`} />

      {/* coverage bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{possessed.length}</span> di {total}{" "}
            competenze già presenti
          </span>
          <span className="font-medium tabular-nums text-foreground">{ratio}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-700 ease-out-quint"
            style={{ width: `${coverageWidth}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Possessed */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Check className="h-4 w-4 text-success" />
            Già presenti
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              {possessed.length}
            </span>
          </h3>
          <div className="mt-3 space-y-2">
            {possessed.map((s, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 rounded-lg border border-success/20 bg-success/5 p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{s.skill}</div>
                  {s.evidence && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {s.evidence}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                  {SKILL_STRENGTH_LABELS[s.strength]}
                </span>
              </div>
            ))}
            {possessed.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessuna competenza rilevante rilevata.</p>
            )}
          </div>
        </div>

        {/* Missing */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Plus className="h-4 w-4 text-primary" />
            Da sviluppare
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {missing.length}
            </span>
          </h3>
          <div className="mt-3 space-y-2">
            {missing.map((g, i) => (
              <div
                key={i}
                className="group flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{g.title}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {GAP_CATEGORY_LABELS[g.category]}
                  </p>
                </div>
                <PriorityBadge priority={g.priority} />
              </div>
            ))}
            {missing.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ottimo: nessuna competenza chiave mancante.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ResourceLink({ label, url }: { label: string; url: string | null }) {
  const cls =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary";
  if (!url) {
    return (
      <span className={cn(cls, "text-muted-foreground")}>
        <BookOpen className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }
  if (url.startsWith("/")) {
    return (
      <Link href={url} className={cls}>
        <ArrowRight className="h-3.5 w-3.5" />
        {label}
      </Link>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function LearningPathTimeline({ path, roleLabel }: { path: LearningPath; roleLabel: string }) {
  const actions = [...path.actions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return (
    <Card className="p-6">
      <SectionHeader
        icon={Rocket}
        tone="primary"
        title={`Il tuo percorso verso ${roleLabel}`}
        action={
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline">
            {actions.length} {actions.length === 1 ? "tappa" : "tappe"}
          </span>
        }
      />
      {path.intro && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{path.intro}</p>
      )}

      <ol className="mt-6">
        {actions.map((action, i) => {
          const Icon = actionIcon(action.type);
          const isNext = i === 0;
          const isLast = i === actions.length - 1;
          return (
            <li key={action.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* connector */}
              {!isLast && (
                <span className="absolute bottom-0 left-[18px] top-10 w-px bg-border" aria-hidden />
              )}
              {/* node */}
              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                  isNext ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {/* content */}
              <div className="flex-1 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tappa {i + 1} · {ACTION_TYPE_LABELS[action.type]}
                  </span>
                  {isNext && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Prossimo passo
                    </span>
                  )}
                  <span className="ml-auto">
                    <PriorityBadge priority={action.priority} />
                  </span>
                </div>
                <h4 className="mt-1.5 font-medium text-foreground">{action.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {action.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {action.estimated_effort && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {action.estimated_effort}
                    </span>
                  )}
                  {action.estimated_cost && (
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      {action.estimated_cost}
                    </span>
                  )}
                </div>

                {action.outcome && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-success/5 px-3 py-2 text-xs leading-relaxed text-foreground">
                    <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    <span>
                      <span className="font-medium">Risultato atteso:</span> {action.outcome}
                    </span>
                  </div>
                )}

                {action.resources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.resources.map((r, ri) => (
                      <ResourceLink key={ri} label={r.label} url={r.url} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ---- Parsed CV summary (structured, grouped panels) ----

function DataPanel({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/20 p-5", className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-inset ring-border">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  href,
}: {
  icon: LucideIcon;
  value: string | null;
  href?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="truncate text-muted-foreground transition-colors hover:text-primary"
        >
          {value}
        </a>
      ) : (
        <span className="truncate text-muted-foreground">{value}</span>
      )}
    </div>
  );
}

function ParsedCvSummary({ parsed }: { parsed: NonNullable<CvBundle["cv"]["parsed_data"]> }) {
  const { personal_info, work_experience, education, projects, extracurriculars, additional_info } =
    parsed;
  const { technical_skills, languages, certifications, interests } = additional_info;

  return (
    <Card className="p-6">
      <SectionHeader icon={FileText} tone="info" title="Dati estratti dal CV" />
      <p className="mt-2 text-sm text-muted-foreground">
        Ciò che abbiamo compreso dal tuo CV — per garantire trasparenza sull&apos;analisi.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Contact */}
        <DataPanel icon={User} title="Contatti">
          <div className="space-y-2.5">
            <div className="text-base font-medium text-foreground">{personal_info.full_name}</div>
            <ContactRow icon={Mail} value={personal_info.email} href={personal_info.email ? `mailto:${personal_info.email}` : null} />
            <ContactRow icon={Phone} value={personal_info.phone} />
            <ContactRow icon={MapPin} value={personal_info.location} />
            <ContactRow icon={Linkedin} value={personal_info.linkedin_url ? "LinkedIn" : null} href={personal_info.linkedin_url} />
            <ContactRow icon={Github} value={personal_info.github_url ? "GitHub" : null} href={personal_info.github_url} />
            <ContactRow icon={Globe} value={personal_info.portfolio_url ? "Portfolio" : null} href={personal_info.portfolio_url} />
          </div>
        </DataPanel>

        {/* Skills, languages, certifications */}
        <DataPanel icon={Wrench} title="Competenze e lingue">
          <div className="space-y-4">
            {technical_skills.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Competenze tecniche</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {technical_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {languages.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Languages className="h-3.5 w-3.5" />
                  Lingue
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {languages.map((lang, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                    >
                      {lang.name}
                      {lang.level && <span className="text-muted-foreground"> · {lang.level}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {certifications.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  Certificazioni
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {certifications.map((c, i) => (
                    <li key={i}>
                      <span className="text-foreground">{c.name}</span>
                      {c.issuer && ` · ${c.issuer}`}
                      {c.date && ` (${c.date})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {interests.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Interessi</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {interests.map((interest, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {technical_skills.length === 0 &&
              languages.length === 0 &&
              certifications.length === 0 && (
                <p className="text-sm text-muted-foreground">Nessuna competenza indicata.</p>
              )}
          </div>
        </DataPanel>

        {/* Experience */}
        <DataPanel icon={Briefcase} title="Esperienza" className="lg:col-span-2">
          {work_experience.length > 0 ? (
            <ol className="space-y-4">
              {work_experience.map((exp, i) => (
                <li key={i} className="relative border-l border-border pl-4">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/40 ring-2 ring-muted/20" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium text-foreground">{exp.role}</span>
                    <span className="text-xs text-muted-foreground">
                      {rangeLabel(exp.start_date, exp.end_date, exp.is_current)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exp.company}
                    {exp.type && ` · ${WORK_TYPE_LABELS[exp.type]}`}
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
                      {exp.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Nessuna esperienza indicata.</p>
          )}
        </DataPanel>

        {/* Education */}
        <DataPanel icon={GraduationCap} title="Formazione">
          {education.length > 0 ? (
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i}>
                  <div className="font-medium text-foreground">
                    {edu.degree}
                    {edu.field_of_study && (
                      <span className="font-normal text-muted-foreground"> · {edu.field_of_study}</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {edu.institution} · {eduYear(edu.start_date, edu.end_date, edu.expected)}
                  </div>
                  {(edu.gpa || edu.honors.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {edu.gpa && (
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                          Voto: {edu.gpa}
                        </span>
                      )}
                      {edu.honors.map((h, hi) => (
                        <span
                          key={hi}
                          className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun titolo di studio indicato.</p>
          )}
        </DataPanel>

        {/* Projects */}
        {projects.length > 0 && (
          <DataPanel icon={FolderGit2} title="Progetti">
            <div className="space-y-3">
              {projects.map((p, i) => (
                <div key={i} className="rounded-lg border border-border/70 bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{p.name}</span>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-primary"
                        aria-label="Apri progetto"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {p.context && <div className="text-xs text-muted-foreground">{p.context}</div>}
                  {p.technologies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.technologies.map((t, ti) => (
                        <span
                          key={ti}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.bullets.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
                      {p.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </DataPanel>
        )}

        {/* Extracurriculars */}
        {extracurriculars.length > 0 && (
          <DataPanel
            icon={Users}
            title="Attività extra"
            className={projects.length > 0 ? "lg:col-span-2" : undefined}
          >
            <div className="space-y-3">
              {extracurriculars.map((ex, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium text-foreground">{ex.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {rangeLabel(ex.start_date, ex.end_date, false)}
                    </span>
                  </div>
                  {ex.organization && (
                    <div className="text-sm text-muted-foreground">{ex.organization}</div>
                  )}
                  {ex.bullets.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-muted-foreground">
                      {ex.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </DataPanel>
        )}
      </div>
    </Card>
  );
}

// ---- CV comparison ----

function CVCompareView({
  activeCv,
  compareCv,
  onBack,
}: {
  activeCv: CvBundle;
  compareCv: CvBundle;
  onBack: () => void;
}) {
  const activeScore = activeCv.score ?? 0;
  const compareScore = compareCv.score ?? 0;
  const scoreDiff = activeScore - compareScore;

  const activeBreakdown = activeCv.scoreBreakdown;
  const compareBreakdown = compareCv.scoreBreakdown;

  const compareData =
    activeBreakdown && compareBreakdown
      ? (Object.keys(DIM_LABELS) as (keyof ScoreBreakdown)[]).map((key) => ({
          name: DIM_LABELS[key],
          active: activeBreakdown[key],
          compare: compareBreakdown[key],
        }))
      : [];

  const activeSkills = activeCv.cv.parsed_data?.additional_info.technical_skills ?? [];
  const compareSkills = compareCv.cv.parsed_data?.additional_info.technical_skills ?? [];
  const newSkills = activeSkills.filter((s) => !compareSkills.includes(s));

  const activeExperiences = activeCv.cv.parsed_data?.work_experience ?? [];
  const compareExperiences = compareCv.cv.parsed_data?.work_experience ?? [];
  const newExperiences = activeExperiences.filter(
    (e) => !compareExperiences.some((ce) => ce.company === e.company && ce.role === e.role),
  );

  return (
    <div className="space-y-6 duration-300 animate-in fade-in slide-in-from-bottom-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Indietro">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Confronta versioni
          </h1>
          <p className="mt-0.5 text-muted-foreground">
            {activeCv.title} (attivo) vs {compareCv.title}
          </p>
        </div>
      </div>

      {/* Score comparison */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col items-center p-6 text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {activeCv.title} (attivo)
          </div>
          <ScoreRing value={activeCv.score} size={104} className="mt-3" />
        </Card>
        <Card className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Differenza</div>
            <div
              className={cn(
                "mt-2 flex items-center justify-center gap-1 text-3xl font-semibold",
                scoreDiff > 0
                  ? "text-success"
                  : scoreDiff < 0
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            >
              {scoreDiff > 0 ? (
                <TrendingUp className="h-6 w-6" />
              ) : scoreDiff < 0 ? (
                <TrendingDown className="h-6 w-6" />
              ) : null}
              {scoreDiff > 0 ? "+" : ""}
              {scoreDiff} pt
            </div>
            <div className="mt-1 text-xs text-muted-foreground">rispetto alla versione precedente</div>
          </div>
        </Card>
        <Card className="flex flex-col items-center p-6 text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {compareCv.title}
          </div>
          <ScoreRing value={compareCv.score} size={104} className="mt-3" />
        </Card>
      </div>

      {/* Dimension comparison */}
      {compareData.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-foreground">Punteggio per dimensione</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Bar dataKey="active" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={12} name={activeCv.title} />
                <Bar dataKey="compare" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} barSize={12} name={compareCv.title} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-primary" />
              <span className="text-muted-foreground">{activeCv.title} (attivo)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-muted-foreground" />
              <span className="text-muted-foreground">{compareCv.title}</span>
            </div>
          </div>
        </Card>
      )}

      {/* What changed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* New skills */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">
            Competenze aggiunte nel CV attivo
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {newSkills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
              >
                + {skill}
              </span>
            ))}
            {newSkills.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessuna nuova competenza aggiunta</p>
            )}
          </div>
        </Card>

        {/* New experience */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Modifiche all&apos;esperienza</h2>
          <div className="mt-4 space-y-3">
            {newExperiences.map((exp, i) => (
              <div key={i} className="rounded-lg border border-success/20 bg-success/5 p-3">
                <div className="text-sm font-medium text-foreground">+ {exp.role}</div>
                <div className="text-xs text-muted-foreground">{exp.company}</div>
              </div>
            ))}
            {newExperiences.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessuna nuova esperienza aggiunta</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
