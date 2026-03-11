import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldNumber, FieldSelect } from "@/components/forms/FormFields";
import WindSection from "@/components/forms/WindSection";

function WindPanel({ windFields, onChange, onReset }) {
    return (
        <Card className="h-full overflow-hidden">
            <CardContent className="h-full space-y-5 overflow-y-auto p-4">
                <h2 className="text-lg font-semibold">Wind Load Parameters</h2>

                <WindSection title="General Information">
                    <FieldSelect
                        label="Design Code"
                        id="wind-design-code"
                        value={windFields.designCode}
                        onChange={(value) => onChange("designCode", value)}
                        options={[
                            ["", "Select design code"],
                            ["asce7-16", "ASCE 7-16"],
                            ["asce7-22", "ASCE 7-22"],
                            ["en1991", "EN 1991-1-4"],
                            ["bnbc2020", "BNBC 2020"],
                            ["is875", "IS 875 Part 3"],
                        ]}
                    />
                    <FieldSelect
                        label="Exposure Category"
                        id="wind-exposure"
                        value={windFields.exposure}
                        onChange={(value) => onChange("exposure", value)}
                        options={[
                            ["", "Select exposure"],
                            ["b", "Exposure B"],
                            ["c", "Exposure C"],
                            ["d", "Exposure D"],
                        ]}
                    />
                    <FieldSelect
                        label="Importance Factor"
                        id="wind-importance"
                        value={windFields.importance}
                        onChange={(value) => onChange("importance", value)}
                        options={[
                            ["", "Select importance"],
                            ["0.87", "Category I (0.87)"],
                            ["1.0", "Category II (1.0)"],
                            ["1.15a", "Category III (1.15)"],
                            ["1.15b", "Category IV (1.15)"],
                        ]}
                    />
                </WindSection>

                <WindSection title="Wind Speed & Direction">
                    <FieldNumber
                        label="Basic Wind Speed"
                        id="wind-basic-speed"
                        value={windFields.basicSpeed}
                        onChange={(value) => onChange("basicSpeed", value)}
                        unit="m/s"
                    />
                    <FieldSelect
                        label="Wind Direction"
                        id="wind-direction"
                        value={windFields.direction}
                        onChange={(value) => onChange("direction", value)}
                        options={[
                            ["", "Select direction"],
                            ["0", "0° (North)"],
                            ["45", "45° (NE)"],
                            ["90", "90° (East)"],
                            ["135", "135° (SE)"],
                            ["180", "180° (South)"],
                            ["225", "225° (SW)"],
                            ["270", "270° (West)"],
                            ["315", "315° (NW)"],
                        ]}
                    />
                    <FieldNumber
                        label="Gust Effect Factor"
                        id="wind-gust-factor"
                        value={windFields.gustFactor}
                        onChange={(value) => onChange("gustFactor", value)}
                    />
                </WindSection>

                <WindSection title="Building Geometry">
                    <FieldNumber
                        label="Building Height"
                        id="wind-building-height"
                        value={windFields.buildingHeight}
                        onChange={(value) => onChange("buildingHeight", value)}
                        unit="m"
                    />
                    <FieldNumber
                        label="Building Width"
                        id="wind-building-width"
                        value={windFields.buildingWidth}
                        onChange={(value) => onChange("buildingWidth", value)}
                        unit="m"
                    />
                    <FieldNumber
                        label="Building Depth"
                        id="wind-building-depth"
                        value={windFields.buildingDepth}
                        onChange={(value) => onChange("buildingDepth", value)}
                        unit="m"
                    />
                    <FieldNumber
                        label="Ground Elevation"
                        id="wind-ground-elevation"
                        value={windFields.groundElevation}
                        onChange={(value) => onChange("groundElevation", value)}
                        unit="m"
                    />
                </WindSection>

                <WindSection title="Pressure Coefficients">
                    <FieldNumber
                        label="External Pressure Coefficient (Cp)"
                        id="wind-cp-external"
                        value={windFields.cpExternal}
                        onChange={(value) => onChange("cpExternal", value)}
                    />
                    <FieldNumber
                        label="Internal Pressure Coefficient (Cpi)"
                        id="wind-cp-internal"
                        value={windFields.cpInternal}
                        onChange={(value) => onChange("cpInternal", value)}
                    />
                    <FieldNumber
                        label="Topographic Factor (Kzt)"
                        id="wind-topographic-factor"
                        value={windFields.topographicFactor}
                        onChange={(value) =>
                            onChange("topographicFactor", value)
                        }
                    />
                    <FieldNumber
                        label="Directional Factor (Kd)"
                        id="wind-directional-factor"
                        value={windFields.directionalFactor}
                        onChange={(value) =>
                            onChange("directionalFactor", value)
                        }
                    />
                </WindSection>

                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={onReset}>
                        Reset
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            window.alert(
                                "Wind load calculation will be implemented here",
                            );
                        }}
                    >
                        Calculate
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default WindPanel;
