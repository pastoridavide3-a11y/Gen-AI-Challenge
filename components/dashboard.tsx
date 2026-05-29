"use client";

import { useProfile } from "@/lib/profile-context";
import { targetRoleLabel, PRIORITY_LABELS } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score-ring";
import { Reveal } from "@/components/reveal";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BookOpen,
  Target,
  MessageCircle,
  FileText,
  Award,
  Users,
  Zap,
  ArrowRight,
  Check,
  Flag,
  Clock,
  BadgeCheck,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import type { LearningPath, ActionType, Priority } from "@/lib/types";
import type { ActivityType } from "@/lib/db/rows";
import { cn } from "@/lib/utils";

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "border-warning/30 bg-warning/10 text-warning-foreground",
  medium: "border-info/30 bg-info/10 text-info",
  low: "border-border bg-muted text-muted-foreground",
};

function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        PRIORITY_STYLES[priority],
      )}
    >
      <Flag className="h-2.5 w-2.5" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function Dashboard() {
  const { current } = useProfile();
  const { profile, careerScore, scoreBreakdown, scoreHistory, latestAnalysis, recentActivity } =
    current;

  const radarData = scoreBreakdown
    ? [
        { dimension: "Completezza", value: scoreBreakdown.completeness, fullMark: 100 },
        { dimension: "Azione e impatto", value: scoreBreakdown.action_impact, fullMark: 100 },
        { dimension: "Aderenza al mercato", value: scoreBreakdown.market_fit, fullMark: 100 },
        { dimension: "Chiarezza", value: scoreBreakdown.clarity, fullMark: 100 },
        { dimension: "Rilevanza", value: scoreBreakdown.relevance, fullMark: 100 },
      ]
    : [];

  const scoreChange =
    scoreHistory.length > 1
      ? scoreHistory[scoreHistory.length - 1].score - scoreHistory[scoreHistory.length - 2].score
      : 0;

  const strengths = latestAnalysis?.formal_evaluation?.strengths ?? [];
  const gaps = latestAnalysis?.gap_analysis?.gaps ?? [];
  const nextActions = topActions(latestAnalysis?.learning_path ?? null);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "cv_upload":
        return FileText;
      case "mentor_chat":
        return MessageCircle;
      case "analysis":
        return TrendingUp;
      default:
        return Zap;
    }
  };

  const getActionIcon = (type: ActionType) => {
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
        return MessageCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ciao, {profile.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ecco un riepilogo del tuo percorso di carriera
        </p>
      </Reveal>

      {/* Top Row - Score + Radar Chart + Score Evolution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Career Score Snapshot */}
        <Reveal className="h-full">
        <Card className="relative h-full overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-success/70" />
          <div className="text-sm font-medium text-muted-foreground">Punteggio Carriera</div>
          <div className="mt-4 flex items-center gap-5">
            <ScoreRing value={careerScore} size={112} />
            <div className="min-w-0 flex-1">
              {scoreChange !== 0 ? (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    scoreChange > 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {scoreChange > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {scoreChange > 0 ? "+" : ""}
                    {scoreChange} punti
                  </span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Andamento stabile</div>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground/70" />
                <span className="font-medium text-foreground">
                  {targetRoleLabel(profile.target_role)}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2 text-sm">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{profile.year}</div>
                  <div className="truncate text-xs text-muted-foreground">{profile.university}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        </Reveal>

        {/* Radar Chart - Score Breakdown */}
        <Reveal className="h-full" delay={70}>
        <Card className="h-full p-6">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Dettaglio punteggio</div>
          <div className="h-64">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
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
        </Reveal>

        {/* Score Evolution */}
        <Reveal className="h-full" delay={140}>
        <Card className="h-full p-6">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Evoluzione del punteggio</div>
          {scoreHistory.length > 1 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--primary)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="text-muted-foreground">
                Carica altre versioni del CV per vedere l&apos;evoluzione del punteggio nel tempo.
              </div>
              <Button asChild className="mt-4" variant="outline" size="sm">
                <Link href="/cvs">Carica CV</Link>
              </Button>
            </div>
          )}
        </Card>
        </Reveal>
      </div>

      {/* Third Row - Next Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next Actions */}
        <Reveal className="lg:col-span-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Cosa fare ora</h2>
            <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
              <Link href="/cvs">
                Vedi il percorso
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nextActions.map((action) => {
              const Icon = getActionIcon(action.type);
              const link =
                action.resources.find((r) => r.url?.startsWith("/"))?.url ?? "/mentor";
              return (
                <Card
                  key={action.id}
                  className="group flex flex-col gap-0 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <PriorityPill priority={action.priority} />
                  </div>
                  <h3 className="mt-3 font-medium text-foreground">{action.title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                  {action.estimated_effort && (
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {action.estimated_effort}
                    </div>
                  )}
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-2 w-fit text-primary hover:text-primary"
                  >
                    <Link href={link}>
                      Scopri di più
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </Card>
              );
            })}
            {nextActions.length === 0 && (
              <Card className="p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                Esegui l&apos;analisi di un CV per ricevere i prossimi passi consigliati.
              </Card>
            )}
          </div>
        </div>
        </Reveal>

        {/* Recent Activity */}
        <Reveal className="h-full" delay={70}>
        <Card className="h-full p-6">
          <h2 className="mb-4 font-semibold text-foreground">Attività recente</h2>
          <div className="space-y-4">
            {recentActivity.slice(0, 4).map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">{activity.date}</div>
                  </div>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessuna attività recente.</p>
            )}
          </div>
        </Card>
        </Reveal>
      </div>
    </div>
  );
}

// High-priority actions first, capped at 3, for the dashboard's "What to Do Next".
function topActions(learningPath: LearningPath | null) {
  if (!learningPath) return [];
  return [...learningPath.actions]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 3);
}
