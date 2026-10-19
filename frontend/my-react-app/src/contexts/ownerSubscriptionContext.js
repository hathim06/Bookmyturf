import { createContext, useContext } from "react";

const defaultContext = {
  access: null,
  loading: false,
  requireSubscription: () => false,
  refreshSubscriptionAccess: async () => {},
};

export const OwnerSubscriptionContext = createContext(defaultContext);

export function useOwnerSubscription() {
  return useContext(OwnerSubscriptionContext);
}
