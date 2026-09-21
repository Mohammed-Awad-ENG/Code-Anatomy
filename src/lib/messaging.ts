export type AnatomyMessage =
  | { type: 'ACTIVATE_PICKER' }
  | { type: 'DEACTIVATE_PICKER' }
  | { type: 'OPEN_PANEL' }
  | { type: 'INSPECT_CONTEXT_ELEMENT' }
  | { type: 'ELEMENT_SELECTED'; payload: ElementData }
  | { type: 'FORCE_STATE'; payload: { state: string; mode: 'once' | 'toggle' } };

/** Identifies which element a JS connection belongs to */
export interface TargetElementInfo {
  /** e.g. "button#submit.btn.primary" or "self" */
  label: string;
  /** Depth relative to inspected element (0 = self) */
  depth: number;
}

/** A single event listener entry */
export interface JsEventEntry {
  target: TargetElementInfo;
  type: string;
  handler: string;
  functionName: string;
  flags: string[];
  /** If from a framework, which one (React, Vue, Angular, Svelte, jQuery) */
  framework?: string;
}

/** A way JavaScript can access/reference this element */
export interface JsDomAccessEntry {
  /** The JS method name, e.g. "getElementById", "querySelector" */
  method: string;
  /** The code snippet, e.g. "document.getElementById('submit')" */
  code: string;
  /** Which element this references */
  target: TargetElementInfo;
}

/** A DOM manipulation that was intercepted */
export interface JsDomManipulationEntry {
  target: TargetElementInfo;
  /** The API that was called, e.g. "classList.add", "setAttribute" */
  api: string;
  /** Details/arguments of the call */
  detail: string;
  /** Timestamp relative to page load */
  timestamp?: number;
}

/** All JavaScript data for the inspected element */
export interface JsData {
  eventListeners: JsEventEntry[];
  domAccess: JsDomAccessEntry[];
  domManipulations: JsDomManipulationEntry[];
}

export interface ElementData {
  tagName: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  outerHTML: string;
  inlineStyles: string;
  computedStyles: Record<string, string>;
  matchedRules: { selector: string; cssText: string; media?: string }[];
  pseudoRules: { selector: string; cssText: string; pseudoClass: string; media?: string }[];
  /** New comprehensive JavaScript data */
  jsData?: JsData;
  // Legacy fields kept for transition
  listeners?: any[];
  frameworkEvents?: { event: string; handler: string }[];
}
