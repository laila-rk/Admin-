import { supabase } from "@/lib/supabase";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import hexToHsl from "@/lib/hextohsl";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [contrast, setContrast] = useState("normal");
  const [primaryColor, setPrimaryColor] = useState("#1a365d");
  const [accentColor, setAccentColor] = useState("#1c9ebe");

  const {user} = useAuth();

  // Load from localStorage on app start
  useEffect(() => {
    setTheme(localStorage.getItem("app-theme") || "light");
    setFontSize(localStorage.getItem("app-fontSize") || "medium");
    setContrast(localStorage.getItem("app-contrast") || "normal");
    setPrimaryColor(localStorage.getItem("app-primary") || "#1a365d");
    setAccentColor(localStorage.getItem("app-accent") || "#1c9ebe");
  }, []);

  // Apply theme + save whenever changed
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

    const handleAppearance = async() => {
          await supabase.from("admin_appearence").upsert({
            user_id: user.id,
            theme,
            font_size: fontSize,
            contrast,
            primary_color: primaryColor,
            accent_color: accentColor,
            updated_at: new Date().toISOString(),
          });
        }
    
    handleAppearance();
  }, [theme, fontSize, contrast, primaryColor, accentColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        fontSize,
        setFontSize,
        contrast,
        setContrast,
        primaryColor,
        setPrimaryColor,
        accentColor,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
