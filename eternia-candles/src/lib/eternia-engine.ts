// src/lib/eternia-engine.ts

export const MIN_RECORDATORIOS = 12;

export interface CostosBaseInsumos {
  ceraPorGramo: number;
  fraganciaPorMl: number;
  pabiloPorCm: number;
  colorantePorVela: number;
}

export interface ProductoVela {
  id: string;
  nombre: string;
  categoria: "NAVIDAD" | "DÍA DE LAS VELITAS" | "TODA OCASIÓN" | "HALLOWEEN" | "RECORDATORIOS Y EVENTOS" | "VASIJAS DE YESO";
  cant_velas: number;
  cera_g: number;
  fragancia_ml: number;
  pabilo_cm: number;
  tipo_empaque: string;
  costo_produccion: number;
  precio_justo: number;
  precio_catalogo: number;
  descripcion?: string;
  activo_en_tienda?: boolean;
  esRecordatorio?: boolean;
}

export interface InsumoItem {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  medida_por_unidad: number;
  precio_por_unidad: number;
  cantidad_comprada: number;
}

export interface ItemCarrito {
  producto: ProductoVela;
  cantidad: number;
}

export interface PedidoItemDetalle {
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  cera_unitaria_g: number;
  fragancia_unitaria_ml: number;
  pabilo_unitario_cm: number;
  tipo_empaque: string;
  subtotal: number;
}

export interface PedidoCompleto {
  id: string;
  codigo: string;
  cliente_nombre: string;
  cliente_whatsapp: string;
  aprobado: boolean;
  descuento_pct: number;
  valor_total: number;
  costo_total: number;
  abono_50: number;
  dinero_recibido: number;
  ganancia_libre: number;
  cera_total_g: number;
  fragancia_total_ml: number;
  pabilo_total_cm: number;
  medio_pago: string;
  estado: string;
  origen: string;
  fecha_pedido: string;
  fecha_entrega: string;
  items: PedidoItemDetalle[];
}

export const COSTOS_BASE_DEFAULT: CostosBaseInsumos = {
  ceraPorGramo: 22,
  fraganciaPorMl: 167,
  pabiloPorCm: 15,
  colorantePorVela: 100,
};

export const TARIFAS_EMPAQUE_DEFAULT: Record<string, number> = {
  "Tul Básico": 300,
  "Caja Molde": 1300,
  "Caja Acetato": 1500,
  "Caja Deseos": 1900,
  "Vaso Vidrio 5x8": 4400,
  "Vaso Vidrio 8x8": 4600,
  "Frasco Corcho": 3400,
  "Vasija Yeso Miel": 1700,
  "Vasija Yeso Infinito": 1700,
  "Vasija Yeso Corazón": 1700,
};

export function redondearCentena(valor: number): number {
  return Math.round(valor / 100) * 100;
}

export function redondearQuinientos(valor: number): number {
  return Math.round(valor / 500) * 500;
}

export function formatoCOP(valor: number): string {
  return "$" + Math.round(valor || 0).toLocaleString("es-CO");
}

export function calcularFechaEntregaHabil(fechaBaseStr?: string, diasHabiles: number = 5): string {
  // Usamos una fecha de respaldo fija en texto si no mandan ninguna, evitando cualquier conflicto de servidor
  const base = fechaBaseStr || "2026-10-21";
  const [year, month, day] = base.split("-").map(Number);
  const fecha = new Date(year, (month || 1) - 1, day || 1);
  
  let sumados = 0;
  while (sumados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    if (fecha.getDay() !== 0) {
      sumados++;
    }
  }
  return fecha.toISOString().split("T")[0];
}

