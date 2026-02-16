const CONTENT_DIV_ID = 'content';

function renderEmbeddedReadme() {
    const container = document.getElementById(CONTENT_DIV_ID);
    const mdEl = document.getElementById('readme-md');
    if (!container) return console.error('Content container not found');
    if (!mdEl) {
        container.innerHTML = '<p class="error">Embedded README not found.</p>';
        return;
    }

    const markdownText = mdEl.textContent || mdEl.innerText || '';
    try {
        marked.setOptions({ breaks: true });
        container.innerHTML = marked.parse(markdownText);
        enhanceRenderedMarkdown(container);
    } catch (err) {
        console.error('Error rendering markdown:', err);
        container.innerHTML = '<p class="error">Error rendering markdown.</p>';
    }
}

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function ensureHeadingIds(container) {
    const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6');
    const used = new Map();
    headings.forEach(h => {
        if (!h.id) {
            let id = slugify(h.textContent || 'heading');
            let base = id;
            let i = 1;
            while (used.has(id) || document.getElementById(id)) {
                id = `${base}-${i++}`;
            }
            used.set(id, true);
            h.id = id;
        }
    });
}

function generateTOC(container) {
    const paras = Array.from(container.querySelectorAll('p'));
    paras.forEach(p => {
        if (p.textContent.trim() === '[TOC]') {
            ensureHeadingIds(container);
            const headings = Array.from(container.querySelectorAll('h1,h2,h3'));
            if (headings.length === 0) return;

            const ul = document.createElement('ul');
            ul.className = 'md-toc';

            const title = document.createElement('li');
            title.innerHTML = '<strong>Table of Contents</strong>';
            title.style.marginBottom = '8px';
            ul.appendChild(title);

            headings.forEach(h => {
                const li = document.createElement('li');
                li.className = `toc-level-${parseInt(h.tagName.substring(1))}`;
                const a = document.createElement('a');
                a.href = `#${h.id}`;
                a.textContent = h.textContent;
                li.appendChild(a);
                ul.appendChild(li);
            });
            p.parentNode.replaceChild(ul, p);
        }
    });
}

function processAdmonitions(container) {
    const paras = Array.from(container.querySelectorAll('p'));
    paras.forEach(p => {
        const txt = p.textContent || '';
        const match = txt.match(/^!!!\s*note\s*(.*)/i);
        if (match) {
            const rest = match[1] || '';
            const box = document.createElement('div');
            box.className = 'admonition note';

            let contentHtml = '';
            if (rest.trim()) {
                contentHtml += `<strong>${rest.trim()}</strong>`;
            }

            box.innerHTML = contentHtml;
            p.parentNode.replaceChild(box, p);
        }
    });
}

function replaceHighlightsInTextNode(textNode) {
    const re = /==([^=]+)==/g;
    const parent = textNode.parentNode;
    const text = textNode.nodeValue;
    let lastIndex = 0;
    let match;
    const frag = document.createDocumentFragment();
    while ((match = re.exec(text)) !== null) {
        const before = text.slice(lastIndex, match.index);
        if (before) frag.appendChild(document.createTextNode(before));

        const mark = document.createElement('mark');
        mark.className = 'md-highlight';
        mark.textContent = match[1];
        frag.appendChild(mark);

        lastIndex = re.lastIndex;
    }
    const after = text.slice(lastIndex);
    if (after) frag.appendChild(document.createTextNode(after));
    parent.replaceChild(frag, textNode);
}

function processHighlights(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let n;
    while (n = walker.nextNode()) {
        let skip = false;
        let el = n.parentElement;
        while (el) {
            const tag = el.tagName && el.tagName.toLowerCase();
            if (tag === 'code' || tag === 'pre' || tag === 'a' || tag === 'mark') {
                skip = true; break;
            }
            el = el.parentElement;
        }
        if (!skip && /==[^=]+==/.test(n.nodeValue)) nodes.push(n);
    }
    nodes.forEach(replaceHighlightsInTextNode);
}

function enhanceRenderedMarkdown(container) {
    ensureHeadingIds(container);
    generateTOC(container);
    processAdmonitions(container);
    processHighlights(container);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('readme-md')) {
        renderEmbeddedReadme();
        const content = document.getElementById('content');
        if (content) {
            content.style.display = 'block';
        }
    }
});
