# FAD: Facade Analysis & Design

Always look at this instruction while coding for this project. Keep this file intact. Never delete this file. Always refer to this file for the overall project requirements, technical stack, and UI/UX guidelines.

## Project Overview

Web application for facade structural analysis and design with dynamic multi-category input system. Generate professional design report in pdf format.

## Technical Stack Requirements

- **Frontend:** Vanilla HTML, CSS, JS (no frameworks)
- **Backend:** Flask (Python) with Jinja2 templating (for initial UI checking, static routing for now)
- **Report Generation:** Weasyprint, Jinja2
- **3D Rendering:** Three.js

- Use clean, minimal and readable code
- Use highly modular structure for JS to keep code organized and maintainable.
- Always avoid redundancy
- Avoid repeated code
- Use comments to explain complex logic, but avoid obvious comments
- Follow consistent naming conventions
- keep JS as minimal as possile, avoid unnecessary libraries or dependencies
- try to avoid inline html in js, keep html code in the relevant html files as much as possible, and use js to manipulate the DOM elements and add event listeners, rather than generating html code in js.

## Application Layout & Navigation

### Top Navbar

- **Left Section:** App Logo, followed by action buttons (icon only): **Dashboard**, **Open**, and **Save**. Followed by Dynamic **Project Name** display.

- **Right Section:** **License Status** indicator.

- **Utility Buttons:** "Support," "Help," "Learn," and "Setting" (all with top-aligned icons).

- **Report Dropdown:** A blue **Report** button with a chevron for the "Summary Report" dropdown.

- **User Profile:** A circular User avatar/logo.

- **Theme Toggle:** Light/Dark mode switcher (moon/sun icon).

### Secondary Floating Command Bar

Positioned beneath the navbar. A semi-transparent or low-profile bar overlaying the top of the workspace. This bar (multiple pill shaped segments) controls the application's global state and modals:

- **Far Left:** Toggle group, a pill-shaped container for **Wind** and **Facade**. Two primary buttons—**Wind** and **Facade**—to switch the context of the input fields.

- **Center (Data Definition):** A pill-shaped container holding **General**, **Define** button. **General:** Opens a modal for Project Info and Report configuration. **Define (Dropdown/Group):** Material and Section buttons that open modals to define structural properties.

- **Right (View Controls):** A pill-shaped container holding Buttons to toggle the 3D viewport between **Model**, **DC Ratio**, and **Deflection** views.

## Three-Column Workspace

### Left Column: Dynamic Input Panel

A nested, collapsible navigation system for facade management. Overlaying the top of the workspace (rounded corner, card shaped, floating):

- **Category Index Bar (Far Left):** A slim, vertical index (1, 2, 3...) with a **"+"** button at the bottom for adding new facade types/categories. A category remove button at the top right corner of the category index button.
    - Category remove buttons (×) are **always visible** with subtle gray color, turn red on hover (no background change or scaling).
    - First category is deletable (only last remaining category is protected).
    - Use Sequential category numbering. Never allow gaps (e.g., 1,3,4). Always renumber on deletion.
    - With the right click of the category button, an icon can be set on top of index number.
    - On hover on the category button, category name with index number will show. (e.g., Category 01: Typical Cont. Facade)
    - On click of the category button, the Category Name will show in the Main Input Bar and the corresponding input fields will show in the internal navigation (Glass, Frame, Conn., Anchor.) based on the selected category. The 3D viewport and Design Summary will also update based on the selected category.
    - On click of the "+" button, a new category will be added to the index with default name "Category XX" (XX is the next sequential number). The new category will become the active category, showing its name in the Main Input Bar and its input fields in the internal navigation. The 3D viewport and Design Summary will also update for the new category.

- **Main Input Bar (with index bar):** Displays an editable **Category Name** at the top.

- **Internal Navigation:** Tabs for **Glass**, **Frame**, **Conn.** (Connection), and **Anchor.** (Anchorage) to switch between specific input sets. These input fields will update dynamically based on the selected category. For example, if "Category 01: Typical Cont. Facade" is selected, the input fields for Glass, Frame, Conn., and Anchor will show the values for that category. If "Category 02: Custom Facade" is selected, the input fields will show the values for that category. Input field should contain text as well as options with icons (imgae) as radio buttons or dropdowns. For example, for Glass Type input, there can be options like "Tempered", "Laminated", "Insulated" with corresponding icons. The user can select one of the options and the selected option will be highlighted. The input fields should also have tooltips with data-driven content (e.g., `data-title` attribute) that provide additional information about the input.

- **Collapse Mechanism:** A toggle button on the top right edge (slightly below from the top) of the input bar to collapse it back into the Category Index Bar.

### Center Column: 3D Viewport

- A high-performance **Three.js** full width canvas for structural visualization.

- Update dynamically based on the selected category and input data.

- Must react to the input value changes. Geometry/shape update with the input value change.

- Must react to the View Controls (Model, DC Ratio, Deflection) from the top floating bar.

- Separate model for separate facade type/category.

- Componets in 3d model will highlight upon component (glass, frame, conn, anchor) selection from input form nad vice versa.

- Include a **View Cube** (Front/Right/Top etc.) in the bottom-right corner for orientation.

### Right Column: Design Summary Panel

- A scrollable panel titled **Design Summary**.

- **Navigation Tabs:** **Facade** tab that update dynamically based on the selected category and input data. **Wind** tab dynamicallly updated from input data, category independent.

- **Result Cards:** Collapsible sections for Glass, Frame, Conn., and Anchor results in the facade tab. And collapsible sections for General, MWFRS, C&C results in the Wind tab.

- **Visual Cues:** Use green checkmarks next to passed ratios (e.g., "Stress Ratio: 0.17 ✔") and red x (e.g., "Stress Ratio: 1.2 X") for a professional engineering look.

- **Collapse Mechanism:** A toggle button on the top left edge (slightly below from the top) of the result card to collapse it to the right of the screen, no gap.

## UI/UX & Aesthetic Goals

- **Professionalism:** Use clean, minimalist "Engineering Software" aesthetic (use 'Branch Concepet Lite' (https://concept.branch3d.com/) app's as a reference.).

- **Responsiveness:** Ensure the 3-column layout handles different screen widths gracefully.

- **Interactivity:** Modals should be built using **shadcn/ui** for a native, polished feel.

- **Typography:** Clean sans-serif font (Inter font).

- **Animations:** Use smooth fast animantion, no abrupt changes

- **Data-driven tooltips**: Use data driven (like `data-title`) attribute, not hard-coded title attributes.

- Collapse/expand of the left and right panels should not have effect on 3d viewport width. The 3d viewport should always take the full width of the screen, and the left and right panels should overlay on top of the 3d viewport when they are expanded. When the panels are collapsed, they should hide behind the 3d viewport, not pushing the 3d viewport to resize.
