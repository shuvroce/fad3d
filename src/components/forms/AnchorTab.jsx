import { FieldNumber, FieldSelect } from "@/components/forms/FormFields";

function AnchorTab({ category, onFieldChange }) {
    return (
        <>
            <FieldSelect
                label="Anchor Type"
                id={`cat${category.number}-anchor-type`}
                value={category.fields.anchorType}
                onChange={(value) =>
                    onFieldChange(category.number, "anchorType", value)
                }
                options={[
                    ["", "Select anchor"],
                    ["expansion", "Expansion"],
                    ["chemical", "Chemical"],
                    ["concrete", "Concrete"],
                ]}
            />
            <FieldNumber
                label="Diameter"
                id={`cat${category.number}-anchor-diameter`}
                value={category.fields.anchorDiameter}
                onChange={(value) =>
                    onFieldChange(category.number, "anchorDiameter", value)
                }
                unit="mm"
            />
            <FieldNumber
                label="Embedment Depth"
                id={`cat${category.number}-anchor-embedment`}
                value={category.fields.anchorEmbedment}
                onChange={(value) =>
                    onFieldChange(category.number, "anchorEmbedment", value)
                }
                unit="mm"
            />
        </>
    );
}

export default AnchorTab;
