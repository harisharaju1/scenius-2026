import 'server-only'

/** A field-level form error, surfaced in forms via useFormState. */
export type FieldError = {
  /** Form field name. Use 'form' for global, non-field errors. */
  field: string
  message: string
}

/** Discriminated union returned by every Server Action. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldError[] }

/** Wrap a successful result. */
export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

/** Wrap a failure with one or more field errors. */
export function fail(errors: FieldError[]): ActionResult<never> {
  return { ok: false, errors }
}
