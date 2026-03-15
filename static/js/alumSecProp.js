// ============================
// Aluminum Section Properties Modal
// ============================

const ALUMINUM_PREDEFINED = {
    'RHS 50×25×2':   { b: '50',  d: '25',  tf: '2', tw: '2', a: '280',   ix: '27300',   sx: '2190'  },
    'RHS 100×50×3':  { b: '100', d: '50',  tf: '3', tw: '3', a: '864',   ix: '196000',  sx: '7830'  },
    'RHS 150×65×3':  { b: '150', d: '65',  tf: '3', tw: '3', a: '1248',  ix: '569000',  sx: '17500' },
    'RHS 200×75×4':  { b: '200', d: '75',  tf: '4', tw: '4', a: '2112',  ix: '1610000', sx: '42900' },
    'SHS 50×50×3':   { b: '50',  d: '50',  tf: '3', tw: '3', a: '564',   ix: '117000',  sx: '4680'  },
    'SHS 100×100×4': { b: '100', d: '100', tf: '4', tw: '4', a: '1504',  ix: '1020000', sx: '20400' },
};

const DEFAULT_ALUM_SECTIONS = [
    { name: 'RHS 100×50×3', material: 'Aluminum', profileType: 'predefined', shape: 'RHS 100×50×3', grade: '', b: '100', d: '50',  tf: '3', tw: '3', a: '864', ix: '196000', sx: '7830' },
    { name: 'Alum. Stick',  material: 'Aluminum', profileType: 'stick',      shape: '',             grade: '', b: '150', d: '65',  tf: '3', tw: '4', a: '',    ix: '',       sx: ''     },
];

let _alumSections = DEFAULT_ALUM_SECTIONS.map(s => ({ ...s }));
let _selectedAlumSecIdx = -1;

function populateAlumSecShapeOptions(selectedShape = null) {
    const sel = document.getElementById('alum-sec-shape');
    if (!sel) return;
    sel.innerHTML = '';
    if (selectedShape === null) {
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '—';
        sel.appendChild(blank);
        return;
    }
    Object.keys(ALUMINUM_PREDEFINED).forEach(shape => {
        const opt = document.createElement('option');
        opt.value = shape;
        opt.textContent = shape;
        if (shape === selectedShape) opt.selected = true;
        sel.appendChild(opt);
    });
}

function fillPredefinedShape(shape) {
    const props = ALUMINUM_PREDEFINED[shape];
    if (!props) return;
    ['b', 'd', 'tf', 'tw', 'a', 'ix', 'sx'].forEach(p => {
        const el = document.getElementById(`alum-sec-${p}`);
        if (el) el.value = props[p] || '';
    });
}

function applyAlumSecEditability(profileType) {
    const isPredefined  = profileType === 'predefined';
    const dimsEditable  = profileType === 'stick' || profileType === 'manual';
    const propsEditable = profileType === 'manual';

    const rules = {
        'alum-sec-b':  dimsEditable,
        'alum-sec-d':  dimsEditable,
        'alum-sec-tf': dimsEditable,
        'alum-sec-tw': dimsEditable,
        'alum-sec-a':  propsEditable,
        'alum-sec-ix': propsEditable,
        'alum-sec-sx': propsEditable,
    };
    Object.entries(rules).forEach(([id, editable]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = !editable;
        el.classList.toggle('define-list__input--readonly', !editable);
    });

    const shapeSel = document.getElementById('alum-sec-shape');
    if (shapeSel) {
        shapeSel.disabled = !isPredefined;
        shapeSel.classList.toggle('define-list__input--readonly', !isPredefined);
        if (!isPredefined) shapeSel.value = '';
    }
}

