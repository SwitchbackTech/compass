// derived from https://github.com/mission-apprentissage/zod-to-mongodb-schema/tree/main/index.ts
import { ObjectId } from "bson";
import { z } from "zod/v4";
import { z as zMini } from "zod/v4-mini";
import type { $ZodType, JSONSchema } from "zod/v4/core";
import { registry, toJSONSchema } from "zod/v4/core";

type MongoType = "object" | "array" | "number" | "boolean" | "string" | "null";

type MongoBsonType =
  | "double"
  | "string"
  | "object"
  | "array"
  | "binData"
  | "objectId"
  | "bool"
  | "date"
  | "null"
  | "regex"
  | "javascript"
  | "int"
  | "timestamp"
  | "long"
  | "decimal"
  | "minKey"
  | "maxKey"
  | "number";

// https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#available-keywords

export interface MongoSchema {
  additionalItems?: boolean | MongoSchema;
  additionalProperties?: boolean | MongoSchema;
  allOf?: MongoSchema[];
  anyOf?: MongoSchema[];
  bsonType?: MongoBsonType | MongoBsonType[];
  dependencies?: {
    [k: string]: string[] | MongoSchema;
  };
  description?: string;
  enum?: Array<
    | string
    | number
    | boolean
    | JSONSchema.ObjectSchema
    | JSONSchema.ArraySchema
    | null
  >;
  exclusiveMaximum?: boolean;
  exclusiveMinimum?: boolean;
  items?: MongoSchema | MongoSchema[];
  maximum?: number;
  maxItems?: number;
  maxLength?: number;
  maxProperties?: number;
  minimum?: number;
  minItems?: number;
  minLength?: number;
  minProperties?: number;
  multipleOf?: number;
  not?: MongoSchema;
  oneOf?: MongoSchema[];
  pattern?: string;
  patternProperties?: {
    [reg: string]: MongoSchema;
  };
  properties?: {
    [key: string]: MongoSchema;
  };
  required?: string[];
  title?: string;
  type?: MongoType | MongoType[];
  uniqueItems?: boolean;
}

function convertJSONSchema7Definition(
  root: JSONSchema.Schema,
  input: JSONSchema.Schema,
): MongoSchema | boolean {
  if (typeof input === "boolean") {
    return input;
  }

  return jsonSchemaToMongoSchema(root, input);
}

function convertJSONSchema7DefinitionNoBoolean(
  root: JSONSchema.Schema,
  input: JSONSchema.Schema,
): MongoSchema {
  if (typeof input === "boolean") {
    throw new Error("Boolean not supported");
  }

  return jsonSchemaToMongoSchema(root, input);
}

function convertTypeToBsonType(
  type:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "object"
    | "array"
    | "null",
): MongoBsonType {
  switch (type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "integer":
      return "int";
    case "boolean":
      return "bool";
    case "object":
      return "object";
    case "array":
      return "array";
    case "null":
      return "null";
  }
}

export const zObjectIdMini = zMini.pipe(
  zMini.custom<ObjectId | string>(ObjectId.isValid),
  zMini.transform((v) => new ObjectId(v)),
);

export const zObjectId = z.pipe(
  z.custom<ObjectId | string>((v) => ObjectId.isValid(v as string)),
  z.transform((v) => new ObjectId(v)),
);

function resolveRef(root: JSONSchema.Schema, ref: string) {
  const parts: string[] = ref.split("/").slice(1);
  const schema = parts.reduce((acc, part) => {
    if (!(part in acc)) throw new Error(`Cannot resolve reference ${ref}`);

    return acc[part] as JSONSchema.Schema;
  }, root);

  return jsonSchemaToMongoSchema(root, schema);
}

function simplifyAnyOf(schema: MongoSchema): MongoSchema {
  const { anyOf = null } = schema;

  if (anyOf == null) return schema;

  const keys = Object.keys(schema);

  if (keys.length > 1) return schema;

  if (anyOf.length === 1) return anyOf[0]!;

  if (anyOf.every((s) => s.bsonType && Object.keys(s).length === 1)) {
    return { bsonType: Array.from(new Set(anyOf.flatMap((s) => s.bsonType!))) };
  }

  return schema;
}

