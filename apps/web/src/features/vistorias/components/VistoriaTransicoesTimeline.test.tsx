import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const getVistoriaTransicoes = vi.fn();

vi.mock("../services/vistorias.service", () => ({
  getVistoriaTransicoes: (id: string) => getVistoriaTransicoes(id),
}));

import { VistoriaTransicoesTimeline } from "./VistoriaTransicoesTimeline";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const baseTransicao = {
  id: "11111111-1111-4111-8111-111111111111",
  vistoriaId: "22222222-2222-4222-8222-222222222222",
  tenantId: "33333333-3333-4333-8333-333333333333",
  executadoPor: null,
  correlationId: null,
  createdAt: "2026-05-20T10:00:00.000Z",
};

describe("VistoriaTransicoesTimeline", () => {
  it("renderiza transições com transição de->para e motivo", async () => {
    getVistoriaTransicoes.mockResolvedValueOnce({
      data: [
        {
          ...baseTransicao,
          id: "t-1",
          de: null,
          para: "SOLICITADA",
          motivo: null,
        },
        {
          ...baseTransicao,
          id: "t-2",
          de: "SOLICITADA",
          para: "ROTEADA",
          motivo: "UF SP → rede-vistorias",
        },
      ],
    });

    renderWithClient(<VistoriaTransicoesTimeline id="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Solicitada")).toBeInTheDocument();
    });
    expect(screen.getByText(/Solicitada → Roteada/)).toBeInTheDocument();
    expect(screen.getByText(/UF SP → rede-vistorias/)).toBeInTheDocument();
  });

  it("mostra mensagem vazia quando não há transições", async () => {
    getVistoriaTransicoes.mockResolvedValueOnce({ data: [] });
    renderWithClient(<VistoriaTransicoesTimeline id="v-2" />);
    await waitFor(() => {
      expect(
        screen.getByText("Nenhuma transição registrada ainda."),
      ).toBeInTheDocument();
    });
  });
});
