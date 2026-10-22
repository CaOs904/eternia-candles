"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  Send,
  Calendar,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  CATALOGO_INICIAL_VELAS,
  ProductoVela,
  ItemCarrito,
  PedidoItemDetalle,
  formatoCOP,
  redondearCentena,
  calcularFechaEntregaHabil,
  generarMensajeWhatsAppPedido,
  PedidoCompleto,
} from "../lib/eternia-engine";

const CATEGORIAS = [
  "TODAS",
  "DÍA DE LAS VELITAS",
  "NAVIDAD",
  "VASIJAS DE YESO",
  "RECORDATORIOS Y EVENTOS",
  "TODA OCASIÓN",
  "HALLOWEEN",
];

export default function TiendaEterniaPage() {
  const [productos, setProductos] = useState<ProductoVela[]>(CATALOGO_INICIAL_VELAS);
  const [categoriaActiva, setCategoriaActiva] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState<boolean>(false);

  const [clienteNombre, setClienteNombre] = useState<string>("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState<string>("");
  const [medioPagoPreferido, setMedioPagoPreferido] = useState<string>("Nequi");
  const [enviando, setEnviando] = useState<boolean>(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<string | null>(null);

  useEffect(() => {
    async function cargarCatalogo() {
      const guardadoLocal = localStorage.getItem("eternia_catalogo_v1");
      if (guardadoLocal) {
        try {
          setProductos(JSON.parse(guardadoLocal));
        } catch (err) {
          console.error(err);
        }
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("productos_velas")
          .select("*")
          .eq("activo_en_tienda", true)
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          setProductos(data as ProductoVela[]);
          localStorage.setItem("eternia_catalogo_v1", JSON.stringify(data));
        }
      }
    }
    cargarCatalogo();

    const carritoGuardado = localStorage.getItem("eternia_carrito_cliente");
    if (carritoGuardado) {
      try {
        setCarrito(JSON.parse(carritoGuardado));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("eternia_carrito_cliente", JSON.stringify(carrito));
  }, [carrito]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p: ProductoVela) => {
      if (p.precio_catalogo <= 0) return false;
      const coincideCat = categoriaActiva === "TODAS" || p.categoria === categoriaActiva;
      const coincideBusq =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion || "").toLowerCase().includes(busqueda.toLowerCase());
      return coincideCat && coincideBusq;
    });
  }, [productos, categoriaActiva, busqueda]);

  const agregarAlCarrito = (producto: ProductoVela, cant: number = 1) => {
    setCarrito((prev: ItemCarrito[]) => {
      const existe = prev.find((item: ItemCarrito) => item.producto.id === producto.id);
      if (existe) {
        return prev.map((item: ItemCarrito) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: Math.min(100, item.cantidad + cant) }
            : item
        );
      }
      return [...prev, { producto, cantidad: cant }];
    });
  };

  const cambiarCantidad = (id: string, nuevaCant: number) => {
    if (nuevaCant <= 0) {
      setCarrito((prev: ItemCarrito[]) => prev.filter((item: ItemCarrito) => item.producto.id !== id));
    } else {
      setCarrito((prev: ItemCarrito[]) =>
        prev.map((item: ItemCarrito) =>
          item.producto.id === id ? { ...item, cantidad: Math.min(100, nuevaCant) } : item
        )
      );
    }
  };

  const totalUnidades = useMemo(
    () => carrito.reduce((acc: number, it: ItemCarrito) => acc + it.cantidad, 0),
    [carrito]
  );

  const valorTotalCarrito = useMemo(
    () =>
      redondearCentena(
        carrito.reduce((acc: number, it: ItemCarrito) => acc + it.producto.precio_catalogo * it.cantidad, 0)
      ),
    [carrito]
  );

  const abono50Carrito = useMemo(() => redondearCentena(valorTotalCarrito * 0.5), [valorTotalCarrito]);
  const fechaEntregaEstimada = useMemo(() => calcularFechaEntregaHabil(undefined, 5), []);

  const confirmarPedidoWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (carrito.length === 0) return;
    if (!clienteNombre.trim() || !clienteWhatsapp.trim()) {
      alert("Por favor escribe tu nombre y tu número de WhatsApp para agendar tu pedido.");
      return;
    }

    setEnviando(true);
    try {
      const pedidosLocalesRaw = localStorage.getItem("eternia_pedidos_v1");
      const pedidosLocales: PedidoCompleto[] = pedidosLocalesRaw ? JSON.parse(pedidosLocalesRaw) : [];
      const nuevoNumero = pedidosLocales.length + 1;
      const codigoPedido = `PED-${String(nuevoNumero).padStart(3, "0")}`;

      const costoTotal = redondearCentena(
        carrito.reduce((acc: number, it: ItemCarrito) => acc + it.producto.costo_produccion * it.cantidad, 0)
      );
      const gananciaLibre = valorTotalCarrito - costoTotal;
      const ceraTotal = carrito.reduce((acc: number, it: ItemCarrito) => acc + it.producto.cera_g * it.cantidad, 0);
      const fragTotal = carrito.reduce((acc: number, it: ItemCarrito) => acc + it.producto.fragancia_ml * it.cantidad, 0);
      const pabTotal = carrito.reduce((acc: number, it: ItemCarrito) => acc + it.producto.pabilo_cm * it.cantidad, 0);
      const hoyStr = new Date().toISOString().split("T")[0];

      const nuevoPedido: PedidoCompleto = {
        id: `ped-${Date.now()}`,
        codigo: codigoPedido,
        cliente_nombre: clienteNombre.trim(),
        cliente_whatsapp: clienteWhatsapp.trim(),
        aprobado: false,
        descuento_pct: 0,
        valor_total: valorTotalCarrito,
        costo_total: costoTotal,
        abono_50: abono50Carrito,
        dinero_recibido: 0,
        ganancia_libre: gananciaLibre,
        cera_total_g: ceraTotal,
        fragancia_total_ml: fragTotal,
        pabilo_total_cm: pabTotal,
        medio_pago: medioPagoPreferido,
        estado: "Pendiente Anticipo",
        origen: "Tienda Web",
        fecha_pedido: hoyStr,
        fecha_entrega: fechaEntregaEstimada,
        items: carrito.map((it: ItemCarrito) => ({
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

      const actualizados = [nuevoPedido, ...pedidosLocales];
      localStorage.setItem("eternia_pedidos_v1", JSON.stringify(actualizados));

      if (isSupabaseConfigured) {
        const { data: pedInsertado, error: errPed } = await supabase
          .from("pedidos")
          .insert({
            codigo: nuevoPedido.codigo,
            cliente_nombre: nuevoPedido.cliente_nombre,
            cliente_whatsapp: nuevoPedido.cliente_whatsapp,
            aprobado: false,
            descuento_pct: 0,
            valor_total: nuevoPedido.valor_total,
            costo_total: nuevoPedido.costo_total,
            abono_50: nuevoPedido.abono_50,
            dinero_recibido: 0,
            ganancia_libre: nuevoPedido.ganancia_libre,
            cera_total_g: nuevoPedido.cera_total_g,
            fragancia_total_ml: nuevoPedido.fragancia_total_ml,
            pabilo_total_cm: nuevoPedido.pabilo_total_cm,
            medio_pago: nuevoPedido.medio_pago,
            estado: nuevoPedido.estado,
            origen: "Tienda Web",
            fecha_pedido: nuevoPedido.fecha_pedido,
            fecha_entrega: nuevoPedido.fecha_entrega,
          })
          .select()
          .single();

        if (!errPed && pedInsertado) {
          await supabase.from("pedido_items").insert(
            nuevoPedido.items.map((item: PedidoItemDetalle) => ({
              pedido_id: pedInsertado.id,
              producto_nombre: item.producto_nombre,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              costo_unitario: item.costo_unitario,
              cera_unitaria_g: item.cera_unitaria_g,
              fragancia_unitaria_ml: item.fragancia_unitaria_ml,
              pabilo_unitario_cm: item.pabilo_unitario_cm,
              tipo_empaque: item.tipo_empaque,
              subtotal: item.subtotal,
            }))
          );
        }
      }

      const textoWA = generarMensajeWhatsAppPedido({
        codigoPedido,
        clienteNombre,
        items: carrito.map((it: ItemCarrito) => ({ cantidad: it.cantidad, nombre: it.producto.nombre })),
        valorTotal: valorTotalCarrito,
        abono50: abono50Carrito,
      });

      const urlWA = `https://wa.me/573132019146?text=${encodeURIComponent(textoWA)}`;
      setPedidoConfirmado(codigoPedido);
      setCarrito([]);
      localStorage.removeItem("eternia_carrito_cliente");
      window.open(urlWA, "_blank");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2B23] flex flex-col font-sans">
      <div className="bg-[#3B2B23] text-[#FAF6F0] text-xs sm:text-sm py-2 px-4 text-center font-medium tracking-wide">
        ✨ Velas artesanales hechas con amor y esencia natural • Agendamos con el 50% de anticipo • Entrega de 5 a 6 días hábiles
      </div>

      <header className="sticky top-0 z-30 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E8D5CE] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif tracking-widest font-bold text-[#3B2B23]">
                ETERNIA CANDLES
              </h1>
              <p className="text-xs text-[#7A685F] italic tracking-wider font-serif">
                Handmade Aromas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCarritoAbierto(true)}
              className="relative bg-[#3B2B23] hover:bg-[#523d32] text-[#FAF6F0] px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#C89D7C]" />
              <span>Mi Pedido</span>
              {totalUnidades > 0 && (
                <span className="bg-[#C89D7C] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalUnidades}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[#F3ECE1] to-[#FAF6F0] pt-10 pb-8 px-4 sm:px-8 border-b border-[#E8D5CE]">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block bg-[#E8D5CE]/60 text-[#3B2B23] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest font-serif">
            Catálogo Oficial • @eternia.candles
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-medium text-[#3B2B23] max-w-3xl mx-auto leading-relaxed tracking-wide">
            Ilumina tus momentos con diseño, calma y aroma natural
          </h2>

          <div className="max-w-md mx-auto relative pt-4">
            <Search className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-7" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar vela (ej. Deseos, Cascanueces, Osito...)"
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#E8D5CE] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89D7C] shadow-sm"
            />
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pt-4 pb-1">
            {CATEGORIAS.map((cat) => {
              const activa = categoriaActiva === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition shadow-sm cursor-pointer tracking-wider ${
                    activa
                      ? "bg-[#C89D7C] text-white"
                      : "bg-white text-[#7A685F] hover:bg-[#E8D5CE]/40 border border-[#E8D5CE]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map((prod: ProductoVela) => {
            const itemEnCarrito = carrito.find((i: ItemCarrito) => i.producto.id === prod.id);
            const cantActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-[#E8D5CE] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#F3ECE1] text-[#7A685F] font-serif">
                      {prod.categoria}
                    </span>
                    <span className="text-xs text-[#7A685F] font-medium">
                      {prod.cera_g > 0 ? `${prod.cera_g}g cera` : prod.tipo_empaque}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold font-serif text-[#3B2B23] group-hover:text-[#C89D7C] transition tracking-wide">
                    {prod.nombre}
                  </h3>

                  <p className="text-xs text-[#7A685F] mt-2 leading-relaxed">
                    {prod.descripcion || `Presentación en ${prod.tipo_empaque}. Hecha a mano con esencia natural.`}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F3ECE1] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A685F] block uppercase tracking-wider">Precio</span>
                    <span className="text-xl font-extrabold text-[#3B2B23]">
                      {formatoCOP(prod.precio_catalogo)}
                    </span>
                  </div>

                  {cantActual === 0 ? (
                    <button
                      onClick={() => agregarAlCarrito(prod, 1)}
                      className="bg-[#C89D7C] hover:bg-[#b58967] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer tracking-wider"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar al Pedido
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#F3ECE1] px-2.5 py-1.5 rounded-xl border border-[#C89D7C]">
                      <button
                        onClick={() => cambiarCantidad(prod.id, cantActual - 1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#3B2B23] flex items-center justify-center font-bold shadow-sm cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{cantActual}</span>
                      <button
                        onClick={() => cambiarCantidad(prod.id, cantActual + 1)}
                        className="w-7 h-7 rounded-lg bg-[#C89D7C] text-white flex items-center justify-center font-bold shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {totalUnidades > 0 && !carritoAbierto && (
        <div className="fixed bottom-6 inset-x-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setCarritoAbierto(true)}
            className="w-full bg-[#3B2B23] text-[#FAF6F0] py-4 px-6 rounded-2xl shadow-2xl flex items-center justify-between border border-[#C89D7C] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#C89D7C] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                {totalUnidades}
              </span>
              <span className="font-bold text-sm tracking-wider">Ver mi pedido y agendar</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-[#C89D7C] block">
                Total: {formatoCOP(valorTotalCarrito)}
              </span>
              <span className="text-[10px] text-[#E8D5CE] block">
                Anticipo 50%: {formatoCOP(abono50Carrito)}
              </span>
            </div>
          </button>
        </div>
      )}

      {carritoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-[#FAF6F0] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#E8D5CE]">
            <div className="p-5 bg-[#F3ECE1] border-b border-[#E8D5CE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C89D7C]" />
                <h3 className="font-bold text-lg font-serif text-[#3B2B23]">Tu Pedido en Eternia Candles</h3>
              </div>
              <button
                onClick={() => setCarritoAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-[#E8D5CE]/50 text-[#3B2B23] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Sparkles className="w-10 h-10 text-[#C89D7C] mx-auto opacity-60" />
                  <p className="text-sm text-[#7A685F]">
                    Tu carrito está vacío. ¡Elige tus velas favoritas del catálogo!
                  </p>
                </div>
              ) : (
                <>
                  {carrito.map(({ producto, cantidad }: ItemCarrito) => (
                    <div
                      key={producto.id}
                      className="bg-white p-4 rounded-xl border border-[#E8D5CE] flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex-1">
                        <h4 className="font-bold text-sm font-serif text-[#3B2B23]">{producto.nombre}</h4>
                        <p className="text-xs text-[#7A685F]">
                          {formatoCOP(producto.precio_catalogo)} c/u • Subtotal:{" "}
                          <strong className="text-[#3B2B23]">
                            {formatoCOP(producto.precio_catalogo * cantidad)}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={cantidad}
                          onChange={(e) => cambiarCantidad(producto.id, Number(e.target.value))}
                          className="bg-[#F3ECE1] border border-[#C89D7C] rounded-lg px-2 py-1 text-xs font-bold text-[#3B2B23]"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => cambiarCantidad(producto.id, 0)}
                          className="p-1.5 text-[#922B21] hover:bg-[#FADBD8]/50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="bg-[#F3ECE1] p-4 rounded-2xl border border-[#E8D5CE] space-y-2 text-sm">
                    <div className="flex justify-between font-bold text-base font-serif text-[#3B2B23]">
                      <span>Valor Total del Pedido:</span>
                      <span>{formatoCOP(valorTotalCarrito)}</span>
                    </div>
                    <div className="flex justify-between text-[#196F3D] font-bold bg-[#D4EFDF] px-3 py-2 rounded-lg">
                      <span>Anticipo 50% (Para iniciar):</span>
                      <span>{formatoCOP(abono50Carrito)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#7A685F] pt-1">
                      <span>Saldo contra entrega:</span>
                      <span>{formatoCOP(valorTotalCarrito - abono50Carrito)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#7A685F] pt-2 border-t border-[#E8D5CE]">
                      <Calendar className="w-3.5 h-3.5 text-[#C89D7C]" />
                      <span>
                        Entrega estimada (5-6 días hábiles): <strong>{fechaEntregaEstimada}</strong>
                      </span>
                    </div>
                  </div>

                  <form onSubmit={confirmarPedidoWhatsApp} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">
                        Tu Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="Ej: María Gómez"
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">
                        Tu WhatsApp / Celular *
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteWhatsapp}
                        onChange={(e) => setClienteWhatsapp(e.target.value)}
                        placeholder="Ej: 310 000 0000"
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">
                        Medio de Pago Preferido para el 50%
                      </label>
                      <select
                        value={medioPagoPreferido}
                        onChange={(e) => setMedioPagoPreferido(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C89D7C]"
                      >
                        <option value="Nequi">Nequi (313 201 9146)</option>
                        <option value="Bancolombia">Bancolombia Ahorros (22582959122)</option>
                        <option value="Daviplata">Daviplata (313 201 9146)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition text-sm cursor-pointer tracking-wider"
                    >
                      <Send className="w-4 h-4" />
                      {enviando ? "Generando Pedido..." : "Enviar Pedido por WhatsApp"}
                    </button>
                  </form>
                </>
              )}

              {pedidoConfirmado && (
                <div className="p-4 rounded-xl bg-[#D4EFDF] text-[#196F3D] text-xs space-y-1 border border-[#196F3D]/20">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Pedido {pedidoConfirmado} registrado!
                  </div>
                  <p>
                    Se abrió WhatsApp con el resumen de tu pedido para enviar el comprobante del 50% de anticipo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#F3ECE1] border-t border-[#E8D5CE] py-10 px-4 sm:px-8 text-center text-xs text-[#7A685F] space-y-2 font-serif">
        <p className="font-bold text-[#3B2B23] text-sm tracking-widest">ETERNIA CANDLES • BOGOTÁ, COLOMBIA</p>
        <p className="tracking-wide">
          Nequi / Daviplata: 313 201 9146 • Bancolombia Ahorros: 22582959122 (María Paula Prada Coronado)
        </p>
        <p className="flex items-center justify-center gap-1 text-[11px] pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C89D7C]" />
          Hecho a mano con amor, diseño y esencia natural.
        </p>
      </footer>
    </div>
  );
}