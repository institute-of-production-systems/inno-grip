// Add or edit the same translation keys in both language objects to localize interface text.
const translations = {
  en: {
    toggleNavigation: "Toggle navigation",
    home: "Home",
    see: "See",
    overview: "Overview",
    resultBrowser: "Result browser",
    plan: "Plan",
    grasp: "Grasp",
    integrate: "Integrate",
    papers: "Papers",
    code: "Code",
    about: "About",
    problem: "Project overview",
    homeParagraph: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sed felis vitae justo varius tincidunt. This page is a starting point for introducing the INNO-GRIP project and its research.",
    methods: "Methods and project work",
    methodsParagraph: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Explore the project sections to learn about perception, planning, grasping and integration.",
    overviewTitle: "See · Overview",
    overviewParagraph: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. This page will introduce the perception work and the data collected for the project.",
    arrangementIntro: "We have tested different arrangement complexities - select one to inspect the results:",
    single: "Single",
    multiple: "Multiple",
    stacked: "Stacked",
    overallTitle: "Overall results (average over",
    metric: "Metric",
    chamfer: "Chamfer distance",
    cvpr1: "CVPR@1.0mm",
    cvpr05: "CVPR@0.5mm",
    sample: "Sample",
    surface: "Surface",
    size: "Size",
    shape: "Shape",
    complexity: "Complexity",
    orientation: "Orientation",
    algorithm: "Algorithm",
    screenshot: "Screenshot",
    noSamples: "No samples were found in this workbook.",
    selectedSample: "Selected sample",
    pagePlaceholder: "Content for this section will be added soon.",
    notFound: "Page not found"
  },
  de: {
    toggleNavigation: "Navigation umschalten",
    home: "Home",
    see: "Sehen",
    overview: "Überblick",
    resultBrowser: "Ergebnisbrowser",
    plan: "Planen",
    grasp: "Greifen",
    integrate: "Integrieren",
    papers: "Publikationen",
    code: "Code",
    about: "Über uns",
    problem: "Projektüberblick",
    homeParagraph: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sed felis vitae justo varius tincidunt. Diese Seite ist ein Ausgangspunkt, um das Projekt INNO-GRIP und seine Forschung vorzustellen.",
    methods: "Methoden und Projektarbeit",
    methodsParagraph: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Entdecken Sie die Projektbereiche zu Wahrnehmung, Planung, Greifen und Integration.",
    overviewTitle: "Sehen · Überblick",
    overviewParagraph: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Diese Seite wird die Wahrnehmungsarbeit und die für das Projekt erhobenen Daten vorstellen.",
    arrangementIntro: "Wir haben verschiedene Komplexitäten der Anordnung getestet – wählen Sie eine aus, um die Ergebnisse anzusehen:",
    single: "Einzelteil",
    multiple: "Mehrere",
    stacked: "Gestapelt",
    overallTitle: "Gesamtergebnisse (Durchschnitt über",
    metric: "Metrik",
    chamfer: "Chamfer-Distanz",
    cvpr1: "CVPR@1,0 mm",
    cvpr05: "CVPR@0,5 mm",
    sample: "Probe",
    surface: "Oberfläche",
    size: "Größe",
    shape: "Form",
    complexity: "Komplexität",
    orientation: "Orientierung",
    algorithm: "Algorithmus",
    screenshot: "Screenshot",
    noSamples: "In dieser Arbeitsmappe wurden keine Proben gefunden.",
    selectedSample: "Ausgewählte Probe",
    pagePlaceholder: "Inhalte für diesen Bereich werden in Kürze ergänzt.",
    notFound: "Seite nicht gefunden"
  }
};

const pageContent = document.querySelector("#page-content");
const heroCopy = document.querySelector("#hero-copy");
const navLinks = document.querySelector("#primary-navigation");
const languageButton = document.querySelector(".language-toggle");
const arrangementNames = ["single", "multiple", "stacked"];
let language = "en";
let resultData;
let resultDataError;
let currentArrangement = "single";
let selectedSampleId = null;

const pageNames = {
  plan: "Plan",
  grasp: "Grasp",
  integrate: "Integrate",
  papers: "Papers",
  code: "Code",
  about: "About"
};

function text(key) {
  return translations[language][key];
}

function renderHero(title, subtitle = "", eyebrow = "") {
  heroCopy.innerHTML = `
    ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ""}
  `;
}

function renderHome() {
  renderHero(
    "INNO-GRIP",
    "Intelligenter Kleinteilegreifer unter Verwendung von Photogrammetrie und KI-Modellen in der automatisierten Montage"
  );
  pageContent.innerHTML = `
    <article class="article-copy">
      <p>${text("homeParagraph")}</p>
      <h2>${text("problem")}</h2>
      <p>${text("methodsParagraph")}</p>
      <img class="home-photo" src="imgs/web/260212_4.jpeg" alt="Robotic assembly research in the INNO-GRIP laboratory" loading="lazy">
    </article>
  `;
}

