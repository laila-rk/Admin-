import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, Video, Users as UsersIcon, 
  Clock, Plus, AlertCircle, Trash2, ExternalLink, PlayCircle,
  MessageCircle, Film, RefreshCw
} from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google'; 
import { supabase } from "../lib/supabase";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client => 
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];

  const sessionRegex = [ 
    {
      platform: "google_meet",
      regex: /https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/,
    },
    {
      platform: "zoom",
      regex: /^(https?:\/\/)?(www\.)?([a-z0-9-]+\.)?zoom\.us\/(j|wc)\/\d+$/i,
    },
    {
      platform: "whatsapp",
      regex: /^(https?:\/\/)?(www\.)?(wa\.me\/\d+|chat\.whatsapp\.com\/[A-Za-z0-9]+)$/i,
    },
    {
      platform: "youtube",
      regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      regex2: /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+$/i
    },
  ];

  const getNearestHourTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0); 
    now.setHours(now.getHours() + 1); 
    return now.toTimeString().slice(0, 5); 
  };

  const [formData, setFormData] = useState({
    title: "",
    trainer: "",
    platform: "zoom",
    type: "live", 
    link: "",
    date: today,
    time: getNearestHourTime(),
    isMass: true,
    selectedClientIds: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, clientRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("*, session_assignments(client_id)")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .order('created_at', {ascending: false})
      ]);
      
      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);
      if (clientRes.data) setClients(clientRes.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    const profileSubscription = supabase
      .channel('admin-profile-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();
            
          if (data?.full_name) {
            setFormData(prev => ({ ...prev, trainer: data.full_name }));
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };

    getProfile();
    fetchData(); 

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, []);

  const generateMeetLink = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const toastId = toast.loading("Generating Google Meet link...");
      try {
        const startDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
        const endDate = new Date(`${formData.date}T${formData.time}:00Z`);
        endDate.setHours(endDate.getHours() + 1);
        const endDateTime = endDate.toISOString();

        const response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: formData.title || "Fitness Session",
              description: `Trainer: ${formData.trainer}`,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime }, 
              conferenceData: {
                createRequest: {
                  requestId: Math.random().toString(36).substring(7),
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
            }),
          }
        );

        const data = await response.json();
        if (data.hangoutLink) {
          setFormData(prev => ({ ...prev, link: data.hangoutLink, platform: 'google_meet' }));
          toast.success("Google Meet link ready!", { id: toastId });
        } else {
          toast.error("Google rejected the request.", { id: toastId });
        }
      } catch (error) {
        toast.error("Generation failed.", { id: toastId });
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const getLiveStatus = (scheduledAt: string) => {
    const startTime = new Date(scheduledAt).getTime();
    const now = new Date().getTime();
    const duration = 60 * 60 * 1000; 
    return now >= startTime && now <= (startTime + duration);
  };

  const isPastSession = (scheduledAt: string) => {
    const startTime = new Date(scheduledAt).getTime();
    const now = new Date().getTime();
    const duration = 60 * 60 * 1000; 
    return now > (startTime + duration);
  };

  const handleToggleClient = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClientIds: prev.selectedClientIds.includes(clientId)
        ? prev.selectedClientIds.filter(id => id !== clientId)
        : [...prev.selectedClientIds, clientId]
    }));
  };

  const handleAddSession = async () => {
    if (!formData.link || !formData.title) return toast.error("Title and Link are required");

    const scheduledDateTime = new Date(`${formData.date}T${formData.time}:00`);
    const now = new Date();
    
    if (formData.platform) {
      const platformDetails = sessionRegex.find((p) => p.platform === formData.platform);
      if (platformDetails) {
        const isValid = platformDetails.regex.test(formData.link) || (platformDetails.regex2 && platformDetails.regex2.test(formData.link));
        if (!isValid) {
          toast.error(`Please Give Correct ${formData.platform} Link`);
          return;
        }
      }
    }

    if (scheduledDateTime <= now) {
      toast.error("Please select a future time for session");
      return;
    }

    const { data: newSession, error: sessErr } = await supabase.from("sessions").insert([{
      title: formData.title,
      instructor: formData.trainer || "Coach",
      platform: formData.platform,
      type: formData.type, 
      meeting_link: formData.link,
      scheduled_at: scheduledDateTime.toISOString(),
      admin_is_mass: formData.isMass,
      admin_status: "upcoming"
    }]).select().single();

    if (sessErr) return toast.error(sessErr.message);

    if (!formData.isMass && formData.selectedClientIds.length > 0) {
      const assignments = formData.selectedClientIds.map(cid => ({ 
        session_id: newSession.id, 
        client_id: cid 
      }));
      const { error: assignErr } = await supabase.from("session_assignments").insert(assignments);
      if (assignErr) toast.error("Session created, but user assignment failed.");
    }

    await supabase.from("activities").insert([{
      admin_user_name: formData.trainer || "Coach",
      admin_action_detail: `Scheduled ${formData.type} session: ${formData.title}`,
      admin_activity_type: formData.type === 'recorded' ? 'video' : 'session',
      admin_created_at: new Date().toISOString()
    }]);

    toast.success("Session published successfully!");
    setIsModalOpen(false);
    setSearchTerm("");
    setFormData({
      title: "", trainer: formData.trainer, platform: "zoom", type: "live", link: "",
      date: today, time: getNearestHourTime(), isMass: true, selectedClientIds: []
    });
    fetchData();
  };

  const handleDelete = async (id: string, title: string, trainer: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (!error) {
      await supabase.from("activities").insert([{
        admin_user_name: trainer || "Coach",
        admin_action_detail: `Deleted session: ${title}`,
        admin_activity_type: "deletion",
        admin_created_at: new Date().toISOString()
      }]);
      toast.success("Session removed");
      fetchData();
    }
  };

  const handleTrainerName = (e: any) => {
    const val = e.target.value;
    if (val.length > 40) return toast.error('Trainer Name length should be less than 40');
    setFormData({ ...formData, trainer: val });
  }

  const handleSessionTitle = (e: any) => {
    const val = e.target.value;
    if (val.length > 40) return toast.error("Session Title length should be less than 40");
    setFormData({ ...formData, title: val });
  }

  return (
    <DashboardLayout>
      <PageHeader title="Sessions" description="Manage your Live workouts and Recorded Library.">
        <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchData} className="text-slate-400">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Add Session
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-foreground">Schedule New Session</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                    <Label className="text-slate-600">Session Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                        <SelectTrigger className="border-slate-200 bg-slate-50/50">
                        <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="live">Live Streaming</SelectItem>
                        <SelectItem value="recorded">Recorded Library</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="grid gap-2">
                    <Label className="text-slate-600">Trainer / Coach</Label>
                    <Input 
                        value={formData.trainer} 
                        className="border-slate-200" 
                        placeholder="Coach name"
                        onChange={handleTrainerName}
                    />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label className="text-slate-600">Session Title</Label>
                    <Input 
                    value={formData.title} 
                    className="border-slate-200" 
                    placeholder="e.g. Morning Cardio"
                    onChange={handleSessionTitle}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                    <Label className="text-slate-600">Date</Label>
                    <Input 
                        type="date" 
                        min={today}
                        className="border-slate-200" 
                        value={formData.date} 
                        onChange={(e) => setFormData({...formData, date: e.target.value})} 
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label className="text-slate-600">Time</Label>
                    <Input type="time" className="border-slate-200" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <div>
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Visibility Mode</Label>
                        <p className="text-[10px] text-blue-400">Who can see this session?</p>
                    </div>
                    <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Private</span>
                    <Switch checked={formData.isMass} onCheckedChange={(v) => setFormData({...formData, isMass: v})} />
                    <span className="text-[10px] text-slate-600 font-medium">Public (All)</span>
                    </div>
                </div>

                {!formData.isMass && (
                  <div className="border rounded-xl p-4 bg-slate-50/50 border-slate-200">
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <Label className="text-xs font-bold text-[#0ea5e9] shrink-0">
                        Assign to Clients ({formData.selectedClientIds.length})
                      </Label>
                      <div className="relative flex-1">
                        <UsersIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <Input 
                          placeholder="Search name..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-7 text-[10px] pl-7 pr-2 border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[120px] pr-4">
                      {filteredClients.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4">No matching clients found.</p>
                      ) : (
                        filteredClients.map(client => (
                          <div key={client.user_id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-700">{client.full_name}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-mono">{client.user_id.slice(0,8)}...</span>
                            </div>
                            <Checkbox 
                              checked={formData.selectedClientIds.includes(client.user_id)}
                              onCheckedChange={() => handleToggleClient(client.user_id)}
                            />
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                    <Label className="text-slate-600">Platform</Label>
                    <Select value={formData.platform} onValueChange={(v) => setFormData({...formData, platform: v})}>
                        <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-slate-600">Video Link</Label>
                        <Button 
                          type="button" variant="ghost" 
                          className="h-6 text-[10px] text-[#0ea5e9] px-2 flex items-center gap-1"
                          onClick={() => generateMeetLink()}
                        >
                        <Video className="w-3 h-3" /> Auto-Meet
                        </Button>
                    </div>
                    <Input 
                        className="border-slate-200" 
                        placeholder="Paste link here..."
                        value={formData.link}
                        onChange={(e) => setFormData({...formData, link: e.target.value})} 
                    />
                    </div>
                </div>
                </div>
                <DialogFooter>
                <Button onClick={handleAddSession} className="w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-bold">
                    {formData.type === 'recorded' ? 'Add to Library' : 'Publish Live Session'}
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Live Now" value={sessions.filter(s => getLiveStatus(s.scheduled_at) && s.type !== 'recorded').length} icon={<Video className="text-[#0ea5e9]" />} bgColor="bg-sky-50" />
        <StatCard title="Total Workouts" value={sessions.length} icon={<CalendarIcon className="text-[#0ea5e9]" />} bgColor="bg-sky-50" />
        <StatCard title="Active Clients" value={clients.length} icon={<UsersIcon className="text-slate-400" />} bgColor="bg-slate-50" />
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-xl font-bold text-foreground">Session Management</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? <p className="text-center py-4 text-slate-400">Syncing database...</p> : 
              sessions.length === 0 ? <p className="text-center py-4 text-slate-400">No sessions scheduled.</p> :
              sessions.map((session) => {
              const isLive = getLiveStatus(session.scheduled_at) && session.type !== 'recorded';
              const isPast = isPastSession(session.scheduled_at) && session.type !== 'recorded';
              const participantCount = session.admin_is_mass ? "ALL" : (session.session_assignments?.length || 0);
              const sessionTime = new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

              return (
                <div key={session.id} className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                  isPast ? 'opacity-50 bg-slate-50/30 border-slate-100 grayscale-[0.5]' : 'hover:border-sky-100 hover:bg-sky-50/30 border-slate-200'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{session.title}</h4>
                      {isLive && <Badge className="bg-[#0ea5e9] text-white text-[10px] uppercase font-bold">LIVE</Badge>}
                      {isPast && <Badge variant="secondary" className="text-[9px] bg-slate-200 text-slate-500 border-none uppercase">PAST</Badge>}
                      {session.admin_is_mass && <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-500 uppercase">PUBLIC</Badge>}
                    </div>
                    <p className="text-sm text-slate-400 font-medium capitalize">Coach {session.instructor}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-6 mr-4">
                    <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                      <Clock className="w-4 h-4 text-[#0ea5e9]" />
                      <span className="text-sm font-bold">{sessionTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 min-w-[110px]">
                      <UsersIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold">{participantCount} {session.admin_is_mass ? '' : 'Clients'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" className="text-[#0ea5e9] font-bold hover:bg-sky-50" onClick={() => window.open(session.meeting_link, '_blank')}>View</Button>
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(session.id, session.title, session.instructor)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, bgColor }: any) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6 flex items-center justify-between">
        <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">{title}</p><p className="text-3xl font-bold text-foreground">{value}</p></div>
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${bgColor}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}