import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import { useUserProfile } from "../../../services/auth/AuthQueries";

export const useDashboardHome = () => {
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const { data: accounts, isLoading: isAccountsLoading } = useBrokerAccounts();

  return {
    profile,
    accounts,
    isLoading: isProfileLoading || isAccountsLoading,
  };
};