function autoNameAlumSection() {
    if (_selectedAlumSecIdx < 0 || _alumSections[_selectedAlumSecIdx]?._nameEdited) return;
    const profileType = document.getElementById('alum-sec-profile-type')?.value || 'predefined';
    const shape       = document.getElementById('alum-sec-shape')?.value || '';
    let autoName = '';
    if (profileType === 'predefined' && shape) {
        autoName = shape;
    } else if (profileType === 'stick') {
        autoName = 'Alum. Stick';
    } else {
        autoName = 'Alum. Manual';
    }
    document.getElementById('alum-sec-name').value = autoName;
    _alumSections[_selectedAlumSecIdx].name = autoName;
    const item = document.querySelector(`#alum-section-list [data-idx="${_selectedAlumSecIdx}"] .define-modal__item-name`);
    if (item) item.textContent = autoName;
}

function renderAlumSectionList() {
    const list = document.getElementById('alum-section-list');
    if (!list) return;
    list.innerHTML = '';
    _alumSections.forEach((sec, i) => {
        const li = document.createElement('li');
        li.className = 'define-modal__list-item' + (i === _selectedAlumSecIdx ? ' active' : '');
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
            _alumSections.splice(i, 1);
            if (_selectedAlumSecIdx >= _alumSections.length) _selectedAlumSecIdx = _alumSections.length - 1;
            renderAlumSectionList();
            showAlumSectionForm();
        });
        li.addEventListener('click', () => {
            syncAlumSectionFromForm();
            _selectedAlumSecIdx = i;
            renderAlumSectionList();
            showAlumSectionForm();
        });
        list.appendChild(li);
    });
    initAlumSectionDrag();
}


function showAlumSectionForm() {
    const form = document.getElementById('alum-section-form');
    if (!form) return;
    if (_selectedAlumSecIdx < 0 || _selectedAlumSecIdx >= _alumSections.length) {
        form.hidden = true;
        return;
    }
    form.hidden = false;
    const sec         = _alumSections[_selectedAlumSecIdx];
    const profileType = sec.profileType || 'predefined';

    document.getElementById('alum-sec-name').value         = sec.name || '';
    document.getElementById('alum-sec-profile-type').value = profileType;

    populateSecGradeOptions('Aluminum', sec.grade, 'alum-sec-grade');
    populateAlumSecShapeOptions(profileType === 'predefined' ? sec.shape : null);

    document.getElementById('alum-sec-b').value  = sec.b  || '';
    document.getElementById('alum-sec-d').value  = sec.d  || '';
    document.getElementById('alum-sec-tf').value = sec.tf || '';
    document.getElementById('alum-sec-tw').value = sec.tw || '';
    document.getElementById('alum-sec-a').value  = sec.a  || '';
    document.getElementById('alum-sec-ix').value = sec.ix || '';
    document.getElementById('alum-sec-sx').value = sec.sx || '';

    applyAlumSecEditability(profileType);
}

function syncAlumSectionFromForm() {
    if (_selectedAlumSecIdx < 0 || _selectedAlumSecIdx >= _alumSections.length) return;
    const sec       = _alumSections[_selectedAlumSecIdx];
    sec.name        = document.getElementById('alum-sec-name')?.value         || '';
    sec.grade       = document.getElementById('alum-sec-grade')?.value        || '';
    sec.profileType = document.getElementById('alum-sec-profile-type')?.value || 'predefined';
    sec.shape       = document.getElementById('alum-sec-shape')?.value        || '';
    sec.b           = document.getElementById('alum-sec-b')?.value            || '';
    sec.d           = document.getElementById('alum-sec-d')?.value            || '';
    sec.tf          = document.getElementById('alum-sec-tf')?.value           || '';
    sec.tw          = document.getElementById('alum-sec-tw')?.value           || '';
    sec.a           = document.getElementById('alum-sec-a')?.value            || '';
    sec.ix          = document.getElementById('alum-sec-ix')?.value           || '';
    sec.sx          = document.getElementById('alum-sec-sx')?.value           || '';
}

