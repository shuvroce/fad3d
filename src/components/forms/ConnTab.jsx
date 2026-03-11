import { FieldNumber, FieldSelect } from "@/components/forms/FormFields";

function ConnTab({ category, onFieldChange }) {
    return (
        <>
            <FieldSelect
                label="Connection Type"
                id={`cat${category.number}-conn-type`}
                value={category.fields.connType}
                onChange={(value) =>
                    onFieldChange(category.number, "connType", value)
                }
                options={[
                    ["", "Select connection"],
                    ["bracket", "Bracket"],
                    ["clip", "Clip"],
                    ["bolt", "Bolt"],
                ]}
            />
            <FieldNumber
                label="Spacing"
                id={`cat${category.number}-conn-spacing`}
                value={category.fields.connSpacing}
                onChange={(value) =>
                    onFieldChange(category.number, "connSpacing", value)
                }
                unit="mm"
            />
            <FieldNumber
                label="Load Capacity"
                id={`cat${category.number}-conn-capacity`}
                value={category.fields.connCapacity}
                onChange={(value) =>
                    onFieldChange(category.number, "connCapacity", value)
                }
                unit="kN"
            />
        </>
    );
}

export default ConnTab;
