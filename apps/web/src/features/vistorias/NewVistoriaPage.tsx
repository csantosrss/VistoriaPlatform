import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VistoriaForm } from "./components/VistoriaForm";

export function NewVistoriaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/vistorias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Nova vistoria</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da solicitação</CardTitle>
          <CardDescription>
            Cria a vistoria em status SOLICITADA. O roteamento para parceiro
            acontece em sprint seguinte do BE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VistoriaForm />
        </CardContent>
      </Card>
    </div>
  );
}
