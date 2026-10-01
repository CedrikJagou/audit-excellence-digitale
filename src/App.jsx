import { useEffect, useState } from "react";
import axaLogo from "./assets/logo AXA White.png";
import "./App.css";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const EXCLUDED_FROM_FINAL_SCORE = new Set([
  "Accessibilité",
  "Éco conception",
]);

const API_BASE_URL = "http://127.0.0.1:8000";

const CHART_COLORS = [
  "#00008F", // bleu AXA
  "#4976BA",
  "#C91432",
  "#F07662",
  "#5B8DEF",
  "#7A5AF8",
  "#00A3A1",
  "#4CAF50",
  "#F2C94C",
  "#F2994A",
  "#9B51E0",
  "#56CCF2",
  "#6FCF97",
];

function App() {
  const [audit, setAudit] = useState(null);
  const [auditFileName, setAuditFileName] = useState("");
  const [auditView, setAuditView] = useState("Tous");
  const [activeTab, setActiveTab] = useState("Résultats");
  const [activePointByExpertise, setActivePointByExpertise] = useState({});
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [expertiseScope, setExpertiseScope] = useState("all");

  

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;

    setLoading(true);
    setError("");
    setSaveMessage("");

    const automaticName = file.name.replace(/\.xlsx$/i, "");
    const finalAuditName = auditFileName.trim() || automaticName;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("audit_name", finalAuditName);

    try {
      const response = await fetch(`${API_BASE_URL}/audits/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Erreur HTTP ${response.status} lors de l'upload.`);
        return;
      }

      if (!result.success) {
        setError(result.error || "Erreur lors du chargement du fichier.");
        return;
      }

      setAudit(result.audit);
      setAuditFileName(result.audit.audit_name || finalAuditName);
      setActiveTab("Résultats");
      setResponses({});
    } catch (err) {
      console.error("ERREUR UPLOAD", err);
      setError(`Impossible de charger le fichier Excel : ${err.message}`);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function isForbiddenAuditName(value) {
    const normalizedName = value
      .trim()
      .toLowerCase()
      .replace(/\.xlsx$/i, "")
      .replace(/\s+/g, " ");

    return (
      normalizedName === "" ||
      normalizedName === "grille" ||
      normalizedName === "grilles" ||
      normalizedName === "grille d'évaluation" ||
      normalizedName === "grille d'evaluation" ||
      normalizedName === "grille d'évaluation projet" ||
      normalizedName === "grille d'evaluation projet" ||
      normalizedName === "grille evaluation projet"
    );
  }

  async function saveResponses() {
  if (!audit?.audit_id) {
    setError("Impossible de sauvegarder : audit_id manquant.");
    return;
  }

  if (isForbiddenAuditName(auditFileName)) {
    setError(
      "Merci de nommer votre audit avant de le sauvegarder. Le nom ne peut pas être 'grille' ou 'grille d'évaluation projet'."
    );
    return;
  }

  setSaving(true);
  setError("");
  setSaveMessage("");

  try {
    const response = await fetch(`${API_BASE_URL}/audits/${audit.audit_id}/responses`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        responses,
        audit_name: auditFileName.trim(),
    }),
  }
);
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || `Erreur HTTP ${response.status} lors de la sauvegarde.`);
      return;
    }

    if (!result.success) {
      setError(result.error || "Erreur lors de la sauvegarde.");
      return;
    }

    setAudit(result.audit);
    setResponses({});
    setSaveMessage("Progression sauvegardée.");
    setError("");
  } catch (err) {
    console.error("DETAIL ERREUR SAUVEGARDE :", err);
    setError(`Erreur sauvegarde : ${err.message}`);
  } finally {
    setSaving(false);
  }
}

