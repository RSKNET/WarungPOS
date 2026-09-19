import { create } from "zustand";
import { Unit } from "@/types/unit";
import {
  getUnits,
  addUnit as dbAddUnit,
  updateUnit as dbUpdateUnit,
  deleteUnit as dbDeleteUnit,
} from "@/database/units";

interface UnitState {
  units: Unit[];
  loadUnits: () => void;
  addUnit: (name: string) => Unit | null;
  updateUnit: (id: string, name: string) => Unit | null;
  deleteUnit: (id: string) => boolean;
}

export const useUnitStore = create<UnitState>((set) => ({
  units: getUnits(),

  loadUnits: () => {
    set({ units: getUnits() });
  },

  addUnit: (name) => {
    const result = dbAddUnit(name);
    if (result) {
      set({ units: getUnits() });
    }
    return result;
  },

  updateUnit: (id, name) => {
    const result = dbUpdateUnit(id, name);
    if (result) {
      set({ units: getUnits() });
    }
    return result;
  },

  deleteUnit: (id) => {
    const ok = dbDeleteUnit(id);
    if (ok) {
      set({ units: getUnits() });
    }
    return ok;
  },
}));

