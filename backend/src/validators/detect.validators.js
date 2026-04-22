const { z } = require("zod");

const detectSchema = z.object({
  inputType: z.enum(["text", "url"]).default("text"),
  input: z.string().min(3).max(4000)
});

module.exports = { detectSchema };
