(function () {
    'use strict';

    function t(value) {
        return window.DGBuilderI18n ? window.DGBuilderI18n.translate(value) : value;
    }

    function buildStudioLayout() {
        var workspace = document.querySelector('.gb-wrap');
        var editor = workspace && workspace.querySelector(':scope > .gb-main-column');
        var checkout = workspace && workspace.querySelector(':scope > .gb-sidebar-full');

        if (!workspace || !editor || !checkout || workspace.dataset.studioLayout === 'ready') return;

        var preview = editor.querySelector(':scope > .gb-live-preview');
        var contentNav = editor.querySelector(':scope > .gb-content-panel');
        if (!preview || !contentNav) return;

        workspace.dataset.studioLayout = 'ready';
        editor.classList.add('gb-editor-canvas');

        var toolRail = document.createElement('aside');
        toolRail.className = 'gb-tool-rail';
        toolRail.setAttribute('aria-label', t('Công cụ nội dung quà'));
        toolRail.appendChild(contentNav);

        var toolHint = document.createElement('p');
        toolHint.className = 'gb-tool-rail__hint';
        toolHint.innerHTML = '<span>●</span> ' + t('Nội dung được đồng bộ vào bản xem thử.');
        toolRail.appendChild(toolHint);

        var previewRail = document.createElement('aside');
        previewRail.className = 'gb-preview-rail is-preview-open';
        previewRail.setAttribute('aria-label', t('Bản xem trước'));
        previewRail.appendChild(preview);

        // Keep the live demo visible at the top of the studio. The content
        // tools, editor and publishing controls stay below it.
        workspace.insertBefore(previewRail, editor);
        workspace.insertBefore(toolRail, editor);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildStudioLayout, { once: true });
    } else {
        buildStudioLayout();
    }
})();
