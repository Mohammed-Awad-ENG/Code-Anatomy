export type AnatomyMessage =
  | { type: 'ACTIVATE_PICKER' }
  | { type: 'DEACTIVATE_PICKER' }
  | { type: 'OPEN_PANEL' }
  | { type: 'INSPECT_CONTEXT_ELEMENT' }
  | { type: 'ELEMENT_SELECTED'; payload: ElementData }
  | { type: 'FORCE_STATE'; payload: { state: string; mode: 'once' | 'toggle' } };

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
  listeners?: any[];
  frameworkEvents?: { event: string; handler: string }[];
}
