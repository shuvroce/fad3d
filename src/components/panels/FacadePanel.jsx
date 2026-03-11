import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnchorTab from "@/components/forms/AnchorTab";
import ConnTab from "@/components/forms/ConnTab";
import FrameTab from "@/components/forms/FrameTab";
import GlassTab from "@/components/forms/GlassTab";

function FacadePanel({ category, onHeadingBlur, onTabChange, onFieldChange }) {
    if (!category) {
        return null;
    }

    return (
        <Card className="h-full overflow-hidden">
            <CardContent className="h-full overflow-y-auto p-4">
                <h2
                    className="mb-4 rounded-md border border-transparent px-2 py-1 text-lg font-semibold outline-none transition hover:border-border focus:border-border"
                    contentEditable
                    suppressContentEditableWarning
                    data-category={category.number}
                    spellCheck={false}
                    onBlur={(event) =>
                        onHeadingBlur(
                            category.number,
                            event.currentTarget.textContent || "",
                        )
                    }
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                        }
                    }}
                    onClick={(event) => {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(event.currentTarget);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                    }}
                >
                    {category.name}
                </h2>

                <Tabs
                    value={category.activeTab}
                    onValueChange={(value) =>
                        onTabChange(category.number, value)
                    }
                >
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="glass">Glass</TabsTrigger>
                        <TabsTrigger value="frame">Frame</TabsTrigger>
                        <TabsTrigger value="conn">Conn.</TabsTrigger>
                        <TabsTrigger value="anchor">Anchor.</TabsTrigger>
                    </TabsList>

                    <TabsContent value="glass">
                        <GlassTab
                            category={category}
                            onFieldChange={onFieldChange}
                        />
                    </TabsContent>

                    <TabsContent value="frame">
                        <FrameTab
                            category={category}
                            onFieldChange={onFieldChange}
                        />
                    </TabsContent>

                    <TabsContent value="conn">
                        <ConnTab
                            category={category}
                            onFieldChange={onFieldChange}
                        />
                    </TabsContent>

                    <TabsContent value="anchor">
                        <AnchorTab
                            category={category}
                            onFieldChange={onFieldChange}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default FacadePanel;
