import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Borehole {
  id: string;
  name: string;
  depth: string;
  location: string;
}

interface BoreholeContextType {
  boreholes: Borehole[];
  activeBoreholeId: string;
  setActiveBoreholeId: (id: string) => void;
  addBorehole: () => void;
  removeBorehole: (id: string) => void;
  updateBorehole: (id: string, data: Partial<Omit<Borehole, "id">>) => void;
}

const BoreholeContext = createContext<BoreholeContextType>({
  boreholes: [],
  activeBoreholeId: "",
  setActiveBoreholeId: () => {},
  addBorehole: () => {},
  removeBorehole: () => {},
  updateBorehole: () => {},
});

export const useBorehole = () => useContext(BoreholeContext);

let nextId = 3;

export const BoreholeProvider = ({ children }: { children: ReactNode }) => {
  const [boreholes, setBoreholes] = useState<Borehole[]>([
    { id: "bh-1", name: "BH-1", depth: "", location: "" },
  ]);
  const [activeBoreholeId, setActiveBoreholeId] = useState("bh-1");

  const addBorehole = useCallback(() => {
    const id = `bh-${nextId++}`;
    const name = `BH-${nextId - 1}`;
    setBoreholes(prev => [...prev, { id, name, depth: "", location: "" }]);
    setActiveBoreholeId(id);
  }, []);

  const removeBorehole = useCallback((id: string) => {
    setBoreholes(prev => {
      const next = prev.filter(b => b.id !== id);
      if (next.length === 0) return prev; // keep at least one
      return next;
    });
    setActiveBoreholeId(prev => {
      const remaining = boreholes.filter(b => b.id !== id);
      if (remaining.length === 0) return prev;
      if (prev === id) return remaining[0].id;
      return prev;
    });
  }, [boreholes]);

  const updateBorehole = useCallback((id: string, data: Partial<Omit<Borehole, "id">>) => {
    setBoreholes(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  }, []);

  return (
    <BoreholeContext.Provider value={{ boreholes, activeBoreholeId, setActiveBoreholeId, addBorehole, removeBorehole, updateBorehole }}>
      {children}
    </BoreholeContext.Provider>
  );
};
