export type ElementKind =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'button'
  | 'link'
  | 'editable';

export interface PageElement {

  id: string;
  kind: ElementKind;

  label: string;

  value?: string;

  options?: string[];

  disabled?: boolean;

  selector?: string;

  required?: boolean;
}

export interface PageSnapshot {
  url: string;

  route: string;
  title: string;

  heading?: string;
  elements: PageElement[];

  capturedAt: number;
}

export interface CopilotAction {
  type: 'fill' | 'click' | 'select' | 'check' | 'navigate' | 'read' | 'snapshot';

  handle?: string;

  value?: string;

  route?: string;
}

export interface CopilotResult {
  ok: boolean;
  message: string;

  data?: any;
}
