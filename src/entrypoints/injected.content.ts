export default defineContentScript({
    matches: ["<all_urls>"],
    world: "MAIN",
    runAt: "document_start",
    main() {
        console.log(
            `%c
#############################################
#---/                                 \\---#
#      @ C O D E   A N A T O M Y @        #
#---\\                                 /---#
#############################################
`,
            "color: #0078d4; font-weight: bold; font-family: monospace;",
        );

        // Guard: only run once per page
        if ((window as any).__CODE_ANATOMY_LISTENERS__) {
            return;
        }

        // ═══════════════════════════════════════════════════════
        // 1. EVENT LISTENER TRACKING (existing, improved)
        // ═══════════════════════════════════════════════════════
        const listenerMap = new WeakMap<EventTarget, any[]>();
        (window as any).__CODE_ANATOMY_LISTENERS__ = listenerMap;
        console.log("[Code Anatomy MAIN] Listener map initialized.");

        const originalAdd = EventTarget.prototype.addEventListener;
        const originalRemove = EventTarget.prototype.removeEventListener;

        EventTarget.prototype.addEventListener = function (
            type,
            listener,
            options,
        ) {
            if (!listenerMap.has(this)) {
                listenerMap.set(this, []);
            }

            const listeners = listenerMap.get(this)!;
            listeners.push({
                type,
                listener,
                useCapture:
                    typeof options === "object" ? !!options.capture : !!options,
                passive:
                    typeof options === "object" ? !!options.passive : false,
                once: typeof options === "object" ? !!options.once : false,
                functionName: (listener as any).name || "anonymous",
                sourcePreview: getSourcePreview(listener),
            });

            return originalAdd.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function (
            type,
            listener,
            options,
        ) {
            const listeners = listenerMap.get(this);
            if (listeners) {
                const useCapture =
                    typeof options === "object" ? !!options.capture : !!options;
                const index = listeners.findIndex(
                    (l) =>
                        l.type === type &&
                        l.listener === listener &&
                        l.useCapture === useCapture,
                );
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }

            return originalRemove.call(this, type, listener, options);
        };

        function getSourcePreview(listener: any): string {
            try {
                let source =
                    typeof listener === "function"
                        ? listener.toString()
                        : listener.handleEvent
                          ? listener.handleEvent.toString()
                          : "Unknown";
                if (source.length > 300) {
                    source = source.substring(0, 300) + "...";
                }
                return source;
            } catch (e) {
                return "Source unavailable (CSP or restricted)";
            }
        }

        function getCallerLocation(): string {
            try {
                const stack = new Error().stack || "";
                const lines = stack
                    .split("\n")
                    .filter((l) => l.trim().startsWith("at "));
                // Find the first stack frame that doesn't belong to our script (injected.js or content.js in production)
                const callerLine =
                    lines.find(
                        (l) =>
                            !l.includes("injected.js") &&
                            !l.includes("content.js"),
                    ) ||
                    lines[2] ||
                    lines[1] ||
                    "";
                return callerLine.trim().substring(0, 200);
            } catch (e) {
                return "";
            }
        }

        // ═══════════════════════════════════════════════════════
        // 2. DOM QUERY METHOD TRACKING
        // ═══════════════════════════════════════════════════════
        const MAX_RECORDS = 500;

        interface DomAccessRecord {
            method: string;
            argument: string;
            callerLocation: string;
            element: Element | null;
            elements?: Element[];
            timestamp: number;
        }
        const domAccessLog: DomAccessRecord[] = [];
        (window as any).__CODE_ANATOMY_DOM_ACCESS__ = domAccessLog;

        function logDomAccess(
            method: string,
            argument: string,
            result: Element | null | NodeList | HTMLCollection,
        ) {
            if (domAccessLog.length >= MAX_RECORDS) return;
            const caller = getCallerLocation();
            // Skip our own calls
            if (caller.includes("injected.js") || caller.includes("content.js"))
                return;

            const record: DomAccessRecord = {
                method,
                argument,
                callerLocation: caller,
                element: null,
                timestamp: performance.now(),
            };

            if (result instanceof Element) {
                record.element = result;
            } else if (result && "length" in result) {
                // NodeList or HTMLCollection
                record.elements = Array.from(result as any).filter(
                    (e: any) => e instanceof Element,
                ) as Element[];
                record.element = record.elements[0] || null;
            }

            domAccessLog.push(record);
        }

        // Patch document.querySelector
        const origQS = Document.prototype.querySelector;
        Document.prototype.querySelector = function (selector: string) {
            const result = origQS.call(this, selector);
            logDomAccess("document.querySelector", selector, result);
            return result;
        };

        // Patch document.querySelectorAll
        const origQSA = Document.prototype.querySelectorAll;
        Document.prototype.querySelectorAll = function (selector: string) {
            const result = origQSA.call(this, selector);
            logDomAccess("document.querySelectorAll", selector, result);
            return result;
        };

        // Patch document.getElementById
        const origById = Document.prototype.getElementById;
        Document.prototype.getElementById = function (id: string) {
            const result = origById.call(this, id);
            logDomAccess("document.getElementById", id, result);
            return result;
        };

        // Patch document.getElementsByClassName
        const origByCN = Document.prototype.getElementsByClassName;
        Document.prototype.getElementsByClassName = function (names: string) {
            const result = origByCN.call(this, names);
            logDomAccess("document.getElementsByClassName", names, result);
            return result;
        };

        // Patch document.getElementsByTagName
        const origByTN = Document.prototype.getElementsByTagName;
        Document.prototype.getElementsByTagName = function (name: string) {
            const result = origByTN.call(this, name);
            logDomAccess("document.getElementsByTagName", name, result);
            return result;
        };

        // Patch document.getElementsByName
        const origByName = Document.prototype.getElementsByName;
        Document.prototype.getElementsByName = function (name: string) {
            const result = origByName.call(this, name);
            logDomAccess("document.getElementsByName", name, result);
            return result;
        };

        // Patch Element.prototype.querySelector / querySelectorAll (scoped queries)
        const origElemQS = Element.prototype.querySelector;
        Element.prototype.querySelector = function (selector: string) {
            const result = origElemQS.call(this, selector);
            logDomAccess("element.querySelector", selector, result);
            return result;
        };

        const origElemQSA = Element.prototype.querySelectorAll;
        Element.prototype.querySelectorAll = function (selector: string) {
            const result = origElemQSA.call(this, selector);
            logDomAccess("element.querySelectorAll", selector, result);
            return result;
        };

        // ═══════════════════════════════════════════════════════
        // 3. DOM MANIPULATION TRACKING
        // ═══════════════════════════════════════════════════════
        interface DomManipRecord {
            api: string;
            detail: string;
            callerLocation: string;
            element: Element;
            timestamp: number;
        }
        const domManipLog: DomManipRecord[] = [];
        (window as any).__CODE_ANATOMY_DOM_MANIPS__ = domManipLog;

        function logDomManip(api: string, detail: string, element: Element) {
            if (domManipLog.length >= MAX_RECORDS) return;
            if (detail.includes("data-code-anatomy-")) return; // Explicitly skip internal attributes

            const caller = getCallerLocation();
            if (caller.includes("injected.js") || caller.includes("content.js"))
                return;

            domManipLog.push({
                api,
                detail,
                callerLocation: caller,
                element,
                timestamp: performance.now(),
            });
        }

        // Patch setAttribute
        const origSetAttr = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (
            name: string,
            value: string,
        ) {
            logDomManip("setAttribute", `${name}="${value}"`, this);
            return origSetAttr.call(this, name, value);
        };

        // Patch removeAttribute
        const origRemoveAttr = Element.prototype.removeAttribute;
        Element.prototype.removeAttribute = function (name: string) {
            logDomManip("removeAttribute", name, this);
            return origRemoveAttr.call(this, name);
        };

        // Patch classList methods
        const origClassAdd = DOMTokenList.prototype.add;
        DOMTokenList.prototype.add = function (...tokens: string[]) {
            const el = findClassListOwner(this);
            if (el) logDomManip("classList.add", tokens.join(", "), el);
            return origClassAdd.apply(this, tokens);
        };

        const origClassRemove = DOMTokenList.prototype.remove;
        DOMTokenList.prototype.remove = function (...tokens: string[]) {
            const el = findClassListOwner(this);
            if (el) logDomManip("classList.remove", tokens.join(", "), el);
            return origClassRemove.apply(this, tokens);
        };

        const origClassToggle = DOMTokenList.prototype.toggle;
        DOMTokenList.prototype.toggle = function (
            token: string,
            force?: boolean,
        ) {
            const el = findClassListOwner(this);
            if (el)
                logDomManip(
                    "classList.toggle",
                    token + (force !== undefined ? `, ${force}` : ""),
                    el,
                );
            return origClassToggle.call(this, token, force);
        };

        function findClassListOwner(list: DOMTokenList): Element | null {
            // Walk DOM to find which element owns this classList
            // The classList is an attribute of the element, so we check all elements
            try {
                // Modern approach: just use the internal reference
                return (
                    (list as any)._element ||
                    document.querySelector(`[class="${list.value}"]`) ||
                    null
                );
            } catch (e) {
                return null;
            }
        }

        // ═══════════════════════════════════════════════════════
        // 4. BRIDGE: Respond to queries from the isolated content script
        // ═══════════════════════════════════════════════════════
        document.addEventListener("code-anatomy-query-events", (e: Event) => {
            const el = e.target as Element;

            const elementId = el.getAttribute("data-code-anatomy-id");
            if (!elementId) return;

            // --- Event Listeners ---
            const listeners = listenerMap.get(el) || [];
            const serializedListeners = listeners.map((l) => ({
                type: l.type,
                useCapture: l.useCapture,
                passive: l.passive,
                once: l.once,
                functionName: l.functionName,
                sourcePreview: l.sourcePreview,
            }));

            // Also collect listeners on child elements
            const childListeners: any[] = [];
            el.querySelectorAll("*").forEach((child) => {
                const childL = listenerMap.get(child) || [];
                if (childL.length > 0) {
                    const childLabel = describeElement(child, el!);
                    childL.forEach((l) => {
                        childListeners.push({
                            type: l.type,
                            useCapture: l.useCapture,
                            passive: l.passive,
                            once: l.once,
                            functionName: l.functionName,
                            sourcePreview: l.sourcePreview,
                            targetLabel: childLabel,
                            targetDepth: getDepth(child, el!),
                        });
                    });
                }
            });

            // --- DOM Access Records ---
            const domAccessMatches: any[] = [];
            for (const record of domAccessLog) {
                let matchEl: Element | null = null;
                let matchLabel = "";
                let matchDepth = 0;

                if (record.element === el) {
                    matchEl = el;
                    matchLabel = "self";
                    matchDepth = 0;
                } else if (record.element && el.contains(record.element)) {
                    matchEl = record.element;
                    matchLabel = describeElement(record.element, el);
                    matchDepth = getDepth(record.element, el);
                } else if (record.elements) {
                    for (const recEl of record.elements) {
                        if (recEl === el) {
                            matchEl = el;
                            matchLabel = "self";
                            matchDepth = 0;
                            break;
                        } else if (el.contains(recEl)) {
                            matchEl = recEl;
                            matchLabel = describeElement(recEl, el);
                            matchDepth = getDepth(recEl, el);
                            break;
                        }
                    }
                }

                if (matchEl) {
                    domAccessMatches.push({
                        method: record.method,
                        argument: record.argument,
                        callerLocation: record.callerLocation,
                        targetLabel: matchLabel,
                        targetDepth: matchDepth,
                    });
                }
            }

            // --- DOM Manipulation Records ---
            const domManipMatches: any[] = [];
            for (const record of domManipLog) {
                if (record.element === el) {
                    domManipMatches.push({
                        api: record.api,
                        detail: record.detail,
                        callerLocation: record.callerLocation,
                        targetLabel: "self",
                        targetDepth: 0,
                    });
                } else if (el.contains(record.element)) {
                    domManipMatches.push({
                        api: record.api,
                        detail: record.detail,
                        callerLocation: record.callerLocation,
                        targetLabel: describeElement(record.element, el),
                        targetDepth: getDepth(record.element, el),
                    });
                }
            }

            const payloadStr = JSON.stringify({
                listeners: serializedListeners,
                childListeners,
                domAccess: domAccessMatches,
                domManipulations: domManipMatches,
            });

            el.setAttribute("data-code-anatomy-response", payloadStr);
            el.dispatchEvent(
                new CustomEvent("code-anatomy-response-events", {
                    bubbles: true,
                }),
            );
        });

        function describeElement(el: Element, relativeTo: Element): string {
            let label = el.tagName.toLowerCase();
            if (el.id) label += `#${el.id}`;
            else if (el.className && typeof el.className === "string") {
                const cls = el.className
                    .split(" ")
                    .filter((c) => c.length > 0)
                    .slice(0, 2)
                    .join(".");
                if (cls) label += `.${cls}`;
            }
            return label;
        }

        function getDepth(child: Element | Node, ancestor: Element): number {
            let depth = 0;
            let current: Node | null = child;
            while (current && current !== ancestor) {
                current = current.parentNode;
                depth++;
            }
            return depth;
        }
    },
});
