import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./components/LoginForm";
import { getStoredToken } from "./services/auth.service";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");

  useEffect(() => {
    if (getStoredToken()) {
      navigate(next ?? "/", { replace: true });
    }
  }, [navigate, next]);

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Acessar painel</CardTitle>
          <CardDescription>Use suas credenciais corporativas.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
