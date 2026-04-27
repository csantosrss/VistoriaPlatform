import { Database, MailQuestion, RadioTower, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthIndicatorEntry } from "../types";

const ICONS: Record<string, typeof Database> = {
  database: Database,
  redis: Server,
  rabbitmq: RadioTower,
};

interface Props {
  name: string;
  entry: HealthIndicatorEntry;
}

export function HealthCard({ name, entry }: Props) {
  const Icon = ICONS[name] ?? MailQuestion;
  const up = entry.status === "up";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base capitalize">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {name}
        </CardTitle>
        <Badge variant={up ? "success" : "destructive"}>
          {up ? "UP" : "DOWN"}
        </Badge>
      </CardHeader>
      <CardContent>
        {entry.message ? (
          <p className="text-xs text-muted-foreground">{entry.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {up ? "Respondendo normalmente." : "Sem resposta."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
