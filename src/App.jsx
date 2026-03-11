import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CircleHelp,
    FolderOpen,
    LayoutDashboard,
    LifeBuoy,
    Moon,
    Plus,
    RotateCcw,
    Save,
    Settings,
    Sun,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FacadePanel from "@/components/panels/FacadePanel";
import WindPanel from "@/components/panels/WindPanel";
import BuildingPanel from "@/components/panels/BuildingPanel";
import SummaryPanel from "@/components/panels/SummaryPanel";
import { createCategory, createDefaultWindFields } from "@/lib/formDefaults";

function App() {
    const [theme, setTheme] = useState(
        () => localStorage.getItem("theme") || "light",
    );
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [panelMode, setPanelMode] = useState("building");

    const [categories, setCategories] = useState([createCategory(1)]);
    const [activeCategoryNumber, setActiveCategoryNumber] = useState(1);

    const [windFields, setWindFields] = useState(createDefaultWindFields());

    useEffect(() => {
        document.body.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
    }, [theme]);

    const activeCategory = useMemo(
        () =>
            categories.find(
                (category) => category.number === activeCategoryNumber,
            ) || categories[0],
        [categories, activeCategoryNumber],
    );

    const leftLabel = leftCollapsed
        ? "Expand left panel"
        : "Collapse left panel";
    const rightLabel = rightCollapsed
        ? "Expand right panel"
        : "Collapse right panel";

    const addCategory = () => {
        const nextNumber = categories.length + 1;
        setCategories((current) => [...current, createCategory(nextNumber)]);
        setActiveCategoryNumber(nextNumber);
    };

    const removeCategory = (categoryNumber) => {
        if (categories.length === 1) {
            window.alert("Cannot remove the last category");
            return;
        }

        const indexToRemove = categories.findIndex(
            (category) => category.number === categoryNumber,
        );
        if (indexToRemove < 0) {
            return;
        }

        const wasActive = activeCategoryNumber === categoryNumber;

        const renumbered = categories
            .filter((category) => category.number !== categoryNumber)
            .map((category, index) => {
                const nextNumber = index + 1;
                return {
                    ...category,
                    number: nextNumber,
                    name: category.isCustomName
                        ? category.name
                        : `Category ${nextNumber}`,
                };
            });

        setCategories(renumbered);

        if (wasActive) {
            const previousNumber = categoryNumber > 1 ? categoryNumber - 1 : 1;
            setActiveCategoryNumber(
                Math.min(previousNumber, renumbered.length),
            );
            return;
        }

        if (activeCategoryNumber > categoryNumber) {
            setActiveCategoryNumber(activeCategoryNumber - 1);
            return;
        }

        if (activeCategoryNumber > renumbered.length) {
            setActiveCategoryNumber(renumbered.length);
        }
    };

    const updateCategoryTab = (categoryNumber, tab) => {
        setCategories((current) =>
            current.map((category) =>
                category.number === categoryNumber
                    ? {
                          ...category,
                          activeTab: tab,
                      }
                    : category,
            ),
        );
    };

    const updateCategoryHeading = (categoryNumber, value) => {
        const nextTitle = value.trim();
        setCategories((current) =>
            current.map((category) => {
                if (category.number !== categoryNumber) {
                    return category;
                }

                if (!nextTitle || nextTitle === `Category ${categoryNumber}`) {
                    return {
                        ...category,
                        name: `Category ${categoryNumber}`,
                        isCustomName: false,
                    };
                }

                return {
                    ...category,
                    name: nextTitle,
                    isCustomName: true,
                };
            }),
        );
    };

    const updateCategoryField = (categoryNumber, field, value) => {
        setCategories((current) =>
            current.map((category) =>
                category.number === categoryNumber
                    ? {
                          ...category,
                          fields: {
                              ...category.fields,
                              [field]: value,
                          },
                      }
                    : category,
            ),
        );
    };

    const updateWindField = (field, value) => {
        setWindFields((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const resetWindFields = () => {
        setWindFields(createDefaultWindFields());
    };

    return (
        <div className="fad-root">
            <header className="topbar">
                <div className="topbar__left">
                    <div className="logo-dot" aria-hidden="true" />
                    <div className="flex items-center gap-1">
                        <IconButton
                            label="Dashboard"
                            icon={<LayoutDashboard size={16} />}
                        />
                        <IconButton
                            label="Open"
                            icon={<FolderOpen size={16} />}
                        />
                        <IconButton
                            label="Generate"
                            icon={<RotateCcw size={16} />}
                        />
                        <IconButton label="Save" icon={<Save size={16} />} />
                    </div>
                    <div className="project-pill">Project Name</div>
                </div>

                <div className="topbar__right">
                    <div className="license-wrap">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            License status
                        </span>
                        <span className="license-active">Active</span>
                    </div>
                    <div className="hidden items-center gap-1 md:flex">
                        <IconButton
                            label="Support"
                            icon={<LifeBuoy size={16} />}
                        />
                        <IconButton
                            label="Help"
                            icon={<CircleHelp size={16} />}
                        />
                        <IconButton
                            label="Learn"
                            icon={<BookOpen size={16} />}
                        />
                        <IconButton
                            label="Setting"
                            icon={<Settings size={16} />}
                        />
                    </div>
                    <Button
                        size="sm"
                        className="bg-cyan-500 text-slate-900 hover:bg-cyan-400"
                    >
                        Report
                    </Button>
                    <img
                        src="/dp.jpg"
                        alt="User avatar"
                        className="h-9 w-9 rounded-full border border-border/70 object-cover"
                    />
                    <button
                        className="theme-btn"
                        type="button"
                        data-title="Theme"
                        aria-label="Toggle dark mode"
                        onClick={() =>
                            setTheme((current) =>
                                current === "dark" ? "light" : "dark",
                            )
                        }
                    >
                        {theme === "dark" ? (
                            <Sun size={16} />
                        ) : (
                            <Moon size={16} />
                        )}
                    </button>
                </div>
            </header>

            <section className="floating-bar">
                <div className="flex items-center gap-3">
                    <div className="button-group">
                        <ModeButton
                            active={panelMode === "building"}
                            label="Building"
                            onClick={() => setPanelMode("building")}
                        />
                        <ModeButton
                            active={panelMode === "wind"}
                            label="Wind"
                            onClick={() => setPanelMode("wind")}
                        />
                        <ModeButton
                            active={panelMode === "facade"}
                            label="Facade"
                            onClick={() => setPanelMode("facade")}
                        />
                    </div>
                    <div className="button-group hidden sm:flex">
                        <ModeButton
                            active={false}
                            label="General"
                            onClick={() => {}}
                        />
                        <ModeButton
                            active={false}
                            label="Define"
                            onClick={() => {}}
                        />
                    </div>
                </div>

                <div
                    className={`button-group ${rightCollapsed ? "opacity-40" : ""}`}
                >
                    <ModeButton active label="Model" onClick={() => {}} />
                    <ModeButton
                        active={false}
                        label="DC Ratio"
                        onClick={() => {}}
                    />
                    <ModeButton
                        active={false}
                        label="Deflection"
                        onClick={() => {}}
                    />
                </div>
            </section>

            <main className="workspace">
                <section
                    className={`left-panel ${leftCollapsed ? "collapsed" : ""}`}
                >
                    <div
                        className={`catbar ${panelMode !== "facade" ? "invisible pointer-events-none" : ""}`}
                        aria-label="Categories"
                    >
                        {categories.map((category) => (
                            <div
                                className="catbar-item"
                                key={category.number}
                                data-category={category.number}
                            >
                                <button
                                    className={`cat-btn ${activeCategoryNumber === category.number ? "active" : ""}`}
                                    type="button"
                                    data-title={category.name}
                                    aria-label={category.name}
                                    onClick={() =>
                                        setActiveCategoryNumber(category.number)
                                    }
                                >
                                    {category.number}
                                </button>
                                <button
                                    type="button"
                                    className="cat-remove"
                                    aria-label={`Remove Category ${category.number}`}
                                    onClick={() =>
                                        removeCategory(category.number)
                                    }
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <button
                            className="cat-add"
                            type="button"
                            data-title="Add Category"
                            aria-label="Add Category"
                            onClick={addCategory}
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="left-input-wrap">
                        {panelMode === "building" ? (
                            <BuildingPanel />
                        ) : panelMode === "wind" ? (
                            <WindPanel
                                windFields={windFields}
                                onChange={updateWindField}
                                onReset={resetWindFields}
                            />
                        ) : (
                            <FacadePanel
                                category={activeCategory}
                                onHeadingBlur={updateCategoryHeading}
                                onTabChange={updateCategoryTab}
                                onFieldChange={updateCategoryField}
                            />
                        )}
                    </div>
                </section>

                <button
                    className={`panel-toggle left ${leftCollapsed ? "collapsed" : ""}`}
                    type="button"
                    aria-label={leftLabel}
                    data-title={leftLabel}
                    onClick={() => setLeftCollapsed((current) => !current)}
                >
                    <ChevronLeft size={16} />
                </button>

                <section className="viewport-panel">
                    <Card className="h-full border-dashed border-cyan-200/70 bg-gradient-to-b from-background to-cyan-50/10 shadow-panel dark:border-cyan-900/60">
                        <CardHeader>
                            <CardTitle>3D Viewport</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-4.5rem)]">
                            <div className="viewport-placeholder">
                                <span>Visualization canvas area</span>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section
                    className={`right-panel ${rightCollapsed ? "collapsed" : ""}`}
                >
                    <SummaryPanel />
                </section>

                <button
                    className={`panel-toggle right ${rightCollapsed ? "collapsed" : ""}`}
                    type="button"
                    aria-label={rightLabel}
                    data-title={rightLabel}
                    onClick={() => setRightCollapsed((current) => !current)}
                >
                    <ChevronRight size={16} />
                </button>
            </main>
        </div>
    );
}

function IconButton({ label, icon }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            data-title={label}
            className="text-foreground/80 hover:text-foreground"
        >
            {icon}
        </Button>
    );
}

function ModeButton({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`mode-btn ${active ? "active" : ""}`}
        >
            {label}
        </button>
    );
}

export default App;
