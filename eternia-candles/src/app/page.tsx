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
  Flower2,
  Gem,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  CATALOGO_INICIAL_VELAS,
  MIN_RECORDATORIOS,
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
  { id: "Pendiente Anticipo", titulo: "1. Orden Agendada", sub: "Esperando validación del anticipo", icono: Clock },
  { id: "En Producción (Abono 50%)", titulo: "2. Preparación de Moldes", sub: "Selección de pabilo de algodón y alistamiento artesanal", icono: Sparkles },
  { id: "Fundición y Vertido", titulo: "3. Fundición y Esencias", sub: "Vertido de cera vegetal a temperatura controlada", icono: Flame },
  { id: "Curado y Acabado", titulo: "4. Reposo y Acabado", sub: "Curado térmico para fijar el aroma y pulido de detalles", icono: Heart },
  { id: "Listo para Entrega", titulo: "5. Empacado Boutique", sub: "¡Tu pedido está listo con su presentación y tarjeta!", icono: PackageCheck },
];

const SLIDES_CUIDADO = [
  {
    badge: "CAPÍTULO 1 DE 3 • LA MEMORIA DE LA CERA",
    titulo: "El Primer Encendido lo Define Todo",
    descripcion:
      "La cera vegetal natural tiene memoria térmica. La primera vez que enciendas tu vela Eternia, déjala arder entre 2 y 3 horas continuas hasta que la cera derretida alcance los bordes del recipiente.",
    Comparativa: {
      malo: "Encendido de 20 min ➔ Crea túnel central y desperdicia cera.",
      bueno: "Encendido de 2 a 3 horas ➔ Piscina uniforme y aroma envolvente.",
    },
  },
  {
    badge: "CAPÍTULO 2 DE 3 • EL ARTE DEL PABILO",
    titulo: "Corte Preciso a 5 Milímetros",
    descripcion:
      "Antes de cada encendido, recorta la punta quemada del pabilo de algodón dejando aproximadamente 5 mm de altura. Esto garantiza una llama serena, limpia y sin humo negro.",
    Comparativa: {
      malo: "Pabilo largo (>1 cm) ➔ Llama inquieta, humo negro y consumo acelerado.",
      bueno: "Pabilo a 5 mm ➔ Llama cálida, combustión lenta y máxima duración.",
    },
  },
  {
    badge: "CAPÍTULO 3 DE 3 • CORAZÓN DE YESO Y CEMENTO",
    titulo: "Segunda Vida para tus Vasijas Artesanales",
    descripcion:
      "Nuestras vasijas son fundidas a mano con una mezcla exacta de yeso y cemento blanco. Cuando tu vela termine su ciclo, limpia el interior con agua tibia y dale una nueva vida en tu hogar.",
    Comparativa: {
      malo: "Desechar el envase ➔ Pierdes una pieza única hecha a mano.",
      bueno: "Reutilizar como maceta, joyero o porta-incienso ➔ Decoración eterna.",
    },
  },
];

// Textos exactos oficiales para las Cajas de Velas de Deseos (x6 y x12)
const TEXTO_CAJA_DESEOS_X6 = "6 velas de deseos (Salud, Amor, Prosperidad, Éxito, Paz, Familia) en caja de regalo.";
const TEXTO_CAJA_DESEOS_X12 = "12 velas de deseos en tonos pastel para encender el 7 de diciembre.";

// Lista de IDs exactos de las 14 referencias con esRecordatorio = true
const IDS_RECORDATORIOS = new Set([
  "v-26", // Recordatorio Osito Basic (En Tul)
  "v-27", // Recordatorio Osito Ivory (En Caja Acetato)
  "v-28", // Vela Osito Rosas (En Tul)
  "v-29", // Vela Osito Rosas (En Caja Acetato)
  "v-30", // Recordatorio Angelito (En Tul)
  "v-31", // Recordatorio Nube (En Tul)
  "v-32", // Recordatorio Huellitas (En Tul)
  "v-33", // Recordatorio Corazón Pequeño (En Tul)
  "v-34", // Recordatorio Macaron (En Tul)
  "v-35", // Recordatorio Tajada de Limón (En Tul)
  "v-36", // Recordatorio Bloque Corazón (En Tul)
  "v-37", // Recordatorio Osito Honey (En Tul)
  "v-38", // Vela Cilindro Recordatorio 13 cm
  "v-39", // Vela Cilindro Recordatorio 20 cm
]);

function determinarEsRecordatorio(prod: ProductoVela): boolean {
  if (typeof prod.esRecordatorio === "boolean") return prod.esRecordatorio;
  if (IDS_RECORDATORIOS.has(prod.id)) return true;

  const n = (prod.nombre || "").toLowerCase();
  // Las velas en vaso de cristal y los ositos en vaso se venden sueltas (false)
  if (n.includes("vaso") || n.includes("cristal")) return false;

  if (
    n.includes("osito basic") ||
    n.includes("osito ivory") ||
    n.includes("osito rosas") ||
    n.includes("angelito") ||
    n.includes("recordatorio nube") ||
    n.includes("huellitas") ||
    n.includes("corazón pequeño") ||
    n.includes("corazon pequeño") ||
    n.includes("macaron") ||
    n.includes("tajada de limón") ||
    n.includes("tajada de limon") ||
    n.includes("bloque corazón") ||
    n.includes("bloque corazon") ||
    n.includes("osito honey") ||
    n.includes("cilindro recordatorio")
  ) {
    return true;
  }
  return false;
}

function normalizarCatalogoDeseos(lista: ProductoVela[]): ProductoVela[] {
  return lista.map((prod) => {
    const n = (prod.nombre || "").toLowerCase();
    const esRec = determinarEsRecordatorio(prod);
    if (prod.id === "v-1" || (n.includes("deseos") && n.includes("x6"))) {
      return { ...prod, descripcion: TEXTO_CAJA_DESEOS_X6, esRecordatorio: false };
    }
    if (prod.id === "v-2" || (n.includes("deseos") && n.includes("x12"))) {
      return { ...prod, descripcion: TEXTO_CAJA_DESEOS_X12, esRecordatorio: false };
    }
    return { ...prod, esRecordatorio: esRec };
  });
}

function productoLlevaAroma(prod: ProductoVela): boolean {
  const n = prod.nombre.toLowerCase();
  if (prod.id === "v-1" || prod.id === "v-2" || n.includes("deseo") || n.includes("sin aroma")) return false;
  if (prod.fragancia_ml <= 0 && prod.cera_g <= 0) return false;
  return true;
}

