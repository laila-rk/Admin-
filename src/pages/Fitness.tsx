import { useState, useEffect } from "react";
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

export default function Fitness() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All"); // Track the filter state
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalCount: 0,
    activePrograms: 24, 
    avgDuration: 0,
    totalCalories: "0",
  });

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setWorkouts(data);
        const total = data.length;
        const avgDur = total > 0 
          ? data.reduce((acc, curr) => acc + (Number(curr.duration_min) || 0), 0) / total 
          : 0;
        const totalCalsRaw = data.reduce((acc, curr) => 
          acc + ((Number(curr.calories) || 0) * (Number(curr.completions_count) || 0)), 0);

        setStats({
          totalCount: total,
          activePrograms: 24,
          avgDuration: Math.round(avgDur),
          totalCalories: totalCalsRaw >= 1000000 
            ? `${(totalCalsRaw / 1000000).toFixed(1)}M` 
            : totalCalsRaw.toLocaleString(),
        });
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

  // Filter 
  const filteredWorkouts = activeFilter === "All" 
    ? workouts 
    : workouts.filter(w => w.category === activeFilter);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (!error) {
      setWorkouts(prev => prev.filter(w => w.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const categories = ["Strength", "Cardio", "HIIT", "Yoga", "Pilates"].map(cat => ({
    name: cat,
    count: workouts.filter(w => w.category === cat).length
  }));

  if (loading) return <DashboardLayout><div className="flex h-[70vh] items-center justify-center"><Loader2 className="animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader 
        title="Fitness Overview" 
        description="Monitor system-wide workout statistics."
      >
        {/* FILTER BUTTON --- */}
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
            <DropdownMenuItem onClick={() => setActiveFilter("Strength")}>Strength</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter("Cardio")}>Cardio</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter("HIIT")}>HIIT</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter("Yoga")}>Yoga</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter("Pilates")}>Pilates</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Workouts" value={stats.totalCount} icon={Dumbbell} color="gradient-accent" />
        <StatCard title="Active Programs" value={stats.activePrograms} icon={Trophy} color="bg-success/10" iconColor="text-success" />
        <StatCard title="Avg. Duration" value={`${stats.avgDuration}min`} icon={Timer} color="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Global Burn" value={stats.totalCalories} icon={Flame} color="bg-warning/10" iconColor="text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader><CardTitle className="font-display text-xl text-primary">Categories</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => (
              <div key={category.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-muted-foreground">{category.count} items</span>
                </div>
                <Progress value={(category.count / (workouts.length || 1)) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-display text-xl text-primary">
                {activeFilter} Workouts
              </CardTitle>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Showing {filteredWorkouts.length} results
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout) => (
                <div key={workout.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{workout.name}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">{workout.category} • {workout.duration_min} min</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-accent">{workout.calories} kcal</p>
                      <p className="text-xs text-muted-foreground">{workout.completions_count.toLocaleString()} uses</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(workout.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">No {activeFilter} workouts found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
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