"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

type EditingSection = "education" | "industry" | "goals" | "constraints" | "preferences" | null;

export function ProfilePage() {
  const { currentProfile } = useProfile();
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [showRegenerateBanner, setShowRegenerateBanner] = useState(false);

  // Local state for form editing (mock - doesn't actually persist)
  const [formData, setFormData] = useState(currentProfile.surveyData);

  const handleSave = () => {
    setEditingSection(null);
    setShowRegenerateBanner(true);
  };

  const handleCancel = () => {
    setFormData(currentProfile.surveyData);
    setEditingSection(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Your career preferences and goals. This data powers our personalized recommendations.
        </p>
      </div>

      {/* Regenerate Banner */}
      {showRegenerateBanner && (
        <Card className="flex items-center justify-between border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium text-foreground">Profile updated</div>
              <div className="text-sm text-muted-foreground">
                Regenerate your analysis to see updated recommendations based on your changes.
              </div>
            </div>
          </div>
          <Button onClick={() => setShowRegenerateBanner(false)}>
            Regenerate Analysis
          </Button>
        </Card>
      )}

      {/* Profile Sections */}
      <Accordion type="multiple" defaultValue={["education", "industry", "goals", "constraints", "preferences"]} className="space-y-4">
        {/* Education */}
        <AccordionItem value="education" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Education</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex justify-end mb-4">
              {editingSection === "education" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingSection("education")}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">University</label>
                {editingSection === "education" ? (
                  <Input 
                    className="mt-1" 
                    value={formData.education.university}
                    onChange={(e) => setFormData({
                      ...formData,
                      education: { ...formData.education, university: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium text-foreground">{formData.education.university}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Course</label>
                {editingSection === "education" ? (
                  <Input 
                    className="mt-1" 
                    value={formData.education.course}
                    onChange={(e) => setFormData({
                      ...formData,
                      education: { ...formData.education, course: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium text-foreground">{formData.education.course}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Year</label>
                {editingSection === "education" ? (
                  <Input 
                    className="mt-1" 
                    value={formData.education.year}
                    onChange={(e) => setFormData({
                      ...formData,
                      education: { ...formData.education, year: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium text-foreground">{formData.education.year}</div>
                )}
              </div>
              {formData.education.gpa && (
                <div>
                  <label className="text-sm text-muted-foreground">GPA</label>
                  {editingSection === "education" ? (
                    <Input 
                      className="mt-1" 
                      value={formData.education.gpa || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        education: { ...formData.education, gpa: e.target.value }
                      })}
                    />
                  ) : (
                    <div className="mt-1 font-medium text-foreground">{formData.education.gpa}</div>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Industry Interests</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex justify-end mb-4">
              {editingSection === "industry" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingSection("industry")}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.industryInterests.map((industry, i) => (
                <span 
                  key={i} 
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium",
                    editingSection === "industry" 
                      ? "bg-primary text-primary-foreground cursor-pointer" 
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {industry}
                  {editingSection === "industry" && (
                    <button className="ml-2 hover:text-destructive">&times;</button>
                  )}
                </span>
              ))}
              {editingSection === "industry" && (
                <button className="rounded-full border-2 border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                  + Add
                </button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Career Goals */}
        <AccordionItem value="goals" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Career Goals</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex justify-end mb-4">
              {editingSection === "goals" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingSection("goals")}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">1-Year Goal</label>
                {editingSection === "goals" ? (
                  <textarea 
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={formData.careerGoals.oneYear}
                    onChange={(e) => setFormData({
                      ...formData,
                      careerGoals: { ...formData.careerGoals, oneYear: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 text-foreground">{formData.careerGoals.oneYear}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">3-Year Goal</label>
                {editingSection === "goals" ? (
                  <textarea 
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={formData.careerGoals.threeYear}
                    onChange={(e) => setFormData({
                      ...formData,
                      careerGoals: { ...formData.careerGoals, threeYear: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 text-foreground">{formData.careerGoals.threeYear}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">What I {"Don't"} Want</label>
                {editingSection === "goals" ? (
                  <textarea 
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={formData.careerGoals.avoid}
                    onChange={(e) => setFormData({
                      ...formData,
                      careerGoals: { ...formData.careerGoals, avoid: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 text-foreground">{formData.careerGoals.avoid}</div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Constraints */}
        <AccordionItem value="constraints" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Constraints</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex justify-end mb-4">
              {editingSection === "constraints" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingSection("constraints")}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm text-muted-foreground">Geographic Availability</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.constraints.geographic.map((loc, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Weekly Study Hours</label>
                {editingSection === "constraints" ? (
                  <Input 
                    type="number"
                    className="mt-1" 
                    value={formData.constraints.weeklyHours}
                    onChange={(e) => setFormData({
                      ...formData,
                      constraints: { ...formData.constraints, weeklyHours: parseInt(e.target.value) || 0 }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium text-foreground">{formData.constraints.weeklyHours} hours</div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Training Budget</label>
                {editingSection === "constraints" ? (
                  <Input 
                    className="mt-1" 
                    value={formData.constraints.budget}
                    onChange={(e) => setFormData({
                      ...formData,
                      constraints: { ...formData.constraints, budget: e.target.value }
                    })}
                  />
                ) : (
                  <div className="mt-1 font-medium text-foreground">{formData.constraints.budget}</div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Preferences */}
        <AccordionItem value="preferences" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Work Preferences</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex justify-end mb-4">
              {editingSection === "preferences" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingSection("preferences")}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm text-muted-foreground">Company Size</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.preferences.companySize.map((size, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Work Languages</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.preferences.workLanguage.map((lang, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Work Style</label>
                <div className="mt-1 font-medium text-foreground">{formData.preferences.workStyle}</div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
