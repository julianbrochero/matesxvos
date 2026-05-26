"use client";

import { create } from "zustand";

export type AlertType = "success" | "error" | "warning" | "info";

export type AppAlert = {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  count: number;
  persistent?: boolean;
};

type AlertInput = {
  type: AlertType;
  title: string;
  message?: string;
  persistent?: boolean;
};

type AlertState = {
  alerts: AppAlert[];
  notify: (alert: AlertInput) => void;
  dismiss: (id: string) => void;
};

const MAX_VISIBLE_ALERTS = 4;

function alertId() {
  return crypto.randomUUID();
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  notify: (alert) =>
    set((state) => {
      const repeated = state.alerts.find(
        (item) => item.type === alert.type && item.title === alert.title && item.message === alert.message,
      );

      if (repeated) {
        return {
          alerts: [
            { ...repeated, count: repeated.count + 1, persistent: repeated.persistent || alert.persistent },
            ...state.alerts.filter((item) => item.id !== repeated.id),
          ],
        };
      }

      return {
        alerts: [{ id: alertId(), count: 1, ...alert }, ...state.alerts].slice(0, MAX_VISIBLE_ALERTS),
      };
    }),
  dismiss: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),
}));
