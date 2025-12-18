import React from "react";
import Button from "./Button";

export default function Layout({ children, isAuthenticated, onLogin }: { children: React.ReactNode; isAuthenticated?: boolean; onLogin?: () => void }) {
  return (
    <div className="min-h-screen bg-wood-900 text-wood-100 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Top bar with optional login button */}
      <header className="w-full flex items-center justify-end p-4">
        {!isAuthenticated && (
          <Button variant="secondary" onClick={onLogin}>Log in</Button>
        )}
      </header>

      <div className="flex-grow flex flex-col">
        {children}
      </div>
    </div>
  );
}
