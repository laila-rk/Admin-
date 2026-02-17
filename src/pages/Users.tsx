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

type AppRole = "admin" | "user";

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
      toast({ title: "Sync Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
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
      toast({ title: "Restricted", description: "You cannot demote yourself.", variant: "destructive" });
      return;
    }
    setRoleChangeDialog({ open: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeDialog.user || !roleChangeDialog.newRole) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from("user_roles").update({ role: roleChangeDialog.newRole }).eq("user_id", roleChangeDialog.user.user_id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.user_id === roleChangeDialog.user?.user_id ? { ...u, role: roleChangeDialog.newRole! } : u));
      toast({ title: "Success", description: "Role updated." });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
      setRoleChangeDialog({ open: false, user: null, newRole: null });
    }
  };

  if (adminLoading) return <DashboardLayout><div className="p-4"><Skeleton className="h-64 w-full" /></div></DashboardLayout>;
  if (!isAdmin) return <DashboardLayout><div className="p-20 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-destructive/50" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="User Management" description="Real-time access control.">
        <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </PageHeader>

      <Card className="border-muted shadow-none overflow-hidden">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-muted/10">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-primary" />
            Registry ({filteredUsers.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by name/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-64 text-xs bg-background"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed border-collapse">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[200px] h-9 text-[11px] uppercase pl-6 font-bold">Member Name</TableHead>
                  <TableHead className="w-[250px] h-9 text-[11px] uppercase font-bold">Email Address</TableHead>
                  <TableHead className="w-[120px] h-9 text-[11px] uppercase font-bold text-center">Current Role</TableHead>
                  <TableHead className="w-[150px] h-9 text-[11px] uppercase font-bold text-right pr-6">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/20 border-b last:border-0 transition-colors">
                    <TableCell className="py-2 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold truncate block max-w-[140px]" title={user.full_name || ""}>
                          {user.full_name || "Unnamed User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      <span className="truncate block max-w-[220px]" title={user.email || ""}>
                        {user.email || "not set"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge variant="outline" className={`${roleConfig[user.role].color} text-[9px] px-2 py-0 h-4 border-none uppercase font-bold`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right pr-6">
                      <Select value={user.role} onValueChange={(val: AppRole) => handleRoleChange(user, val)} disabled={user.user_id === currentUser?.id || updating}>
                        <SelectTrigger className="h-7 w-28 ml-auto text-[10px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin" className="text-xs font-bold text-destructive">ADMIN</SelectItem>
                          <SelectItem value="user" className="text-xs font-medium">USER</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={roleChangeDialog.open} onOpenChange={(o) => !updating && setRoleChangeDialog(prev => ({ ...prev, open: o }))}>
        <AlertDialogContent className="max-w-xs rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Modify Permissions?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Assign <b>{roleChangeDialog.newRole?.toUpperCase()}</b> access to this account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="text-xs h-8 flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="text-xs h-8 flex-1">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}