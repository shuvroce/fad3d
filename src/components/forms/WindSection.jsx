function WindSection({ title, children }) {
    return (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/40 p-3">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
                {title}
            </h3>
            {children}
        </div>
    );
}

export default WindSection;
