import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { Field, PageHeader, StepBar } from "@/components/kit";
import { toast } from "sonner";
import {
  Bike,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  Footprints,
  IdCard,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro de entregador — Pede pro Kevin" },
      { name: "description", content: "Cadastre-se como entregador: dados pessoais, documentos e disponibilidade." },
      { property: "og:title", content: "Cadastro de entregador — Pede pro Kevin" },
      { property: "og:description", content: "Cadastre-se como entregador: dados pessoais, documentos e disponibilidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CadastroEntregador,
});

const TRANSPORTES = [
  { id: "bicicleta", label: "Bicicleta", icon: Bike },
  { id: "moto", label: "Moto", icon: Zap },
  { id: "carro", label: "Carro", icon: Car },
  { id: "a_pe", label: "A pé", icon: Footprints },
] as const;

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const HORARIOS = ["Manhã (06h - 12h)", "Tarde (12h - 18h)", "Noite (18h - 00h)", "Madrugada (00h - 06h)"];

const DOCS = [
  { key: "doc_frente_url", titulo: "Documento com foto", hint: "RG ou CNH" },
  { key: "doc_selfie_url", titulo: "Foto do rosto", hint: "Selfie segurando o documento" },
  { key: "comprovante_residencia_url", titulo: "Comprovante de residência", hint: "Água, luz ou telefone" },
] as const;

type DocKey = (typeof DOCS)[number]["key"];

