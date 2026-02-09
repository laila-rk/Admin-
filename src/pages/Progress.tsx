"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { TrendingUp, Target, Award, Scale, LineChart, Loader2, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY 
);

export default function ProgressPage() {
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data, error: dbError } = await supabase
          .from("progress_records")
          .select("*");

        if (dbError) throw dbError;
        setAllMembers(data || []);
      } catch (err: any) {
        console.error("Supabase Sync Error:", err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupabaseData();
  }, []);

  //  DYNAMIC CALCULATIONS 
  const stats = useMemo(() => {
    const goalsMet = allMembers.filter((m) => {
      const start = m.start_weight;
      const current = m.current_weight;
      const target = m.target_weight;

      if (target && start && current) {
        return start > target
          ? current <= target // Weight Loss Met
          : current >= target; // Muscle Gain Met
      }
      return (m.progress_percentage || 0) >= 100;
    }).length;

    return [
      { title: "Weight Goals Met", value: goalsMet, change: "+12%", icon: Scale },
      { title: "Challenges Completed", value: 1847, change: "+8%", icon: Award },
      { title: "Personal Records", value: 562, change: "+15%", icon: TrendingUp },
      { title: "Goals Active", value: allMembers.length, change: "+5%", icon: Target },
    ];
  }, [allMembers]);

  const calculateProgress = (member: any) => {
    const { start_weight, target_weight, current_weight, progress_percentage } = member;
    
    if (start_weight && target_weight && current_weight) {
      const totalDist = Math.abs(start_weight - target_weight);
      const actualDist = Math.abs(start_weight - current_weight);
      if (totalDist === 0) return 100;
      return Math.min(Math.round((actualDist / totalDist) * 100), 100);
    }
    return progress_percentage || 0;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Progress"
        description="Global member analytics synced from Supabase."
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Could not connect to Supabase: {error}. Check your .env.local file and RLS policies.
          </AlertDescription>
        </Alert>
      )}

      {/* Aggregate Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-card border-none bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                  <p className="text-sm font-medium text-success">{stat.change}</p>
                </div>
                <div className="gradient-accent rounded-xl p-3">
                  <stat.icon className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Member Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {allMembers.length === 0 ? (
                 <p className="text-center py-10 text-muted-foreground italic">No records found in progress_records table.</p>
              ) : (
                allMembers.map((member) => {
                  const progressValue = calculateProgress(member);
                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{member.user_name || "Member " + member.id}</p>
                        <span className="font-bold text-accent">{progressValue}%</span>
                      </div>
                      <Progress value={progressValue} className="h-2" />
                      <p className="text-xs text-muted-foreground italic">
                        {member.target_weight 
                          ? `${member.start_weight}kg → ${member.current_weight}kg (Target: ${member.target_weight}kg)`
                          : member.milestone_note || "Milestone goal"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Trends Visualizer */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-accent" />
              Progress Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
              <div className="text-center">
                <p className="text-muted-foreground italic">
                  Data stream active: {allMembers.length} records found.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">Charts will render on data change.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}