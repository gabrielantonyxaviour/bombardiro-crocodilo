import { StateCreator } from "zustand";

interface GlobalState {
  worldAddress: string;
  username: string;
  verified: boolean;
  profileUrl: string;
}

interface GlobalActions {
  setWorldAddress: (worldAddress: string) => void;
  setUsername: (username: string) => void;
  setVerified: (verified: boolean) => void;
  setProfileUrl: (profileUrl: string) => void;
}

export type GlobalSlice = GlobalState & GlobalActions;

export const initialGlobalState: GlobalState = {
  worldAddress: "",
  username: "",
  verified: false,
  profileUrl: "",
};

export const createGlobalSlice: StateCreator<
  GlobalSlice,
  [],
  [],
  GlobalSlice
> = (set) => ({
  ...initialGlobalState,
  setWorldAddress: (worldAddress: string) => {
    set({ worldAddress });
  },
  setUsername: (username: string) => {
    set({ username });
  },
  setVerified: (verified: boolean) => {
    set({ verified });
  },
  setProfileUrl: (profileUrl: string) => {
    set({ profileUrl });
  },
});
