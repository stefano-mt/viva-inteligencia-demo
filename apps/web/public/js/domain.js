import { state } from "./state.js";
export {
  componentHelp,
  panelActions,
  renderJourneyGuide,
  renderSectionGuide,
} from "./views/guidance.js";

export function getProjects() {
  return toArray(state.data?.projects);
}

export function getScenarioContext() {
  return state.scenarioContext;
}

export function canonicalProjectId(projectOrId) {
  const value =
    typeof projectOrId === "object" && projectOrId !== null
      ? projectOrId.project_id ?? projectOrId.id
      : projectOrId;
  const id = String(value ?? "");
  if (!id) return null;
  if (id.startsWith("project:")) return id;
  if (id.startsWith("observed:")) {
    const assignment = state.data?.geography?.assignments?.find(
      ({ observed_project_id: observedId }) => observedId === id,
    );
    if (assignment?.authoritative_project_id) {
      return assignment.authoritative_project_id;
    }
    if (id.startsWith("observed:nexo-")) {
      return `project:nexo-${id.slice("observed:nexo-".length)}`;
    }
    return null;
  }
  return `project:nexo-${id}`;
}

export function observedProjectId(projectOrId) {
  const value =
    typeof projectOrId === "object" && projectOrId !== null
      ? projectOrId.observed_project_id ?? projectOrId.id
      : projectOrId;
  const id = String(value ?? "");
  if (!id) return null;
  if (id.startsWith("observed:")) return id;
  if (id.startsWith("project:")) {
    const assignment = state.data?.geography?.assignments?.find(
      ({ authoritative_project_id: authoritativeId }) =>
        authoritativeId === id,
    );
    if (assignment?.observed_project_id) {
      return assignment.observed_project_id;
    }
    if (id.startsWith("project:nexo-")) {
      return `observed:nexo-${id.slice("project:nexo-".length)}`;
    }
    return null;
  }
  return `observed:nexo-${id}`;
}

export function legacyProjectId(projectOrId) {
  const value =
    typeof projectOrId === "object" && projectOrId !== null
      ? projectOrId.id
      : projectOrId;
  const id = String(value ?? "");
  if (!id) return null;
  if (id.startsWith("project:nexo-")) {
    return id.slice("project:nexo-".length);
  }
  if (id.startsWith("observed:nexo-")) {
    return id.slice("observed:nexo-".length);
  }
  return id.includes(":") ? null : id;
}

export function projectsForCanonicalIds(projectIds) {
  const byId = new Map(
    getProjects().map((project) => [canonicalProjectId(project), project]),
  );
  return toArray(projectIds)
    .map((projectId) => byId.get(projectId))
    .filter(Boolean);
}

export function getComparableProjects() {
  return projectsForCanonicalIds(
    state.scenarioContext?.comparable_project_ids,
  );
}

export function getPriceReferenceProjects() {
  return projectsForCanonicalIds(
    state.scenarioContext?.price_reference_project_ids,
  );
}

export function isComparableProject(projectOrId) {
  const projectId = canonicalProjectId(projectOrId);
  return Boolean(
    projectId &&
      state.scenarioContext?.comparable_project_ids.includes(projectId),
  );
}

export function isScenarioDisplayProject(projectOrId) {
  const projectId = observedProjectId(projectOrId);
  return Boolean(
    projectId &&
      state.scenarioContext?.display_project_ids.includes(projectId),
  );
}

export function getScenarioDisplayProjects() {
  const byObservedId = new Map(
    getProjects().map((project) => [observedProjectId(project), project]),
  );
  return toArray(state.scenarioContext?.display_project_ids)
    .map((projectId) => byObservedId.get(projectId))
    .filter(Boolean);
}

export function getProjectsByDistrict(district) {
  return getProjects().filter((project) => project.district === district);
}

export function getScenarioProjects() {
  return getComparableProjects();
}

export function filterCatalogProjects() {
  const query = normalizeSearch(state.projectFilters.query);
  const rows = getProjects().filter((project) => {
    const districtOk = !state.projectFilters.district || state.projectFilters.district === "Todos" || project.district === state.projectFilters.district;
    const typologyOk = state.projectFilters.typology === "Todos" || project.typology === state.projectFilters.typology;
    const phaseOk = state.projectFilters.phase === "Todos" || project.project_phase === state.projectFilters.phase;
    const queryOk = !query || [
      project.project_name,
      project.agency_name,
      project.district,
      project.address,
      project.project_phase,
    ].some((value) => normalizeSearch(value).includes(query));
    return districtOk && typologyOk && phaseOk && queryOk;
  });
  return sortProjects(rows, state.projectFilters.sort);
}

export function compareCandidates() {
  const query = normalizeSearch(state.compareQuery);
  return getCompetitors(state.strategy, 60).filter((project) => {
    if (!query) return true;
    return [project.project_name, project.agency_name, project.district].some((value) => normalizeSearch(value).includes(query));
  });
}

export function sortProjects(projects, sortKey) {
  const rows = [...projects];
  const targetPriceM2 = getTargetPriceM2(state.strategy);
  const targetArea = positiveNumber(state.strategy.area);
  const sorters = {
    direct: (left, right) => comparableScore(right, state.strategy) - comparableScore(left, state.strategy),
    price_m2: (left, right) => sortNumeric(projectPriceM2(left), projectPriceM2(right), "asc"),
    price_total: (left, right) => sortNumeric(positiveNumber(left.list_price_avg), positiveNumber(right.list_price_avg), "asc"),
    area: (left, right) => sortNumeric(projectArea(right), projectArea(left), "desc"),
    bedrooms: (left, right) => sortNumeric(numberOrZero(right.bedrooms_max), numberOrZero(left.bedrooms_max), "desc"),
    units: (left, right) => sortNumeric(numberOrZero(right.unit_count), numberOrZero(left.unit_count), "desc"),
    delivery: (left, right) => sortNumeric(positiveNumber(left.delivery_year), positiveNumber(right.delivery_year), "asc"),
    closest_price: (left, right) => {
      if (!targetPriceM2) return comparableScore(right, state.strategy) - comparableScore(left, state.strategy);
      return Math.abs((projectPriceM2(left) ?? 0) - targetPriceM2) - Math.abs((projectPriceM2(right) ?? 0) - targetPriceM2);
    },
    competition: (left, right) => {
      const leftArea = targetArea && projectArea(left) ? Math.abs(projectArea(left) - targetArea) : 0;
      const rightArea = targetArea && projectArea(right) ? Math.abs(projectArea(right) - targetArea) : 0;
      return comparableScore(right, state.strategy) - comparableScore(left, state.strategy) || leftArea - rightArea;
    },
  };
  return rows.sort(sorters[sortKey] ?? sorters.direct);
}

