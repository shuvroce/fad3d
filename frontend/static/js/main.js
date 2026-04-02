// ============================
// Main Application Entry Point
// ES6 Module Orchestrator
// ============================

// Import theme system
import { initTheme, initTooltips } from './theme.js';

// Import UI controls
import { initCustomSelect } from './customSelect.js';
import { initPanelMode, initializeLeftPanelToggle } from './inputPanel.js';
import { initViewControls, initFiguresPanel } from './viewControls.js';
import { initFigureChecker } from './figureChecker.js';

// Import category system
import { initCategories } from './category.js';
// NOTE: initializeCategoryIcons is called internally by initCategories() —
// do NOT import or call it here to avoid duplicate listener registration.

// Import input handlers
import { initGlassInput } from './glassInput.js';
import { initFrameInput } from './frameInput.js';
import { initAnchorInput } from './anchorInput.js';

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

// Import project save/load
import { initProjectSaveLoad } from './projectSaveLoad.js';


// ============================
// Initialization Sequence
// ============================

// Phase 1: Immediate initialization (before DOM ready)
function initPhase1() {
    console.log('[Main] Phase 1: Theme initialization');
    try {
        initTheme();
        console.log('[Main] ✓ Theme initialized');
    } catch (error) {
        console.error('[Main] ✗ Theme initialization failed:', error);
    }
}

// Phase 2: DOM-dependent initialization
async function initPhase2() {
    console.log('[Main] Phase 2: Core UI initialization');

    try {
        initTooltips();
        console.log('[Main] ✓ Tooltips initialized');
    } catch (error) {
        console.error('[Main] ✗ Tooltips initialization failed:', error);
    }

    try {
        initializeLeftPanelToggle();
        console.log('[Main] ✓ Left panel toggle initialized');
    } catch (error) {
        console.error('[Main] ✗ Left panel toggle initialization failed:', error);
    }

    try {
        initializeRightPanelToggle();
        console.log('[Main] ✓ Right panel toggle initialized');
    } catch (error) {
        console.error('[Main] ✗ Right panel toggle initialization failed:', error);
    }

    try {
        initCustomSelect();
        console.log('[Main] ✓ Custom select initialized');
    } catch (error) {
        console.error('[Main] ✗ Custom select initialization failed:', error);
    }

    try {
        initPanelMode();
        console.log('[Main] ✓ Panel mode initialized');
    } catch (error) {
        console.error('[Main] ✗ Panel mode initialization failed:', error);
    }

    try {
        initViewControls();
        console.log('[Main] ✓ View controls initialized');
    } catch (error) {
        console.error('[Main] ✗ View controls initialization failed:', error);
    }

    try {
        initProjectSaveLoad();
        console.log('[Main] ✓ Project save/load initialized');
    } catch (error) {
        console.error('[Main] ✗ Project save/load initialization failed:', error);
    }

    try {
        initFiguresPanel();
        console.log('[Figure] ✓ Figure panel initialized');
    } catch (error) {
        console.error('[Figure] ✗ Figure panel initialization failed:', error);
    }

    try {
        await initFigureChecker();
        console.log('[Figure] ✓ Figure checker initialized');
    } catch (error) {
        console.error('[Figure] ✗ Figure checker initialization failed:', error);
    }
}

// Phase 3: Category system and input handlers
async function initPhase3() {
    console.log('[Main] Phase 3: Category system and input handlers');

    try {
        // initCategories() internally calls initializeCategoryIcons() —
        // no separate call needed here.
        await initCategories();
        console.log('[Main] ✓ Categories initialized');
        console.log('[Main] ✓ Category icons initialized');
    } catch (error) {
        console.error('[Main] ✗ Categories initialization failed:', error);
    }

    try {
        initGlassInput();
        console.log('[Main] ✓ Glass input handlers initialized');
    } catch (error) {
        console.error('[Main] ✗ Glass input initialization failed:', error);
    }

    try {
        initFrameInput();
        console.log('[Main] ✓ Frame input handlers initialized');
    } catch (error) {
        console.error('[Main] ✗ Frame input initialization failed:', error);
    }

    try {
        initAnchorInput();
        console.log('[Main] ✓ Anchor input handlers initialized');
    } catch (error) {
        console.error('[Main] ✗ Anchor input initialization failed:', error);
    }
}

// Phase 4: Modal system
function initPhase4() {
    console.log('[Main] Phase 4: Modal system');

    try {
        initModals();
        console.log('[Main] ✓ Modals initialized');
    } catch (error) {
        console.error('[Main] ✗ Modals initialization failed:', error);
    }

    try {
        initFloatingBarModals();
        console.log('[Main] ✓ Floating bar modals initialized');
    } catch (error) {
        console.error('[Main] ✗ Floating bar modals initialization failed:', error);
    }

    try {
        initGeneralModal();
        console.log('[Main] ✓ General info modal initialized');
    } catch (error) {
        console.error('[Main] ✗ General info modal initialization failed:', error);
    }

    try {
        initMaterialModal();
        console.log('[Main] ✓ Material properties modal initialized');
    } catch (error) {
        console.error('[Main] ✗ Material modal initialization failed:', error);
    }

    try {
        initAlumSectionModal();
        console.log('[Main] ✓ Aluminum section modal initialized');
    } catch (error) {
        console.error('[Main] ✗ Aluminum section modal initialization failed:', error);
    }

    try {
        initSteelSectionModal();
        console.log('[Main] ✓ Steel section modal initialized');
    } catch (error) {
        console.error('[Main] ✗ Steel section modal initialization failed:', error);
    }

    try {
        initSettingsModal();
        console.log('[Main] ✓ Settings modal initialized');
    } catch (error) {
        console.error('[Main] ✗ Settings modal initialization failed:', error);
    }
}

// Phase 5: Results panel
function initPhase5() {
    console.log('[Main] Phase 5: Results system');

    try {
        initializeResultPanel();
        console.log('[Main] ✓ Result panel initialized');
    } catch (error) {
        console.error('[Main] ✗ Result panel initialization failed:', error);
    }
}

// Phase 6: Calculation engine and report (after all inputs ready)
function initPhase6() {
    console.log('[Main] Phase 6: Calculation engine and report');

    try {
        initCalcEngine();
        console.log('[Main] ✓ Calculation engine initialized');
    } catch (error) {
        console.error('[Main] ✗ Calculation engine initialization failed:', error);
    }

    try {
        initReportDropdown();
        console.log('[Main] ✓ Report dropdown initialized');
    } catch (error) {
        console.error('[Main] ✗ Report dropdown initialization failed:', error);
    }
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