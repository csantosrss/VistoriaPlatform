import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./components/LoginForm";

export function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Acessar painel</CardTitle>
          <CardDescription>
            Use suas credenciais corporativas. O endpoint{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              POST /api/v1/auth/login
            </code>{" "}
            será entregue pelo BE Sprint 03+.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
