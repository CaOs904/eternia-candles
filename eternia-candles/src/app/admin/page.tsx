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
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  CATALOGO_INICIAL_VELAS,
  INSUMOS_INICIALES,
  TARIFAS_EMPAQUE_DEFAULT,
  ProductoVela,
  InsumoItem,
  PedidoCompleto,
  formatoCOP,
  redondearCentena,
  redondearQuinientos,
  calcularCosteoVela,
  calcularCostoVasijaYeso,
  calcularFechaEntregaHabil,
} from "../../lib/eternia-engine";

export default function AdminEterniaPage() {
  // Estado de Autenticación de Supabase
  const [sesionVerificada, setSesionVerificada] = useState<boolean>(false);
  const [cargandoAuth, setCargandoAuth] = useState<boolean>(true);
  const [emailLogin, setEmailLogin] = useState<string>("");
  const [passwordLogin, setPasswordLogin] = useState<string>("");
  const [errorLogin, setErrorLogin] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<"POS" | "PEDIDOS" | "MOLDES" | "INVENTARIO" | "RECIBO">("POS");
  const [productos, setProductos] = useState<ProductoVela[]>(CATALOGO_INICIAL_VELAS);
  const [insumos, setInsumos] = useState<InsumoItem[]>(INSUMOS_INICIALES);
  const [tarifasEmpaque, setTarifasEmpaque] = useState<Record<string, number>>(TARIFAS_EMPAQUE_DEFAULT);
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);

  // Cotizador POS Completo
  const [posProductoId, setPosProductoId] = useState<string>(CATALOGO_INICIAL_VELAS[0].id);
  const [posCantidad, setPosCantidad] = useState<number>(1);
  const [posItems, setPosItems] = useState<{ producto: ProductoVela; cantidad: number }[]>([]);
  const [posDescuentoPct, setPosDescuentoPct] = useState<number>(0);
  const [posClienteNombre, setPosClienteNombre] = useState<string>("");
  const [posClienteWhatsapp, setPosClienteWhatsapp] = useState<string>("");
  const [posAprobado, setPosAprobado] = useState<boolean>(true);

  // Selector de Recibo Interno
  const [codigoReciboSeleccionado, setCodigoReciboSeleccionado] = useState<string>("PED-001");

  // Creador de Moldes
  const [nuevoNombreVela, setNuevoNombreVela] = useState<string>("");
  const [nuevaCatVela, setNuevaCatVela] = useState<ProductoVela["categoria"]>("NAVIDAD");
  const [nuevaCantVelas, setNuevaCantVelas] = useState<number>(1);
  const [nuevaCeraG, setNuevaCeraG] = useState<number>(120);
  const [nuevoPabiloCm, setNuevoPabiloCm] = useState<number>(12);
  const [nuevoEmpaque, setNuevoEmpaque] = useState<string>("Caja Molde");
  const [nuevoPrecioCatManual, setNuevoPrecioCatManual] = useState<number>(0);
  const [nuevaDescVela, setNuevaDescVela] = useState<string>("");

  // Creador de Vasijas
  const [nombreNuevaVasija, setNombreNuevaVasija] = useState<string>("");
  const [vasosYeso, setVasosYeso] = useState<number>(3);
  const [vasosCemento, setVasosCemento] = useState<number>(1);
  const [vasosAgua, setVasosAgua] = useState<number>(2);

  // Verificar sesión activa de Supabase al cargar
  useEffect(() => {
    async function verificarSesion() {
      if (!isSupabaseConfigured) {
        // Si Supabase no está configurado, permitimos acceso temporal con advertencia
        setSesionVerificada(true);
        setCargandoAuth(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSesionVerificada(true);
      }
      setCargandoAuth(false);

      // Escuchar cambios de sesión en tiempo real
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
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSesionVerificada(false);
    setEmailLogin("");
    setPasswordLogin("");
  };

  useEffect(() => {
    if (!sesionVerificada) return;

    const pedLocalAdmin = localStorage.getItem("eternia_pedidos_v1");
    if (pedLocalAdmin) {
      try {
        const parsed = JSON.parse(pedLocalAdmin);
        setPedidos(parsed);
        if (parsed.length > 0) setCodigoReciboSeleccionado(parsed[0].codigo);
      } catch (e) { console.error(e); }
    } else {
      const p1 = CATALOGO_INICIAL_VELAS[0];
      const hoy = new Date().toISOString().split("T")[0];
      const demo: PedidoCompleto[] = [
        {
          id: "demo-1",
          codigo: "PED-001",
          cliente_nombre: "María Gómez",
          cliente_whatsapp: "3100000000",
          aprobado: true,
          descuento_pct: 0,
          valor_total: p1.precio_catalogo * 5,
          costo_total: p1.costo_produccion * 5,
          abono_50: redondearCentena(p1.precio_catalogo * 5 * 0.5),
          dinero_recibido: redondearCentena(p1.precio_catalogo * 5 * 0.5),
          ganancia_libre: (p1.precio_catalogo - p1.costo_produccion) * 5,
          cera_total_g: p1.cera_g * 5,
          fragancia_total_ml: p1.fragancia_ml * 5,
          pabilo_total_cm: p1.pabilo_cm * 5,
          medio_pago: "Nequi",
          estado: "En Producción (Abono 50%)",
          origen: "Admin POS",
          fecha_pedido: hoy,
          fecha_entrega: calcularFechaEntregaHabil(hoy, 5),
          items: [{
            producto_nombre: p1.nombre,
            cantidad: 5,
            precio_unitario: p1.precio_catalogo,
            costo_unitario: p1.costo_produccion,
            cera_unitaria_g: p1.cera_g,
            fragancia_unitaria_ml: p1.fragancia_ml,
            pabilo_unitario_cm: p1.pabilo_cm,
            tipo_empaque: p1.tipo_empaque,
            subtotal: p1.precio_catalogo * 5,
          }],
        },
      ];
      setPedidos(demo);
      localStorage.setItem("eternia_pedidos_v1", JSON.stringify(demo));
    }

    const catLocal = localStorage.getItem("eternia_catalogo_v1");
    if (catLocal) {
      try { setProductos(JSON.parse(catLocal)); } catch (e) { console.error(e); }
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

  const eliminarPedido = (id: string, codigo: string) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido ${codigo}?`)) return;
    const actualizados = pedidos.filter((p) => p.id !== id);
    guardarPedidos(actualizados);
  };

  const agregarItemAlPos = () => {
    const prod = productos.find((p) => p.id === posProductoId);
    if (!prod) return;
    setPosItems((prev) => {
      const existe = prev.find((i) => i.producto.id === prod.id);
      if (existe) {
        return prev.map((i) => (i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + posCantidad } : i));
      }
      return [...prev, { producto: prod, cantidad: posCantidad }];
    });
  };

  const posCalculos = useMemo(() => {
    const subtotalBruto = posItems.reduce((acc, it) => acc + it.producto.precio_catalogo * it.cantidad, 0);
    const valorTotal = redondearCentena(subtotalBruto * (1 - posDescuentoPct / 100));
    const costoTotal = redondearCentena(posItems.reduce((acc, it) => acc + it.producto.costo_produccion * it.cantidad, 0));
    const abono50 = redondearCentena(valorTotal * 0.5);
    const gananciaLibre = valorTotal > 0 ? valorTotal - costoTotal : 0;
    const ceraG = posItems.reduce((acc, it) => acc + it.producto.cera_g * it.cantidad, 0);
    const fragMl = posItems.reduce((acc, it) => acc + it.producto.fragancia_ml * it.cantidad, 0);
    const pabCm = posItems.reduce((acc, it) => acc + it.producto.pabilo_cm * it.cantidad, 0);
    const proximoCodigo = `PED-${String(pedidos.length + 1).padStart(3, "0")}`;

    return { valorTotal, costoTotal, abono50, gananciaLibre, ceraG, fragMl, pabCm, proximoCodigo };
  }, [posItems, posDescuentoPct, pedidos.length]);

  const registrarPedidoDesdePOS = () => {
    if (posItems.length === 0) {
      alert("Agrega al menos una vela al carrito.");
      return;
    }
    const hoy = new Date().toISOString().split("T")[0];
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
      origen: "Admin POS",
      fecha_pedido: hoy,
      fecha_entrega: calcularFechaEntregaHabil(hoy, 5),
      items: posItems.map((it) => ({
        producto_nombre: it.producto.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.producto.precio_catalogo,
        costo_unitario: it.producto.costo_produccion,
        cera_unitaria_g: it.producto.cera_g,
        fragancia_unitaria_ml: it.producto.fragancia_ml,
        pabilo_unitario_cm: it.producto.pabilo_cm,
        tipo_empaque: it.producto.tipo_empaque,
        subtotal: it.producto.precio_catalogo * it.cantidad,
      })),
    };

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

  const previewVasija = useMemo(
    () => calcularCostoVasijaYeso(vasosYeso, vasosCemento, vasosAgua),
    [vasosYeso, vasosCemento, vasosAgua]
  );

  const guardarVasija = () => {
    if (!nombreNuevaVasija.trim()) {
      alert("Escribe el nombre de la vasija.");
      return;
    }
    const claveEmpaque = `Vasija Yeso: ${nombreNuevaVasija.trim()}`;
    const nuevasTarifas = {
      ...tarifasEmpaque,
      [claveEmpaque]: previewVasija.costoEmpaqueCompleto,
    };
    setTarifasEmpaque(nuevasTarifas);
    localStorage.setItem("eternia_empaques_v1", JSON.stringify(nuevasTarifas));

    setNuevoEmpaque(claveEmpaque);
    setNombreNuevaVasija("");
    alert(
      `¡Molde "${claveEmpaque}" creado con éxito! Costo de mezcla: ${formatoCOP(
        previewVasija.costoVasijaRedondeado
      )} (Con empaque: ${formatoCOP(previewVasija.costoEmpaqueCompleto)}).`
    );
  };

  const pedidoReciboActual = useMemo(() => pedidos.find((p) => p.codigo === codigoReciboSeleccionado) || pedidos[0] || null, [pedidos, codigoReciboSeleccionado]);

  // Pantalla de carga inicial al comprobar sesión
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

  // Si no ha iniciado sesión, mostramos la pantalla de bloqueo boutique
  if (!sesionVerificada) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E8D5CE] shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] text-[#FAF6F0] pointer-events-none select-none opacity-50 font-serif text-[120px] font-bold">
            E
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-full bg-[#3B2B23] items-center justify-center text-[#C89D7C] shadow-sm mb-1">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-[0.2em] text-[#3B2B23]">
              ACCESO PRIVADO
            </h1>
            <p className="text-xs text-[#7A685F] italic tracking-wider font-serif">
              Panel Administrativo • Eternia Candles
            </p>
          </div>

          <form onSubmit={iniciarSesionAdmin} className="space-y-4 pt-2">
            {errorLogin && (
              <div className="p-3 rounded-xl bg-[#FADBD8] text-[#922B21] text-xs font-medium border border-[#922B21]/20">
                {errorLogin}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#3B2B23] mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3B2B23] mb-1">Contraseña Maestra</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#C89D7C]" />
              Iniciar Sesión Segura
            </button>
          </form>

          <div className="pt-4 border-t border-[#E8D5CE] text-center">
            <Link
              href="/"
              className="text-xs text-[#7A685F] hover:text-[#3B2B23] font-medium flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Regresar a la Tienda Pública</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Panel Administrativo Completo (Protegido)
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2B23] font-sans">
      <header className="no-print bg-[#3B2B23] text-[#FAF6F0] px-4 sm:px-8 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#C89D7C] shadow-sm flex items-center justify-center bg-white">
              <img
                src="/logo-eternia.jpeg"
                alt="Eternia Candles Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-serif font-bold tracking-wider">
                ETERNIA CANDLES — PANEL ADMINISTRATIVO
              </h1>
              <p className="text-xs text-[#E8D5CE] tracking-wider">
                Cotizador • Control de Pedidos • Moldes • Recibos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-[#FAF6F0]/10 hover:bg-[#FAF6F0]/20 text-[#FAF6F0] text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Tienda</span>
            </Link>
            <button
              onClick={cerrarSesionAdmin}
              className="bg-red-900/60 hover:bg-red-900 text-[#FAF6F0] text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition tracking-wider cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#FADBD8]" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pt-4">
          {[
            { id: "POS", label: "1. Cotizador POS", icon: ShoppingCart },
            { id: "PEDIDOS", label: `2. Control de Pedidos (${pedidos.length})`, icon: CheckCircle },
            { id: "RECIBO", label: "3. Recibo / PDF", icon: FileText },
            { id: "MOLDES", label: "4. Nuevos Moldes", icon: PlusCircle },
            { id: "INVENTARIO", label: "5. Insumos", icon: Package },
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
                <Icon className="w-4 h-4 text-[#C89D7C]" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* ========================================== */}
        {/* PESTAÑA 1: COTIZADOR POS */}
        {/* ========================================== */}
        {tabActiva === "POS" && (
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8D5CE] p-6 shadow-xs space-y-5">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23]">Cotizador POS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#F3ECE1]/60 p-4 rounded-xl border border-[#E8D5CE]">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-bold mb-1">Producto</label>
                  <select
                    value={posProductoId}
                    onChange={(e) => setPosProductoId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#C89D7C] text-sm font-semibold"
                  >
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — {formatoCOP(p.precio_catalogo)}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Cant.</label>
                  <select
                    value={posCantidad}
                    onChange={(e) => setPosCantidad(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#C89D7C] text-sm font-bold text-center"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button
                    onClick={agregarItemAlPos}
                    className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
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
                        <button onClick={() => setPosItems(posItems.filter(x => x.producto.id !== it.producto.id))} className="text-red-600 hover:text-red-800 cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Nombre del Cliente</label>
                  <input type="text" value={posClienteNombre} onChange={(e) => setPosClienteNombre(e.target.value)} placeholder="Ej: María Gómez" className="w-full px-3 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">WhatsApp del Cliente</label>
                  <input type="text" value={posClienteWhatsapp} onChange={(e) => setPosClienteWhatsapp(e.target.value)} placeholder="Ej: 3100000000" className="w-full px-3 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Descuento (%)</label>
                  <input type="number" min={0} max={100} value={posDescuentoPct} onChange={(e) => setPosDescuentoPct(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"/>
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
                <h3 className="text-base font-serif font-bold border-b pb-2">Resumen Financiero y Producción</h3>
                
                <div className="p-4 bg-[#FAF6F0] rounded-xl border border-[#E8D5CE] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7A685F]">Subtotal Catálogo:</span>
                    <span className="font-bold">{formatoCOP(posItems.reduce((acc, it) => acc + it.producto.precio_catalogo * it.cantidad, 0))}</span>
                  </div>
                  {posDescuentoPct > 0 && (
                    <div className="flex justify-between items-center text-xs text-red-600">
                      <span>Descuento Aplicado ({posDescuentoPct}%):</span>
                      <span className="font-bold">-{formatoCOP(posItems.reduce((acc, it) => acc + it.producto.precio_catalogo * it.cantidad, 0) * (posDescuentoPct / 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-serif font-bold text-[#3B2B23] border-t border-[#E8D5CE] pt-2">
                    <span>VALOR TOTAL:</span>
                    <span className="text-xl text-[#C89D7C]">{formatoCOP(posCalculos.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-[#D4EFDF] text-[#196F3D] p-2 rounded-lg font-bold">
                    <span>Abono 50% Requerido:</span>
                    <span>{formatoCOP(posCalculos.abono50)}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#F3ECE1]/60 rounded-xl border border-[#E8D5CE] space-y-2 text-xs">
                  <p className="font-bold font-serif text-[#3B2B23]">Requerimientos de Insumos:</p>
                  <div className="flex justify-between">
                    <span className="text-[#7A685F]">Cera Total Requerida:</span>
                    <strong className="text-[#3B2B23]">{posCalculos.ceraG} gramos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A685F]">Fragancia Total (10%):</span>
                    <strong className="text-[#3B2B23]">{posCalculos.fragMl} ml</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A685F]">Pabilo Total:</span>
                    <strong className="text-[#3B2B23]">{posCalculos.pabCm} cm</strong>
                  </div>
                  <div className="flex justify-between border-t border-[#E8D5CE] pt-2">
                    <span className="text-[#7A685F]">Ganancia Estimada:</span>
                    <strong className="text-[#196F3D]">{formatoCOP(posCalculos.gananciaLibre)}</strong>
                  </div>
                </div>
              </div>

              <button onClick={registrarPedidoDesdePOS} className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer shadow-md transition tracking-wider">
                Guardar Pedido ({posCalculos.proximoCodigo})
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PESTAÑA 2: CONTROL DE PEDIDOS */}
        {/* ========================================== */}
        {tabActiva === "PEDIDOS" && (
          <div className="no-print space-y-6">
            <div className="bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#3B2B23] text-white font-serif">
                    <th className="p-3">Código</th>
                    <th className="p-3">Aprobado</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Productos</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE1]">
                  {pedidos.map((ped) => (
                    <tr key={ped.id} className="hover:bg-[#FAF6F0]/60">
                      <td className="p-3 font-bold">{ped.codigo}</td>
                      <td className="p-3">
                        <select
                          value={ped.aprobado ? "Sí" : "No"}
                          onChange={(e) => {
                            const mod = { ...ped, aprobado: e.target.value === "Sí" };
                            guardarPedidos(pedidos.map(x => x.id === ped.id ? mod : x));
                          }}
                          className={`px-2 py-1 rounded font-bold ${ped.aprobado ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className="p-3"><strong>{ped.cliente_nombre}</strong><br/>{ped.cliente_whatsapp}</td>
                      <td className="p-3">{(ped.items || []).map((it, idx) => (<div key={idx}>{it.cantidad}x {it.producto_nombre}</div>))}</td>
                      <td className="p-3 text-right font-bold">{formatoCOP(ped.valor_total)}</td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        <button onClick={() => { setCodigoReciboSeleccionado(ped.codigo); setTabActiva("RECIBO"); }} className="bg-[#C89D7C] text-white p-1.5 rounded cursor-pointer" title="Recibo"><FileText className="w-4 h-4"/></button>
                        <button onClick={() => eliminarPedido(ped.id, ped.codigo)} className="bg-red-700 hover:bg-red-800 text-white p-1.5 rounded cursor-pointer" title="Eliminar Pedido"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PESTAÑA 3: RECIBO / PDF */}
        {/* ========================================== */}
        {tabActiva === "RECIBO" && (
          <div className="space-y-6">
            <div className="no-print bg-white p-4 rounded-2xl border border-[#E8D5CE] flex justify-between items-center shadow-xs">
              <div className="flex items-center gap-3">
                <label className="text-xs font-serif font-bold text-[#3B2B23]">SELECCIONAR PEDIDO:</label>
                <select value={codigoReciboSeleccionado} onChange={(e) => setCodigoReciboSeleccionado(e.target.value)} className="px-4 py-2 bg-[#FAF6F0] border border-[#C89D7C] rounded-xl font-bold text-sm text-[#3B2B23]">
                  {pedidos.map(p => (<option key={p.id} value={p.codigo}>{p.codigo} — {p.cliente_nombre}</option>))}
                </select>
              </div>
              <button onClick={() => window.print()} className="bg-[#3B2B23] hover:bg-[#523d32] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm tracking-wider">
                <Printer className="w-4 h-4 text-[#C89D7C]"/> Imprimir Recibo PDF
              </button>
            </div>

            {pedidoReciboActual && (
              <div className="bg-white max-w-xl mx-auto p-5 sm:p-6 rounded-2xl border border-[#E8D5CE] shadow-md space-y-4 font-sans relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] text-[#FAF6F0] pointer-events-none select-none opacity-40 font-serif text-[100px] font-bold">
                  E
                </div>

                <div className="text-center border-b border-[#E8D5CE] pb-3 space-y-1">
                  <div className="inline-flex w-8 h-8 rounded-full bg-[#C89D7C] items-center justify-center text-white shadow-xs mb-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-serif font-bold tracking-[0.2em] text-[#3B2B23]">
                    ETERNIA CANDLES
                  </h2>
                  <p className="text-[10px] text-[#7A685F] italic tracking-widest font-serif">
                    Handmade Aromas • Diseño, Calma y Esencia Natural
                  </p>
                  <p className="text-[10px] text-[#7A685F] tracking-wider pt-0.5">
                    Bogotá, Colombia • IG: @eternia.candles • WA: 313 201 9146
                  </p>
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
                    Resumen de Productos
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
                      {pedidoReciboActual.items.map((it, i) => (
                        <tr key={i} className="hover:bg-[#FAF6F0]/40">
                          <td className="py-2 font-serif font-bold text-[#3B2B23]">{it.producto_nombre}</td>
                          <td className="py-2 text-center font-bold">{it.cantidad}</td>
                          <td className="py-2 text-right text-[#7A685F]">{formatoCOP(it.precio_unitario)}</td>
                          <td className="py-2 text-right font-bold text-[#3B2B23]">{formatoCOP(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    <span className="font-bold">
                      {formatoCOP(Math.max(0, pedidoReciboActual.valor_total - pedidoReciboActual.abono_50))}
                    </span>
                  </div>
                </div>

                <div className="text-center space-y-1.5 pt-1.5 border-t border-[#E8D5CE]">
                  <div className="bg-[#F3ECE1]/60 p-2.5 rounded-xl text-[10px] text-[#7A685F] space-y-0.5">
                    <p className="font-serif font-bold text-[#3B2B23]">
                      Cuentas Oficiales — María Paula Prada Coronado
                    </p>
                    <p>Nequi / Daviplata: <strong className="text-[#3B2B23]">313 201 9146</strong> | Bancolombia Ahorros: <strong className="text-[#3B2B23]">22582959122</strong></p>
                  </div>
                  <p className="text-[10px] font-serif italic text-[#7A685F]">
                    ✨ Gracias por permitirnos iluminar tus espacios con calma y diseño.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* PESTAÑA 4: NUEVOS MOLDES */}
        {/* ========================================== */}
        {tabActiva === "MOLDES" && (
          <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E8D5CE] shadow-xs space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23] border-b border-[#F3ECE1] pb-2">
                🕯️ 1. Agregar Nuevo Molde de Vela
              </h2>
              <p className="text-xs text-[#7A685F]">
                Ingresa los gramos de cera y el pabilo: el sistema calcula automáticamente la fragancia y el precio justo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1">Nombre de la Nueva Vela *</label>
                  <input
                    type="text"
                    value={nuevoNombreVela}
                    onChange={(e) => setNuevoNombreVela(e.target.value)}
                    placeholder="Ej: Vela Pino Nórdico Mediano"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Categoría</label>
                  <select
                    value={nuevaCatVela}
                    onChange={(e) => setNuevaCatVela(e.target.value as ProductoVela["categoria"])}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"
                  >
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
                  <select
                    value={nuevoEmpaque}
                    onChange={(e) => setNuevoEmpaque(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"
                  >
                    {Object.entries(tarifasEmpaque).map(([nombreEmp, costoEmp]) => (
                      <option key={nombreEmp} value={nombreEmp}>
                        {nombreEmp} ({formatoCOP(costoEmp)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Peso en Cera (Gramos)</label>
                  <input
                    type="number"
                    value={nuevaCeraG}
                    onChange={(e) => setNuevaCeraG(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Pabilo (Centímetros)</label>
                  <input
                    type="number"
                    value={nuevoPabiloCm}
                    onChange={(e) => setNuevoPabiloCm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Cant. Velas en el Kit</label>
                  <input
                    type="number"
                    min={1}
                    value={nuevaCantVelas}
                    onChange={(e) => setNuevaCantVelas(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Precio Manual (Opcional)</label>
                  <input
                    type="number"
                    step={500}
                    value={nuevoPrecioCatManual}
                    onChange={(e) => setNuevoPrecioCatManual(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"
                  />
                </div>
              </div>

              <div className="bg-[#F3ECE1] p-4 rounded-xl border border-[#E8D5CE] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-[#7A685F] block">Fragancia (10%)</span>
                  <strong className="text-sm">{previewNuevaVela.fraganciaMl} ml</strong>
                </div>
                <div>
                  <span className="text-[#7A685F] block">Costo Prod.</span>
                  <strong className="text-sm">{formatoCOP(previewNuevaVela.costoProduccion)}</strong>
                </div>
                <div>
                  <span className="text-[#7A685F] block">Precio Justo</span>
                  <strong className="text-sm text-[#1B4F72]">
                    {formatoCOP(previewNuevaVela.precioJusto)}
                  </strong>
                </div>
                <div>
                  <span className="text-[#7A685F] block">Ganancia</span>
                  <strong className="text-sm text-[#196F3D]">
                    +{formatoCOP(previewNuevaVela.gananciaLibre)}
                  </strong>
                </div>
              </div>

              <button
                onClick={guardarNuevoMoldeVela}
                className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-3 rounded-xl text-sm shadow-xs transition cursor-pointer tracking-wider"
              >
                + Guardar Vela en Catálogo
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8D5CE] shadow-xs space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23] border-b border-[#F3ECE1] pb-2">
                🏺 2. Agregar Nueva Vasija (Yeso + Cemento)
              </h2>
              <p className="text-xs text-[#7A685F]">
                Medida estándar: 1 vaso Yeso = 65g, 1 vaso Cemento = 65g, 1 vaso Agua = 95g.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Nombre de la Vasija *</label>
                  <input
                    type="text"
                    value={nombreNuevaVasija}
                    onChange={(e) => setNombreNuevaVasija(e.target.value)}
                    placeholder="Ej: Bandeja Ovalada / Vasija Geométrica"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Vasos Yeso</label>
                    <input
                      type="number"
                      step="0.5"
                      value={vasosYeso}
                      onChange={(e) => setVasosYeso(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Vasos Cemento</label>
                    <input
                      type="number"
                      step="0.5"
                      value={vasosCemento}
                      onChange={(e) => setVasosCemento(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Vasos Agua</label>
                    <input
                      type="number"
                      step="0.5"
                      value={vasosAgua}
                      onChange={(e) => setVasosAgua(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E8D5CE] grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#7A685F] block">Mezcla Exacta:</span>
                    <strong className="text-sm">
                      {previewVasija.gramosYeso}g Yeso + {previewVasija.gramosCemento}g Cemento +{" "}
                      {previewVasija.gramosAgua}g Agua
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#7A685F] block">Costo Total:</span>
                    <strong className="text-sm text-[#196F3D]">
                      {formatoCOP(previewVasija.costoEmpaqueCompleto)}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={guardarVasija}
                  className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3 rounded-xl text-sm shadow-xs transition cursor-pointer tracking-wider"
                >
                  + Registrar Vasija
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PESTAÑA 5: INVENTARIO */}
        {/* ========================================== */}
        {tabActiva === "INVENTARIO" && (
          <div className="no-print bg-white rounded-2xl border border-[#E8D5CE] overflow-x-auto shadow-xs">
            <div className="p-5 border-b border-[#F3ECE1]">
              <h2 className="text-lg font-serif font-bold text-[#3B2B23]">
                Control de Insumos con Descuento Automático
              </h2>
              <p className="text-xs text-[#7A685F]">
                Descuenta automáticamente insumos y empaques según los pedidos aprobados.
              </p>
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
                  if (ins.codigo === "CER_MOL") {
                    usado = pedidosAprobados.reduce((acc, p) => acc + p.cera_total_g, 0);
                  } else if (ins.codigo === "FRAG") {
                    usado = pedidosAprobados.reduce((acc, p) => acc + p.fragancia_total_ml, 0);
                  } else if (ins.codigo === "PAB") {
                    usado = pedidosAprobados.reduce((acc, p) => acc + p.pabilo_total_cm, 0);
                  } else if (ins.codigo === "YESO") {
                    usado = contarEmpaque("yeso") * 195;
                  } else if (ins.codigo === "CEM") {
                    usado = contarEmpaque("yeso") * 65;
                  } else if (ins.codigo === "ENV_5X8") {
                    usado = contarEmpaque("5x8");
                  } else if (ins.codigo === "ENV_8X8") {
                    usado = contarEmpaque("8x8");
                  } else if (ins.codigo === "EMP_ACE") {
                    usado = contarEmpaque("acetato");
                  } else if (ins.codigo === "EMP_DES") {
                    usado = contarEmpaque("deseos");
                  } else if (ins.codigo === "EMP_MOL") {
                    usado = contarEmpaque("caja molde");
                  } else if (ins.codigo === "EMP_TUL") {
                    usado = contarEmpaque("tul");
                  }

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
                            const act = insumos.map((x) =>
                              x.id === ins.id ? { ...x, cantidad_comprada: nuevaCant } : x
                            );
                            setInsumos(act);
                            localStorage.setItem("eternia_insumos_v1", JSON.stringify(act));
                          }}
                          className="w-16 text-center font-bold bg-[#FAF6F0] border border-[#C89D7C] rounded-lg py-1"
                        />
                      </td>
                      <td className="p-3 text-right font-semibold">{stockInicial}</td>
                      <td className="p-3 text-right text-[#7A685F]">{usado}</td>
                      <td className="p-3 text-right font-extrabold text-[#3B2B23]">
                        {disponible} {ins.unidad}
                      </td>
                      <td className="p-3 text-center">
                        {falta ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#FADBD8] text-[#922B21] font-bold text-[10px]">
                            🔴 FALTA
                          </span>
                        ) : bajo ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#FCF3CF] text-[#3B2B23] font-bold text-[10px]">
                            🟡 POCO
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#D4EFDF] text-[#196F3D] font-bold text-[10px]">
                            🟢 OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}