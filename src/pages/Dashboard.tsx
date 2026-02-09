import { useState, useEffect } from "react";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Activity,
  UserCheck,
  Clock,
  BarChart3,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

// --- STATIC DATA (Charts) ---
const memberGrowthData = [
  { month: "Aug", members: 2120, newSignups: 180 },
  { month: "Sep", members: 2340, newSignups: 220 },
  { month: "Oct", members: 2480, newSignups: 140 },
  { month: "Nov", members: 2590, newSignups: 110 },
  { month: "Dec", members: 2710, newSignups: 120 },
  { month: "Jan", members: 2847, newSignups: 137 },
];

const revenueData = [
  { month: "Aug", revenue: 38500, subscriptions: 28000, sessions: 10500 },
  { month: "Sep", revenue: 41200, subscriptions: 30200, sessions: 11000 },
  { month: "Oct", revenue: 43800, subscriptions: 31500, sessions: 12300 },
  { month: "Nov", revenue: 45100, subscriptions: 32800, sessions: 12300 },
  { month: "Dec", revenue: 44600, subscriptions: 32000, sessions: 12600 },
  { month: "Jan", revenue: 48352, subscriptions: 35000, sessions: 13352 },
];

export default function Dashboard() {
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [activities, setActivities] = useState<any[]>([]);
  // const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch Counts
        const [sessionsRes, profilesRes] = await Promise.all([
          supabase.from("sessions").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true })
        ]);

        setSessionCount(sessionsRes.count || 0);
        setMemberCount(profilesRes.count || 0);

        // 2. Fetch Recent Activity (Uses your admin_ prefixed columns)
        const { data: activityData } = await supabase
          .from("activities")
          .select("admin_user_name, admin_action_detail, admin_created_at")
          .order("admin_created_at", { ascending: false })
          .limit(5);

        setActivities(activityData || []);

        // 3. Fetch Top Trainers (Join user_roles and profile_details)
        const { data: trainerData } = await supabase
          .from("user_roles")
          .select(`
            user_id,
            profile_details:user_id (
              first_name,
              last_name
            )
          `)
          .eq("role", "admin")
          .limit(3);

        // setTrainers(trainerData || []);

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <PageHeader 
        title="Dashboard" 
        description="Welcome back! Here's an overview of your platform."
      >
        <Button className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity">
          <Calendar className="w-4 h-4 mr-2" />
          View Schedule
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value={loading ? "..." : memberCount.toLocaleString()}
          change="+12.5% from last month"
          changeType="positive"
          icon={Users}
        />
        
        <StatCard
          title="Active Sessions"
          value={loading ? "..." : sessionCount.toLocaleString()}
          change="Live sessions"
          changeType="positive"
          icon={Activity}
        />

        <StatCard
          title="Revenue (MTD)"
          value="$48,352"
          change="+8.2% from last month"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Trainer Requests"
          value="18"
          change="5 pending approval"
          changeType="neutral"
          icon={UserCheck}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length > 0 ? activities.map((activity, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.admin_user_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{activity.admin_action_detail}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(activity.admin_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )) : (
                <p className="text-center text-sm text-muted-foreground py-4">No recent activity found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Trainers */}
        {/* <Card className="shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Top Trainers</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trainers.length > 0 ? trainers.map((t, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                      {t.profile_details?.first_name?.[0] || "T"}
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.profile_details?.first_name} {t.profile_details?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">Professional Staff</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-sm text-muted-foreground py-4">No trainers listed.</p>
              )}
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Analytics Overview */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts remain the same as your static request */}
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              Member Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memberGrowthData}>
                  <defs>
                    <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="members" stroke="hsl(var(--accent))" fill="url(#memberGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                     contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="subscriptions" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}