export function calcularCostoVasijaYeso(
  vasosYeso: number = 3,
  vasosCemento: number = 1,
  vasosAgua: number = 2,
  costoGramoYeso: number = 3,
  costoGramoCemento: number = 3
) {
  const gramosYeso = vasosYeso * 65;
  const gramosCemento = vasosCemento * 65;
  const gramosAgua = vasosAgua * 95;
  const costoMateriales = gramosYeso * costoGramoYeso + gramosCemento * costoGramoCemento;
  const costoVasijaRedondeado = redondearCentena(costoMateriales);
  const costoEmpaqueCompleto = redondearCentena(costoMateriales + 900);
  return {
    gramosYeso,
    gramosCemento,
    gramosAgua,
    costoVasijaRedondeado,
    costoEmpaqueCompleto,
  };
}

export function calcularCosteoVela(params: {
  cantVelas: number;
  ceraGramos: number;
  pabiloCm: number;
  costoEmpaque: number;
  precioCatalogoManual?: number;
  costosBase?: CostosBaseInsumos;
}) {
  const base = params.costosBase || COSTOS_BASE_DEFAULT;
  const fraganciaMl = Math.round(params.ceraGramos * 0.1);

  const costoMateriales = redondearCentena(
    params.ceraGramos * base.ceraPorGramo +
      fraganciaMl * base.fraganciaPorMl +
      params.pabiloCm * base.pabiloPorCm +
      params.cantVelas * base.colorantePorVela
  );

  const costoProduccion = redondearCentena(costoMateriales + params.costoEmpaque);
  const precioJusto = params.ceraGramos > 0 ? redondearQuinientos(costoProduccion * 2) : 0;
  const precioCatalogo =
    params.precioCatalogoManual && params.precioCatalogoManual > 0
      ? params.precioCatalogoManual
      : precioJusto;

  const gananciaLibre = precioCatalogo > 0 ? precioCatalogo - costoProduccion : 0;
  const margenPorcentaje = precioCatalogo > 0 ? gananciaLibre / precioCatalogo : 0;

  return {
    fraganciaMl,
    costoMateriales,
    costoProduccion,
    precioJusto,
    precioCatalogo,
    gananciaLibre,
    margenPorcentaje,
    alertaMargenBajo: precioCatalogo > 0 && margenPorcentaje < 0.4,
  };
}

export function obtenerSugerenciaUpsell(nombreProducto: string): string {
  const n = nombreProducto.toLowerCase();
  if (n.includes("deseos")) return "💡 Sugerencia: Ofrece caja de fósforos decorativa o base de yeso extra.";
  if (n.includes("navidad") || n.includes("reno") || n.includes("merry") || n.includes("cascanueces"))
    return "💡 Sugerencia: Ofrece el Dúo Merry Christmas o la Caja de Velas de Deseos.";
  if (n.includes("solo vela")) return "💡 Sugerencia: Ofrece agregar el Osito decorativo en cera por solo +$1.000 COP.";
  if (n.includes("osito")) return "💡 Sugerencia: Ofrece la presentación en Caja de Acetato de lujo.";
  if (n.includes("yeso")) return "💡 Sugerencia: Ofrece la Bandeja Ovalada de Yeso a juego.";
  return "💡 Sugerencia: Ofrece empaque de regalo premium con tarjeta personalizada.";
}

export function generarMensajeWhatsAppPedido(params: {
  codigoPedido: string;
  clienteNombre: string;
  items: { cantidad: number; nombre: string }[];
  valorTotal: number;
  abono50: number;
}): string {
  const resumenItems = params.items.map((it) => `• ${it.cantidad}x${it.nombre}`).join("\n");
  const nombreCliente = params.clienteNombre.trim() ? params.clienteNombre.trim() : "Cliente";
  
  return `*ETERNIA CANDLES — NUEVO PEDIDO WEB*\n----------------------------------------\n¡Hola equipo de Eternia! Acabo de apartar mi pedido a través de la tienda.\n\n*Detalles de la orden (${params.codigoPedido}):*\n${resumenItems}\n\n*• Cliente:* ${nombreCliente}\n*• Valor Total:* ${formatoCOP(params.valorTotal)}\n*• Anticipo (50\%):* ${formatoCOP(params.abono50)}\n----------------------------------------\nQuedo atento(a) para enviarles el comprobante del anticipo y coordinar los detalles de entrega. ¡Muchas gracias!`;
}

