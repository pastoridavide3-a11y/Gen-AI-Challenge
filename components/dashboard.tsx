"use client";

import { useProfile } from "@/lib/profile-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { TrendingUp, TrendingDown, BookOpen, Target, MessageCircle, FileText, User, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export function Dashboard() {
  const { currentProfile } = useProfile();

  const radarData = [
    { dimension: "Completeness", value: currentProfile.scoreBreakdown.completeness, fullMark: 100 },
    { dimension: "Action & Impact", value: currentProfile.scoreBreakdown.actionImpact, fullMark: 100 },
    { dimension: "Market Fit", value: currentProfile.scoreBreakdown.marketFit, fullMark: 100 },
    { dimension: "Clarity", value: currentProfile.scoreBreakdown.clarity, fullMark: 100 },
    { dimension: "Relevance", value: currentProfile.scoreBreakdown.relevance, fullMark: 100 },
  ];

  const scoreChange = currentProfile.scoreHistory.length > 1
    ? currentProfile.careerScore - currentProfile.scoreHistory[currentProfile.scoreHistory.length - 2].score
    : 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "cv_upload": return FileText;
      case "mentor_chat": return MessageCircle;
      case "profile_update": return User;
      case "score_change": return TrendingUp;
      default: return Zap;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "learning": return BookOpen;
      case "skill": return Target;
      case "mentor": return MessageCircle;
      default: return Zap;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {currentProfile.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {"Here's"} your career progress at a glance
        </p>
      </div>

      {/* Top Row - Score + Radar Chart + Score Evolution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Career Score Snapshot */}
        <Card className="p-6">
          <div className="mb-4 text-sm font-medium text-muted-foreground">Career Score</div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold text-foreground">{currentProfile.careerScore}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          {scoreChange !== 0 && (
            <div className={`mt-2 flex items-center gap-1 text-sm ${scoreChange > 0 ? "text-success" : "text-destructive"}`}>
              {scoreChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{scoreChange > 0 ? "+" : ""}{scoreChange} points this month</span>
            </div>
          )}
          <div className="mt-4">
            <div className="text-xs text-muted-foreground">Target Role</div>
            <div className="mt-1 font-medium text-foreground">{currentProfile.targetRole}</div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-muted-foreground">Education</div>
            <div className="mt-1 font-medium text-foreground">{currentProfile.year}</div>
            <div className="text-sm text-muted-foreground">{currentProfile.university}</div>
          </div>
        </Card>

        {/* Radar Chart - Score Breakdown */}
        <Card className="p-6">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Score Breakdown</div>
          <div className="h-64">
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
          </div>
        </Card>

        {/* Score Evolution */}
        <Card className="p-6">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Score Evolution</div>
          {currentProfile.scoreHistory.length > 1 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentProfile.scoreHistory}>
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
                      fontSize: "12px"
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
                Upload more CV versions to see your score evolution over time.
              </div>
              <Button asChild className="mt-4" variant="outline" size="sm">
                <Link href="/cvs">Upload CV</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Second Row - Strengths + Gaps */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <h2 className="font-semibold text-foreground">Top Strengths</h2>
          </div>
          <ul className="space-y-3">
            {currentProfile.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                <span className="text-sm text-foreground">{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Gaps */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <Target className="h-4 w-4 text-warning" />
            </div>
            <h2 className="font-semibold text-foreground">Areas to Improve</h2>
          </div>
          <ul className="space-y-3">
            {currentProfile.gaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                <span className="text-sm text-foreground">{gap}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Third Row - Next Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-foreground">What to Do Next</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentProfile.nextActions.map((action) => {
              const Icon = getActionIcon(action.type);
              return (
                <Card key={action.id} className="flex flex-col p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground">{action.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{action.description}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-3 w-fit -ml-2 text-primary hover:text-primary">
                    <Link href={action.link}>
                      {action.cta}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-foreground">Recent Activity</h2>
          <div className="space-y-4">
            {currentProfile.recentActivity.slice(0, 4).map((activity) => {
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
          </div>
        </Card>
      </div>
    </div>
  );
}
