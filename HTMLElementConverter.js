class HTMLElementConverter {
    constructor(config = {}) {
        this.root = config.root ?? "body";
        this.elements = config.elements ?? [];
    }

    getRoot() {
        return document.querySelector(this.root);
    }

    getElements() {
        return this.elements;
    }

    /** Selector sebuah konfigurasi: `selector` diprioritaskan, lalu `tag`. */
    getSelector(config) {
        return config.selector ?? config.tag ?? null;
    }

    /**
     * Ubah Node | string | array | falsy menjadi array Node.
     * - null / undefined / false / "" => [] (artinya dihapus)
     * - DocumentFragment diuraikan menjadi anak-anaknya
     */
    toNodes(content) {
        if (content == null || content === false) {
            return [];
        }

        if (content instanceof DocumentFragment) {
            return Array.from(content.childNodes);
        }

        if (content instanceof Node) {
            return [content];
        }

        if (typeof content === "string" || typeof content === "number") {
            const template = document.createElement("template");
            template.innerHTML = String(content);
            return Array.from(template.content.childNodes);
        }

        if (Array.isArray(content)) {
            return content.flatMap((item) => this.toNodes(item));
        }

        throw new TypeError(
            "Konten harus berupa Node, string, array, false, atau null."
        );
    }

    /** Ganti elemen target apa pun (diri sendiri, anak, induk, saudara). */
    replaceTarget(target, content) {
        if (!target || !target.parentNode) {
            return [];
        }

        const nodes = this.toNodes(content);
        target.replaceWith(...nodes);

        return nodes;
    }

    /** Sisipkan konten sebelum / sesudah target. */
    insertAround(target, content, position) {
        if (!target || !target.parentNode) {
            return [];
        }

        const nodes = this.toNodes(content);

        if (position === "before") {
            target.before(...nodes);
        } else {
            target.after(...nodes);
        }

        return nodes;
    }

    /** Helper yang diberikan ke fungsi render. */
    createContext(element) {
        return {
            element,
            tag: element.tagName.toLowerCase(),
            html: element.innerHTML,
            text: element.textContent,

            // Semua atribut: { href: "...", class: "..." }
            attrs: Object.fromEntries(
                Array.from(element.attributes, (attr) => [attr.name, attr.value])
            ),

            // data-* sebagai object biasa
            dataset: { ...element.dataset },

            // Elemen anak langsung (tanpa text node)
            children: Array.from(element.children),

            // Elemen terkait
            parent: element.parentElement,
            next: element.nextElementSibling,
            prev: element.previousElementSibling,
            closest: (selector) => element.closest(selector),

            // Akses atribut dan pencarian
            getAttr: (name, fallback = null) =>
                element.hasAttribute(name) ? element.getAttribute(name) : fallback,
            hasAttr: (name) => element.hasAttribute(name),
            setAttr: (name, value) => element.setAttribute(name, value),
            removeAttr: (name) => element.removeAttribute(name),
            query: (selector) => element.querySelector(selector),
            queryAll: (selector) => Array.from(element.querySelectorAll(selector)),

            // Modifikasi elemen terkait
            replace: (target, content) => this.replaceTarget(target, content),
            remove: (target) => this.replaceTarget(target, null),
            unwrap: (target) =>
                this.replaceTarget(target, Array.from(target?.childNodes ?? [])),
            before: (target, content) => this.insertAround(target, content, "before"),
            after: (target, content) => this.insertAround(target, content, "after"),
        };
    }

    renderElement(element, config) {
        const context = this.createContext(element);
        const result = config.render(element.innerHTML, element, context);

        // null / undefined / elemen yang sama: biarkan
        // (perubahan lewat ctx tetap berlaku)
        if (result === undefined || result === null || result === element) {
            return element;
        }

        // Elemen sudah terlepas (misalnya induknya diganti di dalam render)
        if (!element.parentNode) {
            return null;
        }

        const nodes = this.toNodes(result);
        element.replaceWith(...nodes);

        return nodes[0] ?? null;
    }

    convertElement(element, config) {
        return this.renderElement(element, config);
    }

    convertAll(root = this.getRoot()) {
        if (!root) {
            return "";
        }

        // Proses pada salinan agar DOM asli tidak berubah.
        const container = root.cloneNode(true);

        const configs = this.getElements().filter(
            (config) =>
                this.getSelector(config) && typeof config.render === "function"
        );

        if (configs.length === 0) {
            return this.toHTML(container);
        }

        const allSelectors = configs.map((c) => this.getSelector(c)).join(", ");

        // Urutan dokumen dibalik: elemen terdalam diproses lebih dulu,
        // sehingga innerHTML elemen luar sudah berisi hasil konversi anaknya.
        const elements = Array.from(
            container.querySelectorAll(allSelectors)
        ).reverse();

        for (const element of elements) {
            // Lewati elemen yang sudah terlepas dari container.
            if (!container.contains(element)) {
                continue;
            }

            // Config pertama yang cocok yang dipakai.
            const config = configs.find((c) => element.matches(this.getSelector(c)));

            if (config) {
                this.convertElement(element, config);
            }
        }

        return this.toHTML(container);
    }

    toHTML(element) {
        return element.innerHTML;
    }

    convert() {
        return this.convertAll();
    }
}
