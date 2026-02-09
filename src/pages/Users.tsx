import { useState, useEffect, useMemo, useCallback } from "react";
import { Users as UsersIcon, Shield, ShieldAlert, UserCog, Search, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "admin" | "moderator" | "user";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
}

const roleConfig: Record<AppRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
  moderator: { label: "Moderator", color: "bg-accent/10 text-accent border-accent/20", icon: Shield },
  user: { label: "User", color: "bg-muted text-muted-foreground border-border", icon: UserCog },
};

export default function Users() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    newRole: AppRole | null;
  }>({ open: false, user: null, newRole: null });

  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { user: currentUser } = useAuth();

  // Optimized fetch function wrapped in useCallback to prevent re-renders
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role")
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map(rolesRes.data.map(r => [r.user_id, r.role]));

      const formattedUsers: UserWithRole[] = (profilesRes.data || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        role: (rolesMap.get(profile.user_id) as AppRole) || "user",
      }));

      setUsers(formattedUsers);
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to load latest user registry.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  //  Subscription logic
  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();

    const channel = supabase
      .channel("live-user-updates")
      .on("postgres_changes", { event: "*", table: "user_roles", schema: "public" }, () => fetchUsers())
      .on("postgres_changes", { event: "*", table: "profiles", schema: "public" }, () => fetchUsers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, fetchUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term)
    );
  }, [users, searchQuery]);

  const handleRoleChange = (user: UserWithRole, newRole: AppRole) => {
    if (user.user_id === currentUser?.id) {
      toast({
        title: "Action Restricted",
        description: "You cannot change your own administrative permissions.",
        variant: "destructive",
      });
      return;
    }
    setRoleChangeDialog({ open: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeDialog.user || !roleChangeDialog.newRole) return;
    const { user, newRole } = roleChangeDialog;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", user.user_id);

      if (error) throw error;

      //  Update local state 
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, role: newRole } : u));
      
      toast({ title: "Role Updated", description: `Updated ${user.full_name || 'user'} to ${newRole}.` });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
      setRoleChangeDialog({ open: false, user: null, newRole: null });
    }
  };

  if (adminLoading) return <DashboardLayout><div className="p-8 space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 w-full" /></div></DashboardLayout>;
  if (!isAdmin) return <DashboardLayout><div className="flex flex-col items-center justify-center min-h-[50vh] text-center"><ShieldAlert className="w-16 h-16 text-destructive/50 mb-4" /><h2 className="text-2xl font-bold">Unauthorized Access</h2></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="User Management" description="Real-time access control.">
        <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Sync Data
        </Button>
      </PageHeader>

      <Card className="shadow-sm border-muted">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            Registry ({filteredUsers.length})
          </CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const RoleIcon = roleConfig[user.role].icon;
                  const isCurrentUser = user.user_id === currentUser?.id;

                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-accent">
                                    {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                                </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="font-medium flex items-center gap-2">
                              {user.full_name || "Unnamed User"}
                              {isCurrentUser && (
                                <Badge variant="secondary" className="h-4 text-[10px] px-1 font-bold">YOU</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || <span className="text-xs italic opacity-40">not set</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${roleConfig[user.role].color} flex items-center gap-1.5 w-fit font-normal`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig[user.role].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={user.role}
                          onValueChange={(val: AppRole) => handleRoleChange(user, val)}
                          disabled={isCurrentUser || updating}
                        >
                          <SelectTrigger className="w-32 ml-auto h-9 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={roleChangeDialog.open} onOpenChange={(o) => !updating && setRoleChangeDialog(prev => ({ ...prev, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Permissions?</AlertDialogTitle>
            <AlertDialogDescription>
              Assign <strong>{roleChangeDialog.newRole}</strong> permissions to <strong>{roleChangeDialog.user?.email || roleChangeDialog.user?.full_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} disabled={updating} className={updating ? "opacity-50 pointer-events-none" : ""}>
              {updating ? "Processing..." : "Confirm Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}