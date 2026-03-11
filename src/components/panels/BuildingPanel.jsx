import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Ruler, Layers } from "lucide-react";

function BuildingPanel() {
    return (
        <Card className="h-full overflow-hidden">
            <CardContent className="h-full overflow-y-auto p-4">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Building2 size={20} className="text-primary" />
                    Building Parameters
                </h2>

                {/* Building Type and Height */}
                <div className="param-section">
                    <div className="param-group">
                        <label className="param-label">Building Type</label>
                        <div className="building-type-icons">
                            <button className="type-icon active" title="Normal">
                                <Building2 size={20} />
                                <span className="type-label">Normal</span>
                            </button>
                            <button className="type-icon" title="High Rise">
                                <Layers size={20} />
                                <span className="type-label">High</span>
                            </button>
                            <button className="type-icon" title="Storage">
                                <Building2 size={20} />
                                <span className="type-label">Storage</span>
                            </button>
                        </div>
                    </div>

                    <div className="param-group">
                        <label className="param-label">
                            SDL
                            <span className="param-unit">psf</span>
                        </label>
                        <div className="slider-control">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                defaultValue="15"
                                className="param-slider"
                            />
                            <span className="slider-value">15</span>
                        </div>
                    </div>

                    <div className="param-group">
                        <label className="param-label">
                            LL
                            <span className="param-unit">psf</span>
                        </label>
                        <div className="slider-control">
                            <input
                                type="range"
                                min="0"
                                max="150"
                                defaultValue="65"
                                className="param-slider"
                            />
                            <span className="slider-value">65</span>
                        </div>
                    </div>

                    <div className="param-group">
                        <label className="param-label">Fire Rating</label>
                        <select className="param-select">
                            <option>2 hour fire rating</option>
                            <option>3 hour fire rating</option>
                            <option>4 hour fire rating</option>
                        </select>
                    </div>
                </div>

                {/* Project Location */}
                <div className="param-section">
                    <h3 className="section-heading">
                        <MapPin size={16} />
                        Project Location
                    </h3>
                    <div className="param-group">
                        <input
                            type="text"
                            placeholder="Enter address for accurate carbon"
                            className="param-input"
                        />
                    </div>
                </div>

                {/* Typical Bay */}
                <div className="param-section">
                    <h3 className="section-heading">
                        <Ruler size={16} />
                        Typical Bay
                    </h3>

                    <div className="bay-diagram">
                        <div className="bay-grid">
                            <div className="bay-cell">
                                <span className="bay-arrow">↔</span>
                                <span className="bay-label">Span X</span>
                            </div>
                            <div className="bay-cell">
                                <span className="bay-arrow">↕</span>
                                <span className="bay-label">Span Y</span>
                            </div>
                        </div>
                    </div>

                    <div className="param-row">
                        <div className="param-group">
                            <label className="param-label">X Spacing</label>
                            <div className="slider-control">
                                <input
                                    type="range"
                                    min="10"
                                    max="50"
                                    defaultValue="25"
                                    className="param-slider"
                                />
                                <span className="slider-value">25'-0"</span>
                            </div>
                        </div>
                        <div className="param-group">
                            <label className="param-label">Y Spacing</label>
                            <div className="slider-control">
                                <input
                                    type="range"
                                    min="10"
                                    max="50"
                                    defaultValue="25"
                                    className="param-slider"
                                />
                                <span className="slider-value">25'-0"</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Structural System */}
                <div className="param-section">
                    <h3 className="section-heading">
                        <Layers size={16} />
                        Structural System
                    </h3>

                    <div className="structural-icons">
                        <button
                            className="struct-icon active"
                            title="Beam-Column"
                        >
                            <svg viewBox="0 0 40 30" className="struct-svg">
                                <path
                                    d="M5 5 L5 25 M15 5 L15 25 M25 5 L25 25 M35 5 L35 25"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                                <path
                                    d="M2 8 L38 8 M2 22 L38 22"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </svg>
                        </button>
                        <button className="struct-icon" title="Frame">
                            <svg viewBox="0 0 40 30" className="struct-svg">
                                <path
                                    d="M5 25 L5 10 L15 5 L25 5 L35 10 L35 25"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                                <path
                                    d="M15 5 L15 25 M25 5 L25 25"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </svg>
                        </button>
                        <button className="struct-icon" title="Truss">
                            <svg viewBox="0 0 40 30" className="struct-svg">
                                <path
                                    d="M5 25 L20 5 L35 25 Z M20 5 L20 25 M12.5 15 L27.5 15"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="param-group">
                        <label className="param-label flex items-center gap-2">
                            <span>Foundation Type</span>
                            <select className="param-select-sm">
                                <option>North America</option>
                                <option>Europe</option>
                                <option>Asia</option>
                            </select>
                        </label>
                        <label className="toggle-row">
                            <input
                                type="checkbox"
                                defaultChecked
                                className="toggle-checkbox"
                            />
                            <span className="toggle-switch"></span>
                            <span className="toggle-label">Exposed</span>
                        </label>
                    </div>
                </div>

                {/* Floor Slabs */}
                <div className="param-section">
                    <h3 className="section-heading">Floor Slabs</h3>

                    <div className="slab-visual">
                        <div className="slab-diagram"></div>
                    </div>
                </div>

                {/* Beams Section */}
                <div className="param-section">
                    <h3 className="section-heading">Beams</h3>
                    <div className="param-group">
                        <label className="param-label">Section Type</label>
                        <select className="param-select">
                            <option>W-Shape</option>
                            <option>HSS</option>
                            <option>Channel</option>
                        </select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default BuildingPanel;
