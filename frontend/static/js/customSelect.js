// customSelect.js
// Replaces native <select> elements with fully styled custom dropdowns.
// The native <select> stays hidden so all existing .value reads, .value writes,
// and delegated "change" listeners continue to work without modification.

function initCustomSelectLogic() {
    const nativeValueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

    // Build the option list from the native select
    function buildList(list, selectEl, selected, closeCallback) {
        list.innerHTML = '';
        Array.from(selectEl.options).forEach(opt => {
            const item = document.createElement('div');
            item.className = 'custom-select__option';
            if (opt.disabled) item.classList.add('disabled');
            item.textContent = opt.textContent.trim();
            item.dataset.value = opt.value;
            if (!opt.disabled) {
                // mousedown instead of click prevents blur on the trigger before selection
                item.addEventListener('mousedown', e => {
                    e.preventDefault();
                    nativeValueDesc.set.call(selectEl, opt.value);
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    syncHighlight(list, selectEl);
                    syncDisplay(selected, selectEl);
                    closeCallback();
                });
            }
            list.appendChild(item);
        });
        syncHighlight(list, selectEl);
        syncDisplay(selected, selectEl);
    }

    function syncDisplay(selected, selectEl) {
        const opt = selectEl.options[selectEl.selectedIndex];
        const textEl = selected.querySelector('.custom-select__selected-text');
        (textEl || selected).textContent = opt ? opt.textContent.trim() : '';
    }

    function syncHighlight(list, selectEl) {
        const val = nativeValueDesc.get.call(selectEl);
        list.querySelectorAll('.custom-select__option').forEach(item => {
            item.classList.toggle('active', item.dataset.value === val);
        });
    }

    // Position the list using fixed coords so it escapes overflow-clipping ancestors
    function positionList(wrapper, list) {
        const rect = wrapper.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < 220 && rect.top > spaceBelow;

        list.style.width = rect.width + 'px';
        list.style.left = rect.left + 'px';
        list.style.right = 'auto';
        list.style.marginTop = '0';
        list.style.marginBottom = '0';

        if (openUp) {
            list.style.top = 'auto';
            list.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
        } else {
            list.style.top = (rect.bottom + 2) + 'px';
            list.style.bottom = 'auto';
        }
        list.classList.toggle('open-up', openUp);
    }

    // Initialize one native <select>
    function initCustomSelect(selectEl) {
        if (selectEl.dataset.customSelectInit) return;
        if (selectEl.dataset.noCustomSelect !== undefined) return;
        selectEl.dataset.customSelectInit = 'true';

        // Wrapper inherits the flex slot from the native select
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';

        const selected = document.createElement('div');
        selected.className = 'custom-select__selected';
        selected.tabIndex = 0;
        selected.setAttribute('role', 'combobox');
        selected.setAttribute('aria-haspopup', 'listbox');
        selected.setAttribute('aria-expanded', 'false');

        const selectedText = document.createElement('span');
        selectedText.className = 'custom-select__selected-text';
        selected.appendChild(selectedText);

        const arrow = document.createElement('span');
        arrow.className = 'custom-select__arrow';
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><polyline points="2,4 6,8 10,4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        selected.appendChild(arrow);

        const list = document.createElement('div');
        list.className = 'custom-select__list';
        list.setAttribute('role', 'listbox');

        wrapper.appendChild(selected);
        wrapper.appendChild(list);

        // Insert wrapper before the native select, then move select inside it (hidden)
        selectEl.parentNode.insertBefore(wrapper, selectEl);
        selectEl.style.display = 'none';
        wrapper.appendChild(selectEl);

        buildList(list, selectEl, selected, () => close());

        // Open / close helpers
        function open() {
            document.querySelectorAll('.custom-select.open').forEach(el => {
                el.classList.remove('open');
                el.querySelector('.custom-select__selected').setAttribute('aria-expanded', 'false');
                // return any portalled list back to its wrapper
                const orphan = el._portalList;
                if (orphan && orphan.parentNode === document.body) {
                    el.appendChild(orphan);
                }
            });
            wrapper.classList.add('open');
            selected.setAttribute('aria-expanded', 'true');
            // Portal: move list to <body> so no ancestor transform affects fixed coords
            document.body.appendChild(list);
            wrapper._portalList = list;
            positionList(wrapper, list);
        }

        function close() {
            wrapper.classList.remove('open');
            selected.setAttribute('aria-expanded', 'false');
            // Return list to wrapper
            if (list.parentNode === document.body) {
                wrapper.appendChild(list);
            }
        }

        // Close on scroll so the list doesn't drift from its trigger
        window.addEventListener('scroll', close, { passive: true, capture: true });

        // Mouse interaction
        selected.addEventListener('click', e => {
            e.stopPropagation();
            wrapper.classList.contains('open') ? close() : open();
        });

        // Keyboard interaction
        selected.addEventListener('keydown', e => {
            const isOpen = wrapper.classList.contains('open');
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                isOpen ? close() : open();
            } else if (e.key === 'Escape') {
                close();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const opts = Array.from(selectEl.options).filter(o => !o.disabled);
                const curVal = nativeValueDesc.get.call(selectEl);
                const curIdx = opts.findIndex(o => o.value === curVal);
                const newIdx = e.key === 'ArrowDown'
                    ? Math.min(curIdx + 1, opts.length - 1)
                    : Math.max(curIdx - 1, 0);
                if (opts[newIdx]) {
                    nativeValueDesc.set.call(selectEl, opts[newIdx].value);
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    syncHighlight(list, selectEl);
                    syncDisplay(selected, selectEl);
                }
            }
        });

        // Rebuild list when options are added / removed (dynamic population)
        const optObserver = new MutationObserver(() => buildList(list, selectEl, selected, () => close()));
        optObserver.observe(selectEl, { childList: true, subtree: true });

        // Intercept programmatic value changes (e.g. sel.value = prev)
        Object.defineProperty(selectEl, 'value', {
            get() { return nativeValueDesc.get.call(this); },
            set(v) {
                nativeValueDesc.set.call(this, v);
                syncHighlight(list, selectEl);
                syncDisplay(selected, selectEl);
            },
            configurable: true,
        });
    }

    // Close all dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select.open').forEach(el => {
            el.classList.remove('open');
            el.querySelector('.custom-select__selected').setAttribute('aria-expanded', 'false');
            const orphan = el._portalList;
            if (orphan && orphan.parentNode === document.body) {
                el.appendChild(orphan);
            }
        });
    });

    // Watch for new selects added to the DOM (dynamic categories)
    const domObserver = new MutationObserver(mutations => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'SELECT') initCustomSelect(node);
                node.querySelectorAll('select').forEach(initCustomSelect);
            });
        });
    });

    function init() {
        document.querySelectorAll('select').forEach(initCustomSelect);
        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    return init;
}

// Create initialization function
const initCustomSelectModule = initCustomSelectLogic();

export { initCustomSelectModule as initCustomSelect };
