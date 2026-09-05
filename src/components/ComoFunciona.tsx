import { useState } from "react";
import { HelpCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

const TELAS = [
  {
    emoji: "👋",
    titulo: "Bem-vindo ao Pede pro Kevin",
    texto: "Uma plataforma para conectar pessoas que precisam de ajuda com entregadores da região.",
  },
  {
    emoji: "📝",
    titulo: "Crie seu pedido",
    texto: "Descreva exatamente o que você precisa.",
  },
  {
    emoji: "💰",
    titulo: "Informe sua proposta",
    texto: "Diga quanto pretende pagar pela entrega. O valor poderá ser negociado posteriormente.",
  },
  {
    emoji: "💬",
    titulo: "Converse diretamente",
    texto: "Após um entregador aceitar seu pedido, vocês poderão combinar todos os detalhes.",
  },
  {
    emoji: "⭐",
    titulo: "Receba e avalie",
    texto: "Após a conclusão, finalize o pedido e avalie a experiência.",
  },
];

export function ComoFunciona() {
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const tela = TELAS[i];

  function fechar() {
    setAberto(false);
    setI(0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
      >
        <HelpCircle size={13} /> Como usar o app
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-soft fade-rise">
            <div className="flex justify-between items-start">
              <span className="label-kicker">
                Passo {i + 1} de {TELAS.length}
              </span>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="size-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="py-6 text-center">
              <div className="text-4xl">{tela.emoji}</div>
              <h2 className="mt-4 text-lg font-semibold">{tela.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tela.texto}</p>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-5">
              {TELAS.map((t, idx) => (
                <span
                  key={t.titulo}
                  className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setI(i - 1)}
                  className="btn-base btn-base-active btn-soft flex-1"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              )}
              <button
                type="button"
                onClick={() => (i < TELAS.length - 1 ? setI(i + 1) : fechar())}
                className="btn-base btn-base-active bg-primary text-primary-foreground flex-1"
              >
                {i < TELAS.length - 1 ? (
                  <>
                    Próximo <ChevronRight size={16} />
                  </>
                ) : (
                  "Entendi"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