function crearItemSemilla(
  id: string,
  nombre: string,
  categoria: ProductoVela["categoria"],
  cant_velas: number,
  cera_g: number,
  pabilo_cm: number,
  tipo_empaque: string,
  precio_catalogo: number,
  descripcion: string,
  esRecordatorio: boolean = false
): ProductoVela {
  const costoEmpaque = TARIFAS_EMPAQUE_DEFAULT[tipo_empaque] ?? 1300;
  const calc = calcularCosteoVela({
    cantVelas: cant_velas,
    ceraGramos: cera_g,
    pabiloCm: pabilo_cm,
    costoEmpaque,
    precioCatalogoManual: precio_catalogo,
  });
  return {
    id,
    nombre,
    categoria,
    cant_velas,
    cera_g,
    fragancia_ml: calc.fraganciaMl,
    pabilo_cm,
    tipo_empaque,
    costo_produccion: calc.costoProduccion,
    precio_justo: calc.precioJusto,
    precio_catalogo: calc.precioCatalogo,
    descripcion,
    activo_en_tienda: calc.precioCatalogo > 0,
    esRecordatorio,
  };
}

export const CATALOGO_INICIAL_VELAS: ProductoVela[] = [
  crearItemSemilla("v-1", "Caja Velas de Deseos x6", "DÍA DE LAS VELITAS", 6, 150, 84, "Caja Deseos", 18000, "6 velas de deseos (Salud, Amor, Prosperidad, Éxito, Paz, Familia) en caja de regalo.", false),
  crearItemSemilla("v-2", "Caja Velas de Deseos x12", "DÍA DE LAS VELITAS", 12, 300, 168, "Caja Deseos", 30000, "12 velas de deseos en tonos pastel para encender el 7 de diciembre.", false),
  crearItemSemilla("v-3", "Vela Arbolito de Navidad Grande", "NAVIDAD", 1, 156, 14, "Caja Molde", 17500, "Pino navideño texturizado de 156g con aroma cálido de temporada.", false),
  crearItemSemilla("v-4", "Vela Rudolf (Reno Navideño)", "NAVIDAD", 1, 140, 14, "Caja Molde", 15500, "Tierno reno navideño esculpido en cera de molde de alta pureza.", false),
  crearItemSemilla("v-5", "Vela Bota Navideña", "NAVIDAD", 1, 176, 12, "Caja Molde", 19000, "Bota navideña con relieves artesanales, ideal para centros de mesa o regalos.", false),
  crearItemSemilla("v-6", "Vela Muñeco de Nieve", "NAVIDAD", 1, 55, 9, "Tul Básico", 7500, "Detalle navideño encantador en empaque de tul con cinta.", false),
  crearItemSemilla("v-7", "Vela Cascanueces", "NAVIDAD", 1, 305, 16, "Caja Molde", 34000, "Pieza imponente de 305g de cera aromática, el protagonista de la mesa navideña.", false),
  crearItemSemilla("v-8", "Vela Bosque de Renos", "NAVIDAD", 1, 266, 12, "Caja Molde", 29000, "Cilindro artístico grabado con escena de bosque y renos (266g).", false),
  crearItemSemilla("v-9", "Vela Árbol Burbujas (Esferas)", "NAVIDAD", 1, 69, 11, "Caja Molde", 9500, "Diseño moderno de arbolito en esferas minimalistas.", false),
  crearItemSemilla("v-10", "Vela Sagrada Familia", "NAVIDAD", 1, 102, 12, "Caja Molde", 12500, "Pesebre delicado en cera natural para iluminar el hogar en Navidad.", false),
  crearItemSemilla("v-11", "Vela Campana Merry Christmas", "NAVIDAD", 1, 144, 10, "Caja Molde", 16000, "Campana decorativa con grabado Merry Christmas.", false),
  crearItemSemilla("v-12", "Vela Esfera Merry Christmas", "NAVIDAD", 1, 165, 9, "Caja Molde", 18000, "Esfera tallada con detalles navideños de 165g.", false),
  crearItemSemilla("v-13", "Dúo Merry Christmas (Campana + Esfera)", "NAVIDAD", 2, 309, 19, "Caja Molde", 31000, "Set especial de Navidad: Campana + Esfera Merry Christmas con descuento de kit.", false),
  crearItemSemilla("v-14", "Vela Esfera Papá Noel", "NAVIDAD", 1, 202, 11, "Caja Molde", 22000, "Esfera de gran formato (202g) con relieve de Papá Noel.", false),
  crearItemSemilla("v-15", "Colección Espíritu Navideño Completa (x6)", "NAVIDAD", 6, 317, 59, "Caja Molde", 34000, "Set completo de 6 figuras: Reno, Copo, Jengibre y 3 Arbolitos navideños.", false),
  crearItemSemilla("v-16", "Espíritu Navideño: Reno", "NAVIDAD", 1, 105, 13, "Tul Básico", 11500, "Figura individual de Reno navideño de 105g.", false),
  crearItemSemilla("v-17", "Espíritu Navideño: Copo de Nieve", "NAVIDAD", 1, 44, 8, "Tul Básico", 6000, "Copo de nieve aromático en tul decorativo.", false),
  crearItemSemilla("v-18", "Espíritu Navideño: Hombre de Jengibre", "NAVIDAD", 1, 40, 9, "Tul Básico", 6000, "Galleta de jengibre en cera aromática.", false),
  crearItemSemilla("v-19", "Espíritu Navideño: Árbol Picos", "NAVIDAD", 1, 43, 10, "Tul Básico", 6000, "Arbolito de picos navideño.", false),
  crearItemSemilla("v-20", "Espíritu Navideño: Árbol Redondo", "NAVIDAD", 1, 41, 9, "Tul Básico", 6000, "Arbolito redondo minimalista.", false),
  crearItemSemilla("v-21", "Espíritu Navideño: Árbol ZigZag", "NAVIDAD", 1, 44, 10, "Tul Básico", 6000, "Arbolito textura zigzag.", false),
  crearItemSemilla("v-22", "Vela en Vaso Cristal Medium (5x8 cm - Solo Vela)", "RECORDATORIOS Y EVENTOS", 1, 93, 10, "Vaso Vidrio 5x8", 16500, "Vela aromática en vaso de cristal de 5x8 cm (93g de cera suave, diseño limpio sin osito).", false),
  crearItemSemilla("v-23", "Osito Vaso Vidrio Medium (5x8 cm)", "RECORDATORIOS Y EVENTOS", 1, 103, 14, "Vaso Vidrio 5x8", 17500, "Vela en vaso de cristal de 5x8 cm coronada con tierno osito de cera artesanal.", false),
  crearItemSemilla("v-24", "Vela en Vaso Cristal Big (8x8 cm - Solo Vela)", "RECORDATORIOS Y EVENTOS", 1, 192, 14, "Vaso Vidrio 8x8", 24000, "Vela aromática de gran formato en vaso de cristal de 8x8 cm (192g de cera natural, sin osito).", false),
  crearItemSemilla("v-25", "Osito Vaso Vidrio Big (8x8 cm)", "RECORDATORIOS Y EVENTOS", 1, 202, 18, "Vaso Vidrio 8x8", 25000, "Nuestra versión grande en vaso de 8x8 cm (202g) con osito decorativo en la superficie.", false),
  crearItemSemilla("v-26", "Recordatorio Osito Basic (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 6, "Tul Básico", 4500, "Recordatorio clásico de osito en tul con cinta y tarjeta personalizada.", true),
  crearItemSemilla("v-27", "Recordatorio Osito Ivory (En Caja Acetato)", "RECORDATORIOS Y EVENTOS", 1, 10, 6, "Caja Acetato", 6500, "Osito presentado en caja cristalina de acetato con moño decorativo.", true),
  crearItemSemilla("v-28", "Vela Osito Rosas (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 54, 9, "Tul Básico", 10000, "Osito esculpido en textura de pétalos de rosa (54g) en tul.", true),
  crearItemSemilla("v-29", "Vela Osito Rosas (En Caja Acetato)", "RECORDATORIOS Y EVENTOS", 1, 54, 9, "Caja Acetato", 12000, "Osito de rosas en caja de lujo de acetato transparente.", true),
  crearItemSemilla("v-30", "Recordatorio Angelito (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 75, 10, "Tul Básico", 11000, "Ideal para bautizos y primeras comuniones (75g).", true),
  crearItemSemilla("v-31", "Recordatorio Nube (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 5, "Tul Básico", 4500, "Mini nube aromática para baby showers y eventos.", true),
  crearItemSemilla("v-32", "Recordatorio Huellitas (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 5, "Tul Básico", 4500, "Detalle tierno de huellita en tul.", true),
  crearItemSemilla("v-33", "Recordatorio Corazón Pequeño (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 5, "Tul Básico", 4500, "Corazón aromático para bodas, aniversarios o eventos.", true),
  crearItemSemilla("v-34", "Recordatorio Macaron (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 5, "Tul Básico", 4500, "Vela tipo macaron francés.", true),
  crearItemSemilla("v-35", "Recordatorio Tajada de Limón (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 5, "Tul Básico", 4500, "Detalle cítrico decorativo en tul.", true),
  crearItemSemilla("v-36", "Recordatorio Bloque Corazón (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 10, 5, "Tul Básico", 4500, "Mini bloque con relieve de corazón.", true),
  crearItemSemilla("v-37", "Recordatorio Osito Honey (En Tul)", "RECORDATORIOS Y EVENTOS", 1, 8, 6, "Tul Básico", 5000, "Tierno osito edición Honey en tul.", true),
  crearItemSemilla("v-38", "Vela Cilindro Recordatorio 13 cm", "RECORDATORIOS Y EVENTOS", 1, 33, 15, "Tul Básico", 6500, "Vela cilíndrica estilizada de 13 cm.", true),
  crearItemSemilla("v-39", "Vela Cilindro Recordatorio 20 cm", "RECORDATORIOS Y EVENTOS", 1, 48, 22, "Tul Básico", 8500, "Vela cilíndrica alta de 20 cm.", true),
  crearItemSemilla("v-40", "Vela Perlas Esfera", "TODA OCASIÓN", 1, 95, 8, "Caja Molde", 12000, "Esfera estética de perlas para decorar cualquier rincón.", false),
  crearItemSemilla("v-41", "Vela Perlas Cilindro", "TODA OCASIÓN", 1, 185, 10, "Caja Molde", 20000, "Cilindro elegante de perlas de 185g.", false),
  crearItemSemilla("v-42", "Dúo Perlas (Esfera + Cilindro)", "TODA OCASIÓN", 2, 279, 18, "Caja Molde", 29000, "Combinación de diseño interior: Esfera + Cilindro de perlas.", false),
  crearItemSemilla("v-43", "Vela Espiral", "TODA OCASIÓN", 1, 88, 8, "Caja Molde", 11000, "Curvas arquitectónicas suaves y aroma relajante.", false),
  crearItemSemilla("v-44", "Vela Pera (Hexágonos)", "TODA OCASIÓN", 1, 135, 11, "Caja Molde", 15000, "Textura geométrica moderna de 135g.", false),
  crearItemSemilla("v-45", "Vela Mini Bubble (Burbuja)", "TODA OCASIÓN", 1, 36, 6, "Tul Básico", 5500, "Clásico cubo bubble aesthetic.", false),
  crearItemSemilla("v-46", "Vela en Vasija de Yeso: Tarro de Miel", "VASIJAS DE YESO", 1, 90, 10, "Vasija Yeso Miel", 15000, "Vasija artesanal en yeso y cemento blanco impermeabilizada, reutilizable como joyero.", false),
  crearItemSemilla("v-47", "Vela en Vasija de Yeso: Infinito", "VASIJAS DE YESO", 1, 120, 14, "Vasija Yeso Infinito", 18000, "Vasija escultural Infinito hecha a mano en taller.", false),
  crearItemSemilla("v-48", "Vela en Vasija de Yeso: Taza Corazón", "VASIJAS DE YESO", 1, 100, 10, "Vasija Yeso Corazón", 16000, "Vasija de autor con silueta de corazón en cemento blanco y yeso.", false),
  crearItemSemilla("v-49", "Vela Fantasma (Boo)", "HALLOWEEN", 1, 34, 7, "Tul Básico", 7000, "Fantasmita Boo aromático.", false),
  crearItemSemilla("v-50", "Vela Momia (Mumi)", "HALLOWEEN", 1, 11, 5, "Tul Básico", 4500, "Mini momia coleccionable.", false),
  crearItemSemilla("v-51", "Dúo Encantado (Fantasma + Momia)", "HALLOWEEN", 2, 45, 12, "Caja Molde", 10500, "Kit especial de Halloween Boo + Mumi.", false),
];

export const INSUMOS_INICIALES: InsumoItem[] = [
  { id: "i-1", codigo: "CER_MOL", nombre: "Cera de Molde", unidad: "Gr", medida_por_unidad: 1000, precio_por_unidad: 22000, cantidad_comprada: 2 },
  { id: "i-2", codigo: "CER_VAS", nombre: "Cera de Vaso", unidad: "Gr", medida_por_unidad: 1000, precio_por_unidad: 22000, cantidad_comprada: 1 },
  { id: "i-3", codigo: "FRAG", nombre: "Fragancia", unidad: "Ml", medida_por_unidad: 120, precio_por_unidad: 20000, cantidad_comprada: 7 },
  { id: "i-4", codigo: "PAB", nombre: "Pabilo", unidad: "Cm", medida_por_unidad: 1000, precio_por_unidad: 15000, cantidad_comprada: 1 },
  { id: "i-5", codigo: "YESO", nombre: "Yeso", unidad: "Gr", medida_por_unidad: 1000, precio_por_unidad: 3000, cantidad_comprada: 1 },
  { id: "i-6", codigo: "CEM", nombre: "Cemento Blanco", unidad: "Gr", medida_por_unidad: 1000, precio_por_unidad: 3000, cantidad_comprada: 1 },
  { id: "i-7", codigo: "ENV_5X8", nombre: "Vaso Vidrio 5x8 cm (Medium)", unidad: "Un", medida_por_unidad: 1, precio_por_unidad: 3500, cantidad_comprada: 6 },
  { id: "i-8", codigo: "ENV_8X8", nombre: "Vaso Vidrio 8x8 cm (Big)", unidad: "Un", medida_por_unidad: 1, precio_por_unidad: 3700, cantidad_comprada: 6 },
  { id: "i-9", codigo: "EMP_ACE", nombre: "Caja de Acetato", unidad: "Un", medida_por_unidad: 50, precio_por_unidad: 60000, cantidad_comprada: 1 },
  { id: "i-10", codigo: "EMP_DES", nombre: "Caja Velas de Deseos", unidad: "Un", medida_por_unidad: 11, precio_por_unidad: 20000, cantidad_comprada: 2 },
  { id: "i-11", codigo: "EMP_MOL", nombre: "Empaque Individual Molde", unidad: "Un", medida_por_unidad: 1, precio_por_unidad: 1000, cantidad_comprada: 20 },
  { id: "i-12", codigo: "EMP_TUL", nombre: "Bolsa Celofán / Tul", unidad: "Un", medida_por_unidad: 100, precio_por_unidad: 6900, cantidad_comprada: 1 },
];