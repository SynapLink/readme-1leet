const CONTENT_DIV_ID = 'content';

function renderEmbeddedReadme() {
    const container = document.getElementById(CONTENT_DIV_ID);
    const mdEl = document.getElementById('readme-md');
    if (!container) return console.error('Content container not found');
    if (!mdEl) {
        container.innerHTML = '<p style="color: #d03e3e;">Embedded README not found.</p>';
        return;
    }

    const markdownText = mdEl.textContent || mdEl.innerText || '';
    try {
        marked.setOptions({ breaks: true });
        container.innerHTML = marked.parse(markdownText);
        enhanceRenderedMarkdown(container);
    } catch (err) {
        console.error('Error rendering markdown:', err);
        container.innerHTML = '<p style="color: #d03e3e;">Error rendering markdown.</p>';
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

function applyJitterEffect() {
    const targets = document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6, .bio-header h1, .bio-header span');

    targets.forEach(el => {
        if (el.querySelector('.char-jitter')) return;

        const text = el.textContent;
        el.innerHTML = '';

        text.split('').forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'char-jitter';

            if (char.trim() === '') {
                span.style.width = '0.3em';
            } else {
                const rotation = (Math.random() * 6 - 3).toFixed(1);
                span.style.transform = `rotate(${rotation}deg)`;
                span.style.display = 'inline-block';
            }

            el.appendChild(span);
        });
    });
}

function applyRussianFont() {
    function containsCyrillic(text) {
        return /[\u0400-\u04FF]/.test(text);
    }

    function wrapCyrillicText(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (containsCyrillic(text)) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;

                const cyrillicRegex = /[\u0400-\u04FF]+/g;

                while ((match = cyrillicRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                    }
                    const span = document.createElement('span');
                    span.className = 'russian-text';
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    lastIndex = match.index + match[0].length;
                }
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                node.parentNode.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            if (tagName !== 'SCRIPT' && tagName !== 'STYLE' && tagName !== 'CODE' && tagName !== 'PRE') {
                const children = Array.from(node.childNodes);
                children.forEach(wrapCyrillicText);
            }
        }
    }

    const markdownBody = document.querySelector('.markdown-body');
    if (markdownBody) {
        wrapCyrillicText(markdownBody);
    }

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        wrapCyrillicText(sidebar);
    }
}

function enhanceRenderedMarkdown(container) {
    ensureHeadingIds(container);
    generateTOC(container);
    processAdmonitions(container);
    processHighlights(container);
    applyJitterEffect();
    applyRussianFont();
}

const prefix = "I am a: ";
const roles = ["developer", "OS enthusiast", "designer", "talkative person"];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeSpeed = 100;

function typeWriter() {
    const typingElement = document.getElementById("typing-text");

    if (!typingElement) return;

    const currentRole = roles[roleIndex];
    const fullText = prefix + currentRole;

    if (isDeleting) {
        if (charIndex > prefix.length) {
            typingElement.innerHTML = prefix + currentRole.substring(0, charIndex - prefix.length - 1) + '<span class="cursor"></span>';
            charIndex--;
            typeSpeed = 50;
        } else {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            charIndex = prefix.length;
            typeSpeed = 500;
        }
    } else {
        const roleCharIndex = charIndex - prefix.length;
        typingElement.innerHTML = prefix + currentRole.substring(0, roleCharIndex + 1) + '<span class="cursor"></span>';
        charIndex++;
        typeSpeed = 100;
    }

    if (!isDeleting && charIndex === fullText.length) {
        isDeleting = true;
        typeSpeed = 2000;
    }

    setTimeout(typeWriter, typeSpeed);
}

function initFlashlight() {
    const btn = document.createElement('button');
    btn.className = 'toggle-lights-btn';
    btn.innerHTML = '💡';
    btn.title = 'Toggle Lights';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
        document.body.classList.toggle('lights-off');
    });

    document.addEventListener('mousemove', (e) => {
        if (document.body.classList.contains('lights-off')) {
            document.body.style.setProperty('--cursor-x', e.clientX + 'px');
            document.body.style.setProperty('--cursor-y', e.clientY + 'px');
        }
    });
}

function initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    const clickableSelectors = 'a, button, .btn, .menu-btn, .toggle-lights-btn, [onclick], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], select, textarea, [role="button"]';
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        const target = e.target;
        const isClickable = target.matches(clickableSelectors) || 
                           target.closest(clickableSelectors) ||
                           window.getComputedStyle(target).cursor === 'pointer' ||
                           target.style.cursor === 'pointer';
        
        if (isClickable) {
            cursor.classList.add('pointer');
        } else {
            cursor.classList.remove('pointer');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const typingElement = document.getElementById("typing-text");
    if (typingElement) {
        typingElement.innerHTML = prefix + '<span class="cursor"></span>';
        charIndex = prefix.length;
    }
    
    initCustomCursor();
    typeWriter();
    initFlashlight();
    applyJitterEffect();

    if (document.getElementById('readme-md')) {
        renderEmbeddedReadme();

        const content = document.getElementById('content');
        if (content) {
            content.style.display = 'block';
        }
    }

    applyRussianFont();
});
