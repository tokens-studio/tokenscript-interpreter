import { Provider } from "jotai";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
