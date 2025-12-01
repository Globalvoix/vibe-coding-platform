"use client";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { useAppStore } from "@/lib/app-store";
import { useRouter } from "next/navigation";

export default function AppsPage() {
  const { apps, setCurrentApp } = useAppStore();
  const router = useRouter();

  const handleOpenApp = (id: string) => {
    setCurrentApp(id);
    router.push("/workspace");
  };

  return (
    <>
      <AppSidebar />
      <div className="flex flex-col min-h-screen bg-background p-4 md:p-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              My apps
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse, open, and manage the apps you have created.
            </p>
          </div>
        </header>

        {apps.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground mb-2">
                You have not created any apps yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the prompt bar on the home page or the New App button in the side menu to create your first app.
              </p>
            </div>
          </div>
        ) : (
          <main className="flex-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {apps
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleOpenApp(app.id)}
                    className="flex flex-col items-start text-left rounded-xl border border-border bg-card/80 hover:bg-card shadow-sm hover:shadow-md transition-all p-4 space-y-2 group"
                  >
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground mb-1">
                      App
                    </div>
                    <h2 className="text-sm font-semibold text-foreground truncate w-full">
                      {app.name}
                    </h2>
                    {app.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {app.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between w-full text-[11px] text-muted-foreground">
                      <span>
                        Updated {new Date(app.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Open →
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </main>
        )}
      </div>
    </>
  );
}
