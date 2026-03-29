// ============================
// Steel Section Properties Modal
// ============================

import { openModal, closeModal } from './floatingBar.js';
import { _materials, populateSecGradeOptions, animateDefineForm } from './materialProp.js';

const DEFAULT_STEEL_SECTIONS = [
    { name: 'RHS 85x50x2.5', profileType: 'steel-rhs', grade: '', d: '85', b: '50',  t: '2.5', tf: '',  tw: '' },
    { name: 'W 85x50x4-3',   profileType: 'steel-w',   grade: '', d: '85', b: '50',  t: '',    tf: '4', tw: '3' },
];

let _steelSections = DEFAULT_STEEL_SECTIONS.map(s => ({ ...s }));
let _selectedSteelSecIdx = -1;

let _steelCalcDebounce = null;

function updateSteelCalcPanel() {
    clearTimeout(_steelCalcDebounce);
    _steelCalcDebounce = setTimeout(_fetchSteelCalc, 300);
}

function _fetchSteelCalc() {
    const profileType = document.getElementById('steel-sec-profile-type')?.value || '';
    const v = id => document.getElementById(id)?.value || null;

    // Resolve F_y from the selected material grade
    const gradeName = document.getElementById('steel-sec-grade')?.value || '';
    const mat = _materials.find(m => m.name === gradeName);
    const fy = mat ? (mat.fy || null) : null;

    const payload = {
        profile_type: profileType,
        d:  v('steel-sec-d'),
        b:  v('steel-sec-b'),
        t:  v('steel-sec-t'),
        tf: v('steel-sec-tf'),
        tw: v('steel-sec-tw'),
        fy,
    };

    fetch('/api/section/calc/steel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    })
    .then(r => r.ok ? r.json() : null)
    .then(props => {
        if (!props) return;
        const fmt = (v, dp = 1) => (v != null && v !== '') ? Number(v).toLocaleString('en', { maximumFractionDigits: dp }) : '—';
        document.getElementById('calc-steel-a').textContent      = fmt(props.area);
        document.getElementById('calc-steel-ix').textContent     = fmt(props.I_xx);
        document.getElementById('calc-steel-iy').textContent     = fmt(props.I_yy);
        document.getElementById('calc-steel-sx').textContent     = fmt(props.S_x);
        document.getElementById('calc-steel-sy').textContent     = fmt(props.S_y);
        document.getElementById('calc-steel-zx').textContent     = fmt(props.Z_x);
        document.getElementById('calc-steel-j').textContent      = fmt(props.tor_constant);
        document.getElementById('calc-steel-phi-mn').textContent = fmt(props.phi_Mn);

        // Cache computed section properties into the section object for use in frame calculation
        if (_selectedSteelSecIdx >= 0 && _steelSections[_selectedSteelSecIdx]) {
            const sec = _steelSections[_selectedSteelSecIdx];
            sec._phi_Mn = props.phi_Mn;
            sec._I_xx   = props.I_xx;
            sec._I_yy   = props.I_yy;
        }
    })
    .catch(() => {});
}


function applySteelSecVisibility(profileType) {
    const form = document.getElementById('steel-section-form');
    if (!form) return;
    form.querySelectorAll('[data-steel-group]').forEach(el => {
        el.classList.toggle('hidden', el.getAttribute('data-steel-group') !== profileType);
    });
    const calcPane = document.getElementById('steel-calc-pane');
    if (calcPane) calcPane.hidden = false;
    updateSteelCalcPanel();
}

function autoNameSteelSection() {
    if (_selectedSteelSecIdx < 0 || _steelSections[_selectedSteelSecIdx]?._nameEdited) return;
    const autoName = 'Steel Section';
    document.getElementById('steel-sec-name').value = autoName;
    _steelSections[_selectedSteelSecIdx].name = autoName;
    const item = document.querySelector(`#steel-section-list [data-idx="${_selectedSteelSecIdx}"] .define-modal__item-name`);
    if (item) item.textContent = autoName;
}

function renderSteelSectionList() {
    const list = document.getElementById('steel-section-list');
    if (!list) return;
    list.innerHTML = '';
    _steelSections.forEach((sec, i) => {
        const li = document.createElement('li');
        li.className = 'define-modal__list-item' + (i === _selectedSteelSecIdx ? ' active' : '');
        li.dataset.idx = i;
        li.draggable = true;
        li.innerHTML = `
            <span class="define-modal__drag-handle" aria-hidden="true">
                <svg viewBox="0 0 24 24"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>
            </span>
            <span class="define-modal__item-name">${sec.name || `Section ${i + 1}`}</span>
            <button type="button" class="define-modal__del-btn" aria-label="Remove">&times;</button>
        `;
        li.querySelector('.define-modal__del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            _steelSections.splice(i, 1);
            if (_selectedSteelSecIdx >= _steelSections.length) _selectedSteelSecIdx = _steelSections.length - 1;
            renderSteelSectionList();
            showSteelSectionForm();
        });
        li.addEventListener('click', () => {
            syncSteelSectionFromForm();
            _selectedSteelSecIdx = i;
            renderSteelSectionList();
            showSteelSectionForm();
        });
        list.appendChild(li);
    });
    initSteelSectionDrag();
}

