// ============================
// Material Properties Modal
// ============================

import { openModal, closeModal } from './floatingBar.js';

const MATERIAL_DATA = {
    'Aluminum': {
        '6063-T5': { e: '70000', fy: '110', fu: '150' },
        '6063-T6': { e: '70000', fy: '172', fu: '207' },
        '6061-T6': { e: '70000', fy: '241', fu: '262' },
        'Manual':  { e: '',      fy: '',    fu: ''    },
    },
    'Steel': {
        'A36':         { e: '200000', fy: '250', fu: '400' },
        'A500 Gr. B':  { e: '200000', fy: '317', fu: '400' },
        'A572 Gr. 50': { e: '200000', fy: '345', fu: '450' },
        'A992 Gr. 50': { e: '200000', fy: '345', fu: '450' },
        'Manual':      { e: '',       fy: '',    fu: '' },
    },
};

const DEFAULT_MATERIALS = [
    { name: '6063-T5',      type: 'Aluminum', grade: '6063-T5',     e: '70000',  fy: '110', fu: '150' },
    { name: '6063-T6',      type: 'Aluminum', grade: '6063-T5',     e: '70000',  fy: '172', fu: '207' },
    { name: '6061-T6',      type: 'Aluminum', grade: '6061-T6',     e: '70000',  fy: '241', fu: '262' },
    { name: 'A500 Gr. B',   type: 'Steel',    grade: 'A500 Gr. B',  e: '200000', fy: '317', fu: '400' },
    { name: 'A572 Gr. 50',  type: 'Steel',    grade: 'A572 Gr. 50', e: '200000', fy: '345', fu: '450' },
];

let _materials = [];
let _selectedMatIdx = -1;
let _materialSnapshot = null;
let _selectedMatIdxSnapshot = -1;

function cloneMaterialList(materials) {
    return materials.map(m => ({ ...m }));
}

function startMaterialEditSession() {
    _materialSnapshot = cloneMaterialList(_materials);
    _selectedMatIdxSnapshot = _selectedMatIdx;
}

function rollbackMaterialEditSession() {
    if (!_materialSnapshot) return;
    _materials = cloneMaterialList(_materialSnapshot);
    _selectedMatIdx = Math.min(Math.max(_selectedMatIdxSnapshot, -1), _materials.length - 1);
    _materialSnapshot = null;
    _selectedMatIdxSnapshot = -1;
}

function commitMaterialEditSession() {
    _materialSnapshot = null;
    _selectedMatIdxSnapshot = -1;
}

// --- Shared utility used by section modules ---

function populateSecGradeOptions(material, selectedGrade = null, elementId = 'sec-grade') {
    const sel = document.getElementById(elementId);
    if (!sel) return;
    sel.innerHTML = '';
    const filtered = _materials.filter(m => m.type === material);
    if (!filtered.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— No materials defined —';
        sel.appendChild(opt);
        return;
    }
    filtered.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        if (m.name === selectedGrade) opt.selected = true;
        sel.appendChild(opt);
    });
}

// --- Material modal internals ---

function populateGradeOptions(gradeSelect, type, selectedGrade = null) {
    gradeSelect.innerHTML = '';
    Object.keys(MATERIAL_DATA[type] || {}).forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        if (g === selectedGrade) opt.selected = true;
        gradeSelect.appendChild(opt);
    });
}

function renderMaterialList() {
    const list = document.getElementById('material-list');
    if (!list) return;
    list.innerHTML = '';
    _materials.forEach((mat, i) => {
        const li = document.createElement('li');
        li.className = 'define-modal__list-item' + (i === _selectedMatIdx ? ' active' : '');
        li.dataset.idx = i;
        li.draggable = true;
        li.innerHTML = `
            <span class="define-modal__drag-handle" aria-hidden="true">
                <svg viewBox="0 0 24 24"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>
            </span>
            <span class="define-modal__item-name">${mat.name || `Material ${i + 1}`}</span>
            <button type="button" class="define-modal__del-btn" aria-label="Remove">&times;</button>
        `;
        li.querySelector('.define-modal__del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            _materials.splice(i, 1);
            if (_selectedMatIdx >= _materials.length) _selectedMatIdx = _materials.length - 1;
            renderMaterialList();
            showMaterialForm();
        });
        li.addEventListener('click', () => {
            syncMaterialFromForm();
            _selectedMatIdx = i;
            renderMaterialList();
            showMaterialForm();
        });
        list.appendChild(li);
    });
    initMaterialDrag();
}

function animateDefineForm(form) {
    form.classList.remove('animate-in');
    void form.offsetWidth;
    form.classList.add('animate-in');
}

function showMaterialForm() {
    const form  = document.getElementById('material-form');
    if (!form) return;
    if (_selectedMatIdx < 0 || _selectedMatIdx >= _materials.length) {
        form.hidden = true;
        return;
    }
    form.hidden = false;
    const mat = _materials[_selectedMatIdx];
    document.getElementById('mat-name').value = mat.name  || '';
    document.getElementById('mat-type').value = mat.type  || 'Aluminum';
    populateGradeOptions(document.getElementById('mat-grade'), mat.type || 'Aluminum', mat.grade);
    setMatProps(mat.type || 'Aluminum', mat.grade, mat.e, mat.fy, mat.fu);
    animateDefineForm(form);
}

