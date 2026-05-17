import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { navigateToAdmin } from "@/lib/adminUrl";
import DashboardHome from "./dashboard/DashboardHome";

const Dashboard = () => {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      navigateToAdmin("/auth");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardHome />;
};

export default Dashboard;
