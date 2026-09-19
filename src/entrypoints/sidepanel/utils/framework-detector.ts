export interface FrameworkMatch {
  className: string;
  framework: 'Bootstrap' | 'Tailwind' | 'Unknown';
  description: string;
}

export function detectFrameworkClasses(classes: string[]): FrameworkMatch[] {
  const matches: FrameworkMatch[] = [];
  
  const bootstrapPattern = /^(btn|col|row|container|navbar|nav|card|modal|badge|alert|form|input|table|dropdown|accordion|carousel|offcanvas|spinner|toast|tooltip|popover|placeholder|pagination|breadcrumb|list-group|progress)$|^(d|m|p|g|fs|fw|lh|text|bg|border|rounded|shadow|opacity|overflow|float|position|top|bottom|start|end|w|h|mw|mh|vw|vh|min-vw|min-vh|flex|order|align|justify)-(sm|md|lg|xl|xxl)?-?/;
  
  const tailwindPattern = /^(flex|grid|block|inline|hidden|table|contents)$|^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|space|gap)-|^(w|h|min-w|max-w|min-h|max-h)-|^(text|font|leading|tracking|decoration|underline|line-through|no-underline)-|^(bg|from|via|to|gradient)-|^(border|rounded|ring|outline|divide)-|^(shadow|opacity)-|^(hover|focus|active|group-hover|dark|sm|md|lg|xl|2xl):|^(transition|duration|ease|delay|animate)-|^(grid-cols|grid-rows|col-span|row-span)-/;

  for (const cls of classes) {
    if (bootstrapPattern.test(cls)) {
      matches.push({
        className: cls,
        framework: 'Bootstrap',
        description: getBasicDescription(cls)
      });
    } else if (tailwindPattern.test(cls)) {
      matches.push({
        className: cls,
        framework: 'Tailwind',
        description: getBasicDescription(cls)
      });
    }
  }

  return matches;
}

// A simplified dictionary for common utility classes
function getBasicDescription(cls: string): string {
  // Spacing
  if (cls.match(/^[mp][xytrbl]?-[0-9]+$/)) return 'Spacing utility (margin/padding)';
  // Display
  if (cls.match(/^(d-|flex$|grid$|block$|hidden$|d-none)/)) return 'Display property utility';
  // Typography
  if (cls.match(/^(text-|font-|fs-|fw-)/)) return 'Typography utility (size/weight/color)';
  // Colors/Background
  if (cls.match(/^(bg-)/)) return 'Background color utility';
  // Borders
  if (cls.match(/^(border|rounded)/)) return 'Border or radius utility';
  // Sizing
  if (cls.match(/^[wh]-/)) return 'Sizing utility (width/height)';
  // Components
  if (cls.match(/^(btn|card|navbar|modal|alert)/)) return 'Component base class';
  
  return 'Utility class';
}
