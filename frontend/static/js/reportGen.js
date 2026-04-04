// ============================
// Report Generation
// Collects all project data, sends to backend, downloads PDF
// ============================

import { categoryNames } from './category.js';
import { categoryIcons, DEFAULT_CATEGORY_ICON } from './categoryIcons.js';
import { _materials } from './materialProp.js';
import { _alumSections } from './alumSecProp.js';
import { _steelSections } from './steelSecProp.js';
import { getWindInputsForSave, getCurrentPanelMode, savedFacadeContent } from './inputPanel.js';

let _isGenerating = false;

function _setVal(id, value) {
    const el = document.getElementById(id);
    if (!el || value == null) return '';
    return el.value;
}

function _isChecked(id) {
    return document.getElementById(id)?.checked ?? true;
}

function _collectGeneralInfo() {
    const reportIncludes = {};
    ['toc', 'intro', 'material-specs', 'design-consideration',
     'idealization', 'theory', 'moment-capacity', 'wind-pressure',
     'categories', 'reference'].forEach(id => {
        reportIncludes[id] = _isChecked(id);
    });
    return {
        projectNumber: _setVal('gen-project-number'),
        projectName: _setVal('gen-project-name'),
        location: _setVal('gen-project-location'),
        client: _setVal('gen-client'),
        rev: _setVal('gen-date'),
        date: _setVal('gen-date'),
        description: _setVal('gen-description'),
        reportIncludes,
    };
}

function _collectCategoryInputs(catNum) {
    const content = document.querySelector(
        `.input__category-content[data-category="${catNum}"]`
    );
    if (!content) return {};
    const inputs = {};
    content.querySelectorAll('.input__tab-content').forEach(tabContent => {
        tabContent.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
            const variantParent = el.closest('.glass__type-fields, .frame__variant-fields, .anchor__variant-fields');
            if (!variantParent || !variantParent.classList.contains('hidden')) {
                inputs[el.id] = el.value;
            }
        });
    });
    return inputs;
}

function _collectCategoryInputsFromSavedFacade(catNum) {
    if (!savedFacadeContent) return {};
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = savedFacadeContent;
    const categoryContent = tempDiv.querySelector(
        `.input__category-content[data-category="${catNum}"]`
    );
    if (!categoryContent) return {};
    const inputs = {};
    categoryContent.querySelectorAll('.input__tab-content').forEach(tabContent => {
        tabContent.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
            const variantParent = el.closest('.glass__type-fields, .frame__variant-fields, .anchor__variant-fields');
            if (!variantParent || !variantParent.classList.contains('hidden')) {
                inputs[el.id] = el.value;
            }
        });
    });
    return inputs;
}

function _collectCategories() {
    const wrappers = document.querySelectorAll('.catbar__btn-wrapper');
    const isWindMode = getCurrentPanelMode() === 'wind';
    const categories = [];

    wrappers.forEach((wrapper, idx) => {
        const catNum = parseInt(wrapper.getAttribute('data-category'));
        const inputs = isWindMode
            ? _collectCategoryInputsFromSavedFacade(catNum)
            : _collectCategoryInputs(catNum);

        categories.push({
            index: idx + 1,
            name: categoryNames.get(catNum) || `Category ${idx + 1}`,
            icon: categoryIcons.get(catNum) || DEFAULT_CATEGORY_ICON,
            inputs,
        });
    });

    return categories;
}

function _cleanSections(sections) {
    return sections.map(s => {
        const c = { ...s };
        delete c._phi_Mn;
        delete c._I_xx;
        delete c._I_yy;
        delete c._nameEdited;
        return c;
    });
}

function collectReportData() {
    const generalInfo = _collectGeneralInfo();
    const categories = _collectCategories();
    const windInputs = getWindInputsForSave() || {};

    return {
        generalInfo,
        categories,
        windInputs,
        materials: _materials || [],
        alumSections: _cleanSections(_alumSections || []),
        steelSections: _cleanSections(_steelSections || []),
    };
}

async function _postReport(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${response.status}`);
    }

    return response.blob();
}

function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function _showStatus(message, isError = false) {
    const bar = document.getElementById('topbar__status-notification');
    if (!bar) return;
    bar.textContent = message;
    bar.classList.add('visible');
    if (isError) {
        bar.style.color = 'var(--text-error, #ef4444)';
    } else {
        bar.style.color = '';
    }
    setTimeout(() => {
        bar.classList.remove('visible');
        bar.style.color = '';
    }, 4000);
}

function _setReportButtonLoading(loading) {
    const btn = document.getElementById('report-btn');
    const dropdown = document.getElementById('report-dropdown');
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.classList.add('report-btn--loading');
        if (dropdown) dropdown.classList.remove('open');
    } else {
        btn.disabled = false;
        btn.classList.remove('report-btn--loading');
    }
}

async function generateFullReport() {
    if (_isGenerating) return;
    _isGenerating = true;
    _setReportButtonLoading(true);
    _showStatus('Generating report...');

    try {
        const data = collectReportData();
        const blob = await _postReport('/api/report/generate', data);
        const projectName = data.generalInfo?.projectName?.trim() || 'project';
        const safeName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
        _triggerDownload(blob, `${safeName}-report.pdf`);
        _showStatus('Report generated successfully');
    } catch (err) {
        console.error('[Report] Generation failed:', err);
        _showStatus(`Report failed: ${err.message}`, true);
    } finally {
        _isGenerating = false;
        _setReportButtonLoading(false);
    }
}

async function generateSummaryReport() {
    if (_isGenerating) return;
    _isGenerating = true;
    _showStatus('Generating summary report...');

    try {
        const data = collectReportData();
        const blob = await _postReport('/api/report/generate/summary', data);
        const projectName = data.generalInfo?.projectName?.trim() || 'project';
        const safeName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
        _triggerDownload(blob, `${safeName}-summary-report.pdf`);
        _showStatus('Summary report generated successfully');
    } catch (err) {
        console.error('[Report] Summary generation failed:', err);
        _showStatus(`Summary report failed: ${err.message}`, true);
    } finally {
        _isGenerating = false;
    }
}

function initReportGen() {
    console.log('[ReportGen] Initializing...');

    const reportBtn = document.getElementById('report-btn');
    const summaryItem = document.querySelector('.report__dropdown-item');

    if (reportBtn) {
        reportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            generateFullReport();
        });
    }

    if (summaryItem) {
        summaryItem.addEventListener('click', (e) => {
            e.preventDefault();
            generateSummaryReport();
            const dropdown = document.getElementById('report-dropdown');
            if (dropdown) dropdown.classList.remove('open');
        });
    }
}

export { initReportGen, generateFullReport, generateSummaryReport, collectReportData };
