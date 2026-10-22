"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  PlusCircle,
  FileText,
  Package,
  ShoppingCart,
  Printer,
  CheckCircle,
  Trash2,
  ArrowLeft,
  Lock,
  Mail,
  KeyRound,
  LogOut,
  Flame,
  TrendingUp,
  Crown,
  Eye,
  EyeOff,
  MessageCircle,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  CATALOGO_INICIAL_VELAS,
  INSUMOS_INICIALES,
  TARIFAS_EMPAQUE_DEFAULT,
  ProductoVela,
  InsumoItem,
  PedidoCompleto,
  PedidoItemDetalle,
  formatoCOP,
  redondearCentena,
  calcularCosteoVela,
  calcularCostoVasijaYeso,
  calcularFechaEntregaHabil,
} from "../../lib/eternia-engine";

export interface AromaAdminItem {
  id: string;
  nombre: string;
  notas: string;
  disponible: boolean;
}

const AROMAS_INICIALES_ADMIN: AromaAdminItem[] = [
  { id: "vainilla", nombre: "Vainilla Francesa", notas: "Dulce, cálida y acogedora", disponible: true },
  { id: "frutos-rojos", nombre: "Frutos Rojos & Moras", notas: "Vibrante, frutal y envolvente", disponible: true },
  { id: "lavanda", nombre: "Lavanda Relajante", notas: "Floral, herbal y calmante", disponible: true },
  { id: "canela", nombre: "Canela & Especias", notas: "Hogar, calidez y notas especiadas", disponible: true },
  { id: "pino", nombre: "Pino Nórdico", notas: "Bosque fresco y madera invernal", disponible: true },
  { id: "coco-sandalo", nombre: "Coco & Sándalo", notas: "Cremoso, exótico y amaderado", disponible: true },
  { id: "maracuya", nombre: "Maracuyá Tropical", notas: "Cítrico, alegre y refrescante", disponible: true },
  { id: "bambu", nombre: "Bambú & Té Verde", notas: "Limpio, botánico y sereno", disponible: false },
];

const ESTADOS_FABRICACION = [
  "Pendiente Anticipo",
  "En Producción (Abono 50%)",
  "Fundición y Vertido",
  "Curado y Acabado",
  "Listo para Entrega",
];

function extraerDetallesOrigenAdmin(origenRaw?: string) {
  const base = {
    canal: origenRaw || "Tienda Web",
    empaque: "Clásico Artesanal",
    tieneDedicatoria: false,
    para: "",
    de: "",
    mensaje: "",
    itemsRespaldo: [] as PedidoItemDetalle[],
  };
  if (!origenRaw || !origenRaw.includes("||")) return base;

  const partes = origenRaw.split("||").map((s) => s.trim());
  base.canal = partes[0] || "Tienda Web";
  partes.forEach((p) => {
    if (p.startsWith("Empaque:")) base.empaque = p.replace("Empaque:", "").trim();
    if (p.startsWith("Para:")) base.para = p.replace("Para:", "").trim();
    if (p.startsWith("De:")) base.de = p.replace("De:", "").trim();
    if (p.startsWith("Msg:")) {
      base.mensaje = p.replace("Msg:", "").trim();
      if (base.mensaje) base.tieneDedicatoria = true;
    }
    if (p.startsWith("ItemsJSON:")) {
      try {
        const jsonStr = p.replace("ItemsJSON:", "").trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) base.itemsRespaldo = parsed;
      } catch (e) {
        console.error(e);
      }
    }
  });
  return base;
}

function reconstruirItemsSiVacio(p: any, catalogo: ProductoVela[]): PedidoItemDetalle[] {
  const valor = Number(p.valor_total) || 0;
  if (valor <= 0) return [];

  const cera = Number(p.cera_total_g) || 0;
  const prodExacto =
    catalogo.find((c) => c.precio_catalogo === valor && (cera === 0 || c.cera_g === cera)) ||
    catalogo.find((c) => c.precio_catalogo === valor);

  if (prodExacto) {
    return [
      {
        producto_nombre: prodExacto.nombre,
        cantidad: 1,
        precio_unitario: prodExacto.precio_catalogo,
        costo_unitario: prodExacto.costo_produccion,
        cera_unitaria_g: prodExacto.cera_g,
        fragancia_unitaria_ml: prodExacto.fragancia_ml,
        pabilo_unitario_cm: prodExacto.pabilo_cm,
        tipo_empaque: prodExacto.tipo_empaque,
        subtotal: valor,
      },
    ];
  }

  const prodDivisible = catalogo.find((c) => c.precio_catalogo > 0 && valor % c.precio_catalogo === 0);
  if (prodDivisible) {
    const cant = Math.max(1, Math.round(valor / prodDivisible.precio_catalogo));
    return [
      {
        producto_nombre: prodDivisible.nombre,
        cantidad: cant,
        precio_unitario: prodDivisible.precio_catalogo,
        costo_unitario: prodDivisible.costo_produccion,
        cera_unitaria_g: prodDivisible.cera_g,
        fragancia_unitaria_ml: prodDivisible.fragancia_ml,
        pabilo_unitario_cm: prodDivisible.pabilo_cm,
        tipo_empaque: prodDivisible.tipo_empaque,
        subtotal: valor,
      },
    ];
  }

  return [
    {
      producto_nombre: `Pedido de Velas Artesanales (${cera > 0 ? `${cera}g cera` : "Eternia"})`,
      cantidad: 1,
      precio_unitario: valor,
      costo_unitario: Number(p.costo_total) || 0,
      cera_unitaria_g: cera,
      fragancia_unitaria_ml: Number(p.fragancia_total_ml) || 0,
      pabilo_unitario_cm: Number(p.pabilo_total_cm) || 0,
      tipo_empaque: "Clásico Artesanal",
      subtotal: valor,
    },
  ];
}