// 1. Gatico Chibi Trigueñito Gris con Blanco encima de la estrellita del Logo Eternia
function GaticoGrisLogo({ activo }: { activo: boolean }) {
  return (
    <svg
      width="38"
      height="28"
      viewBox="0 0 64 46"
      fill="none"
      className={`transition-transform duration-300 ${
        activo ? "-translate-y-1.5 rotate-6 scale-110" : "group-hover:-translate-y-1 group-hover:-rotate-3"
      }`}
    >
      <path d="M15 22 L10 8 L24 15 Z" fill="#7F8C8D" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 19 L12 11 L21 15 Z" fill="#F5B7B1" />
      <path d="M49 22 L54 8 L40 15 Z" fill="#7F8C8D" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
      <path d="M49 19 L52 11 L43 15 Z" fill="#F5B7B1" />
      <ellipse cx="32" cy="25" rx="17" ry="13" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2" />
      <path d="M15 22 C16 14, 25 12, 32 12 C39 12, 48 14, 49 22 C42 18, 22 18, 15 22 Z" fill="#7F8C8D" />
      <path d="M32 12 L32 17 M27 13 L28 17 M37 13 L36 17" stroke="#4D5656" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="20" cy="28" rx="2.8" ry="1.6" fill="#F5B7B1" />
      <ellipse cx="44" cy="28" rx="2.8" ry="1.6" fill="#F5B7B1" />
      {activo ? (
        <>
          <path d="M21 24 L26 25.5 L21 27" stroke="#3B2B23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 24 L38 25.5 L43 27" stroke="#3B2B23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="25" r="2.3" fill="#3B2B23" />
          <circle cx="40" cy="25" r="2.3" fill="#3B2B23" />
        </>
      )}
      <polygon points="30.5,27.5 33.5,27.5 32,29.5" fill="#F1948A" />
      <path d="M29 30.5 Q30.5 32.5 32 30.5 Q33.5 32.5 35 30.5" stroke="#3B2B23" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <ellipse cx="22" cy="37" rx="4.5" ry="3" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="1.8" />
      <ellipse cx="42" cy="37" rx="4.5" ry="3" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="1.8" />
    </svg>
  );
}

// 2. Gatico Chibi Naranja y Blanco colgando del botón de Mi Pedido
function GaticoChibiCarrito({ asustado }: { asustado: boolean }) {
  return (
    <svg
      width="44"
      height="34"
      viewBox="0 0 64 50"
      fill="none"
      className={`transition-transform duration-300 ${asustado ? "-translate-y-2.5 scale-110" : "group-hover:-translate-y-1"}`}
    >
      <path d="M15 24 L11 10 L24 17 Z" fill="#E67E22" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 21 L13 13 L21 17 Z" fill="#F5B7B1" />
      <path d="M49 24 L53 10 L40 17 Z" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2" strokeLinejoin="round" />
      <path d="M48 16 L53 10 L44 15 Z" fill="#D35400" />
      <ellipse cx="32" cy="27" rx="17" ry="13" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="2" />
      <path d="M15 25 C15 17, 23 14, 31 14 C27 19, 23 24, 15 27 Z" fill="#E67E22" />
      <ellipse cx="20" cy="30" rx="2.8" ry="1.6" fill="#F5B7B1" />
      <ellipse cx="44" cy="30" rx="2.8" ry="1.6" fill="#F5B7B1" />
      {asustado ? (
        <>
          <path d="M21 25 L26 27 L21 29" stroke="#3B2B23" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 25 L38 27 L43 29" stroke="#3B2B23" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="26.5" r="2.4" fill="#3B2B23" />
          <circle cx="40" cy="26.5" r="2.4" fill="#3B2B23" />
        </>
      )}
      <polygon points="30.5,29 33.5,29 32,31" fill="#E67E22" />
      <path d="M29 32 Q30.5 34 32 32 Q33.5 34 35 32" stroke="#3B2B23" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <ellipse cx="21" cy="39" rx="4.5" ry="3.2" fill="#FFFFFF" stroke="#3B2B23" strokeWidth="1.8" />
      <ellipse cx="43" cy="39" rx="4.5" ry="3.2" fill="#E67E22" stroke="#3B2B23" strokeWidth="1.8" />
    </svg>
  );
}