export function buildBenchmark(projects, district) {
  const rows = toArray(projects);
  const priceValues = rows.map(projectPriceM2).filter(isPositive);
  const priceTotals = rows.map((project) => positiveNumber(project.list_price_avg)).filter(isPositive);
  const agencies = unique(rows.map((project) => project.agency_name)).length;
  return {
    district,
    projects: rows.length,
    units: sum(rows, (project) => numberOrZero(project.unit_count)),
    avgPriceM2: average(priceValues),
    medianPriceM2: median(priceValues),
    lowPriceM2: percentile(priceValues, 25),
    highPriceM2: percentile(priceValues, 75),
    avgPrice: average(priceTotals),
    medianPrice: median(priceTotals),
    agencies,
    topAgencies: countBy(rows, (project) => project.agency_name || "No registrado").slice(0, 8),
    phases: countBy(rows, (project) => project.project_phase || "No registrado"),
    typologies: countBy(rows, (project) => project.typology || "No registrado"),
  };
}

export function districtBenchmarks() {
  return getDistricts().map((district) => buildBenchmark(getProjectsByDistrict(district), district))
    .sort((left, right) => right.projects - left.projects || right.units - left.units || left.district.localeCompare(right.district));
}

export function getCompetitors(strategy, limit = 6) {
  return getScenarioProjects().slice(0, limit);
}

export function comparableScore(project, strategy) {
  const projectId = canonicalProjectId(project);
  return (
    state.scenarioContext?.comparable_scores.find(
      (record) => record.project_id === projectId,
    )?.score ?? 0
  );
}

export function classifyPricePosition(targetPriceM2, benchmark) {
  if (!targetPriceM2 || !benchmark.medianPriceM2) {
    return {
      label: "Benchmark general",
      summary: "Sin precio objetivo; la lectura se concentra en oferta, presión competitiva y rango del distrito.",
      tone: "neutral",
    };
  }
  const median = benchmark.medianPriceM2;
  const low = benchmark.lowPriceM2 || median * 0.92;
  const high = benchmark.highPriceM2 || median * 1.08;
  const distance = (targetPriceM2 - median) / median;
  if (targetPriceM2 < low || distance < -0.08) {
    return {
      label: "Entrada competitiva",
      summary: `El precio objetivo está ${formatPercent(Math.abs(distance))} por debajo de la mediana del distrito.`,
      tone: "success",
    };
  }
  if (targetPriceM2 <= high || Math.abs(distance) <= 0.08) {
    return {
      label: "Alineado al mercado",
      summary: "El precio objetivo se ubica cerca de la banda central del distrito.",
      tone: "neutral",
    };
  }
  return {
    label: "Posicionamiento premium",
    summary: `El precio objetivo está ${formatPercent(distance)} por encima de la mediana del distrito.`,
    tone: "warning",
  };
}

export function buildCommercialRecommendation(strategy, benchmark, comparableProjects) {
  const targetPriceM2 = getTargetPriceM2(strategy);
  const position = classifyPricePosition(targetPriceM2, benchmark);
  const competition = competitionLevel(benchmark);
  const pressure = comparableProjects.length >= 24 || competition.level === "Alta";

  if (!targetPriceM2) {
    return {
      tone: competition.tone,
      diagnosis: `${strategy.district} muestra ${competition.level.toLowerCase()} presión competitiva.`,
      implication: "Conviene definir precio objetivo y comparar contra la mediana antes de cerrar el mensaje comercial.",
      action: pressure
        ? "Priorizar diferenciación por ubicación, entrega y atributos visibles."
        : "Explorar una campaña de entrada con educación del distrito y captura temprana de leads.",
    };
  }

  if (position.label === "Entrada competitiva") {
    return {
      tone: "success",
      diagnosis: "Tu proyecto estaría por debajo de la mediana del distrito.",
      implication: "El precio puede funcionar como gancho comercial sin depender solo de descuentos.",
      action: pressure
        ? "Comunicar oportunidad, ahorro relativo y urgencia frente a competidores directos."
        : "Posicionar como alternativa de valor y capturar leads tempranos.",
    };
  }

  if (position.label === "Alineado al mercado") {
    return {
      tone: pressure ? "warning" : "neutral",
      diagnosis: "Tu proyecto estaría alineado al rango central del mercado.",
      implication: "La decisión no se ganará solo por precio; el valor percibido debe ser claro.",
      action: pressure
        ? "Diferenciar por ubicación, entrega, financiamiento y áreas comunes."
        : "Reforzar atributos del distrito y beneficios concretos para sostener conversión.",
    };
  }

  return {
    tone: "warning",
    diagnosis: "Tu proyecto estaría por encima del promedio del distrito.",
    implication: "El precio necesita una justificación clara para evitar comparación directa por costo.",
    action: "Reforzar ubicación, acabados, exclusividad, financiamiento y beneficios diferenciales en la campaña.",
  };
}