function downloadAuditExcel() {
  if (!audit?.audit_id) {
    setError("Impossible de télécharger : audit_id manquant.");
    return;
  }

  if (isForbiddenAuditName(auditFileName)) {
    setError(
      "Merci de renommer l'audit avant téléchargement. Le nom ne peut pas rester 'grille' ou 'grille d'évaluation projet'."
    );
    return;
  }

  window.open(`${API_BASE_URL}/audits/${audit.audit_id}/download/excel`, "_blank");
}

  function handleCriterionChange(criterionId, field, value) {
    setResponses((previous) => ({
      ...previous,
      [criterionId]: {
        ...previous[criterionId],
        [field]: value,
      },
    }));
  }

  const expertises = audit?.expertises || [];

  const filteredExpertises = expertises.filter((expertise) => {
    if (expertiseScope === "design") {
      return expertise.family === "Design";
    }
    
    if (expertiseScope === "tech") {
      return expertise.family === "Tech";
    }
    
    return true;
  });

  const activeExpertise = filteredExpertises.find(
    (expertise) => expertise.label === activeTab
  );

  function handleExpertiseScopeChange(scope) {
    setExpertiseScope(scope);
    setActiveTab("Résultats");
  }

  const activeExpertises = filteredExpertises.find(
    (expertise) => expertise.label === activeTab
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <img src={axaLogo} alt="AXA" className="sidebar-logo" />

        <label className="file-upload-title">
          Sélectionnez un fichier pour l'audit :
        </label>
        <label className="file-upload-cta" htmlFor="audit-file">
        Charger un fichier .xlsx
        </label>

        <input
          id="audit-file"
          className="file-upload-input"
          type="file"
          accept=".xlsx"
          onChange={handleFileUpload}
        />

        {audit && (
          <p className="sidebar-info sidebar-info--loaded">
            <strong>Fichier chargé : </strong> {audit.source_filename}
          </p>
        )}

      
        <label className="audit-name-label">
          Nom du fichier audité :
        </label>
        <input
          type="text"
          value={auditFileName}
          placeholder="Ex. Audit parcours devis auto"
          onChange={(e) => setAuditFileName(e.target.value)}
          />
    <div className="expertise-scope">
      <p className="expertise-scope-title">
        Expertises affichées
      </p>
    <div className="scope-options">
      <label className="scope-option">
        {/* bouton Tout existant */}
        <input
          type="radio"
          name="expertise-scope"
          value="all"
          checked={expertiseScope === "all"}
          onChange={(e) => handleExpertiseScopeChange(e.target.value)}
        />
        <span>Tout</span>
      </label>

      <label className="scope-option">
        {/* bouton Design existant */}
        <input
          type="radio"
          name="expertise-scope"
          value="design"
          checked={expertiseScope === "design"}
          onChange={(e) => handleExpertiseScopeChange(e.target.value)}
        />
        <span>Design</span>
      </label>

      <label className="scope-option">
        {/* bouton IT existant */}
        <input
          type="radio"
          name="expertise-scope"
          value="tech"
          checked={expertiseScope === "tech"}
          onChange={(e) => handleExpertiseScopeChange(e.target.value)}
        />
        <span>IT</span>
      </label>
    </div>
  </div>

        
  

        {audit && (
            <>
              <button 
                className="save-button" 
                onClick={saveResponses} 
                disabled={saving}
              >
                {saving ? "Sauvegarde..." : "Sauvegarder l'audit"}
              </button>

              <button 
                className="download-button" 
                onClick={downloadAuditExcel}
              >
                Télécharger le fichier .xlsx
              </button>
            </>
        )}


        {loading && <p className="sidebar-info">Chargement en cours...</p>}

        {saveMessage && audit?.stored_filename && (
          <p className="sidebar-info sidebar-info--saved">
            <strong>Fichier sauvegardé : </strong>{audit.stored_filename}
          </p>
        )}

      <div className="sidebar-footer">
        <p className="sidebar-credits">
          Crédits : Pôle Expression de Marque
          <br />Contact : cedrik.jagou@axa.fr
        </p>
      </div>
        </aside>

      <main className="main-content">
        <header className="page-header">
          <h1 className="app-main-title">
            Grille d’Excellence digitale
          </h1>
          <p>
          Cette interface a été conçue pour auditer tout <b>projet digital AXA BtoC : </b>nouveau ou existant.
          </p>
        </header>

        {!audit && !loading && (
          <div className="empty-state">
            <h2 className="empty-state-title">
              Comment réaliser un audit ?
            </h2>

            <p>
            Chargez un fichier Excel depuis la barre latérale. N'oubliez pas de sauvegarder l'audit en lui donnant le nom du projet (ex : eDécla MRH, QQ santé, etc.).
            </p>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {audit && (
          <>
            <nav className="tabs">
              <button
                className={activeTab === "Résultats" ? "active" : ""}
                onClick={() => setActiveTab("Résultats")}
              >
                Résultats
              </button>

              {filteredExpertises.map((expertise) => (
                <button
                  key={expertise.id}
                  className={activeTab === expertise.label ? "active" : ""}
                  onClick={() => {
                    setActiveTab(expertise.label);

                    const firstPoint = expertise.points_de_controle?.[0];
                    
                    if (firstPoint) {
                      setActivePointByExpertise((previous) => ({
                        ...previous,
                        [expertise.label]: firstPoint.label,
                      }));
                    }
                  }}
                >
                  {getDisplayExpertiseLabel(expertise.label)}
                </button>
              ))}
            </nav>

            {activeTab === "Résultats" && (
              <ResultsDashboard 
                audit={audit} 
                expertises={filteredExpertises} 
                expertiseScope={expertiseScope} />
            )}

            {activeExpertise && (
              <ExpertiseDetail
                expertise={activeExpertise}
                responses={responses}
                activePointByExpertise={activePointByExpertise}
                setActivePointByExpertise={setActivePointByExpertise}
                onCriterionChange={handleCriterionChange}
              />
            )}
          </>
        )}
        </main>
    </div>
    );
}

function getDisplayExpertiseLabel(label){
  if (label == "Sécurité") {
    return "Tech";
  }

  return label;
}

function formatCriterionText(text) {
  const [mainText, ...descriptionParts] = String(text || "").split(">");
  const description = descriptionParts.join(">").trim();

  return (
  <>
    <span className="criterion-main">
      {mainText.trim()}
    </span>
    
    {description && (
      <span className="criterion-description">
        {description}
      </span>
    )}
  </>
);
}

function getStatusBadge(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (
    normalizedStatus === "à auditer" ||
    normalizedStatus === "a auditer"
  ) {
    return null;
  }

  if (normalizedStatus === "conforme") {
    return {
      label: "Conforme",
      className: "criterion-status-badge criterion-status-badge--conforme",
    };
  }

  if (normalizedStatus === "non conforme") {
    return {
      label: "Non Conforme",
      className: "criterion-status-badge criterion-status-badge--non-conforme",
    };
  }

  if (normalizedStatus.includes("mauvaise pratique")) {
    return {
      label: "Mauvaise pratique",
      className: "criterion-status-badge criterion-status-badge--mauvaise-pratique",
    };
  }

  if (normalizedStatus === "non applicable") {
    return {
      label: "Non applicable",
      className: "criterion-status-badge criterion-status-badge--non-applicable",
    };
  }
  return null;
}

function ChartsSection({ audit, expertises }) {
  const chartData = expertises.map((expertise, index) => {
    const score = getExpertiseScore(audit, expertise.label);

    return {
      expertise: getDisplayExpertiseLabel(expertise.label),
      originalExpertise: expertise.label,
      score: score ?? 0,
      realScore: score,
      family: expertise.family,
      excluded: EXCLUDED_FROM_FINAL_SCORE.has(expertise.label),
      color: expertise.color || CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  const visibleData = chartData.filter((item) => item.realScore !== null);

  const hasManyExpertises = visibleData.length > 4;

  if (visibleData.length === 0) {
    return (
      <div className="chart-empty">
        Les graphiques apparaîtront dès qu’au moins une expertise aura des critères évalués.
      </div>
    );
  }
  

  return (
    <section 
      className="charts-grid"
      style={{
        gridTemplateColumns: hasManyExpertises ? "1fr" : "minmax(0, 1fr) linmax(0, 1fr)",
      }}
      >
      <div 
        className="chart-card chart-card--bar"
        style={{
          gridColumn : hasManyExpertises ? "1 / -1" : "auto",
        }}
      >
        <h2 className="publico-section-title">Score par expertise</h2>

        <ResponsiveContainer width="100%" height={hasManyExpertises ? 470 : 320}>
          <BarChart
            data={visibleData}
            barCategoryGap={hasManyExpertises ? "28%" : "18%"}
            barGap={8}
            margin={{
              top:35,
              right:20,
              left:0,
              bottom: 15,
            }}
          >
            <XAxis 
              dataKey="expertise" 
              interval={0}
              angle={hasManyExpertises ? -35 : -20}
              textAnchor="end"
              tick={{ 
                fontSize: 13,
                fontWeight: 700,
                fill: "#303640",
              }}
              height={hasManyExpertises ? 120 : 80}
            />

            <YAxis domain={[0, 100]}
              tickFormatter={formatChartScore}
              tick={{
                fontsize: 11,
                fill: "#626b76",
              }}/>
              
            <Tooltip
              formatter={(value) => [formatChartScore(value), "Score"]}
              labelFormatter={(label) => `Expertise : ${label}`}
            />

            <Bar dataKey="score" fill="#00008F">
              <LabelList
              dataKey="score"
              position="top"
              formatter={(value) => formatChartScore(value)}
              style={{ fontSize: 12, fontWeight: 700}}
              maxBarSize={hasManyExpertises ? 52 : 70}
            />
              <LabelList
                dataKey="score"
                position="top"
                formatter={formatChartScore}
                style={{ fontSize: 12, fontWeight: 700, fill: "#000000"}}
              />

              {visibleData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.originalExpertise}`}
                  fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="calculation-note-title">
  <p className="calculation-note-title"
     style={{
      marginTop: "30px",
      marginBottom: "8px",
      textAlign: "left",
      fontSize: "15px",
      fontWeight: 700,
     }}
  >
    <strong>Mode de calcul :</strong>
  </p>

<div
  className={`calculation-note calculation-note--${Math.min(
    visibleData.length,
    3
  )}`}
>
  <p>
    ° <strong>Critères standards :</strong> "Conforme" = 1 ; "Mauvaise pratique" = 0,5 ;
    "Non conforme" = 0.
    <br />
    <span className="calculation-note-detail">
      ("Non applicable" est exclu du calcul).
    </span>
  </p>

  <p>
    ° <strong>Éco Index :</strong> "A","B","C" ou "D" = 1 ; "E", "F" ou "G" = 0.
    <br />
    <span className="calculation-note-detail">
      ("Non applicable" est exclu du calcul).
    </span>
  </p>

  <p>
    ° <strong>Tracking :</strong> "Conforme" = 1 ; "Non conforme" = 0.
    <br />
    <span className="calculation-note-detail">
      ("Non applicable" est exclu du calcul).
    </span>
    <br />
    <span className="calculation-note-detail">
      Les critères du point de contrôle « Tracking » de l'expertise Tracking comptent double.
    </span>
  </p>
</div>
        </div>
      </div>

      {visibleData.length >= 3 && (
        <div 
          className="chart-card"
          style={{
            gridColumn: hasManyExpertises ? "1 / -1" : "auto",
          }}
        >
          <h2 
            className="publico-section-title"
            style={{ marginBottom: "28px" }}
          >
            Radar qualité
          </h2>

          <ResponsiveContainer width="100%" height={hasManyExpertises ? 300 : 260}>
            <RadarChart data={visibleData}>
              <PolarGrid />

              <PolarAngleAxis 
                dataKey="expertise" 
                tickSize={15}
                tickMargin={20}
                tick={{
                  fontSize: 14,
                  fontWeight: 700,
                  fill: "#303640",
                }} 
              />

              <PolarRadiusAxis 
                domain={[0, 100]}
                tickFormatter={formatChartScore}
                tick={{
                  fontSize: 9,
                  fill:  "8a8f98",
                }}
              />
              
              <Radar
                name="Qualité"
                dataKey="score"
                stroke="#4263eb"
                fill="#4263EB"
                fillOpacity={0.20}
                dot={({ cx, cy, payload }) => {
                  if (!payload || payload.realScore == null) return null;

                  const isExcluded = payload.excluded;

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isExcluded ? 6 : 5}
                      fill={isExcluded ? "#8A8F98" : "#00008F"}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}

                activeDot={{ r: 8 }}
              />

              <Tooltip
                formatter={(value) => [formatChartScore(value), "Score"]}
                labelFormatter={(label) => `Expertise : ${label}`}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="radar-legend">
            <div className="radar-legend-item">
              <span className="legend-dot legend-dot-included"></span>
              <span>Expertises prises en compte dans la note finale</span>
            </div>
          <div className="radar-legend-item">
            <span className="legend-dot legend-dot-excluded"></span>
            <span>Accessibilité et Éco conception : expertises non prises en compte</span>
          </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ResultsDashboard({ audit, expertises, expertiseScope }) {
  return (
    <>
      <h2
        className="section-title publico-section-title"
        style={{ marginBottom: "22px" }}
      >
        Scores
      </h2>
      <section className="score-grid">
        {expertiseScope === "all" && (
          <>
        <ScoreCard label="Score global" 
        value={audit?.scores?.global}/>
        <ScoreCard 
        label="Score Design"
        value={audit?.scores?.design}
        note={
          <>
            (Moyenne des expertises auditées)
            <br />
            Hors accessibilité et éco conception
          </>
        }
        />

        <ScoreCard 
        label="Score IT"
        value={audit?.scores?.tech}
        note="(Moyenne des expertises auditées)" />
        </>
      )}

      {expertiseScope === "design" && (
        <ScoreCard 
          label="Score Design"
          value={audit?.scores?.design}
          note={
            <>
              (Moyenne des expertises auditées)
              <br />
              Hors accessibilité et éco conception
            </>
          }
        />  
      )}

      {expertiseScope === "tech" && (
        <ScoreCard 
        label="Score IT"
        value={audit?.scores?.tech}
        note="(Moyenne des expertises auditées)"
        />
      )}
      </section>

      <ChartsSection audit={audit} expertises={expertises} />

      <h2 
        className="section-title publico-section-title"
        style={{ marginTop: "42px" }}
      >
        Détail des expertises détectées :
      </h2>

      <section className="expertise-grid">
        {expertises.map((expertise) => (
          <ExpertiseCard
            key={expertise.id}
            expertise={expertise}
            score={getExpertiseScore(audit, expertise.label)}
          />
        ))}
      </section>
    </>
  );
}

function ScoreCard({ label, value, note }) {
  const isGlobal = label == "Score global";

  const getGlobalStatus = (score) => {
    if (score === null || score ===undefined) {
      return null;
    }

    if (score >=89) {
      return {
        label: "Excellent",
        className: "score-status score-status--greendark",
      };
    }

    if (score >=70 && score <89) {
      return {
        label: "Bon niveau",
        className: "score-status score-status--lightgreen",
      };
    }

        if (score >=50 && score <70) {
      return {
        label: "Passable",
        className: "score-status score-status--orange",
      };
    }

    return {
      label: "Mauvaise note",
      className: "score-status score-status--red",
    };
  }

  const globalStatus = isGlobal ? getGlobalStatus(value) : null;

  return (
    <div className={`score-card ${isGlobal ? "score-card-global" : ""}`}>
      <p className="score-card-label">{label}</p>
      <strong className="score-value">
        {formatScore(value)}
      </strong>

      {globalStatus && (
        <span className={globalStatus.className}>
          {globalStatus.label}
        </span>
      )}

      {note? (
        <p className="score-card-note">{note}</p>
      ) :null}
    </div>
  );
}

function ExpertiseCard({ expertise }) {
  const points = expertise.points_de_controle || [];

  const totalCriteres = points.reduce(
    (total, point) => total + (point.criteres?.length || 0),
    0
  );

  const countStatus = (expectedStatus) =>
    points.reduce((total, point) => {
      const criteres = point.criteres || [];

      return (
        total +
        criteres.filter(
          (criterion) => criterion.status === expectedStatus
        ).length
      );
    }, 0);

  const nbConformes = countStatus("Conforme");
  const nbNonConformes = countStatus("Non conforme");
  const nbNonApplicables = countStatus("Non applicable");
  const nbAAuditer = countStatus("À auditer");

  const nbMauvaisesPratiques =
    countStatus("Mauvaise pratique") +
    countStatus("Mauvaise pratique détectée");

  const nbCriteresEvalues =
    nbConformes +
    nbNonConformes +
    nbMauvaisesPratiques +
    nbNonApplicables;
  
  const isNotStarted =
    totalCriteres > 0 &&
    nbCriteresEvalues === 0;

  return (
    <article
      className={`expertise-card ${
        isNotStarted ? "expertise-card---not-started" : ""
      }`}
      style={{
        borderLeftColor: isNotStarted ? "#B8BEC7" : expertise.color || "#D9D9D9", 
      }}
    >
    
    <div className="expertise-card-header">
      <h3>{getDisplayExpertiseLabel(expertise.label)}</h3>

      <span
        className={`expertise-family-tag ${
          expertise.family === "Design"
            ? "expertise-family-tag--design"
            : "expertise-family-tag--tech"
        }`}
      >
        {expertise.family === "Tech" ? "IT" : expertise.family}
      </span>  
      </div>

      <p>
        Total critères : <strong>{totalCriteres}</strong>
      </p>

      <p>
        Conformes : <strong>{nbConformes}</strong>
      </p>

      <p>
        Non conformes : <strong>{nbNonConformes}</strong>
      </p>

      <p>
        Mauvaises pratiques : <strong>{nbMauvaisesPratiques}</strong>
      </p>

      <p>
        Non applicables : <strong>{nbNonApplicables}</strong>
      </p>

      <p>
        À auditer : <strong>{nbAAuditer}</strong>
      </p>
    </article>
  );
}

function ExpertiseDetail({
  expertise,
  responses,
  activePointByExpertise,
  setActivePointByExpertise,
  onCriterionChange,
}) {
  const [visibleCriteriaCount, setVisibleCriteriaCount] = useState(3); 

  const activePointLabel =
    activePointByExpertise[expertise.label] ||
    expertise.points_de_controle?.[0]?.label;

  const activePoint = expertise.points_de_controle?.find(
    (point) => point.label === activePointLabel
  );

  const criteria = activePoint?.criteres || [];

  const hasPagination = criteria.length >=4;

  const visibleCriteria = hasPagination
    ? criteria.slice(0, visibleCriteriaCount)
    : criteria;

  const hasMoreCriteria =
    hasPagination && visibleCriteriaCount < criteria.length;

  useEffect(() => {
    setVisibleCriteriaCount(3);
  }, [activePointLabel]);

  const showNextCriteria = () => {
    setVisibleCriteriaCount((currentCount) =>
      Math.min(currentCount + 3, criteria.length)
    );
  };

  const getPointProgress = (point) => {
    const pointCriteria = point.criteres || [];

    const evaluatedCount = pointCriteria.filter((criterion) => {
      const currentStatus =
        responses[criterion.id]?.status ??
        criterion.status ??
        "À auditer";
      
      return currentStatus !== "À auditer";
    }).length;

    const totalCount = pointCriteria.length;

    return {
      evaluatedCount,
      totalCount,
      isCompleted: totalCount > 0 && evaluatedCount === totalCount,
      isStarted: evaluatedCount > 0 && evaluatedCount < totalCount,
    };
  };
  

  return (
    <section className="expertise-detail">
      <div className="expertise-workspace">
        <aside className="control-points-column">
          <h2 className="column-title">
            {getDisplayExpertiseLabel(expertise.label)}
          </h2>

          <div className="control-points-sidebar">
            <nav className="control-points-menu">
              {expertise.points_de_controle.map((point) => {
                const progress = getPointProgress(point);

                return (
                  <button
                    key={point.label}
                    type="button"
                    className={[
                      "control-point-menu-item",
                      activePointLabel === point.label ? "active" : "",
                      progress.isCompleted ? "completed" : "",
                      progress.isStarted ? "started" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setActivePointByExpertise((previous) => ({
                        ...previous,
                        [expertise.label]: point.label,
                      }))
                    }
                  >
                    <span className="control-point-label">
                      {point.label}
                    </span>
                  
                    <span className="control-point-progress">
                      {progress.isCompleted
                        ? "☑"
                        : `${progress.evaluatedCount}/${progress.totalCount}`}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="criteria-column">
          {activePoint && (
            <>
              <h2 className="column-title">{activePoint.label}</h2>

              <div className="criteria-content">
                <div className="point-section">
                  {visibleCriteria.map((criterion) => {
                    const currentStatus =
                      responses[criterion.id]?.status ??
                      criterion.status ??
                      "À auditer";

                    const badge = getStatusBadge(currentStatus);

                    return (
                      <div
                        key={criterion.id}
                        className="criterion-card"
                      >
                        <div className="criterion-content">
                          <h4>
                            {formatCriterionText(
                              criterion.criterion
                            )}
                          </h4>

                          {criterion.description && (
                            <p className="criterion-description">
                              {criterion.description}
                            </p>
                          )}

                          <div className="criterion-status">
                            <div className="criterion-status-header">
                              <label>État</label>

                              {badge && (
                                <div className={badge.className}>
                                  <span>{badge.label}</span>
                                </div>
                              )}
                            </div>

                            <select
                              value={currentStatus}
                              onChange={(e) =>
                                onCriterionChange(
                                  criterion.id,
                                  "status",
                                  e.target.value
                                )
                              }
                            >
                              {(criterion.options || [
                                "À auditer",
                                "Conforme",
                                "Mauvaise pratique",
                                "Non conforme",
                                "Non applicable",
                              ]).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="criterion-actions">
                          <label>Commentaire</label>

                          <textarea
                            value={
                              responses[criterion.id]?.comment ??
                              criterion.comment ??
                              ""
                            }
                            onChange={(e) =>
                              onCriterionChange(
                                criterion.id,
                                "comment",
                                e.target.value
                              )
                            }
                            placeholder="Ajouter un commentaire..."
                          />
                        </div>
                      </div>
                    );
                  })}
                    <div className="load-more-criteria">
                      {hasMoreCriteria && (
                        <button
                          type="button"
                          onClick={showNextCriteria}
                        >
                          Afficher les critères suivants
                          <span aria-hidden="true"> ▼</span>
                        </button>
                      )}

                    <p>
                      {visibleCriteria.length} critères affichés sur {criteria.length} au total.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function getExpertiseScore(audit, label) {
  const scoreItem = audit.scores.expertises.find((item) => item.label === label);
  return scoreItem ? scoreItem.score : null; 
}

function formatChartScore(value) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  const formattedValue = Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return `${formattedValue}\u202F%`;
}

function formatScore(value) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}


export default App;
