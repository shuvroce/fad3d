import { FieldNumber, FieldSelect } from "@/components/forms/FormFields";

function GlassTab({ category, onFieldChange }) {
    return (
        <>
            <FieldSelect
                label="Glass Type"
                id={`cat${category.number}-glass-type`}
                value={category.fields.glassType}
                onChange={(value) =>
                    onFieldChange(category.number, "glassType", value)
                }
                options={[
                    ["", "Select glass type"],
                    ["tempered", "Tempered"],
                    ["laminated", "Laminated"],
                    ["insulated", "Insulated"],
                ]}
            />
            <FieldNumber
                label="Thickness"
                id={`cat${category.number}-glass-thickness`}
                value={category.fields.glassThickness}
                onChange={(value) =>
                    onFieldChange(category.number, "glassThickness", value)
                }
                unit="mm"
            />
            <FieldNumber
                label="Width"
                id={`cat${category.number}-glass-width`}
                value={category.fields.glassWidth}
                onChange={(value) =>
                    onFieldChange(category.number, "glassWidth", value)
                }
                unit="mm"
            />
            <FieldNumber
                label="Height"
                id={`cat${category.number}-glass-height`}
                value={category.fields.glassHeight}
                onChange={(value) =>
                    onFieldChange(category.number, "glassHeight", value)
                }
                unit="mm"
            />
        </>
    );
}

export default GlassTab;