export function buildAssistantResponse(questionText) {
  const text = normalizeSearch(questionText);
  const district = extractDistrictFromText(text) || state.strategy.district || defaultDistrict();
  const districtProjects = getProjectsByDistrict(district);
  const benchmark = buildBenchmark(districtProjects, district);
  const competitors = getCompetitors({ ...state.strategy, district }, 5);
  const position = classifyPricePosition(getTargetPriceM2(state.strategy), benchmark);
  const recommendation = buildCommercialRecommendation({ ...state.strategy, district }, benchmark, competitors);

  if (text.includes("inmobiliaria") || text.includes("dominan")) {
    const leaders = benchmark.topAgencies.slice(0, 4);
    return {
      title: `Inmobiliarias activas en ${district}`,
      summary: `${district} registra ${formatNumber(benchmark.agencies)} inmobiliarias con presencia visible.`,
      metrics: [
        { label: "Proyectos", value: formatNumber(benchmark.projects) },
        { label: "Inmobiliarias", value: formatNumber(benchmark.agencies) },
      ],
      reading: leaders.length
        ? `La presencia se concentra en ${leaders.map((row) => row.name).join(", ")}.`
        : "La información visible no permite identificar líderes claros.",
      action: "Revisar los proyectos de las tres inmobiliarias con mayor presencia antes de definir mensaje y promoción.",
      references: leaders.map((row) => `${row.name}: ${formatNumber(row.count)} proyectos`),
      caution: "Información referencial para análisis comercial. Validar cifras antes de uso contractual.",
    };
  }

  if (text.includes("presion") || text.includes("mayor")) {
    const top = districtBenchmarks().slice(0, 5);
    return {
      title: "Distritos con mayor presión competitiva",
      summary: "La presión se estima por cantidad de proyectos, unidades publicadas e inmobiliarias activas.",
      metrics: [
        { label: "Distrito líder", value: top[0]?.district || "No disponible" },
        { label: "Proyectos", value: formatNumber(top[0]?.projects) },
      ],
      reading: `${top[0]?.district || district} concentra una de las ofertas visibles más altas del mercado observado.`,
      action: "Usar benchmark de precio por m2 y comparador estratégico antes de activar una campaña en los distritos más saturados.",
      references: top.map((row) => `${row.district}: ${formatNumber(row.projects)} proyectos`),
      caution: "Las unidades publicadas son oferta visible, no stock definitivo.",
    };
  }

  if (text.includes("sobre") || text.includes("premium") || text.includes("argumento")) {
    return {
      title: "Argumento para precio sobre el promedio",
      summary: position.label === "Posicionamiento premium" ? position.summary : "El argumento comercial debe sostener valor aunque el precio esté cerca del mercado.",
      metrics: [
        { label: "Mediana / m2", value: priceM2(benchmark.medianPriceM2) },
        { label: "Rango competitivo", value: formatRange(benchmark.lowPriceM2, benchmark.highPriceM2) },
      ],
      reading: "Cuando el precio supera la referencia del distrito, la campaña debe reducir la comparación directa por costo.",
      action: "Justificar valor con ubicación, entrega, áreas comunes, acabados, financiamiento y menor riesgo percibido.",
      references: messageAngles(benchmark, position, competitors).slice(0, 5),
      caution: "Validar el precio objetivo con comparables cercanos antes de comunicar una ventaja premium.",
    };
  }

  if (text.includes("atributo") || text.includes("destacar") || text.includes("campana")) {
    const angles = messageAngles(benchmark, position, competitors);
    return {
      title: `Atributos a destacar en ${district}`,
      summary: "La selección de atributos depende de presión competitiva, precio objetivo y oferta dominante.",
      metrics: [
        { label: "Comparables", value: formatNumber(competitors.length) },
        { label: "Competencia", value: competitionLevel(benchmark).level },
      ],
      reading: recommendation.implication,
      action: recommendation.action,
      references: angles,
      caution: "Elegir pocos mensajes fuertes suele ser más claro que listar todos los atributos disponibles.",
    };
  }

  if (text.includes("proyecto") || text.includes("compiten") || text.includes("presionar")) {
    return {
      title: `Competidores directos en ${district}`,
      summary: `${district} tiene ${formatNumber(benchmark.projects)} proyectos visibles para comparar posicionamiento.`,
      metrics: [
        { label: "Mediana / m2", value: priceM2(benchmark.medianPriceM2) },
        { label: "Inmobiliarias", value: formatNumber(benchmark.agencies) },
      ],
      reading: competitors.length
        ? `Los proyectos que conviene revisar primero son ${competitors.slice(0, 3).map((project) => project.project_name).join(", ")}.`
        : "No hay suficientes proyectos visibles para una lectura profunda.",
      action: "Comparar precio por m2, área, entrega y atributos antes de definir promoción.",
      references: competitors.slice(0, 5).map((project) => `${project.project_name} - ${priceM2(projectPriceM2(project))}`),
      caution: "Los precios publicados pueden incluir descuentos o condiciones de campaña.",
    };
  }

  return {
    title: `Lectura comercial de ${district}`,
    summary: districtInsight(benchmark, competitors),
    metrics: [
      { label: "Proyectos", value: formatNumber(benchmark.projects) },
      { label: "Unidades publicadas", value: formatNumber(benchmark.units) },
      { label: "Mediana / m2", value: priceM2(benchmark.medianPriceM2) },
    ],
    reading: recommendation.implication,
    action: recommendation.action,
    references: messageAngles(benchmark, position, competitors).slice(0, 5),
    caution: "Información referencial para análisis comercial. Validar cifras antes de uso contractual.",
  };
}

export function buildOpportunitySignals(benchmark, comparableProjects, pricePosition) {
  const topAgency = benchmark.topAgencies[0];
  const topShare = topAgency && benchmark.projects ? topAgency.count / benchmark.projects : 0;
  const immediate = benchmark.phases.find((row) => normalizeSearch(row.name).includes("entrega"))?.count ?? 0;
  const signals = [
    {
      tone: competitionClass(benchmark),
      title: `${competitionLevel(benchmark).level} presión competitiva`,
      body: `${formatNumber(benchmark.projects)} proyectos y ${formatNumber(benchmark.agencies)} inmobiliarias activas en la lectura.`,
    },
    {
      tone: pricePosition.tone,
      title: pricePosition.label,
      body: pricePosition.summary,
    },
    {
      tone: topShare >= 0.22 ? "warning" : "neutral",
      title: topAgency ? `${topAgency.name} concentra presencia` : "Presencia distribuida",
      body: topAgency ? `${formatPercent(topShare)} de proyectos visibles pertenecen a este jugador.` : "No se detecta un jugador dominante.",
    },
    {
      tone: immediate >= 10 ? "warning" : "success",
      title: immediate >= 10 ? "Oferta con entrega inmediata" : "Menor presión por entrega inmediata",
      body: immediate >= 10 ? `${formatNumber(immediate)} proyectos pueden competir con urgencia de entrega.` : "La comunicación puede enfocarse en propuesta de valor y captura temprana.",
    },
  ];
  if (!comparableProjects.length) {
    signals.unshift({
      tone: "warning",
      title: "Información insuficiente para este cálculo",
      body: "Revisa proyectos comparables del distrito o amplia los filtros del escenario.",
    });
  }
  return signals.slice(0, 4);
}

