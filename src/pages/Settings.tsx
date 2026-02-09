import { useEffect, useState } from "react";
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
  Save
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import hexToHsl from "@/lib/hextohsl";

const featureToggles = [
  { id: "live_sessions", name: "Live Sessions", description: "Enable live streaming workout sessions", enabled: true },
  { id: "nutrition_tracking", name: "Nutrition Tracking", description: "Allow members to log meals and track macros", enabled: true },
  // { id: "ai_recommendations", name: "AI Recommendations", description: "AI-powered workout and diet suggestions", enabled: false },
  { id: "social_features", name: "Social Features", description: "Member forums and community posts", enabled: true },
  { id: "leaderboards", name: "Leaderboards", description: "Weekly and monthly fitness challenges", enabled: true },
];

export default function Settings() {
  const [features, setFeatures] = useState(featureToggles);
  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem("app-fontSize") || "medium",
  );
  const [contrast, setContrast] = useState(
    () => localStorage.getItem("app-contrast") || "normal",
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("app-theme") as "light" | "dark") || "light",
  );

  const [primaryColor, setPrimaryColor] = useState(
    () => localStorage.getItem("app-primary") || "#1a365d",
  );

  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem("app-accent") || "#1c9ebe",
  );

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);

    root.classList.remove(
      "text-small",
      "text-medium",
      "text-large",
      "text-xlarge",
    );
    root.classList.add(`text-${fontSize}`);

    root.classList.remove("contrast-normal", "contrast-high");
    root.classList.add(`contrast-${contrast}`);

    root.style.setProperty("--primary", hexToHsl(primaryColor));
    root.style.setProperty("--accent", hexToHsl(accentColor));

    localStorage.setItem("app-theme", theme);
    localStorage.setItem("app-fontSize", fontSize);
    localStorage.setItem("app-contrast", contrast);
    localStorage.setItem("app-primary", primaryColor);
    localStorage.setItem("app-accent", accentColor);
  }, [theme, fontSize, contrast, primaryColor, accentColor]);


  const toggleFeature = (id: string) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        description="Configure your platform settings and preferences."
      >
        {/* <Button className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button> */}
      </PageHeader>

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
            value="pricing"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Pricing
          </TabsTrigger>
          <TabsTrigger
            value="trainers"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Trainers
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
                  <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Upload New Logo</Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended: SVG or PNG, minimum 512x512px
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>

                  <div className="flex items-center gap-3">
                    {/* Color Picker */}
                    <input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                    />

                    {/* Hex Code Display (readonly) */}
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
                    {/* Color Picker */}
                    <input
                      id="accent-color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                    />

                    {/* Hex Code Display (readonly) */}
                    <Input value={accentColor} readOnly className="font-mono" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6 animate-fade-in">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Pricing Plans</CardTitle>
              <CardDescription>
                Manage subscription tiers and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    name: "Basic",
                    price: "$9.99",
                    features: [
                      "Access to recorded sessions",
                      "Basic nutrition tracking",
                      "Community forums",
                    ],
                  },
                  {
                    name: "Premium",
                    price: "$24.99",
                    features: [
                      "All Basic features",
                      "Live sessions access",
                      "1-on-1 coaching",
                      "Advanced analytics",
                    ],
                  },
                  {
                    name: "Elite",
                    price: "$49.99",
                    features: [
                      "All Premium features",
                      "Priority support",
                      "Custom meal plans",
                      "Personal trainer",
                    ],
                  },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className="p-4 rounded-xl border border-border hover:border-accent transition-colors"
                  >
                    <h4 className="font-semibold text-foreground">
                      {plan.name}
                    </h4>
                    <p className="text-2xl font-bold text-accent mt-1">
                      {plan.price}
                      <span className="text-sm text-muted-foreground font-normal">
                        /mo
                      </span>
                    </p>
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="text-sm text-muted-foreground"
                        >
                          • {feature}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Edit Plan
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      Coupon Codes
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Create and manage discount codes
                    </p>
                  </div>
                  <Button variant="outline">Manage Coupons</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trainers Tab */}
        <TabsContent value="trainers" className="space-y-6 animate-fade-in">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">
                Trainer Approval Workflow
              </CardTitle>
              <CardDescription>
                Configure how trainers are onboarded to your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base font-medium">
                    Require Admin Approval
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New trainers must be approved before accessing the platform
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <Label>Approval SLA (hours)</Label>
                <Select defaultValue="24">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base font-medium">
                    Background Check Required
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require verification documents from trainers
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base font-medium">
                    Auto-assign New Trainers
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign new trainers to available slots
                  </p>
                </div>
                <Switch />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Languages className="w-5 h-5 text-accent" />
                  Language & Units
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Weight Units</Label>
                  <Select defaultValue="kg">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Energy Units</Label>
                  <Select defaultValue="cal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cal">Calories (kcal)</SelectItem>
                      <SelectItem value="kj">Kilojoules (kJ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Sun className="w-5 h-5 text-accent" />
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
                          "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                          theme === option.value
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50",
                        )}
                      >
                        <option.icon
                          className={cn(
                            "w-5 h-5",
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
