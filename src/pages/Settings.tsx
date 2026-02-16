import { useEffect, useState, useRef } from "react";
import {
  Palette,
  Globe,
  DollarSign,
  Users,
  Bell,
  ToggleLeft,
  Languages,
  Sun,
  Moon,
  Monitor,
  Type,
  Contrast,
  Save,
  Trash2,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import hexToHsl from "@/lib/hextohsl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const featureToggles = [
  {
    id: "live_sessions",
    name: "Live Sessions",
    description: "Enable live streaming workout sessions",
    enabled: true,
  },
  {
    id: "nutrition_tracking",
    name: "Nutrition Tracking",
    description: "Allow members to log meals and track macros",
    enabled: true,
  },
];

export default function Settings() {
  const [features, setFeatures] = useState(featureToggles);
  // const [fontSize, setFontSize] = useState(
  //   () => localStorage.getItem("app-fontSize") || "medium",
  // );
  // const [contrast, setContrast] = useState(
  //   () => localStorage.getItem("app-contrast") || "normal",
  // );
  // const [theme, setTheme] = useState<"light" | "dark">(
  //   () => (localStorage.getItem("app-theme") as "light" | "dark") || "light",
  // );

  // const [primaryColor, setPrimaryColor] = useState(
  //   () => localStorage.getItem("app-primary") || "#1a365d",
  // );

  // const [accentColor, setAccentColor] = useState(
  //   () => localStorage.getItem("app-accent") || "#1c9ebe",
  // );

  // Logo state
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // const {user} = useAuth();
  const { toast } = useToast();
  const {setTheme, setFontSize, setContrast, setPrimaryColor, setAccentColor, theme, fontSize, contrast, primaryColor, accentColor} = useTheme();

  // Fetch logo on mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Fetch logo error:", error);
          return;
        }

        if (data?.avatar_url) {
          setCurrentLogoUrl(data.avatar_url);
        }
      } catch (err) {
        console.error("Error fetching logo:", err);
      }
    };

    fetchLogo();
  }, []);

  // Handle file selection and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, SVG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const filePath = `logos/${user.id}-${Date.now()}.${fileExt}`;

      // Check if admin profile exists and get old logo
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      // Delete old logo from storage if it exists
      if (existingProfile?.avatar_url) {
        const oldFilePath = extractFilePathFromUrl(
          existingProfile.avatar_url,
        );
        if (oldFilePath) {
          await supabase.storage.from("admin-logo").remove([oldFilePath]);
        }
      }

      // Upload new file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("admin-logo")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from("admin-logo")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update or insert admin profile
      await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      setCurrentLogoUrl(publicUrl);

      toast({
        title: "Logo uploaded",
        description: "Your logo has been successfully uploaded",
      });
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload logo";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle logo deletion
  const handleDeleteLogo = async () => {
    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Get current profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      // Delete file from storage
      if (profile?.avatar_url) {
        const filePath = extractFilePathFromUrl(profile.avatar_url);
        if (filePath) {
          await supabase.storage.from("admin-logo").remove([filePath]);
        }
      }

      // Update profile to remove logo URL
      await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { avatar_url: "" },
        });

      setCurrentLogoUrl(null);

      toast({
        title: "Logo deleted",
        description: "Your custom logo has been removed",
      });
    } catch (err) {
      console.error("Delete error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete logo";
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Extract file path from Supabase storage URL
  const extractFilePathFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/admin-logo/");
      return pathParts[1] || null;
    } catch {
      return null;
    }
  };

  const toggleFeature = (id: string) => {
    setFeatures(
      features.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  // Determine which logo to display
  const displayLogo = currentLogoUrl || logo;
  const isCustomLogo = currentLogoUrl !== null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        description="Configure your platform settings and preferences."
      />

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger
            value="branding"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <ToggleLeft className="w-4 h-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger
            value="display"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Display
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 animate-fade-in">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">App Branding</CardTitle>
              <CardDescription>
                Customize your platform's look and feel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="space-y-2">
                  <Label>Current Logo</Label>
                  <div className="relative w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                    {uploading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    )}
                    <img
                      src={displayLogo}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {isCustomLogo && !uploading && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteLogo}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Upload New Logo</Label>
                    <Input
                      ref={fileInputRef}
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Recommended: SVG or PNG, minimum 512x512px
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Maximum file size: 5MB
                    </p>
                    {isCustomLogo && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✓ Custom logo uploaded
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      value={primaryColor}
                      readOnly
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="accent-color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                    />
                    <Input value={accentColor} readOnly className="font-mono" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6 animate-fade-in">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Feature Toggles</CardTitle>
              <CardDescription>
                Enable or disable platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <Label className="text-base font-medium">
                        {feature.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  {theme === "light" ? (
                    <Sun className="w-7 h-7 text-accent" />
                  ) : (
                    <Moon className="w-7 h-7 text-accent" />
                  )}
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "light", icon: Sun, label: "Light" },
                      { value: "dark", icon: Moon, label: "Dark" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as typeof theme)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-3 p-4 rounded-lg border transition-all",
                          theme === option.value
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50",
                        )}
                      >
                        <option.icon
                          className={cn(
                            "w-7 h-7",
                            theme === option.value
                              ? "text-accent"
                              : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            theme === option.value
                              ? "text-accent font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Font Size
                  </Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Contrast className="w-4 h-4" />
                    Contrast
                  </Label>
                  <Select value={contrast} onValueChange={setContrast}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Contrast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
