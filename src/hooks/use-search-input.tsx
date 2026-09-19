import { useState } from "react";

interface UseSearchInputReturn {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearchDisabled: boolean;
}

export function useSearchInput(openStates: boolean[]): UseSearchInputReturn {
  const [searchQuery, setSearchQuery] = useState("");

  return {
    searchQuery,
    setSearchQuery,
    isSearchDisabled: openStates.some(Boolean),
  };
}

