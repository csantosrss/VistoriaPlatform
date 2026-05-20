import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const getVistoriasStats = vi.fn();

vi.mock("@/features/vistorias/services/vistorias.service", () => ({
  getVistoriasStats: () => getVistoriasStats(),
}));

import { DashboardPage } from "./DashboardPage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function kpiValue(title: string): string | null {
  const titleEl = screen.getByText(title);
  // sobe até o Card (ancestral com data-slot ou estrutura conhecida — usa duas subidas)
  const card = titleEl.closest("[class*='rounded']") as HTMLElement;
  if (!card) return null;
  const valueEl = within(card).queryByText(/^\d+$/);
  return valueEl?.textContent ?? null;
}

describe("DashboardPage", () => {
  it("renderiza os 4 KPIs e agrega contagens via /stats", async () => {
    getVistoriasStats.mockResolvedValue({
      total: 10,
      byStatus: {
        SOLICITADA: 1,
        ROTEADA: 2,
        AGENDADA: 1,
        CONFIRMADA: 1,
        EM_EXECUCAO: 3,
        LAUDO_PENDENTE: 0,
        LAUDO_APROVADO: 1,
        CONCLUIDA: 1,
        CANCELADA: 0,
      },
    });

    renderPage();

    expect(screen.getByText("Solicitadas")).toBeInTheDocument();
    expect(screen.getByText("Roteadas")).toBeInTheDocument();
    expect(screen.getByText("Em execução")).toBeInTheDocument();
    expect(screen.getByText("Concluídas")).toBeInTheDocument();

    await waitFor(() => {
      expect(kpiValue("Solicitadas")).toBe("1");
    });
    expect(kpiValue("Roteadas")).toBe("2");
    expect(kpiValue("Em execução")).toBe("5"); // AGENDADA + CONFIRMADA + EM_EXECUCAO
    expect(kpiValue("Concluídas")).toBe("2"); // LAUDO_APROVADO + CONCLUIDA
  });

  it("os 4 KPIs lêem do mesmo agregado (uma fonte única de dados)", async () => {
    getVistoriasStats.mockResolvedValue({
      total: 0,
      byStatus: {
        SOLICITADA: 0,
        ROTEADA: 0,
        AGENDADA: 0,
        CONFIRMADA: 0,
        EM_EXECUCAO: 0,
        LAUDO_PENDENTE: 0,
        LAUDO_APROVADO: 0,
        CONCLUIDA: 0,
        CANCELADA: 0,
      },
    });
    renderPage();
    await waitFor(() => {
      expect(kpiValue("Solicitadas")).toBe("0");
    });
    expect(kpiValue("Roteadas")).toBe("0");
    expect(kpiValue("Em execução")).toBe("0");
    expect(kpiValue("Concluídas")).toBe("0");
  });
});
