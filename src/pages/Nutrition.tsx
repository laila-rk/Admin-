import { useState, useEffect } from "react";
import { Apple, Utensils, Droplets, Flame, Loader2, Search, Check, UserPlus, Users, Plus, UserMinus, Trash2, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface MealPlan {
  id: string;
  name: string;
  meals: number;
  calories: number;
  protein: number;
  members: number;
}

interface UserAssignment {
  id: string;
  full_name: string;
  email: string;
  active_plan_name: string | null;
}

export default function NutritionAdmin() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<MealPlan[]>([]);
  const [users, setUsers] = useState<UserAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [globalAvgCals, setGlobalAvgCals] = useState<number>(0);
  const [globalWaterAvg, setGlobalWaterAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", calories: "2000", protein: "150", meals: 4 });
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  useEffect(() => {
    const result = mealPlans.filter(plan =>
      plan.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPlans(result);
  }, [searchQuery, mealPlans]);

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);
      const [plansRes, profilesRes, assignmentsRes, logsRes, waterRes, recipeRes] = await Promise.all([
        (supabase as any).from('meal_plans').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('profiles').select('id, full_name, email'),
        (supabase as any).from('user_meal_plans').select('user_id, plan_id'),
        (supabase as any).from('nutrition_logs').select('calories'),
        (supabase as any).from('water_intake').select('amount_ml'),
        (supabase as any).from('recipes').select('*', { count: 'exact', head: true })
      ]);

      // Calculate Total Recipes
      setRecipeCount(recipeRes.count || 0);

      // Calculate Global Average Calories
      if (logsRes.data && logsRes.data.length > 0) {
        const totalCals = logsRes.data.reduce((sum: number, log: any) => sum + (Number(log.calories) || 0), 0);
        setGlobalAvgCals(Math.round(totalCals / logsRes.data.length));
      } else {
        setGlobalAvgCals(0);
      }

      // Calculate Water Intake Average (Percentage vs 2000ml goal)
      if (waterRes.data && waterRes.data.length > 0) {
        const totalWater = waterRes.data.reduce((sum: number, log: any) => sum + (Number(log.amount_ml) || 0), 0);
        const avgMl = totalWater / waterRes.data.length;
        // Calculation: (Average intake / 2000ml goal) * 100
        setGlobalWaterAvg(Math.min(Math.round((avgMl / 2000) * 100), 100));
      } else {
        setGlobalWaterAvg(0);
      }

      const rawPlans = (plansRes.data as any[]) || [];
      const assignments = (assignmentsRes.data as any[]) || [];

      const dynamicPlans: MealPlan[] = rawPlans.map(plan => ({
        ...plan,
        members: assignments.filter(a => a.plan_id === plan.id).length
      }));
      setMealPlans(dynamicPlans);

      if (profilesRes.data) {
        const formattedUsers = (profilesRes.data as any[]).map((profile) => {
          const userAssignment = assignments.find(a => a.user_id === profile.id);
          const activePlan = dynamicPlans.find(p => p.id === userAssignment?.plan_id);
          return {
            id: profile.id,
            full_name: profile.full_name || "Unknown User",
            email: profile.email || "No Email",
            active_plan_name: activePlan ? activePlan.name : null
          };
        });
        setUsers(formattedUsers);
      }

    } catch (error: any) {
      toast({ title: "Sync Error", description: "Database connection unstable.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const calVal = Number(newPlan.calories);
      const proVal = Number(newPlan.protein);

      if (!newPlan.name.trim()) {
        toast({ title: "Validation Error", description: "Plan name is required", variant: "destructive" });
        return;
      }
      
      const { error } = await (supabase as any)
        .from('meal_plans')
        .insert([{ ...newPlan, calories: calVal, protein: proVal }]);

      if (error) throw error;
      
      toast({ title: "Plan Created", description: "New plan is now live." });
      setIsDialogOpen(false);
      setNewPlan({ name: "", calories: "2000", protein: "150", meals: 4 });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this plan? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      const { error } = await (supabase as any).from('meal_plans').delete().eq('id', planId);
      if (error) throw error;
      toast({ title: "Plan Deleted", description: "The meal plan has been removed successfully." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: "Cannot delete plan. Ensure no users are assigned.", variant: "destructive" });
    }
  };

  const handleAssignPlan = async (userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any).from('user_meal_plans').upsert({ user_id: userId, plan_id: planId }, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: "Plan Assigned", description: "User moved to new plan." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Assignment Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemovePlan = async (userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any).from('user_meal_plans').delete().eq('user_id', userId).eq('plan_id', planId);
      if (error) throw error;
      toast({ title: "Plan Removed", description: "User access revoked." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Nutrition Admin" description="System monitoring and assignment.">
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4" /> Create New Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Meal Plan</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Plan Title (Max 20 chars)</p>
                  <Input
                    maxLength={20}
                    placeholder="e.g., Vegan Shred"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Daily Calories</p>
                    <Input
                      type="number"
                      value={newPlan.calories}
                      onChange={(e) => setNewPlan({ ...newPlan, calories: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Protein (g)</p>
                    <Input
                      type="number"
                      value={newPlan.protein}
                      onChange={(e) => setNewPlan({ ...newPlan, protein: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePlan} className="bg-emerald-600 text-white">Save Plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              className="w-[200px] pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={fetchAdminDashboardData} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Data
          </Button>
        </div>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 mt-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Live Meal Plans</p>
              <p className="text-3xl font-bold mt-1">{mealPlans.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
              <Utensils className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Recipes</p>
              <p className="text-3xl font-bold mt-1">{recipeCount}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
              <Apple className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Global Avg Cals</p>
              <p className="text-3xl font-bold mt-1">{globalAvgCals}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl text-orange-500">
              <Flame className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Water Intake Avg</p>
              <p className="text-3xl font-bold mt-1">{globalWaterAvg}%</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-blue-500">
              <Droplets className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Meal Plans List */}
      <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-slate-800">
        <Utensils className="w-5 h-5 text-indigo-600" /> Active Meal Plans
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPlans.map((plan) => (
          <Card key={plan.id} className="border-none shadow-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-2xl font-bold text-slate-900">{plan.name}</h4>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[10px] text-slate-500 mt-1">
                    ID: {plan.id.slice(0, 8)}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-4 h-9">
                        <UserMinus className="w-4 h-4" /> Revoke
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Revoke User</DropdownMenuLabel>
                      {users.filter(u => u.active_plan_name === plan.name).map(u => (
                        <DropdownMenuItem key={u.id} onClick={() => handleRemovePlan(u.id, plan.id)}>
                          {u.full_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 border-slate-200 px-4 h-9">
                        <UserPlus className="w-4 h-4" /> Assign
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Assign User</DropdownMenuLabel>
                      {users.map(u => (
                        <DropdownMenuItem key={u.id} onClick={() => handleAssignPlan(u.id, plan.id)}>
                          {u.full_name} {u.active_plan_name === plan.name && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Calories</p>
                  <p className="text-xl font-bold text-slate-700">{plan.calories}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Protein</p>
                  <p className="text-xl font-bold text-slate-700">{plan.protein}g</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Active Users</p>
                  <p className="text-xl font-bold text-indigo-700">{plan.members}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}