const jsonSchemaToMongoSchema = (
  root: JSONSchema.Schema,
  schema: JSONSchema.Schema,
): MongoSchema => {
  let result: MongoSchema = {};

  if (schema.additionalItems != null) {
    result.additionalItems = convertJSONSchema7Definition(
      root,
      schema.additionalItems as JSONSchema.Schema,
    );
  }

  if (schema.additionalProperties != null) {
    if (typeof schema.additionalProperties === "boolean") {
      result.additionalProperties = schema.additionalProperties;
    } else if (Object.keys(schema.additionalProperties).length === 0) {
      result.additionalProperties = true;
    } else {
      result.additionalProperties = convertJSONSchema7Definition(
        root,
        schema.additionalProperties as JSONSchema.Schema,
      );
    }
  }

  if (schema.allOf) {
    result.allOf = schema.allOf.map((s) =>
      convertJSONSchema7DefinitionNoBoolean(root, s as JSONSchema.Schema),
    );
  }

  if (schema.anyOf) {
    result.anyOf = schema.anyOf.map((s) =>
      convertJSONSchema7DefinitionNoBoolean(root, s as JSONSchema.Schema),
    );
  }

  if (schema.description != null) result.description = schema.description;
  if (schema.const != null) result.enum = [schema.const];
  if (schema.enum != null) result.enum = schema.enum;
  if (schema.exclusiveMaximum != null) {
    if (typeof schema.exclusiveMaximum === "boolean") {
      result.exclusiveMaximum = schema.exclusiveMaximum;
    } else {
      result.exclusiveMaximum = true;
      result.maximum = schema.exclusiveMaximum as number;
    }
  }
  if (schema.exclusiveMinimum != null) {
    if (typeof schema.exclusiveMinimum === "boolean") {
      result.exclusiveMinimum = schema.exclusiveMinimum;
    } else {
      result.exclusiveMinimum = true;
      result.minimum = schema.exclusiveMinimum as number;
    }
  }
  if (schema.items != null) {
    const items = schema.items as JSONSchema.Schema | JSONSchema.Schema[];
    result.items = Array.isArray(items)
      ? items.map((s) => convertJSONSchema7DefinitionNoBoolean(root, s))
      : convertJSONSchema7DefinitionNoBoolean(root, items);
  }
  // integer schema
  if (schema.maximum != null) result.maximum = schema.maximum as number;
  if (schema.maxItems != null) result.maxItems = schema.maxItems as number;
  if (schema.maxLength != null) result.maxLength = schema.maxLength as number;
  if (schema.maxProperties != null)
    result.maxProperties = schema.maxProperties as number;
  if (schema.minimum != null) result.minimum = schema.minimum as number;
  if (schema.minItems != null) result.minItems = schema.minItems as number;
  if (schema.minLength != null) result.minLength = schema.minLength as number;
  if (schema.minProperties != null)
    result.minProperties = schema.minProperties as number;
  if (schema.multipleOf != null)
    result.multipleOf = schema.multipleOf as number;
  if (schema.not != null)
    result.not = convertJSONSchema7DefinitionNoBoolean(
      root,
      schema.not as JSONSchema.NullSchema,
    );
  if (schema.oneOf != null)
    result.oneOf = schema.oneOf.map((s) =>
      convertJSONSchema7DefinitionNoBoolean(root, s as JSONSchema.Schema),
    );
  if (schema.pattern != null) result.pattern = schema.pattern as string;
  if (schema.patternProperties != null) {
    result.patternProperties = Object.entries(schema.patternProperties).reduce(
      (acc: NonNullable<MongoSchema["patternProperties"]>, [k, v]) => {
        acc[k] = convertJSONSchema7DefinitionNoBoolean(
          root,
          v as JSONSchema.Schema,
        );

        return acc;
      },
      {},
    );
  }
  if (schema.properties != null) {
    result.properties = Object.entries(schema.properties).reduce(
      (acc: NonNullable<MongoSchema["properties"]>, [k, v]) => {
        acc[k] = convertJSONSchema7DefinitionNoBoolean(
          root,
          v as JSONSchema.Schema,
        );

        return acc;
      },
      {},
    );
  }
  if (schema.required != null) result.required = schema.required as string[];
  if (schema.title != null) result.title = schema.title;
  if (schema.type != null) {
    result.bsonType = Array.isArray(schema.type)
      ? schema.type.map(convertTypeToBsonType)
      : convertTypeToBsonType(schema.type);
  }
  if (schema.uniqueItems != null)
    result.uniqueItems = schema.uniqueItems as boolean;

  if ("bsonType" in schema) {
    result.bsonType = schema["bsonType"] as MongoBsonType | MongoBsonType[];
  }

  if (schema.$ref) {
    result = { ...result, ...resolveRef(root, schema.$ref) };
  }

  return simplifyAnyOf(result);
};

type IOverrideFn = (zodSchema: $ZodType) => JSONSchema.BaseSchema | null;

export function zodToMongoSchema(
  input: $ZodType,
  overrideFn: IOverrideFn | null = null,
): MongoSchema {
  const metadata = registry<{ id: string; description?: string }>();
  metadata.add(input, { id: "root" });

  const { schemas: jsonSchemas } = toJSONSchema(metadata, {
    target: "draft-7",
    unrepresentable: "any",
    io: "output",
    override: (ctx) => {
      if (ctx.zodSchema === zObjectId || ctx.zodSchema === zObjectIdMini) {
        delete ctx.jsonSchema.type;
        delete ctx.jsonSchema["format"];
        ctx.jsonSchema["bsonType"] = "objectId";
        return;
      }

      const custom = overrideFn?.(ctx.zodSchema) ?? null;

      if (custom) {
        // We need to keep the reference of ctx.jsonSchema
        Object.keys(ctx.jsonSchema).forEach((key) => {
          delete ctx.jsonSchema[key as keyof JSONSchema.Schema];
        });
        Object.assign(ctx.jsonSchema, custom);
        return;
      }

      if (ctx.zodSchema._zod.def.type === "date") {
        delete ctx.jsonSchema.type;
        delete ctx.jsonSchema["format"];
        ctx.jsonSchema["bsonType"] = "date";
      }
    },
  });

  return jsonSchemaToMongoSchema(
    jsonSchemas["root"] as JSONSchema.Schema,
    jsonSchemas["root"] as JSONSchema.Schema,
  );
}