function renderOverview() {
  renderHero(text("overviewTitle"), "", text("see"));
  pageContent.innerHTML = `<article class="article-copy"><p>${text("overviewParagraph")}</p></article>`;
}

function renderPlaceholderPage(route) {
  const title = pageNames[route];
  if (!title) {
    renderHero(text("notFound"));
    pageContent.innerHTML = `<p>${text("notFound")}</p>`;
    return;
  }
  renderHero(title, "", "INNO-GRIP");
  pageContent.innerHTML = `<article class="article-copy"><p>${text("pagePlaceholder")}</p></article>`;
}

function formatNumber(value, decimals = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function formatPercentage(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function averageMetric(samples, algorithm, metric) {
  const values = samples
    .map((sample) => sample.metrics?.[algorithm]?.[metric])
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderOverallTable(samples) {
  const rows = [
    { key: "chamfer", label: text("chamfer"), format: formatNumber },
    { key: "cvpr1", label: text("cvpr1"), format: formatPercentage },
    { key: "cvpr05", label: text("cvpr05"), format: formatPercentage }
  ];
  return `
    <div class="table-scroll">
      <table class="overall-table">
        <thead><tr><th scope="col">${text("metric")}</th><th scope="col">DA3</th><th scope="col">VGGT-Omega</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <th scope="row">${row.label}</th>
              <td>${row.format(averageMetric(samples, "da3", row.key))}</td>
              <td>${row.format(averageMetric(samples, "vggt", row.key))}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSampleTable(samples) {
  if (!samples.length) return `<p class="loading-message">${text("noSamples")}</p>`;
  const headers = [
    ["sample", "sample"],
    ["surface", "surface"],
    ["size", "size"],
    ["shape", "shape"],
    ["complexity", "complexity"],
    ["orientation", "orientation"]
  ];
  return `
    <div class="table-scroll sample-scroll">
      <table class="sample-table">
        <thead><tr>${headers.map(([, key]) => `<th scope="col">${text(key)}</th>`).join("")}</tr></thead>
        <tbody>
          ${samples.map((sample, index) => `
            <tr tabindex="0" data-sample-id="${index}" class="${index === selectedSampleId ? "is-selected" : ""}" aria-selected="${index === selectedSampleId}">
              <td>${escapeHtml(sample.sample ?? "")}</td>
              <td>${escapeHtml(sample.surface ?? "")}</td>
              <td>${escapeHtml(sample.size ?? "")}</td>
              <td>${escapeHtml(sample.shape ?? "")}</td>
              <td>${escapeHtml(sample.complexity ?? "")}</td>
              <td>${escapeHtml(sample.orientation ?? "—")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderSampleDetails(sample) {
  const algorithms = [
    { key: "da3", label: "DA3", imageName: "da3" },
    { key: "vggt", label: "VGGT-Omega", imageName: "vggt-omega" }
  ];
  const screenshotCells = algorithms.map((algorithm) => {
    const sampleFile = `${sample.sample}_${algorithm.imageName}.png`;
    const encodedFile = encodeURIComponent(sampleFile);
    const screenshotExists = resultData.screenshots?.[currentArrangement]?.includes(sampleFile);
    const imagePath = screenshotExists
      ? `imgs/3dr_display/${currentArrangement}/${encodedFile}`
      : `imgs/3dr_display/${currentArrangement}/placeholder_${algorithm.imageName}.png`;
    const placeholderPath = `imgs/3dr_display/${currentArrangement}/placeholder_${algorithm.imageName}.png`;
    return `<td class="screenshot-cell"><img src="${imagePath}" data-placeholder="${placeholderPath}" alt="${algorithm.label} reconstruction screenshot for ${escapeHtml(sample.sample)}" loading="lazy"></td>`;
  }).join("");
  const metricRows = [
    { key: "chamfer", label: text("chamfer"), format: formatNumber },
    { key: "cvpr1", label: text("cvpr1"), format: formatPercentage },
    { key: "cvpr05", label: text("cvpr05"), format: formatPercentage }
  ];
  return `
    <table class="detail-table">
      <thead><tr><th scope="col"></th>${algorithms.map((algorithm) => `<th scope="col">${algorithm.label}</th>`).join("")}</tr></thead>
      <tbody>
        <tr><th scope="row">${text("algorithm")}</th>${algorithms.map((algorithm) => `<td>${algorithm.label}</td>`).join("")}</tr>
        <tr><th scope="row">${text("screenshot")}</th>${screenshotCells}</tr>
        ${metricRows.map((metric) => `
          <tr>
            <th scope="row">${metric.label}</th>
            ${algorithms.map((algorithm) => `<td>${metric.format(sample.metrics?.[algorithm.key]?.[metric.key])}</td>`).join("")}
          </tr>`).join("")}
      </tbody>
    </table>
    <p class="sample-caption">${text("selectedSample")}: <strong>${escapeHtml(sample.sample ?? "")}</strong></p>
  `;
}

function renderResults() {
  renderHero(text("resultBrowser"), "", text("see"));
  if (resultDataError) {
    pageContent.innerHTML = `<p class="error-message">${escapeHtml(resultDataError)}</p>`;
    return;
  }
  if (!resultData) {
    pageContent.innerHTML = `<p class="loading-message">Loading result data…</p>`;
    return;
  }

  const samples = resultData[currentArrangement] ?? [];
  if (selectedSampleId === null || selectedSampleId >= samples.length) selectedSampleId = 0;
  const buttons = arrangementNames.map((name) => `
    <button class="arrangement-button" type="button" data-arrangement="${name}" aria-pressed="${name === currentArrangement}">
      ${text(name)}
    </button>`).join("");
  const selectedSample = samples[selectedSampleId];

  pageContent.innerHTML = `
    <section class="results-page" aria-labelledby="results-intro">
      <p class="result-intro" id="results-intro">${text("arrangementIntro")}</p>
      <div class="arrangement-switcher" role="group" aria-label="${escapeHtml(text("arrangementIntro"))}">${buttons}</div>
      <h2 class="content-heading">${text("overallTitle")} <a href="https://zenodo.org/records/22771386" target="_blank" rel="noopener noreferrer">TIP3D_V2</a>):</h2>
      ${renderOverallTable(samples)}
      <hr class="results-divider">
      <div class="results-workspace">
        <section class="sample-panel" aria-labelledby="sample-list-heading">
          <h3 class="panel-heading" id="sample-list-heading">${text("sample")}</h3>
          ${samples.length ? renderSampleTable(samples) : `<p class="loading-message">${text("noSamples")}</p>`}
        </section>
        <section class="detail-panel" aria-label="${text("selectedSample")}">
          <h3 class="panel-heading">${selectedSample ? escapeHtml(selectedSample.sample) : text("noSamples")}</h3>
          ${selectedSample ? renderSampleDetails(selectedSample) : ""}
        </section>
      </div>
    </section>
  `;
  pageContent.querySelectorAll(".screenshot-cell img").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.dataset.usingPlaceholder === "true") return;
      image.dataset.usingPlaceholder = "true";
      image.src = image.dataset.placeholder;
    }, { once: true });
  });
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations[language][key]) element.textContent = text(key);
  });
  document.querySelectorAll("[data-language-option]").forEach((element) => {
    element.classList.toggle("is-current", element.dataset.languageOption === language);
  });
  renderRoute();
}

function renderRoute() {
  const route = location.hash.replace(/^#\/?/, "") || "home";
  document.querySelectorAll("[data-route]").forEach((link) => {
    const isCurrent = link.dataset.route === route;
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const seeDropdown = document.querySelector(".nav-dropdown");
  seeDropdown.classList.toggle("is-active", route.startsWith("see/"));

  if (route === "home") renderHome();
  else if (route === "see/overview") renderOverview();
  else if (route === "see/results") renderResults();
  else renderPlaceholderPage(route);
  navLinks.classList.remove("is-open");
  document.querySelector(".nav-toggle").setAttribute("aria-expanded", "false");
}

async function loadResultData() {
  try {
    const response = await fetch("data/3dr/results.json");
    if (!response.ok) throw new Error(`Could not load result data (HTTP ${response.status}).`);
    resultData = await response.json();
  } catch (error) {
    resultDataError = `Unable to load the results data: ${error.message}`;
  }
  if (location.hash.replace(/^#\/?/, "") === "see/results") renderResults();
}

document.querySelector(".nav-toggle").addEventListener("click", (event) => {
  const isExpanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!isExpanded));
  navLinks.classList.toggle("is-open", !isExpanded);
});

document.querySelector(".nav-dropdown-toggle").addEventListener("click", (event) => {
  const isExpanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!isExpanded));
  event.currentTarget.closest(".nav-dropdown").classList.toggle("is-open", !isExpanded);
});

languageButton.addEventListener("click", () => {
  language = language === "en" ? "de" : "en";
  applyLanguage();
});

window.addEventListener("hashchange", renderRoute);

pageContent.addEventListener("click", (event) => {
  const arrangementButton = event.target.closest("[data-arrangement]");
  if (arrangementButton) {
    currentArrangement = arrangementButton.dataset.arrangement;
    selectedSampleId = 0;
    renderResults();
    return;
  }
  const sampleRow = event.target.closest("[data-sample-id]");
  if (sampleRow) {
    selectedSampleId = Number(sampleRow.dataset.sampleId);
    renderResults();
  }
});

pageContent.addEventListener("mouseover", (event) => {
  const sampleRow = event.target.closest("[data-sample-id]");
  if (!sampleRow || !resultData || location.hash.replace(/^#\/?/, "") !== "see/results") return;
  const nextId = Number(sampleRow.dataset.sampleId);
  if (nextId === selectedSampleId) return;
  selectedSampleId = nextId;
  renderResults();
});

pageContent.addEventListener("focusin", (event) => {
  const sampleRow = event.target.closest("[data-sample-id]");
  if (!sampleRow || !resultData) return;
  selectedSampleId = Number(sampleRow.dataset.sampleId);
  renderResults();
});

applyLanguage();
loadResultData();
