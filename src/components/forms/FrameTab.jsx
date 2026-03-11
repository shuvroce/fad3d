import {
    FieldInput,
    FieldNumber,
    FieldSelect,
} from "@/components/forms/FormFields";

function FrameTab({ category, onFieldChange }) {
    return (
        <>
            <FieldSelect
                label="Frame Material"
                id={`cat${category.number}-frame-material`}
                value={category.fields.frameMaterial}
                onChange={(value) =>
                    onFieldChange(category.number, "frameMaterial", value)
                }
                options={[
                    ["", "Select material"],
                    ["aluminum", "Aluminum"],
                    ["steel", "Steel"],
                    ["composite", "Composite"],
                ]}
            />
            <FieldInput
                label="Profile Type"
                id={`cat${category.number}-frame-profile`}
                value={category.fields.frameProfile}
                onChange={(value) =>
                    onFieldChange(category.number, "frameProfile", value)
                }
                placeholder="Enter profile"
            />
            <FieldNumber
                label="Depth"
                id={`cat${category.number}-frame-depth`}
                value={category.fields.frameDepth}
                onChange={(value) =>
                    onFieldChange(category.number, "frameDepth", value)
                }
                unit="mm"
            />
        </>
    );
}

export default FrameTab;
