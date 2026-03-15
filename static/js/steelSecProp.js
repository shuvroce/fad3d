// ============================
// Steel Section Properties Modal
// ============================

const DEFAULT_STEEL_SECTIONS = [
    { name: 'Steel Section', material: 'Steel', profileType: 'steel-rhs', shape: '', grade: '', b: '100', d: '200', t: '', tf: '8', tw: '6' },
];

let _steelSections = DEFAULT_STEEL_SECTIONS.map(s => ({ ...s }));
let _selectedSteelSecIdx = -1;

function updateSteelCalcPanel() {
    const profileType = document.getElementById('steel-sec-profile-type')?.value || 'steel-rhs';
    const v = id => parseFloat(document.getElementById(id)?.value) || 0;

    const b  = v('steel-sec-b');
    const d  = v('steel-sec-d');
    const t  = v('steel-sec-t');
    const tf = v('steel-sec-tf');
    const tw = v('steel-sec-tw');

    let A = 0, Ix = 0, Iy = 0, Sx = 0, Sy = 0, Zx = 0, J = 0;

    if (profileType === 'steel-rhs') {
        // RHS/SHS: uniform wall thickness t
        if (b > 0 && d > 0 && t > 0) {
            A  = b * d - (b - 2 * t) * (d - 2 * t);
            Ix = (b * d ** 3 - (b - 2 * t) * (d - 2 * t) ** 3) / 12;
            Iy = (d * b ** 3 - (d - 2 * t) * (b - 2 * t) ** 3) / 12;
            Sx = Ix / (d / 2);
            Sy = Iy / (b / 2);
            Zx = (b * d ** 2 / 4) - ((b - 2 * t) * (d - 2 * t) ** 2 / 4);
            const Am  = (d - t) * (b - t);
            const per = 2 * ((d - t) + (b - t)) / t;
            J = per > 0 ? 4 * Am ** 2 / per : 0;
        }
    } else {
        // I/W section
        if (b > 0 && d > 0 && tf > 0 && tw > 0) {
            const hw = d - 2 * tf;
            A  = 2 * b * tf + hw * tw;
            Ix = (b * d ** 3 - (b - tw) * hw ** 3) / 12;
            Iy = (2 * tf * b ** 3 + hw * tw ** 3) / 12;
            Sx = Ix / (d / 2);
            Sy = Iy / (b / 2);
            Zx = b * tf * (d / 2 - tf / 2) * 2 + tw * hw ** 2 / 4;
            J  = 2 * b * tf ** 3 / 3 + hw * tw ** 3 / 3;
        }
    }

    const rx = A > 0 ? Math.sqrt(Ix / A) : 0;
    const ry = A > 0 ? Math.sqrt(Iy / A) : 0;
    const Mpx = Zx > 0 ? Zx : 0; // placeholder — needs fy from material

    const fmt = (n, dp = 1) => n > 0 ? n.toLocaleString('en', { maximumFractionDigits: dp }) : '—';

    document.getElementById('calc-steel-a').textContent   = fmt(A);
    document.getElementById('calc-steel-ix').textContent  = fmt(Ix);
    document.getElementById('calc-steel-iy').textContent  = fmt(Iy);
    document.getElementById('calc-steel-sx').textContent  = fmt(Sx);
    document.getElementById('calc-steel-sy').textContent  = fmt(Sy);
    document.getElementById('calc-steel-zx').textContent  = fmt(Zx);
    document.getElementById('calc-steel-j').textContent   = fmt(J);
    document.getElementById('calc-steel-rx').textContent  = fmt(rx, 2);
    document.getElementById('calc-steel-ry').textContent  = fmt(ry, 2);
    document.getElementById('calc-steel-mpx').textContent = fmt(Zx); // Zx shown; Mpx = Zx×fy handled later
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
    if (profileTypeSel) profileTypeSel.value = sec.profileType || 'steel-rhs';

    document.getElementById('steel-sec-b').value  = sec.b  || '';
    document.getElementById('steel-sec-d').value  = sec.d  || '';
    document.getElementById('steel-sec-t').value  = sec.t  || '';
    document.getElementById('steel-sec-tf').value = sec.tf || '';
    document.getElementById('steel-sec-tw').value = sec.tw || '';

    applySteelSecVisibility(sec.profileType || 'steel-rhs');
}

function syncSteelSectionFromForm() {
    if (_selectedSteelSecIdx < 0 || _selectedSteelSecIdx >= _steelSections.length) return;
    const sec   = _steelSections[_selectedSteelSecIdx];
    sec.name    = document.getElementById('steel-sec-name')?.value  || '';
    sec.grade   = document.getElementById('steel-sec-grade')?.value || '';
    sec.profileType = document.getElementById('steel-sec-profile-type')?.value || 'steel-rhs';
    sec.b           = document.getElementById('steel-sec-b')?.value            || '';
    sec.d           = document.getElementById('steel-sec-d')?.value            || '';
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
        _steelSections.push({ name: '', material: 'Steel', profileType: 'steel-rhs', shape: '', grade: '', b: '', d: '', t: '', tf: '', tw: '' });
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

function initSteelSectionModal() {
    document.getElementById('section-steel-btn')?.addEventListener('click', openSteelSectionModal);
}
