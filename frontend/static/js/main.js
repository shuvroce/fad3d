// ============================
// Main Application Entry Point
// ES6 Module Orchestrator
// ============================

console.log('%c[FAD3D] main.js loaded - version 2.0', 'color: green; font-weight: bold; font-size: 14px;');

// Import theme system
import { initTheme, initTooltips } from './theme.js';

// Import UI controls
import { initPanelMode, initializeLeftPanelToggle } from './inputPanel.js';
import { initViewControls, initFiguresPanel, initFilterPanel } from './viewControls.js';
import { initFigureChecker } from './figureChecker.js';
import { initWindView } from './windView.js';
import { initFacadeView } from './facadeView.js';

// Import category system
import { initCategories } from './category.js';
// NOTE: initializeCategoryIcons is called internally by initCategories() —
// do NOT import or call it here to avoid duplicate listener registration.

// Import input handlers
import { initGlassInput } from './glassInput.js';
import { initFrameInput } from './frameInput.js';
import { initAnchorInput } from './anchorInput.js';
import { initGeneralInput } from './generalInput.js';

// Import modal system
import { initModals } from './modals.js';
import { initFloatingBarModals } from './floatingBar.js';
import { initGeneralModal } from './generalInfo.js';
import { initMaterialModal } from './materialProp.js';
import { initAlumSectionModal } from './alumSecProp.js';
import { initSteelSectionModal } from './steelSecProp.js';
import { initSettingsModal } from './settings.js';

// Import calculation engine
import { initCalcEngine } from './calcEngine.js';

// Import results system
import { initializeResultPanel, initializeRightPanelToggle } from './resultPanel.js';

// Import report system
import { initReportDropdown } from './report.js';
import { initReportGen } from './reportGen.js';

// Import project save/load
import { initProjectSaveLoad } from './projectSaveLoad.js';

// Import keyboard shortcuts
import { initKeybinds } from './keybinds.js';


// ============================
// Initialization Sequence
// ============================

const _safe = (name, fn) => { try { fn(); } catch (e) { console.error(`[Main] ${name} failed:`, e); } };
const _safeAsync = async (name, fn) => { try { await fn(); } catch (e) { console.error(`[Main] ${name} failed:`, e); } };

// Phase 1: Immediate initialization (before DOM ready)
function initPhase1() {
    console.log('[Main] Phase 1: Theme initialization');
    _safe('Theme', initTheme);
}

// Phase 2: Core UI initialization (order matters for dependencies)
async function initPhase2() {
    console.log('[Main] Phase 2: Core UI initialization');

    // Check if viewport container exists
    const viewport3d = document.getElementById('viewport-3d');
    if (viewport3d) {
        console.log('[Main] viewport-3d container found, size:', viewport3d.clientWidth, 'x', viewport3d.clientHeight);
    } else {
        console.error('[Main] viewport-3d container NOT FOUND');
    }

    _safe('Tooltips', initTooltips);
    _safe('Left panel toggle', initializeLeftPanelToggle);
    _safe('Right panel toggle', initializeRightPanelToggle);
    _safe('View controls', initViewControls);
    _safe('Project save/load', initProjectSaveLoad);
    _safe('Figures panel', initFiguresPanel);
    _safe('Filter panel', initFilterPanel);
    _safe('Keybinds', initKeybinds);

    // Initialize categories BEFORE views (views depend on category DOM elements)
    await _safeAsync('Categories', initCategories);

    // Initialize both views (they get shown/hidden by initPanelMode based on current mode)
    try {
        await initWindView();
    } catch (e) {
        console.error('[Main] initWindView failed:', e);
    }

    try {
        await initFacadeView();
    } catch (e) {
        console.error('[Main] initFacadeView failed:', e);
    }

    // Panel mode init AFTER views (triggers show/hide based on current mode)
    _safe('Panel mode', initPanelMode);

    await _safeAsync('Figure checker', initFigureChecker);
}

// Phase 3: Input handlers (categories already initialized)
async function initPhase3() {
    console.log('[Main] Phase 3: Input handlers');
    _safe('Glass input', initGlassInput);
    _safe('Frame input', initFrameInput);
    _safe('Anchor input', initAnchorInput);
    _safe('General input', initGeneralInput);
}

// Phase 4: Modal system
function initPhase4() {
    console.log('[Main] Phase 4: Modal system');
    _safe('Modals', initModals);
    _safe('Floating bar modals', initFloatingBarModals);
    _safe('General info modal', initGeneralModal);
    _safe('Material modal', initMaterialModal);
    _safe('Aluminum section modal', initAlumSectionModal);
    _safe('Steel section modal', initSteelSectionModal);
    _safe('Settings modal', initSettingsModal);
}

// Phase 5: Results panel
function initPhase5() {
    console.log('[Main] Phase 5: Results system');
    _safe('Result panel', initializeResultPanel);
}

// Phase 6: Calculation engine and report (after all inputs ready)
function initPhase6() {
    console.log('[Main] Phase 6: Calculation engine and report');
    _safe('Calculation engine', initCalcEngine);
    _safe('Report dropdown', initReportDropdown);
    _safe('Report generation', initReportGen);
}

// ============================
// Bootstrap Application
// ============================

// Phase 1: Run immediately
initPhase1();

// Phases 2-6: Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await initPhase2();
        await initPhase3();
        initPhase4();
        initPhase5();

        // Delay phase 6 to ensure all DOM manipulation is complete
        window.addEventListener('load', () => {
            initPhase6();
            console.log('[Main] ✓ All initialization phases complete');
        });
    });
} else {
    // DOM already loaded
    (async () => {
        await initPhase2();
        await initPhase3();
        initPhase4();
        initPhase5();

        // Delay phase 6 slightly if DOM is already loaded
        setTimeout(() => {
            initPhase6();
            console.log('[Main] ✓ All initialization phases complete');
        }, 0);
    })();
}