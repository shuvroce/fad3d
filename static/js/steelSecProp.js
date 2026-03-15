// ============================
// Steel Section Properties Modal
// ============================

const DEFAULT_STEEL_SECTIONS = [
    { name: 'Steel Section', material: 'Steel', profileType: 'manual', shape: '', grade: '', b: '100', d: '200', tf: '8', tw: '6', a: '6650', ix: '56900000', sx: '569000' },
];

let _steelSections = DEFAULT_STEEL_SECTIONS.map(s => ({ ...s }));
let _selectedSteelSecIdx = -1;

function applySteelSecEditability() {
    ['sec-b', 'sec-d', 'sec-tf', 'sec-tw', 'sec-a', 'sec-ix', 'sec-sx'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = false;
        el.classList.remove('define-list__input--readonly');
    });
    document.getElementById('sec-profile-type-row').hidden = true;
    document.getElementById('sec-shape-row').hidden = true;
}

function autoNameSteelSection() {
    if (_selectedSteelSecIdx < 0 || _steelSections[_selectedSteelSecIdx]?._nameEdited) return;
    const autoName = 'Steel Section';
    document.getElementById('sec-name').value = autoName;
    _steelSections[_selectedSteelSecIdx].name = autoName;
    const item = document.querySelector(`#section-list [data-idx="${_selectedSteelSecIdx}"] .define-modal__item-name`);
    if (item) item.textContent = autoName;
}

function renderSteelSectionList() {
    const list = document.getElementById('section-list');
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
    const form  = document.getElementById('section-form');
    if (!form) return;
    if (_selectedSteelSecIdx < 0 || _selectedSteelSecIdx >= _steelSections.length) {
        form.hidden = true;
        return;
    }
    form.hidden = false;
    const sec = _steelSections[_selectedSteelSecIdx];

    document.getElementById('sec-name').value = sec.name || '';

    populateSecGradeOptions('Steel', sec.grade);

    document.getElementById('sec-b').value  = sec.b  || '';
    document.getElementById('sec-d').value  = sec.d  || '';
    document.getElementById('sec-tf').value = sec.tf || '';
    document.getElementById('sec-tw').value = sec.tw || '';
    document.getElementById('sec-a').value  = sec.a  || '';
    document.getElementById('sec-ix').value = sec.ix || '';
    document.getElementById('sec-sx').value = sec.sx || '';

    applySteelSecEditability();
}

function syncSteelSectionFromForm() {
    if (_selectedSteelSecIdx < 0 || _selectedSteelSecIdx >= _steelSections.length) return;
    const sec   = _steelSections[_selectedSteelSecIdx];
    sec.name    = document.getElementById('sec-name')?.value  || '';
    sec.grade   = document.getElementById('sec-grade')?.value || '';
    sec.b       = document.getElementById('sec-b')?.value     || '';
    sec.d       = document.getElementById('sec-d')?.value     || '';
    sec.tf      = document.getElementById('sec-tf')?.value    || '';
    sec.tw      = document.getElementById('sec-tw')?.value    || '';
    sec.a       = document.getElementById('sec-a')?.value     || '';
    sec.ix      = document.getElementById('sec-ix')?.value    || '';
    sec.sx      = document.getElementById('sec-sx')?.value    || '';
}

function initSteelSectionFormEvents() {
    const nameInput = document.getElementById('sec-name');
    if (!nameInput) return;

    nameInput.addEventListener('input', () => {
        if (_selectedSteelSecIdx < 0) return;
        _steelSections[_selectedSteelSecIdx].name = nameInput.value;
        _steelSections[_selectedSteelSecIdx]._nameEdited = !!nameInput.value;
        const item = document.querySelector(`#section-list [data-idx="${_selectedSteelSecIdx}"] .define-modal__item-name`);
        if (item) item.textContent = nameInput.value || `Section ${_selectedSteelSecIdx + 1}`;
    });
}

function initSteelSectionDrag() {
    const list = document.getElementById('section-list');
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

    const title = document.getElementById('section-modal-title');
    if (title) title.textContent = 'Steel Section Definitions';

    const modal = document.getElementById('section-modal');
    if (modal) modal.dataset.material = 'Steel';

    if (!_steelSections.length) {
        _steelSections = DEFAULT_STEEL_SECTIONS.map(s => ({ ...s }));
    }
    _selectedSteelSecIdx = _steelSections.length ? 0 : -1;

    renderSteelSectionList();
    showSteelSectionForm();
    initSteelSectionFormEvents();

    // Wire shared modal action buttons to steel handlers
    const addBtn   = document.getElementById('add-section-btn');
    const closeBtn = document.getElementById('close-section-modal');
    const applyBtn = document.getElementById('apply-section-modal');

    addBtn.onclick = () => {
        syncSteelSectionFromForm();
        _steelSections.push({ name: '', material: 'Steel', profileType: 'manual', shape: '', grade: '', b: '', d: '', tf: '', tw: '', a: '', ix: '', sx: '' });
        _selectedSteelSecIdx = _steelSections.length - 1;
        renderSteelSectionList();
        showSteelSectionForm();
        document.getElementById('sec-name')?.focus();
    };
    const dispatchChange = () => document.dispatchEvent(new CustomEvent('frame-sections-changed'));
    closeBtn.onclick = () => { syncSteelSectionFromForm(); closeModal('section-modal'); dispatchChange(); };
    applyBtn.onclick = () => { syncSteelSectionFromForm(); closeModal('section-modal'); dispatchChange(); };
    modal.onclick = (e) => { if (e.target === modal) { syncSteelSectionFromForm(); closeModal('section-modal'); dispatchChange(); } };

    openModal('section-modal');
}

function initSteelSectionModal() {
    document.getElementById('section-steel-btn')?.addEventListener('click', openSteelSectionModal);
}
