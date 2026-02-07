/*import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);*/

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId="403804150374-edu134n6okjj91d9cmnnt6tt6f0cjsr7.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
