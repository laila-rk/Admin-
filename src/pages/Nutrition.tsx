import { useState, useEffect } from "react";
import { Apple, Utensils, Droplets, Flame, Loader2, Search, Check, UserPlus, Users, Plus, UserMinus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

      const totalCals = (logsRes.data as any[])?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      const avgCals = (logsRes.data as any[])?.length ? Math.round(totalCals / (logsRes.data as any[]).length) : 0;
      
      const waterData = (waterRes.data as any[]) || [];
      const totalWater = waterData.reduce((sum, log) => sum + (Number(log.amount_ml) || 0), 0);
      const waterAvgPct = waterData.length 
        ? Math.min(Math.round(((totalWater / waterData.length) / 3000) * 100), 100) 
        : 0;

      setGlobalAvgCals(avgCals);
      setGlobalWaterAvg(waterAvgPct);
      setRecipeCount(recipeRes.count || 0);
    } catch (error: any) {
      toast({ title: "Sync Error", description: "Database connection unstable.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    const calories = Number(newPlan.calories);
    const protein = Number(newPlan.protein);

    if (!newPlan.name.trim()) {
      toast({ title: "Validation Error", description: "Plan name is required", variant: "destructive" });
      return;
    }

    if (calories > 5000 || calories < 0 || protein > 500 || protein < 0) {
      toast({ title: "Validation Error", description: "Please enter valid ranges (Cals: 0-5000, Protein: 0-500)", variant: "destructive" });
      return;
    }

    try {
      const { error } = await (supabase as any).from('meal_plans').insert([{
        ...newPlan,
        calories,
        protein
      }]);
      if (error) throw error;
      
      toast({ title: "Plan Created", description: "New meal plan is now active." });
      setIsDialogOpen(false);
      setNewPlan({ name: "", calories: "2000", protein: "150", meals: 4 });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Delete Implementation
  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure? This will delete the plan and unassign all users.")) return;

    try {
      const { error } = await (supabase as any).from('meal_plans').delete().eq('id', planId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Meal plan removed successfully." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Delete Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAssignPlan = async (userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any).from('user_meal_plans').upsert({ user_id: userId, plan_id: planId }, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: "Assigned", description: "User plan updated." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemovePlan = async(userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any).from('user_meal_plans').delete().eq('user_id', userId).eq('plan_id', planId);
      if (error) throw error;
      toast({ title: "Revoked", description: "User removed from plan." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Nutrition Admin" description="System monitoring and assignment.">
        <div className="flex gap-2">
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Create New Plan
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search plans..." className="w-[200px] pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" onClick={fetchAdminDashboardData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Data"}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Live Meal Plans" value={mealPlans.length} icon={Utensils} color="bg-primary/10" />
        <StatCard label="Total Recipes" value={recipeCount} icon={Apple} color="bg-emerald-500/10" />
        <StatCard label="Global Avg Cals" value={globalAvgCals} icon={Flame} color="bg-orange-500/10" />
        <StatCard label="Water Intake Avg" value={`${globalWaterAvg}%`} icon={Droplets} color="bg-blue-500/10" />
      </div>

      <Card className="shadow-sm border-none bg-slate-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" /> Active Meal Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="p-6 rounded-xl border bg-white hover:border-primary/50 transition-all shadow-sm">
                <div className="flex justify-between mb-4 gap-2">
                  <div className="max-w-[60%]">
                    {/* SC_ST_AD_DB_033: Break words to prevent UI breakage */}
                    <h4 className="font-semibold text-lg break-words leading-tight">{plan.name}</h4>
                    <Badge variant="secondary" className="font-mono text-[10px] mt-1">ID: {plan.id.slice(0, 8)}</Badge>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {/* NEW DELETE BUTTON */}
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeletePlan(plan.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm">Revoke</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        {users.filter(u => u.active_plan_name === plan.name).length > 0 ? (
                          users.filter(u => u.active_plan_name === plan.name).map(u => (
                            <DropdownMenuItem key={u.id} onClick={() => handleRemovePlan(u.id, plan.id)}>{u.full_name}</DropdownMenuItem>
                          ))
                        ) : <DropdownMenuLabel className="text-muted-foreground font-normal">No users</DropdownMenuLabel>}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Assign</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
                        {users.map(u => (
                          <DropdownMenuItem key={u.id} className="flex justify-between" onClick={() => handleAssignPlan(u.id, plan.id)}>
                            {u.full_name} {u.active_plan_name === plan.name && <Check className="w-4 h-4 text-emerald-500" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <StatItem label="Calories" value={plan.calories} />
                  <StatItem label="Protein" value={`${plan.protein}g`} />
                  <StatItem label="Active Users" value={plan.members} highlight />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Meal Plan</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <p className="font-medium">Plan Title</p>
                <span className="text-muted-foreground">{newPlan.name.length}/20</span>
              </div>
              <Input maxLength={20} placeholder="e.g., Vegan Shred" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Daily Calories</p>
                {/* FIX: Changed to allow empty strings during backspace */}
                <Input type="text" value={newPlan.calories} onChange={(e) => setNewPlan({ ...newPlan, calories: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Protein (g)</p>
                <Input type="text" value={newPlan.protein} onChange={(e) => setNewPlan({ ...newPlan, protein: e.target.value.replace(/\D/g, '') })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePlan} className="bg-emerald-600">Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function StatItem({ label, value, highlight }: any) {
  return (
    <div className={`p-2 rounded-lg border ${highlight ? 'bg-primary/5 text-primary border-primary/10' : 'bg-slate-50 border-slate-100'}`}>
      <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-sm border-none">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}><Icon className="w-5 h-5 text-slate-700" /></div>
        </div>
      </CardContent>
    </Card>
  );
}