export function checklistRisks(benchmark, pricePosition, lowerCompetitors) {
  return [
    {
      tone: competitionClass(benchmark),
      title: "Concentración competitiva",
      body: competitionLevel(benchmark).level === "Alta" ? "Hay alta presencia de proyectos similares." : "La presión observable es manejable.",
    },
    {
      tone: pricePosition.tone === "warning" ? "warning" : "neutral",
      title: "Sensibilidad de precio",
      body: pricePosition.tone === "warning" ? "El precio superior exige un argumento de valor fuerte." : "El precio no aparece como riesgo principal del escenario.",
    },
    {
      tone: lowerCompetitors.length ? "warning" : "success",
      title: "Competidores agresivos",
      body: lowerCompetitors.length ? "Existen comparables con menor precio por m2." : "No se detecta presión fuerte por menor precio.",
    },
  ];
}

export function messageAngles(benchmark, pricePosition, comparableProjects) {
  const angles = [];
  if (pricePosition.label === "Entrada competitiva") angles.push("Ahorro relativo", "Valor por m2", "Oportunidad de entrada");
  if (pricePosition.label === "Posicionamiento premium") angles.push("Ubicación", "Acabados", "Exclusividad", "Menor riesgo de entrega");
  if (pricePosition.label === "Alineado al mercado" || pricePosition.label === "Benchmark general") angles.push("Ubicación", "Entrega", "Financiamiento", "Áreas comunes");
  if (competitionLevel(benchmark).level === "Alta") angles.push("Diferenciación clara", "Urgencia comercial");
  if (comparableProjects.length < 8) angles.push("Menor saturación competitiva");
  return unique(angles).slice(0, 8);
}

export function marketEvents() {
  const priceChanges = getProjects()
    .filter((project) => Number.isFinite(Number(project.price_delta_pct)) && Number(project.price_delta_pct) !== 0)
    .sort((left, right) => Math.abs(Number(right.price_delta_pct)) - Math.abs(Number(left.price_delta_pct)))
    .slice(0, 5)
    .map((project) => ({
      date: formatDate(project.update_date || project.captured_at),
      title: "Proyecto con variación relevante de precio",
      body: `${project.project_name} en ${project.district} muestra una variación publicada de ${formatNumber(project.price_delta_pct, 1)}%.`,
      tone: Number(project.price_delta_pct) > 0 ? "warning" : "success",
      tags: [project.district, project.agency_name, priceM2(projectPriceM2(project))],
    }));

  const topDistricts = districtBenchmarks().slice(0, 3).map((row) => ({
    date: formatDate(metadataDate()),
    title: "Distrito con alta concentración de oferta",
    body: `${row.district} registra ${formatNumber(row.projects)} proyectos y ${formatNumber(row.agencies)} inmobiliarias activas.`,
    tone: row.district === state.strategy.district ? "warning" : "neutral",
    tags: [formatNumber(row.units) + " unidades publicadas", priceM2(row.medianPriceM2)],
  }));

  return [...priceChanges, ...topDistricts].slice(0, 8);
}

export function weeklyRecommendations(benchmark) {
  const competitors = getCompetitors(state.strategy, 3);
  return [
    {
      title: "Revisar competidores principales",
      body: competitors.length ? `Priorizar ${competitors.map((project) => project.project_name).join(", ")}.` : "Seleccionar un distrito con oferta visible.",
    },
    {
      title: "Validar precio objetivo",
      body: `Contrastar contra mediana ${priceM2(benchmark.medianPriceM2)} y rango ${formatRange(benchmark.lowPriceM2, benchmark.highPriceM2)}.`,
    },
    {
      title: "Ajustar mensaje de campaña",
      body: "Definir si la promoción competirá por valor, atributos, entrega o oportunidad de entrada.",
    },
    {
      title: "Preparar argumento de ventas",
      body: "Convertir riesgos de precio y competencia en respuestas simples para el equipo comercial.",
    },
  ];
}

export function districtInsight(benchmark, comparableProjects) {
  if (!benchmark.projects) return "Información insuficiente para este distrito. Revisa proyectos comparables del mercado visible.";
  const competition = competitionLevel(benchmark).level.toLowerCase();
  const price = benchmark.medianPriceM2 ? `mediana de ${priceM2(benchmark.medianPriceM2)}` : "precio por m2 aún no concluyente";
  return `${benchmark.district} muestra ${competition} competencia, ${formatNumber(benchmark.projects)} proyectos visibles y una ${price}.`;
}

export function districtExecutiveReading(benchmark) {
  const level = competitionLevel(benchmark);
  if (!benchmark.projects) return "No hay oferta suficiente para una lectura comercial del distrito.";
  if (level.level === "Alta") {
    return "El distrito exige una propuesta clara de diferenciación: precio, entrega, ubicación o atributos visibles deben sostener la campaña.";
  }
  if (level.level === "Media") {
    return "El distrito permite competir con un mensaje bien segmentado y comparación directa contra proyectos representativos.";
  }
  return "La menor saturacion observable abre espacio para educar al mercado y capturar leads temprano.";
}

export function competitiveReading(project, strategy, benchmark) {
  const targetPriceM2 = getTargetPriceM2(strategy);
  const ppm = projectPriceM2(project);
  if (targetPriceM2 && ppm) {
    if (ppm < targetPriceM2 * 0.95) return "Puede presionar la campaña por menor precio por m2.";
    if (ppm > targetPriceM2 * 1.08) return "Puede justificar precio superior por atributos visibles, ubicación o entrega.";
    return "Compite directamente por precio y rango de valor.";
  }
  if (ppm && benchmark.medianPriceM2) {
    if (ppm < benchmark.medianPriceM2 * 0.95) return "Compite por precio frente a la mediana del distrito.";
    if (ppm > benchmark.medianPriceM2 * 1.08) return "Se ubica en rango premium frente al distrito.";
  }
  const area = projectArea(project);
  const targetArea = positiveNumber(strategy.area);
  if (area && targetArea && Math.abs(area - targetArea) / targetArea < 0.12) return "Compite por metraje y segmento de departamento.";
  return "Conviene revisar atributos, entrega y financiamiento antes de definir comparación.";
}

