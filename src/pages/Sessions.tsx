import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, Video, Users as UsersIcon, 
  Clock, Plus, AlertCircle, Trash2, ExternalLink, PlayCircle,
  MessageCircle, Film
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
  
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: "",
    trainer: "",
    platform: "zoom",
    type: "live", 
    link: "",
    date: today,
    time: "10:00",
    isMass: true,
    selectedClientIds: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, clientRes] = await Promise.all([
        supabase.from("sessions").select("*, session_assignments(count)").order("scheduled_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name")
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
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
            
          if (error) {
            console.error("Profile fetch error:", error.message);
          } else if (data?.full_name) {
            setFormData(prev => ({ ...prev, trainer: data.full_name }));
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    getProfile();
    fetchData(); 
  }, []);

  const generateMeetLink = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const toastId = toast.loading("Generating Google Meet link...");
      try {
        const startDateTime = `${formData.date}T${formData.time}:00Z`;
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

    const alphaRegex = /[a-zA-Z]/;
    const nameOnlyRegex = /^[a-zA-Z\s.-]*$/;

    if (!nameOnlyRegex.test(formData.trainer) || !alphaRegex.test(formData.trainer)) {
      return toast.error("Trainer name must contain letters and no numbers/special symbols.");
    }

    if (!alphaRegex.test(formData.title)) {
      return toast.error("Session Title must contain letters (cannot be only numbers/symbols).");
    }

    const scheduledDateTime = new Date(`${formData.date}T${formData.time}:00`);
    const now = new Date();
    
    if (scheduledDateTime < now) {
      return toast.error("Cannot schedule a session in the past.");
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
      await supabase.from("session_assignments").insert(assignments);
    }

    await supabase.from("activities").insert([{
      admin_user_name: formData.trainer || "Coach",
      admin_action_detail: `Scheduled ${formData.type} session: ${formData.title}`,
      admin_activity_type: formData.type === 'recorded' ? 'video' : 'session',
      admin_created_at: new Date().toISOString()
    }]);

    toast.success("Session added!");
    setIsModalOpen(false);
    setFormData({
      title: "", trainer: formData.trainer, platform: "zoom", type: "live", link: "",
      date: today, time: "10:00", isMass: true, selectedClientIds: []
    });
    fetchData();
  };

  const handleDelete = async (id: string, title: string, trainer: string) => {
    if (!confirm(`Are you sure?`)) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (!error) {
      await supabase.from("activities").insert([{
        admin_user_name: trainer || "Coach",
        admin_action_detail: `Deleted session: ${title}`,
        admin_activity_type: "deletion",
        admin_created_at: new Date().toISOString()
      }]);
      toast.success("Deleted");
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Sessions" description="Manage your Live workouts and Recorded Library.">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-slate-800">Schedule New Session</DialogTitle></DialogHeader>
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
                    onKeyPress={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                    onChange={(e) => setFormData({...formData, trainer: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-slate-600">Session Title</Label>
                <Input 
                  value={formData.title} 
                  className="border-slate-200" 
                  placeholder="e.g. Morning Cardio"
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
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

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assignment Mode</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Individual</span>
                  <Switch checked={formData.isMass} onCheckedChange={(v) => setFormData({...formData, isMass: v})} />
                  <span className="text-[10px] text-slate-600 font-medium">All Users</span>
                </div>
              </div>

              {!formData.isMass && (
                <div className="border rounded-xl p-4 bg-slate-50/50 border-slate-200">
                  <Label className="text-xs font-bold text-[#0ea5e9] mb-2 block">Select Clients ({formData.selectedClientIds.length})</Label>
                  <ScrollArea className="h-[120px] pr-4">
                    {clients.map(client => (
                      <div key={client.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="text-xs text-slate-600">{client.full_name}</span>
                        <Checkbox 
                          checked={formData.selectedClientIds.includes(client.id)}
                          onCheckedChange={() => handleToggleClient(client.id)}
                        />
                      </div>
                    ))}
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
                      type="button"
                      variant="ghost" 
                      className="h-6 text-[10px] text-[#0ea5e9] hover:bg-sky-50 px-2 flex items-center gap-1"
                      onClick={() => generateMeetLink()}
                    >
                      <Video className="w-3 h-3" /> Auto-Meet
                    </Button>
                  </div>
                  <Input 
                    className="border-slate-200" 
                    placeholder="Link will appear here..."
                    value={formData.link}
                    onChange={(e) => setFormData({...formData, link: e.target.value})} 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddSession} className="w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white font-bold">
                {formData.type === 'recorded' ? 'Push to Recorded Library' : 'Schedule Live Session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Live Now" value={sessions.filter(s => getLiveStatus(s.scheduled_at) && s.type !== 'recorded').length} icon={<Video className="text-[#0ea5e9]" />} bgColor="bg-sky-50" />
        <StatCard title="Total Workouts" value={sessions.length} icon={<CalendarIcon className="text-[#0ea5e9]" />} bgColor="bg-sky-50" />
        <StatCard title="Active Clients" value={clients.length} icon={<UsersIcon className="text-slate-400" />} bgColor="bg-slate-50" />
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-xl font-bold text-slate-800">Session Management</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? <p className="text-center py-4 text-slate-400">Syncing...</p> : 
              sessions.length === 0 ? <p className="text-center py-4 text-slate-400">No sessions.</p> :
              sessions.map((session) => {
              const live = getLiveStatus(session.scheduled_at) && session.type !== 'recorded';
              
              
              const participantCount = session.admin_is_mass 
                ? clients.length 
                : (session.session_assignments?.[0]?.count || 0);

              
              const sessionTime = new Date(session.scheduled_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });

              return (
                <div key={session.id} className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-100 hover:border-sky-100 hover:bg-sky-50/30 transition-all">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-sm ${live ? 'bg-[#0ea5e9] animate-pulse' : 'bg-slate-200'}`}>
                    {session.type === 'recorded' ? <Film className="w-6 h-6" /> : <PlayCircle className="w-6 h-6 text-slate-400" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-800">{session.title}</h4>
                      {live && <Badge className="bg-[#0ea5e9] text-white text-[10px] uppercase font-bold">LIVE</Badge>}
                    </div>
                    <p className="text-sm text-slate-400 font-medium capitalize">Coach {session.instructor}</p>
                  </div>

                  {/* FIXED: Time and Client Count UI Section */}
                  <div className="hidden md:flex items-center gap-6 mr-4">
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <Clock className="w-4 h-4 text-[#0ea5e9]" />
                      <span className="text-sm font-bold">{sessionTime}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 min-w-[110px]">
                      <UsersIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold">{participantCount} Clients</span>
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
        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-tight mb-1">{title}</p><p className="text-3xl font-bold text-slate-800">{value}</p></div>
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${bgColor}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}