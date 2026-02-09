import { useState, useEffect } from "react";
import { Apple, Utensils, Droplets, Flame, Filter, Loader2, Search, Check } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MealPlan {
  id: string;
  name: string;
  meals: number;
  calories: number;
  protein: number;
  members: number;
}

export default function NutritionAdmin() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<MealPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [globalAvgCals, setGlobalAvgCals] = useState<number>(0);
  const [globalWaterAvg, setGlobalWaterAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  useEffect(() => {
    let result = [...mealPlans];
    if (searchQuery) {
      result = result.filter(plan => 
        plan.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortBy === "calories-high") result.sort((a, b) => b.calories - a.calories);
    else if (sortBy === "protein-high") result.sort((a, b) => b.protein - a.protein);
    else if (sortBy === "members") result.sort((a, b) => b.members - a.members);
    
    setFilteredPlans(result);
  }, [searchQuery, mealPlans, sortBy]);

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);

      //  Fetch Meal Plans
      const { data: plans, error: plansError } = await (supabase as any)
        .from('meal_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      //  Global Calorie Average
      const { data: allLogs } = await (supabase as any)
        .from('nutrition_logs')
        .select('calories');
      
      const totalCals = allLogs?.reduce((sum: number, log: any) => sum + (log.calories || 0), 0) || 0;
      const avg = allLogs?.length ? Math.round(totalCals / allLogs.length) : 0;

      //  Global Water Stats 
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: allWater, error: waterError } = await (supabase as any)
        .from('water_intake')
        .select('amount_ml') 
        .gte('created_at', startOfToday.toISOString()); // Usually water logs use created_at

      if (waterError) console.error("Water fetch error:", waterError);

      const totalWater = allWater?.reduce((sum: number, log: any) => sum + (log.amount_ml || 0), 0) || 0;
      const dailyGoal = 3000; 
      const avgWaterPct = allWater?.length 
        ? Math.min(Math.round(((totalWater / allWater.length) / dailyGoal) * 100), 100) 
        : 0;

      //  Global Recipe Count - Safe check
      const { count, error: recipeError } = await (supabase as any)
        .from('recipes')
        .select('*', { count: 'exact', head: true });

      setMealPlans((plans as MealPlan[]) || []);
      setRecipeCount(count || 0);
      setGlobalAvgCals(avg);
      setGlobalWaterAvg(avgWaterPct);

    } catch (error: any) {
      console.error("Admin Fetch error:", error);
      toast({ title: "Admin Error", description: "Check console for table/column errors.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const nutritionStats = [
    { label: "Active Meal Plans", value: mealPlans.length.toString(), icon: Utensils, color: "gradient-accent" },
    { label: "Total Recipes", value: recipeCount.toLocaleString(), icon: Apple, color: "bg-success/10" },
    { label: "Global Avg. Calories", value: globalAvgCals.toLocaleString(), icon: Flame, color: "bg-warning/10" },
    { label: "System Water Avg.", value: `${globalWaterAvg}%`, icon: Droplets, color: "bg-accent/10" },
  ];

  return (
    <DashboardLayout>
      <PageHeader 
        title="Nutrition Admin" 
        description="Global system monitoring for nutrition and hydration data."
      >
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              className="pl-8 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Sort By
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("members")}>Popularity</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("calories-high")}>Calories</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {nutritionStats.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Global Meal Plans</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="p-6 rounded-xl border hover:border-accent transition-all">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">Plan ID: {plan.id.slice(0,8)}</p>
                    </div>
                    <div className="p-2 rounded-lg gradient-accent"><Utensils className="w-5 h-5 text-accent-foreground" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="font-bold">{plan.calories}</p><p className="text-xs">kcal</p></div>
                    <div><p className="font-bold text-accent">{plan.protein}g</p><p className="text-xs">protein</p></div>
                    <div><p className="font-bold">{plan.members}</p><p className="text-xs">users</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}