export function comparisonConclusion(projects) {
  if (projects.length < 2) {
    return { title: "Selección insuficiente", body: "Elige al menos 2 proyectos comparables." };
  }
  const withPpm = projects.filter((project) => projectPriceM2(project));
  const lowest = [...withPpm].sort((left, right) => projectPriceM2(left) - projectPriceM2(right))[0];
  const highestArea = [...projects].filter((project) => projectArea(project)).sort((left, right) => projectArea(right) - projectArea(left))[0];
  const premium = [...withPpm].sort((left, right) => projectPriceM2(right) - projectPriceM2(left))[0];

  if (lowest && premium && lowest.id !== premium.id) {
    return {
      title: `${lowest.project_name} tiene mejor precio por m2`,
      body: `${premium.project_name} queda en rango más alto. La ventaja competitiva debe construirse sobre ${highestArea?.id === premium.id ? "mayor área y atributos visibles" : "ubicación, entrega y valor percibido"}.`,
    };
  }
  if (highestArea) {
    return {
      title: `${highestArea.project_name} ofrece mayor área`,
      body: "Cuando el precio por m2 es similar, conviene destacar metraje, distribución y beneficios concretos.",
    };
  }
  return {
    title: "Comparación en rango similar",
    body: "Existe presión de precio en este segmento; conviene reforzar valor percibido y argumentos de diferenciación.",
  };
}

export function competitionLevel(benchmark) {
  if (benchmark.projects >= 60 || benchmark.agencies >= 28) return { level: "Alta", tone: "warning" };
  if (benchmark.projects >= 20 || benchmark.agencies >= 10) return { level: "Media", tone: "neutral" };
  return { level: "Baja", tone: "success" };
}

export function competitionClass(benchmark) {
  return competitionLevel(benchmark).tone;
}

export function renderSignals(project) {
  const signals = [
    projectPriceM2(project) ? "Precio visible" : "Precio no visible",
    projectArea(project) ? "Metraje visible" : "Metraje no visible",
    toArray(project.amenities).length ? "Atributos visibles" : "Atributos no visibles",
    project.delivery_year ? "Entrega visible" : "Entrega no visible",
  ];
  return `<div class="chip-list">${signals.map(chip).join("")}</div>`;
}

