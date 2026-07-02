"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LocationName = "Buenos Aires" | "Villa Maria";
export type LocationFilter = "todos" | LocationName;

export const LOCATIONS: LocationName[] = ["Buenos Aires", "Villa Maria"];

type LocationFilterState = {
  locationFilter: LocationFilter;
  setLocationFilter: (value: LocationFilter) => void;
};

export const useLocationFilterStore = create<LocationFilterState>()(
  persist(
    (set) => ({
      locationFilter: "todos",
      setLocationFilter: (value) => set({ locationFilter: value }),
    }),
    { name: "mates-x-vos-location-filter" },
  ),
);
