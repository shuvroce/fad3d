import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, Leaf, Package } from "lucide-react";

function SummaryPanel() {
    return (
        <Card className="h-full overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText size={18} className="text-primary" />
                    Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] space-y-4 overflow-y-auto p-4">
                {/* Building Statistics */}
                <div className="summary-section">
                    <h3 className="summary-heading">
                        <TrendingUp size={16} />
                        Building Statistics
                    </h3>
                    <div className="stats-grid">
                        <StatItem
                            label="Area per floor"
                            value="19,210"
                            unit="sqft"
                        />
                        <StatItem
                            label="Total floor area"
                            value="230,520"
                            unit="sqft"
                        />
                        <StatItem
                            label="Total building height"
                            value="144'"
                            unit=""
                        />
                        <StatItem
                            label="Building dimension"
                            value="220' x 138'"
                            unit=""
                        />
                        <StatItem
                            label="Typical floor height"
                            value="12'"
                            unit=""
                        />
                        <StatItem
                            label="Minimum clear height"
                            value="10'-10&quot;"
                            unit=""
                        />
                    </div>
                </div>

                {/* Superstructure Summary */}
                <div className="summary-section">
                    <h3 className="summary-heading">
                        <Package size={16} />
                        Superstructure Summary (excl Core)
                    </h3>
                    <div className="metric-row">
                        <span className="metric-value large">0</span>
                        <span className="metric-label">lb/sf</span>
                    </div>

                    <div className="summary-items">
                        <SummaryItem
                            icon="■"
                            color="text-slate-400"
                            value="0"
                            unit="lb/sf"
                            max="60"
                        />
                        <SummaryItem
                            icon="●"
                            color="text-orange-400"
                            value="1.22"
                            unit="ft²/sf"
                            max="155"
                            detail="pcy"
                        />
                        <SummaryItem
                            icon="◆"
                            color="text-slate-400"
                            value="0"
                            unit="ft³/sf"
                            max="1.5"
                        />
                    </div>
                </div>

                {/* Carbon Summary */}
                <div className="summary-section">
                    <h3 className="summary-heading">
                        <Leaf size={16} />
                        Carbon Summary (excl Core)
                    </h3>
                    <div className="metric-row">
                        <span className="metric-value large">5,125</span>
                        <span className="metric-label">tCO₂e</span>
                        <span className="metric-sublabel">Total emissions</span>
                    </div>

                    <div className="carbon-detail">
                        <div className="carbon-row">
                            <span className="carbon-label">
                                239.3 kgCO₂e/m²
                            </span>
                            <span className="carbon-sublabel">
                                GWP (A1-5 w/o biogenic carbon)
                            </span>
                        </div>
                        <div className="carbon-row">
                            <span className="carbon-label">- kgCO₂e/m²</span>
                            <span className="carbon-sublabel">
                                GWP (A1-A5 w/ biogenic carbon)
                            </span>
                        </div>
                    </div>

                    {/* Carbon Rating */}
                    <div className="rating-section">
                        <div className="rating-badge">C</div>
                        <div className="rating-label">
                            SCO₂RS rating (A1-A5)
                        </div>
                        <button className="rating-info" title="More info">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <circle
                                    cx="8"
                                    cy="8"
                                    r="7"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M8 7v4M8 5h.01"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Rating Scale */}
                    <div className="rating-scale">
                        {["A++", "A+", "A", "B", "C", "D", "E", "F", "G"].map(
                            (grade, idx) => (
                                <div
                                    key={grade}
                                    className={`scale-item ${grade === "C" ? "active" : ""}`}
                                    style={{
                                        backgroundColor: [
                                            "#10b981",
                                            "#22c55e",
                                            "#84cc16",
                                            "#eab308",
                                            "#f97316",
                                            "#ef4444",
                                            "#dc2626",
                                            "#b91c1c",
                                            "#991b1b",
                                        ][idx],
                                    }}
                                    title={`Grade ${grade}`}
                                >
                                    {grade === "C" && (
                                        <span className="scale-marker">▼</span>
                                    )}
                                </div>
                            ),
                        )}
                    </div>

                    <div className="carbon-values">
                        <span className="text-xs text-muted-foreground">0</span>
                        <span className="text-xs text-muted-foreground">
                            100
                        </span>
                        <span className="text-xs text-muted-foreground">
                            200
                        </span>
                        <span className="text-xs text-muted-foreground">
                            300
                        </span>
                        <span className="text-xs text-muted-foreground">
                            400+kgCO₂e/m²
                        </span>
                    </div>
                </div>

                {/* Weight by Material */}
                <div className="summary-section">
                    <h3 className="summary-heading">
                        <Package size={16} />
                        Weight by Material
                    </h3>

                    <div className="material-toggle">
                        <label className="toggle-row justify-between">
                            <span className="toggle-label">By material</span>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="toggle-checkbox"
                            />
                            <span className="toggle-switch"></span>
                        </label>
                    </div>

                    {/* Pie Chart Placeholder */}
                    <div className="pie-chart">
                        <svg viewBox="0 0 100 100" className="chart-svg">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="20"
                                strokeDasharray="251.2"
                                strokeDashoffset="0"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#64748b"
                                strokeWidth="20"
                                strokeDasharray="188.4 62.8"
                                strokeDashoffset="0"
                                transform="rotate(-90 50 50)"
                            />
                        </svg>
                        <div className="chart-center">
                            <div className="chart-label">Concrete</div>
                            <div className="chart-value">36,717 tons</div>
                            <div className="chart-percent">(96.1%)</div>
                        </div>
                    </div>

                    <div className="material-legend">
                        <div className="legend-item">
                            <span
                                className="legend-dot"
                                style={{ backgroundColor: "#94a3b8" }}
                            ></span>
                            <span className="legend-label">Concrete</span>
                        </div>
                        <div className="legend-item">
                            <span
                                className="legend-dot"
                                style={{ backgroundColor: "#64748b" }}
                            ></span>
                            <span className="legend-label">Rebar</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatItem({ label, value, unit }) {
    return (
        <div className="stat-item">
            <div className="stat-value">
                {value}
                {unit && <span className="stat-unit">{unit}</span>}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function SummaryItem({ icon, color, value, unit, max, detail }) {
    return (
        <div className="summary-item">
            <div className="summary-item-header">
                <span className={`summary-icon ${color}`}>{icon}</span>
                <div className="summary-values">
                    <span className="summary-value">{value}</span>
                    <span className="summary-unit">{unit}</span>
                </div>
                <div className="summary-range">
                    <span className="range-max">{max}</span>
                    {detail && <span className="range-detail">{detail}</span>}
                </div>
                <button className="summary-info" title="More info">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle
                            cx="8"
                            cy="8"
                            r="7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M8 7v4M8 5h.01"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default SummaryPanel;
