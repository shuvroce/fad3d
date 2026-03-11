const DEFAULT_TAB = "glass";

const createDefaultCategoryFields = () => ({
    glassType: "",
    glassThickness: "",
    glassWidth: "",
    glassHeight: "",
    frameMaterial: "",
    frameProfile: "",
    frameDepth: "",
    connType: "",
    connSpacing: "",
    connCapacity: "",
    anchorType: "",
    anchorDiameter: "",
    anchorEmbedment: "",
});

const createCategory = (number) => ({
    number,
    name: `Category ${number}`,
    isCustomName: false,
    activeTab: DEFAULT_TAB,
    fields: createDefaultCategoryFields(),
});

const createDefaultWindFields = () => ({
    designCode: "",
    exposure: "",
    importance: "",
    basicSpeed: "",
    direction: "",
    gustFactor: "",
    buildingHeight: "",
    buildingWidth: "",
    buildingDepth: "",
    groundElevation: "",
    cpExternal: "",
    cpInternal: "",
    topographicFactor: "",
    directionalFactor: "",
});

export {
    DEFAULT_TAB,
    createCategory,
    createDefaultCategoryFields,
    createDefaultWindFields,
};
