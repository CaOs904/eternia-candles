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
  Flame,
  Gift,
  Compass,
  BookOpen,
  Clock,
  Scissors,
  Heart,
  ChevronRight,
  ChevronLeft,
  PackageCheck,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  CATALOGO_INICIAL_VELAS,
  ProductoVela,
  PedidoItemDetalle,
  formatoCOP,
  redondearCentena,
  calcularFechaEntregaHabil,
  PedidoCompleto,
} from "../lib/eternia-engine";

interface AromaTiendaItem {
  id: string;
  nombre: string;
  notas: string;
  disponible: boolean;
}

interface ItemCarritoConAroma {
  clave: string;
  producto: ProductoVela;
  cantidad: number;
  aroma: string;
}

const PEDIDO_MINIMO_COP = 15000;

const PRODUCTO_CLUB_ETERNIA: ProductoVela = {
  id: "club-eternia-mes",
  nombre: "Caja Club Eternia — La Vela del Mes (Edición Coleccionable)",
  categoria: "TODA OCASIÓN",
  cant_velas: 4,
  cera_g: 260,
  fragancia_ml: 26,
  pabilo_cm: 35,
  tipo_empaque: "Caja Boutique Club Eternia",
  costo_produccion: 28000,
  precio_justo: 70000,
  precio_catalogo: 70000,
  descripcion:
    "Incluye: 1 Vela de Vaso Principal + Mini Combo de Moldes Pequeños + Wax Melts + Caja de Cerillas Eternia + Sachet Perfumado + Tarjeta Coleccionable Ilustrada del Mes.",
  activo_en_tienda: true,
};

const AROMAS_DEFAULT_TIENDA: AromaTiendaItem[] = [
  { id: "vainilla", nombre: "Vainilla Francesa", notas: "Dulce, cálida y acogedora", disponible: true },
  { id: "frutos-rojos", nombre: "Frutos Rojos & Moras", notas: "Vibrante, frutal y envolvente", disponible: true },
  { id: "lavanda", nombre: "Lavanda Relajante", notas: "Floral, herbal y calmante", disponible: true },
  { id: "canela", nombre: "Canela & Especias", notas: "Hogar, calidez y notas especiadas", disponible: true },
  { id: "pino", nombre: "Pino Nórdico", notas: "Bosque fresco y madera invernal", disponible: true },
  { id: "coco-sandalo", nombre: "Coco & Sándalo", notas: "Cremoso, exótico y amaderado", disponible: true },
  { id: "maracuya", nombre: "Maracuyá Tropical", notas: "Cítrico, alegre y refrescante", disponible: true },
  { id: "bambu", nombre: "Bambú & Té Verde", notas: "Limpio, botánico y sereno", disponible: false },
];

const CATEGORIAS = [
  "TODAS",
  "DÍA DE LAS VELITAS",
  "NAVIDAD",
  "VASIJAS DE YESO",
  "RECORDATORIOS Y EVENTOS",
  "TODA OCASIÓN",
  "HALLOWEEN",
];

const ETAPAS_MAPA = [
  { id: "Pendiente Anticipo", titulo: "1. Orden Agendada", sub: "Esperando validación del 50% de anticipo", icono: Clock },
  { id: "En Producción (Abono 50%)", titulo: "2. Preparación de Moldes", sub: "Selección de pabilo de algodón y alistamiento artesanal", icono: Sparkles },
  { id: "Fundición y Vertido", titulo: "3. Fundición y Esencias", sub: "Vertido de cera vegetal a temperatura controlada y notas olfativas", icono: Flame },
  { id: "Curado y Acabado", titulo: "4. Reposo y Acabado", sub: "Curado térmico para fijar el aroma y pulido de detalles", icono: Heart },
  { id: "Listo para Entrega", titulo: "5. Empacado Boutique", sub: "¡Tu pedido está listo con su presentación y tarjeta!", icono: PackageCheck },
];

const SLIDES_CUIDADO = [
  {
    badge: "CAPÍTULO I • LA MEMORIA DE LA CERA",
    titulo: "El Primer Encendido lo Define Todo",
    descripcion:
      "La cera vegetal natural tiene memoria térmica. La primera vez que enciendas tu vela Eternia, déjala arder entre 2 y 3 horas continuas hasta que la cera derretida alcance los bordes del recipiente o molde.",
    Comparativa: {
      malo: "Encendido de 20 min ➔ Crea túnel central y desperdicia cera.",
      bueno: "Encendido de 2 a 3 horas ➔ Piscina uniforme y aroma envolvente.",
    },
  },
  {
    badge: "CAPÍTULO II • EL ARTE DEL PABILO",
    titulo: "Corte Preciso a 5 Milímetros",
    descripcion:
      "Antes de cada encendido, recorta la punta quemada del pabilo de algodón dejando aproximadamente 5 mm de altura. Esto garantiza una llama serena, limpia y sin humo negro.",
    Comparativa: {
      malo: "Pabilo largo (>1 cm) ➔ Llama inquieta, humo y consumo acelerado.",
      bueno: "Pabilo a 5 mm ➔ Llama cálida, combustión lenta y máxima duración.",
    },
  },
  {
    badge: "CAPÍTULO III • CORAZÓN DE YESO Y CEMENTO",
    titulo: "Segunda Vida para tus Vasijas Artesanales",
    descripcion:
      "Nuestras vasijas son fundidas a mano con una mezcla exacta de yeso y cemento blanco. Cuando tu vela termine su ciclo, limpia el interior con agua tibia y dale una nueva vida.",
    Comparativa: {
      malo: "Desechar el envase ➔ Pierdes una pieza única hecha a mano.",
      bueno: "Reutilizar como maceta o joyero ➔ Decoración eterna en tu hogar.",
    },
  },
];

function productoLlevaAroma(prod: ProductoVela): boolean {
  const n = prod.nombre.toLowerCase();
  if (n.includes("deseo") || n.includes("sin aroma")) return false;
  if (prod.fragancia_ml <= 0 && prod.cera_g <= 0) return false;
  return true;
}

