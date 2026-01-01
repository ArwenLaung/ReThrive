import { createContext } from "react";

export const ScrollContext = createContext({
  scrollToAbout: () => { },
  scrollToEvents: () => { },
});
