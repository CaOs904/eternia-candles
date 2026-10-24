"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Save,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { formatoCOP, redondearQuinientos } from "../../lib/eternia-engine";

interface FilaProductoDB {
  id: string;
  codigo_ref: string;
  nombre: string;
  categoria: string;
  costo_produccion: number;
  precio_justo: number;
  precio_catalogo: number;
  activo_en_tienda: boolean;
  orden: number;
  updated_at?: string;
}

interface EditValues {
  costo_produccion: string;
  precio_catalogo: string;
}

const COLECCIONES_FILTRO = [
  "TODAS",
  "DÍA DE LAS VELITAS",
  "NAVIDAD",
  "RECORDATORIOS Y EVENTOS",
  "TODA OCASIÓN",
  "VASIJAS DE YESO",
  "HALLOWEEN",
];

export default function PreciosTab() {
  const [filasOriginales, setFilasOriginales] = useState<FilaProductoDB[]>([]);
  const [ediciones, setEdiciones] = useState<Record<string, EditValues>>({});
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [busqueda, setBusqueda] = useState<string>("");
  const [coleccionActiva, setColeccionActiva] = useState<string>("TODAS");
  const [mensajeEstado, setMensajeEstado] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  const cargarProductosSupabase = useCallback(async () => {
    setCargando(true);
    setMensajeEstado(null);

    if (!isSupabaseConfigured) {
      setMensajeEstado({
        tipo: "error",
        texto: "Supabase no está configurado en este entorno.",
      });
      setCargando(false);
      return;
    }

    const { data, error } = await supabase
      .from("productos_velas")
      .select(
        "id, codigo_ref, nombre, categoria, costo_produccion, precio_justo, precio_catalogo, activo_en_tienda, orden, updated_at"
      )
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMensajeEstado({
        tipo: "error",
        texto: `Error al leer productos_velas: ${error.message}`,
      });
      setCargando(false);
      return;
    }

    const lista: FilaProductoDB[] = (data || []).map((row: any) => ({
      id: String(row.id),
      codigo_ref: String(row.codigo_ref || row.id),
      nombre: String(row.nombre || ""),
      categoria: String(row.categoria || ""),
      costo_produccion: Number(row.costo_produccion) || 0,
      precio_justo:
        Number(row.precio_justo) ||
        redondearQuinientos((Number(row.costo_produccion) || 0) * 2),
      precio_catalogo: Number(row.precio_catalogo) || 0,
      activo_en_tienda: Boolean(row.activo_en_tienda),
      orden: Number(row.orden) || 0,
      updated_at: row.updated_at,
    }));

    setFilasOriginales(lista);
    const mapaInicial: Record<string, EditValues> = {};
    lista.forEach((f) => {
      mapaInicial[f.id] = {
        costo_produccion: String(f.costo_produccion),
        precio_catalogo: String(f.precio_catalogo),
      };
    });
    setEdiciones(mapaInicial);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarProductosSupabase();
  }, [cargarProductosSupabase]);

  const actualizarCelda = (
    id: string,
    campo: "costo_produccion" | "precio_catalogo",
    valor: string
  ) => {
    setMensajeEstado(null);
    setEdiciones((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { costo_produccion: "0", precio_catalogo: "0" }),
        [campo]: valor,
      },
    }));
  };

  const filasConEstado = useMemo(() => {
    return filasOriginales.map((orig) => {
      const edit = ediciones[orig.id] || {
        costo_produccion: String(orig.costo_produccion),
        precio_catalogo: String(orig.precio_catalogo),
      };
      const costoNum = Number(edit.costo_produccion);
      const precioNum = Number(edit.precio_catalogo);
      const costoValido = !isNaN(costoNum) && costoNum >= 0 ? Math.round(costoNum) : 0;
      const precioValido = !isNaN(precioNum) && precioNum >= 0 ? Math.round(precioNum) : 0;

      const precioJustoCalc =
        costoValido > 0 ? redondearQuinientos(costoValido * 2) : 0;
      const margenRatio =
        precioValido > 0 ? (precioValido - costoValido) / precioValido : 0;
      const margenPct = Math.round(margenRatio * 100);

      const modificado =
        costoValido !== orig.costo_produccion ||
        precioValido !== orig.precio_catalogo;
      const bajoCosto = precioValido > 0 && precioValido < costoValido;
      const margenBajo = precioValido > 0 && margenRatio < 0.4;

      return {
        ...orig,
        costoInput: edit.costo_produccion,
        precioInput: edit.precio_catalogo,
        costoNuevo: costoValido,
        precioNuevo: precioValido,
        precioJustoNuevo: precioJustoCalc,
        margenRatio,
        margenPct,
        modificado,
        bajoCosto,
        margenBajo,
      };
    });
  }, [filasOriginales, ediciones]);

  const filasModificadas = useMemo(
    () => filasConEstado.filter((f) => f.modificado),
    [filasConEstado]
  );

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filasConEstado.filter((f) => {
      const coincideCol =
        coleccionActiva === "TODAS" || f.categoria === coleccionActiva;
      const coincideBusq =
        !q ||
        f.nombre.toLowerCase().includes(q) ||
        f.codigo_ref.toLowerCase().includes(q);
      return coincideCol && coincideBusq;
    });
  }, [filasConEstado, coleccionActiva, busqueda]);

  const descartarCambios = () => {
    const mapaOriginal: Record<string, EditValues> = {};
    filasOriginales.forEach((f) => {
      mapaOriginal[f.id] = {
        costo_produccion: String(f.costo_produccion),
        precio_catalogo: String(f.precio_catalogo),
      };
    });
    setEdiciones(mapaOriginal);
    setMensajeEstado(null);
  };

  const guardarCambios = async () => {
    if (filasModificadas.length === 0) return;

    const invalidos = filasModificadas.filter(
      (f) =>
        f.costoInput.trim() === "" ||
        f.precioInput.trim() === "" ||
        f.costoNuevo < 0 ||
        f.precioNuevo <= 0
    );
    if (invalidos.length > 0) {
      alert(
        "Revisa los valores editados: todos los costos y precios deben ser números positivos válidos."
      );
      return;
    }

    const conPrecioMenorAlCosto = filasModificadas.filter((f) => f.bajoCosto);
    const avisoBajoCosto =
      conPrecioMenorAlCosto.length > 0
        ? `\n⚠️ ATENCIÓN: ${conPrecioMenorAlCosto.length} producto(s) tienen un precio de catálogo MENOR a su costo de producción (${conPrecioMenorAlCosto
            .map((x) => x.codigo_ref)
            .join(", ")}).\n`
        : "";

    const resumenLineas = filasModificadas
      .slice(0, 12)
      .map(
        (f) =>
          `• ${f.codigo_ref} (${f.nombre}): Costo ${formatoCOP(
            f.costo_produccion
          )} ➔ ${formatoCOP(f.costoNuevo)} | Precio ${formatoCOP(
            f.precio_catalogo
          )} ➔ ${formatoCOP(f.precioNuevo)}`
      )
      .join("\n");

    const extraTexto =
      filasModificadas.length > 12
        ? `\n...y ${filasModificadas.length - 12} referencia(s) más.`
        : "";

    const confirmado = window.confirm(
      `Vas a guardar cambios en ${filasModificadas.length} referencia(s):\n\n${resumenLineas}${extraTexto}${avisoBajoCosto}\n\n¿Confirmas actualizar estos valores en Supabase?`
    );
    if (!confirmado) return;

    setGuardando(true);
    setMensajeEstado(null);

    try {
      const ahoraISO = new Date().toISOString();
      const errores: string[] = [];
      let actualizadasExito = 0;

      for (const fila of filasModificadas) {
        const { data, error } = await supabase
          .from("productos_velas")
          .update({
            costo_produccion: fila.costoNuevo,
            precio_justo: fila.precioJustoNuevo,
            precio_catalogo: fila.precioNuevo,
            updated_at: ahoraISO,
          })
          .eq("id", fila.id)
          .select("id");

        if (error) {
          errores.push(`${fila.codigo_ref}: ${error.message}`);
        } else if (!data || data.length === 0) {
          errores.push(
            `${fila.codigo_ref}: Supabase no actualizó la fila (verifica permisos RLS de administrador).`
          );
        } else {
          actualizadasExito++;
        }
      }

      if (errores.length > 0) {
        setMensajeEstado({
          tipo: "error",
          texto: `No se pudieron guardar todos los cambios (${actualizadasExito} actualizadas, ${errores.length} con error): ${errores[0]}`,
        });
        if (actualizadasExito > 0) {
          await cargarProductosSupabase();
        }
      } else {
        await cargarProductosSupabase();
        setMensajeEstado({
          tipo: "exito",
          texto: `¡Se actualizaron correctamente ${actualizadasExito} referencia(s) en Supabase!`,
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="no-print space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8D5CE] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3ECE1] pb-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#3B2B23] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C89D7C]" /> 7. Editor de Precios y Costos del Catálogo (Supabase)
            </h2>
            <p className="text-xs text-[#7A685F]">
              Edita el costo de producción o el precio de catálogo directamente en cada celda. El Precio Justo se calcula automáticamente (Costo × 2 redondeado a $500).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cargarProductosSupabase}
              disabled={cargando || guardando}
              className="bg-[#FAF6F0] hover:bg-[#F3ECE1] text-[#3B2B23] border border-[#E8D5CE] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C89D7C] ${cargando ? "animate-spin" : ""}`} />
              <span>Recargar panel</span>
            </button>

            <button
              type="button"
              onClick={descartarCambios}
              disabled={filasModificadas.length === 0 || guardando}
              className="bg-white hover:bg-[#FADBD8]/30 text-[#922B21] border border-[#E8D5CE] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              onClick={guardarCambios}
              disabled={filasModificadas.length === 0 || guardando}
              className="bg-[#C89D7C] hover:bg-[#b58967] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {guardando
                  ? "Guardando..."
                  : `Guardar cambios (${filasModificadas.length})`}
              </span>
            </button>
          </div>
        </div>

        {mensajeEstado && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              mensajeEstado.tipo === "exito"
                ? "bg-[#D4EFDF] border-[#196F3D]/30 text-[#196F3D]"
                : "bg-[#FADBD8] border-[#922B21]/30 text-[#922B21]"
            }`}
          >
            {mensajeEstado.tipo === "exito" ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{mensajeEstado.texto}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-3" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código (ej. v-1) o nombre de vela..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-xs focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
            />
          </div>

          <div className="md:col-span-7 flex items-center gap-1.5 overflow-x-auto pb-1">
            {COLECCIONES_FILTRO.map((col) => {
              const activa = coleccionActiva === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColeccionActiva(col)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    activa
                      ? "bg-[#3B2B23] text-[#FAF6F0]"
                      : "bg-[#FAF6F0] text-[#7A685F] hover:bg-[#E8D5CE]/50 border border-[#E8D5CE]"
                  }`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
        {cargando ? (
          <div className="p-10 text-center text-xs text-[#7A685F] font-serif">
            Cargando catálogo desde Supabase...
          </div>
        ) : filasFiltradas.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#7A685F]">
            No se encontraron referencias con ese filtro.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs min-w-[780px]">
            <thead>
              <tr className="bg-[#3B2B23] text-white font-serif tracking-wider">
                <th className="p-3">Código</th>
                <th className="p-3">Nombre de la Referencia</th>
                <th className="p-3">Colección</th>
                <th className="p-3 text-right">Costo Producción</th>
                <th className="p-3 text-right">Precio Justo (×2)</th>
                <th className="p-3 text-right">Precio Catálogo</th>
                <th className="p-3 text-center">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE1]">
              {filasFiltradas.map((fila) => (
                <tr
                  key={fila.id}
                  className={`transition ${
                    fila.modificado
                      ? "bg-[#FCF3CF]/60 hover:bg-[#FCF3CF]"
                      : "hover:bg-[#FAF6F0]"
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-[#3B2B23] whitespace-nowrap">
                    <span>{fila.codigo_ref}</span>
                    {fila.modificado && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#C89D7C] text-white text-[9px] font-sans font-bold uppercase">
                        Editado
                      </span>
                    )}
                  </td>

                  <td className="p-3 font-serif font-bold text-[#3B2B23]">
                    {fila.nombre}
                  </td>

                  <td className="p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F3ECE1] text-[#7A685F] whitespace-nowrap">
                      {fila.categoria}
                    </span>
                  </td>

                  <td className="p-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <span className="text-[#7A685F] font-bold">$</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={fila.costoInput}
                        onChange={(e) =>
                          actualizarCelda(
                            fila.id,
                            "costo_produccion",
                            e.target.value
                          )
                        }
                        className="w-24 px-2.5 py-1.5 rounded-xl bg-[#FAF6F0] border border-[#C89D7C] text-right font-bold text-[#3B2B23] focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
                      />
                    </div>
                  </td>

                  <td className="p-3 text-right font-bold text-[#7A685F] whitespace-nowrap">
                    {formatoCOP(fila.precioJustoNuevo)}
                  </td>

                  <td className="p-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <span className="text-[#7A685F] font-bold">$</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={fila.precioInput}
                        onChange={(e) =>
                          actualizarCelda(
                            fila.id,
                            "precio_catalogo",
                            e.target.value
                          )
                        }
                        className={`w-28 px-2.5 py-1.5 rounded-xl bg-[#FAF6F0] border text-right font-extrabold focus:outline-none focus:ring-2 ${
                          fila.bajoCosto
                            ? "border-[#922B21] text-[#922B21] focus:ring-[#922B21]"
                            : "border-[#C89D7C] text-[#3B2B23] focus:ring-[#C89D7C]"
                        }`}
                      />
                    </div>
                  </td>

                  <td className="p-3 text-center whitespace-nowrap">
                    {fila.bajoCosto ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#FADBD8] text-[#922B21] font-bold text-[10px] inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Bajo el costo ({fila.margenPct}%)
                      </span>
                    ) : fila.margenBajo ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#FADBD8] text-[#922B21] font-bold text-[10px]">
                        🔴 {fila.margenPct}% (&lt;40%)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-[#D4EFDF] text-[#196F3D] font-bold text-[10px]">
                        🟢 {fila.margenPct}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}