// ============================================================================
// COMPONENTE: GATICO CRIOLLO CHIBI (NARANJA Y BLANCO) COLGANDO CON ANIMACIÓN
// ============================================================================
function GaticoCriolloColgante({ asustado }: { asustado: boolean }) {
  return (
    <div
      className={`pointer-events-none select-none transition-transform duration-300 ${
        asustado ? "-translate-y-3 scale-115" : "group-hover:-translate-y-1"
      }`}
    >
      <svg width="54" height="42" viewBox="0 0 64 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
        {/* Signo de sorpresa cuando se asusta al hacer clic */}
        {asustado && (
          <g className="animate-bounce">
            <path d="M32 0 L32 7" stroke="#E67E22" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="11" r="1.8" fill="#E67E22" />
            <path d="M18 3 L21 8" stroke="#C89D7C" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M46 3 L43 8" stroke="#C89D7C" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )}

        {/* Colita naranja y blanca asomada a la derecha */}
        <path
          d="M48 38 C56 35, 60 24, 54 18 C51 15, 48 20, 50 25"
          stroke="#E67E22"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          className="origin-bottom-left animate-pulse"
        />
        <path d="M54 18 C52 16, 50 18, 50 20" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />

        {/* Oreja Izquierda (Naranja criollo) */}
        <path d="M15 24 L11 10 L24 17 Z" fill="#E67E22" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 21 L13 13 L21 17 Z" fill="#F5B7B1" />

        {/* Oreja Derecha (Blanca con mancha naranja) */}
        <path d="M49 24 L53 10 L40 17 Z" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
        <path d="M48 16 L53 10 L44 15 Z" fill="#D35400" />
        <path d="M49 21 L51 13 L43 17 Z" fill="#F5B7B1" />

        {/* Cabeza redonda Chibi (Blanca con parches naranjas atigrados) */}
        <ellipse cx="32" cy="27" rx="18" ry="14" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2.2" />

        {/* Parche Naranja en el lado izquierdo y frente */}
        <path
          d="M14 25 C14 17, 23 13, 31 14 C27 19, 23 24, 15 28 Z"
          fill="#E67E22"
        />
        {/* Rayitas atigradas naranjas en la frente */}
        <path d="M20 16 L24 19" stroke="#D35400" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 20 L21 22" stroke="#D35400" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 14 L32 18" stroke="#E67E22" strokeWidth="2.2" strokeLinecap="round" />

        {/* Cachetes sonrojados cute */}
        <ellipse cx="19" cy="30" rx="3" ry="1.8" fill="#F5B7B1" />
        <ellipse cx="45" cy="30" rx="3" ry="1.8" fill="#F5B7B1" />

        {/* Ojos: Si está asustado (> <), si está normal ojitos brillantes */}
        {asustado ? (
          <g stroke="#3B2B23" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 24 L26 27 L21 30" />
            <path d="M43 24 L38 27 L43 30" />
          </g>
        ) : (
          <g>
            <circle cx="24" cy="26.5" r="2.8" fill="#3B2B23" />
            <circle cx="23" cy="25.5" r="1" fill="#FFFFFF" />
            <circle cx="40" cy="26.5" r="2.8" fill="#3B2B23" />
            <circle cx="39" cy="25.5" r="1" fill="#FFFFFF" />
          </g>
        )}

        {/* Naricita rosada y boquita :3 */}
        <polygon points="30.5,29 33.5,29 32,31" fill="#E67E22" />
        {asustado ? (
          <circle cx="32" cy="33.5" r="2.2" fill="#922B21" />
        ) : (
          <path d="M29 32.5 Q30.5 34.5 32 32.5 Q33.5 34.5 35 32.5" stroke="#3B2B23" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        )}

        {/* Patitas blancas colgando del borde del botón */}
        <ellipse
          cx="21"
          cy={asustado ? "38" : "42"}
          rx="4.8"
          ry="3.8"
          fill="#FFFFFF"
          stroke="#3B2B23"
          strokeWidth="2"
        />
        <ellipse cx="21" cy={asustado ? "38" : "42"} rx="2" ry="1.3" fill="#F5B7B1" />

        <ellipse
          cx="43"
          cy={asustado ? "38" : "42"}
          rx="4.8"
          ry="3.8"
          fill="#FFFFFF"
          stroke="#3B2B23"
          strokeWidth="2"
        />
        <ellipse cx="43" cy={asustado ? "38" : "42"} rx="2" ry="1.3" fill="#F5B7B1" />
      </svg>
    </div>
  );
}

// Sticker Chibi de Velita Feliz para estados y títulos
function StickerVelitaChibi() {
  return (
    <svg width="28" height="32" viewBox="0 0 36 42" fill="none" className="inline-block shrink-0">
      <path d="M18 2 C22 8, 23 13, 18 15 C13 13, 14 8, 18 2 Z" fill="#F59E0B" className="animate-pulse" />
      <rect x="8" y="15" width="20" height="24" rx="6" fill="#FFFDF9" stroke="#C89D7C" strokeWidth="2" />
      <circle cx="14" cy="26" r="1.8" fill="#3B2B23" />
      <circle cx="22" cy="26" r="1.8" fill="#3B2B23" />
      <ellipse cx="11.5" cy="28.5" rx="2" ry="1.2" fill="#F5B7B1" />
      <ellipse cx="24.5" cy="28.5" rx="2" ry="1.2" fill="#F5B7B1" />
      <path d="M16 29 Q18 31 20 29" stroke="#3B2B23" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function TiendaEterniaPage() {
  const [productos, setProductos] = useState<ProductoVela[]>(CATALOGO_INICIAL_VELAS);
  const [idsOcultos, setIdsOcultos] = useState<string[]>([]);
  const [aromasStock, setAromasStock] = useState<AromaTiendaItem[]>(AROMAS_DEFAULT_TIENDA);
  const [aromaSeleccionadoPorProd, setAromaSeleccionadoPorProd] = useState<Record<string, string>>({});

  const [categoriaActiva, setCategoriaActiva] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [carrito, setCarrito] = useState<ItemCarritoConAroma[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState<boolean>(false);
  const [gatoAsustado, setGatoAsustado] = useState<boolean>(false);

  const [modalMapaAbierto, setModalMapaAbierto] = useState<boolean>(false);
  const [modalCuidadoAbierto, setModalCuidadoAbierto] = useState<boolean>(false);

  const [codigoRastreoInput, setCodigoRastreoInput] = useState<string>("");
  const [pedidoRastreado, setPedidoRastreado] = useState<any | null>(null);
  const [buscandoRastreo, setBuscandoRastreo] = useState<boolean>(false);
  const [errorRastreo, setErrorRastreo] = useState<string | null>(null);

  const [slideActivo, setSlideActivo] = useState<number>(0);
  const [modoDemoEncendido, setModoDemoEncendido] = useState<"IDEAL" | "TUNEL">("IDEAL");
  const [horasPorDiaSim, setHorasPorDiaSim] = useState<number>(3);
  const [gramosCeraSim, setGramosCeraSim] = useState<number>(150);

  const [clienteNombre, setClienteNombre] = useState<string>("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState<string>("");
  const [medioPagoPreferido, setMedioPagoPreferido] = useState<string>("Nequi");
  const [empaqueElegido, setEmpaqueElegido] = useState<string>("Clásico Artesanal (Sello Dorado)");
  const [incluirDedicatoria, setIncluirDedicatoria] = useState<boolean>(false);
  const [dedicatoriaPara, setDedicatoriaPara] = useState<string>("");
  const [dedicatoriaDe, setDedicatoriaDe] = useState<string>("");
  const [dedicatoriaMensaje, setDedicatoriaMensaje] = useState<string>("");

  const [enviando, setEnviando] = useState<boolean>(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<string | null>(null);

  const abrirCarritoConGatico = () => {
    setGatoAsustado(true);
    setTimeout(() => {
      setCarritoAbierto(true);
    }, 220);
    setTimeout(() => {
      setGatoAsustado(false);
    }, 900);
  };

  useEffect(() => {
    async function inicializarTienda() {
      const guardadoLocal = localStorage.getItem("eternia_catalogo_v1");
      if (guardadoLocal) {
        try { setProductos(JSON.parse(guardadoLocal)); } catch (err) { console.error(err); }
      }

      const ocultosLocal = localStorage.getItem("eternia_ocultos_v1");
      if (ocultosLocal) {
        try { setIdsOcultos(JSON.parse(ocultosLocal)); } catch (err) { console.error(err); }
      }

      const aromasLocal = localStorage.getItem("eternia_aromas_v1");
      if (aromasLocal) {
        try { setAromasStock(JSON.parse(aromasLocal)); } catch (err) { console.error(err); }
      }

      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from("productos_velas")
          .select("*")
          .eq("activo_en_tienda", true)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          setProductos(data as ProductoVela[]);
          localStorage.setItem("eternia_catalogo_v1", JSON.stringify(data));
        }

        const { data: cfgs } = await supabase
          .from("pedidos")
          .select("codigo, origen")
          .in("codigo", ["CFG-AROMAS", "CFG-OCULTOS"]);

        if (cfgs && cfgs.length > 0) {
          const filaAromas = cfgs.find((c: any) => c.codigo === "CFG-AROMAS");
          if (filaAromas && filaAromas.origen) {
            try {
              const listaNube = JSON.parse(filaAromas.origen);
              if (Array.isArray(listaNube) && listaNube.length > 0) {
                setAromasStock(listaNube);
                localStorage.setItem("eternia_aromas_v1", JSON.stringify(listaNube));
              }
            } catch (e) { console.error(e); }
          }

          const filaOcultos = cfgs.find((c: any) => c.codigo === "CFG-OCULTOS");
          if (filaOcultos && filaOcultos.origen) {
            try {
              const listaOcultos = JSON.parse(filaOcultos.origen);
              if (Array.isArray(listaOcultos)) {
                setIdsOcultos(listaOcultos);
                localStorage.setItem("eternia_ocultos_v1", JSON.stringify(listaOcultos));
              }
            } catch (e) { console.error(e); }
          }
        }
      }
    }
    inicializarTienda();

    const carritoGuardado = localStorage.getItem("eternia_carrito_v2");
    if (carritoGuardado) {
      try { setCarrito(JSON.parse(carritoGuardado)); } catch (err) { console.error(err); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("eternia_carrito_v2", JSON.stringify(carrito));
  }, [carrito]);

  const primerAromaDisponible = useMemo(() => {
    const disp = aromasStock.find((a) => a.disponible);
    return disp ? disp.nombre : "Vainilla Francesa";
  }, [aromasStock]);

  const obtenerAromaDeProducto = (prod: ProductoVela): string => {
    if (!productoLlevaAroma(prod)) return "Sin Aroma (Ritual)";
    const elegido = aromaSeleccionadoPorProd[prod.id];
    const sigueDisponible = aromasStock.find((a) => a.nombre === elegido && a.disponible);
    if (elegido && sigueDisponible) return elegido;
    return primerAromaDisponible;
  };

  // Filtra los productos ocultos desde el Admin (ej. momias o fantasmas sueltos)
  const productosFiltrados = useMemo(() => {
    return productos.filter((p: ProductoVela) => {
      if (p.precio_catalogo <= 0) return false;
      if (p.activo_en_tienda === false) return false;
      if (idsOcultos.includes(p.id)) return false;
      const coincideCat = categoriaActiva === "TODAS" || p.categoria === categoriaActiva;
      const coincideBusq =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion || "").toLowerCase().includes(busqueda.toLowerCase());
      return coincideCat && coincideBusq;
    });
  }, [productos, idsOcultos, categoriaActiva, busqueda]);

  const agregarAlCarrito = (producto: ProductoVela, cant: number = 1, aromaForzado?: string) => {
    const aromaFinal = aromaForzado || obtenerAromaDeProducto(producto);
    const clave = `${producto.id}__${aromaFinal}`;

    setGatoAsustado(true);
    setTimeout(() => setGatoAsustado(false), 650);

    setCarrito((prev) => {
      const existe = prev.find((item) => item.clave === clave);
      if (existe) {
        return prev.map((item) =>
          item.clave === clave ? { ...item, cantidad: Math.min(100, item.cantidad + cant) } : item
        );
      }
      return [...prev, { clave, producto, cantidad: cant, aroma: aromaFinal }];
    });
  };

  const cambiarCantidadClave = (clave: string, nuevaCant: number) => {
    if (nuevaCant <= 0) {
      setCarrito((prev) => prev.filter((item) => item.clave !== clave));
    } else {
      setCarrito((prev) =>
        prev.map((item) => (item.clave === clave ? { ...item, cantidad: Math.min(100, nuevaCant) } : item))
      );
    }
  };

  const cambiarAromaEnCarrito = (claveActual: string, nuevoAroma: string) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.clave !== claveActual) return item;
        const nuevaClave = `${item.producto.id}__${nuevoAroma}`;
        return { ...item, clave: nuevaClave, aroma: nuevoAroma };
      })
    );
  };

  const totalUnidades = useMemo(() => carrito.reduce((acc, it) => acc + it.cantidad, 0), [carrito]);

  const valorTotalCarrito = useMemo(
    () => redondearCentena(carrito.reduce((acc, it) => acc + it.producto.precio_catalogo * it.cantidad, 0)),
    [carrito]
  );

  const abono50Carrito = useMemo(() => redondearCentena(valorTotalCarrito * 0.5), [valorTotalCarrito]);
  const fechaEntregaEstimada = useMemo(() => calcularFechaEntregaHabil(undefined, 5), []);
  const cumpleMinimoPedido = valorTotalCarrito >= PEDIDO_MINIMO_COP;

  const consultarSeguimientoPedido = async (e?: React.FormEvent, codigoDirecto?: string) => {
    if (e) e.preventDefault();
    const codigoLimpio = (codigoDirecto || codigoRastreoInput).trim().toUpperCase();
    if (!codigoLimpio) return;

    setBuscandoRastreo(true);
    setErrorRastreo(null);
    setPedidoRastreado(null);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("pedidos")
          .select("*, pedido_items(*)")
          .ilike("codigo", codigoLimpio)
          .maybeSingle();

        if (!error && data && !String(data.codigo).startsWith("CFG-")) {
          setPedidoRastreado(data);
          setBuscandoRastreo(false);
          return;
        }
      }
      setErrorRastreo(`No encontramos el código "${codigoLimpio}". Verifica que esté escrito como PED-001.`);
    } catch (err) {
      console.error(err);
      setErrorRastreo("Hubo un inconveniente al consultar. Intenta nuevamente.");
    } finally {
      setBuscandoRastreo(false);
    }
  };

  const confirmarPedidoWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (carrito.length === 0) return;
    if (!cumpleMinimoPedido) {
      alert(`El pedido mínimo de taller es de ${formatoCOP(PEDIDO_MINIMO_COP)}. Agrega otra velita o un combo para continuar.`);
      return;
    }
    if (!clienteNombre.trim() || !clienteWhatsapp.trim()) {
      alert("Por favor escribe tu nombre y tu número de WhatsApp para agendar tu pedido.");
      return;
    }

    setEnviando(true);
    try {
      let nuevoNumero = 1;
      if (isSupabaseConfigured) {
        const { data: listaCodigos, error: errCodigos } = await supabase.from("pedidos").select("codigo");
        if (!errCodigos && listaCodigos && listaCodigos.length > 0) {
          const numeros = listaCodigos
            .filter((p: { codigo?: string }) => !String(p.codigo || "").startsWith("CFG-"))
            .map((p: { codigo?: string }) => {
              const partes = String(p.codigo || "").split("-");
              const num = parseInt(partes[1], 10);
              return isNaN(num) ? 0 : num;
            });
          nuevoNumero = Math.max(0, ...numeros) + 1;
        }
      }
      const codigoPedido = `PED-${String(nuevoNumero).padStart(3, "0")}`;

      const costoTotal = redondearCentena(
        carrito.reduce((acc, it) => acc + it.producto.costo_produccion * it.cantidad, 0)
      );
      const gananciaLibre = valorTotalCarrito - costoTotal;
      const ceraTotal = carrito.reduce((acc, it) => acc + it.producto.cera_g * it.cantidad, 0);
      const fragTotal = carrito.reduce((acc, it) => acc + it.producto.fragancia_ml * it.cantidad, 0);
      const pabTotal = carrito.reduce((acc, it) => acc + it.producto.pabilo_cm * it.cantidad, 0);
      const hoyStr = new Date().toISOString().split("T")[0];

      const itemsDetallados: PedidoItemDetalle[] = carrito.map((it) => ({
        producto_nombre: productoLlevaAroma(it.producto)
          ? `${it.producto.nombre} (Aroma: ${it.aroma})`
          : `${it.producto.nombre} (Sin aroma)`,
        cantidad: it.cantidad,
        precio_unitario: it.producto.precio_catalogo,
        costo_unitario: it.producto.costo_produccion,
        cera_unitaria_g: it.producto.cera_g,
        fragancia_unitaria_ml: it.producto.fragancia_ml,
        pabilo_unitario_cm: it.producto.pabilo_cm,
        tipo_empaque: it.producto.tipo_empaque,
        subtotal: it.producto.precio_catalogo * it.cantidad,
      }));

      const itemsJsonRespaldo = JSON.stringify(itemsDetallados);
      const origenCodificado =
        incluirDedicatoria && dedicatoriaMensaje.trim()
          ? `Tienda Web || Empaque: ${empaqueElegido} || Para: ${dedicatoriaPara.trim() || "Alguien especial"} || De: ${dedicatoriaDe.trim() || clienteNombre.trim()} || Msg: ${dedicatoriaMensaje.trim()} || ItemsJSON: ${itemsJsonRespaldo}`
          : `Tienda Web || Empaque: ${empaqueElegido} || ItemsJSON: ${itemsJsonRespaldo}`;

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
        origen: origenCodificado,
        fecha_pedido: hoyStr,
        fecha_entrega: fechaEntregaEstimada,
        items: itemsDetallados,
      };

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
            origen: nuevoPedido.origen,
            fecha_pedido: nuevoPedido.fecha_pedido,
            fecha_entrega: nuevoPedido.fecha_entrega,
          })
          .select()
          .single();

        if (!errPed && pedInsertado) {
          const { error: errItems1 } = await supabase.from("pedido_items").insert(
            nuevoPedido.items.map((item: PedidoItemDetalle) => ({
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
              nuevoPedido.items.map((item: PedidoItemDetalle) => ({
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
        } else {
          alert(`Hubo un problema al registrar el pedido en la nube: ${errPed?.message || "Intenta de nuevo"}`);
          return;
        }
      }

      // Emojis 100% compatibles en formato Unicode Escape para que WhatsApp jamás muestre rombos ()
      const E_BRILLO = "\u2728"; // ✨
      const E_GATO = "\uD83D\uDC31"; // 🐱
      const E_PIN = "\uD83D\uDCCC"; // 📌
      const E_USER = "\uD83D\uDC64"; // 👤
      const E_REGALO = "\uD83C\uDF81"; // 🎁
      const E_CARTA = "\uD83D\uDC8C"; // 💌
      const E_ESTRELLA = "\u2B50"; // ⭐
      const E_DINERO = "\uD83D\uDCB0"; // 💰
      const E_CHECK = "\u2705"; // ✅
      const E_CALENDARIO = "\uD83D\uDCC5"; // 📅

      const lineasProductos = nuevoPedido.items
        .map((it) => `${E_ESTRELLA} ${it.cantidad}x ${it.producto_nombre} (${formatoCOP(it.subtotal)})`)
        .join("\n");

      const bloqueDedicatoriaWA =
        incluirDedicatoria && dedicatoriaMensaje.trim()
          ? `\n${E_CARTA} *Tarjeta Dedicatoria:*\nPara: ${dedicatoriaPara || "Especial"} | De: ${dedicatoriaDe || clienteNombre}\n"${dedicatoriaMensaje.trim()}"\n`
          : "";

      const textoWA =
        `${E_BRILLO} *NUEVO PEDIDO ETERNIA CANDLES* ${E_GATO}\n\n` +
        `${E_PIN} *Codigo de Seguimiento:* ${codigoPedido}\n` +
        `${E_USER} *Cliente:* ${clienteNombre.trim()}\n` +
        `${E_REGALO} *Empaque:* ${empaqueElegido}\n` +
        `${bloqueDedicatoriaWA}\n` +
        `*Productos Solicitados:*\n${lineasProductos}\n\n` +
        `${E_DINERO} *Valor Total:* ${formatoCOP(valorTotalCarrito)}\n` +
        `${E_CHECK} *Anticipo 50% (Para iniciar):* ${formatoCOP(abono50Carrito)}\n` +
        `*Medio de Pago:* ${medioPagoPreferido}\n` +
        `${E_CALENDARIO} *Entrega estimada:* ${fechaEntregaEstimada}\n\n` +
        `Hola! Adjunto el comprobante del 50% de anticipo para agendar mi pedido.`;

      const urlWA = `https://api.whatsapp.com/send?phone=573132019146&text=${encodeURIComponent(textoWA)}`;
      setPedidoConfirmado(codigoPedido);
      setCodigoRastreoInput(codigoPedido);
      setCarrito([]);
      localStorage.removeItem("eternia_carrito_v2");
      window.open(urlWA, "_blank");
    } finally {
      setEnviando(false);
    }
  };

  const calculoSimuladorDuracion = useMemo(() => {
    const horasTotales = Math.round(gramosCeraSim / 5.5);
    const diasDuracion = Math.max(1, Math.round(horasTotales / horasPorDiaSim));
    return { horasTotales, diasDuracion };
  }, [gramosCeraSim, horasPorDiaSim]);

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2B23] flex flex-col font-sans">
      <div className="bg-[#3B2B23] text-[#FAF6F0] text-xs sm:text-sm py-2 px-4 text-center font-medium tracking-wide">
        ✨ Taller Eternia Bogotá • Velas artesanales con esencia natural • Pedido mínimo {formatoCOP(PEDIDO_MINIMO_COP)} • Agendamos con el 50%
      </div>

      {/* CABECERA CON EL GATICO CRIOLLO COLGANDO DEL BOTÓN MI PEDIDO */}
      <header className="sticky top-0 z-30 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E8D5CE] px-4 sm:px-8 pt-6 pb-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif tracking-widest font-bold text-[#3B2B23] flex items-center gap-2">
                <span>ETERNIA CANDLES</span>
                <StickerVelitaChibi />
              </h1>
              <p className="text-xs text-[#7A685F] italic tracking-wider font-serif">Handmade Aromas • Boutique & Cute Art</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setModalCuidadoAbierto(true)}
              className="bg-white hover:bg-[#F3ECE1] text-[#3B2B23] border border-[#C89D7C] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#C89D7C]" />
              <span>Ritual y Cuidado</span>
            </button>

            <button
              onClick={() => setModalMapaAbierto(true)}
              className="bg-[#F3ECE1] hover:bg-[#E8D5CE] text-[#3B2B23] border border-[#C89D7C] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#C89D7C] animate-spin" style={{ animationDuration: "8s" }} />
              <span>Rastrear Pedido</span>
            </button>

            {/* BOTÓN DE CARRITO CON EL GATICO CRIOLLO CHIBI COLGANDO */}
            <div className="relative group pt-2">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                <GaticoCriolloColgante asustado={gatoAsustado} />
              </div>
              <button
                onClick={abrirCarritoConGatico}
                className="relative z-10 bg-[#3B2B23] hover:bg-[#523d32] text-[#FAF6F0] px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md transition cursor-pointer border border-[#C89D7C]"
              >
                <ShoppingBag className="w-4 h-4 text-[#C89D7C]" />
                <span>Mi Pedido</span>
                {totalUnidades > 0 && (
                  <span className="bg-[#E67E22] text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {totalUnidades}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO DE BIENVENIDA */}
      <section className="bg-gradient-to-b from-[#F3ECE1] to-[#FAF6F0] pt-8 pb-8 px-4 sm:px-8 border-b border-[#E8D5CE]">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-[#E8D5CE]/60 text-[#3B2B23] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest font-serif">
            <Sparkles className="w-3.5 h-3.5 text-[#C89D7C]" /> Catálogo Oficial • @eternia.candles
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-medium text-[#3B2B23] max-w-3xl mx-auto leading-relaxed tracking-wide">
            Ilumina tus momentos con diseño, calma y tu aroma favorito
          </h2>

          <div className="max-w-md mx-auto relative pt-3">
            <Search className="w-4 h-4 text-[#7A685F] absolute left-3.5 top-6.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar vela (ej. Deseos, Cascanueces, Osito...)"
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#E8D5CE] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89D7C] shadow-sm"
            />
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pt-3 pb-1">
            {CATEGORIAS.map((cat) => {
              const activa = categoriaActiva === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition shadow-sm cursor-pointer tracking-wider ${
                    activa ? "bg-[#C89D7C] text-white" : "bg-white text-[#7A685F] hover:bg-[#E8D5CE]/40 border border-[#E8D5CE]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECCIÓN EXCLUSIVA: CLUB ETERNIA — LA VELA DEL MES ($70.000 COP)   */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-8">
        <div className="bg-gradient-to-r from-[#3B2B23] via-[#4A352B] to-[#3B2B23] text-[#FAF6F0] rounded-3xl p-6 sm:p-8 border-2 border-[#C89D7C] shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative overflow-hidden">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#C89D7C] text-[#3B2B23] text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
              <Crown className="w-3.5 h-3.5" /> Membresía & Caja Sorpresa Mensual • Club Eternia
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide text-white">
              Caja &ldquo;La Vela del Mes&rdquo; + Ticket Coleccionable Ilustrado
            </h3>
            <p className="text-xs sm:text-sm text-[#E8D5CE] leading-relaxed">
              Recibe cada mes una experiencia sensorial irrepetible valorada en más de $95.000 por un precio especial de miembro:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#FAF6F0] pt-1">
              <div className="bg-white/10 px-3 py-2 rounded-xl border border-[#C89D7C]/40">
                🕯️ <strong>1 Vela de Vaso Principal</strong> con fragancia secreta exclusiva del mes.
              </div>
              <div className="bg-white/10 px-3 py-2 rounded-xl border border-[#C89D7C]/40">
                ⛄ <strong>Mini Combo de Moldes Pequeños</strong> (Reno, Muñeco de Nieve, Estrella o Dúo).
              </div>
              <div className="bg-white/10 px-3 py-2 rounded-xl border border-[#C89D7C]/40">
                🔥 <strong>Wax Melts + Cerillas Diseño Eternia</strong> o Sachet Perfumado para armario.
              </div>
              <div className="bg-white/10 px-3 py-2 rounded-xl border border-[#C89D7C]/40">
                🎫 <strong>Tarjeta Coleccionable Cute</strong> (edición numerada estilo cine/Sanrio).
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#FAF6F0] text-[#3B2B23] p-5 rounded-2xl border border-[#C89D7C] text-center space-y-3 shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A685F] block">
              Edición Limitada del Mes
            </span>
            <div className="text-3xl font-extrabold font-serif text-[#3B2B23]">
              {formatoCOP(PRODUCTO_CLUB_ETERNIA.precio_catalogo)}
            </div>
            <p className="text-[11px] text-[#7A685F]">
              Agéndala con el 50% ({formatoCOP(35000)}) • Envío coordinado a tu medida
            </p>
            <button
              onClick={() => agregarAlCarrito(PRODUCTO_CLUB_ETERNIA, 1, "Aroma Secreto del Mes")}
              className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Quiero mi Caja Club Eternia
            </button>
          </div>
        </div>
      </section>

      {/* CATÁLOGO DE PRODUCTOS CON PÍLDORAS OLFATIVAS SENSORIALES */}
      <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map((prod: ProductoVela) => {
            const admiteAroma = productoLlevaAroma(prod);
            const aromaActual = obtenerAromaDeProducto(prod);
            const infoAromaObj = aromasStock.find((a) => a.nombre === aromaActual);
            const claveActual = `${prod.id}__${aromaActual}`;
            const itemEnCarrito = carrito.find((i) => i.clave === claveActual);
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
                    {prod.descripcion || `Presentación en ${prod.tipo_empaque}. Hecha a mano con cera vegetal.`}
                  </p>

                  {/* SELECTOR OLFATIVO SENSORIAL CON PÍLDORAS */}
                  <div className="mt-4 pt-3 border-t border-[#FAF6F0]">
                    {admiteAroma ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#3B2B23] flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-[#C89D7C]" /> Fragancia Elegida:
                          </label>
                          <span className="text-[10px] font-bold text-[#C89D7C]">{aromaActual}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {aromasStock.map((ar) => {
                            const seleccionado = aromaActual === ar.nombre;
                            return (
                              <button
                                key={ar.id}
                                type="button"
                                disabled={!ar.disponible}
                                onClick={() =>
                                  setAromaSeleccionadoPorProd((prev) => ({ ...prev, [prod.id]: ar.nombre }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                  !ar.disponible
                                    ? "bg-gray-100 text-gray-400 line-through cursor-not-allowed border border-gray-200"
                                    : seleccionado
                                    ? "bg-[#3B2B23] text-[#FAF6F0] shadow-xs cursor-pointer"
                                    : "bg-[#FAF6F0] text-[#3B2B23] hover:bg-[#F3ECE1] border border-[#E8D5CE] cursor-pointer"
                                }`}
                              >
                                {ar.disponible ? ar.nombre : `${ar.nombre} (Agotado)`}
                              </button>
                            );
                          })}
                        </div>

                        {infoAromaObj && (
                          <p className="text-[10px] italic text-[#7A685F] bg-[#FAF6F0] px-2.5 py-1 rounded-lg border border-[#E8D5CE]/60">
                            ✨ Notas: {infoAromaObj.notas}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-[#F3ECE1]/70 border border-[#E8D5CE] text-[11px] text-[#7A685F] flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#C89D7C] shrink-0" />
                        <span>
                          <strong>Vela Ritual de un Día:</strong> Cera pura tradicional (sin fragancia).
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F3ECE1] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A685F] block uppercase tracking-wider">Precio</span>
                    <span className="text-xl font-extrabold text-[#3B2B23]">{formatoCOP(prod.precio_catalogo)}</span>
                  </div>

                  {cantActual === 0 ? (
                    <button
                      onClick={() => agregarAlCarrito(prod, 1)}
                      className="bg-[#C89D7C] hover:bg-[#b58967] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer tracking-wider"
                    >
                      <Plus className="w-4 h-4" /> Agregar al Pedido
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#F3ECE1] px-2.5 py-1.5 rounded-xl border border-[#C89D7C]">
                      <button
                        onClick={() => cambiarCantidadClave(claveActual, cantActual - 1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#3B2B23] flex items-center justify-center font-bold shadow-sm cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{cantActual}</span>
                      <button
                        onClick={() => cambiarCantidadClave(claveActual, cantActual + 1)}
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

      {/* BARRA FLOTANTE INFERIOR CON EL GATICO CRIOLLO */}
      {totalUnidades > 0 && !carritoAbierto && (
        <div className="fixed bottom-6 inset-x-4 z-40 max-w-lg mx-auto group">
          <div className="absolute -top-6 left-8 z-20">
            <GaticoCriolloColgante asustado={gatoAsustado} />
          </div>
          <button
            onClick={abrirCarritoConGatico}
            className="relative z-10 w-full bg-[#3B2B23] text-[#FAF6F0] py-4 px-6 rounded-2xl shadow-2xl flex items-center justify-between border-2 border-[#C89D7C] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#E67E22] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                {totalUnidades}
              </span>
              <span className="font-bold text-sm tracking-wider">Ver mi pedido y agendar</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-[#C89D7C] block">Total: {formatoCOP(valorTotalCarrito)}</span>
              <span className="text-[10px] text-[#E8D5CE] block">Anticipo 50%: {formatoCOP(abono50Carrito)}</span>
            </div>
          </button>
        </div>
      )}

      {/* DRAWER DEL CARRITO CON VALIDACIÓN DE PEDIDO MÍNIMO Y DEDICATORIA */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-[#FAF6F0] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#E8D5CE]">
            <div className="p-5 bg-[#F3ECE1] border-b border-[#E8D5CE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickerVelitaChibi />
                <h3 className="font-bold text-lg font-serif text-[#3B2B23]">Tu Pedido en Eternia Candles</h3>
              </div>
              <button onClick={() => setCarritoAbierto(false)} className="p-1.5 rounded-lg hover:bg-[#E8D5CE]/50 text-[#3B2B23] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="flex justify-center">
                    <GaticoCriolloColgante asustado={false} />
                  </div>
                  <p className="text-sm text-[#7A685F] pt-2">
                    ¡Miau! Tu carrito está vacío. Elige tus velitas y aromas favoritos del catálogo.
                  </p>
                </div>
              ) : (
                <>
                  {carrito.map((item) => {
                    const admiteAroma = productoLlevaAroma(item.producto);
                    return (
                      <div key={item.clave} className="bg-white p-4 rounded-xl border border-[#E8D5CE] space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-sm font-serif text-[#3B2B23]">{item.producto.nombre}</h4>
                            <p className="text-xs text-[#7A685F]">
                              {formatoCOP(item.producto.precio_catalogo)} c/u • Subtotal:{" "}
                              <strong className="text-[#3B2B23]">{formatoCOP(item.producto.precio_catalogo * item.cantidad)}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <select
                              value={item.cantidad}
                              onChange={(e) => cambiarCantidadClave(item.clave, Number(e.target.value))}
                              className="bg-[#F3ECE1] border border-[#C89D7C] rounded-lg px-2 py-1 text-xs font-bold text-[#3B2B23]"
                            >
                              {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => cambiarCantidadClave(item.clave, 0)}
                              className="p-1.5 text-[#922B21] hover:bg-[#FADBD8]/50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {admiteAroma ? (
                          <div className="flex items-center justify-between gap-2 bg-[#FAF6F0] px-3 py-1.5 rounded-lg border border-[#E8D5CE] text-xs">
                            <span className="font-bold text-[#7A685F]">🕯️ Fragancia:</span>
                            <select
                              value={item.aroma}
                              onChange={(e) => cambiarAromaEnCarrito(item.clave, e.target.value)}
                              className="bg-transparent font-bold text-[#3B2B23] focus:outline-none text-right"
                            >
                              {aromasStock.map((ar) => (
                                <option key={ar.id} value={ar.nombre} disabled={!ar.disponible}>
                                  {ar.disponible ? ar.nombre : `${ar.nombre} (Agotado)`}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#7A685F] bg-[#FAF6F0] px-3 py-1 rounded-lg">
                            ✨ Vela de los deseos (Tradicional sin fragancia)
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ALERTA DE PEDIDO MÍNIMO DE TALLER ($15.000 COP) */}
                  {!cumpleMinimoPedido && (
                    <div className="p-3.5 rounded-2xl bg-[#FCF3CF] border border-[#E67E22] text-xs text-[#3B2B23] space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-[#D35400]">
                        <AlertTriangle className="w-4 h-4" /> Pedido mínimo de taller: {formatoCOP(PEDIDO_MINIMO_COP)}
                      </div>
                      <p className="text-[11px] text-[#7A685F]">
                        Para poder fundir y preparar tu orden artesanalmente, te faltan{" "}
                        <strong>{formatoCOP(PEDIDO_MINIMO_COP - valorTotalCarrito)}</strong>. ¡Agrega otra unidad o arma tu combo!
                      </p>
                    </div>
                  )}

                  {/* SELECTOR DE PRESENTACIÓN Y TARJETA DEDICATORIA */}
                  <div className="bg-white p-4 rounded-2xl border border-[#C89D7C] space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#3B2B23]">
                      <Gift className="w-4 h-4 text-[#C89D7C]" />
                      <span>PRESENTACIÓN Y TARJETA DEDICATORIA</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A685F] mb-1">Estilo de Empaque (Incluido):</label>
                      <select
                        value={empaqueElegido}
                        onChange={(e) => setEmpaqueElegido(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8D5CE] text-xs font-bold text-[#3B2B23]"
                      >
                        <option value="Clásico Artesanal (Sello Dorado)">📦 Clásico Artesanal (Sello Dorado Eternia)</option>
                        <option value="Edición Regalo Cinta Satinada">🎀 Edición Regalo con Cinta Satinada</option>
                        <option value="Eco-Botánico con Yute Natural">🌿 Eco-Botánico con Lazo de Yute</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-[#3B2B23] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={incluirDedicatoria}
                        onChange={(e) => setIncluirDedicatoria(e.target.checked)}
                        className="rounded accent-[#C89D7C] w-4 h-4"
                      />
                      <span>💌 ¿Es para regalar? Añadir tarjeta dedicatoria ilustrada gratis</span>
                    </label>

                    {incluirDedicatoria && (
                      <div className="space-y-2.5 pt-2 border-t border-[#F3ECE1]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-[#7A685F] mb-0.5">Para quién:</label>
                            <input
                              type="text"
                              value={dedicatoriaPara}
                              onChange={(e) => setDedicatoriaPara(e.target.value)}
                              placeholder="Ej: Mamá / Natalia"
                              className="w-full px-2.5 py-2 rounded-lg bg-[#FAF6F0] border border-[#E8D5CE] text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#7A685F] mb-0.5">De parte de:</label>
                            <input
                              type="text"
                              value={dedicatoriaDe}
                              onChange={(e) => setDedicatoriaDe(e.target.value)}
                              placeholder="Tu nombre"
                              className="w-full px-2.5 py-2 rounded-lg bg-[#FAF6F0] border border-[#E8D5CE] text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#7A685F] mb-0.5">Mensaje para la tarjeta impresa:</label>
                          <textarea
                            rows={2}
                            maxLength={160}
                            value={dedicatoriaMensaje}
                            onChange={(e) => setDedicatoriaMensaje(e.target.value)}
                            placeholder="Escribe aquí tu dedicatoria especial..."
                            className="w-full px-3 py-2 rounded-lg bg-[#FAF6F0] border border-[#E8D5CE] text-xs italic font-serif"
                          />
                        </div>
                      </div>
                    )}
                  </div>

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
                      <span>Entrega estimada (5-6 días hábiles): <strong>{fechaEntregaEstimada}</strong></span>
                    </div>
                  </div>

                  <form onSubmit={confirmarPedidoWhatsApp} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">Tu Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="Ej: María Gómez"
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">Tu WhatsApp / Celular *</label>
                      <input
                        type="text"
                        required
                        value={clienteWhatsapp}
                        onChange={(e) => setClienteWhatsapp(e.target.value)}
                        placeholder="Ej: 310 000 0000"
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">Medio de Pago Preferido para el 50%</label>
                      <select
                        value={medioPagoPreferido}
                        onChange={(e) => setMedioPagoPreferido(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm font-medium"
                      >
                        <option value="Nequi">Nequi (313 201 9146)</option>
                        <option value="Bancolombia">Bancolombia Ahorros (22582959122)</option>
                        <option value="Daviplata">Daviplata (313 201 9146)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={enviando || !cumpleMinimoPedido}
                      className="w-full bg-[#C89D7C] hover:bg-[#b58967] disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition text-sm cursor-pointer tracking-wider"
                    >
                      <Send className="w-4 h-4" />
                      {enviando
                        ? "Generando Pedido..."
                        : !cumpleMinimoPedido
                        ? `Mínimo de pedido: ${formatoCOP(PEDIDO_MINIMO_COP)}`
                        : "Enviar Pedido por WhatsApp"}
                    </button>
                  </form>
                </>
              )}

              {pedidoConfirmado && (
                <div className="p-4 rounded-xl bg-[#D4EFDF] text-[#196F3D] text-xs space-y-2 border border-[#196F3D]/20">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> ¡Pedido {pedidoConfirmado} registrado!
                  </div>
                  <p>Tu código único de rastreo es <strong>{pedidoConfirmado}</strong>.</p>
                  <button
                    onClick={() => {
                      setCarritoAbierto(false);
                      setModalMapaAbierto(true);
                      consultarSeguimientoPedido(undefined, pedidoConfirmado);
                    }}
                    className="w-full bg-[#196F3D] text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                  >
                    Ver mi Pedido en el Mapa de Seguimiento ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MAPA DE SEGUIMIENTO */}
      {modalMapaAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF6F0] max-w-2xl w-full rounded-3xl border border-[#E8D5CE] shadow-2xl overflow-hidden my-8">
            <div className="bg-[#3B2B23] text-[#FAF6F0] p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C89D7C] flex items-center justify-center text-white">
                  <Compass className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold tracking-wider">MAPA DE SEGUIMIENTO EN TIEMPO REAL</h3>
                  <p className="text-xs text-[#E8D5CE]">Sigue cada etapa artesanal de tus velas desde el taller</p>
                </div>
              </div>
              <button onClick={() => setModalMapaAbierto(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <form onSubmit={(e) => consultarSeguimientoPedido(e)} className="flex gap-2">
                <input
                  type="text"
                  value={codigoRastreoInput}
                  onChange={(e) => setCodigoRastreoInput(e.target.value)}
                  placeholder="Ingresa tu código (ej. PED-001)"
                  className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#C89D7C] text-sm font-bold uppercase tracking-wider focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={buscandoRastreo}
                  className="bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold px-6 py-3 rounded-xl text-xs tracking-wider cursor-pointer transition"
                >
                  {buscandoRastreo ? "Buscando..." : "Rastrear Ahora"}
                </button>
              </form>

              {errorRastreo && (
                <div className="p-4 rounded-xl bg-[#FADBD8] text-[#922B21] text-xs font-medium">{errorRastreo}</div>
              )}

              {pedidoRastreado && (() => {
                const idxActual = Math.max(
                  0,
                  ETAPAS_MAPA.findIndex((e) => e.id === pedidoRastreado.estado)
                );
                const porcentajeBarra = Math.round(((idxActual + 1) / ETAPAS_MAPA.length) * 100);

                return (
                  <div className="space-y-6">
                    <div className="bg-white p-4 rounded-2xl border border-[#E8D5CE] flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C89D7C]">Orden Verificada</span>
                        <h4 className="text-lg font-serif font-bold text-[#3B2B23]">
                          {pedidoRastreado.codigo} — {pedidoRastreado.cliente_nombre}
                        </h4>
                        <p className="text-xs text-[#7A685F]">Entrega estimada: <strong>{pedidoRastreado.fecha_entrega}</strong></p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-[#F3ECE1] border border-[#C89D7C] text-xs font-bold text-[#3B2B23]">
                          Avance: {porcentajeBarra}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-[#E8D5CE] rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#3B2B23] via-[#C89D7C] to-[#196F3D] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${porcentajeBarra}%` }}
                      />
                    </div>

                    <div className="space-y-3">
                      {ETAPAS_MAPA.map((etapa, index) => {
                        const IconoEtapa = etapa.icono;
                        const completada = index < idxActual;
                        const esActual = index === idxActual;

                        return (
                          <div
                            key={etapa.id}
                            className={`p-4 rounded-2xl border transition-all duration-500 flex items-center gap-4 ${
                              esActual
                                ? "bg-white border-2 border-[#C89D7C] shadow-md scale-[1.01]"
                                : completada
                                ? "bg-[#D4EFDF]/40 border-[#196F3D]/30"
                                : "bg-white/50 border-[#E8D5CE] opacity-60"
                            }`}
                          >
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                esActual
                                  ? "bg-[#C89D7C] text-white animate-bounce"
                                  : completada
                                  ? "bg-[#196F3D] text-white"
                                  : "bg-[#F3ECE1] text-[#7A685F]"
                              }`}
                            >
                              <IconoEtapa className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-serif font-bold text-sm text-[#3B2B23]">{etapa.titulo}</h5>
                                {esActual && (
                                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#C89D7C] text-white animate-pulse">
                                    Etapa Actual
                                  </span>
                                )}
                                {completada && (
                                  <span className="text-[10px] font-bold text-[#196F3D]">✓ Completado</span>
                                )}
                              </div>
                              <p className="text-xs text-[#7A685F] mt-0.5">{etapa.sub}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRESENTACIÓN DE CUIDADO DE VELAS */}
      {modalCuidadoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF6F0] max-w-3xl w-full rounded-3xl border border-[#E8D5CE] shadow-2xl overflow-hidden my-8">
            <div className="bg-[#3B2B23] text-[#FAF6F0] p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C89D7C] flex items-center justify-center text-white">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold tracking-wider">EL ARTE DEL CUIDADO • EXPERIENCIA INTERACTIVA</h3>
                  <p className="text-xs text-[#E8D5CE]">Guía maestra para prolongar la vida y el aroma de tus velas Eternia</p>
                </div>
              </div>
              <button onClick={() => setModalCuidadoAbierto(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between gap-2 border-b border-[#E8D5CE] pb-4">
                {SLIDES_CUIDADO.map((sl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSlideActivo(idx)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-serif transition cursor-pointer ${
                      slideActivo === idx ? "bg-[#C89D7C] text-white shadow-sm" : "bg-white text-[#7A685F] border border-[#E8D5CE]"
                    }`}
                  >
                    Paso {idx + 1}
                  </button>
                ))}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#E8D5CE] space-y-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C89D7C] block">
                  {SLIDES_CUIDADO[slideActivo].badge}
                </span>
                <h4 className="text-2xl font-serif font-bold text-[#3B2B23]">{SLIDES_CUIDADO[slideActivo].titulo}</h4>
                <p className="text-sm text-[#7A685F] leading-relaxed">{SLIDES_CUIDADO[slideActivo].descripcion}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#FADBD8]/40 border border-[#922B21]/20 text-xs text-[#922B21]">
                    <strong>❌ Evita esto:</strong>
                    <p className="mt-1">{SLIDES_CUIDADO[slideActivo].Comparativa.malo}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#D4EFDF]/50 border border-[#196F3D]/20 text-xs text-[#196F3D]">
                    <strong>✅ Ritual Eternia:</strong>
                    <p className="mt-1">{SLIDES_CUIDADO[slideActivo].Comparativa.bueno}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#F3ECE1] grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E8D5CE] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-serif">Simulador Visual de Quemado:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setModoDemoEncendido("IDEAL")}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            modoDemoEncendido === "IDEAL" ? "bg-[#196F3D] text-white" : "bg-white border"
                          }`}
                        >
                          Ideal (2-3h)
                        </button>
                        <button
                          onClick={() => setModoDemoEncendido("TUNEL")}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            modoDemoEncendido === "TUNEL" ? "bg-[#922B21] text-white" : "bg-white border"
                          }`}
                        >
                          Efecto Túnel
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center py-3">
                      <Flame
                        className={`w-7 h-7 text-amber-500 animate-pulse ${
                          modoDemoEncendido === "TUNEL" ? "scale-75 opacity-70" : "scale-110"
                        }`}
                      />
                      <div className="w-1 h-2 bg-[#3B2B23]" />
                      <div className="w-28 h-20 rounded-b-2xl border-2 border-[#C89D7C] bg-[#F3ECE1] relative overflow-hidden flex justify-center">
                        <div
                          className={`h-5 bg-amber-300/80 transition-all duration-700 ${
                            modoDemoEncendido === "IDEAL" ? "w-full" : "w-10 rounded-b-full"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] text-[#7A685F] mt-2 text-center">
                        {modoDemoEncendido === "IDEAL"
                          ? "✨ La cera se funde de borde a borde liberando el 100% del aroma."
                          : "⚠️ Se hunde solo el centro y se pierde la cera de las paredes."}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E8D5CE] space-y-3">
                    <h5 className="text-xs font-serif font-bold text-[#3B2B23] flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-[#C89D7C]" /> Calculadora de Duración de tu Vela
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Tamaño de la vela (cera):</span>
                        <strong>{gramosCeraSim} gramos</strong>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={350}
                        step={10}
                        value={gramosCeraSim}
                        onChange={(e) => setGramosCeraSim(Number(e.target.value))}
                        className="w-full accent-[#C89D7C]"
                      />
                      <div className="flex justify-between">
                        <span>Horas de uso al día:</span>
                        <strong>{horasPorDiaSim} horas / día</strong>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={6}
                        step={1}
                        value={horasPorDiaSim}
                        onChange={(e) => setHorasPorDiaSim(Number(e.target.value))}
                        className="w-full accent-[#C89D7C]"
                      />
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#3B2B23] text-[#FAF6F0] text-center text-xs">
                      Tu vela te acompañará aprox. <strong>{calculoSimuladorDuracion.horasTotales} horas</strong> (
                      <strong className="text-[#C89D7C]">{calculoSimuladorDuracion.diasDuracion} días</strong> de ritual).
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSlideActivo((prev) => Math.max(0, prev - 1))}
                  disabled={slideActivo === 0}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E8D5CE] text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-xs font-serif text-[#7A685F]">
                  Capítulo {slideActivo + 1} de {SLIDES_CUIDADO.length}
                </span>
                <button
                  onClick={() => setSlideActivo((prev) => Math.min(SLIDES_CUIDADO.length - 1, prev + 1))}
                  disabled={slideActivo === SLIDES_CUIDADO.length - 1}
                  className="px-4 py-2 rounded-xl bg-[#3B2B23] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
          <ShieldCheck className="w-3.5 h-3.5 text-[#C89D7C]" /> Hecho a mano con amor, diseño y esencia natural.
        </p>
      </footer>
    </div>
  );
}