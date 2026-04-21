import type * as yup from 'yup';

export function yupValidate<T extends Record<string, unknown>>(schema: yup.ObjectSchema<any>) {
  return (values: T) => {
    try {
      schema.validateSync(values, { abortEarly: false });
      return {};
    } catch (err) {
      const errors: Record<string, string> = {};
      if (err instanceof Error && 'inner' in err) {
        const inner = (err as yup.ValidationError).inner;
        for (const e of inner) {
          if (!e.path) continue;
          if (!errors[e.path]) errors[e.path] = e.message;
        }
      }
      return errors;
    }
  };
}