function showSteelSectionForm() {
    const form = document.getElementById('steel-section-form');
    if (!form) return;
    const calcPane = document.getElementById('steel-calc-pane');
    if (_selectedSteelSecIdx < 0 || _selectedSteelSecIdx >= _steelSections.length) {
        form.hidden = true;
        if (calcPane) calcPane.hidden = true;
        return;
    }
    form.hidden = false;
    const sec = _steelSections[_selectedSteelSecIdx];

    document.getElementById('steel-sec-name').value = sec.name || '';
    populateSecGradeOptions('Steel', sec.grade, 'steel-sec-grade');

    const profileTypeSel = document.getElementById('steel-sec-profile-type');
    if (profileTypeSel) profileTypeSel.value = sec.profileType || '';

    document.getElementById('steel-sec-d').value  = sec.d  || '';
    document.getElementById('steel-sec-b').value  = sec.b  || '';
    document.getElementById('steel-sec-t').value  = sec.t  || '';
    document.getElementById('steel-sec-tf').value = sec.tf || '';
    document.getElementById('steel-sec-tw').value = sec.tw || '';

    applySteelSecVisibility(sec.profileType || '');
    animateDefineForm(form);
}

function syncSteelSectionFromForm() {
    if (_selectedSteelSecIdx < 0 || _selectedSteelSecIdx >= _steelSections.length) return;
    const sec       = _steelSections[_selectedSteelSecIdx];
    sec.profileType = document.getElementById('steel-sec-profile-type')?.value || '';
    sec.name        = document.getElementById('steel-sec-name')?.value         || '';
    sec.grade       = document.getElementById('steel-sec-grade')?.value        || '';
    sec.d           = document.getElementById('steel-sec-d')?.value            || '';
    sec.b           = document.getElementById('steel-sec-b')?.value            || '';
    sec.t           = document.getElementById('steel-sec-t')?.value            || '';
    sec.tf          = document.getElementById('steel-sec-tf')?.value           || '';
    sec.tw          = document.getElementById('steel-sec-tw')?.value           || '';
}

