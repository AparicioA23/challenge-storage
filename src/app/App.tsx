import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import LocalStorageSection from "@/shared/components/LocalStorageSection";
import SessionStorageSection from "@/shared/components/SessionStorageSections";
import { RouteConfig } from "@/features/storage/types/routes";
import CookiesStorageSection from "@/shared/components/CookiesStorageSection";

const StorageManager = lazy(() => import("@features/storage/StorageManager"));

const routes: RouteConfig[] = [
  {
    id: "storage-manager",
    title: "Storage Manager",
    path: "/",
    element: <StorageManager />,
    children: [
      {
        id: "local-storage",
        title: "Local Storage",
        path: "localstorage",
        element: <LocalStorageSection />,
      },
      {
        id: "session-storage",
        title: "Session Storage",
        path: "sessionstorage",
        element: <SessionStorageSection />,
      },
      {
        id: "cookies",
        title: "Cookies",
        path: "cookie",
        element: <CookiesStorageSection />,
      },
      {
        id: "indexed-db",
        title: "Indexed DB",
        path: "indexeddb",
        element: <>Indexed DB</>,
      },
    ],
  },
];

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Gestor de Almacenamiento en Navegador</h1>
        </header>
        <main className="app-main">
          <Suspense fallback={<p role="status">Cargando…</p>}>
            <Routes>
              {routes.map(route => (
                <Route key={route.id} path={route.path} element={route.element}>
                  {route.children?.map(child => (
                    <Route key={child.id} path={child.path} element={child.element} />
                  ))}
                </Route>
              ))}
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
};

export default App;