export default function TiendaEterniaPage() {
  const [productos, setProductos] = useState<ProductoVela[]>(() => normalizarCatalogoDeseos(CATALOGO_INICIAL_VELAS));
  const [idsOcultos, setIdsOcultos] = useState<string[]>([]);
  const [aromasStock, setAromasStock] = useState<AromaTiendaItem[]>(AROMAS_DEFAULT_TIENDA);
  const [aromaSeleccionadoPorProd, setAromaSeleccionadoPorProd] = useState<Record<string, string>>({});

  const [categoriaActiva, setCategoriaActiva] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [carrito, setCarrito] = useState<ItemCarritoConAroma[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState<boolean>(false);
  const [gaticoCarritoSaltando, setGaticoCarritoSaltando] = useState<boolean>(false);
  const [gaticoLogoMoviendo, setGaticoLogoMoviendo] = useState<boolean>(false);

  // Modales
  const [modalMapaAbierto, setModalMapaAbierto] = useState<boolean>(false);
  const [modalCuidadoAbierto, setModalCuidadoAbierto] = useState<boolean>(false);
  const [modalClubAbierto, setModalClubAbierto] = useState<boolean>(false);

  // Mapa de Seguimiento
  const [codigoRastreoInput, setCodigoRastreoInput] = useState<string>("");
  const [pedidoRastreado, setPedidoRastreado] = useState<any | null>(null);
  const [buscandoRastreo, setBuscandoRastreo] = useState<boolean>(false);
  const [errorRastreo, setErrorRastreo] = useState<string | null>(null);

  // Estados de los 3 Simuladores Interactivos del Cuidado de Velas
  const [slideActivo, setSlideActivo] = useState<number>(0);
  const [modoDemoEncendido, setModoDemoEncendido] = useState<"IDEAL" | "TUNEL">("IDEAL");
  const [horasPorDiaSim, setHorasPorDiaSim] = useState<number>(3);
  const [gramosCeraSim, setGramosCeraSim] = useState<number>(150);
  const [pabiloCortado5mm, setPabiloCortado5mm] = useState<boolean>(false);
  const [animandoTijera, setAnimandoTijera] = useState<boolean>(false);
  const [usoVasija, setUsoVasija] = useState<"MACETA" | "JOYERO" | "INCIENSO" | "DESECHAR">("MACETA");

  // Club Eternia (Pago 100% sin anticipo del 50%)
  const [clubNombre, setClubNombre] = useState<string>("");
  const [clubWhatsapp, setClubWhatsapp] = useState<string>("");
  const [clubAromaPref, setClubAromaPref] = useState<string>("Dulces & Cálidos (Vainilla / Canela)");
  const [clubMedioPago, setClubMedioPago] = useState<string>("Nequi");

  // Checkout Carrito
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

  useEffect(() => {
    async function inicializarTienda() {
      const guardadoLocal = localStorage.getItem("eternia_catalogo_v1");
      if (guardadoLocal) {
        try {
          const catNormalizado = normalizarCatalogoDeseos(JSON.parse(guardadoLocal));
          setProductos(catNormalizado);
          localStorage.setItem("eternia_catalogo_v1", JSON.stringify(catNormalizado));
        } catch (err) {
          console.error(err);
        }
      }
      const aromasLocal = localStorage.getItem("eternia_aromas_v1");
      if (aromasLocal) {
        try { setAromasStock(JSON.parse(aromasLocal)); } catch (err) { console.error(err); }
      }
      const ocultosLocal = localStorage.getItem("eternia_ocultos_v1");
      if (ocultosLocal) {
        try { setIdsOcultos(JSON.parse(ocultosLocal)); } catch (err) { console.error(err); }
      }

      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from("productos_velas")
          .select("*")
          .eq("activo_en_tienda", true)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          const catNubeNormalizado = normalizarCatalogoDeseos(data as ProductoVela[]);
          setProductos(catNubeNormalizado);
          localStorage.setItem("eternia_catalogo_v1", JSON.stringify(catNubeNormalizado));
        }

        const { data: cfgRows } = await supabase
          .from("pedidos")
          .select("codigo, origen")
          .in("codigo", ["CFG-AROMAS", "CFG-OCULTOS"]);

        if (cfgRows && cfgRows.length > 0) {
          cfgRows.forEach((row: any) => {
            if (row.codigo === "CFG-AROMAS" && row.origen) {
              try {
                const listaNube = JSON.parse(row.origen);
                if (Array.isArray(listaNube) && listaNube.length > 0) {
                  setAromasStock(listaNube);
                  localStorage.setItem("eternia_aromas_v1", JSON.stringify(listaNube));
                }
              } catch (e) { console.error(e); }
            }
            if (row.codigo === "CFG-OCULTOS" && row.origen) {
              try {
                const ocultosNube = JSON.parse(row.origen);
                if (Array.isArray(ocultosNube)) {
                  setIdsOcultos(ocultosNube);
                  localStorage.setItem("eternia_ocultos_v1", JSON.stringify(ocultosNube));
                }
              } catch (e) { console.error(e); }
            }
          });
        }
      }
    }
    inicializarTienda();

    const carritoGuardado = localStorage.getItem("eternia_carrito_v2");
    if (carritoGuardado) {
      try {
        const parsedCar: ItemCarritoConAroma[] = JSON.parse(carritoGuardado);
        const carritoNormalizado = parsedCar.map((it) => ({
          ...it,
          producto: { ...it.producto, esRecordatorio: determinarEsRecordatorio(it.producto) },
        }));
        setCarrito(carritoNormalizado);
      } catch (err) {
        console.error(err);
      }
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

  const productosFiltrados = useMemo(() => {
    return productos.filter((p: ProductoVela) => {
      if (p.precio_catalogo <= 0) return false;
      if (idsOcultos.includes(p.id)) return false;
      const coincideCat = categoriaActiva === "TODAS" || p.categoria === categoriaActiva;
      const coincideBusq =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion || "").toLowerCase().includes(busqueda.toLowerCase());
      return coincideCat && coincideBusq;
    });
  }, [productos, idsOcultos, categoriaActiva, busqueda]);

  const agregarAlCarrito = (producto: ProductoVela, cant: number = 1) => {
    const aromaFinal = obtenerAromaDeProducto(producto);
    const clave = `${producto.id}__${aromaFinal}`;
    const prodConBandera: ProductoVela = {
      ...producto,
      esRecordatorio: determinarEsRecordatorio(producto),
    };

    setGaticoCarritoSaltando(true);
    setTimeout(() => setGaticoCarritoSaltando(false), 600);

    setCarrito((prev) => {
      const existe = prev.find((item) => item.clave === clave);
      if (existe) {
        return prev.map((item) =>
          item.clave === clave
            ? { ...item, producto: prodConBandera, cantidad: Math.min(100, item.cantidad + cant) }
            : item
        );
      }
      return [...prev, { clave, producto: prodConBandera, cantidad: cant, aroma: aromaFinal }];
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

  // Regla de la docena para recordatorios vs Regla estándar de $15.000
  const totalRecordatorios = useMemo(
    () =>
      carrito.reduce(
        (acc, it) => acc + (determinarEsRecordatorio(it.producto) ? it.cantidad : 0),
        0
      ),
    [carrito]
  );
  const tieneRecordatorios = totalRecordatorios > 0;
  const faltanRecordatorios = Math.max(0, MIN_RECORDATORIOS - totalRecordatorios);
  const porcentajeRecordatorios = Math.min(100, Math.round((totalRecordatorios / MIN_RECORDATORIOS) * 100));
  const cumpleMinimoPedido = valorTotalCarrito >= 15000;
  const puedeEnviarPedido = tieneRecordatorios
    ? totalRecordatorios >= MIN_RECORDATORIOS
    : cumpleMinimoPedido;

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

        if (!error && data && !String(data.codigo || "").startsWith("CFG-")) {
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

  // Suscripción Club Eternia (Pago Completo 100% de una vez: $70.000 COP)
  const suscribirClubEternia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubNombre.trim() || !clubWhatsapp.trim()) return;

    setEnviando(true);
    try {
      let nuevoNumero = 1;
      if (isSupabaseConfigured) {
        const { data: listaCodigos } = await supabase.from("pedidos").select("codigo");
        if (listaCodigos && listaCodigos.length > 0) {
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
      const hoyStr = new Date().toISOString().split("T")[0];
      const itemClub: PedidoItemDetalle = {
        producto_nombre: `Membresía Club Eternia — Caja del Mes (${clubAromaPref})`,
        cantidad: 1,
        precio_unitario: 70000,
        costo_unitario: 28000,
        cera_unitaria_g: 220,
        fragancia_unitaria_ml: 22,
        pabilo_unitario_cm: 18,
        tipo_empaque: "Caja Coleccionable Club Eternia",
        subtotal: 70000,
      };

      if (isSupabaseConfigured) {
        const { data: pedInsertado } = await supabase
          .from("pedidos")
          .insert({
            codigo: codigoPedido,
            cliente_nombre: clubNombre.trim(),
            cliente_whatsapp: clubWhatsapp.trim(),
            aprobado: false,
            descuento_pct: 0,
            valor_total: 70000,
            costo_total: 28000,
            abono_50: 70000,
            dinero_recibido: 0,
            ganancia_libre: 42000,
            cera_total_g: 220,
            fragancia_total_ml: 22,
            pabilo_total_cm: 18,
            medio_pago: clubMedioPago,
            estado: "Pendiente Anticipo",
            origen: `Club Eternia || Empaque: Caja Coleccionable Club || ItemsJSON: ${JSON.stringify([itemClub])}`,
            fecha_pedido: hoyStr,
            fecha_entrega: fechaEntregaEstimada,
          })
          .select()
          .single();

        if (pedInsertado) {
          await supabase.from("pedido_items").insert([
            {
              pedido_id: pedInsertado.id,
              producto_nombre: itemClub.producto_nombre,
              cantidad: 1,
              precio_unitario: 70000,
              costo_unitario: 28000,
              cera_unitaria_g: 220,
              fragancia_unitaria_ml: 22,
              tipo_empaque: itemClub.tipo_empaque,
              subtotal: 70000,
            },
          ]);
        }
      }

      const textoWA =
        `\u2728 *SUSCRIPCION CLUB ETERNIA (LA VELA DEL MES)* \u2728\n` +
        `\uD83D\uDCCC *Codigo:* ${codigoPedido}\n` +
        `\uD83D\uDC64 *Suscriptor:* ${clubNombre.trim()}\n` +
        `\uD83C\uDF81 *Incluye:* 1 Vela en Vaso Exclusiva + Mini Combo de Moldes + Wax Melts + Cerillas Eternia + Tarjeta Coleccionable\n` +
        `\uD83D\uDD6F *Familia Olfativa:* ${clubAromaPref}\n\n` +
        `\uD83D\uDCB0 *Valor Total Membresia (Pago Unico):* ${formatoCOP(70000)}\n` +
        `\uD83C\uDFE6 *Medio de Pago:* ${clubMedioPago}\n\n` +
        `Hola! Quiero unirme al Club Eternia y adjunto el comprobante de mi membresia.`;

      window.open(`https://api.whatsapp.com/send?phone=573132019146&text=${encodeURIComponent(textoWA)}`, "_blank");
      setModalClubAbierto(false);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarPedidoWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    // Validación estricta justo antes de generar el mensaje de WhatsApp
    const sumaRecActual = carrito.reduce(
      (acc, it) => acc + (determinarEsRecordatorio(it.producto) ? it.cantidad : 0),
      0
    );
    if (sumaRecActual > 0 && sumaRecActual < MIN_RECORDATORIOS) {
      alert(
        `Llevas ${sumaRecActual} de ${MIN_RECORDATORIOS} recordatorios. Te faltan ${
          MIN_RECORDATORIOS - sumaRecActual
        } para completar la docena.`
      );
      return;
    }
    if (sumaRecActual === 0 && !cumpleMinimoPedido) {
      alert(`El pedido mínimo de taller es de ${formatoCOP(15000)}.`);
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
      const fragTotal = carrito.reduce(
        (acc, it) => acc + (productoLlevaAroma(it.producto) ? it.producto.fragancia_ml : 0) * it.cantidad,
        0
      );
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
        fragancia_unitaria_ml: productoLlevaAroma(it.producto) ? it.producto.fragancia_ml : 0,
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
        }
      }

      const lineasProductos = nuevoPedido.items
        .map((it) => `\u2022 ${it.cantidad}x ${it.producto_nombre} (${formatoCOP(it.subtotal)})`)
        .join("\n");

      const bloqueDedicatoriaWA =
        incluirDedicatoria && dedicatoriaMensaje.trim()
          ? `\n\uD83D\uDC8C *Tarjeta Dedicatoria:*\nPara: ${dedicatoriaPara || "Especial"} | De: ${dedicatoriaDe || clienteNombre}\n"${dedicatoriaMensaje.trim()}"\n`
          : "";

      const textoWA =
        `\u2728 *NUEVO PEDIDO ETERNIA CANDLES* \u2728\n` +
        `\uD83D\uDCCC *Codigo de Seguimiento:* ${codigoPedido}\n` +
        `\uD83D\uDC64 *Cliente:* ${clienteNombre.trim()}\n` +
        `\uD83C\uDF81 *Empaque:* ${empaqueElegido}\n` +
        `${bloqueDedicatoriaWA}\n` +
        `\uD83D\uDD6F *Detalle del Pedido:*\n${lineasProductos}\n\n` +
        `\uD83D\uDCB0 *Valor Total:* ${formatoCOP(valorTotalCarrito)}\n` +
        `\u2705 *Anticipo 50% (Para iniciar):* ${formatoCOP(abono50Carrito)}\n` +
        `\uD83C\uDFE6 *Medio de Pago:* ${medioPagoPreferido}\n` +
        `\uD83D\uDCC5 *Entrega estimada:* ${fechaEntregaEstimada}\n\n` +
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

  const ejecutarCortePabiloInteractivo = () => {
    setAnimandoTijera(true);
    setTimeout(() => {
      setPabiloCortado5mm((prev) => !prev);
      setAnimandoTijera(false);
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2B23] flex flex-col font-sans">
      <div className="bg-[#3B2B23] text-[#FAF6F0] text-xs sm:text-sm py-2 px-4 text-center font-medium tracking-wide">
        ✨ Velas artesanales hechas con amor y esencia natural • Personaliza tu aroma y tarjeta de regalo • Pedido mínimo $15.000
      </div>

      {/* CABECERA CON EL GATICO TRIGUEÑO GRIS Y BLANCO ENCIMA DE LA ESTRELLITA DEL LOGO */}
      <header className="sticky top-0 z-30 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E8D5CE] px-4 sm:px-8 pt-6 pb-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div
            onClick={() => {
              setGaticoLogoMoviendo(true);
              setTimeout(() => setGaticoLogoMoviendo(false), 700);
            }}
            className="flex items-center gap-3 group cursor-pointer select-none"
            title="¡Haz clic o pasa el mouse para saludar al gatico!"
          >
            <div className="relative">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <GaticoGrisLogo activo={gaticoLogoMoviendo} />
              </div>
              <div className="w-10 h-10 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif tracking-widest font-bold text-[#3B2B23]">ETERNIA CANDLES</h1>
              <p className="text-xs text-[#7A685F] italic tracking-wider font-serif">Handmade Aromas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setModalClubAbierto(true)}
              className="bg-[#3B2B23] hover:bg-[#523d32] text-[#C89D7C] border border-[#C89D7C] px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Crown className="w-4 h-4 text-[#C89D7C]" />
              <span className="hidden sm:inline">Club Eternia</span>
            </button>

            <button
              onClick={() => setModalCuidadoAbierto(true)}
              className="bg-white hover:bg-[#F3ECE1] text-[#3B2B23] border border-[#C89D7C] px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#C89D7C]" />
              <span>Ritual y Cuidado</span>
            </button>

            <button
              onClick={() => setModalMapaAbierto(true)}
              className="bg-[#F3ECE1] hover:bg-[#E8D5CE] text-[#3B2B23] border border-[#C89D7C] px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#C89D7C]" />
              <span>Rastrear</span>
            </button>

            {/* BOTÓN MI PEDIDO CON EL GATICO NARANJA Y BLANCO COLGANDO */}
            <div className="relative group pt-1">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <GaticoChibiCarrito asustado={gaticoCarritoSaltando} />
              </div>
              <button
                onClick={() => {
                  setGaticoCarritoSaltando(true);
                  setTimeout(() => setGaticoCarritoSaltando(false), 600);
                  setCarritoAbierto(true);
                }}
                className="relative bg-[#3B2B23] hover:bg-[#523d32] text-[#FAF6F0] px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#C89D7C]" />
                <span>Mi Pedido</span>
                {totalUnidades > 0 && (
                  <span className="bg-[#C89D7C] text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnidades}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[#F3ECE1] to-[#FAF6F0] pt-10 pb-8 px-4 sm:px-8 border-b border-[#E8D5CE]">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block bg-[#E8D5CE]/60 text-[#3B2B23] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest font-serif">
            Catálogo Oficial • @eternia.candles
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-medium text-[#3B2B23] max-w-3xl mx-auto leading-relaxed tracking-wide">
            Ilumina tus momentos con diseño, calma y tu aroma favorito
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

      <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-8 py-10 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map((prod: ProductoVela) => {
            const admiteAroma = productoLlevaAroma(prod);
            const aromaActual = obtenerAromaDeProducto(prod);
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

                  <div className="mt-4 pt-3 border-t border-[#FAF6F0]">
                    {admiteAroma ? (
                      <div>
                        <label className="block text-[11px] font-bold text-[#3B2B23] mb-1.5 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-[#C89D7C]" /> Elige el Aroma de tu Vela:
                        </label>
                        <select
                          value={aromaActual}
                          onChange={(e) =>
                            setAromaSeleccionadoPorProd((prev) => ({ ...prev, [prod.id]: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#C89D7C] text-xs font-bold text-[#3B2B23] focus:outline-none"
                        >
                          {aromasStock.map((ar) => (
                            <option key={ar.id} value={ar.nombre} disabled={!ar.disponible}>
                              {ar.disponible ? `✨ ${ar.nombre} — ${ar.notas}` : `🚫 ${ar.nombre} (Agotado en Stock)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-[#F3ECE1]/70 border border-[#E8D5CE] text-[11px] text-[#7A685F] flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#C89D7C] shrink-0" />
                        <span>
                          <strong>Vela Ritual de un Día:</strong> Elaborada en cera pura tradicional (no aplica fragancia).
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

        {/* SECCIÓN CLUB ETERNIA (MEMBRESÍA PAGO COMPLETO SIN 50% DE ANTICIPO) */}
        <div className="bg-[#3B2B23] text-[#FAF6F0] rounded-3xl p-6 sm:p-10 border border-[#C89D7C] shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C89D7C] text-white text-[11px] font-bold tracking-widest uppercase">
              <Crown className="w-3.5 h-3.5" /> Membresía Exclusiva • La Vela del Mes
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide text-white">
              Club Eternia: Tu Caja Secreta de Aromas y Colección
            </h3>
            <p className="text-xs sm:text-sm text-[#E8D5CE] leading-relaxed">
              Recibe cada mes una caja boutique con <strong>1 Vela en Vaso de aroma inédito</strong> + <strong>Mini Combo de Moldes Artesanales</strong> + <strong>Wax Melts</strong> + <strong>Cajita de Cerillas Eternia</strong> y una <strong>Tarjeta Ilustrada Coleccionable</strong>.
            </p>
          </div>
          <div className="bg-[#FAF6F0] text-[#3B2B23] p-5 rounded-2xl border border-[#C89D7C] text-center space-y-2 shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A685F] block">Suscripción Mensual Total</span>
            <span className="text-2xl font-serif font-extrabold text-[#3B2B23] block">{formatoCOP(70000)} / mes</span>
            <span className="text-[11px] text-[#196F3D] font-bold block">✨ Pago único mensual (Valor real +$95.000)</span>
            <button
              onClick={() => setModalClubAbierto(true)}
              className="w-full bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer transition tracking-wider"
            >
              Unirme al Club Eternia ➔
            </button>
          </div>
        </div>
      </main>

      {totalUnidades > 0 && !carritoAbierto && (
        <div className="fixed bottom-6 inset-x-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setCarritoAbierto(true)}
            className="w-full bg-[#3B2B23] text-[#FAF6F0] py-4 px-6 rounded-2xl shadow-2xl flex items-center justify-between border border-[#C89D7C] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#C89D7C] text-white text-xs font-extrabold px-3 py-1 rounded-full">{totalUnidades}</span>
              <span className="font-bold text-sm tracking-wider">Personalizar empaque y agendar</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-[#C89D7C] block">Total: {formatoCOP(valorTotalCarrito)}</span>
              <span className="text-[10px] text-[#E8D5CE] block">Anticipo 50%: {formatoCOP(abono50Carrito)}</span>
            </div>
          </button>
        </div>
      )}

      {/* DRAWER DEL CARRITO */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-[#FAF6F0] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#E8D5CE]">
            <div className="p-5 bg-[#F3ECE1] border-b border-[#E8D5CE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C89D7C]" />
                <h3 className="font-bold text-lg font-serif text-[#3B2B23]">Tu Pedido en Eternia Candles</h3>
              </div>
              <button onClick={() => setCarritoAbierto(false)} className="p-2 rounded-xl bg-white border border-[#E8D5CE] text-[#3B2B23] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Sparkles className="w-10 h-10 text-[#C89D7C] mx-auto opacity-60" />
                  <p className="text-sm text-[#7A685F]">Tu carrito está vacío. ¡Elige tus velas y aromas favoritos del catálogo!</p>
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
                            ✨ Vela Ritual de un Día: Elaborada en cera pura tradicional (no aplica fragancia).
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* REGLA DE LA DOCENA PARA RECORDATORIOS O MÍNIMO DE $15.000 */}
                  {tieneRecordatorios ? (
                    <div
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        totalRecordatorios >= MIN_RECORDATORIOS
                          ? "bg-[#D4EFDF] border-[#196F3D]/30 text-[#196F3D]"
                          : "bg-[#FCF3CF] border-[#D35400]/30 text-[#3B2B23]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>Llevas {totalRecordatorios} de {MIN_RECORDATORIOS} recordatorios</span>
                        <span>{porcentajeRecordatorios}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-[#C89D7C]/40">
                        <div
                          className={`h-full transition-all duration-300 ${
                            totalRecordatorios >= MIN_RECORDATORIOS ? "bg-[#196F3D]" : "bg-[#C89D7C]"
                          }`}
                          style={{ width: `${porcentajeRecordatorios}%` }}
                        />
                      </div>
                      {totalRecordatorios < MIN_RECORDATORIOS ? (
                        <p className="font-semibold text-[#D35400]">
                          Te faltan {faltanRecordatorios} para completar la docena
                        </p>
                      ) : (
                        <p className="font-semibold text-[#196F3D]">
                          ¡Docena completada! Ya puedes enviar tu pedido.
                        </p>
                      )}
                    </div>
                  ) : (
                    !cumpleMinimoPedido && (
                      <div className="p-3.5 rounded-xl bg-[#FCF3CF] border border-[#D35400]/30 text-xs text-[#3B2B23] space-y-1">
                        <strong className="block text-[#D35400]">✨ Pedido Mínimo de Taller: {formatoCOP(15000)}</strong>
                        <p>
                          Te faltan <strong>{formatoCOP(15000 - valorTotalCarrito)}</strong> para completar el pedido mínimo artesanal. ¡Agrega otra velita o arma tu dúo!
                        </p>
                      </div>
                    )
                  )}

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
                      <span>💌 ¿Es para regalar? Añadir tarjeta dedicatoria gratis</span>
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
                      <label className="block text-xs font-bold text-[#3B2B23] mb-1">
                        Métodos de pago: Nequi, Daviplata y transferencia bancaria
                      </label>
                      <select
                        value={medioPagoPreferido}
                        onChange={(e) => setMedioPagoPreferido(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#E8D5CE] text-sm font-medium"
                      >
                        <option value="Nequi">Nequi</option>
                        <option value="Daviplata">Daviplata</option>
                        <option value="Transferencia bancaria">Transferencia bancaria</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={enviando || !puedeEnviarPedido}
                      className="w-full bg-[#C89D7C] hover:bg-[#b58967] disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition text-sm cursor-pointer tracking-wider"
                    >
                      <Send className="w-4 h-4" />
                      {enviando ? "Generando Pedido..." : "Enviar Pedido por WhatsApp"}
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

      {/* ================================================================= */}
      {/* MODAL 1: MAPA DE SEGUIMIENTO ADAPTADO A CELULAR (CABECERA FIJA)   */}
      {/* ================================================================= */}
      {modalMapaAbierto && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FAF6F0] max-w-2xl w-full max-h-[88vh] flex flex-col rounded-3xl border border-[#E8D5CE] shadow-2xl overflow-hidden">
            <div className="bg-[#3B2B23] text-[#FAF6F0] p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shrink-0">
                  <Compass className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-serif font-bold tracking-wider">MAPA DE SEGUIMIENTO EN VIVO</h3>
                  <p className="text-[11px] text-[#E8D5CE]">Sigue cada etapa artesanal de tus velas</p>
                </div>
              </div>
              <button
                onClick={() => setModalMapaAbierto(false)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <form onSubmit={(e) => consultarSeguimientoPedido(e)} className="flex gap-2">
                <input
                  type="text"
                  value={codigoRastreoInput}
                  onChange={(e) => setCodigoRastreoInput(e.target.value)}
                  placeholder="Código (ej. PED-001)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#C89D7C] text-xs sm:text-sm font-bold uppercase tracking-wider focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={buscandoRastreo}
                  className="bg-[#C89D7C] hover:bg-[#b58967] text-white font-bold px-4 sm:px-6 py-2.5 rounded-xl text-xs tracking-wider cursor-pointer transition shrink-0"
                >
                  {buscandoRastreo ? "..." : "Rastrear"}
                </button>
              </form>

              {errorRastreo && (
                <div className="p-3.5 rounded-xl bg-[#FADBD8] text-[#922B21] text-xs font-medium">{errorRastreo}</div>
              )}

              {pedidoRastreado && (() => {
                const idxActual = Math.max(0, ETAPAS_MAPA.findIndex((e) => e.id === pedidoRastreado.estado));
                const porcentajeBarra = Math.round(((idxActual + 1) / ETAPAS_MAPA.length) * 100);

                return (
                  <div className="space-y-4">
                    <div className="bg-white p-3.5 rounded-2xl border border-[#E8D5CE] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C89D7C]">Orden Verificada</span>
                        <h4 className="text-base font-serif font-bold text-[#3B2B23]">
                          {pedidoRastreado.codigo} — {pedidoRastreado.cliente_nombre}
                        </h4>
                        <p className="text-xs text-[#7A685F]">Entrega estimada: <strong>{pedidoRastreado.fecha_entrega}</strong></p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#F3ECE1] border border-[#C89D7C] text-xs font-bold text-[#3B2B23]">
                        Avance: {porcentajeBarra}%
                      </span>
                    </div>

                    <div className="w-full h-3 bg-[#E8D5CE] rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#3B2B23] via-[#C89D7C] to-[#196F3D] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${porcentajeBarra}%` }}
                      />
                    </div>

                    <div className="space-y-2.5">
                      {ETAPAS_MAPA.map((etapa, index) => {
                        const IconoEtapa = etapa.icono;
                        const completada = index < idxActual;
                        const esActual = index === idxActual;

                        return (
                          <div
                            key={etapa.id}
                            className={`p-3.5 rounded-2xl border transition-all duration-500 flex items-center gap-3 ${
                              esActual
                                ? "bg-white border-2 border-[#C89D7C] shadow-md"
                                : completada
                                ? "bg-[#D4EFDF]/40 border-[#196F3D]/30"
                                : "bg-white/50 border-[#E8D5CE] opacity-60"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                esActual ? "bg-[#C89D7C] text-white animate-bounce" : completada ? "bg-[#196F3D] text-white" : "bg-[#F3ECE1] text-[#7A685F]"
                              }`}
                            >
                              <IconoEtapa className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="font-serif font-bold text-xs sm:text-sm text-[#3B2B23]">{etapa.titulo}</h5>
                                {esActual && (
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#C89D7C] text-white">
                                    Actual
                                  </span>
                                )}
                                {completada && <span className="text-[10px] font-bold text-[#196F3D]">✓</span>}
                              </div>
                              <p className="text-[11px] text-[#7A685F]">{etapa.sub}</p>
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

      {/* ================================================================= */}
      {/* MODAL 2: RITUAL Y CUIDADO (3 SIMULADORES DISTINTOS + MÓVIL 100%)  */}
      {/* ================================================================= */}
      {modalCuidadoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FAF6F0] max-w-3xl w-full max-h-[88vh] flex flex-col rounded-3xl border border-[#E8D5CE] shadow-2xl overflow-hidden">
            <div className="bg-[#3B2B23] text-[#FAF6F0] p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-serif font-bold tracking-wider">EL ARTE DEL CUIDADO • INTERACTIVO</h3>
                  <p className="text-[11px] text-[#E8D5CE]">Capítulo {slideActivo + 1} de {SLIDES_CUIDADO.length}</p>
                </div>
              </div>
              <button
                onClick={() => setModalCuidadoAbierto(false)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-2">
                {SLIDES_CUIDADO.map((_sl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideActivo(idx)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold font-serif transition cursor-pointer ${
                      slideActivo === idx ? "bg-[#C89D7C] text-white shadow-sm" : "bg-white text-[#7A685F] border border-[#E8D5CE]"
                    }`}
                  >
                    Paso {idx + 1}
                  </button>
                ))}
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E8D5CE] space-y-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C89D7C] block">
                  {SLIDES_CUIDADO[slideActivo].badge}
                </span>
                <h4 className="text-lg sm:text-2xl font-serif font-bold text-[#3B2B23]">
                  {SLIDES_CUIDADO[slideActivo].titulo}
                </h4>
                <p className="text-xs sm:text-sm text-[#7A685F] leading-relaxed">
                  {SLIDES_CUIDADO[slideActivo].descripcion}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#FADBD8]/40 border border-[#922B21]/20 text-xs text-[#922B21]">
                    <strong>❌ Evita esto:</strong>
                    <p className="mt-0.5">{SLIDES_CUIDADO[slideActivo].Comparativa.malo}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#D4EFDF]/50 border border-[#196F3D]/20 text-xs text-[#196F3D]">
                    <strong>✅ Ritual Eternia:</strong>
                    <p className="mt-0.5">{SLIDES_CUIDADO[slideActivo].Comparativa.bueno}</p>
                  </div>
                </div>

                {/* SIMULADOR INTERACTIVO PASO 1 */}
                {slideActivo === 0 && (
                  <div className="pt-3 border-t border-[#F3ECE1] grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E8D5CE] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-serif">Simulador de Quemado:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setModoDemoEncendido("IDEAL")}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${
                              modoDemoEncendido === "IDEAL" ? "bg-[#196F3D] text-white" : "bg-white border"
                            }`}
                          >
                            Ideal (2-3h)
                          </button>
                          <button
                            type="button"
                            onClick={() => setModoDemoEncendido("TUNEL")}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${
                              modoDemoEncendido === "TUNEL" ? "bg-[#922B21] text-white" : "bg-white border"
                            }`}
                          >
                            Efecto Túnel
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-center py-2">
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
                            ? "✨ Piscina uniforme de borde a borde."
                            : "⚠️ Se hunde el centro y se pierde cera."}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E8D5CE] space-y-3">
                      <h5 className="text-xs font-serif font-bold text-[#3B2B23] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#C89D7C]" /> Calculadora de Duración de tu Vela
                      </h5>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span>Peso en cera: <strong>{gramosCeraSim}g</strong></span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setGramosCeraSim((g) => Math.max(50, g - 20))}
                              className="w-7 h-7 rounded-lg bg-white border border-[#C89D7C] font-bold text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => setGramosCeraSim((g) => Math.min(350, g + 20))}
                              className="w-7 h-7 rounded-lg bg-[#C89D7C] text-white font-bold text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={350}
                          step={10}
                          value={gramosCeraSim}
                          onChange={(e) => setGramosCeraSim(Number(e.target.value))}
                          onInput={(e) => setGramosCeraSim(Number((e.target as HTMLInputElement).value))}
                          className="w-full accent-[#C89D7C] cursor-pointer"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <span>Uso diario: <strong>{horasPorDiaSim} h / día</strong></span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setHorasPorDiaSim((h) => Math.max(1, h - 1))}
                              className="w-7 h-7 rounded-lg bg-white border border-[#C89D7C] font-bold text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => setHorasPorDiaSim((h) => Math.min(6, h + 1))}
                              className="w-7 h-7 rounded-lg bg-[#C89D7C] text-white font-bold text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={6}
                          step={1}
                          value={horasPorDiaSim}
                          onChange={(e) => setHorasPorDiaSim(Number(e.target.value))}
                          onInput={(e) => setHorasPorDiaSim(Number((e.target as HTMLInputElement).value))}
                          className="w-full accent-[#C89D7C] cursor-pointer"
                        />
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#3B2B23] text-[#FAF6F0] text-center text-xs">
                        Duración estimada: <strong>{calculoSimuladorDuracion.horasTotales} horas</strong> (
                        <strong className="text-[#C89D7C]">{calculoSimuladorDuracion.diasDuracion} días</strong> de ritual).
                      </div>
                    </div>
                  </div>
                )}

                {/* SIMULADOR INTERACTIVO PASO 2 */}
                {slideActivo === 1 && (
                  <div className="pt-3 border-t border-[#F3ECE1]">
                    <div className="bg-[#FAF6F0] p-5 rounded-2xl border border-[#E8D5CE] flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex flex-col items-center justify-center min-w-[160px] py-2 relative">
                        {!pabiloCortado5mm && (
                          <div className="text-[10px] text-gray-500 font-bold animate-bounce mb-1">
                            💨 Humo negro (Pabilo 12mm)
                          </div>
                        )}
                        <Flame
                          className={`transition-all duration-500 ${
                            pabiloCortado5mm
                              ? "w-7 h-7 text-amber-500 scale-100"
                              : "w-10 h-10 text-orange-600 animate-ping"
                          }`}
                          style={{ animationDuration: pabiloCortado5mm ? "2s" : "0.6s" }}
                        />
                        <div className="relative flex items-center justify-center">
                          <div
                            className={`w-1.5 bg-[#3B2B23] transition-all duration-500 rounded-t ${
                              pabiloCortado5mm ? "h-2.5" : "h-7"
                            }`}
                          />
                          <Scissors
                            className={`w-6 h-6 text-[#C89D7C] absolute -right-7 transition-transform duration-300 ${
                              animandoTijera ? "-translate-x-5 rotate-45 scale-125" : ""
                            }`}
                          />
                        </div>
                        <div className="w-28 h-16 rounded-b-2xl border-2 border-[#C89D7C] bg-[#F3ECE1] flex items-center justify-center text-[11px] font-serif font-bold text-[#3B2B23]">
                          {pabiloCortado5mm ? "Pabilo a 5 mm ✨" : "Pabilo largo 12 mm"}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 text-center sm:text-left">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${pabiloCortado5mm ? "bg-[#D4EFDF] text-[#196F3D]" : "bg-[#FADBD8] text-[#922B21]"}`}>
                          {pabiloCortado5mm
                            ? "✅ Estado Actual: Pabilo recortado a 5 mm (Llama limpia y serena)"
                            : "⚠️ Estado Actual: Pabilo sin cortar (Genera hollín y gasta más cera)"}
                        </span>
                        <p className="text-xs text-[#7A685F]">
                          Haz clic en las tijeras para simular el recorte de 5 mm antes de encender tu vela:
                        </p>
                        <button
                          type="button"
                          onClick={ejecutarCortePabiloInteractivo}
                          className="bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold px-5 py-3 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm transition"
                        >
                          <Scissors className="w-4 h-4 text-[#C89D7C]" />
                          {pabiloCortado5mm ? "Reiniciar Demostración (12 mm)" : "✂️ Cortar Pabilo a 5 mm Ahora"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SIMULADOR INTERACTIVO PASO 3 */}
                {slideActivo === 2 && (
                  <div className="pt-3 border-t border-[#F3ECE1]">
                    <div className="bg-[#FAF6F0] p-4 sm:p-5 rounded-2xl border border-[#E8D5CE] space-y-4">
                      <span className="text-xs font-serif font-bold text-[#3B2B23] block text-center">
                        Toque Interactivo: ¿Qué harás cuando se termine la cera de tu vasija artesanal?
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "MACETA", label: "🌱 Maceta Suculenta" },
                          { id: "JOYERO", label: "💍 Joyero Boutique" },
                          { id: "INCIENSO", label: "🌸 Porta-Aromas" },
                          { id: "DESECHAR", label: "❌ Desecharla" },
                        ].map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setUsoVasija(op.id as typeof usoVasija)}
                            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                              usoVasija === op.id
                                ? op.id === "DESECHAR"
                                  ? "bg-[#922B21] text-white"
                                  : "bg-[#196F3D] text-white shadow-sm"
                                : "bg-white text-[#3B2B23] border border-[#E8D5CE]"
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-[#E8D5CE] flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#F3ECE1] border-2 border-[#C89D7C] flex items-center justify-center shrink-0">
                          {usoVasija === "MACETA" && <Flower2 className="w-8 h-8 text-[#196F3D] animate-bounce" />}
                          {usoVasija === "JOYERO" && <Gem className="w-8 h-8 text-[#C89D7C] animate-pulse" />}
                          {usoVasija === "INCIENSO" && <Sparkles className="w-8 h-8 text-amber-600 animate-spin" style={{ animationDuration: "5s" }} />}
                          {usoVasija === "DESECHAR" && <Trash2 className="w-8 h-8 text-[#922B21]" />}
                        </div>
                        <div className="text-xs space-y-1 text-center sm:text-left">
                          {usoVasija === "MACETA" && (
                            <>
                              <strong className="text-[#196F3D] block">🌱 Ideal para Suculentas y Cactus</strong>
                              <p className="text-[#7A685F]">El yeso y cemento blanco regulan la humedad de forma natural y lucen hermosos en tu escritorio.</p>
                            </>
                          )}
                          {usoVasija === "JOYERO" && (
                            <>
                              <strong className="text-[#196F3D] block">💍 Joyero Minimalista en tu Mesa de Noche</strong>
                              <p className="text-[#7A685F]">Al lavar los restos de cera con agua tibia, queda un recipiente suave y elegante para guardar anillos y aretes.</p>
                            </>
                          )}
                          {usoVasija === "INCIENSO" && (
                            <>
                              <strong className="text-[#196F3D] block">🌸 Porta-Incienso o Algodones</strong>
                              <p className="text-[#7A685F]">Su resistencia térmica te permite usarla con conos de incienso, palo santo o para organizar tu tocador.</p>
                            </>
                          )}
                          {usoVasija === "DESECHAR" && (
                            <>
                              <strong className="text-[#922B21] block">❌ ¡No la botes a la basura!</strong>
                              <p className="text-[#7A685F]">Cada vasija de Eternia fue fundida y lijada a mano. ¡Límpiala con agua tibia y dale una segunda vida!</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F3ECE1] border-t border-[#E8D5CE] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSlideActivo((prev) => Math.max(0, prev - 1))}
                disabled={slideActivo === 0}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E8D5CE] text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs font-serif font-bold text-[#3B2B23]">
                Capítulo {slideActivo + 1} de {SLIDES_CUIDADO.length}
              </span>
              <button
                type="button"
                onClick={() => setSlideActivo((prev) => Math.min(SLIDES_CUIDADO.length - 1, prev + 1))}
                disabled={slideActivo === SLIDES_CUIDADO.length - 1}
                className="px-4 py-2.5 rounded-xl bg-[#3B2B23] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: CLUB ETERNIA (PAGO ÚNICO COMPLETO SIN 50% DE ANTICIPO)   */}
      {/* ================================================================= */}
      {modalClubAbierto && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FAF6F0] max-w-lg w-full max-h-[88vh] flex flex-col rounded-3xl border border-[#C89D7C] shadow-2xl overflow-hidden">
            <div className="bg-[#3B2B23] text-[#FAF6F0] p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#C89D7C] flex items-center justify-center text-white shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-serif font-bold tracking-wider">CLUB ETERNIA • LA VELA DEL MES</h3>
                  <p className="text-[11px] text-[#E8D5CE]">Suscripción mensual con pago completo de una vez</p>
                </div>
              </div>
              <button
                onClick={() => setModalClubAbierto(false)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={suscribirClubEternia} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-[#E8D5CE] space-y-2">
                <div className="flex justify-between items-center font-serif font-bold text-sm text-[#3B2B23]">
                  <span>Valor Total Membresía Mensual:</span>
                  <span className="text-lg text-[#C89D7C]">{formatoCOP(70000)}</span>
                </div>
                <p className="text-[#7A685F]">
                  Incluye: 1 Vela de Vaso exclusiva + Mini Combo de Moldes + Wax Melts + Cajita de Cerillas Eternia + Tarjeta Coleccionable del Mes. (Se cancela el 100% al inscribirse).
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1">Tu Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={clubNombre}
                  onChange={(e) => setClubNombre(e.target.value)}
                  placeholder="Ej: Valentina Prada"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8D5CE] text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Tu WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={clubWhatsapp}
                  onChange={(e) => setClubWhatsapp(e.target.value)}
                  placeholder="Ej: 310 000 0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8D5CE] text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">¿Qué notas olfativas prefieres en tu caja?</label>
                <select
                  value={clubAromaPref}
                  onChange={(e) => setClubAromaPref(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8D5CE] text-xs font-bold"
                >
                  <option value="Dulces & Cálidos (Vainilla / Canela)">🍦 Dulces & Cálidos (Vainilla / Canela)</option>
                  <option value="Frutales & Vibrantes (Frutos Rojos / Maracuyá)">🍓 Frutales & Vibrantes (Frutos Rojos / Maracuyá)</option>
                  <option value="Botánicos & Frescos (Lavanda / Pino / Bambú)">🌿 Botánicos & Frescos (Lavanda / Pino / Bambú)</option>
                  <option value="Sorpréndeme con la Creación del Mes">✨ Sorpréndeme con la Creación del Mes</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Métodos de pago: Nequi, Daviplata y transferencia bancaria
                </label>
                <select
                  value={clubMedioPago}
                  onChange={(e) => setClubMedioPago(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8D5CE] text-xs font-bold"
                >
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Transferencia bancaria">Transferencia bancaria</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-[#3B2B23] hover:bg-[#523d32] text-white font-bold py-3.5 rounded-xl text-xs tracking-wider cursor-pointer shadow-md"
              >
                {enviando ? "Registrando..." : `Suscribirme por ${formatoCOP(70000)} en WhatsApp`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA LIMPIO SOLO CON LA MARCA */}
      <footer className="bg-[#F3ECE1] border-t border-[#E8D5CE] py-10 px-4 sm:px-8 text-center text-xs text-[#7A685F] font-serif">
        <p className="font-bold text-[#3B2B23] text-sm tracking-widest">ETERNIA CANDLES • BOGOTÁ, COLOMBIA</p>
      </footer>
    </div>
  );
}