function initSteelSectionFormEvents() {
    const nameInput      = document.getElementById('steel-sec-name');
    const profileTypeSel = document.getElementById('steel-sec-profile-type');
    if (!nameInput) return;

    nameInput.addEventListener('input', () => {
        if (_selectedSteelSecIdx < 0) return;
        _steelSections[_selectedSteelSecIdx].name = nameInput.value;
        _steelSections[_selectedSteelSecIdx]._nameEdited = !!nameInput.value;
        const item = document.querySelector(`#steel-section-list [data-idx="${_selectedSteelSecIdx}"] .define-modal__item-name`);
        if (item) item.textContent = nameInput.value || `Section ${_selectedSteelSecIdx + 1}`;
    });

    profileTypeSel?.addEventListener('change', () => {
        applySteelSecVisibility(profileTypeSel.value);
        syncSteelSectionFromForm();
    });

    document.getElementById('steel-sec-grade')?.addEventListener('change', updateSteelCalcPanel);
    const form = document.getElementById('steel-section-form');
    form?.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('input', updateSteelCalcPanel);
    });
}

function initSteelSectionDrag() {
    const list = document.getElementById('steel-section-list');
    if (!list) return;
    let dragIdx = null;
    list.querySelectorAll('.define-modal__list-item').forEach(li => {
        li.addEventListener('dragstart', (e) => {
            dragIdx = parseInt(li.dataset.idx);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => li.style.opacity = '0.45', 0);
        });
        li.addEventListener('dragend', () => {
            li.style.opacity = '';
            list.querySelectorAll('.define-modal__list-item').forEach(el => el.classList.remove('drag-over'));
        });
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.querySelectorAll('.define-modal__list-item').forEach(el => el.classList.remove('drag-over'));
            if (parseInt(li.dataset.idx) !== dragIdx) li.classList.add('drag-over');
        });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const tgtIdx = parseInt(li.dataset.idx);
            if (dragIdx !== null && tgtIdx !== dragIdx) {
                const moved = _steelSections.splice(dragIdx, 1)[0];
                _steelSections.splice(tgtIdx, 0, moved);
                if (_selectedSteelSecIdx === dragIdx) _selectedSteelSecIdx = tgtIdx;
                else if (_selectedSteelSecIdx > dragIdx && _selectedSteelSecIdx <= tgtIdx) _selectedSteelSecIdx--;
                else if (_selectedSteelSecIdx < dragIdx && _selectedSteelSecIdx >= tgtIdx) _selectedSteelSecIdx++;
                renderSteelSectionList();
            }
            dragIdx = null;
        });
    });
}

function openSteelSectionModal() {
    document.getElementById('define-submenu').hidden = true;
    document.getElementById('section-submenu').hidden = true;
    document.getElementById('define-wrap')?.classList.remove('open');

    if (!_steelSections.length) {
        _steelSections = DEFAULT_STEEL_SECTIONS.map(s => ({ ...s }));
    }
    _selectedSteelSecIdx = _steelSections.length ? 0 : -1;

    renderSteelSectionList();
    showSteelSectionForm();
    initSteelSectionFormEvents();

    const modal    = document.getElementById('steel-section-modal');
    const addBtn   = document.getElementById('add-steel-sec-btn');
    const closeBtn = document.getElementById('close-steel-section-modal');
    const applyBtn = document.getElementById('apply-steel-section-modal');

    addBtn.onclick = () => {
        syncSteelSectionFromForm();
        _steelSections.push({ name: '', profileType: '', grade: '', d: '', b: '', t: '', tf: '', tw: '' });
        _selectedSteelSecIdx = _steelSections.length - 1;
        renderSteelSectionList();
        showSteelSectionForm();
    };
    const dispatchChange = () => document.dispatchEvent(new CustomEvent('frame-sections-changed'));
    closeBtn.onclick = () => { syncSteelSectionFromForm(); closeModal('steel-section-modal'); dispatchChange(); };
    applyBtn.onclick = () => { syncSteelSectionFromForm(); closeModal('steel-section-modal'); dispatchChange(); };
    modal.onclick = (e) => { if (e.target === modal) { syncSteelSectionFromForm(); closeModal('steel-section-modal'); dispatchChange(); } };

    openModal('steel-section-modal');
}

export function initSteelSectionModal() {
    document.getElementById('section-steel-btn')?.addEventListener('click', openSteelSectionModal);
}

export { _steelSections };
