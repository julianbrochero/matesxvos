"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AppAlert, type AlertType, useAlertStore } from "@/lib/alerts";

const alertStyles: Record<AlertType, { icon: typeof CheckCircle2; shell: string; iconClass: string; progress: string }> = {
  success: {
    icon: CheckCircle2,
    shell: "border-emerald-200 bg-emerald-50 text-emerald-950",
    iconClass: "text-emerald-600",
    progress: "bg-emerald-500",
  },
  error: {
    icon: CircleX,
    shell: "border-red-200 bg-red-50 text-red-950",
    iconClass: "text-red-600",
    progress: "bg-red-500",
  },
  warning: {
    icon: TriangleAlert,
    shell: "border-amber-200 bg-amber-50 text-amber-950",
    iconClass: "text-amber-600",
    progress: "bg-amber-500",
  },
  info: {
    icon: Info,
    shell: "border-sky-200 bg-sky-50 text-sky-950",
    iconClass: "text-sky-600",
    progress: "bg-sky-500",
  },
};

export function AlertToaster() {
  const alerts = useAlertStore((state) => state.alerts);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[70] mx-auto flex w-full max-w-md flex-col gap-2 px-3 sm:left-auto sm:right-4 sm:mx-0 sm:max-w-sm sm:px-0"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <Toast key={alert.id} alert={alert} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ alert }: { alert: AppAlert }) {
  const dismiss = useAlertStore((state) => state.dismiss);
  const styles = alertStyles[alert.type];
  const Icon = styles.icon;
  const duration = alert.type === "error" || alert.persistent ? 5000 : 3600;

  useEffect(() => {
    if (alert.persistent) return;
    const timeout = window.setTimeout(() => dismiss(alert.id), duration);
    return () => window.clearTimeout(timeout);
  }, [alert.id, alert.persistent, dismiss, duration]);

  return (
    <motion.div
      role={alert.type === "error" ? "alert" : "status"}
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "pointer-events-auto overflow-hidden rounded-xl border shadow-lg shadow-slate-900/10 backdrop-blur transition hover:shadow-xl",
        styles.shell,
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", styles.iconClass)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold leading-5">
              {alert.title}
              {alert.count > 1 ? <span className="ml-1 text-xs font-medium opacity-70">x{alert.count}</span> : null}
            </p>
          </div>
          {alert.message ? <p className="mt-0.5 text-sm leading-5 opacity-80">{alert.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => dismiss(alert.id)}
          className="rounded-md p-1 opacity-70 outline-none transition hover:bg-white/60 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!alert.persistent ? (
        <motion.div
          className={cn("h-0.5 origin-left", styles.progress)}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      ) : null}
    </motion.div>
  );
}
