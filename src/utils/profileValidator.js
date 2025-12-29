import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../schema/profile-schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);

export function validateProfile(profile) {
  const valid = validate(profile);
  return {
    valid,
    errors: valid ? [] : (validate.errors ?? [])
  };
}