function soDigitos(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}
function fmtCpf(v: string) {
  const d = soDigitos(v, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function fmtCep(v: string) {
  const d = soDigitos(v, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function fmtTel(v: string) {
  const d = soDigitos(v, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function CadastroEntregador() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [statusExistente, setStatusExistente] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [f, setF] = useState({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    transporte: "bicicleta",
    regiao_atuacao: "",
    observacoes: "",
  });
  const [dias, setDias] = useState<string[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<DocKey, string | null>>({
    doc_frente_url: null,
    doc_selfie_url: null,
    comprovante_residencia_url: null,
  });

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setCarregando(false);
      setUserId(u.user.id);
      const [{ data: app }, { data: prof }] = await Promise.all([
        supabase.from("courier_applications").select("*").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("profiles").select("nome, telefone, bairro").eq("id", u.user.id).maybeSingle(),
      ]);
      if (app) {
        setStatusExistente(app.status);
        setF((p) => ({
          ...p,
          nome_completo: app.nome_completo ?? "",
          cpf: app.cpf ?? "",
          data_nascimento: app.data_nascimento ?? "",
          telefone: app.telefone ?? "",
          email: app.email ?? "",
          cep: app.cep ?? "",
          endereco: app.endereco ?? "",
          numero: app.numero ?? "",
          complemento: app.complemento ?? "",
          bairro: app.bairro ?? "",
          cidade: app.cidade ?? "",
          estado: app.estado ?? "",
          transporte: app.transporte ?? "bicicleta",
          regiao_atuacao: app.regiao_atuacao ?? "",
          observacoes: app.observacoes ?? "",
        }));
        setDias(app.dias_semana ?? []);
        setHorarios(app.horarios ?? []);
        setDocs({
          doc_frente_url: app.doc_frente_url,
          doc_selfie_url: app.doc_selfie_url,
          comprovante_residencia_url: app.comprovante_residencia_url,
        });
      } else if (prof) {
        setF((p) => ({
          ...p,
          nome_completo: prof.nome ?? "",
          telefone: prof.telefone ?? "",
          bairro: prof.bairro ?? "",
          email: u.user.email?.includes("@telefone.") ? "" : (u.user.email ?? ""),
        }));
      }
      setCarregando(false);
    })();
  }, []);

  async function enviarArquivo(key: DocKey, file: File) {
    if (!userId) return;
    setUploading(key);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) return toast.error("Não foi possível enviar o arquivo.");
    setDocs((p) => ({ ...p, [key]: path }));
    toast.success("Documento anexado.");
  }

  const passo1Ok = f.nome_completo.trim().length > 4 && soDigitos(f.cpf, 11).length === 11 && soDigitos(f.telefone, 11).length >= 10;
  const passo2Ok = f.endereco.trim() && f.cidade.trim() && f.estado.trim();
  const passo3Ok = docs.doc_frente_url && docs.doc_selfie_url && docs.comprovante_residencia_url;
  const passo4Ok = dias.length > 0 && horarios.length > 0;

  async function enviarCadastro() {
    if (!userId) return;
    setEnviando(true);
    const payload = {
      user_id: userId,
      nome_completo: f.nome_completo.trim(),
      cpf: fmtCpf(f.cpf),
      data_nascimento: f.data_nascimento || null,
      telefone: fmtTel(f.telefone),
      email: f.email.trim() || null,
      cep: f.cep || null,
      endereco: f.endereco.trim() || null,
      numero: f.numero.trim() || null,
      complemento: f.complemento.trim() || null,
      bairro: f.bairro.trim() || null,
      cidade: f.cidade.trim() || null,
      estado: f.estado.trim().toUpperCase() || null,
      ...docs,
      transporte: f.transporte,
      dias_semana: dias,
      horarios,
      regiao_atuacao: f.regiao_atuacao.trim() || null,
      observacoes: f.observacoes.trim() || null,
      status: "pendente",
    };
    const { error } = await supabase.from("courier_applications").upsert(payload, { onConflict: "user_id" });
    if (!error) {
      await supabase.from("profiles").update({ tipo: "ambos" as never }).eq("id", userId);
    }
    setEnviando(false);
    if (error) return toast.error(error.message);
    setStatusExistente("pendente");
    toast.success("Cadastro enviado para análise.");
    navigate({ to: "/entregador" });
  }

  if (carregando) {
    return (
      <CourierShell hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </CourierShell>
    );
  }

  return (
    <CourierShell hideNav>
      <header className="px-6 pt-10 pb-2 flex items-center gap-3">
        <button
          onClick={() => (passo > 1 ? setPasso(passo - 1) : navigate({ to: "/entregador" }))}
          className="size-10 rounded-full bg-card border border-border shadow-soft flex items-center justify-center"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center pr-10">Cadastro de entregador</h1>
      </header>

      <div className="px-6 pt-4">
        <StepBar total={4} current={passo} />
        <p className="text-center text-[11px] text-muted-foreground mt-2">Passo {passo} de 4</p>
      </div>

      {statusExistente && (
        <div className="px-6 pt-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-[12px] text-primary font-medium">
            Você já possui um cadastro com situação: <strong>{statusExistente}</strong>. Ao reenviar, os dados serão atualizados.
          </div>
        </div>
      )}

      <div className="px-6 py-6 space-y-5 fade-rise" key={passo}>
        {passo === 1 && (
          <>
            <h2 className="text-xl font-semibold">Seus dados</h2>
            <div className="surface p-4 space-y-4">
              <Field label="Nome completo" required>
                <input value={f.nome_completo} onChange={(e) => set("nome_completo")(e.target.value)} placeholder="Digite seu nome completo" className="field-input" />
              </Field>
              <Field label="CPF" required>
                <input value={fmtCpf(f.cpf)} onChange={(e) => set("cpf")(e.target.value)} inputMode="numeric" placeholder="000.000.000-00" className="field-input" />
              </Field>
              <Field label="Telefone (WhatsApp)" required>
                <input value={fmtTel(f.telefone)} onChange={(e) => set("telefone")(e.target.value)} inputMode="tel" placeholder="(21) 99999-9999" className="field-input" />
              </Field>
              <Field label="Data de nascimento">
                <input type="date" value={f.data_nascimento} onChange={(e) => set("data_nascimento")(e.target.value)} className="field-input" />
              </Field>
              <Field label="E-mail">
                <input type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} placeholder="seu@email.com" className="field-input" />
              </Field>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h2 className="text-xl font-semibold">Endereço</h2>
            <div className="surface p-4 space-y-4">
              <Field label="CEP">
                <input value={fmtCep(f.cep)} onChange={(e) => set("cep")(e.target.value)} inputMode="numeric" placeholder="00000-000" className="field-input" />
              </Field>
              <Field label="Rua" required>
                <input value={f.endereco} onChange={(e) => set("endereco")(e.target.value)} placeholder="Digite o nome da rua" className="field-input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número">
                  <input value={f.numero} onChange={(e) => set("numero")(e.target.value)} placeholder="123" className="field-input" />
                </Field>
                <Field label="Complemento">
                  <input value={f.complemento} onChange={(e) => set("complemento")(e.target.value)} placeholder="Opcional" className="field-input" />
                </Field>
              </div>
              <Field label="Bairro">
                <input value={f.bairro} onChange={(e) => set("bairro")(e.target.value)} placeholder="Digite seu bairro" className="field-input" />
              </Field>
              <div className="grid grid-cols-[1fr_88px] gap-3">
                <Field label="Cidade" required>
                  <input value={f.cidade} onChange={(e) => set("cidade")(e.target.value)} placeholder="Digite sua cidade" className="field-input" />
                </Field>
                <Field label="UF" required>
                  <input value={f.estado} onChange={(e) => set("estado")(e.target.value.slice(0, 2))} placeholder="SP" className="field-input uppercase" />
                </Field>
              </div>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h2 className="text-xl font-semibold">Documentos</h2>
            <p className="text-sm text-muted-foreground -mt-3">Anexe fotos legíveis dos documentos abaixo.</p>
            <div className="space-y-3">
              {DOCS.map((d) => {
                const anexado = Boolean(docs[d.key]);
                return (
                  <label
                    key={d.key}
                    className={`surface p-4 flex items-center gap-3 cursor-pointer transition-colors ${anexado ? "border-success/40 bg-success/5" : ""}`}
                  >
                    <div className={`size-11 rounded-xl flex items-center justify-center border ${anexado ? "bg-success/10 border-success/25 text-success" : "bg-secondary border-border text-muted-foreground"}`}>
                      {anexado ? <CheckCircle2 size={20} /> : <IdCard size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{d.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{anexado ? "Arquivo anexado" : d.hint}</p>
                    </div>
                    <span className="size-10 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
                      {uploading === d.key ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void enviarArquivo(d.key, file);
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-success/10 border border-success/20 rounded-xl p-3">
              <ShieldCheck size={14} className="text-success shrink-0 mt-px" />
              Todos os dados são utilizados exclusivamente para validação da identidade e segurança da plataforma.
            </p>
          </>
        )}

        {passo === 4 && (
          <>
            <h2 className="text-xl font-semibold">Informações de trabalho</h2>
            <div className="surface p-4 space-y-5">
              <div>
                <p className="label-kicker mb-2">Meio de transporte</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {TRANSPORTES.map(({ id, label, icon: Icon }) => {
                    const ativo = f.transporte === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => set("transporte")(id)}
                        className={`h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                          ativo ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"
                        }`}
                      >
                        <Icon size={16} /> {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="label-kicker mb-2">Dias da semana</p>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map((d) => {
                    const ativo = dias.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDias((p) => (ativo ? p.filter((x) => x !== d) : [...p, d]))}
                        className={`px-3.5 h-9 rounded-full text-[12px] font-semibold border transition-colors ${
                          ativo ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="label-kicker mb-2">Horários</p>
                <div className="space-y-2">
                  {HORARIOS.map((h) => {
                    const ativo = horarios.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorarios((p) => (ativo ? p.filter((x) => x !== h) : [...p, h]))}
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <span className={`size-5 rounded-md border-2 flex items-center justify-center ${ativo ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                          {ativo && <CheckCircle2 size={12} />}
                        </span>
                        <span className="text-sm">{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Região de atuação">
                <input value={f.regiao_atuacao} onChange={(e) => set("regiao_atuacao")(e.target.value)} placeholder="Bairros onde você pretende atuar" className="field-input" />
              </Field>

              <Field label="Observações">
                <textarea rows={3} value={f.observacoes} onChange={(e) => set("observacoes")(e.target.value)} placeholder="Conte um pouco sobre você..." className="field-textarea" />
              </Field>
            </div>

            <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-success/10 border border-success/20 rounded-xl p-3">
              <ShieldCheck size={14} className="text-success shrink-0 mt-px" />
              Todos os dados são utilizados exclusivamente para validação da identidade e segurança da plataforma.
            </p>
          </>
        )}

        {passo < 4 ? (
          <button
            onClick={() => setPasso(passo + 1)}
            disabled={(passo === 1 && !passo1Ok) || (passo === 2 && !passo2Ok) || (passo === 3 && !passo3Ok)}
            className="btn-base btn-base-active btn-primary-solid w-full h-14"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={enviarCadastro}
            disabled={enviando || !passo4Ok}
            className="btn-base btn-base-active btn-primary-solid w-full h-14"
          >
            {enviando ? "Enviando..." : "Enviar cadastro"}
          </button>
        )}
        <p className="text-center text-[11px] text-muted-foreground">Cadastro 100% gratuito</p>
      </div>
    </CourierShell>
  );
}
