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

        EventTarget.prototype.addEventListener = function (this: any, type: string, listener: any, options?: any) {
            // Only track if `this` is a valid object/function to prevent WeakMap crashes
            if (this && (typeof this === "object" || typeof this === "function")) {
                if (!listenerMap.has(this)) {
                    listenerMap.set(this, []);
                }

                const listeners = listenerMap.get(this)!;
                listeners.push({
                    type,
                    listener,
                    useCapture: typeof options === "object" ? !!options.capture : !!options,
                    passive: typeof options === "object" ? !!options.passive : false,
                    once: typeof options === "object" ? !!options.once : false,
                    functionName: listener && typeof listener === 'function' ? listener.name : (listener && listener.handleEvent ? 'handleEvent' : 'anonymous'),
                    sourcePreview: getSourcePreview(listener),
                });
            }

            return originalAdd.apply(this, arguments as any);
        };

        EventTarget.prototype.removeEventListener = function (this: any, type: string, listener: any, options?: any) {
            if (this && (typeof this === "object" || typeof this === "function")) {
                const listeners = listenerMap.get(this);
                if (listeners) {
                    const useCapture = typeof options === "object" ? !!options.capture : !!options;
                    const index = listeners.findIndex(
                        (l) => l.type === type && l.listener === listener && l.useCapture === useCapture
                    );
                    if (index !== -1) {
                        listeners.splice(index, 1);
                    }
                }
            }

            return originalRemove.apply(this, arguments as any);
        };

        function getSourcePreview(listener: any): string {
            try {
                let source =
                    typeof listener === "function"
                        ? listener.toString()
                        : (listener && listener.handleEvent)
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
                const lines = stack.split("\n").filter((l) => l.trim().startsWith("at "));
                const callerLine = lines.find((l) => !l.includes("injected.js") && !l.includes("content.js")) || lines[2] || lines[1] || "";
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
            callerScope: string;
            element: Element | null;
            elements?: Element[];
            timestamp: number;
        }
        const domAccessLog: DomAccessRecord[] = [];
        (window as any).__CODE_ANATOMY_DOM_ACCESS__ = domAccessLog;

        function logDomAccess(
            method: string,
            argument: any,
            result: Element | null | NodeList | HTMLCollection,
        ) {
            if (domAccessLog.length >= MAX_RECORDS) return;
            const caller = getCallerLocation();
            if (caller.includes("injected.js") || caller.includes("content.js")) return;

            const record: DomAccessRecord = {
                method,
                argument: String(argument),
                callerLocation: caller,
                callerScope: "", // Removed fn.caller to prevent strict mode crashes
                element: null,
                timestamp: performance.now(),
            };

            if (result instanceof Element) {
                record.element = result;
            } else if (result && "length" in result) {
                record.elements = Array.from(result as any).filter((e: any) => e instanceof Element) as Element[];
                record.element = record.elements[0] || null;
            }

            domAccessLog.push(record);
        }

        const origQS = Document.prototype.querySelector;
        Document.prototype.querySelector = function (this: any, ...args: any[]) {
            const result = origQS.apply(this, args as any);
            logDomAccess("document.querySelector", args[0], result);
            return result;
        };

        const origQSA = Document.prototype.querySelectorAll;
        Document.prototype.querySelectorAll = function (this: any, ...args: any[]) {
            const result = origQSA.apply(this, args as any);
            logDomAccess("document.querySelectorAll", args[0], result);
            return result;
        };

        const origById = Document.prototype.getElementById;
        Document.prototype.getElementById = function (this: any, ...args: any[]) {
            const result = origById.apply(this, args as any);
            logDomAccess("document.getElementById", args[0], result);
            return result;
        };

        const origByCN = Document.prototype.getElementsByClassName;
        Document.prototype.getElementsByClassName = function (this: any, ...args: any[]) {
            const result = origByCN.apply(this, args as any);
            logDomAccess("document.getElementsByClassName", args[0], result);
            return result;
        };

        const origByTN = Document.prototype.getElementsByTagName;
        Document.prototype.getElementsByTagName = function (this: any, ...args: any[]) {
            const result = origByTN.apply(this, args as any);
            logDomAccess("document.getElementsByTagName", args[0], result);
            return result;
        };

        const origByName = Document.prototype.getElementsByName;
        Document.prototype.getElementsByName = function (this: any, ...args: any[]) {
            const result = origByName.apply(this, args as any);
            logDomAccess("document.getElementsByName", args[0], result);
            return result;
        };

        const origElemQS = Element.prototype.querySelector;
        Element.prototype.querySelector = function (this: any, ...args: any[]) {
            const result = origElemQS.apply(this, args as any);
            logDomAccess("element.querySelector", args[0], result);
            return result;
        };

        const origElemQSA = Element.prototype.querySelectorAll;
        Element.prototype.querySelectorAll = function (this: any, ...args: any[]) {
            const result = origElemQSA.apply(this, args as any);
            logDomAccess("element.querySelectorAll", args[0], result);
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
            if (detail.includes("data-code-anatomy-")) return;

            const caller = getCallerLocation();
            if (caller.includes("injected.js") || caller.includes("content.js")) return;

            domManipLog.push({
                api,
                detail,
                callerLocation: caller,
                element,
                timestamp: performance.now(),
            });
        }

        const origSetAttr = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (this: any, ...args: any[]) {
            logDomManip("setAttribute", `${String(args[0])}="${String(args[1])}"`, this);
            return origSetAttr.apply(this, args as any);
        };

        const origRemoveAttr = Element.prototype.removeAttribute;
        Element.prototype.removeAttribute = function (this: any, ...args: any[]) {
            logDomManip("removeAttribute", String(args[0]), this);
            return origRemoveAttr.apply(this, args as any);
        };

        // O(1) ClassList Tracking via Getter Hook
        const origClassListDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'classList');
        const origClassListGetter = origClassListDesc?.get;
        if (origClassListGetter) {
            Object.defineProperty(Element.prototype, 'classList', {
                get: function(this: Element) {
                    const list = origClassListGetter.call(this) as DOMTokenList;
                    if (list && !(list as any)._ca_element) {
                        try {
                            Object.defineProperty(list, '_ca_element', {
                                value: this,
                                enumerable: false,
                                writable: false,
                                configurable: true
                            });
                        } catch (e) {}
                    }
                    return list;
                },
                enumerable: true,
                configurable: true
            });
        }

        const origClassAdd = DOMTokenList.prototype.add;
        DOMTokenList.prototype.add = function (this: any, ...tokens: string[]) {
            if (domManipLog.length < MAX_RECORDS) {
                const el = this._ca_element;
                if (el) logDomManip("classList.add", tokens.join(", "), el);
            }
            return origClassAdd.apply(this, tokens as any);
        };

        const origClassRemove = DOMTokenList.prototype.remove;
        DOMTokenList.prototype.remove = function (this: any, ...tokens: string[]) {
            if (domManipLog.length < MAX_RECORDS) {
                const el = this._ca_element;
                if (el) logDomManip("classList.remove", tokens.join(", "), el);
            }
            return origClassRemove.apply(this, tokens as any);
        };

        const origClassToggle = DOMTokenList.prototype.toggle;
        DOMTokenList.prototype.toggle = function (this: any, token: string, force?: boolean) {
            if (domManipLog.length < MAX_RECORDS) {
                const el = this._ca_element;
                if (el) logDomManip("classList.toggle", token + (force !== undefined ? `, ${force}` : ""), el);
            }
            return origClassToggle.apply(this, arguments as any);
        };

        // ═══════════════════════════════════════════════════════
        // 4. BRIDGE: Respond to queries from the isolated content script
        // ═══════════════════════════════════════════════════════
        document.addEventListener("code-anatomy-query-events", (e: Event) => {
            const el = e.target as Element;
            const elementId = el.getAttribute("data-code-anatomy-id");
            if (!elementId) return;

            const listeners = listenerMap.get(el) || [];
            const serializedListeners = listeners.map((l) => ({
                type: l.type,
                useCapture: l.useCapture,
                passive: l.passive,
                once: l.once,
                functionName: l.functionName,
                sourcePreview: l.sourcePreview,
            }));

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
                        callerScope: record.callerScope || "",
                        targetLabel: matchLabel,
                        targetDepth: matchDepth,
                    });
                }
            }

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
            el.dispatchEvent(new CustomEvent("code-anatomy-response-events", { bubbles: true }));
        });

        function describeElement(el: Element, relativeTo: Element): string {
            let label = el.tagName.toLowerCase();
            if (el.id) label += `#${el.id}`;
            else if (el.className && typeof el.className === "string") {
                const cls = el.className.split(" ").filter((c) => c.length > 0).slice(0, 2).join(".");
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
