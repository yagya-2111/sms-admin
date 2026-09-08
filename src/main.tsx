import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { restoreSpaLocation } from "./lib/restoreSpaLocation";
import "./index.css";

restoreSpaLocation();
createRoot(document.getElementById("root")!).render(<App />);
