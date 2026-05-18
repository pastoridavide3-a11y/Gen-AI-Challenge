"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { profiles, Profile } from "@/lib/mock-data";

type ProfileContextType = {
  currentProfile: Profile;
  setCurrentProfileId: (id: string) => void;
  allProfiles: Profile[];
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfileId, setCurrentProfileId] = useState("marco");
  
  const currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];
  
  return (
    <ProfileContext.Provider
      value={{
        currentProfile,
        setCurrentProfileId,
        allProfiles: profiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
