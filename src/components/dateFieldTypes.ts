export interface DateFieldProps {
  label: string;
  /** "YYYY-MM-DD", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day. Defaults to today (past dates are blocked). */
  minimumDate?: Date;
  /** Shows a Clear action and "(optional)" in the label. */
  optional?: boolean;
  error?: string;
  placeholder?: string;
}

export interface TimeFieldProps {
  label: string;
  /** "HH:MM" (24h), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}
