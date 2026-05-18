"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { CV } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
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
  GitCompare,
  Calendar,
  Target,
  ChevronRight,
  Archive,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "detail" | "compare";

export function CVsPage() {
  const { currentProfile } = useProfile();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCv, setSelectedCv] = useState<CV | null>(null);
  const [compareCv, setCompareCv] = useState<CV | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const activeCv = currentProfile.cvs.find((cv) => cv.status === "active");
  const archivedCvs = currentProfile.cvs.filter((cv) => cv.status === "archived");

  const handleViewDetail = (cv: CV) => {
    setSelectedCv(cv);
    setViewMode("detail");
  };

  const handleCompare = (cv: CV) => {
    if (activeCv && cv.id !== activeCv.id) {
      setSelectedCv(activeCv);
      setCompareCv(cv);
      setViewMode("compare");
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCv(null);
    setCompareCv(null);
  };

  if (viewMode === "detail" && selectedCv) {
    return (
      <CVDetailView cv={selectedCv} onBack={handleBackToList} isActive={selectedCv.status === "active"} />
    );
  }

  if (viewMode === "compare" && selectedCv && compareCv) {
    return (
      <CVCompareView activeCv={selectedCv} compareCv={compareCv} onBack={handleBackToList} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My CVs</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and analyze your CV versions
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload New CV
        </Button>
      </div>

      {/* Active CV */}
      {activeCv && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Active CV</h2>
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-muted/50"
            onClick={() => handleViewDetail(activeCv)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Version {activeCv.version}</span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      Active
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {activeCv.uploadDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {activeCv.targetRole}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-semibold text-foreground">{activeCv.score}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Archived CVs */}
      {archivedCvs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Previous Versions</h2>
          <div className="space-y-3">
            {archivedCvs.map((cv) => (
              <Card key={cv.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Archive className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Version {cv.version}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Archived
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {cv.uploadDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {cv.targetRole}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-semibold text-muted-foreground">{cv.score}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompare(cv);
                        }}
                      >
                        <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                        Compare
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(cv)}
                      >
                        View
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New CV</DialogTitle>
            <DialogDescription>
              Upload your CV to get AI-powered analysis and improvement suggestions.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drop your CV here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports PDF, DOCX (Max 5MB)
              </p>
              <Button className="mt-4" variant="outline">
                Select File
              </Button>
            </div>
            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Note:</strong> This is a prototype. File uploads are not functional, but the UI demonstrates the intended experience.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CVDetailView({ cv, onBack, isActive }: { cv: CV; onBack: () => void; isActive: boolean }) {
  const radarData = [
    { dimension: "Completeness", value: cv.evaluation.scoreBreakdown.completeness },
    { dimension: "Action & Impact", value: cv.evaluation.scoreBreakdown.actionImpact },
    { dimension: "Market Fit", value: cv.evaluation.scoreBreakdown.marketFit },
    { dimension: "Clarity", value: cv.evaluation.scoreBreakdown.clarity },
    { dimension: "Relevance", value: cv.evaluation.scoreBreakdown.relevance },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">CV Version {cv.version}</h1>
              {isActive && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  Active
                </span>
              )}
            </div>
            <p className="mt-0.5 text-muted-foreground">
              Uploaded {cv.uploadDate} - Target: {cv.targetRole}
            </p>
          </div>
        </div>
        {!isActive && (
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            Set as Active CV
          </Button>
        )}
      </div>

      {/* Score Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall Score */}
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Overall Score</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-5xl font-semibold text-foreground">{cv.score}</span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(cv.evaluation.scoreBreakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Score Radar */}
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Score Breakdown</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
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
          </div>
        </Card>

        {/* Role Match */}
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Role Match</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-semibold text-foreground">{cv.roleMatch.matchScore}%</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Match with {cv.targetRole}</p>
          <div className="mt-4">
            <div className="text-xs font-medium text-muted-foreground">Priority Gaps</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {cv.roleMatch.prioritizedGaps.map((gap, i) => (
                <span key={i} className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  {gap}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Evaluation Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Strengths */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Strengths Identified</h2>
          <ul className="mt-4 space-y-3">
            {cv.evaluation.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-3 w-3 text-success" />
                </div>
                <span className="text-sm text-foreground">{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Improvements */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Suggested Improvements</h2>
          <ul className="mt-4 space-y-4">
            {cv.evaluation.improvements.map((item, i) => (
              <li key={i}>
                <div className="text-sm font-medium text-foreground">{item.area}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.suggestion}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Skills Match */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Skills Match for {cv.targetRole}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cv.roleMatch.skillsRequired.map((skill, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3",
                skill.has ? "border-success/30 bg-success/5" : "border-border bg-muted/30"
              )}
            >
              {skill.has ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <div className="text-sm font-medium text-foreground">{skill.skill}</div>
                <div className="text-xs text-muted-foreground capitalize">{skill.level}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Parsed Data */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Parsed CV Data</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {"What we understood from your CV. This ensures transparency in our analysis."}
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
            <div className="mt-2 space-y-1 text-sm">
              <div className="font-medium text-foreground">{cv.parsedData.name}</div>
              <div className="text-muted-foreground">{cv.parsedData.email}</div>
              <div className="text-muted-foreground">{cv.parsedData.phone}</div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {cv.parsedData.skills.map((skill, i) => (
                <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Experience</h3>
            <div className="mt-2 space-y-3">
              {cv.parsedData.experiences.length > 0 ? (
                cv.parsedData.experiences.map((exp, i) => (
                  <div key={i}>
                    <div className="font-medium text-foreground">{exp.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {exp.company} - {exp.duration}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{exp.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No experience listed</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Education</h3>
            <div className="mt-2 space-y-3">
              {cv.parsedData.education.map((edu, i) => (
                <div key={i}>
                  <div className="font-medium text-foreground">{edu.degree}</div>
                  <div className="text-sm text-muted-foreground">
                    {edu.institution} - {edu.year}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CVCompareView({
  activeCv,
  compareCv,
  onBack,
}: {
  activeCv: CV;
  compareCv: CV;
  onBack: () => void;
}) {
  const scoreDiff = activeCv.score - compareCv.score;

  const compareData = [
    { name: "Completeness", active: activeCv.evaluation.scoreBreakdown.completeness, compare: compareCv.evaluation.scoreBreakdown.completeness },
    { name: "Action & Impact", active: activeCv.evaluation.scoreBreakdown.actionImpact, compare: compareCv.evaluation.scoreBreakdown.actionImpact },
    { name: "Market Fit", active: activeCv.evaluation.scoreBreakdown.marketFit, compare: compareCv.evaluation.scoreBreakdown.marketFit },
    { name: "Clarity", active: activeCv.evaluation.scoreBreakdown.clarity, compare: compareCv.evaluation.scoreBreakdown.clarity },
    { name: "Relevance", active: activeCv.evaluation.scoreBreakdown.relevance, compare: compareCv.evaluation.scoreBreakdown.relevance },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compare CV Versions</h1>
          <p className="mt-0.5 text-muted-foreground">
            Version {activeCv.version} (Active) vs Version {compareCv.version}
          </p>
        </div>
      </div>

      {/* Score Comparison */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 text-center">
          <div className="text-sm font-medium text-muted-foreground">Version {activeCv.version} (Active)</div>
          <div className="mt-2 text-4xl font-semibold text-primary">{activeCv.score}</div>
        </Card>
        <Card className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Difference</div>
            <div className={cn(
              "mt-2 text-3xl font-semibold",
              scoreDiff > 0 ? "text-success" : scoreDiff < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {scoreDiff > 0 ? "+" : ""}{scoreDiff} pts
            </div>
          </div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-sm font-medium text-muted-foreground">Version {compareCv.version}</div>
          <div className="mt-2 text-4xl font-semibold text-muted-foreground">{compareCv.score}</div>
        </Card>
      </div>

      {/* Dimension Comparison */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Score by Dimension</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Bar dataKey="active" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={12} name={`v${activeCv.version}`} />
              <Bar dataKey="compare" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} barSize={12} name={`v${compareCv.version}`} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary" />
            <span className="text-muted-foreground">Version {activeCv.version} (Active)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-muted-foreground" />
            <span className="text-muted-foreground">Version {compareCv.version}</span>
          </div>
        </div>
      </Card>

      {/* What Changed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Skills */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Skills Added in v{activeCv.version}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeCv.parsedData.skills
              .filter((s) => !compareCv.parsedData.skills.includes(s))
              .map((skill, i) => (
                <span key={i} className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  + {skill}
                </span>
              ))}
            {activeCv.parsedData.skills.filter((s) => !compareCv.parsedData.skills.includes(s)).length === 0 && (
              <p className="text-sm text-muted-foreground">No new skills added</p>
            )}
          </div>
        </Card>

        {/* New Experience */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Experience Changes</h2>
          <div className="mt-4 space-y-3">
            {activeCv.parsedData.experiences
              .filter((e) => !compareCv.parsedData.experiences.some((ce) => ce.company === e.company && ce.title === e.title))
              .map((exp, i) => (
                <div key={i} className="rounded-lg bg-success/5 border border-success/20 p-3">
                  <div className="text-sm font-medium text-foreground">+ {exp.title}</div>
                  <div className="text-xs text-muted-foreground">{exp.company}</div>
                </div>
              ))}
            {activeCv.parsedData.experiences.filter((e) => !compareCv.parsedData.experiences.some((ce) => ce.company === e.company && ce.title === e.title)).length === 0 && (
              <p className="text-sm text-muted-foreground">No new experience added</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