function SelloGaticoCriolloTarjeta() {
  return (
    <svg width="56" height="46" viewBox="0 0 64 50" fill="none" className="mx-auto">
      <path d="M15 24 L11 10 L24 17 Z" fill="#E67E22" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 21 L13 13 L21 17 Z" fill="#F5B7B1" />
      <path d="M49 24 L53 10 L40 17 Z" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
      <path d="M48 16 L53 10 L44 15 Z" fill="#D35400" />
      <path d="M49 21 L51 13 L43 17 Z" fill="#F5B7B1" />
      <ellipse cx="32" cy="27" rx="18" ry="14" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2.2" />
      <path d="M14 25 C14 17, 23 13, 31 14 C27 19, 23 24, 15 28 Z" fill="#E67E22" />
      <ellipse cx="19" cy="30" rx="3" ry="1.8" fill="#F5B7B1" />
      <ellipse cx="45" cy="30" rx="3" ry="1.8" fill="#F5B7B1" />
      <circle cx="24" cy="26.5" r="2.6" fill="#3B2B23" />
      <circle cx="40" cy="26.5" r="2.6" fill="#3B2B23" />
      <polygon points="30.5,29 33.5,29 32,31" fill="#E67E22" />
      <path d="M29 32.5 Q30.5 34.5 32 32.5 Q33.5 34.5 35 32.5" stroke="#3B2B23" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function AdminEterniaPage() {
  const [sesionVerificada, setSesionVerificada] = useState<boolean>(false);
  const [cargandoAuth, setCargandoAuth] = useState<boolean>(true);
  const [emailLogin, setEmailLogin] = useState<string>("");
  const [passwordLogin, setPasswordLogin] = useState<string>("");
  const [errorLogin, setErrorLogin] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<"POS" | "PEDIDOS" | "FINANZAS" | "RECIBO" | "MOLDES" | "INVENTARIO">("POS");
  const [productos, setProductos] = useState<ProductoVela[]>(CATALOGO_INICIAL_VELAS);
  const [idsOcultos, setIdsOcultos] = useState<string[]>([]);
  const [insumos, setInsumos] = useState<InsumoItem[]>(INSUMOS_INICIALES);
  const [tarifasEmpaque, setTarifasEmpaque] = useState<Record<string, number>>(TARIFAS_EMPAQUE_DEFAULT);
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [aromasStock, setAromasStock] = useState<AromaAdminItem[]>(AROMAS_INICIALES_ADMIN);
  const [nuevoAromaNombre, setNuevoAromaNombre] = useState<string>("");
  const [nuevoAromaNotas, setNuevoAromaNotas] = useState<string>("");

  const [posProductoId, setPosProductoId] = useState<string>(CATALOGO_INICIAL_VELAS[0].id);
  const [posCantidad, setPosCantidad] = useState<number>(1);
  const [posItems, setPosItems] = useState<{ producto: ProductoVela; cantidad: number }[]>([]);
  const [posDescuentoPct, setPosDescuentoPct] = useState<number>(0);
  const [posClienteNombre, setPosClienteNombre] = useState<string>("");
  const [posClienteWhatsapp, setPosClienteWhatsapp] = useState<string>("");
  const [posAprobado, setPosAprobado] = useState<boolean>(true);

  const [codigoReciboSeleccionado, setCodigoReciboSeleccionado] = useState<string>("PED-001");
  const [modoImpresionRecibo, setModoImpresionRecibo] = useState<"AMBOS" | "SOLO_RECIBO" | "SOLO_TARJETA">("AMBOS");

  const [nuevoNombreVela, setNuevoNombreVela] = useState<string>("");
  const [nuevaCatVela, setNuevaCatVela] = useState<ProductoVela["categoria"]>("NAVIDAD");
  const [nuevaCantVelas, setNuevaCantVelas] = useState<number>(1);
  const [nuevaCeraG, setNuevaCeraG] = useState<number>(120);
  const [nuevoPabiloCm, setNuevoPabiloCm] = useState<number>(12);
  const [nuevoEmpaque, setNuevoEmpaque] = useState<string>("Caja Molde");
  const [nuevoPrecioCatManual, setNuevoPrecioCatManual] = useState<number>(0);
  const [nuevaDescVela, setNuevaDescVela] = useState<string>("");

  const [nombreNuevaVasija, setNombreNuevaVasija] = useState<string>("");
  const [vasosYeso, setVasosYeso] = useState<number>(3);
  const [vasosCemento, setVasosCemento] = useState<number>(1);
  const [vasosAgua, setVasosAgua] = useState<number>(2);

  useEffect(() => {
    async function verificarSesion() {
      if (!isSupabaseConfigured) {
        setSesionVerificada(true);
        setCargandoAuth(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setSesionVerificada(true);
      setCargandoAuth(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSesionVerificada(!!session);
      });
      return () => subscription.unsubscribe();
    }
    verificarSesion();
  }, []);

  const iniciarSesionAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin(null);
    if (!isSupabaseConfigured) {
      alert("Supabase no está configurado correctamente en el entorno.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: emailLogin.trim(),
      password: passwordLogin,
    });
    if (error) {
      setErrorLogin("Correo o contraseña incorrectos. Verifica tus credenciales.");
    } else {
      setSesionVerificada(true);
    }
  };

  const cerrarSesionAdmin = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSesionVerificada(false);
    setEmailLogin("");
    setPasswordLogin("");
  };

  useEffect(() => {
    if (!sesionVerificada) return;

    let catalogoParaCalculo = CATALOGO_INICIAL_VELAS;
    const catLocal = localStorage.getItem("eternia_catalogo_v1");
    if (catLocal) {
      try {
        const parsedCat = JSON.parse(catLocal);
        if (Array.isArray(parsedCat) && parsedCat.length > 0) {
          catalogoParaCalculo = parsedCat;
          setProductos(parsedCat);
        }
      } catch (e) { console.error(e); }
    }

    const ocultosLocal = localStorage.getItem("eternia_ocultos_v1");
    if (ocultosLocal) {
      try { setIdsOcultos(JSON.parse(ocultosLocal)); } catch (e) { console.error(e); }
    }

    async function cargarPedidosDesdeNube() {
      if (isSupabaseConfigured) {
        const { data: pedData, error } = await supabase
          .from("pedidos")
          .select("*, pedido_items(*)")
          .order("fecha_pedido", { ascending: false });

        if (!error && pedData) {
          const filaAromas = pedData.find((p: any) => p.codigo === "CFG-AROMAS");
          if (filaAromas && filaAromas.origen) {
            try {
              const parsedAr = JSON.parse(filaAromas.origen);
              if (Array.isArray(parsedAr) && parsedAr.length > 0) {
                setAromasStock(parsedAr);
                localStorage.setItem("eternia_aromas_v1", JSON.stringify(parsedAr));
              }
            } catch (e) { console.error(e); }
          }

          const filaOcultos = pedData.find((p: any) => p.codigo === "CFG-OCULTOS");
          if (filaOcultos && filaOcultos.origen) {
            try {
              const parsedOc = JSON.parse(filaOcultos.origen);
              if (Array.isArray(parsedOc)) {
                setIdsOcultos(parsedOc);
                localStorage.setItem("eternia_ocultos_v1", JSON.stringify(parsedOc));
              }
            } catch (e) { console.error(e); }
          }

          const pedidosReales = pedData.filter((p: any) => !String(p.codigo || "").startsWith("CFG-"));
          const pedidosMapeados: PedidoCompleto[] = pedidosReales.map((p: any) => {
            const infoOrigen = extraerDetallesOrigenAdmin(p.origen);
            const itemsDeTabla: PedidoItemDetalle[] = (p.pedido_items || []).map((it: any) => ({
              producto_nombre: it.producto_nombre,
              cantidad: it.cantidad,
              precio_unitario: it.precio_unitario,
              costo_unitario: it.costo_unitario,
              cera_unitaria_g: it.cera_unitaria_g,
              fragancia_unitaria_ml: it.fragancia_unitaria_ml,
              pabilo_unitario_cm: it.pabilo_unitario_cm ?? it.pabilo_unitaria_cm ?? 0,
              tipo_empaque: it.tipo_empaque || "Clásico Artesanal",
              subtotal: it.subtotal,
            }));

            const itemsFinales =
              itemsDeTabla.length > 0
                ? itemsDeTabla
                : infoOrigen.itemsRespaldo.length > 0
                ? infoOrigen.itemsRespaldo
                : reconstruirItemsSiVacio(p, catalogoParaCalculo);

            return {
              id: p.id,
              codigo: p.codigo,
              cliente_nombre: p.cliente_nombre,
              cliente_whatsapp: p.cliente_whatsapp,
              aprobado: p.aprobado,
              descuento_pct: p.descuento_pct || 0,
              valor_total: p.valor_total,
              costo_total: p.costo_total,
              abono_50: p.abono_50,
              dinero_recibido: p.dinero_recibido || 0,
              ganancia_libre: p.ganancia_libre,
              cera_total_g: p.cera_total_g,
              fragancia_total_ml: p.fragancia_total_ml,
              pabilo_total_cm: p.pabilo_total_cm,
              medio_pago: p.medio_pago,
              estado: p.estado,
              origen: p.origen,
              fecha_pedido: p.fecha_pedido,
              fecha_entrega: p.fecha_entrega,
              items: itemsFinales,
            };
          });

          setPedidos(pedidosMapeados);
          localStorage.setItem("eternia_pedidos_v1", JSON.stringify(pedidosMapeados));
          if (pedidosMapeados.length > 0) {
            setCodigoReciboSeleccionado(pedidosMapeados[0].codigo);
          }
          return;
        }
      }

      const pedLocalAdmin = localStorage.getItem("eternia_pedidos_v1");
      if (pedLocalAdmin) {
        try {
          const parsed = JSON.parse(pedLocalAdmin);
          setPedidos(parsed);
          if (parsed.length > 0) setCodigoReciboSeleccionado(parsed[0].codigo);
        } catch (e) { console.error(e); }
      }
    }

    cargarPedidosDesdeNube();

    const aromasLocal = localStorage.getItem("eternia_aromas_v1");
    if (aromasLocal) {
      try { setAromasStock(JSON.parse(aromasLocal)); } catch (e) { console.error(e); }
    }
    const empLocal = localStorage.getItem("eternia_empaques_v1");
    if (empLocal) {
      try { setTarifasEmpaque(JSON.parse(empLocal)); } catch (e) { console.error(e); }
    }
    const insLocal = localStorage.getItem("eternia_insumos_v1");
    if (insLocal) {
      try { setInsumos(JSON.parse(insLocal)); } catch (e) { console.error(e); }
    }
  }, [sesionVerificada]);

  const guardarPedidos = (nuevos: PedidoCompleto[]) => {
    setPedidos(nuevos);
    localStorage.setItem("eternia_pedidos_v1", JSON.stringify(nuevos));
  };

  const sincronizarAromasNube = async (nuevaLista: AromaAdminItem[]) => {
    setAromasStock(nuevaLista);
    localStorage.setItem("eternia_aromas_v1", JSON.stringify(nuevaLista));

    if (isSupabaseConfigured) {
      const hoy = new Date().toISOString().split("T")[0];
      const { data: existente } = await supabase.from("pedidos").select("id").eq("codigo", "CFG-AROMAS").maybeSingle();
      if (existente && existente.id) {
        await supabase.from("pedidos").update({ origen: JSON.stringify(nuevaLista) }).eq("id", existente.id);
      } else {
        await supabase.from("pedidos").insert({
          codigo: "CFG-AROMAS",
          cliente_nombre: "CONFIG_AROMAS",
          cliente_whatsapp: "000",
          aprobado: false,
          descuento_pct: 0,
          valor_total: 0,
          costo_total: 0,
          abono_50: 0,
          dinero_recibido: 0,
          ganancia_libre: 0,
          cera_total_g: 0,
          fragancia_total_ml: 0,
          pabilo_total_cm: 0,
          medio_pago: "Nequi",
          estado: "Sistema",
          origen: JSON.stringify(nuevaLista),
          fecha_pedido: hoy,
          fecha_entrega: hoy,
        });
      }
    }
  };

  const alternarVisibilidadVelaTienda = async (idProd: string) => {
    const nuevaListaOcultos = idsOcultos.includes(idProd)
      ? idsOcultos.filter((id) => id !== idProd)
      : [...idsOcultos, idProd];

    setIdsOcultos(nuevaListaOcultos);
    localStorage.setItem("eternia_ocultos_v1", JSON.stringify(nuevaListaOcultos));

    if (isSupabaseConfigured) {
      const hoy = new Date().toISOString().split("T")[0];
      const { data: existente } = await supabase.from("pedidos").select("id").eq("codigo", "CFG-OCULTOS").maybeSingle();
      if (existente && existente.id) {
        await supabase.from("pedidos").update({ origen: JSON.stringify(nuevaListaOcultos) }).eq("id", existente.id);
      } else {
        await supabase.from("pedidos").insert({
          codigo: "CFG-OCULTOS",
          cliente_nombre: "CONFIG_OCULTOS",
          cliente_whatsapp: "000",
          aprobado: false,
          descuento_pct: 0,
          valor_total: 0,
          costo_total: 0,
          abono_50: 0,
          dinero_recibido: 0,
          ganancia_libre: 0,
          cera_total_g: 0,
          fragancia_total_ml: 0,
          pabilo_total_cm: 0,
          medio_pago: "Nequi",
          estado: "Sistema",
          origen: JSON.stringify(nuevaListaOcultos),
          fecha_pedido: hoy,
          fecha_entrega: hoy,
        });
      }
    }
  };

  const alternarDisponibilidadAroma = (id: string) => {
    sincronizarAromasNube(aromasStock.map((a) => (a.id === id ? { ...a, disponible: !a.disponible } : a)));
  };

  const agregarNuevoAroma = () => {
    if (!nuevoAromaNombre.trim()) return;
    const nuevo: AromaAdminItem = {
      id: `ar-${Date.now()}`,
      nombre: nuevoAromaNombre.trim(),
      notas: nuevoAromaNotas.trim() || "Esencia natural artesanal Eternia",
      disponible: true,
    };
    sincronizarAromasNube([...aromasStock, nuevo]);
    setNuevoAromaNombre("");
    setNuevoAromaNotas("");
  };

  const eliminarAroma = (id: string) => {
    sincronizarAromasNube(aromasStock.filter((a) => a.id !== id));
  };

  const eliminarPedido = async (id: string, codigo: string) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido ${codigo}?`)) return;
    if (isSupabaseConfigured) {
      await supabase.from("pedido_items").delete().eq("pedido_id", id);
      const { error: errPed } = await supabase.from("pedidos").delete().eq("id", id);
      if (errPed) {
        alert(`No se pudo eliminar de la nube: ${errPed.message}`);
        return;
      }
    }
    guardarPedidos(pedidos.filter((p) => p.id !== id));
  };

  const cambiarAprobacionPedido = async (ped: PedidoCompleto, nuevoAprobado: boolean) => {
    const nuevoEstado = nuevoAprobado ? "En Producción (Abono 50%)" : "Pendiente Anticipo";
    const nuevoDinero = nuevoAprobado ? ped.abono_50 : 0;
    if (isSupabaseConfigured) {
      await supabase.from("pedidos").update({ aprobado: nuevoAprobado, estado: nuevoEstado, dinero_recibido: nuevoDinero }).eq("id", ped.id);
    }
    guardarPedidos(pedidos.map((x) => (x.id === ped.id ? { ...ped, aprobado: nuevoAprobado, estado: nuevoEstado, dinero_recibido: nuevoDinero } : x)));
  };

  const cambiarEtapaPedido = async (ped: PedidoCompleto, nuevaEtapa: string) => {
    const esAprobado = nuevaEtapa !== "Pendiente Anticipo";
    const nuevoDinero = esAprobado ? ped.abono_50 : 0;
    if (isSupabaseConfigured) {
      await supabase.from("pedidos").update({ estado: nuevaEtapa, aprobado: esAprobado, dinero_recibido: nuevoDinero }).eq("id", ped.id);
    }
    guardarPedidos(pedidos.map((x) => (x.id === ped.id ? { ...ped, estado: nuevaEtapa, aprobado: esAprobado, dinero_recibido: nuevoDinero } : x)));
  };

  const enviarAvisoWhatsAppCliente = (ped: PedidoCompleto) => {
    const telLimpio = ped.cliente_whatsapp.replace(/\D/g, "");
    const numFinal = telLimpio.startsWith("57") ? telLimpio : `57${telLimpio}`;
    const saldo = Math.max(0, ped.valor_total - ped.abono_50);
    const msg =
      `\u2728 Hola *${ped.cliente_nombre}*! \uD83D\uDC31\n\n` +
      `Te escribimos de *Eternia Candles* para contarte que tu pedido *${ped.codigo}* se encuentra en etapa: *${ped.estado}*.\n\n` +
      `\uD83D\uDCB0 Valor Total: ${formatoCOP(ped.valor_total)}\n` +
      `\u2705 Saldo contra entrega: ${formatoCOP(saldo)}\n\n` +
      `Puedes ver el mapa de seguimiento en vivo en nuestra web con tu codigo *${ped.codigo}*.`;
    window.open(`https://api.whatsapp.com/send?phone=${numFinal}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const agregarItemAlPos = () => {
    const prod = productos.find((p) => p.id === posProductoId);
    if (!prod) return;
    setPosItems((prev) => {
      const existe = prev.find((i) => i.producto.id === prod.id);
      if (existe) return prev.map((i) => (i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + posCantidad } : i));
      return [...prev, { producto: prod, cantidad: posCantidad }];
    });
  };

  const posCalculos = useMemo(() => {
    const subtotalBruto = posItems.reduce((acc, it) => acc + it.producto.precio_catalogo * it.cantidad, 0);
    const valorTotal = redondearCentena(subtotalBruto * (1 - posDescuentoPct / 100));
    const costoTotal = redondearCentena(posItems.reduce((acc, it) => acc + it.producto.costo_produccion * it.cantidad, 0));
    const abono50 = redondearCentena(valorTotal * 0.5);
    const gananciaLibre = valorTotal > 0 ? valorTotal - costoTotal : 0;
    const margenPct = valorTotal > 0 ? Math.round((gananciaLibre / valorTotal) * 100) : 0;
    const valeLaPena = valorTotal >= 15000 && gananciaLibre >= 7000 && margenPct >= 40;

    const ceraG = posItems.reduce((acc, it) => acc + it.producto.cera_g * it.cantidad, 0);
    const fragMl = posItems.reduce((acc, it) => acc + it.producto.fragancia_ml * it.cantidad, 0);
    const pabCm = posItems.reduce((acc, it) => acc + it.producto.pabilo_cm * it.cantidad, 0);

    const numerosExistentes = pedidos.map((p) => {
      const partes = String(p.codigo || "").split("-");
      const num = parseInt(partes[1], 10);
      return isNaN(num) ? 0 : num;
    });
    const siguienteNum = Math.max(0, ...numerosExistentes) + 1;
    const proximoCodigo = `PED-${String(siguienteNum).padStart(3, "0")}`;

    return { valorTotal, costoTotal, abono50, gananciaLibre, margenPct, valeLaPena, ceraG, fragMl, pabCm, proximoCodigo };
  }, [posItems, posDescuentoPct, pedidos]);

  const estadisticasFinanzas = useMemo(() => {
    const realizados = pedidos.filter((p) => p.aprobado || p.estado === "Listo para Entrega");
    const ventasTotales = realizados.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0);
    const costosTotales = realizados.reduce((acc, p) => acc + (Number(p.costo_total) || 0), 0);
    const gananciaBrutaReal = realizados.reduce((acc, p) => acc + (Number(p.ganancia_libre) || 0), 0);
    const ceraFundidaG = realizados.reduce((acc, p) => acc + (Number(p.cera_total_g) || 0), 0);
    const margenGlobal = ventasTotales > 0 ? Math.round((gananciaBrutaReal / ventasTotales) * 100) : 0;

    const mapaClientes: Record<
      string,
      { nombre: string; whatsapp: string; cantidadPedidos: number; totalComprado: number; gananciaGenerada: number }
    > = {};

    pedidos.forEach((p) => {
      const clave = (p.cliente_whatsapp || p.cliente_nombre || "General").trim();
      if (!mapaClientes[clave]) {
        mapaClientes[clave] = {
          nombre: p.cliente_nombre,
          whatsapp: p.cliente_whatsapp,
          cantidadPedidos: 0,
          totalComprado: 0,
          gananciaGenerada: 0,
        };
      }
      mapaClientes[clave].cantidadPedidos += 1;
      mapaClientes[clave].totalComprado += Number(p.valor_total) || 0;
      mapaClientes[clave].gananciaGenerada += Number(p.ganancia_libre) || 0;
    });

    const rankingClientes = Object.values(mapaClientes).sort((a, b) => b.totalComprado - a.totalComprado);

    return { realizados, ventasTotales, costosTotales, gananciaBrutaReal, ceraFundidaG, margenGlobal, rankingClientes };
  }, [pedidos]);

  const registrarPedidoDesdePOS = async () => {
    if (posItems.length === 0) {
      alert("Agrega al menos una vela al carrito.");
      return;
    }
    const hoy = new Date().toISOString().split("T")[0];
    const itemsDetallados: PedidoItemDetalle[] = posItems.map((it) => ({
      producto_nombre: it.producto.nombre,
      cantidad: it.cantidad,
      precio_unitario: it.producto.precio_catalogo,
      costo_unitario: it.producto.costo_produccion,
      cera_unitaria_g: it.producto.cera_g,
      fragancia_unitaria_ml: it.producto.fragancia_ml,
      pabilo_unitario_cm: it.producto.pabilo_cm,
      tipo_empaque: it.producto.tipo_empaque,
      subtotal: it.producto.precio_catalogo * it.cantidad,
    }));

    const nuevo: PedidoCompleto = {
      id: `ped-${Date.now()}`,
      codigo: posCalculos.proximoCodigo,
      cliente_nombre: posClienteNombre.trim() || "Cliente Mostrador",
      cliente_whatsapp: posClienteWhatsapp.trim() || "Sin teléfono",
      aprobado: posAprobado,
      descuento_pct: posDescuentoPct,
      valor_total: posCalculos.valorTotal,
      costo_total: posCalculos.costoTotal,
      abono_50: posCalculos.abono50,
      dinero_recibido: posAprobado ? posCalculos.abono50 : 0,
      ganancia_libre: posCalculos.gananciaLibre,
      cera_total_g: posCalculos.ceraG,
      fragancia_total_ml: posCalculos.fragMl,
      pabilo_total_cm: posCalculos.pabCm,
      medio_pago: "Nequi",
      estado: posAprobado ? "En Producción (Abono 50%)" : "Pendiente Anticipo",
      origen: `Admin POS || Empaque: Clásico Artesanal || ItemsJSON: ${JSON.stringify(itemsDetallados)}`,
      fecha_pedido: hoy,
      fecha_entrega: calcularFechaEntregaHabil(hoy, 5),
      items: itemsDetallados,
    };

    if (isSupabaseConfigured) {
      const { data: pedInsertado, error: errPed } = await supabase
        .from("pedidos")
        .insert({
          codigo: nuevo.codigo,
          cliente_nombre: nuevo.cliente_nombre,
          cliente_whatsapp: nuevo.cliente_whatsapp,
          aprobado: nuevo.aprobado,
          descuento_pct: nuevo.descuento_pct,
          valor_total: nuevo.valor_total,
          costo_total: nuevo.costo_total,
          abono_50: nuevo.abono_50,
          dinero_recibido: nuevo.dinero_recibido,
          ganancia_libre: nuevo.ganancia_libre,
          cera_total_g: nuevo.cera_total_g,
          fragancia_total_ml: nuevo.fragancia_total_ml,
          pabilo_total_cm: nuevo.pabilo_total_cm,
          medio_pago: nuevo.medio_pago,
          estado: nuevo.estado,
          origen: nuevo.origen,
          fecha_pedido: nuevo.fecha_pedido,
          fecha_entrega: nuevo.fecha_entrega,
        })
        .select()
        .single();

      if (!errPed && pedInsertado) {
        nuevo.id = pedInsertado.id;
        const { error: errItems1 } = await supabase.from("pedido_items").insert(
          nuevo.items.map((item) => ({
            pedido_id: pedInsertado.id,
            producto_nombre: item.producto_nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            costo_unitario: item.costo_unitario,
            cera_unitaria_g: item.cera_unitaria_g,
            fragancia_unitaria_ml: item.fragancia_unitaria_ml,
            pabilo_unitaria_cm: item.pabilo_unitario_cm,
            tipo_empaque: item.tipo_empaque,
            subtotal: item.subtotal,
          }))
        );
        if (errItems1) {
          await supabase.from("pedido_items").insert(
            nuevo.items.map((item) => ({
              pedido_id: pedInsertado.id,
              producto_nombre: item.producto_nombre,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              costo_unitario: item.costo_unitario,
              cera_unitaria_g: item.cera_unitaria_g,
              fragancia_unitaria_ml: item.fragancia_unitaria_ml,
              tipo_empaque: item.tipo_empaque,
              subtotal: item.subtotal,
            }))
          );
        }
      }
    }

    guardarPedidos([nuevo, ...pedidos]);
    setCodigoReciboSeleccionado(nuevo.codigo);
    setPosItems([]);
    setPosClienteNombre("");
    setPosClienteWhatsapp("");
    setPosDescuentoPct(0);
    setTabActiva("PEDIDOS");
  };

  const previewNuevaVela = useMemo(() => {
    const costoEmp = tarifasEmpaque[nuevoEmpaque] ?? 1300;
    return calcularCosteoVela({
      cantVelas: nuevaCantVelas,
      ceraGramos: nuevaCeraG,
      pabiloCm: nuevoPabiloCm,
      costoEmpaque: costoEmp,
      precioCatalogoManual: nuevoPrecioCatManual > 0 ? nuevoPrecioCatManual : undefined,
    });
  }, [nuevaCantVelas, nuevaCeraG, nuevoPabiloCm, nuevoEmpaque, nuevoPrecioCatManual, tarifasEmpaque]);

  const guardarNuevoMoldeVela = () => {
    if (!nuevoNombreVela.trim()) {
      alert("Escribe el nombre de la nueva vela.");
      return;
    }
    const nueva: ProductoVela = {
      id: `v-${Date.now()}`,
      nombre: nuevoNombreVela.trim(),
      categoria: nuevaCatVela,
      cant_velas: nuevaCantVelas,
      cera_g: nuevaCeraG,
      fragancia_ml: previewNuevaVela.fraganciaMl,
      pabilo_cm: nuevoPabiloCm,
      tipo_empaque: nuevoEmpaque,
      costo_produccion: previewNuevaVela.costoProduccion,
      precio_justo: previewNuevaVela.precioJusto,
      precio_catalogo: previewNuevaVela.precioCatalogo,
      descripcion: nuevaDescVela.trim() || `Vela artesanal en ${nuevoEmpaque}.`,
      activo_en_tienda: true,
    };

    const nuevaLista = [...productos, nueva];
    setProductos(nuevaLista);
    localStorage.setItem("eternia_catalogo_v1", JSON.stringify(nuevaLista));
    setPosProductoId(nueva.id);
    setNuevoNombreVela("");
    setNuevaDescVela("");
    setNuevoPrecioCatManual(0);
    alert(`¡"${nueva.nombre}" agregada al Cotizador y Tienda con éxito!`);
  };

  const previewVasija = useMemo(() => calcularCostoVasijaYeso(vasosYeso, vasosCemento, vasosAgua), [vasosYeso, vasosCemento, vasosAgua]);

  const guardarVasija = () => {
    if (!nombreNuevaVasija.trim()) {
      alert("Escribe el nombre de la vasija.");
      return;
    }
    const claveEmpaque = `Vasija Yeso: ${nombreNuevaVasija.trim()}`;
    const nuevasTarifas = { ...tarifasEmpaque, [claveEmpaque]: previewVasija.costoEmpaqueCompleto };
    setTarifasEmpaque(nuevasTarifas);
    localStorage.setItem("eternia_empaques_v1", JSON.stringify(nuevasTarifas));
    setNuevoEmpaque(claveEmpaque);
    setNombreNuevaVasija("");
    alert(`¡Molde "${claveEmpaque}" creado con éxito! Costo total con empaque: ${formatoCOP(previewVasija.costoEmpaqueCompleto)}.`);
  };

  const pedidoReciboActual = useMemo(
    () => pedidos.find((p) => p.codigo === codigoReciboSeleccionado) || pedidos[0] || null,
    [pedidos, codigoReciboSeleccionado]
  );

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#C89D7C] border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-[#7A685F] font-serif tracking-widest">VERIFICANDO SEGURIDAD ETERNIA...</p>
        </div>
      </div>
    );
  }

  if (!sesionVerificada) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E8D5CE] shadow-xl space-y-6 relative overflow-hidden">
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-full bg-[#3B2B23] items-center justify-center text-[#C89D7C] shadow-sm mb-1">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-[0.2em] text-[#3B2B23]">ACCESO PRIVADO</h1>
            <p className="text-xs text-[#7A685F] italic tracking-wider font-serif">Panel Administrativo • Eternia Candles</p>
          </div>

          <form onSubmit={iniciarSesionAdmin} className="space-y-4 pt-2">
            {errorLogin && <div className="p-3 rounded-xl bg-[#FADBD8] text-[#922B21] text-xs font-medium">{errorLogin}</div>}
            <div>
              <label className="block text-xs font-bold text-[#3B2B23] mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-3.5" />
                <input type="email" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="tucorreo@ejemplo.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3B2B23] mb-1">Contraseña Maestra</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-3.5" />
                <input type="password" required value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} placeholder="••••••••••••" className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C89D7C]" /> Iniciar Sesión Segura
            </button>
          </form>

          <div className="pt-4 border-t border-[#E8D5CE] text-center">
            <Link href="/" className="text-xs text-[#7A685F] hover:text-[#3B2B23] font-medium flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> <span>Regresar a la Tienda Pública</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2B23] font-sans">
      {/* CABECERA CON ESTRELLITA BEIGE Y ÚNICAMENTE EL BOTÓN DE CERRAR SESIÓN */}
      <header className="no-print bg-[#3B2B23] text-[#FAF6F0] px-4 sm:px-8 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-serif font-bold tracking-wider">ETERNIA CANDLES — PANEL ADMINISTRATIVO</h1>
              <p className="text-xs text-[#E8D5CE] tracking-wider">POS • Pedidos • Finanzas & Clientes VIP • Recibo y Tarjeta Separada • Visibilidad Catálogo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={cerrarSesionAdmin} className="bg-red-900/60 hover:bg-red-900 text-[#FAF6F0] text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer">
              <LogOut className="w-4 h-4 text-[#FADBD8]" /> <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pt-4">
          {[
            { id: "POS", label: "1. Cotizador POS", icon: ShoppingCart },
            { id: "PEDIDOS", label: `2. Pedidos (${pedidos.length})`, icon: CheckCircle },
            { id: "FINANZAS", label: "3. Finanzas y Clientes VIP", icon: TrendingUp },
            { id: "RECIBO", label: "4. Recibo y Tarjeta PDF", icon: FileText },
            { id: "MOLDES", label: "5. Nuevos Moldes", icon: PlusCircle },
            { id: "INVENTARIO", label: "6. Aromas, Catálogo e Insumos", icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const activa = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id as typeof tabActiva)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer tracking-wider ${
                  activa ? "bg-[#FAF6F0] text-[#3B2B23] shadow-sm" : "bg-[#523d32] text-[#E8D5CE] hover:bg-[#634b3e]"
                }`}
              >
                <Icon className="w-4 h-4 text-[#C89D7C]" /> {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* PESTAÑA 1: COTIZADOR POS */}
        {tabActiva === "POS" && (
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8D5CE] p-6 shadow-xs space-y-5">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23]">Cotizador POS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#F3ECE1]/60 p-4 rounded-xl border border-[#E8D5CE]">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-bold mb-1">Producto</label>
                  <select value={posProductoId} onChange={(e) => setPosProductoId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#C89D7C] text-sm font-semibold">
                    {productos.map((p) => (<option key={p.id} value={p.id}>{p.nombre} — {formatoCOP(p.precio_catalogo)}</option>))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Cant.</label>
                  <select value={posCantidad} onChange={(e) => setPosCantidad(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#C89D7C] text-sm font-bold text-center">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button onClick={agregarItemAlPos} className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <PlusCircle className="w-4 h-4" /> Añadir
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#7A685F] font-serif">Items en la Orden ({posItems.length})</h3>
                {posItems.length === 0 ? (
                  <p className="text-xs text-[#7A685F] italic py-2">No hay productos agregados todavía.</p>
                ) : (
                  posItems.map((it) => (
                    <div key={it.producto.id} className="p-3 bg-[#FAF6F0] border border-[#E8D5CE] rounded-xl flex justify-between items-center text-xs">
                      <span><strong>{it.cantidad}x</strong> {it.producto.nombre} ({formatoCOP(it.producto.precio_catalogo)} c/u)</span>
                      <div className="flex items-center gap-3">
                        <strong className="text-sm">{formatoCOP(it.producto.precio_catalogo * it.cantidad)}</strong>
                        <button onClick={() => setPosItems(posItems.filter((x) => x.producto.id !== it.producto.id))} className="text-red-600 hover:text-red-800 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Nombre del Cliente</label>
                  <input type="text" value={posClienteNombre} onChange={(e) => setPosClienteNombre(e.target.value)} placeholder="Ej: María Gómez" className="w-full px-3 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">WhatsApp del Cliente</label>
                  <input type="text" value={posClienteWhatsapp} onChange={(e) => setPosClienteWhatsapp(e.target.value)} placeholder="Ej: 3100000000" className="w-full px-3 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Descuento (%)</label>
                  <input type="number" min={0} max={100} value={posDescuentoPct} onChange={(e) => setPosDescuentoPct(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Estado de Aprobación</label>
                  <select value={posAprobado ? "Sí" : "No"} onChange={(e) => setPosAprobado(e.target.value === "Sí")} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold">
                    <option value="Sí">Aprobado (En Producción)</option>
                    <option value="No">Pendiente Anticipo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8D5CE] p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <h3 className="text-base font-serif font-bold border-b pb-2">Resumen Financiero y Semáforo de Rentabilidad</h3>
                <div className="p-4 bg-[#FAF6F0] rounded-xl border border-[#E8D5CE] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7A685F]">Costo Total de Producción:</span>
                    <span className="font-bold">{formatoCOP(posCalculos.costoTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-serif font-bold text-[#3B2B23] border-t border-[#E8D5CE] pt-2">
                    <span>VALOR TOTAL VENTA:</span>
                    <span className="text-xl text-[#C89D7C]">{formatoCOP(posCalculos.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-[#D4EFDF] text-[#196F3D] p-2 rounded-lg font-bold">
                    <span>Abono 50% Requerido:</span>
                    <span>{formatoCOP(posCalculos.abono50)}</span>
                  </div>
                </div>

                {posItems.length > 0 && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      posCalculos.valeLaPena
                        ? "bg-[#D4EFDF] border-[#196F3D]/30 text-[#196F3D]"
                        : "bg-[#FADBD8] border-[#922B21]/30 text-[#922B21]"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>
                        {posCalculos.valeLaPena
                          ? "🟢 SÍ VALE LA PENA (Margen Óptimo)"
                          : "🔴 NO VALE LA PENA (Pedido o Margen muy bajo)"}
                      </span>
                      <span>Margen: {posCalculos.margenPct}%</span>
                    </div>
                    <p className="text-[11px]">
                      {posCalculos.valeLaPena
                        ? `Ganancia libre de ${formatoCOP(posCalculos.gananciaLibre)}. Compensa el tiempo de fundición y empaque.`
                        : `Ganancia libre de solo ${formatoCOP(posCalculos.gananciaLibre)}. Sugiere armar combo o mínimo $15.000.`}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-[#F3ECE1]/60 rounded-xl border border-[#E8D5CE] space-y-2 text-xs">
                  <p className="font-bold font-serif text-[#3B2B23]">Requerimientos de Insumos:</p>
                  <div className="flex justify-between"><span className="text-[#7A685F]">Cera Total:</span><strong>{posCalculos.ceraG} g</strong></div>
                  <div className="flex justify-between"><span className="text-[#7A685F]">Fragancia Total:</span><strong>{posCalculos.fragMl} ml</strong></div>
                  <div className="flex justify-between"><span className="text-[#7A685F]">Pabilo Total:</span><strong>{posCalculos.pabCm} cm</strong></div>
                  <div className="flex justify-between border-t border-[#E8D5CE] pt-2"><span className="text-[#7A685F]">Ganancia Libre Neta:</span><strong className="text-[#196F3D]">{formatoCOP(posCalculos.gananciaLibre)}</strong></div>
                </div>
              </div>

              <button onClick={registrarPedidoDesdePOS} className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer shadow-md transition tracking-wider">
                Guardar Pedido ({posCalculos.proximoCodigo})
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: CONTROL DE PEDIDOS Y ETAPAS */}
        {tabActiva === "PEDIDOS" && (
          <div className="no-print space-y-6">
            <div className="bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#3B2B23] text-white font-serif">
                    <th className="p-3">Código</th>
                    <th className="p-3">Aprobado</th>
                    <th className="p-3">Etapa en Mapa de Seguimiento</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Productos, Aromas y Dedicatoria</th>
                    <th className="p-3 text-right">Total / Ganancia</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE1]">
                  {pedidos.map((ped) => {
                    const infoOrigen = extraerDetallesOrigenAdmin(ped.origen);
                    const esRentable = ped.valor_total >= 15000 && ped.ganancia_libre >= 6000;
                    return (
                      <tr key={ped.id} className="hover:bg-[#FAF6F0]/60">
                        <td className="p-3 font-bold">
                          {ped.codigo}
                          <span className="block text-[10px] text-[#7A685F] font-normal">{ped.fecha_pedido}</span>
                        </td>
                        <td className="p-3">
                          <select
                            value={ped.aprobado ? "Sí" : "No"}
                            onChange={(e) => cambiarAprobacionPedido(ped, e.target.value === "Sí")}
                            className={`px-2 py-1 rounded font-bold ${ped.aprobado ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            <option value="Sí">Sí</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={ESTADOS_FABRICACION.includes(ped.estado) ? ped.estado : ped.aprobado ? "En Producción (Abono 50%)" : "Pendiente Anticipo"}
                            onChange={(e) => cambiarEtapaPedido(ped, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FAF6F0] border border-[#C89D7C] font-bold text-[#3B2B23]"
                          >
                            {ESTADOS_FABRICACION.map((est) => (<option key={est} value={est}>{est}</option>))}
                          </select>
                        </td>
                        <td className="p-3">
                          <strong>{ped.cliente_nombre}</strong><br />{ped.cliente_whatsapp}
                        </td>
                        <td className="p-3 space-y-1">
                          {(ped.items || []).map((it, idx) => (
                            <div key={idx} className="text-[#3B2B23]">
                              <strong>{it.cantidad}x</strong> {it.producto_nombre} <span className="text-[#7A685F]">({formatoCOP(it.subtotal)})</span>
                            </div>
                          ))}
                          <div className="text-[10px] text-[#7A685F] pt-1">🎁 Empaque: <strong>{infoOrigen.empaque}</strong></div>
                          {infoOrigen.tieneDedicatoria && (
                            <div className="p-2 rounded-lg bg-[#F3ECE1] border border-[#C89D7C] text-[11px]">
                              <strong>💌 Tarjeta (Para {infoOrigen.para} / De {infoOrigen.de}):</strong> &ldquo;{infoOrigen.mensaje}&rdquo;
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <strong className="text-sm block">{formatoCOP(ped.valor_total)}</strong>
                          <span className="text-[10px] text-[#196F3D] font-bold block">
                            Ganancia: +{formatoCOP(ped.ganancia_libre)}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold inline-block mt-0.5 ${esRentable ? "bg-[#D4EFDF] text-[#196F3D]" : "bg-[#FADBD8] text-[#922B21]"}`}>
                            {esRentable ? "🟢 Óptimo" : "🟡 Bajo"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => enviarAvisoWhatsAppCliente(ped)}
                              className="bg-[#196F3D] hover:bg-green-800 text-white p-1.5 rounded cursor-pointer"
                              title="Avisar estado por WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setCodigoReciboSeleccionado(ped.codigo); setTabActiva("RECIBO"); }}
                              className="bg-[#C89D7C] text-white p-1.5 rounded cursor-pointer"
                              title="Ver Recibo y Tarjeta Imprimible"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarPedido(ped.id, ped.codigo)}
                              className="bg-red-700 hover:bg-red-800 text-white p-1.5 rounded cursor-pointer"
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: FINANZAS ESTILO EXCEL Y RANKING DE CLIENTES VIP */}
        {tabActiva === "FINANZAS" && (
          <div className="no-print space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E8D5CE] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A685F]">Ventas Aprobadas / Realizadas</span>
                <p className="text-2xl font-serif font-extrabold text-[#3B2B23] mt-1">
                  {formatoCOP(estadisticasFinanzas.ventasTotales)}
                </p>
                <span className="text-xs text-[#7A685F]">{estadisticasFinanzas.realizados.length} pedidos efectivos</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E8D5CE] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A685F]">Costo de Hacerlas (Insumos)</span>
                <p className="text-2xl font-serif font-extrabold text-[#922B21] mt-1">
                  {formatoCOP(estadisticasFinanzas.costosTotales)}
                </p>
                <span className="text-xs text-[#7A685F]">Cera fundida: {estadisticasFinanzas.ceraFundidaG} g</span>
              </div>

              <div className="bg-[#D4EFDF] p-5 rounded-2xl border border-[#196F3D]/30 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#196F3D]">Ganancia Bruta Libre Real</span>
                <p className="text-2xl font-serif font-extrabold text-[#196F3D] mt-1">
                  +{formatoCOP(estadisticasFinanzas.gananciaBrutaReal)}
                </p>
                <span className="text-xs font-bold text-[#196F3D]">Dinero libre descontando costos</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#C89D7C] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A685F]">Margen Promedio del Taller</span>
                <p className="text-2xl font-serif font-extrabold text-[#C89D7C] mt-1">
                  {estadisticasFinanzas.margenGlobal}%
                </p>
                <span className="text-xs text-[#7A685F]">Rentabilidad sobre ventas</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
              <div className="p-5 border-b border-[#F3ECE1] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#3B2B23] flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#C89D7C]" /> Directorio de Clientes Frecuentes & VIP
                  </h3>
                  <p className="text-xs text-[#7A685F]">
                    Clasificación automática según compras acumuladas para dar beneficios especiales o invitar al Club Eternia.
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#3B2B23] text-white font-serif">
                    <th className="p-3">Cliente</th>
                    <th className="p-3">WhatsApp</th>
                    <th className="p-3 text-center">Pedidos Realizados</th>
                    <th className="p-3 text-right">Total Comprado</th>
                    <th className="p-3 text-right">Ganancia Generada</th>
                    <th className="p-3 text-center">Nivel / Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE1]">
                  {estadisticasFinanzas.rankingClientes.map((cli, idx) => {
                    const esVIP = cli.cantidadPedidos >= 3 || cli.totalComprado >= 100000;
                    const esFrecuente = !esVIP && (cli.cantidadPedidos === 2 || cli.totalComprado >= 50000);
                    return (
                      <tr key={idx} className="hover:bg-[#FAF6F0]">
                        <td className="p-3 font-bold text-[#3B2B23]">{cli.nombre}</td>
                        <td className="p-3 font-mono">{cli.whatsapp}</td>
                        <td className="p-3 text-center font-bold">{cli.cantidadPedidos}</td>
                        <td className="p-3 text-right font-bold">{formatoCOP(cli.totalComprado)}</td>
                        <td className="p-3 text-right font-bold text-[#196F3D]">+{formatoCOP(cli.gananciaGenerada)}</td>
                        <td className="p-3 text-center">
                          {esVIP ? (
                            <span className="px-3 py-1 rounded-full bg-[#3B2B23] text-[#C89D7C] font-bold text-[10px]">
                              👑 CLIENTE VIP ETERNIA
                            </span>
                          ) : esFrecuente ? (
                            <span className="px-3 py-1 rounded-full bg-[#F3ECE1] text-[#3B2B23] border border-[#C89D7C] font-bold text-[10px]">
                              ⭐ CLIENTE FRECUENTE
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-gray-100 text-[#7A685F] font-bold text-[10px]">
                              🌱 NUEVO CLIENTE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
              <div className="p-5 border-b border-[#F3ECE1]">
                <h3 className="text-lg font-serif font-bold text-[#3B2B23]">
                  Libro Contable de Pedidos Realizados (Estilo Excel)
                </h3>
                <p className="text-xs text-[#7A685F]">
                  Detalle exacto de cuánto costó fabricar cada pedido vs cuánto dejó de ganancia libre.
                </p>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F3ECE1] text-[#3B2B23] font-serif">
                    <th className="p-3">Código</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Detalle de Productos</th>
                    <th className="p-3 text-right">Valor Venta</th>
                    <th className="p-3 text-right">Costo Hacerlo</th>
                    <th className="p-3 text-right">Ganancia Libre</th>
                    <th className="p-3 text-center">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE1]">
                  {estadisticasFinanzas.realizados.map((p) => {
                    const margen = p.valor_total > 0 ? Math.round((p.ganancia_libre / p.valor_total) * 100) : 0;
                    const optimo = p.valor_total >= 15000 && margen >= 40;
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF6F0]">
                        <td className="p-3 font-bold">{p.codigo}</td>
                        <td className="p-3">{p.fecha_pedido}</td>
                        <td className="p-3 font-semibold">{p.cliente_nombre}</td>
                        <td className="p-3">
                          {(p.items || []).map((it, i) => (
                            <div key={i}>{it.cantidad}x {it.producto_nombre}</div>
                          ))}
                        </td>
                        <td className="p-3 text-right font-bold">{formatoCOP(p.valor_total)}</td>
                        <td className="p-3 text-right text-[#922B21]">{formatoCOP(p.costo_total)}</td>
                        <td className="p-3 text-right font-extrabold text-[#196F3D]">+{formatoCOP(p.ganancia_libre)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${optimo ? "bg-[#D4EFDF] text-[#196F3D]" : "bg-[#FCF3CF] text-[#D35400]"}`}>
                            {optimo ? `🟢 Óptimo (${margen}%)` : `🟡 Ajustado (${margen}%)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: RECIBO FINANCIERO (PÁG 1) + TARJETA DEDICATORIA (PÁG 2) */}
        {tabActiva === "RECIBO" && (
          <div className="space-y-8">
            <div className="no-print bg-white p-4 rounded-2xl border border-[#E8D5CE] flex flex-wrap justify-between items-center gap-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-serif font-bold text-[#3B2B23]">PEDIDO:</label>
                <select
                  value={codigoReciboSeleccionado}
                  onChange={(e) => setCodigoReciboSeleccionado(e.target.value)}
                  className="px-4 py-2 bg-[#FAF6F0] border border-[#C89D7C] rounded-xl font-bold text-sm text-[#3B2B23]"
                >
                  {pedidos.map((p) => (<option key={p.id} value={p.codigo}>{p.codigo} — {p.cliente_nombre}</option>))}
                </select>

                <select
                  value={modoImpresionRecibo}
                  onChange={(e) => setModoImpresionRecibo(e.target.value as typeof modoImpresionRecibo)}
                  className="px-3 py-2 bg-[#F3ECE1] border border-[#E8D5CE] rounded-xl font-bold text-xs text-[#3B2B23]"
                >
                  <option value="AMBOS">📄 Imprimir Hoja 1 (Factura) + Hoja 2 (Tarjeta Dedicatoria Separada)</option>
                  <option value="SOLO_RECIBO">🧾 Imprimir Solo Hoja 1 (Factura Financiera)</option>
                  <option value="SOLO_TARJETA">💌 Imprimir Solo Hoja 2 (Tarjeta Dedicatoria de Regalo)</option>
                </select>
              </div>

              <button
                onClick={() => window.print()}
                className="bg-[#3B2B23] hover:bg-[#523d32] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm tracking-wider"
              >
                <Printer className="w-4 h-4 text-[#C89D7C]" /> Imprimir PDF
              </button>
            </div>

            {pedidoReciboActual && (() => {
              const infoOrigen = extraerDetallesOrigenAdmin(pedidoReciboActual.origen);
              return (
                <div className="space-y-10">
                  {(modoImpresionRecibo === "AMBOS" || modoImpresionRecibo === "SOLO_RECIBO") && (
                    <div className="bg-white max-w-xl mx-auto p-6 rounded-2xl border border-[#E8D5CE] shadow-md space-y-4 font-sans relative overflow-hidden">
                      <div className="text-center border-b border-[#E8D5CE] pb-3 space-y-1">
                        <div className="inline-flex w-8 h-8 rounded-full bg-[#C89D7C] items-center justify-center text-white shadow-xs mb-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-serif font-bold tracking-[0.2em] text-[#3B2B23]">ETERNIA CANDLES</h2>
                        <p className="text-[10px] text-[#7A685F] italic tracking-widest font-serif">Handmade Aromas • Diseño, Calma y Esencia Natural</p>
                        <p className="text-[10px] text-[#7A685F] tracking-wider pt-0.5">Bogotá, Colombia • IG: @eternia.candles • WA: 313 201 9146</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-[#FAF6F0] p-3.5 rounded-xl border border-[#E8D5CE] text-xs">
                        <div className="space-y-0.5">
                          <p className="text-[#7A685F] uppercase tracking-wider text-[9px] font-bold">Datos del Cliente</p>
                          <p className="text-xs font-serif font-bold text-[#3B2B23]">{pedidoReciboActual.cliente_nombre}</p>
                          <p className="text-[#3B2B23]">WhatsApp: <strong className="font-mono">{pedidoReciboActual.cliente_whatsapp}</strong></p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p className="text-[#7A685F] uppercase tracking-wider text-[9px] font-bold">Detalles de Orden</p>
                          <p className="text-xs font-serif font-bold text-[#C89D7C]">{pedidoReciboActual.codigo}</p>
                          <p className="text-[#3B2B23]">Fecha: <strong>{pedidoReciboActual.fecha_pedido}</strong></p>
                          <p className="text-[#3B2B23]">Entrega aprox: <strong>{pedidoReciboActual.fecha_entrega}</strong></p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[11px] font-serif font-bold uppercase tracking-widest text-[#3B2B23] border-b border-[#E8D5CE] pb-1">
                          Resumen de Productos y Fragancias
                        </h4>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[#7A685F] uppercase text-[9px] tracking-wider border-b border-[#F3ECE1]">
                              <th className="pb-1.5 font-medium">Descripción / Producto</th>
                              <th className="pb-1.5 text-center font-medium">Cant.</th>
                              <th className="pb-1.5 text-right font-medium">Unitario</th>
                              <th className="pb-1.5 text-right font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F3ECE1]">
                            {(pedidoReciboActual.items || []).map((it, i) => (
                              <tr key={i}>
                                <td className="py-2 font-serif font-bold text-[#3B2B23]">{it.producto_nombre}</td>
                                <td className="py-2 text-center font-bold">{it.cantidad}</td>
                                <td className="py-2 text-right text-[#7A685F]">{formatoCOP(it.precio_unitario)}</td>
                                <td className="py-2 text-right font-bold text-[#3B2B23]">{formatoCOP(it.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="text-[11px] text-[#7A685F] bg-[#FAF6F0] px-3 py-2 rounded-lg border border-[#E8D5CE]">
                        🎁 <strong>Presentación elegida:</strong> {infoOrigen.empaque}
                      </div>

                      <div className="bg-[#FAF6F0] p-3.5 rounded-xl border border-[#E8D5CE] space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-serif font-bold text-[#3B2B23] border-b border-[#E8D5CE] pb-1.5 text-sm">
                          <span>Valor Total del Pedido:</span>
                          <span>{formatoCOP(pedidoReciboActual.valor_total)}</span>
                        </div>
                        <div className="flex justify-between items-center font-semibold text-[#196F3D] bg-[#D4EFDF] px-3 py-1.5 rounded-lg">
                          <span>Anticipo 50% (Pagado / Requerido):</span>
                          <span className="font-bold">{formatoCOP(pedidoReciboActual.abono_50)}</span>
                        </div>
                        <div className="flex justify-between items-center font-semibold text-[#3B2B23] bg-white px-3 py-1.5 rounded-lg border border-[#E8D5CE]">
                          <span>Saldo Contra Entrega:</span>
                          <span className="font-bold">{formatoCOP(Math.max(0, pedidoReciboActual.valor_total - pedidoReciboActual.abono_50))}</span>
                        </div>
                      </div>

                      <div className="text-center space-y-1.5 pt-1.5 border-t border-[#E8D5CE]">
                        <div className="bg-[#F3ECE1]/60 p-2.5 rounded-xl text-[10px] text-[#7A685F] space-y-0.5">
                          <p className="font-serif font-bold text-[#3B2B23]">Cuentas Oficiales — María Paula Prada Coronado</p>
                          <p>Nequi / Daviplata: <strong className="text-[#3B2B23]">313 201 9146</strong> | Bancolombia Ahorros: <strong className="text-[#3B2B23]">22582959122</strong></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(modoImpresionRecibo === "SOLO_TARJETA" || (modoImpresionRecibo === "AMBOS" && infoOrigen.tieneDedicatoria)) && (
                    <div
                      style={{ pageBreakBefore: modoImpresionRecibo === "AMBOS" ? "always" : "auto" }}
                      className="bg-[#FAF6F0] max-w-lg mx-auto p-8 rounded-3xl border-2 border-dashed border-[#C89D7C] shadow-lg text-center space-y-5 relative"
                    >
                      <div className="bg-white p-8 rounded-2xl border border-[#E8D5CE] space-y-4 shadow-xs">
                        <SelloGaticoCriolloTarjeta />

                        <div className="space-y-1">
                          <span className="text-[10px] font-serif uppercase tracking-[0.3em] text-[#C89D7C] block">
                            ✨ Un Regalo Hecho a Mano Para Ti ✨
                          </span>
                          <h3 className="text-xl font-serif font-bold tracking-[0.2em] text-[#3B2B23]">
                            ETERNIA CANDLES
                          </h3>
                        </div>

                        <div className="py-4 px-6 bg-[#FAF6F0] rounded-2xl border border-[#E8D5CE] space-y-3">
                          <p className="text-base font-serif italic text-[#3B2B23] leading-relaxed">
                            &ldquo;{infoOrigen.mensaje || "Que esta luz cálida y su esencia natural acompañen tus momentos más especiales."}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center justify-around text-xs font-serif pt-2 border-t border-[#F3ECE1]">
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#7A685F] block">Para:</span>
                            <strong className="text-sm text-[#3B2B23]">{infoOrigen.para || pedidoReciboActual.cliente_nombre}</strong>
                          </div>
                          <div className="text-[#C89D7C]">♥</div>
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#7A685F] block">Con amor, de:</span>
                            <strong className="text-sm text-[#3B2B23]">{infoOrigen.de || "Alguien que te quiere"}</strong>
                          </div>
                        </div>

                        <p className="text-[9px] text-[#7A685F] tracking-widest uppercase pt-2">
                          🕯️ Encender por 2-3 horas la primera vez • Recortar el pabilo a 5mm • @eternia.candles
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* PESTAÑA 5: NUEVOS MOLDES Y VASIJAS */}
        {tabActiva === "MOLDES" && (
          <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E8D5CE] shadow-xs space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23] border-b border-[#F3ECE1] pb-2">🕯️ 1. Agregar Nuevo Molde de Vela</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1">Nombre de la Nueva Vela *</label>
                  <input type="text" value={nuevoNombreVela} onChange={(e) => setNuevoNombreVela(e.target.value)} placeholder="Ej: Vela Pino Nórdico Mediano" className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Categoría</label>
                  <select value={nuevaCatVela} onChange={(e) => setNuevaCatVela(e.target.value as ProductoVela["categoria"])} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm">
                    <option value="NAVIDAD">NAVIDAD</option>
                    <option value="DÍA DE LAS VELITAS">DÍA DE LAS VELITAS</option>
                    <option value="VASIJAS DE YESO">VASIJAS DE YESO</option>
                    <option value="RECORDATORIOS Y EVENTOS">RECORDATORIOS Y EVENTOS</option>
                    <option value="TODA OCASIÓN">TODA OCASIÓN</option>
                    <option value="HALLOWEEN">HALLOWEEN</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Tipo de Empaque</label>
                  <select value={nuevoEmpaque} onChange={(e) => setNuevoEmpaque(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm">
                    {Object.entries(tarifasEmpaque).map(([nombreEmp, costoEmp]) => (<option key={nombreEmp} value={nombreEmp}>{nombreEmp} ({formatoCOP(costoEmp)})</option>))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Peso en Cera (Gramos)</label>
                  <input type="number" value={nuevaCeraG} onChange={(e) => setNuevaCeraG(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Pabilo (Centímetros)</label>
                  <input type="number" value={nuevoPabiloCm} onChange={(e) => setNuevoPabiloCm(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Cant. Velas en el Kit</label>
                  <input type="number" min={1} value={nuevaCantVelas} onChange={(e) => setNuevaCantVelas(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Precio Manual (Opcional)</label>
                  <input type="number" step={500} value={nuevoPrecioCatManual} onChange={(e) => setNuevoPrecioCatManual(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                </div>
              </div>

              <div className="bg-[#F3ECE1] p-4 rounded-xl border border-[#E8D5CE] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div><span className="text-[#7A685F] block">Fragancia (10%)</span><strong className="text-sm">{previewNuevaVela.fraganciaMl} ml</strong></div>
                <div><span className="text-[#7A685F] block">Costo Prod.</span><strong className="text-sm">{formatoCOP(previewNuevaVela.costoProduccion)}</strong></div>
                <div><span className="text-[#7A685F] block">Precio Justo</span><strong className="text-sm text-[#1B4F72]">{formatoCOP(previewNuevaVela.precioJusto)}</strong></div>
                <div><span className="text-[#7A685F] block">Ganancia</span><strong className="text-sm text-[#196F3D]">+{formatoCOP(previewNuevaVela.gananciaLibre)}</strong></div>
              </div>

              <button onClick={guardarNuevoMoldeVela} className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-3 rounded-xl text-sm shadow-xs transition cursor-pointer">
                + Guardar Vela en Catálogo
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8D5CE] shadow-xs space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23] border-b border-[#F3ECE1] pb-2">🏺 2. Agregar Nueva Vasija (Yeso + Cemento)</h2>
              <p className="text-xs text-[#7A685F]">Medida estándar: 1 vaso Yeso = 65g, 1 vaso Cemento = 65g, 1 vaso Agua = 95g.</p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Nombre de la Vasija *</label>
                  <input type="text" value={nombreNuevaVasija} onChange={(e) => setNombreNuevaVasija(e.target.value)} placeholder="Ej: Bandeja Ovalada / Vasija Geométrica" className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Vasos Yeso</label>
                    <input type="number" step="0.5" value={vasosYeso} onChange={(e) => setVasosYeso(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Vasos Cemento</label>
                    <input type="number" step="0.5" value={vasosCemento} onChange={(e) => setVasosCemento(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Vasos Agua</label>
                    <input type="number" step="0.5" value={vasosAgua} onChange={(e) => setVasosAgua(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold" />
                  </div>
                </div>
                <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E8D5CE] grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#7A685F] block">Mezcla Exacta:</span>
                    <strong className="text-sm">{previewVasija.gramosYeso}g Yeso + {previewVasija.gramosCemento}g Cem. + {previewVasija.gramosAgua}g Agua</strong>
                  </div>
                  <div>
                    <span className="text-[#7A685F] block">Costo Total:</span>
                    <strong className="text-sm text-[#196F3D]">{formatoCOP(previewVasija.costoEmpaqueCompleto)}</strong>
                  </div>
                </div>
                <button onClick={guardarVasija} className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3 rounded-xl text-sm shadow-xs transition cursor-pointer">
                  + Registrar Vasija
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 6: AROMAS, VISIBILIDAD DE CATÁLOGO E INSUMOS */}
        {tabActiva === "INVENTARIO" && (
          <div className="no-print space-y-6">
            <div className="bg-white rounded-2xl border border-[#E8D5CE] p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3ECE1] pb-3">
                <div>
                  <h2 className="text-lg font-serif font-bold text-[#3B2B23] flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#C89D7C]" /> 1. Stock de Aromas Disponibles en la Tienda Web
                  </h2>
                  <p className="text-xs text-[#7A685F]">
                    Activa o desactiva aromas en tiempo real. Si marcas uno como <strong>Agotado</strong>, aparecerá bloqueado en el celular de tus clientes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nuevoAromaNombre}
                    onChange={(e) => setNuevoAromaNombre(e.target.value)}
                    placeholder="Nuevo aroma (ej. Café Mocca)"
                    className="px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-xs"
                  />
                  <input
                    type="text"
                    value={nuevoAromaNotas}
                    onChange={(e) => setNuevoAromaNotas(e.target.value)}
                    placeholder="Notas (ej. Tostado y dulce)"
                    className="px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-xs hidden sm:block"
                  />
                  <button
                    onClick={agregarNuevoAroma}
                    className="bg-[#C89D7C] hover:bg-[#b58967] text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Agregar Aroma
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {aromasStock.map((aroma) => (
                  <div
                    key={aroma.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 transition ${
                      aroma.disponible ? "bg-[#FAF6F0] border-[#C89D7C]" : "bg-gray-100 border-gray-300 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#3B2B23]">{aroma.nombre}</h4>
                        <p className="text-[11px] text-[#7A685F]">{aroma.notas}</p>
                      </div>
                      <button onClick={() => eliminarAroma(aroma.id)} className="text-[#922B21] hover:opacity-75 cursor-pointer" title="Borrar aroma">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => alternarDisponibilidadAroma(aroma.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                        aroma.disponible ? "bg-[#D4EFDF] text-[#196F3D]" : "bg-[#FADBD8] text-[#922B21]"
                      }`}
                    >
                      {aroma.disponible ? "🟢 Disponible en Tienda" : "🔴 Agotado (Bloqueado)"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8D5CE] p-6 shadow-xs space-y-4">
              <div className="border-b border-[#F3ECE1] pb-3">
                <h2 className="text-lg font-serif font-bold text-[#3B2B23] flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#C89D7C]" /> 2. Visibilidad de Velas en la Tienda Pública (Ocultar Velas Sueltas)
                </h2>
                <p className="text-xs text-[#7A685F]">
                  Apaga aquí las velas pequeñas individuales (como la momia o el fantasma suelto) que prefieras vender únicamente en combo o en el Club Eternia.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {productos.map((prod) => {
                  const estaOculta = idsOcultos.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                        estaOculta ? "bg-gray-100 border-gray-300 opacity-70" : "bg-[#FAF6F0] border-[#E8D5CE]"
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#7A685F] block">{prod.categoria}</span>
                        <h4 className="font-serif font-bold text-xs text-[#3B2B23]">{prod.nombre}</h4>
                        <span className="text-xs font-extrabold text-[#C89D7C]">{formatoCOP(prod.precio_catalogo)}</span>
                      </div>

                      <button
                        onClick={() => alternarVisibilidadVelaTienda(prod.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shrink-0 ${
                          estaOculta ? "bg-[#FADBD8] text-[#922B21]" : "bg-[#D4EFDF] text-[#196F3D]"
                        }`}
                      >
                        {estaOculta ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Oculta
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Visible
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
              <div className="p-5 border-b border-[#F3ECE1]">
                <h2 className="text-lg font-serif font-bold text-[#3B2B23]">3. Control de Insumos con Descuento Automático</h2>
                <p className="text-xs text-[#7A685F]">Descuenta automáticamente insumos y empaques según los pedidos aprobados.</p>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#3B2B23] text-white font-serif tracking-wider">
                    <th className="p-3">Insumo</th>
                    <th className="p-3 text-center">Unidad</th>
                    <th className="p-3 text-right">Contenido x Paq.</th>
                    <th className="p-3 text-right">Precio x Paq.</th>
                    <th className="p-3 text-center">Paquetes Comprados</th>
                    <th className="p-3 text-right">Stock Inicial</th>
                    <th className="p-3 text-right">Usado</th>
                    <th className="p-3 text-right">Disponible</th>
                    <th className="p-3 text-center">Semáforo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE1]">
                  {insumos.map((ins: InsumoItem) => {
                    const stockInicial = ins.medida_por_unidad * ins.cantidad_comprada;
                    const pedidosAprobados = pedidos.filter((p) => p.aprobado);

                    const contarEmpaque = (filtro: string) =>
                      pedidosAprobados.reduce(
                        (acc, p) =>
                          acc +
                          (p.items || [])
                            .filter((i) => i.tipo_empaque.toLowerCase().includes(filtro.toLowerCase()))
                            .reduce((s, i) => s + i.cantidad, 0),
                        0
                      );

                    let usado = 0;
                    if (ins.codigo === "CER_MOL") usado = pedidosAprobados.reduce((acc, p) => acc + p.cera_total_g, 0);
                    else if (ins.codigo === "FRAG") usado = pedidosAprobados.reduce((acc, p) => acc + p.fragancia_total_ml, 0);
                    else if (ins.codigo === "PAB") usado = pedidosAprobados.reduce((acc, p) => acc + p.pabilo_total_cm, 0);
                    else if (ins.codigo === "YESO") usado = contarEmpaque("yeso") * 195;
                    else if (ins.codigo === "CEM") usado = contarEmpaque("yeso") * 65;
                    else if (ins.codigo === "ENV_5X8") usado = contarEmpaque("5x8");
                    else if (ins.codigo === "ENV_8X8") usado = contarEmpaque("8x8");
                    else if (ins.codigo === "EMP_ACE") usado = contarEmpaque("acetato");
                    else if (ins.codigo === "EMP_DES") usado = contarEmpaque("deseos");
                    else if (ins.codigo === "EMP_MOL") usado = contarEmpaque("caja molde");
                    else if (ins.codigo === "EMP_TUL") usado = contarEmpaque("tul");

                    const disponible = stockInicial - usado;
                    const falta = disponible <= 0;
                    const bajo = disponible > 0 && disponible <= stockInicial * 0.2;

                    return (
                      <tr key={ins.id} className="hover:bg-[#FAF6F0]">
                        <td className="p-3 font-bold text-[#3B2B23]">{ins.nombre}</td>
                        <td className="p-3 text-center">{ins.unidad}</td>
                        <td className="p-3 text-right">{ins.medida_por_unidad}</td>
                        <td className="p-3 text-right">{formatoCOP(ins.precio_por_unidad)}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min={0}
                            value={ins.cantidad_comprada}
                            onChange={(e) => {
                              const nuevaCant = Number(e.target.value);
                              const act = insumos.map((x) => (x.id === ins.id ? { ...x, cantidad_comprada: nuevaCant } : x));
                              setInsumos(act);
                              localStorage.setItem("eternia_insumos_v1", JSON.stringify(act));
                            }}
                            className="w-16 text-center font-bold bg-[#FAF6F0] border border-[#C89D7C] rounded-lg py-1"
                          />
                        </td>
                        <td className="p-3 text-right font-semibold">{stockInicial}</td>
                        <td className="p-3 text-right text-[#7A685F]">{usado}</td>
                        <td className="p-3 text-right font-extrabold text-[#3B2B23]">{disponible} {ins.unidad}</td>
                        <td className="p-3 text-center">
                          {falta ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#FADBD8] text-[#922B21] font-bold text-[10px]">🔴 FALTA</span>
                          ) : bajo ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#FCF3CF] text-[#3B2B23] font-bold text-[10px]">🟡 POCO</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-[#D4EFDF] text-[#196F3D] font-bold text-[10px]">🟢 OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}