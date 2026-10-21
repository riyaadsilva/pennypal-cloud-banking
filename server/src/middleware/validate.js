import { HttpError } from "../utils/errors.js";
export const validate = (schema, part = "body") => (req, _res, next) => {
  const parsed = schema.safeParse(req[part]);
  if (!parsed.success) throw new HttpError(400, "VALIDATION", parsed.error.issues[0].message);
  req[part] = parsed.data;
  next();
};