function setMatProps(type, grade, eOverride, fyOverride, fuOverride) {
    const props    = MATERIAL_DATA[type]?.[grade] || { e: '', fy: '', fu: '' };
    const isManual = grade === 'Manual';
    const eInput   = document.getElementById('mat-e');
    const fyInput  = document.getElementById('mat-fy');
    const fuInput  = document.getElementById('mat-fu');
    eInput.value   = eOverride !== undefined ? eOverride : props.e;
    fyInput.value  = fyOverride !== undefined ? fyOverride : props.fy;
    fuInput.value  = fuOverride !== undefined ? fuOverride : props.fu;
    eInput.disabled  = !isManual;
    fyInput.disabled = !isManual;
    fuInput.disabled = !isManual;
    eInput.classList.toggle('define-list__input--readonly', !isManual);
    fyInput.classList.toggle('define-list__input--readonly', !isManual);
    fuInput.classList.toggle('define-list__input--readonly', !isManual);
}

function syncMaterialFromForm() {
    if (_selectedMatIdx < 0 || _selectedMatIdx >= _materials.length) return;
    const mat = _materials[_selectedMatIdx];
    mat.name  = document.getElementById('mat-name')?.value  || '';
    mat.type  = document.getElementById('mat-type')?.value  || 'Aluminum';
    mat.grade = document.getElementById('mat-grade')?.value || '6063-T5';
    mat.e     = document.getElementById('mat-e')?.value     || '';
    mat.fy    = document.getElementById('mat-fy')?.value    || '';
    mat.fu    = document.getElementById('mat-fu')?.value    || '';
}

function initMaterialFormEvents() {
    const typeSelect  = document.getElementById('mat-type');
    const gradeSelect = document.getElementById('mat-grade');
    const nameInput   = document.getElementById('mat-name');
    if (!typeSelect) return;

    nameInput.addEventListener('input', () => {
        if (_selectedMatIdx < 0) return;
        _materials[_selectedMatIdx].name = nameInput.value;
        const item = document.querySelector(`#material-list [data-idx="${_selectedMatIdx}"] .define-modal__item-name`);
        if (item) item.textContent = nameInput.value || `Material ${_selectedMatIdx + 1}`;
        _materials[_selectedMatIdx]._nameEdited = !!nameInput.value;
    });

    typeSelect.addEventListener('change', () => {
        populateGradeOptions(gradeSelect, typeSelect.value);
        const grade = gradeSelect.value;
        setMatProps(typeSelect.value, grade);
        if (_selectedMatIdx >= 0 && !_materials[_selectedMatIdx]._nameEdited) {
            const autoName = grade;
            nameInput.value = autoName;
            _materials[_selectedMatIdx].name = autoName;
            const item = document.querySelector(`#material-list [data-idx="${_selectedMatIdx}"] .define-modal__item-name`);
            if (item) item.textContent = autoName;
        }
        syncMaterialFromForm();
    });

    gradeSelect.addEventListener('change', () => {
        const grade = gradeSelect.value;
        setMatProps(typeSelect.value, grade);
        if (_selectedMatIdx >= 0 && !_materials[_selectedMatIdx]._nameEdited) {
            const autoName = grade;
            nameInput.value = autoName;
            _materials[_selectedMatIdx].name = autoName;
            const item = document.querySelector(`#material-list [data-idx="${_selectedMatIdx}"] .define-modal__item-name`);
            if (item) item.textContent = autoName;
        }
        syncMaterialFromForm();
    });
}

function initMaterialDrag() {
    const list = document.getElementById('material-list');
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
                const moved = _materials.splice(dragIdx, 1)[0];
                _materials.splice(tgtIdx, 0, moved);
                if (_selectedMatIdx === dragIdx) _selectedMatIdx = tgtIdx;
                else if (_selectedMatIdx > dragIdx && _selectedMatIdx <= tgtIdx) _selectedMatIdx--;
                else if (_selectedMatIdx < dragIdx && _selectedMatIdx >= tgtIdx) _selectedMatIdx++;
                renderMaterialList();
            }
            dragIdx = null;
        });
    });
}

function initMaterialModal() {
    const modal    = document.getElementById('material-modal');
    const addBtn   = document.getElementById('add-material-btn');
    const closeBtn = document.getElementById('close-material-modal');
    const applyBtn = document.getElementById('apply-material-modal');
    if (!modal) return;

    document.getElementById('material-modal-btn')?.addEventListener('click', () => {
        document.getElementById('define-submenu').hidden = true;
        document.getElementById('define-wrap')?.classList.remove('open');
        startMaterialEditSession();
        if (_selectedMatIdx < 0 && _materials.length) _selectedMatIdx = 0;
        renderMaterialList();
        showMaterialForm();
        openModal('material-modal');
    });

    addBtn?.addEventListener('click', () => {
        syncMaterialFromForm();
        _materials.push({ name: '', type: 'Aluminum', grade: '6063-T5', e: '70000', fy: '110', fu: '150' });
        _selectedMatIdx = _materials.length - 1;
        renderMaterialList();
        showMaterialForm();
        document.getElementById('mat-name')?.focus();
    });

    closeBtn?.addEventListener('click', () => { rollbackMaterialEditSession(); closeModal('material-modal'); });
    applyBtn?.addEventListener('click', () => { syncMaterialFromForm(); commitMaterialEditSession(); closeModal('material-modal'); });
    modal.addEventListener('click', (e) => { if (e.target === modal) applyBtn?.click(); });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (modal.style.display !== 'block') return;
        rollbackMaterialEditSession();
    });

    initMaterialFormEvents();
}

export { _materials, DEFAULT_MATERIALS, populateSecGradeOptions, animateDefineForm, initMaterialModal };

export function getMaterials() { return _materials; }
