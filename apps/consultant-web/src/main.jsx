import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./styles/theme.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./hooks/useSocket.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  </StrictMode>
);
