import { Input } from "@/components/ui/input";

function FieldInput({ label, id, value, onChange, placeholder = "" }) {
    return (
        <div className="field-row">
            <label htmlFor={id} className="field-label">
                {label}
            </label>
            <Input
                id={id}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

function FieldNumber({ label, id, value, onChange, unit }) {
    return (
        <div className="field-row">
            <label htmlFor={id} className="field-label">
                {label}
            </label>
            <div className="unit-wrap">
                <Input
                    id={id}
                    type="number"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                {unit ? <span className="unit-tag">{unit}</span> : null}
            </div>
        </div>
    );
}

function FieldSelect({ label, id, value, onChange, options }) {
    return (
        <div className="field-row">
            <label htmlFor={id} className="field-label">
                {label}
            </label>
            <select
                id={id}
                className="field-select"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={`${id}-${optionValue}`} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
        </div>
    );
}

export { FieldInput, FieldNumber, FieldSelect };
