import { useState, useEffect, useMemo } from "react";
import { Dumbbell, Flame, Timer, Trophy, Filter, Loader2, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export default function Fitness() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();
  const stats = useMemo(() => {
    const total = exercises.length;
    const uniqueMovements = new Set(exercises.map((ex) => ex.name)).size;

    const avgSets = total > 0
      ? exercises.reduce((acc, curr) => acc + (Number(curr.sets) || 0), 0) / total
      : 0;

    const totalVol = exercises.reduce((acc, curr) =>
      acc + (Number(curr.sets) || 0) * (Number(curr.reps) || 0), 0);

    return {
      totalCount: total,
      uniqueMovements: uniqueMovements,
      avgSets: Math.round(avgSets * 10) / 10,
      totalRepVolume: totalVol.toLocaleString(),
    };
  }, [exercises]);

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      const { data:ExerciseData, error } = await supabase
        .from("exercises")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase Connection Error:", error.message);
        throw error;
      }
      
      const usersExercises = await Promise.all(
        ExerciseData.map(async (data) =>
          {
          const {data: user, error: erroruser} = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", data.user_id).single()
          return {...data, full_name : user?.full_name.split(' ')[0] || null}
          }
      ))

      if (usersExercises) {
        setExercises(usersExercises);

        
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fetch Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFitnessData();
  }, []);

  const filteredExercises = useMemo(() => {
    return activeFilter === "All"
      ? exercises
      : exercises.filter((ex) => ex.category === activeFilter);
  }, [exercises, activeFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;

    const { error } = await supabase.from("exercises").delete().eq("id", id);

    if (!error) {
      
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
      toast({ title: "Deleted" });
    } else {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    }
  };

  const categories = ["Strength", "Cardio", "HIIT", "Yoga", "Pilates"].map((cat) => ({
    name: cat,
    count: exercises.filter((ex) => ex.category === cat).length,
  }));

  if (loading) return (
    <>
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    </>
  );

  return (
    <>
      <PageHeader
        title="Fitness Overview"
        description="Monitor system-wide exercise statistics."
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Filter className="w-4 h-4 mr-2" />
              {activeFilter === "All" ? "Filter View" : activeFilter}
              <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setActiveFilter("All")}>All Categories</DropdownMenuItem>
            {["Strength", "Cardio", "HIIT", "Yoga", "Pilates"].map((cat) => (
              <DropdownMenuItem key={cat} onClick={() => setActiveFilter(cat)}>
                {cat}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Exercises" value={stats.totalCount} icon={Dumbbell} color="gradient-accent" />
        <StatCard title="Unique Moves" value={stats.uniqueMovements} icon={Trophy} color="bg-success/10" iconColor="text-success" />
        <StatCard title="Avg. Sets" value={stats.avgSets} icon={Timer} color="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Rep Volume" value={stats.totalRepVolume} icon={Flame} color="bg-warning/10" iconColor="text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader><CardTitle className="font-display text-xl text-foreground">Categories</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => (
              <div key={category.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-muted-foreground">{category.count} items</span>
                </div>
                <Progress value={(category.count / (exercises.length || 1)) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-2 justify-between items-center">
              <CardTitle className="font-display text-xl text-foreground">
                {activeFilter} Exercises
              </CardTitle>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Showing {filteredExercises.length} results
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredExercises.length > 0 ? (
              filteredExercises.map((ex) => (
                <div key={ex.id} className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group">
                  <div className="flex flex-col md:flex-row items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex flex-col items-center md:block">
                      <p className="font-bold text-foreground truncate">{ex.name}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">
                        {ex.category || 'General'} • {ex.sets} Sets
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-primary font-semibold">{ex.full_name}</p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                    <div className="flex justify-between gap-4 items-center md:block text-right">
                      <p className="font-bold text-accent">{ex.reps} reps</p>
                      <p className="text-xs text-muted-foreground">Total: {ex.sets * ex.reps}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ex.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No data found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ title, value, icon: Icon, color, iconColor }: any) {
  return (
    <Card className="shadow-card border-none">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-black text-foreground">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className={`w-6 h-6 ${iconColor || "text-accent-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}