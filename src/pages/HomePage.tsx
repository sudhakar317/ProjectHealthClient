import { useAuth } from "@/auth/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Home" />
      <Card className="p-6">
        <p className="font-medium">Signed in as {user?.role === "ADMIN" ? "admin" : "doctor"}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </Card>
    </>
  );
}