function initAlumSectionFormEvents() {
    const nameInput      = document.getElementById('alum-sec-name');
    const profileTypeSel = document.getElementById('alum-sec-profile-type');
    const shapeSel       = document.getElementById('alum-sec-shape');
    if (!nameInput) return;

    nameInput.addEventListener('input', () => {
        if (_selectedAlumSecIdx < 0) return;
        _alumSections[_selectedAlumSecIdx].name = nameInput.value;
        _alumSections[_selectedAlumSecIdx]._nameEdited = !!nameInput.value;
        const item = document.querySelector(`#alum-section-list [data-idx="${_selectedAlumSecIdx}"] .define-modal__item-name`);
        if (item) item.textContent = nameInput.value || `Section ${_selectedAlumSecIdx + 1}`;
    });

    profileTypeSel?.addEventListener('change', () => {
        const profileType = profileTypeSel.value;
        if (profileType === 'predefined') {
            populateAlumSecShapeOptions(Object.keys(ALUMINUM_PREDEFINED)[0]);
            fillPredefinedShape(shapeSel?.value || Object.keys(ALUMINUM_PREDEFINED)[0]);
        } else {
            if (shapeSel) shapeSel.value = '';
        }
        applyAlumSecEditability(profileType);
        autoNameAlumSection();
        syncAlumSectionFromForm();
    });

    shapeSel?.addEventListener('change', () => {
        if (shapeSel.value) fillPredefinedShape(shapeSel.value);
        autoNameAlumSection();
        syncAlumSectionFromForm();
    });
}

function initAlumSectionDrag() {
    const list = document.getElementById('alum-section-list');
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
                const moved = _alumSections.splice(dragIdx, 1)[0];
                _alumSections.splice(tgtIdx, 0, moved);
                if (_selectedAlumSecIdx === dragIdx) _selectedAlumSecIdx = tgtIdx;
                else if (_selectedAlumSecIdx > dragIdx && _selectedAlumSecIdx <= tgtIdx) _selectedAlumSecIdx--;
                else if (_selectedAlumSecIdx < dragIdx && _selectedAlumSecIdx >= tgtIdx) _selectedAlumSecIdx++;
                renderAlumSectionList();
            }
            dragIdx = null;
        });
    });
}

function openAlumSectionModal() {
    document.getElementById('define-submenu').hidden = true;
    document.getElementById('section-submenu').hidden = true;
    document.getElementById('define-wrap')?.classList.remove('open');

    if (!_alumSections.length) {
        _alumSections = DEFAULT_ALUM_SECTIONS.map(s => ({ ...s }));
    }
    _selectedAlumSecIdx = _alumSections.length ? 0 : -1;

    renderAlumSectionList();
    showAlumSectionForm();
    initAlumSectionFormEvents();

    const modal    = document.getElementById('alum-section-modal');
    const addBtn   = document.getElementById('add-alum-sec-btn');
    const closeBtn = document.getElementById('close-alum-section-modal');
    const applyBtn = document.getElementById('apply-alum-section-modal');

    addBtn.onclick = () => {
        syncAlumSectionFromForm();
        _alumSections.push({ name: '', material: 'Aluminum', profileType: 'predefined', shape: '', grade: '', b: '', d: '', tf: '', tw: '', a: '', ix: '', sx: '' });
        _selectedAlumSecIdx = _alumSections.length - 1;
        renderAlumSectionList();
        showAlumSectionForm();
        document.getElementById('alum-sec-name')?.focus();
    };
    const dispatchChange = () => document.dispatchEvent(new CustomEvent('frame-sections-changed'));
    closeBtn.onclick = () => { syncAlumSectionFromForm(); closeModal('alum-section-modal'); dispatchChange(); };
    applyBtn.onclick = () => { syncAlumSectionFromForm(); closeModal('alum-section-modal'); dispatchChange(); };
    modal.onclick = (e) => { if (e.target === modal) { syncAlumSectionFromForm(); closeModal('alum-section-modal'); dispatchChange(); } };

    openModal('alum-section-modal');
}

function initAlumSectionModal() {
    document.getElementById('section-alum-btn')?.addEventListener('click', openAlumSectionModal);
}