export function kpiCard(label, value, detail) {
  return `
    <article class="kpi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "No disponible"))}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

export function miniMetric(label, value) {
  return `
    <div class="mini-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "No disponible"))}</strong>
    </div>
  `;
}

export function projectListCard(project, selected) {
  const reading = competitiveReading(project, state.strategy, buildBenchmark(getProjectsByDistrict(project.district), project.district));
  return `
    <button class="project-card ${selected ? "selected" : ""}" type="button" data-select-project="${escapeAttr(project.id)}">
      <div class="project-card-head">
        <div>
          <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
          <span>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</span>
        </div>
        <span class="tag neutral">${escapeHtml(project.district || "Sin distrito")}</span>
      </div>
      <div class="project-metrics">
        ${miniMetric("Precio", money(project.list_price_avg))}
        ${miniMetric("S/ m2", priceM2(projectPriceM2(project)))}
        ${miniMetric("Área", areaLabel(projectArea(project)))}
        ${miniMetric("Unid.", formatNumber(numberOrZero(project.unit_count)))}
      </div>
      <p>${escapeHtml(reading)}</p>
      <div class="card-badges">
        <span>${escapeHtml(project.project_phase || "Fase no disponible")}</span>
        <span>${escapeHtml(bedroomsLabel(project))}</span>
        <span>${escapeHtml(deliveryLabel(project))}</span>
      </div>
    </button>
  `;
}

export function competitorCard(project, variant = "") {
  const reading = competitiveReading(project, state.strategy, buildBenchmark(getProjectsByDistrict(project.district), project.district));
  return `
    <article class="competitor-card ${escapeAttr(variant)}">
      <div>
        <span>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</span>
        <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
      </div>
      <div class="competitor-metrics">
        <span>${priceM2(projectPriceM2(project))}</span>
        <span>${areaLabel(projectArea(project))}</span>
      </div>
      <p>${escapeHtml(reading)}</p>
    </article>
  `;
}

export function compareCandidate(project, checked) {
  const disabled = !checked && state.compareProjectIds.length >= 3;
  return `
    <label class="compare-candidate ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}">
      <input type="checkbox" data-compare-toggle value="${escapeAttr(project.id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span>
        <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
        <small>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")} · ${escapeHtml(project.district || "Sin distrito")}</small>
      </span>
      <em>${priceM2(projectPriceM2(project))}</em>
    </label>
  `;
}

export function compareProjectCard(project) {
  return `
    <article class="compare-project-card">
      <span class="tag neutral">${escapeHtml(project.district || "Sin distrito")}</span>
      <h3>${escapeHtml(project.project_name || "Proyecto sin nombre")}</h3>
      <p>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</p>
      <div class="compare-facts">
        ${miniMetric("Precio", money(project.list_price_avg))}
        ${miniMetric("Precio / m2", priceM2(projectPriceM2(project)))}
        ${miniMetric("Área", areaLabel(projectArea(project)))}
        ${miniMetric("Dormitorios", bedroomsLabel(project))}
        ${miniMetric("Fase", project.project_phase || "No registrado")}
        ${miniMetric("Entrega", deliveryLabel(project))}
        ${miniMetric("Unidades", formatNumber(numberOrZero(project.unit_count)))}
      </div>
      <div class="chip-list">${toArray(project.amenities).slice(0, 5).map(chip).join("") || chip("Atributos no disponibles")}</div>
      <div class="chip-list muted-chips">${toArray(project.financing_banks).slice(0, 3).map(chip).join("") || chip("Financiamiento no registrado")}</div>
    </article>
  `;
}

export function comparisonMetric(label, projects, accessor, formatter, higherIsBetter) {
  const values = projects.map((project) => ({ project, value: accessor(project) })).filter((item) => isPositive(item.value));
  const max = Math.max(...values.map((item) => item.value), 1);
  const bestValue = higherIsBetter ? Math.max(...values.map((item) => item.value), 0) : Math.min(...values.map((item) => item.value), Infinity);
  return `
    <div class="comparison-row">
      <strong>${escapeHtml(label)}</strong>
      <div class="comparison-track-list">
        ${projects.map((project) => {
          const value = accessor(project);
          const width = isPositive(value) ? clamp((value / max) * 100, 4, 100) : 4;
          const best = isPositive(value) && value === bestValue;
          return `
            <div class="comparison-track">
              <span>${escapeHtml(project.project_name || "Proyecto")}</span>
              <div class="bar-track"><i style="width:${width}%"></i></div>
              <em class="${best ? "best" : ""}">${escapeHtml(isPositive(value) ? formatter(value) : "No disponible")}</em>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function signalCard(signal) {
  return `
    <article class="signal-card ${escapeAttr(signal.tone)}">
      <span>${escapeHtml(signal.title)}</span>
      <p>${escapeHtml(signal.body)}</p>
    </article>
  `;
}

export function checkItem(question, answer, tone) {
  return `
    <article class="check-item ${escapeAttr(tone)}">
      <span>${escapeHtml(question)}</span>
      <p>${escapeHtml(answer)}</p>
    </article>
  `;
}

export function barRow(label, value, max, meta, trailing, dataAttribute) {
  const width = clamp((Number(value) / Math.max(Number(max), 1)) * 100, 3, 100);
  const content = `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(meta ?? "")}</span>
    </div>
    <div class="bar-track"><i style="width:${width}%"></i></div>
    <em>${escapeHtml(String(trailing ?? value))}</em>
  `;
  if (dataAttribute) {
    return `<button class="bar-row as-button" type="button" ${dataAttribute}="${escapeAttr(label)}">${content}</button>`;
  }
  return `<div class="bar-row">${content}</div>`;
}

export function summaryBar(label, value, total) {
  const width = clamp((Number(value) / Math.max(Number(total), 1)) * 100, 4, 100);
  return `
    <div class="summary-bar">
      <div><span>${escapeHtml(label)}</span><strong>${formatNumber(value)}</strong></div>
      <div class="bar-track"><i style="width:${width}%"></i></div>
    </div>
  `;
}

export function districtTile(row, maxProjects) {
  const intensity = clamp(row.projects / Math.max(maxProjects, 1), 0.18, 1);
  return `
    <button class="district-tile" type="button" data-district-chip="${escapeAttr(row.district)}" style="--intensity:${intensity}">
      <strong>${escapeHtml(row.district)}</strong>
      <span>${formatNumber(row.projects)} proyectos</span>
      <em>${priceM2(row.medianPriceM2)}</em>
    </button>
  `;
}

export function rangeGauge(benchmark, targetPriceM2) {
  if (!benchmark.medianPriceM2) {
    return emptyState("Información insuficiente", "Revisa proyectos comparables del distrito.");
  }
  const low = benchmark.lowPriceM2 || benchmark.medianPriceM2 * 0.9;
  const high = benchmark.highPriceM2 || benchmark.medianPriceM2 * 1.1;
  const min = Math.max(1, low * 0.82);
  const max = high * 1.18;
  const lowPos = clamp(((low - min) / (max - min)) * 100, 0, 100);
  const highPos = clamp(((high - min) / (max - min)) * 100, 0, 100);
  const medianPos = clamp(((benchmark.medianPriceM2 - min) / (max - min)) * 100, 0, 100);
  const targetPos = targetPriceM2 ? clamp(((targetPriceM2 - min) / (max - min)) * 100, 0, 100) : null;

  return `
    <div class="range-gauge">
      <div class="range-track">
        <span class="range-band" style="left:${lowPos}%; width:${Math.max(4, highPos - lowPos)}%"></span>
        <span class="range-median" style="left:${medianPos}%"></span>
        ${targetPos !== null ? `<span class="range-target" style="left:${targetPos}%"><b>Objetivo</b></span>` : ""}
      </div>
      <div class="range-labels">
        <span>${priceM2(low)}</span>
        <span>Mediana ${priceM2(benchmark.medianPriceM2)}</span>
        <span>${priceM2(high)}</span>
      </div>
    </div>
  `;
}

export function scatterPlot(projects, strategy) {
  const points = projects.map((project) => ({
    project,
    area: projectArea(project),
    ppm: projectPriceM2(project),
  })).filter((point) => isPositive(point.area) && isPositive(point.ppm));

  if (points.length < 3) {
    return emptyState("Información insuficiente para este cálculo", "Revisa proyectos comparables del distrito.");
  }

  const width = 1080;
  const height = 480;
  const plot = { left: 86, right: 34, top: 38, bottom: 66 };
  const areas = points.map((point) => point.area);
  const prices = points.map((point) => point.ppm);
  const niceStep = (range, intervals = 5) => {
    const rough = Math.max(range, 1) / intervals;
    const power = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / power;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    return factor * power;
  };
  const axis = (values, intervals = 5) => {
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const step = niceStep(rawMax - rawMin, intervals);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step || min + step;
    const ticks = [];
    for (let value = min; value <= max + step * 0.01 && ticks.length < 10; value += step) ticks.push(value);
    return { min, max, step, ticks };
  };
  const areaAxis = axis(areas, 6);
  const priceAxis = axis(prices, 6);
  const medianArea = percentile(areas, 50);
  const medianPrice = percentile(prices, 50);
  const targetArea = positiveNumber(strategy.area);
  const targetPriceM2 = getTargetPriceM2(strategy);
  const x = (value) => plot.left + ((value - areaAxis.min) / Math.max(areaAxis.max - areaAxis.min, 1)) * (width - plot.left - plot.right);
  const y = (value) => height - plot.bottom - ((value - priceAxis.min) / Math.max(priceAxis.max - priceAxis.min, 1)) * (height - plot.top - plot.bottom);
  const compactText = (value, length = 34) => {
    const text = String(value || "No informado");
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  };
  const axisPrice = (value) => value >= 1000 ? `S/ ${formatNumber(value / 1000, value % 1000 ? 1 : 0)}k` : `S/ ${formatNumber(value)}`;

  return `
    <div class="scatter-wrap">
      <div class="scatter-meta">
        <div class="scatter-legend" aria-label="Leyenda del mapa">
          <span><i class="legend-dot below"></i>En o bajo la mediana</span>
          <span><i class="legend-dot above"></i>Sobre la mediana</span>
          <span><i class="legend-bubble"></i>Tamaño = unidades publicadas</span>
          ${targetArea && targetPriceM2 ? '<span><i class="legend-target"></i>Escenario objetivo</span>' : ""}
        </div>
        <p><strong>Referencia:</strong> mediana ${priceM2(medianPrice)} y ${formatNumber(medianArea, 1)} m².</p>
      </div>
      <div class="scatter-canvas" tabindex="0" aria-label="Área desplazable del mapa de posicionamiento">
      <svg class="scatter-plot" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="scatter-title scatter-description">
        <title id="scatter-title">Mapa de precio por metro cuadrado y área publicada</title>
        <desc id="scatter-description">Cada círculo representa un proyecto comparable. El tamaño indica unidades publicadas y el color muestra su posición frente a la mediana de precio por metro cuadrado.</desc>
        ${priceAxis.ticks.map((value) => `
          <g class="axis-tick">
            <line x1="${plot.left}" y1="${y(value).toFixed(1)}" x2="${width - plot.right}" y2="${y(value).toFixed(1)}" class="grid-line"></line>
            <text x="${plot.left - 13}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end" class="tick-label">${axisPrice(value)}</text>
          </g>
        `).join("")}
        ${areaAxis.ticks.map((value) => `
          <g class="axis-tick">
            <line x1="${x(value).toFixed(1)}" y1="${plot.top}" x2="${x(value).toFixed(1)}" y2="${height - plot.bottom}" class="grid-line"></line>
            <text x="${x(value).toFixed(1)}" y="${height - plot.bottom + 25}" text-anchor="middle" class="tick-label">${formatNumber(value)}</text>
          </g>
        `).join("")}
        <line x1="${plot.left}" y1="${height - plot.bottom}" x2="${width - plot.right}" y2="${height - plot.bottom}" class="axis"></line>
        <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${height - plot.bottom}" class="axis"></line>
        <line x1="${plot.left}" y1="${y(medianPrice).toFixed(1)}" x2="${width - plot.right}" y2="${y(medianPrice).toFixed(1)}" class="median-line"></line>
        <line x1="${x(medianArea).toFixed(1)}" y1="${plot.top}" x2="${x(medianArea).toFixed(1)}" y2="${height - plot.bottom}" class="median-line"></line>
        <text x="${plot.left}" y="22" class="axis-label">Precio por m² (S/)</text>
        <text x="${width - plot.right}" y="${height - 12}" text-anchor="end" class="axis-label">Área publicada (m²)</text>
        <text x="${width - plot.right - 6}" y="${(y(medianPrice) - 8).toFixed(1)}" text-anchor="end" class="median-label">Mediana de precio</text>
        <text x="${(x(medianArea) + 8).toFixed(1)}" y="${plot.top + 15}" class="median-label">Mediana de área</text>
        ${points.map((point) => {
          const cx = x(point.area);
          const cy = y(point.ppm);
          const radius = clamp(Math.sqrt(numberOrZero(point.project.unit_count)) + 4, 5, 13);
          const tooltipWidth = 260;
          const tooltipHeight = 88;
          const tooltipX = cx > width - plot.right - tooltipWidth - 18 ? cx - tooltipWidth - 14 : cx + 14;
          const tooltipY = cy < plot.top + tooltipHeight + 14 ? cy + 14 : cy - tooltipHeight - 14;
          const units = numberOrZero(point.project.unit_count);
          const ariaLabel = `${point.project.project_name || "Proyecto no informado"}, ${priceM2(point.ppm)}, ${formatNumber(point.area, 1)} metros cuadrados, ${units ? `${formatNumber(units)} unidades publicadas` : "unidades no informadas"}, ${point.project.agency_name || "inmobiliaria no informada"}`;
          return `
            <g class="scatter-node ${point.ppm > medianPrice ? "above" : "below"}">
              <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(radius + 7, 16).toFixed(1)}" class="scatter-hit" tabindex="0" focusable="true" role="img" aria-label="${escapeAttr(ariaLabel)}"></circle>
              <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" class="scatter-point"></circle>
              <g class="scatter-tooltip" transform="translate(${tooltipX.toFixed(1)} ${tooltipY.toFixed(1)})">
                <rect width="${tooltipWidth}" height="${tooltipHeight}" rx="9"></rect>
                <text x="14" y="22" class="tooltip-title">${escapeHtml(compactText(point.project.project_name))}</text>
                <text x="14" y="45" class="tooltip-value">${priceM2(point.ppm)} · ${formatNumber(point.area, 1)} m² · ${units ? `${formatNumber(units)} unid.` : "Sin unidades"}</text>
                <text x="14" y="68" class="tooltip-meta">${escapeHtml(compactText(point.project.agency_name, 26))} · ${escapeHtml(point.project.district || "Sin distrito")}</text>
              </g>
            </g>
          `;
        }).join("")}
        ${targetArea && targetPriceM2 ? `
          <circle cx="${x(targetArea).toFixed(1)}" cy="${y(targetPriceM2).toFixed(1)}" r="9" class="target-point"></circle>
          <text x="${clamp(x(targetArea) + 14, plot.left, width - 120).toFixed(1)}" y="${clamp(y(targetPriceM2) - 12, 24, height - plot.bottom).toFixed(1)}" class="target-label">Objetivo</text>
        ` : ""}
      </svg>
      </div>
      <p class="scatter-help">Pasa el puntero o usa Tab para consultar cada proyecto. Las líneas discontinuas marcan las medianas del escenario.</p>
    </div>
  `;
}

export function ensureSelectedProject(projects) {
  const selectable = toArray(projects).filter(isScenarioDisplayProject);
  const current = selectable.find(
    (project) => project.id === legacyProjectId(state.selectedProjectId),
  );
  if (current) return current;
  const next = selectable[0] ?? getComparableProjects()[0] ?? null;
  if (next) state.selectedProjectId = next.id;
  else state.selectedProjectId = null;
  return next;
}

export function getDistricts() {
  return unique(getProjects().map((project) => project.district)).sort((left, right) => left.localeCompare(right));
}

export function getTypologies() {
  return unique(getProjects().map((project) => project.typology)).sort((left, right) => left.localeCompare(right));
}

export function getPhases() {
  return unique(getProjects().map((project) => project.project_phase)).sort((left, right) => left.localeCompare(right));
}

export function getDeliveryYears() {
  return unique(getProjects().map((project) => project.delivery_year).filter(Boolean).map(String)).sort();
}

export function getBedroomOptions() {
  const max = Math.max(...getProjects().map((project) => numberOrZero(project.bedrooms_max)), 0);
  return Array.from({ length: Math.min(max, 6) }, (_, index) => String(index + 1));
}

export function defaultDistrict() {
  return (
    state.selectedDistrict ||
    districtBenchmarks()[0]?.district ||
    getProjects()[0]?.district ||
    ""
  );
}


export function metadataDate() {
  return state.data?.metadata?.cutoff_at || state.data?.metadata?.source_snapshot?.max_captured_at || state.data?.metadata?.generated_at;
}

export function extractDistrictFromText(text) {
  return getDistricts().find((district) => text.includes(normalizeSearch(district)));
}

export function projectHasBedroom(project, bedroom) {
  if (!Number.isFinite(bedroom)) return true;
  const min = numberOrZero(project.bedrooms_min);
  const max = numberOrZero(project.bedrooms_max);
  if (min && max) return bedroom >= min && bedroom <= max;
  return normalizeSearch(project.bedrooms).includes(String(bedroom));
}

export function projectPriceM2(project) {
  return positiveNumber(project.price_per_m2_list) || (positiveNumber(project.list_price_avg) && projectArea(project) ? positiveNumber(project.list_price_avg) / projectArea(project) : null);
}

export function projectArea(project) {
  return positiveNumber(project.total_area) || positiveNumber(project.total_area_min) || positiveNumber(project.total_area_max);
}

export function getTargetPriceM2(strategy) {
  const price = positiveNumber(strategy.targetPrice);
  const area = positiveNumber(strategy.area);
  return price && area ? price / area : null;
}

export function countBy(rows, mapper) {
  const map = new Map();
  rows.forEach((row) => {
    const key = mapper(row) || "No registrado";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function sum(rows, mapper) {
  return rows.reduce((total, row) => total + numberOrZero(mapper(row)), 0);
}

export function average(values) {
  const clean = values.filter(isPositive);
  return clean.length ? clean.reduce((total, value) => total + value, 0) / clean.length : null;
}

export function median(values) {
  return percentile(values, 50);
}

export function percentile(values, pct) {
  const clean = values.filter(isPositive).sort((left, right) => left - right);
  if (!clean.length) return null;
  const index = (clean.length - 1) * (pct / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (index - lower);
}

export function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function isPositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function sortNumeric(left, right) {
  const leftValid = isPositive(left);
  const rightValid = isPositive(right);
  if (!leftValid && !rightValid) return 0;
  if (!leftValid) return 1;
  if (!rightValid) return -1;
  return Number(left) - Number(right);
}

export function firstAvailable(values) {
  return values.find((value) => String(value ?? "").trim());
}

export function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== ""))];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function shortText(value, maxLength) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

export function safeUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function optionList(values, selected, labeler = (value) => value) {
  return values.map((value) => `<option value="${escapeAttr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(labeler(value))}</option>`).join("");
}

export function sortLabel(value) {
  const labels = {
    direct: "Competencia directa",
    price_m2: "Precio por m2 menor",
    price_total: "Precio total menor",
    area: "Mayor área",
    bedrooms: "Mas dormitorios",
    units: "Mas unidades publicadas",
    delivery: "Entrega más cercana",
    closest_price: "Cercania al precio objetivo",
    competition: "Nivel de competencia",
  };
  return labels[value] ?? value;
}

export function bedroomsLabel(project) {
  if (project.bedrooms) return `${project.bedrooms} dorm.`;
  const min = positiveNumber(project.bedrooms_min);
  const max = positiveNumber(project.bedrooms_max);
  if (min && max && min !== max) return `${formatNumber(min)} a ${formatNumber(max)} dorm.`;
  if (min || max) return `${formatNumber(min || max)} dorm.`;
  return "No registrado";
}

export function deliveryLabel(project) {
  if (project.delivery_date) return formatDate(project.delivery_date);
  if (project.delivery_year) return String(project.delivery_year);
  return "No registrado para este proyecto";
}

export function areaLabel(value) {
  return isPositive(value) ? `${formatNumber(value, 1)} m2` : "No disponible";
}

export function priceM2(value) {
  return isPositive(value) ? `S/ ${formatNumber(value, 0)} / m2` : "No disponible";
}

export function money(value) {
  return isPositive(value) ? `S/ ${formatNumber(value, 0)}` : "No disponible";
}

export function formatRange(low, high) {
  if (!isPositive(low) || !isPositive(high)) return "No disponible";
  return `S/ ${formatNumber(low, 0)} - ${formatNumber(high, 0)} / m2`;
}

export function formatNumber(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(number);
}

export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0%";
  return new Intl.NumberFormat("es-PE", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}

export function emptyState(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

export function loadingTemplate() {
  return `
    <div class="loading-screen">
      <div>
        <strong>Preparando Viva Inteligencia</strong>
        <span>Cargando lectura comercial.</span>
      </div>
    </div>
  `;
}

export function errorTemplate(error) {
  return `
    <div class="loading-screen">
      <div class="error-box">
        <strong>No se pudo iniciar la plataforma</strong>
        <span>${escapeHtml(error.message)}</span>
        <button class="primary-button" type="button" data-app-retry>Reintentar</button>
      </div>
    </div>
  `;
}

export function chip(value) {
  return `<span class="chip">${escapeHtml(String(value || "No disponible"))}</span>`;
}


export function findProjectById(id) {
  const legacyId = legacyProjectId(id);
  const canonicalId = canonicalProjectId(id);
  const observedId = observedProjectId(id);
  return getProjects().find(
    (project) =>
      (legacyId !== null && String(project.id) === legacyId) ||
      canonicalProjectId(project) === canonicalId ||
      observedProjectId(project) === observedId,
  );
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
