import { useState, useEffect } from "react";
import { 
  HelpCircle, MessageCircle, Book, FileQuestion, Clock, 
  CheckCircle, AlertCircle, Plus, Trash2, ExternalLink, 
  RefreshCw, MessageSquare, Eye 
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newVideo, setNewVideo] = useState({ title: "", url: "", duration: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ticketData } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      
      const { data: tutorialData } = await supabase
        .from("tutorials")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketData) setTickets(ticketData);
      if (tutorialData) setTutorials(tutorialData);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) fetchData();
  };

  const openWhatsApp = (ticket: any) => {
    const adminPhone = "8637261676";
    const text = encodeURIComponent(
      ` *Admin Live Support*\n\n` +
      `*From:* ${ticket.user_name}\n` +
      `*Message:* ${ticket.message}\n` +
      `*Status:* ${ticket.status.toUpperCase()}`
    );
    window.open(`https://wa.me/${adminPhone}?text=${text}`, "_blank");
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (!error) fetchData();
  };

  const handleAddTutorial = async () => {
    if (!newVideo.title || !newVideo.url) return;
    const { error } = await supabase.from("tutorials").insert([newVideo]);
    if (!error) {
      setNewVideo({ title: "", url: "", duration: "" });
      fetchData();
    }
  };

  const handleDeleteTutorial = async (id: string) => {
    const { error } = await supabase.from("tutorials").delete().eq("id", id);
    if (!error) fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500 text-white border-none">Viewing</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 text-white border-none">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "medium":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "low":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <MessageCircle className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title="Admin Support Dashboard" 
        description="Monitor live user tickets and manage video tutorials."
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-sm border-l-4 border-l-red-500">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground font-semibold">NEW TICKETS</p>
              <p className="text-3xl font-bold">{tickets.filter(t => t.status === 'open').length}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 text-red-500"><AlertCircle /></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-yellow-500">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground font-semibold">BEING VIEWED</p>
              <p className="text-3xl font-bold">{tickets.filter(t => t.status === 'in_progress').length}</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50 text-yellow-500"><Eye /></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground font-semibold">CLOSED / SOLVED</p>
              <p className="text-3xl font-bold">{tickets.filter(t => t.status === 'resolved').length}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 text-green-500"><CheckCircle /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Tickets Section */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="font-display">Live Support Tickets</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No active tickets.</div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 rounded-xl border bg-muted/10 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {getPriorityIcon(ticket.priority || "high")}
                        <div>
                          <p className="font-bold text-foreground">{ticket.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>
                    
                    {/* Fixed: Ticket Message Wrap */}
                    <div className="p-3 bg-background rounded-lg border text-sm italic break-words overflow-hidden">
                      "{ticket.message}"
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateStatus(ticket.id, "in_progress")}>View</Button>
                        <Button variant="outline" size="sm" className="text-green-600" onClick={() => updateStatus(ticket.id, "resolved")}>Close</Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteTicket(ticket.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openWhatsApp(ticket)}>
                          <MessageSquare className="w-4 h-4 mr-2" /> Admin WP
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tutorial Management Section */}
        <div className="space-y-6">
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Add New Tutorial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} />
              <Input placeholder="URL" value={newVideo.url} onChange={e => setNewVideo({...newVideo, url: e.target.value})} />
              <div className="flex gap-2">
                <Input placeholder="Duration" value={newVideo.duration} onChange={e => setNewVideo({...newVideo, duration: e.target.value})} />
                <Button onClick={handleAddTutorial} size="icon"><Plus className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Live Tutorials</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tutorials.map((video) => (
                  <div key={video.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/20 group gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Book className="w-4 h-4 text-primary mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        {/* Fixed: Tutorial Title Wrap */}
                        <p className="text-sm font-medium break-words whitespace-normal leading-tight">
                          {video.title}
                        </p>
                        {/* Fixed: Tutorial Duration/Meta Wrap */}
                        <p className="text-xs text-muted-foreground break-all whitespace-normal mt-1">
                          {video.duration} • {video.views || 0} views
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" 
                      onClick={() => handleDeleteTutorial(video.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}